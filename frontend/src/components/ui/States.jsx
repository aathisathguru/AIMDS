import { motion } from 'framer-motion';
import { Inbox, RefreshCw, TriangleAlert } from 'lucide-react';
import './States.css';

/* -------------------------------------------------------------- loading -- */

export function LoadingState({ label = 'Loading telemetry', rows = 3, variant = 'block' }) {
  if (variant === 'inline') {
    return (
      <div className="state-inline" role="status" aria-live="polite">
        <span className="state-spinner" aria-hidden="true" />
        <span>{label}…</span>
      </div>
    );
  }
  return (
    <div className="state-load" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div className="state-load__row" key={i} aria-hidden="true">
          <div className="skeleton" style={{ height: 12, width: `${44 + i * 9}%` }} />
          <div className="skeleton" style={{ height: 34, width: '100%' }} />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- empty -- */

export function EmptyState({
  title = 'Nothing to show',
  message = 'No records match the current filters.',
  icon: Icon = Inbox,
  action,
}) {
  return (
    <motion.div
      className="state-box"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span className="state-box__icon">
        <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <h3 className="state-box__title">{title}</h3>
      <p className="state-box__msg">{message}</p>
      {action}
    </motion.div>
  );
}

/* ---------------------------------------------------------------- error -- */

export function ErrorState({
  title = 'Unable to load data',
  message = 'The AIMDS API did not respond. Check the backend connection and try again.',
  onRetry,
}) {
  return (
    <div className="state-box state-box--error" role="alert">
      <span className="state-box__icon state-box__icon--error">
        <TriangleAlert size={20} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <h3 className="state-box__title">{title}</h3>
      <p className="state-box__msg">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}

