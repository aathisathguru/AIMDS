import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronsLeft, PanelLeft } from 'lucide-react';
import { NAV_GROUPS } from '../../config/navigation.jsx';
import { useData } from '../../context/DataContext.jsx';
import Logo from '../ui/Logo.jsx';
import StatusIndicator from '../ui/StatusIndicator.jsx';
import './Sidebar.css';

export default function Sidebar({ collapsed, showCollapseToggle = true, onToggleCollapse }) {
  const { stats, overview } = useData();
  const [hovered, setHovered] = useState(null);

  return (
    <aside className={`rail ${collapsed ? 'is-mini' : ''}`} aria-label="Primary navigation">
      <div className="rail__top">
        <NavLink to="/" className="rail__brand" aria-label="AIMDS home">
          <Logo size={collapsed ? 'sm' : 'md'} showWordmark={!collapsed} />
        </NavLink>
        {showCollapseToggle && (
          <button
            type="button"
            className="rail__collapse"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed ? <PanelLeft size={16} /> : <ChevronsLeft size={16} />}
          </button>
        )}
      </div>

      <nav className="rail__nav">
        {NAV_GROUPS.map((group) => (
          <div className="rail__group" key={group.id}>
            {!collapsed && <p className="rail__group-label eyebrow">{group.label}</p>}
            {collapsed && <span className="rail__group-rule" aria-hidden="true" />}
            <ul>
              {group.items.map((item) => {
                const Icon = item.icon;
                const badge =
                  item.badge === 'alerts' && (stats?.alerts?.open || 0) > 0 ? stats.alerts.open : null;
                return (
                  <li key={item.id}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => `rail__link ${isActive ? 'is-active' : ''}`}
                      onMouseEnter={() => setHovered(item.id)}
                      onMouseLeave={() => setHovered(null)}
                      title={collapsed ? item.label : undefined}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.span
                              layoutId="rail-active"
                              className="rail__active"
                              transition={{ type: 'spring', stiffness: 480, damping: 40 }}
                              aria-hidden="true"
                            />
                          )}
                          <span className="rail__icon">
                            <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                          </span>
                          {!collapsed && <span className="rail__label">{item.label}</span>}
                          {badge !== null && (
                            <span
                              className={`rail__badge ${collapsed ? 'is-dot' : ''}`}
                              aria-label={`${badge} open alerts`}
                            >
                              {collapsed ? '' : badge}
                            </span>
                          )}
                          {collapsed && hovered === item.id && (
                            <span className="rail__tooltip" role="tooltip">
                              {item.label}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="rail__foot">
          <div className="rail__health">
            <div className="rail__health-row">
              <span className="eyebrow">Pipeline</span>
            <StatusIndicator status={overview?.status || 'standby'} size="sm" />
            </div>
            <dl className="rail__health-grid">
              <div>
                <dt>Sensors</dt>
                <dd className="num">{stats?.sensorCount ?? '—'}</dd>
              </div>
              <div>
                <dt>Latency</dt>
                <dd className="num">{overview?.latencyMs ?? '—'} ms</dd>
              </div>
              <div>
                <dt>Uptime</dt>
                <dd className="num">{overview?.uptime || '—'}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </aside>
  );
}
