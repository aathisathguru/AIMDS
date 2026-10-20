import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, Droplets, Gauge, Layers, Zap } from 'lucide-react';
import StatusIndicator from '../ui/StatusIndicator.jsx';
import { formatNumber, rollupStatus } from '../../utils/format.js';
import './BlocksCards.css';

export default function AcademicBlockCard({ block, index = 0 }) {
  const status = rollupStatus(block.floors);

  // Format floor tag sequence: e.g. "G, 1, 2, 3"
  const floorShorts = [...(block.floors || [])]
    .reverse()
    .map((f) => f.short || f.code)
    .join(', ');

  const energyVal = block.totals?.energy ?? 0;
  const waterVal = block.totals?.water ?? 0;
  const loadVal = block.totals?.load ?? block.power ?? 0;

  return (
    <motion.article
      className="ab-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/blocks/academics/${block.code}`}
        className="ab-card__overlay-link"
        aria-label={`Open ${block.name} block details`}
      />

      <div className="ab-card__header">
        <div className="ab-card__identity">
          <div className="ab-card__icon-wrap">
            <Building2 size={22} className="ab-card__icon" aria-hidden="true" />
          </div>
          <div className="min0">
            <div className="ab-card__title-row">
              <h3 className="ab-card__name">{block.name}</h3>
              <span className="ab-card__code num">{block.code}</span>
            </div>
            <p className="ab-card__location">{block.location}</p>
          </div>
        </div>
        <StatusIndicator status={status === 'normal' ? block.status : status} size="sm" />
      </div>

      <div className="ab-card__floors-meta">
        <span className="ab-card__floors-badge">
          <Layers size={13} aria-hidden="true" />
          <strong>{block.floors?.length ?? 0} Floors:</strong> {floorShorts}
        </span>
        <span className="ab-card__sensor-badge num">
          {block.sensorCount} sensors
        </span>
      </div>

      <div className="ab-card__telemetry">
        <div className="ab-card__telemetry-col">
          <span className="ab-card__telemetry-label">
            <Gauge size={11} aria-hidden="true" /> Power
          </span>
          <span className="ab-card__telemetry-val num">{formatNumber(loadVal)} kW</span>
        </div>
        <div className="ab-card__telemetry-col">
          <span className="ab-card__telemetry-label">
            <Droplets size={11} aria-hidden="true" /> Water
          </span>
          <span className="ab-card__telemetry-val num">{formatNumber(waterVal)} L</span>
        </div>
        <div className="ab-card__telemetry-col">
          <span className="ab-card__telemetry-label">
            <Zap size={11} aria-hidden="true" /> Energy
          </span>
          <span className="ab-card__telemetry-val num">{formatNumber(energyVal)} kWh</span>
        </div>
      </div>

      <div className="ab-card__footer">
        <span className="ab-card__cost num">
          Today's est: <strong>₹{formatNumber(block.todayCost ?? Math.round(energyVal * 8.5))}</strong>
        </span>
        <span className="ab-card__action">
          View Details
          <ArrowRight size={14} className="ab-card__arrow" aria-hidden="true" />
        </span>
      </div>
    </motion.article>
  );
}
