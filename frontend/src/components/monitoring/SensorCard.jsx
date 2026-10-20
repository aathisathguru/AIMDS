import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BatteryMedium,
  ChevronDown,
  Droplets,
  Gauge,
  Radio,
  SignalHigh,
  Thermometer,
  Waves,
  Zap,
} from 'lucide-react';
import StatusIndicator from '../ui/StatusIndicator.jsx';
import { formatNumber, secondsAgo, toneFor } from '../../utils/format.js';
import './SensorCard.css';

const ICONS = {
  energy: Zap,
  water: Droplets,
  temperature: Thermometer,
  humidity: Waves,
  load: Gauge,
};

export default function SensorCard({ sensor, index = 0, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = ICONS[sensor.key] ?? Radio;
  const tone = toneFor(sensor.status);

  return (
    <motion.article
      className={`scard tone-${tone} ${open ? 'is-open' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.3), duration: 0.34 }}
    >
      <button
        type="button"
        className="scard__head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`sensor-panel-${sensor.id}`}
      >
        <span className="scard__icon" aria-hidden="true">
          <Icon size={16} strokeWidth={2} />
        </span>

        <span className="scard__ident min0">
          <span className="scard__type">{sensor.type}</span>
          <span className="scard__id num">{sensor.id}</span>
        </span>

        <span className="scard__reading">
          <span className="scard__value num">{formatNumber(sensor.value)}</span>
          <span className="scard__unit">{sensor.unit}</span>
          <span className="scard__status">
            <StatusIndicator status={sensor.status} size="sm" />
          </span>
        </span>

        <ChevronDown
          size={16}
          className="scard__chev"
          aria-hidden="true"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      <p className="scard__meta">
        <StatusIndicator status={sensor.status} variant="dot" pulse={sensor.status !== 'offline'} />
        <span>{Number.isFinite(sensor.updatedSecondsAgo) ? `Updated ${secondsAgo(sensor.updatedSecondsAgo)}` : 'Waiting for sensor data'}</span>
      </p>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`sensor-panel-${sensor.id}`}
            className="scard__panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="scard__panel-inner">
              <div className="scard__spark">
                <p className="eyebrow">Telemetry history</p>
                <p className="state-inline">{sensor.value === null || sensor.value === undefined ? 'No historical readings available.' : 'Historical readings are supplied by the telemetry API.'}</p>
              </div>

              <dl className="scard__grid">
                <div>
                  <dt>Min</dt>
                  <dd className="num">
                    {sensor.min} {sensor.unit}
                  </dd>
                </div>
                <div>
                  <dt>Avg</dt>
                  <dd className="num">
                    {sensor.avg} {sensor.unit}
                  </dd>
                </div>
                <div>
                  <dt>Max</dt>
                  <dd className="num">
                    {sensor.max} {sensor.unit}
                  </dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>{sensor.model}</dd>
                </div>
                <div>
                  <dt>Firmware</dt>
                  <dd className="num">{sensor.firmware}</dd>
                </div>
                <div>
                  <dt>Calibrated</dt>
                  <dd className="num">{sensor.calibratedOn}</dd>
                </div>
              </dl>

              <div className="scard__bars">
                <div className="scard__bar">
                  <span className="scard__bar-label">
                    <BatteryMedium size={12} aria-hidden="true" /> Battery
                  </span>
                  <span className="scard__bar-track" aria-hidden="true">
                    <span className="scard__bar-fill" style={{ width: `${sensor.battery}%` }} />
                  </span>
                  <span className="num scard__bar-val">{sensor.battery}%</span>
                </div>
                <div className="scard__bar">
                  <span className="scard__bar-label">
                    <SignalHigh size={12} aria-hidden="true" /> Signal
                  </span>
                  <span className="scard__bar-track" aria-hidden="true">
                    <span
                      className="scard__bar-fill is-blue"
                      style={{ width: `${sensor.signal}%` }}
                    />
                  </span>
                  <span className="num scard__bar-val">{sensor.signal}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
