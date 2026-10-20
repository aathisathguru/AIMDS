import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CircleDollarSign, Droplets, Zap } from 'lucide-react';
import StatusIndicator from '../ui/StatusIndicator.jsx';
import { formatNumber, toneFor } from '../../utils/format.js';
import './FloorCard.css';

export default function FloorCard({ floor, blockCode, blockName, index = 0 }) {
  const tone = toneFor(floor.status);
  const u = floor.utilities || {};

  const powerVal = floor.power ?? u.power?.value ?? u.load?.value ?? 0;
  const waterVal = floor.water ?? u.water?.value ?? 0;
  const costVal = floor.todayCost ?? u.cost?.value ?? Math.round((u.energy?.value ?? 0) * 8.5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className="min0"
    >
      <Link
        to={`/blocks/academics/${blockCode}/floors/${floor.code}`}
        className={`fcard tone-${tone}`}
        aria-label={`${blockName} ${floor.name} — status ${floor.status}. Open floor monitoring.`}
      >
        <div className="fcard__head">
          <span className="fcard__tag num">{floor.short}</span>
          <div className="min0">
            <h3 className="fcard__name">{floor.name}</h3>
            <p className="fcard__sub num">
              {floor.zones} zones · {floor.area} m² · {floor.sensors?.length ?? 0} sensors
            </p>
          </div>
          <StatusIndicator status={floor.status} size="sm" />
        </div>

        <div className="fcard__metrics">
          <div className="fcard__metric">
            <Zap size={13} className="fcard__uicon" aria-hidden="true" />
            <div className="fcard__metric-data">
              <span className="fcard__label">Power</span>
              <span className="fcard__val num">
                <strong>{formatNumber(powerVal)}</strong> kW
              </span>
            </div>
          </div>
          <div className="fcard__metric">
            <Droplets size={13} className="fcard__uicon" aria-hidden="true" />
            <div className="fcard__metric-data">
              <span className="fcard__label">Water</span>
              <span className="fcard__val num">
                <strong>{formatNumber(waterVal)}</strong> L
              </span>
            </div>
          </div>
          <div className="fcard__metric">
            <CircleDollarSign size={13} className="fcard__uicon" aria-hidden="true" />
            <div className="fcard__metric-data">
              <span className="fcard__label">Today's Cost</span>
              <span className="fcard__val num cost-accent">
                ₹{formatNumber(costVal)}
              </span>
            </div>
          </div>
        </div>

        <div className="fcard__foot">
          <span className="fcard__live-indicator">
            <span className="fcard__live-pulse" />
            Live Telemetry
          </span>
          <span className="fcard__action">
            View Details
            <ArrowRight size={13} className="fcard__arrow" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
