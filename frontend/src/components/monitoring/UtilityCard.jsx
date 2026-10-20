import { motion } from 'framer-motion';
import {
  Activity,
  CircleDollarSign,
  Droplets,
  Gauge,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Waves,
  Zap,
} from 'lucide-react';
import Sparkline from '../ui/Sparkline.jsx';
import { formatNumber } from '../../utils/format.js';
import './UtilityCard.css';

const ICONS = {
  energy: Zap,
  water: Droplets,
  temperature: Thermometer,
  humidity: Waves,
  load: Gauge,
  power: Gauge,
  voltage: Zap,
  current: Activity,
  waterFlow: Waves,
  cost: CircleDollarSign,
};

const TONE = {
  energy: 'accent',
  water: 'blue',
  temperature: 'accent',
  humidity: 'blue',
  load: 'accent',
  power: 'accent',
  voltage: 'accent',
  current: 'blue',
  waterFlow: 'blue',
  cost: 'accent',
};

export default function UtilityCard({
  utility,
  label,
  value,
  unit,
  delta = 0,
  expected,
  series,
  index = 0,
  compact = false,
  onClick,
}) {
  const Icon = ICONS[utility] ?? Gauge;
  const tone = TONE[utility] ?? 'accent';
  const up = delta >= 0;
  const Trend = up ? TrendingUp : TrendingDown;
  const sparkTone = tone === 'blue' ? 'var(--blue)' : 'var(--accent)';
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className="min0"
    >
      <Wrapper
        className={`ucard tone-${tone} ${compact ? 'is-compact' : ''} ${onClick ? 'is-clickable' : ''}`}
        onClick={onClick}
        type={onClick ? 'button' : undefined}
      >
        <div className="ucard__top">
          <span className="ucard__icon" aria-hidden="true">
            <Icon size={15} strokeWidth={2} />
          </span>
          <span className="ucard__label">{label}</span>
        </div>

        <p className="ucard__value num">
          {formatNumber(value)}
          <span className="ucard__unit">{unit}</span>
          {delta !== 0 && (
            <span
              className={`ucard__delta ${up ? 'is-up' : 'is-down'}`}
              title={`${up ? 'Up' : 'Down'} ${Math.abs(delta)}% versus the previous period`}
            >
              <Trend size={11} strokeWidth={2.6} aria-hidden="true" />
              <span className="num">{Math.abs(delta)}%</span>
            </span>
          )}
        </p>

        {series && !compact && (
          <div className="ucard__spark">
            <Sparkline data={series} tone={sparkTone} height={34} label={`${label} trend`} />
          </div>
        )}

        {expected && (
          <p className="ucard__expected">
            <span className="eyebrow">Expected</span>
            <span className="num">
              {expected[0]}–{expected[1]} {unit}
            </span>
          </p>
        )}
      </Wrapper>
    </motion.div>
  );
}
