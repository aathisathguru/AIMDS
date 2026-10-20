import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layers, Radio, Ruler, Users } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Logo from '../components/ui/Logo.jsx';
import BlocksBreadcrumb from '../components/blocks/BlocksBreadcrumb.jsx';
import UtilityCard from '../components/monitoring/UtilityCard.jsx';
import SensorCard from '../components/monitoring/SensorCard.jsx';
import AnalyticsChart from '../components/charts/AnalyticsChart.jsx';
import AIInsightCard from '../components/ai/AIInsightCard.jsx';
import AlertCard from '../components/alerts/AlertCard.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import StatusIndicator from '../components/ui/StatusIndicator.jsx';
import { EmptyState } from '../components/ui/States.jsx';
import { useData } from '../context/DataContext.jsx';
import { useChartColors } from '../context/ThemeContext.jsx';
import { getSeries, UTILITIES } from '../data/mockData.js';
import { readingService } from '../services/api.js';
import { useServiceData } from '../hooks/useServiceData.js';
import { formatNumber } from '../utils/format.js';
import './FloorMonitoring.css';

const RANGE_OPTS = [
  { id: '24h', label: '24H' },
  { id: '7d', label: '7D' },
  { id: '6w', label: '6W' },
];

export default function FloorMonitoring() {
  const { blockId, floorId } = useParams();
  const navigate = useNavigate();
  const { blocks, alerts, insights, acknowledgeAlert, resolveAlert } = useData();
  const c = useChartColors();

  const [utility, setUtility] = useState('energy');
  const [range, setRange] = useState('24h');

  // Case-insensitive lookup
  const block = blocks.find(
    (b) =>
      b.code?.toLowerCase() === (blockId || '').toLowerCase() ||
      b.id?.toLowerCase() === (blockId || '').toLowerCase()
  );
  const floor = block?.floors?.find(
    (f) => f.code?.toLowerCase() === (floorId || '').toLowerCase()
  );

  const availableUtilities = useMemo(() => {
    if (!floor?.utilities) return UTILITIES.slice(0, 5);
    const list = UTILITIES.filter((u) => Boolean(floor.utilities[u.id]));
    return list.length > 0 ? list : UTILITIES.slice(0, 5);
  }, [floor]);

  const meta = UTILITIES.find((u) => u.id === utility) ?? availableUtilities[0] ?? UTILITIES[0];
  const seriesQuery = useMemo(
    () => ({
      seed: `${block?.code || blockId}-${floor?.code || floorId}-${utility}`,
      range,
    }),
    [blockId, floorId, utility, range, floor, block]
  );
  const { data: series } = useServiceData(
    () => readingService.series(seriesQuery),
    useMemo(() => getSeries(seriesQuery), [seriesQuery]),
    [seriesQuery]
  );

  const floorAlerts = alerts.filter(
    (a) =>
      a.blockCode?.toLowerCase() === (block?.code || blockId).toLowerCase() &&
      a.floorCode?.toLowerCase() === (floor?.code || floorId).toLowerCase()
  );
  const floorInsights = insights.filter(
    (i) =>
      i.blockCode?.toLowerCase() === (block?.code || blockId).toLowerCase() &&
      i.floorCode?.toLowerCase() === (floor?.code || floorId).toLowerCase()
  );

  if (!block || !floor) {
    return (
      <div className="stack stack--lg">
        <BlocksBreadcrumb
          items={[
            { label: 'Academics', to: '/blocks/academics' },
            { label: 'Floor Not Found' },
          ]}
        />
        <EmptyState
          icon={Layers}
          title="Floor not found"
          message="This floor is not part of the monitored estate."
          action={
            <Link to="/blocks/academics" className="btn btn--ghost btn--sm">
              Back to Academics
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="stack stack--lg">
      {/* Breadcrumb Navigation: Blocks > Academics > [Block Name] > [Floor Name] */}
      <BlocksBreadcrumb
        items={[
          { label: 'Academics', to: '/blocks/academics' },
          { label: block.name, to: `/blocks/academics/${block.code}` },
          { label: floor.name },
        ]}
      />

      <PageHeader
        eyebrow={`${block.name} (${block.code})`}
        title={floor.name}
        subtitle={`Live utility monitoring for ${floor.name.toLowerCase()} — ${floor.sensors.length} sensors reporting across ${floor.zones} zones.`}
        meta={
          <>
            <div className="fm__brand-badge">
              <Logo size="xs" />
              <span className="eyebrow eyebrow-accent">AIMDS Floor Telemetry</span>
            </div>
            <StatusIndicator status={floor.status} />
            <span className="fm__meta num">
              <Ruler size={13} aria-hidden="true" />
              {floor.area} m²
            </span>
            <span className="fm__meta num">
              <Users size={13} aria-hidden="true" />
              {floor.occupancy} occupants
            </span>
            <span className="fm__meta num">
              <Radio size={13} aria-hidden="true" />
              {floor.sensors.length} sensors
            </span>
          </>
        }
        actions={
          <Segmented
            size="sm"
            ariaLabel="Select floor"
            value={floor.code}
            onChange={(code) => navigate(`/blocks/academics/${block.code}/floors/${code}`)}
            options={block.floors.map((f) => ({ id: f.code, label: f.short }))}
          />
        }
      />

      {/* ---------------- current status ---------------- */}
      <section className="fm__status">
        <div className="fm__status-main">
          <p className="eyebrow eyebrow-accent">Current status</p>
          <p className="fm__status-text">
            {floor.status === 'normal'
              ? 'All monitored utilities are inside their expected envelopes.'
              : floor.status === 'attention'
                ? 'Energy consumption is tracking above the expected envelope. AIMDS has raised an anomaly for review.'
                : 'A critical deviation is active on this floor. Immediate inspection is recommended.'}
          </p>
        </div>
        <div className="fm__status-side">
          <StatusIndicator status={floor.status} />
          <span className="fm__status-time num">Updated 8 seconds ago</span>
        </div>
      </section>

      {/* ---------------- utility cards ---------------- */}
      <section>
        <div className="sec-head">
          <h2 className="sec-head__title">Utility readings</h2>
          <span className="fm__hint">Tap a utility to plot it below</span>
        </div>
        <div className="fm__utils">
          {UTILITIES.map((u, i) => {
            const data = floor.utilities?.[u.id];
            if (!data) return null;
            return (
              <UtilityCard
                key={u.id}
                utility={u.id}
                label={u.label}
                value={data.value}
                unit={data.unit}
                delta={data.delta}
                expected={data.expected}
                index={i}
                compact
                onClick={() => setUtility(u.id)}
              />
            );
          })}
        </div>
      </section>

      {/* ---------------- trend ---------------- */}
      <section className="chart-panel">
        <header className="chart-panel__head">
          <div className="min0">
            <p className="chart-panel__title">
              {meta.label} trend · {floor.name}
            </p>
            <p className="chart-panel__sub">
              Observed against the modelled expected envelope · {meta.unit}
            </p>
          </div>
          <div className="fm__chart-controls">
            <Segmented
              size="sm"
              ariaLabel="Select utility"
              value={utility}
              onChange={setUtility}
              options={availableUtilities.map((u) => ({ id: u.id, label: u.label }))}
            />
            <Segmented
              size="sm"
              ariaLabel="Time range"
              value={range}
              onChange={setRange}
              options={RANGE_OPTS}
            />
          </div>
        </header>

        <AnalyticsChart
          type="area"
          data={series}
          band
          unit={meta.unit}
          showLegend
          ariaLabel={`${meta.label} trend for ${floor.name}`}
          series={[
            {
              key: 'expected',
              name: 'Expected',
              color: c.blue,
              dashed: true,
              noFill: true,
              strokeWidth: 1.4,
            },
            { key: 'value', name: 'Observed', color: c.accent, strokeWidth: 2.2 },
          ]}
        />

        <dl className="fm__chart-stats">
          <div>
            <dt>Current</dt>
            <dd className="num">
              {formatNumber(floor.utilities?.[utility]?.value ?? 0)} {meta.unit}
            </dd>
          </div>
          <div>
            <dt>Expected</dt>
            <dd className="num">
              {floor.utilities?.[utility]?.expected?.[0] ?? '0'}–
              {floor.utilities?.[utility]?.expected?.[1] ?? '0'}{' '}
              {meta.unit}
            </dd>
          </div>
          <div>
            <dt>Change</dt>
            <dd className="num">{floor.utilities?.[utility]?.delta ?? 0}%</dd>
          </div>
          <div>
            <dt>Samples</dt>
            <dd className="num">{series.length}</dd>
          </div>
        </dl>
      </section>

      {/* ---------------- sensors ---------------- */}
      <section>
        <div className="sec-head">
          <div>
            <h2 className="sec-head__title">Sensors on this floor</h2>
            <p className="sec-head__sub">Expand a sensor for range, health and firmware</p>
          </div>
          <Link to="/sensors" className="fm__link">
            All sensors
          </Link>
        </div>
        <div className="grid-auto">
          {floor.sensors.map((s, i) => (
            <SensorCard key={s.id} sensor={s} index={i} />
          ))}
        </div>
      </section>

      {/* ---------------- related ---------------- */}
      {(floorInsights.length > 0 || floorAlerts.length > 0) && (
        <div className="grid-2">
          {floorInsights.length > 0 && (
            <section>
              <div className="sec-head">
                <h2 className="sec-head__title">AI findings</h2>
              </div>
              <div className="stack">
                {floorInsights.map((insight, i) => (
                  <AIInsightCard key={insight.id} insight={insight} index={i} />
                ))}
              </div>
            </section>
          )}
          {floorAlerts.length > 0 && (
            <section>
              <div className="sec-head">
                <h2 className="sec-head__title">Alerts on this floor</h2>
              </div>
              <div className="stack">
                {floorAlerts.map((a, i) => (
                  <AlertCard
                    key={a.id}
                    alert={a}
                    index={i}
                    onAcknowledge={acknowledgeAlert}
                    onResolve={resolveAlert}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <motion.p
        className="fm__footnote"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Readings and alerts update from the configured AIMDS data source. Check the connection status
        in Settings if this floor is not receiving fresh telemetry.
      </motion.p>
    </div>
  );
}
