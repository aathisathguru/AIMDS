import { useEffect, useRef, useState } from 'react';
import { telemetryService, USE_MOCK } from '../services/api.js';

function channelValue(reading, channel) {
  const key = channel.telemetryKey || channel.id;
  const aliases = { energy: 'energy', load: 'power' };
  const value = reading?.[key] ?? reading?.[aliases[key]];
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function emptyValues(channels) {
  return channels.reduce((result, channel) => {
    result[channel.id] = null;
    return result;
  }, {});
}

export function useLiveStream({ channels, intervalMs = 2000, points = 40, enabled = true, deviceId }) {
  const [tick, setTick] = useState(0);
  const [values, setValues] = useState(() => emptyValues(channels));
  const [history, setHistory] = useState([]);
  const [connection, setConnection] = useState({
    state: 'connecting',
    latency: 0,
    packets: 0,
    since: null,
    lastUpdate: null,
    deviceId: deviceId || 'VELXIO-ESP32-01',
    error: USE_MOCK ? 'Mock telemetry is disabled for live synchronization.' : null,
  });
  const channelRef = useRef(channels);

  useEffect(() => {
    channelRef.current = channels;
  }, [channels]);

  useEffect(() => {
    if (!enabled || USE_MOCK) return undefined;
    let alive = true;
    let ws = null;
    let pollTimer = null;
    let pingTimer = null;
    let reconnectTimer = null;
    let pingSentTime = 0;

    const handleReading = (reading, customLatency = null) => {
      if (!alive || !reading) return;
      const mapped = emptyValues(channelRef.current);
      channelRef.current.forEach((channel) => {
        mapped[channel.id] = channelValue(reading, channel);
      });
      setValues(mapped);

      setHistory((prev) => {
        const row = {
          t: 0,
          timestamp: reading.receivedAt || reading.received_at || new Date().toISOString(),
        };
        channelRef.current.forEach((channel) => {
          row[channel.id] = channelValue(reading, channel);
        });
        const next = [...prev, row].slice(-points);
        return next.map((r, idx) => ({ ...r, t: idx - next.length }));
      });

      setTick((t) => t + 1);
      setConnection((curr) => ({
        ...curr,
        state: 'connected',
        latency: customLatency !== null ? customLatency : curr.latency || 4,
        packets: curr.packets + 1,
        since: curr.since || Date.now(),
        lastUpdate: reading.receivedAt || reading.received_at || new Date().toISOString(),
        deviceId: reading.deviceId || reading.device_id || deviceId || curr.deviceId,
        error: null,
      }));
    };

    // Load initial history
    (async () => {
      try {
        const [initHistory, latest] = await Promise.all([
          telemetryService.history(deviceId, points),
          telemetryService.latest(deviceId),
        ]);
        if (!alive) return;
        if (Array.isArray(initHistory) && initHistory.length > 0) {
          const rows = initHistory.map((reading, index) => {
            const row = { t: index - initHistory.length, timestamp: reading.receivedAt || reading.received_at };
            channelRef.current.forEach((channel) => {
              row[channel.id] = channelValue(reading, channel);
            });
            return row;
          });
          setHistory(rows);
        }
        if (latest) {
          handleReading(latest);
        }
      } catch {
        /* fallback to live connection */
      }
    })();

    // Polling fallback
    const startPollingFallback = () => {
      if (pollTimer) return;
      const poll = async () => {
        const started = performance.now();
        try {
          const [latest, status] = await Promise.all([
            telemetryService.latest(deviceId),
            telemetryService.status(deviceId),
          ]);
          if (!alive) return;
          if (latest) {
            handleReading(latest, Math.round(performance.now() - started));
          } else {
            setConnection((c) => ({
              ...c,
              state: status?.state || 'waiting',
              latency: Math.round(performance.now() - started),
            }));
          }
        } catch (error) {
          if (alive) {
            setConnection((c) => ({
              ...c,
              state: 'error',
              error: error?.message || 'Telemetry unavailable',
            }));
          }
        }
      };
      poll();
      pollTimer = setInterval(poll, intervalMs);
    };

    // WebSocket real-time connection
    const connectWebSocket = () => {
      if (typeof window === 'undefined') return;
      try {
        const isHttps = window.location.protocol === 'https:';
        const wsProtocol = isHttps ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/api/telemetry/ws`;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!alive) return;
          setConnection((c) => ({ ...c, state: 'connected', error: null }));
          if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
          }
          // Periodic ping for true latency tracking
          pingTimer = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              pingSentTime = performance.now();
              ws.send('ping');
            }
          }, 8000);
        };

        ws.onmessage = (event) => {
          if (!alive) return;
          if (event.data === 'pong') {
            const lat = Math.round(performance.now() - pingSentTime);
            setConnection((c) => ({ ...c, latency: Math.max(1, lat) }));
            return;
          }
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'telemetry' || msg.type === 'init') {
              handleReading(msg.data);
            }
          } catch {
            /* ignore non-json messages */
          }
        };

        ws.onerror = () => {
          if (alive) startPollingFallback();
        };

        ws.onclose = () => {
          if (alive) {
            startPollingFallback();
            reconnectTimer = setTimeout(connectWebSocket, 5000);
          }
        };
      } catch {
        startPollingFallback();
      }
    };

    connectWebSocket();

    return () => {
      alive = false;
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
      if (pingTimer) clearInterval(pingTimer);
      if (pollTimer) clearInterval(pollTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [deviceId, enabled, intervalMs, points]);

  return { values, history, connection, tick };
}
