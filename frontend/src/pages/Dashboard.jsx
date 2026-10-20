import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Bell, Layers, Plus, Radio } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import SystemRibbon from '../components/dashboard/SystemRibbon.jsx';
import MainUtilityChart from '../components/dashboard/MainUtilityChart.jsx';
import LocationSelector from '../components/dashboard/LocationSelector.jsx';
import BlockVisualization from '../components/blocks/BlockVisualization.jsx';
import AddBlockModal from '../components/blocks/AddBlockModal.jsx';
import DashboardAIInsight from '../components/dashboard/DashboardAIInsight.jsx';
import StatusIndicator from '../components/ui/StatusIndicator.jsx';
import Sparkline from '../components/ui/Sparkline.jsx';
import { LoadingState } from '../components/ui/States.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useLiveStream } from '../hooks/useLiveStream.js';
import { formatNumber, relativeTime, SEVERITY_TONE } from '../utils/format.js';
import './Dashboard.css';

const LIVE_CHANNELS = [
  { id: 'power', label: 'Power', unit: 'W' },
  { id: 'temperature', label: 'Temp', unit: '°C' },
  { id: 'humidity', label: 'Humidity', unit: '%' },
];

export default function Dashboard() {
  const { blocks, alerts, insights, overview, stats, loading, addBlock } = useData();
  const { push } = useToast();
  const [activeBlock, setActiveBlock] = useState(blocks[0]?.code ?? 'SF');
  const [modalOpen, setModalOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() =>
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  );

  const block = blocks.find((b) => b.code === activeBlock) ?? blocks[0];
  const { values, history, connection } = useLiveStream({
    channels: LIVE_CHANNELS,
    intervalMs: 2600,
    deviceId: import.meta.env?.VITE_TELEMETRY_DEVICE_ID,
  });

  useEffect(() => {
    setLastUpdated(
      new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    );
  }, [values]);

  const topInsight = insights[0];
  const recentAlerts = useMemo(
    () => alerts.filter((a) => a.severity !== 'resolved').slice(0, 4),
    [alerts],
  );

  const handleCreate = async (payload) => {
    const created = await addBlock(payload);
    setActiveBlock(created.code);
    push({
      tone: 'success',
      title: `${created.name} (${created.code}) provisioned`,
      message: `${created.floors.length} floors and ${created.sensorCount} sensors generated.`,
    });
  };

  if (loading) {
    return (
      <div className="stack">
        <PageHeader eyebrow="OPERATIONS OVERVIEW" title="Dashboard" />
        <LoadingState rows={4} />
      </div>
    );
  }

  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="OPERATIONS OVERVIEW"
        title="Dashboard"
        actions={
          <>
            <Link to="/live" className="btn btn--ghost">
              <Radio size={15} aria-hidden="true" />
              Open live monitoring
            </Link>
            <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)}>
              <Plus size={15} aria-hidden="true" />
              Add location
            </button>
          </>
        }
      />

      <SystemRibbon overview={overview} stats={stats} />

      <MainUtilityChart block={block} />

      <div className="grid-split">
        {/* ---------------- block-wise monitoring ---------------- */}
        <div className="stack">
          <div className="sec-head">
            <div>
              <h2 className="sec-head__title">
                <Layers size={16} aria-hidden="true" />
                Location overview
              </h2>
              <p className="sec-head__sub">Select a location to inspect floor-level telemetry</p>
            </div>
            {blocks.length > 1 && (
              <LocationSelector
                blocks={blocks}
                activeBlock={activeBlock}
                onSelect={setActiveBlock}
              />
            )}
          </div>

          {block && <BlockVisualization block={block} key={block.code} />}

          <div className="dash__blockmeta">
            <div className="dash__blockmeta-item">
              <span className="eyebrow">Total energy</span>
              <span className="num">{formatNumber(block?.totals.energy)} kWh</span>
            </div>
            <div className="dash__blockmeta-item">
              <span className="eyebrow">Total water</span>
              <span className="num">{formatNumber(block?.totals.water)} L</span>
            </div>
            <div className="dash__blockmeta-item">
              <span className="eyebrow">Connected load</span>
              <span className="num">{formatNumber(block?.totals.load)} kW</span>
            </div>
            <Link to={`/blocks/${block?.code}`} className="dash__blockmeta-link">
              Block details
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* ---------------- right column ---------------- */}
        <div className="stack">
          {/* live telemetry pulse */}
          <section className="dash__live" aria-label="Live readings">
            <header className="dash__live-head">
              <div>
                <p className="eyebrow eyebrow-accent">LIVE TELEMETRY</p>
                <div className="dash__live-status">
                  <span className="dash__live-dot" aria-hidden="true" />
                  <span className="dash__live-status-text">{connection.state.toUpperCase()}</span>
                  <span className="dash__live-sep">·</span>
                  <span className="dash__live-time num">{connection.lastUpdate ? `Last updated ${lastUpdated}` : 'Waiting for sensor data'}</span>
                </div>
              </div>
              <StatusIndicator status={connection.state === 'connected' ? 'online' : connection.state} label={connection.state === 'connected' ? 'Streaming' : 'No data'} size="sm" />
            </header>
            <ul className="dash__live-grid">
              {LIVE_CHANNELS.map((ch) => (
                <li key={ch.id}>
                  <span className="dash__live-label">{ch.label}</span>
                  <motion.span
                    key={values[ch.id]}
                    className="dash__live-value num"
                    initial={{ opacity: 0.55, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    {formatNumber(values[ch.id])}
                    <span className="dash__live-unit">{ch.unit}</span>
                  </motion.span>
                  <Sparkline
                    data={history.map((h) => h[ch.id])}
                    tone={ch.id === 'humidity' ? 'var(--blue)' : 'var(--accent)'}
                    height={24}
                    label={`${ch.label} live trend`}
                  />
                </li>
              ))}
            </ul>
          </section>

          {/* priority AI insight */}
          <div>
            <div className="sec-head">
              <h2 className="sec-head__title">Priority insight</h2>
              <Link to="/insights" className="dash__more">
                View all insights <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
            {topInsight && <DashboardAIInsight insight={topInsight} />}
          </div>

          {/* alerts */}
          <div>
            <div className="sec-head">
              <h2 className="sec-head__title">
                <Bell size={15} aria-hidden="true" />
                Active alerts
              </h2>
              <Link to="/alerts" className="dash__more">
                Open alert centre <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
            <ul className="dash__alerts">
              {recentAlerts.map((a, i) => (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <Link to="/alerts" className={`dash__alert tone-${SEVERITY_TONE[a.severity]}`}>
                    <span className="dash__alert-bar" aria-hidden="true" />
                    <span className="min0">
                      <span className="dash__alert-title">{a.title}</span>
                      <span className="dash__alert-meta num">
                        {a.blockName} · {a.floorName} · {relativeTime(a.minutesAgo)}
                      </span>
                    </span>
                    <span className="dash__alert-val num">
                      {a.value}
                      <span>{a.unit}</span>
                    </span>
                  </Link>
                </motion.li>
              ))}
              {recentAlerts.length === 0 && (
                <li className="dash__alert-empty">No active alerts. All monitored utilities are within range.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <AddBlockModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
        existingCodes={blocks.map((b) => b.code)}
      />
    </div>
  );
}
