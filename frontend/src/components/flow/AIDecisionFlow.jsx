import { motion } from 'framer-motion';
import { Activity, Gauge, Radio, Scan, Search, Target } from 'lucide-react';
import { decisionStages } from '../../data/mockData.js';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery.js';
import './AIDecisionFlow.css';

const ICONS = {
  radio: Radio,
  activity: Activity,
  scan: Scan,
  gauge: Gauge,
  search: Search,
  target: Target,
};

const KEY_BY_STAGE = {
  sensor: 'sensorData',
  pattern: 'patternAnalysis',
  anomaly: 'anomalyDetection',
  severity: 'severity',
  cause: 'cause',
  recommendation: 'recommendation',
};

const SEV_TONE = { high: 'crit', medium: 'warn', low: 'info' };

/**
 * AI decision chain — the reasoning path from raw readings to a
 * recommended action. Vertical timeline on phones, horizontal rail on
 * desktop. Signature AIMDS component.
 */
export default function AIDecisionFlow({ decision, severity = 'medium', compact = false }) {
  const reduced = usePrefersReducedMotion();
  const sevTone = SEV_TONE[severity] ?? 'warn';

  return (
    <section className={`adf ${compact ? 'is-compact' : ''}`} aria-label="AI decision flow">
      <header className="adf__head">
        <p className="eyebrow eyebrow-accent">AI Decision Flow</p>
        <p className="adf__head-sub">
          How AIMDS moved from sensor readings to a recommended action
        </p>
      </header>

      <ol className="adf__grid">
        {decisionStages.map((stage, i) => {
          const Icon = ICONS[stage.icon] ?? Activity;
          const value = decision?.[KEY_BY_STAGE[stage.id]] ?? '—';
          const isSeverity = stage.id === 'severity';
          const isFinal = stage.id === 'recommendation';
          return (
            <motion.li
              key={stage.id}
              className={`adf__stage ${isSeverity ? `tone-${sevTone}` : ''} ${
                isFinal ? 'is-final' : ''
              }`}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="adf__rail" aria-hidden="true">
                <span className={`adf__line adf__line--in ${i === 0 ? 'is-hidden' : ''}`} />
                <span className="adf__node">
                  <Icon size={14} strokeWidth={2.1} />
                </span>
                <span
                  className={`adf__line adf__line--out ${
                    i === decisionStages.length - 1 ? 'is-hidden' : ''
                  }`}
                >
                  {!reduced && i < decisionStages.length - 1 && (
                    <span className="adf__pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                  )}
                </span>
              </div>

              <div className="adf__body">
                <p className="adf__step num">STEP {String(i + 1).padStart(2, '0')}</p>
                <h4 className="adf__label">{stage.label}</h4>
                <p className="adf__value">{value}</p>
                {!compact && <p className="adf__caption">{stage.caption}</p>}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
