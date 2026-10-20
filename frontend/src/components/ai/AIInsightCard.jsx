import { motion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  ChartSpline,
  Lightbulb,
  MapPin,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery.js';
import './AIInsightCard.css';

const KIND_ICON = {
  anomaly: Sparkles,
  optimization: Lightbulb,
  forecast: ChartSpline,
  maintenance: Wrench,
};

const SEV = {
  high: { label: 'HIGH', tone: 'crit' },
  medium: { label: 'MEDIUM', tone: 'warn' },
  low: { label: 'LOW', tone: 'info' },
};

/**
 * Structured AI insight — answers WHAT happened, WHERE, HOW serious,
 * WHY it may have happened and WHAT to do, in that reading order.
 */
export default function AIInsightCard({ insight, index = 0, onOpen, expanded = false }) {
  const reduced = usePrefersReducedMotion();
  const Icon = KIND_ICON[insight.kind] ?? Brain;
  const sev = SEV[insight.severity] ?? SEV.medium;

  return (
    <motion.article
      className={`aic tone-${sev.tone} ${expanded ? 'is-expanded' : ''}`}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.35), duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby={`insight-${insight.id}-title`}
    >
      {!reduced && <span className="aic__scan" aria-hidden="true" />}

      <header className="aic__head">
        <span className="aic__badge">
          <Icon size={13} strokeWidth={2.1} aria-hidden="true" />
          <span>AI Insight</span>
        </span>
        <span className="aic__id num">{insight.id}</span>
        <span className={`aic__sev sev-${sev.tone}`} title={`Severity ${sev.label}`}>
          {sev.label}
        </span>
      </header>

      <h3 className="aic__title" id={`insight-${insight.id}-title`}>
        {insight.title}
      </h3>
      <p className="aic__headline">{insight.headline}</p>

      <p className="aic__where">
        <MapPin size={12} aria-hidden="true" />
        <span>
          {insight.blockName}
          {insight.floorName ? ` — ${insight.floorName}` : ''}
        </span>
      </p>

      <p className="aic__summary">{insight.summary}</p>

      <dl className="aic__metric">
        <div className="aic__metric-cell">
          <dt>{insight.metric.label}</dt>
          <dd className="num">
            {insight.metric.current}
            <span className="aic__unit">{insight.metric.unit}</span>
          </dd>
        </div>
        <div className="aic__metric-cell">
          <dt>Expected</dt>
          <dd className="num is-dim">
            {insight.metric.expected}
            <span className="aic__unit">{insight.metric.unit}</span>
          </dd>
        </div>
        <div className="aic__metric-cell">
          <dt>Deviation</dt>
          <dd className={`num is-dev sev-${sev.tone}`}>{insight.metric.deviation}</dd>
        </div>
      </dl>

      <div className="aic__reason">
        <div className="aic__reason-row">
          <span className="eyebrow">Possible cause</span>
          <p>{insight.cause}</p>
        </div>
        <div className="aic__reason-row is-action">
          <span className="eyebrow eyebrow-accent">Recommended action</span>
          <p>{insight.action}</p>
        </div>
      </div>

      <footer className="aic__foot">
        <span
          className="aic__conf"
          title={insight.faultProbability != null ? `Validated fault probability ${Math.round(insight.faultProbability * 100)}%` : 'No validated fault probability; anomaly and trend evidence only'}
        >
          <span className="aic__conf-track" aria-hidden="true">
            <span className="aic__conf-fill" style={{ width: `${insight.confidence}%` }} />
          </span>
          <span className="num">
            {insight.faultProbability != null ? `${Math.round(insight.faultProbability * 100)}% fault probability` : 'No fault probability'}
          </span>
        </span>
        <span className="aic__time num">{insight.detectedAgo}</span>
        {onOpen && (
          <button type="button" className="aic__cta" onClick={() => onOpen(insight)}>
            Decision flow
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        )}
      </footer>
    </motion.article>
  );
}
