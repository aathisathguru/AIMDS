import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Boxes, CalendarDays, MapPin, Radio, Ruler } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Logo from '../components/ui/Logo.jsx';
import BlocksBreadcrumb from '../components/blocks/BlocksBreadcrumb.jsx';
import BlockVisualization from '../components/blocks/BlockVisualization.jsx';
import FloorCard from '../components/blocks/FloorCard.jsx';
import AnalyticsChart from '../components/charts/AnalyticsChart.jsx';
import AIInsightCard from '../components/ai/AIInsightCard.jsx';
import AlertCard from '../components/alerts/AlertCard.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import StatusIndicator from '../components/ui/StatusIndicator.jsx';
import { EmptyState } from '../components/ui/States.jsx';
import { useData } from '../context/DataContext.jsx';
import { useChartColors } from '../context/ThemeContext.jsx';
import { getComparisonSeries, getSeries } from '../data/mockData.js';
import { readingService } from '../services/api.js';
import { useServiceData } from '../hooks/useServiceData.js';
import { rollupStatus } from '../utils/format.js';
import './BlockDetails.css';

const RANGE_OPTS = [
  { id: '24h', label: '24H' },
  { id: '7d', label: '7D' },
  { id: '6w', label: '6W' },
];

export default function BlockDetails() {
  const { blockId } = useParams();
  const { blocks, alerts, insights, acknowledgeAlert, resolveAlert } = useData();
  const c = useChartColors();
  const [range, setRange] = useState('24h');

  // Case-insensitive lookup by code or id
  const block = blocks.find(
    (b) =>
      b.code.toLowerCase() === (blockId || '').toLowerCase() ||
      b.id.toLowerCase() === (blockId || '').toLowerCase()
  );

  // If this block is actually a hostel, redirect to the hostel live view
  if (block && block.category === 'hostel') {
    return <Navigate to={`/blocks/hostel/${block.code}`} replace />;
  }

  // Energy query
  const energyQuery = useMemo(
    () => ({ seed: `${blockId}-energy`, range, base: block?.totals?.energy ?? 900 }),
    [blockId, range, block]
  );
  const { data: energySeries } = useServiceData(
    () => readingService.series(energyQuery),
    useMemo(() => getSeries(energyQuery), [energyQuery]),
    [energyQuery]
  );
  const { data: floorCompare } = useServiceData(
    () => readingService.comparison('7d'),
    useMemo(() => getComparisonSeries('7d'), []),
    []
  );

  const blockAlerts = alerts.filter(
    (a) => a.blockCode?.toLowerCase() === (block?.code || blockId).toLowerCase()
  );
  const blockInsights = insights.filter(
    (i) => i.blockCode?.toLowerCase() === (block?.code || blockId).toLowerCase()
  );

  // Order floors ascending: Basement -> Ground -> Floor 1 -> Floor 2 -> Floor 3
  const displayFloors = useMemo(() => {
    const order = { BASE: 0, B: 0, GF: 1, G: 1, '1F': 2, '2F': 3, '3F': 4, '4F': 5 };
    return [...(block?.floors || [])].sort((a, b) => {
      const oa = order[a.code] ?? a.level ?? 99;
      const ob = order[b.code] ?? b.level ?? 99;
      return oa - ob;
    });
  }, [block?.floors]);

  if (!block) {
    return (
      <div className="stack stack--lg">
        <BlocksBreadcrumb
          items={[
            { label: 'Academics', to: '/blocks/academics' },
            { label: 'Not Found' },
          ]}
        />
        <EmptyState
          icon={Boxes}
          title="Block not found"
          message={`No block is registered with the identifier “${blockId}”.`}
          action={
            <Link to="/blocks/academics" className="btn btn--ghost btn--sm">
              Back to Academics
            </Link>
          }
        />
      </div>
    );
  }

  const status = rollupStatus(block.floors || []);

  return (
    <div className="stack stack--lg">
      {/* Breadcrumb Navigation: Blocks > Academics > [Block Name] */}
      <BlocksBreadcrumb
        items={[
          { label: 'Academics', to: '/blocks/academics' },
          { label: block.name },
        ]}
      />

      <PageHeader
        eyebrow={`Academic Block · ${block.code}`}
        title={block.name}
        subtitle={block.description}
        meta={
          <>
            <div className="bd__brand-badge">
              <Logo size="xs" />
              <span className="eyebrow eyebrow-accent">AIMDS Node Feed</span>
            </div>
            <span className="bd__meta">
              <MapPin size={13} aria-hidden="true" />
              {block.location}
            </span>
            <span className="bd__meta num">
              <CalendarDays size={13} aria-hidden="true" />
              Commissioned {block.commissioned}
            </span>
            <span className="bd__meta num">
              <Radio size={13} aria-hidden="true" />
              {block.sensorCount} sensors
            </span>
            <span className="bd__meta num">
              <Ruler size={13} aria-hidden="true" />
              {block.floors?.length ?? 0} floors
            </span>
            <StatusIndicator status={status === 'normal' ? block.status : status} size="sm" />
          </>
        }
        actions={
          <>
            <Link to="/blocks/academics" className="btn btn--ghost">
              All Blocks
            </Link>
            <Link to="/live" className="btn btn--primary">
              Live view
            </Link>
          </>
        }
      />

      {/* ---------------- Floors Grid (Primary Interaction) ---------------- */}
      <section className="bd__floors-section">
        <div className="sec-head">
          <div>
            <h2 className="sec-head__title">Building Floors</h2>
            <p className="sec-head__sub">Select a floor card to open detailed utility monitoring</p>
          </div>
          <span className="num bd__count">{displayFloors.length} floors active</span>
        </div>
        <div className="grid-auto">
          {displayFloors.map((floor, i) => (
            <FloorCard
              key={floor.id}
              floor={floor}
              blockCode={block.code}
              blockName={block.name}
              index={i}
            />
          ))}
        </div>
      </section>

      {/* ---------------- Split: 3D Elevation & Trends ---------------- */}
      <div className="grid-split">
        <BlockVisualization block={block} />

        <div className="stack">
          <section className="chart-panel">
            <header className="chart-panel__head">
              <div className="min0">
                <p className="chart-panel__title">Block energy trend</p>
                <p className="chart-panel__sub">Aggregated across all floors</p>
              </div>
              <Segmented size="sm" options={RANGE_OPTS} value={range} onChange={setRange} ariaLabel="Time range" />
            </header>
            <AnalyticsChart
              type="area"
              data={energySeries}
              unit="kWh"
              height={210}
              ariaLabel={`${block.name} energy trend over ${range}`}
              series={[{ key: 'value', name: 'Energy', color: c.accent }]}
            />
          </section>

          <section className="chart-panel">
            <header className="chart-panel__head">
              <div className="min0">
                <p className="chart-panel__title">Floor comparison</p>
                <p className="chart-panel__sub">Energy consumption · last 7 days</p>
              </div>
            </header>
            <AnalyticsChart
              type="bar"
              data={floorCompare}
              unit="kWh"
              height={210}
              showLegend
              ariaLabel="Energy consumption compared across floors"
              series={[
                { key: 'Base', name: 'Base', color: c.blue },
                { key: '1st Floor', name: '1st', color: c.accent },
                { key: '2nd Floor', name: '2nd', color: c.ok },
              ]}
            />
          </section>
        </div>
      </div>

      {/* ---------------- Insights & Alerts ---------------- */}
      <div className="grid-2">
        <section>
          <div className="sec-head">
            <h2 className="sec-head__title">AI insights for this block</h2>
          </div>
          <div className="stack">
            {blockInsights.slice(0, 2).map((insight, i) => (
              <AIInsightCard key={insight.id} insight={insight} index={i} />
            ))}
            {blockInsights.length === 0 && (
              <EmptyState
                title="No AI findings"
                message="The AI engine has not raised anything for this block in the current window."
              />
            )}
          </div>
        </section>

        <section>
          <div className="sec-head">
            <h2 className="sec-head__title">Alerts</h2>
            <Link to="/alerts" className="bd__link">
              Alert centre
            </Link>
          </div>
          <div className="stack">
            {blockAlerts.slice(0, 4).map((a, i) => (
              <AlertCard
                key={a.id}
                alert={a}
                index={i}
                onAcknowledge={acknowledgeAlert}
                onResolve={resolveAlert}
              />
            ))}
            {blockAlerts.length === 0 && (
              <EmptyState title="No alerts" message="This block has no alerts on record." />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
