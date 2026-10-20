import { motion } from 'framer-motion';
import { useId } from 'react';
import './Segmented.css';

/**
 * Accessible segmented control with an animated selection pill.
 * Scrolls horizontally inside its own track on small screens so the
 * page itself never overflows.
 */
export default function Segmented({
  options,
  value,
  onChange,
  ariaLabel = 'Select option',
  size = 'md',
  full = false,
}) {
  const layoutId = useId();

  return (
    <div
      className={`seg seg--${size} ${full ? 'seg--full' : ''}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`seg__btn ${active ? 'is-active' : ''}`}
            onClick={() => onChange(opt.id)}
          >
            {active && (
              <motion.span
                layoutId={`seg-${layoutId}`}
                className="seg__pill"
                transition={{ type: 'spring', stiffness: 460, damping: 38 }}
                aria-hidden="true"
              />
            )}
            <span className="seg__label">
              {opt.icon}
              {opt.short ? (
                <>
                  <span className="seg__text seg__text--long">{opt.label}</span>
                  <span className="seg__text seg__text--short">{opt.short}</span>
                </>
              ) : (
                opt.label
              )}
              {opt.count !== undefined && <span className="seg__count">{opt.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
