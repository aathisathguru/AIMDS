import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, MapPin } from 'lucide-react';
import StatusIndicator from '../ui/StatusIndicator.jsx';
import { useParallax } from '../../hooks/useParallax.js';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery.js';
import { rollupStatus, toneFor } from '../../utils/format.js';
import './BlockVisualization.css';

/**
 * The elevation view of a monitored block — the visual anchor of AIMDS.
 * Floors are stacked slabs (top floor first, base last); each slab is a
 * real button: hover lifts + glows, click opens floor monitoring.
 * On phones the same markup reads as a stack of floor cards.
 */
export default function BlockVisualization({
  block,
  variant = 'full', // full | compact
  onFloorSelect,
  parallax = true,
}) {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const tilt = useParallax({ strength: 1, disabled: !parallax || variant === 'compact' });
  const status = rollupStatus(block.floors || []);

  const handleFloor = (floor) => {
    if (onFloorSelect) onFloorSelect(floor);
    else navigate(`/blocks/${block.code}/floors/${floor.code}`);
  };

  return (
    <section
      className={`bviz bviz--${variant}`}
      aria-label={`${block.name} block elevation view`}
    >
      <header className="bviz__head">
        <div className="min0">
          <div className="bviz__brand-badge">
            <span className="eyebrow eyebrow-accent">AIMDS Node Telemetry</span>
          </div>
          <h2 className="bviz__name">
            {block.name}
            <span className="bviz__code">({block.code})</span>
          </h2>
          <p className="bviz__loc">
            <MapPin size={12} aria-hidden="true" />
            {block.location}
          </p>
        </div>
        <div className="bviz__head-right">
          <StatusIndicator status={status === 'normal' ? 'operational' : status} />
          <p className="bviz__count num">
            {(block.floors?.length ?? 0) > 0 ? `${block.floors.length} floors` : 'Direct Unit'} ·{' '}
            {block.sensorCount ?? 0} sensors
          </p>
        </div>
      </header>

      <motion.div
        className="bviz__stage"
        style={
          reduced || !parallax
            ? undefined
            : {
                rotateX: -tilt.y * 1.6,
                rotateY: tilt.x * 2.2,
              }
        }
        transition={{ type: 'spring', stiffness: 90, damping: 20 }}
      >
        <div className="bviz__roof" aria-hidden="true">
          <span className="bviz__roof-vent" />
          <span className="bviz__roof-vent" />
          <span className="bviz__roof-label">{block.code}</span>
        </div>

        <ul className="bviz__floors">
          {(!block.floors || block.floors.length === 0) ? (
            <motion.li
              initial={reduced ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button
                type="button"
                className="bviz__floor tone-ok"
                onClick={() => navigate(`/blocks/hostel/${block.code}`)}
                aria-label={`${block.name} direct unit monitoring`}
              >
                <span className="bviz__edge" aria-hidden="true" />
                <span className="bviz__floor-tag num" aria-hidden="true">
                  UNIT
                </span>
                <span className="bviz__floor-main min0">
                  <span className="bviz__floor-name">Residential Incomer & Telemetry</span>
                  <span className="bviz__floor-stat">Direct Unit Telemetry (No Floors)</span>
                </span>
                <span className="bviz__floor-readings">
                  <span className="num">{block.power ?? 0} kW</span>
                  <ChevronRight size={14} className="bviz__arrow" aria-hidden="true" />
                </span>
              </button>
            </motion.li>
          ) : (
            block.floors.map((floor, i) => {
            const tone = toneFor(floor.status);
            return (
              <motion.li
                key={floor.id}
                initial={reduced ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  className={`bviz__floor tone-${tone}`}
                  onClick={() => handleFloor(floor)}
                  aria-label={`${floor.name}, status ${floor.status}, ${floor.sensors.length} sensors. Open floor monitoring.`}
                >
                  <span className="bviz__edge" aria-hidden="true" />

                  <span className="bviz__floor-tag num" aria-hidden="true">
                    {floor.short}
                  </span>

                  <span className="bviz__floor-main min0">
                    <span className="bviz__floor-name">{floor.name}</span>
                    <span className="bviz__dots" aria-hidden="true">
                      {floor.sensors.map((s) => (
                        <span
                          key={s.id}
                          className={`bviz__dot dot-${toneFor(s.status)}`}
                          title={`${s.type}: ${s.value} ${s.unit}`}
                        />
                      ))}
                    </span>
                  </span>

                  <span className="bviz__floor-metrics" aria-hidden="true">
                    <span className="num">{floor.utilities.energy.value}</span>
                    <span className="bviz__unit">kWh</span>
                  </span>

                  <span className="bviz__floor-status">
                    <StatusIndicator status={floor.status} size="sm" />
                  </span>

                  <ChevronRight size={15} className="bviz__chev" aria-hidden="true" />

                  <span className="bviz__scan" aria-hidden="true" />
                </button>
              </motion.li>
            );
          }))}
        </ul>

        <div className="bviz__base" aria-hidden="true">
          <span className="bviz__base-line" />
        </div>
        <div className="bviz__shadow" aria-hidden="true" />
      </motion.div>

      {variant === 'full' && (
        <footer className="bviz__legend">
          <span className="bviz__legend-item">
            <span className="bviz__dot dot-ok" aria-hidden="true" /> Normal
          </span>
          <span className="bviz__legend-item">
            <span className="bviz__dot dot-warn" aria-hidden="true" /> Attention
          </span>
          <span className="bviz__legend-item">
            <span className="bviz__dot dot-crit" aria-hidden="true" /> Critical
          </span>
          <span className="bviz__legend-hint">Select a floor to open monitoring</span>
        </footer>
      )}
    </section>
  );
}
