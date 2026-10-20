import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Building2,
  ChevronDown,
  Droplets,
  Gauge,
  Pause,
  Play,
  Radio,
  Thermometer,
  Zap,
} from 'lucide-react';
import ConnectionCard from '../components/monitoring/ConnectionCard.jsx';
import AnalyticsChart from '../components/charts/AnalyticsChart.jsx';
import StatusIndicator from '../components/ui/StatusIndicator.jsx';
import { useData } from '../context/DataContext.jsx';
import { useChartColors } from '../context/ThemeContext.jsx';
import { useLiveStream } from '../hooks/useLiveStream.js';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery.js';
import { formatNumber, relativeTime, SEVERITY_TONE } from '../utils/format.js';
import './LiveMonitoring.css';

export default function LiveMonitoring() {
  const { blocks, alerts, stats } = useData();
  const c = useChartColors();
  const reduced = usePrefersReducedMotion();
  const [running, setRunning] = useState(true);
  const [scope, setScope] = useState(blocks[0]?.code ?? 'SF');

  const block = blocks.find((b) => b.code === scope) ?? blocks[0];

  const channels = useMemo(
    () => [
      {
        id: 'voltage',
        base: 230,
        volatility: 0.05,
        label: 'Voltage',
        unit: 'V',
        icon: Gauge,
        tone: 'accent',
      },
      {
        id: 'current',
        base: 2.5,
        volatility: 0.07,
        label: 'Current',
        unit: 'A',
        icon: Activity,
        tone: 'blue',
      },
      {
        id: 'power',
        base: 575,
        volatility: 0.06,
        label: 'Power',
        unit: 'W',
        icon: Zap,
        tone: 'ok',
      },
      {
        id: 'temperature',
        base: 24.5,
        volatility: 0.02,
        label: 'Temperature',
        unit: '°C',
        icon: Thermometer,
        tone: 'warn',
      },
      {
        id: 'humidity',
        base: 52,
        volatility: 0.04,
        label: 'Humidity',
        unit: '%',
        icon: Droplets,
        tone: 'blue',
      },
    ],
    [],
  );

  const { values, history, connection, tick } = useLiveStream({
    channels,
    intervalMs: 2000,
    points: 36,
    enabled: running,
    deviceId: import.meta.env?.VITE_TELEMETRY_DEVICE_ID,
  });

  /**
   * The four channels sit on very different scales (kWh vs °C), so plotting
   * them raw would flatten everything against the largest series. Each point
   * is indexed against its own channel baseline: 100 = the expected value.
   */
  const normalised = useMemo(
    () =>
      history.map((row) => {
        const out = { t: row.t };
        channels.forEach((ch) => {
          out[ch.id] = Number(((row[ch.id] / ch.base) * 100).toFixed(1));
        });
        return out;
      }),
    [history, channels],
  );

  const liveSensors = useMemo(
    () =>
      (block?.floors ?? []).flatMap((f) =>
        f.sensors.map((s) => ({ ...s, floorName: f.name })),
      ),
    [block],
  );

  const openAlerts = alerts.filter((a) => a.severity !== 'resolved').slice(0, 5);

  return (
    <div className="stack stack--lg live-page">
      {/* =================================================================
         TOP HEADER BAR — Perfectly aligned, zero overlapping
         ================================================================= */}
      <header className="live-header">
        <div className="live-header__left">
          <h1 className="live-header__title">Live Monitoring</h1>
        </div>

        <div className="live-header__actions">
          {/* Top-right Live Broadcast Indicator */}
          <span
            className={`live__status-pill ${
              running && connection.state === 'connected'
                ? 'live__status-pill--active'
                : 'live__status-pill--paused'
            }`}
          >
            <span className="live__status-dot" aria-hidden="true">
              {running && connection.state === 'connected' && !reduced && <span className="live__status-ping" />}
            </span>
            <span className="live__status-label">
              {!running ? 'STREAM PAUSED' : connection.state === 'connected' ? 'BROADCASTING LIVE' : 'DEVICE OFFLINE'}
            </span>
          </span>

          {/* Compact Facility Selector Dropdown */}
          {blocks.length > 1 && (
            <div className="live__facility-picker">
              <Building2 size={14} className="live__facility-icon" aria-hidden="true" />
              <select
                id="live-facility-select"
                className="live__facility-select"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                aria-label="Select facility"
              >
                {blocks.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.code} · {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="live__facility-chevron" aria-hidden="true" />
            </div>
          )}

          {/* Stream Play/Pause Control Button */}
          <button
            type="button"
            className={`btn ${running ? 'btn--ghost' : 'btn--primary'} live__ctrl-btn`}
            onClick={() => setRunning((r) => !r)}
            aria-pressed={!running}
          >
            {running ? (
              <>
                <Pause size={14} aria-hidden="true" />
                <span>Pause stream</span>
              </>
            ) : (
              <>
                <Play size={14} aria-hidden="true" />
                <span>Resume stream</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* =================================================================
         MAIN CONTENT GRID
         ================================================================= */}
      <div className="grid-split">
        <div className="stack">
          {/* live readings */}
          <section className="live__readings" aria-label="Current telemetry readings">
            <header className="live__head">
              <div>
                <p className="eyebrow eyebrow-accent">CURRENT TELEMETRY METRICS</p>
                <h2 className="live__head-title">Real-Time Sensor Feeds</h2>
              </div>
              <div className="live__head-extra">
                <span className="live__cadence-badge num">
                  <Activity size={12} className="live__cadence-icon" aria-hidden="true" />
                  {running ? `Active · 2.0s cadence · Tick #${tick}` : 'Stream halted'}
                </span>
              </div>
            </header>

            <div className="live__grid">
              {channels.map((ch) => {
                const Icon = ch.icon;
                const currentVal = values[ch.id] ?? ch.base;
                const deltaPct = Number(
                  (((currentVal - ch.base) / ch.base) * 100).toFixed(1),
                );
                const isPositive = deltaPct > 0;
                const isZero = deltaPct === 0;

                return (
                  <div key={ch.id} className={`live__card live__card--${ch.tone}`}>
                    <div className="live__card-glow" aria-hidden="true" />
                    <div className="live__card-header">
                      <div className="live__card-icon-wrap">
                        <Icon size={16} strokeWidth={2.2} />
                      </div>
                      <span className="live__card-label">{ch.label}</span>
                      {running && !reduced && (
                        <span className="live__card-pulse" aria-hidden="true" />
                      )}
                    </div>

                    <div className="live__card-value-wrap">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                          key={`${ch.id}-${currentVal}`}
                          className="live__card-value num"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6, position: 'absolute' }}
                          transition={{ duration: 0.22, ease: 'easeOut' }}
                        >
                          {formatNumber(currentVal)}
                          <span className="live__card-unit">{ch.unit}</span>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <div className="live__card-footer">
                      <div
                        className={`live__delta-pill ${
                          isZero ? 'is-neutral' : isPositive ? 'is-up' : 'is-down'
                        }`}
                      >
                        {!isZero &&
                          (isPositive ? (
                            <ArrowUpRight size={11} strokeWidth={2.5} aria-hidden="true" />
                          ) : (
                            <ArrowDownRight size={11} strokeWidth={2.5} aria-hidden="true" />
                          ))}
                        <span>{isZero ? '0.0%' : `${isPositive ? '+' : ''}${deltaPct}%`}</span>
                      </div>
                      <span className="live__card-base num">
                        Base: {ch.base} {ch.unit}
                      </span>
                    </div>

                    <div className="live__card-bar-track" aria-hidden="true">
                      <div
                        className="live__card-bar-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(15, (currentVal / (ch.base * 1.5)) * 100),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* live chart */}
          <section className="chart-panel live__chart-panel">
            <header className="chart-panel__head">
              <div className="min0">
                <div className="live__chart-title-wrap">
                  <h3 className="chart-panel__title">Telemetry Stream Oscillogram</h3>
                  <span className="live__chart-badge num">36 samples · 2.0s cadence</span>
                </div>
                <p className="chart-panel__sub">
                  Dynamic multi-channel variance relative to baseline (100% represents nominal floor benchmark)
                </p>
              </div>
              <div className="live__chart-channel-info">
                <span className="live__chart-channel-badge num">5 Active Channels</span>
              </div>
            </header>
            <AnalyticsChart
              type="line"
              data={normalised}
              xKey="t"
              height={260}
              unit="%"
              showLegend
              referenceLine={{ y: 100, label: 'Nominal 100%', tone: 'neutral' }}
              ariaLabel="Live rolling telemetry window, indexed to each channel baseline"
              series={[
                { key: 'voltage', name: 'Voltage', color: c.accent, strokeWidth: 2 },
                { key: 'current', name: 'Current', color: c.blue, strokeWidth: 2 },
                { key: 'power', name: 'Power', color: c.ok, strokeWidth: 2 },
                { key: 'temperature', name: 'Temperature', color: c.dim, strokeWidth: 1.6, dashed: true },
                { key: 'humidity', name: 'Humidity', color: c.blue, strokeWidth: 1.6, dashed: true },
              ]}
            />
          </section>
        </div>

        <div className="stack">
          <ConnectionCard
            connection={connection}
            activeSensors={stats.sensorCount}
            lastUpdate={!running ? 'stream paused' : connection.lastUpdate || 'waiting for device'}
          />

          {/* active sensors */}
          <section className="live__panel live__sensors-panel">
            <header className="live__head">
              <div>
                <p className="eyebrow eyebrow-accent">
                  <Radio size={12} aria-hidden="true" /> ACTIVE SENSOR CHANNELS
                </p>
                <h4 className="live__head-subtitle">Telemetry Nodes</h4>
              </div>
              <Link to="/sensors" className="live__link">
                All Sensors →
              </Link>
            </header>
            <ul className="live__sensors">
              {liveSensors.slice(0, 7).map((s) => (
                <li key={s.id} className="live__sensor">
                  <div className="live__sensor-lead">
                    <StatusIndicator
                      status={s.status}
                      variant="dot"
                      pulse={running && s.status !== 'offline'}
                    />
                    <div className="min0">
                      <span className="live__sensor-id num">{s.id}</span>
                      <span className="live__sensor-name">{s.type || s.name || 'Telemetry Node'}</span>
                    </div>
                  </div>
                  <span className="live__sensor-tag">{s.floorName}</span>
                  <div className="live__sensor-val-wrap num">
                    <span className="live__sensor-val">{formatNumber(s.value)}</span>
                    <span className="live__sensor-unit">{s.unit}</span>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="live__foot">
              <span className="num">
                Monitoring {liveSensors.length} total channels in {block?.name}
              </span>
            </footer>
          </section>

          {/* current alerts */}
          <section className="live__panel live__alerts-panel">
            <header className="live__head">
              <div>
                <p className="eyebrow eyebrow-accent">
                  <Bell size={12} aria-hidden="true" /> ESTATE TELEMETRY ALERTS
                </p>
                <h4 className="live__head-subtitle">Active Anomalies</h4>
              </div>
              <Link to="/alerts" className="live__link">
                Alert Center →
              </Link>
            </header>
            <ul className="live__alerts">
              {openAlerts.map((a) => (
                <li key={a.id} className={`live__alert tone-${SEVERITY_TONE[a.severity]}`}>
                  <span className="live__alert-dot" aria-hidden="true" />
                  <div className="live__alert-content min0">
                    <p className="live__alert-title">{a.title}</p>
                    <div className="live__alert-meta num">
                      <span className="live__alert-badge">{a.severity.toUpperCase()}</span>
                      <span>{a.floorName}</span>
                      <span>·</span>
                      <span>{relativeTime(a.minutesAgo)}</span>
                    </div>
                  </div>
                  <Zap size={13} aria-hidden="true" className="live__alert-icon" />
                </li>
              ))}
              {openAlerts.length === 0 && (
                <li className="live__alert-empty">
                  <span className="live__alert-empty-icon" aria-hidden="true">✓</span>
                  All channels nominal — zero active anomalies detected.
                </li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
