import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { alertService, aiService, blockService, systemService } from '../services/api.js';

const DataContext = createContext(null);
const INITIAL_OVERVIEW = {
  status: 'standby',
  statusLabel: 'Connecting',
  environment: 'Connecting to API',
  version: '—',
  latencyMs: '—',
  uptime: '—',
};

/*
 * Estate state for the whole console.
 *
 * Live state only. Failed requests never substitute fixture readings.
 */
export function DataProvider({ children }) {
  const [blocks, setBlocks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [insights, setInsights] = useState([]);
  const [overview, setOverview] = useState(INITIAL_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const results = await Promise.allSettled([
        blockService.list(),
        alertService.list(),
        aiService.insights(),
        systemService.getOverview(),
      ]);
      if (!alive) return;

      const [blocksRes, alertsRes, insightsRes, overviewRes] = results;
      if (blocksRes.status === 'fulfilled') setBlocks(blocksRes.value ?? []);
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value ?? []);
      if (insightsRes.status === 'fulfilled') setInsights(insightsRes.value ?? []);
      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value ?? INITIAL_OVERVIEW);

      const failed = results.find((r) => r.status === 'rejected');
      setError(failed ? 'Live data unavailable.' : null);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const addBlock = useCallback(async (payload) => {
    const created = await blockService.create(payload);
    setBlocks((prev) => [...prev, created]);
    return created;
  }, []);

  // Both mutations update optimistically, then reconcile with whatever the
  // service returns. Failures roll the row back to its previous state.
  const acknowledgeAlert = useCallback(async (id) => {
    const previous = alerts;
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    try {
      await alertService.acknowledge(id);
    } catch {
      setAlerts(previous);
    }
  }, [alerts]);

  const resolveAlert = useCallback(async (id) => {
    const previous = alerts;
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, severity: 'resolved', status: 'Resolved', acknowledged: true } : a,
      ),
    );
    try {
      await alertService.resolve(id);
    } catch {
      setAlerts(previous);
    }
  }, [alerts]);

  const stats = useMemo(() => {
    const counts = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] ?? 0) + 1;
      return acc;
    }, { all: alerts.length, critical: 0, warning: 0, info: 0, resolved: 0 });
    const sensorCount = blocks.reduce((n, b) => n + (b.sensorCount ?? b.sensors?.length ?? 0), 0);
    const floorCount = blocks.reduce((n, b) => n + (b.floors ? b.floors.length : 0), 0);
    const attention = blocks.reduce(
      (n, b) =>
        n +
        (b.floors && b.floors.length > 0
          ? b.floors.filter((f) => f.status !== 'normal').length
          : b.status !== 'operational' && b.status !== 'normal'
            ? 1
            : 0),
      0,
    );
    return {
      blockCount: blocks.length,
      activeBlocks: blocks.filter((b) => b.status === 'operational').length,
      floorCount,
      sensorCount,
      attentionFloors: attention,
      alerts: counts,
    };
  }, [blocks, alerts]);

  const value = useMemo(
    () => ({
      blocks,
      alerts,
      insights,
      overview,
      stats,
      loading,
      error,
      addBlock,
      acknowledgeAlert,
      resolveAlert,
    }),
    [
      blocks,
      alerts,
      insights,
      overview,
      stats,
      loading,
      error,
      addBlock,
      acknowledgeAlert,
      resolveAlert,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
