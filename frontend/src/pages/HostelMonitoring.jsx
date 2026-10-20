import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, CircleDollarSign, Droplets, Gauge, Home, Radio, Waves, Zap } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Logo from '../components/ui/Logo.jsx';
import BlocksBreadcrumb from '../components/blocks/BlocksBreadcrumb.jsx';
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
import './HostelMonitoring.css';

const RANGE_OPTS = [
  { id: '24h', label: '24H' },
  { id: '7d', label: '7D' },
  { id: '6w', label: '6W' },
];

export default function HostelMonitoring() {
  const { hostelId } = useParams();
  const { blocks, alerts, insights, acknowledgeAlert, resolveAlert } = useData();
  const c = useChartColors();

  const [utility, setUtility] = useState('power');
  const [range, setRange] = useState('24h');

  // Search case-insensitively by code or id
  const hostel = blocks.find(
    (b) =>
      b.code.toLowerCase() === (hostelId || '').toLowerCase() ||
      b.id.toLowerCase() === (hostelId || '').toLowerCase()
  );

  const meta = UTILITIES.find((u) => u.id === utility) ?? UTILITIES[0];

  const seriesQuery = useMemo(
    () => ({
      seed: `${hostel?.code || hostelId}-${utility}`,
      range,
    }),
    [hostel, hostelId, utility, range]
  );

  const { data: series } = useServiceData(
    () => readingService.series(seriesQuery),
    useMemo(() => getSeries(seriesQuery), [seriesQuery]),
    [seriesQuery]
  );

  const hostelAlerts = alerts.filter(
    (a) => a.blockCode?.toLowerCase() === hostel?.code?.toLowerCase()
  );
  const hostelInsights = insights.filter(
    (i) => i.blockCode?.toLowerCase() === hostel?.code?.toLowerCase()
  );

  if (!hostel) {
    return (
      <div className="stack stack--lg">
        <BlocksBreadcrumb
          items={[
            { label: 'Hostel', to: '/blocks/hostel' },
            { label: 'Not Found' },
          ]}
        />
        <EmptyState
          icon={Home}
          title="Hostel not found"
          message={`No hostel is registered with the identifier “${hostelId}”.`}
          action={
            <Link to="/blocks/hostel" className="btn btn--ghost btn--sm">
              Back to Hostels
            </Link>
          }
        />
      </div>
    );
  }

  const isBoys = hostel.subCategory === 'boys';
  const purpleAccent = c.purple || '#8B5CF6';

  return (
    <div className="stack stack--lg hostel-monitoring">
      {/* Breadcrumb Navigation: Blocks > Hostel > [Hostel Name] */}
      <BlocksBreadcrumb
        items={[
          { label: 'Hostel', to: '/blocks/hostel', icon: Home },
          { label: hostel.name },
        ]}
      />

      <PageHeader
        eyebrow={`${isBoys ? 'Boys Hostel' : 'Girls Hostel'} · ${hostel.code}`}
        title={`${hostel.name} Hostel`}
        subtitle="Live incomer telemetry, power distribution, and bulk water flow monitoring. (Direct Unit Telemetry)"
        meta={
          <>
            <div className="hm__brand-badge">
              <Logo size="xs" />
              <span className="eyebrow hm__badge-eyebrow">AIMDS Residential Telemetry</span>
            </div>
            <StatusIndicator status={hostel.status || 'operational'} />
            <span className="hm__meta num">
              <Radio size={13} aria-hidden="true" />
              {hostel.sensorCount ?? hostel.sensors?.length ?? 5} sensors
            </span>
            <span className="hm__meta num">
              {isBoys ? 'Boys Wing' : 'Girls Wing'}
            </span>
          </>
        }
        actions={
          <div className="hm__top-actions">
            <Link to="/blocks/hostel" className="btn btn--ghost btn--sm">
              All Hostels
            </Link>
            <Link to="/live" className="btn btn--primary btn--sm hm__live-btn">
              Live Grid Feed
            </Link>
          </div>
        }
      />

      {/* ---------------- Current Status Banner ---------------- */}
      <section className="hm__status-banner">
        <div className="hm__status-main">
          <div className="hm__status-tag">
            <span className="hm__pulse-dot" />
            <span>Direct Utility Feed Active</span>
          </div>
          <p className="hm__status-text">
            Residential incomer telemetry is streaming normally. All critical parameters
            (voltage stability, current draw, and water ingress flow) are operating inside nominal bounds.
          </p>
        </div>
        <div className="hm__status-side">
          <div className="hm__status-kpi">
            <span className="eyebrow">Connected Incomer</span>
            <span className="num font-bold">{formatNumber(hostel.power)} kW</span>
          </div>
          <div className="hm__status-kpi">
            <span className="eyebrow">Today's Inflow</span>
            <span className="num font-bold">{formatNumber(hostel.water)} L</span>
          </div>
        </div>
      </section>

      {/* ---------------- Key Telemetry Cards ---------------- */}
      <section>
        <div className="sec-head">
          <div>
            <h2 className="sec-head__title">Live Telemetry Readings</h2>
            <p className="sec-head__sub">Select any telemetry stream below to inspect historical trends</p>
          </div>
          <span className="hm__hint">Tap card to plot trend below</span>
        </div>
        <div className="hm__metrics-grid">
          {[
            { id: 'power', label: 'Power Load', val: hostel.power, unit: 'kW', icon: Gauge },
            { id: 'voltage', label: 'Mains Voltage', val: hostel.voltage, unit: 'V', icon: Zap },
            { id: 'current', label: 'Current Draw', val: hostel.current, unit: 'A', icon: Activity },
            { id: 'energy', label: 'Energy Consumption', val: hostel.energy, unit: 'kWh', icon: Zap },
            { id: 'waterFlow', label: 'Water Flow', val: hostel.waterFlow, unit: 'L/min', icon: Waves },
            { id: 'water', label: 'Water Volume', val: hostel.water, unit: 'L', icon: Droplets },
            { id: 'cost', label: "Today's Cost", val: hostel.todayCost, unit: '₹', icon: CircleDollarSign },
          ].map((item) => {
            const isSelected = utility === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setUtility(item.id)}
                className={`hm__metric-card ${isSelected ? 'is-selected' : ''}`}
              >
                <div className="hm__metric-top">
                  <span className="hm__metric-label">{item.label}</span>
                  <item.icon size={15} className="hm__metric-icon" aria-hidden="true" />
                </div>
                <div className="hm__metric-val num">
                  {formatNumber(item.val)} <span className="hm__metric-unit">{item.unit}</span>
                </div>
                <div className="hm__metric-foot">
                  <span className="hm__metric-tag">Live Stream</span>
                  {isSelected && <span className="hm__metric-active-pill">Graphing</span>}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------------- Trend Chart ---------------- */}
      <section className="chart-panel hm__chart-panel">
        <header className="chart-panel__head">
          <div className="min0">
            <p className="chart-panel__title">
              {meta.label} Trend · {hostel.name} Hostel
            </p>
            <p className="chart-panel__sub">
              Live residential telemetry observed against modelled baseline · {meta.unit}
            </p>
          </div>
          <div className="fm__chart-controls">
            <Segmented
              size="sm"
              ariaLabel="Select utility"
              value={utility}
              onChange={setUtility}
              options={[
                { id: 'power', label: 'Power' },
                { id: 'voltage', label: 'Voltage' },
                { id: 'current', label: 'Current' },
                { id: 'energy', label: 'Energy' },
                { id: 'waterFlow', label: 'Flow' },
                { id: 'cost', label: 'Cost' },
              ]}
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
          ariaLabel={`${meta.label} trend for ${hostel.name}`}
          series={[
            {
              key: 'expected',
              name: 'Baseline',
              color: c.blue,
              dashed: true,
              noFill: true,
              strokeWidth: 1.4,
            },
            { key: 'value', name: 'Observed', color: purpleAccent, strokeWidth: 2.2 },
          ]}
        />

        <dl className="fm__chart-stats">
          <div>
            <dt>Current Value</dt>
            <dd className="num">
              {formatNumber(hostel.utilities?.[utility]?.value ?? series[series.length - 1]?.value ?? 0)}{' '}
              {meta.unit}
            </dd>
          </div>
          <div>
            <dt>Operating Envelope</dt>
            <dd className="num">
              {hostel.utilities?.[utility]?.expected?.[0] ?? '220'}–
              {hostel.utilities?.[utility]?.expected?.[1] ?? '245'} {meta.unit}
            </dd>
          </div>
          <div>
            <dt>Telemetry Ingest</dt>
            <dd className="num">30s Cadence</dd>
          </div>
          <div>
            <dt>Samples</dt>
            <dd className="num">{series.length}</dd>
          </div>
        </dl>
      </section>

      {/* ---------------- Sensors on Hostel Incomer ---------------- */}
      <section>
        <div className="sec-head">
          <div>
            <h2 className="sec-head__title">Sensors & Telemetry Nodes</h2>
            <p className="sec-head__sub">Direct main meters provisioned on {hostel.name} incoming lines</p>
          </div>
          <Link to="/sensors" className="fm__link">
            All estate sensors
          </Link>
        </div>
        <div className="grid-auto">
          {(hostel.sensors || []).map((s, i) => (
            <SensorCard key={s.id} sensor={s} index={i} />
          ))}
        </div>
      </section>

      {/* ---------------- Alerts / Insights ---------------- */}
      {(hostelInsights.length > 0 || hostelAlerts.length > 0) && (
        <div className="grid-2">
          {hostelInsights.length > 0 && (
            <section>
              <div className="sec-head">
                <h2 className="sec-head__title">AI Telemetry Findings</h2>
              </div>
              <div className="stack">
                {hostelInsights.map((insight, i) => (
                  <AIInsightCard key={insight.id} insight={insight} index={i} />
                ))}
              </div>
            </section>
          )}
          {hostelAlerts.length > 0 && (
            <section>
              <div className="sec-head">
                <h2 className="sec-head__title">Active Anomaly Flags</h2>
              </div>
              <div className="stack">
                {hostelAlerts.map((a, i) => (
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
        Hostel telemetry is provisioned at the building-level incomer. No sub-floor meters are configured.
      </motion.p>
    </div>
  );
}
