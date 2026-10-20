import { Link } from 'react-router-dom';
import { ArrowRight, Brain } from 'lucide-react';
import './DashboardAIInsight.css';

export default function DashboardAIInsight({ insight }) {
  if (!insight) return null;

  const sevTone =
    insight.severity === 'high' ? 'crit' : insight.severity === 'medium' ? 'warn' : 'info';
  const sevLabel = (insight.severity || 'HIGH').toUpperCase();

  return (
    <article className={`dash-ai tone-${sevTone}`} aria-labelledby="dash-ai-title">
      <header className="dash-ai__head">
        <div className="dash-ai__tag">
          <Brain size={13} aria-hidden="true" />
          <span className="eyebrow eyebrow-accent">AI INSIGHT</span>
        </div>
        <span className={`dash-ai__badge sev-${sevTone}`}>{sevLabel}</span>
      </header>

      <div className="dash-ai__body">
        <h3 className="dash-ai__title" id="dash-ai-title">
          {insight.title || 'Anomaly Detected'}
        </h3>

        <p className="dash-ai__location">
          {insight.blockName}
          {insight.floorName ? ` · ${insight.floorName}` : ''}
        </p>

        <p className="dash-ai__summary">{insight.headline || insight.summary}</p>

        {insight.metric && (
          <dl className="dash-ai__metrics">
            <div className="dash-ai__metric-col">
              <dt>Current</dt>
              <dd className="num">
                {insight.metric.current} <span className="dash-ai__unit">{insight.metric.unit}</span>
              </dd>
            </div>
            <div className="dash-ai__metric-col">
              <dt>Expected</dt>
              <dd className="num is-dim">
                {insight.metric.expected} <span className="dash-ai__unit">{insight.metric.unit}</span>
              </dd>
            </div>
            <div className="dash-ai__metric-col">
              <dt>Deviation</dt>
              <dd className={`num is-dev sev-${sevTone}`}>{insight.metric.deviation}</dd>
            </div>
          </dl>
        )}

        {insight.action && (
          <div className="dash-ai__action-box">
            <span className="dash-ai__action-label">Recommended Action</span>
            <p className="dash-ai__action-text">{insight.action}</p>
          </div>
        )}
      </div>

      <footer className="dash-ai__foot">
        <Link to="/insights" className="dash-ai__link">
          <span>View insight</span>
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
}
