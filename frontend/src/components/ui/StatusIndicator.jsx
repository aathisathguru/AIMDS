import { CircleAlert, CircleCheck, CircleMinus, TriangleAlert } from 'lucide-react';
import './StatusIndicator.css';

const MAP = {
  normal: { tone: 'ok', label: 'Normal', Icon: CircleCheck },
  operational: { tone: 'ok', label: 'Operational', Icon: CircleCheck },
  online: { tone: 'ok', label: 'Online', Icon: CircleCheck },
  ok: { tone: 'ok', label: 'OK', Icon: CircleCheck },
  resolved: { tone: 'ok', label: 'Resolved', Icon: CircleCheck },
  active: { tone: 'ok', label: 'Active', Icon: CircleCheck },

  attention: { tone: 'warn', label: 'Attention', Icon: TriangleAlert },
  warning: { tone: 'warn', label: 'Warning', Icon: TriangleAlert },
  degraded: { tone: 'warn', label: 'Degraded', Icon: TriangleAlert },

  critical: { tone: 'crit', label: 'Critical', Icon: CircleAlert },

  info: { tone: 'info', label: 'Information', Icon: CircleAlert },
  standby: { tone: 'info', label: 'Standby', Icon: CircleMinus },

  offline: { tone: 'idle', label: 'Offline', Icon: CircleMinus },
  idle: { tone: 'idle', label: 'Idle', Icon: CircleMinus },
};

/**
 * Status is never communicated by colour alone — every variant renders a
 * distinct icon shape plus a text label (or an accessible label when the
 * visible text is suppressed).
 */
export default function StatusIndicator({
  status = 'normal',
  label,
  variant = 'chip', // chip | dot | inline
  size = 'md', // sm | md
  pulse = false,
  className = '',
}) {
  const meta = MAP[status] ?? MAP.idle;
  const text = label ?? meta.label;
  const { Icon } = meta;

  if (variant === 'dot') {
    return (
      <span
        className={`st-dot st-dot--${meta.tone} ${pulse ? 'is-pulse' : ''} ${className}`}
        role="img"
        aria-label={text}
        title={text}
      >
        <span className="st-dot__core" />
        {pulse && <span className="st-dot__ring" aria-hidden="true" />}
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={`st-inline st-inline--${meta.tone} ${className}`}>
        <Icon size={13} strokeWidth={2.4} aria-hidden="true" />
        <span>{text}</span>
      </span>
    );
  }

  return (
    <span
      className={`st-chip st-chip--${meta.tone} st-chip--${size} ${className}`}
      title={text}
    >
      <Icon size={size === 'sm' ? 11 : 12} strokeWidth={2.6} aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}
