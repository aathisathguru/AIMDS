import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CircleDollarSign, Droplets, Home, Zap } from 'lucide-react';
import StatusIndicator from '../ui/StatusIndicator.jsx';
import { formatNumber } from '../../utils/format.js';
import './BlocksCards.css';

export default function HostelCard({ hostel, index = 0 }) {
  const isBoys = hostel.subCategory === 'boys';

  return (
    <motion.article
      className="hostel-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/blocks/hostel/${hostel.code}`}
        className="hostel-card__overlay-link"
        aria-label={`Open ${hostel.name} live utility monitoring`}
      />

      <div className="hostel-card__header">
        <div className="hostel-card__identity">
          <div className="hostel-card__icon-wrap">
            <Home size={20} className="hostel-card__icon" aria-hidden="true" />
          </div>
          <div className="min0">
            <div className="hostel-card__title-row">
              <h3 className="hostel-card__name">{hostel.name}</h3>
              <span className="hostel-card__tag num">
                {isBoys ? 'Boys' : 'Girls'}
              </span>
            </div>
            <p className="hostel-card__sub num">{hostel.code}</p>
          </div>
        </div>
        <StatusIndicator status={hostel.status || 'operational'} size="sm" />
      </div>

      <div className="hostel-card__metrics">
        <div className="hostel-card__metric">
          <div className="hostel-card__metric-label">
            <Zap size={12} aria-hidden="true" />
            <span>Power</span>
          </div>
          <span className="hostel-card__metric-value num">
            <strong>{formatNumber(hostel.power)}</strong> kW
          </span>
        </div>

        <div className="hostel-card__metric">
          <div className="hostel-card__metric-label">
            <Droplets size={12} aria-hidden="true" />
            <span>Water</span>
          </div>
          <span className="hostel-card__metric-value num">
            <strong>{formatNumber(hostel.water)}</strong> L
          </span>
        </div>

        <div className="hostel-card__metric">
          <div className="hostel-card__metric-label">
            <CircleDollarSign size={12} aria-hidden="true" />
            <span>Today's Cost</span>
          </div>
          <span className="hostel-card__metric-value num cost-val">
            ₹{formatNumber(hostel.todayCost)}
          </span>
        </div>
      </div>

      <div className="hostel-card__footer">
        <span className="hostel-card__status-text">
          <span className="hostel-card__status-dot" />
          Direct Incomer Live
        </span>
        <span className="hostel-card__action">
          View Details
          <ArrowRight size={14} className="hostel-card__arrow" aria-hidden="true" />
        </span>
      </div>
    </motion.article>
  );
}
