import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Cpu, Sparkles, Target, Timer } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Logo from '../components/ui/Logo.jsx';
import AIInsightCard from '../components/ai/AIInsightCard.jsx';
import AIDecisionFlow from '../components/flow/AIDecisionFlow.jsx';
import Modal from '../components/ui/Modal.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import { EmptyState } from '../components/ui/States.jsx';
import { useData } from '../context/DataContext.jsx';
import './AIInsights.css';

const KIND_OPTS = [
  { id: 'all', label: 'All' },
  { id: 'anomaly', label: 'Anomalies' },
  { id: 'optimization', label: 'Optimisation' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'maintenance', label: 'Maintenance' },
];

const SEV_OPTS = [
  { id: 'all', label: 'Any severity' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
];

export default function AIInsights() {
  const { insights, overview } = useData();
  const [kind, setKind] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [selected, setSelected] = useState(null);

  const rows = useMemo(
    () =>
      insights.filter((i) => {
        if (kind !== 'all' && i.kind !== kind) return false;
        if (severity !== 'all' && i.severity !== severity) return false;
        return true;
      }),
    [insights, kind, severity],
  );

  const stats = useMemo(() => {
    const high = insights.filter((i) => i.severity === 'high').length;
    const anomalies = insights.filter((i) => i.kind === 'anomaly').length;
    const avgConf = Math.round(
      insights.reduce((n, i) => n + i.confidence, 0) / Math.max(insights.length, 1),
    );
    return { high, anomalies, avgConf };
  }, [insights]);

  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="Decision support"
        title="AI Insights"
        subtitle="Structured findings, not a chat window. Each card states what happened, where, how serious it is, why it may have happened and what to do next."
        meta={
          <div className="ai__brand-meta">
            <Logo size="xs" />
            <span className="eyebrow eyebrow-accent">AIMDS Decision Support Inference</span>
          </div>
        }
      />

      {/* ---------------- engine status ---------------- */}
      <section className="ai__engine" aria-label="AI engine status">
        <div className="ai__engine-main">
          <span className="ai__engine-icon" aria-hidden="true">
            <Brain size={18} strokeWidth={1.9} />
            <motion.span
              className="ai__engine-ring"
              animate={{ opacity: [0.9, 0.25, 0.9] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
          <div className="min0">
            <p className="ai__engine-title">AI engine active</p>
            <p className="ai__engine-sub num">
              Anomaly v3.2 · Optimizer v1.8 · Forecast v2.0 · last run {overview.aiLastRun}
            </p>
          </div>
        </div>

        <dl className="ai__engine-stats">
          <div>
            <dt>
              <Sparkles size={11} aria-hidden="true" /> Findings
            </dt>
            <dd className="num">{insights.length}</dd>
          </div>
          <div>
            <dt>
              <Target size={11} aria-hidden="true" /> High severity
            </dt>
            <dd className="num">{stats.high}</dd>
          </div>
          <div>
            <dt>
              <Cpu size={11} aria-hidden="true" /> Anomalies
            </dt>
            <dd className="num">{stats.anomalies}</dd>
          </div>
          <div>
            <dt>
              <Timer size={11} aria-hidden="true" /> Avg confidence
            </dt>
            <dd className="num">{stats.avgConf}%</dd>
          </div>
        </dl>
      </section>

      {/* ---------------- filters ---------------- */}
      <section className="ai__filters" aria-label="Insight filters">
        <div className="ai__filter-group">
          <span className="field__label">Category</span>
          <Segmented
            size="sm"
            ariaLabel="Filter by category"
            value={kind}
            onChange={setKind}
            options={KIND_OPTS}
          />
        </div>
        <div className="ai__filter-group">
          <span className="field__label">Severity</span>
          <Segmented
            size="sm"
            ariaLabel="Filter by severity"
            value={severity}
            onChange={setSeverity}
            options={SEV_OPTS}
          />
        </div>
      </section>

      {/* ---------------- cards ---------------- */}
      {rows.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No insights in this view"
          message="The AI engine has not produced findings matching these filters in the current window."
        />
      ) : (
        <div className="ai__grid">
          {rows.map((insight, i) => (
            <AIInsightCard
              key={insight.id}
              insight={insight}
              index={i}
              onOpen={setSelected}
            />
          ))}
        </div>
      )}

      {/* ---------------- decision flow (inline signature) ---------------- */}
      {insights[0] && (
        <AIDecisionFlow decision={insights[0].decision} severity={insights[0].severity} />
      )}

      {/* ---------------- detail modal ---------------- */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        eyebrow={selected ? `${selected.id} · ${selected.model}` : ''}
        title={selected ? selected.headline : ''}
        description={
          selected ? `${selected.blockName}${selected.floorName ? ` — ${selected.floorName}` : ''}` : ''
        }
        size="lg"
        footer={
          <button type="button" className="btn btn--primary" onClick={() => setSelected(null)}>
            Close
          </button>
        }
      >
        {selected && (
          <div className="stack">
            <p className="ai__modal-summary">{selected.summary}</p>
            <AIDecisionFlow decision={selected.decision} severity={selected.severity} compact />
          </div>
        )}
      </Modal>
    </div>
  );
}
