import { Fragment, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Boxes,
  Brain,
  Database,
  LayoutDashboard,
  Radio,
  Server,
} from 'lucide-react';
import { pipelineStages } from '../../data/mockData.js';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery.js';
import StatusIndicator from '../ui/StatusIndicator.jsx';
import './FlowGraph.css';

const ICONS = {
  boxes: Boxes,
  radio: Radio,
  server: Server,
  database: Database,
  brain: Brain,
  layout: LayoutDashboard,
};

/**
 * AIMDS system data flow. The topology is static; only the data-flow
 * particles animate. Horizontal on desktop, vertical on phones.
 */
export default function FlowGraph({ stages = pipelineStages, showDetail = true }) {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(stages[0].id);
  const current = stages.find((s) => s.id === active) ?? stages[0];

  return (
    <section className="flow" aria-label="AIMDS system data flow">
      <header className="flow__head">
        <div>
          <p className="eyebrow eyebrow-accent">SYSTEM DATA FLOW</p>
          <h2 className="flow__title">Simulation to decision support</h2>
        </div>
        <StatusIndicator status="operational" label="Pipeline healthy" />
      </header>

      <div className="flow__track" role="list">
        {stages.map((stage, i) => {
          const Icon = ICONS[stage.icon] ?? Boxes;
          const isActive = stage.id === active;
          return (
            <Fragment key={stage.id}>
              <div className="flow__node-wrap" role="listitem">
                <motion.button
                  type="button"
                  className={`flow__node ${isActive ? 'is-active' : ''}`}
                  onClick={() => setActive(stage.id)}
                  onMouseEnter={() => setActive(stage.id)}
                  onFocus={() => setActive(stage.id)}
                  aria-pressed={isActive}
                  aria-label={`${stage.label} — ${stage.detail}`}
                  initial={reduced ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="flow__node-idx num" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flow__node-icon" aria-hidden="true">
                    <Icon size={17} strokeWidth={1.9} />
                  </span>
                  <span className="flow__node-label">{stage.label}</span>
                  <span className="flow__node-metric num">{stage.metric}</span>
                </motion.button>
              </div>

              {i < stages.length - 1 && (
                <div className="flow__link" aria-hidden="true">
                  <span className="flow__link-track" />
                  {!reduced && (
                    <>
                      <span className="flow__particle" style={{ animationDelay: `${i * 0.28}s` }} />
                      <span
                        className="flow__particle is-alt"
                        style={{ animationDelay: `${i * 0.28 + 1.1}s` }}
                      />
                    </>
                  )}
                  <span className="flow__arrow" />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {showDetail && (
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            className="flow__detail"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <span className="flow__detail-tag num">{current.short}</span>
            <p className="flow__detail-text">{current.detail}</p>
            <StatusIndicator status={current.status} size="sm" />
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  );
}
