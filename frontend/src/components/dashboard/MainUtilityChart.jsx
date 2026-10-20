import { useMemo, useState } from 'react';
import { Droplet, Flame, TrendingUp, Zap } from 'lucide-react';
import AnalyticsChart from '../charts/AnalyticsChart.jsx';
import Segmented from '../ui/Segmented.jsx';
import { EmptyState } from '../ui/States.jsx';
import { readingService } from '../../services/api.js';
import { useServiceData } from '../../hooks/useServiceData.js';
import { formatNumber } from '../../utils/format.js';
import './MainUtilityChart.css';

const UTILITY_OPTIONS = [
  { id: 'energy', label: 'Energy', icon: Zap, unit: 'kWh' },
  { id: 'water', label: 'Water', icon: Droplet, unit: 'L' },
  { id: 'temperature', label: 'Temperature', icon: Flame, unit: '°C' },
];
const RANGE_OPTIONS = [{ id: '24h', label: '24H' }, { id: '7d', label: '7D' }, { id: '6w', label: '6W' }];

export default function MainUtilityChart({ block }) {
  const [utility, setUtility] = useState('energy');
  const [range, setRange] = useState('24h');
  const currentUtil = UTILITY_OPTIONS.find((u) => u.id === utility) ?? UTILITY_OPTIONS[0];
  const query = useMemo(() => ({ seed: `${block?.code || 'estate'}-${utility}`, range }), [block?.code, range, utility]);
  const { data: seriesData = [], loading } = useServiceData(
    () => readingService.series(query),
    [],
    [query],
  );
  const latestVal = seriesData.at(-1)?.value ?? null;
  const avgVal = seriesData.length
    ? seriesData.reduce((sum, point) => sum + point.value, 0) / seriesData.length
    : null;
  const deltaPct = latestVal !== null && avgVal ? ((latestVal - avgVal) / avgVal) * 100 : null;

  return (
    <section className="main-chart" aria-label="Utility Consumption Analytics">
      <header className="main-chart__head">
        <div className="main-chart__title-area">
          <p className="eyebrow eyebrow-accent">Analytical visualization</p>
          <h2 className="main-chart__title">{currentUtil.label} telemetry</h2>
          <p className="main-chart__sub">Timestamped readings received from Velxio devices</p>
        </div>
        <div className="main-chart__controls">
          <Segmented size="sm" ariaLabel="Select utility" value={utility} onChange={setUtility} options={UTILITY_OPTIONS.map((u) => ({ id: u.id, label: u.label }))} />
          <Segmented size="sm" ariaLabel="Select time range" value={range} onChange={setRange} options={RANGE_OPTIONS} />
        </div>
      </header>
      <div className="main-chart__kpi-bar">
        <div className="main-chart__kpi-item"><span className="main-chart__kpi-label">Latest reading</span><span className="main-chart__kpi-val num">{formatNumber(latestVal)} <span className="main-chart__kpi-unit">{currentUtil.unit}</span></span></div>
        <div className="main-chart__kpi-item"><span className="main-chart__kpi-label">Observed average</span><span className="main-chart__kpi-val num is-muted">{formatNumber(avgVal)} <span className="main-chart__kpi-unit">{currentUtil.unit}</span></span></div>
        <div className="main-chart__kpi-item"><span className="main-chart__kpi-label">Variance</span><span className="main-chart__kpi-badge num is-normal"><TrendingUp size={12} aria-hidden="true" />{deltaPct === null ? 'N/A' : `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%`}</span></div>
        {block && <div className="main-chart__kpi-item is-scope"><span className="main-chart__kpi-label">Target node</span><span className="main-chart__kpi-tag num">{block.name} ({block.code})</span></div>}
      </div>
      <div className="main-chart__body">
        {loading ? <EmptyState title="Loading telemetry" message="Waiting for the backend to return timestamped readings." /> : seriesData.length === 0 ? <EmptyState title="Waiting for sensor data" message="No valid readings are available for this utility and time range." /> : <AnalyticsChart type="area" data={seriesData} series={[{ dataKey: 'value', name: currentUtil.label, color: utility === 'water' ? 'var(--blue)' : 'var(--accent)' }]} unit={currentUtil.unit} height={260} ariaLabel={`${currentUtil.label} telemetry trend chart`} />}
      </div>
    </section>
  );
}
