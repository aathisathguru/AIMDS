import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock,
  Info,
  MapPin,
  TriangleAlert,
} from 'lucide-react';
import { relativeTime, SEVERITY_LABEL, SEVERITY_TONE } from '../../utils/format.js';
import './AlertCard.css';

const ICONS = {
  critical: CircleAlert,
  warning: TriangleAlert,
  info: Info,
  resolved: CircleCheck,
};

export default function AlertCard({ alert, index = 0, onAcknowledge, onResolve }) {
  const [open, setOpen] = useState(false);
  const tone = SEVERITY_TONE[alert.severity] ?? 'idle';
  const Icon = ICONS[alert.severity] ?? Info;

  return (
    <motion.article
      className={`acard tone-${tone} ${open ? 'is-open' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.34 }}
    >
      <button
        type="button"
        className="acard__head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`alert-body-${alert.id}`}
      >
        <span className="acard__icon" aria-hidden="true">
          <Icon size={16} strokeWidth={2.1} />
        </span>

        <span className="acard__main min0">
          <span className="acard__top">
            <span className={`acard__sev sev-${tone}`}>{SEVERITY_LABEL[alert.severity]}</span>
            <span className="acard__id num">{alert.id}</span>
            {alert.acknowledged && alert.severity !== 'resolved' && (
              <span className="acard__ack num">ACK</span>
            )}
          </span>
          <span className="acard__title">{alert.title}</span>
          <span className="acard__where">
            <MapPin size={11} aria-hidden="true" />
            {alert.blockName} · {alert.floorName}
          </span>
        </span>

        <span className="acard__reading">
          <span className="acard__value num">{alert.value}</span>
          <span className="acard__unit">{alert.unit}</span>
        </span>

        <span className="acard__time num">
          <Clock size={11} aria-hidden="true" />
          {relativeTime(alert.minutesAgo)}
        </span>

        <ChevronDown
          size={16}
          className="acard__chev"
          aria-hidden="true"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`alert-body-${alert.id}`}
            className="acard__body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="acard__body-inner">
              <p className="acard__msg">{alert.message}</p>

              <dl className="acard__facts">
                <div>
                  <dt>Current value</dt>
                  <dd className="num">
                    {alert.value} {alert.unit}
                  </dd>
                </div>
                <div>
                  <dt>Expected range</dt>
                  <dd className="num">{alert.expected}</dd>
                </div>
                <div>
                  <dt>Deviation</dt>
                  <dd className={`num sev-${tone}`}>{alert.deviation}</dd>
                </div>
                <div>
                  <dt>Sensor</dt>
                  <dd className="num">{alert.sensorId}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{alert.status}</dd>
                </div>
                <div>
                  <dt>Raised</dt>
                  <dd>{relativeTime(alert.minutesAgo)}</dd>
                </div>
              </dl>

              <div className="acard__rec">
                <span className="eyebrow eyebrow-accent">Recommended action</span>
                <p>{alert.recommendation}</p>
              </div>

              {alert.severity !== 'resolved' && (
                <div className="acard__actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => onAcknowledge?.(alert.id)}
                    disabled={alert.acknowledged}
                  >
                    <Check size={13} aria-hidden="true" />
                    {alert.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--solid btn--sm"
                    onClick={() => onResolve?.(alert.id)}
                  >
                    <CircleCheck size={13} aria-hidden="true" />
                    Mark resolved
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
