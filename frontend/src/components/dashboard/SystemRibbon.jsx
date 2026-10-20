import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bell, Boxes, Brain, Cpu, Radio } from 'lucide-react';
import StatusIndicator from '../ui/StatusIndicator.jsx';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery.js';
import './SystemRibbon.css';

/**
 * Compact system overview KPI ribbon.
 */
export default function SystemRibbon({ overview, stats }) {
  const reduced = usePrefersReducedMotion();

  const items = [
    {
      id: 'status',
      label: 'System Status',
      value: overview.statusLabel || 'Operational',
      icon: Cpu,
      status: 'operational',
      hint: `Uptime ${overview.uptime || '99.94%'}`,
    },
    {
      id: 'blocks',
      label: 'Active Blocks',
      value: stats.activeBlocks,
      icon: Boxes,
      hint: `${stats.floorCount} floors monitored`,
      to: '/blocks',
    },
    {
      id: 'sensors',
      label: 'Active Sensors',
      value: stats.sensorCount,
      icon: Radio,
      hint: `${overview.ingestRate ? `${overview.ingestRate}` : '2.1k'} readings/min`,
      to: '/sensors',
    },
    {
      id: 'alerts',
      label: 'Current Alerts',
      value: stats.alerts.open,
      icon: Bell,
      hint: `${stats.alerts.critical} Critical · ${stats.alerts.warning} Warning`,
      tone: stats.alerts.critical > 0 ? 'crit' : stats.alerts.open > 0 ? 'warn' : 'ok',
      to: '/alerts',
    },
    {
      id: 'ai',
      label: 'AI Engine',
      value: overview.aiLabel || 'Active',
      icon: Brain,
      status: 'active',
      hint: `Last analysis ${overview.aiLastRun || '38 seconds ago'}`,
      to: '/insights',
      pulse: true,
    },
  ];

  return (
    <section className="ribbon" aria-label="System overview">
      <header className="ribbon__head">
        <div className="ribbon__brand">
          <p className="eyebrow eyebrow-accent">System Overview · Node Telemetry</p>
        </div>
        <span className="ribbon__sync num">Synced {overview.lastSync}</span>
      </header>

      <ul className="ribbon__grid">
        {items.map((item, i) => {
          const Icon = item.icon;
          const Wrapper = item.to ? Link : 'div';
          return (
            <motion.li
              key={item.id}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.32 }}
              className={`ribbon__cell ${item.tone ? `tone-${item.tone}` : ''}`}
            >
              <Wrapper to={item.to} className="ribbon__inner">
                <span className="ribbon__icon" aria-hidden="true">
                  <Icon size={14} strokeWidth={2} />
                  {item.pulse && !reduced && <span className="ribbon__icon-pulse" />}
                </span>
                <span className="ribbon__label">{item.label}</span>
                <span className="ribbon__value num">
                  {item.value}
                  {item.status && (
                    <StatusIndicator status={item.status} variant="dot" pulse={!reduced} />
                  )}
                </span>
                <span className="ribbon__hint num">{item.hint}</span>
              </Wrapper>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
