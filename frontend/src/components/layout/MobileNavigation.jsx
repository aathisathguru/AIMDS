import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ellipsis } from 'lucide-react';
import { MOBILE_NAV } from '../../config/navigation.jsx';
import { useData } from '../../context/DataContext.jsx';
import './MobileNavigation.css';

export default function MobileNavigation() {
  const { stats } = useData();

  return (
    <nav className="mobnav" aria-label="Primary">
      <ul>
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon ?? Ellipsis;
          const badge =
            item.badge === 'alerts' && stats.alerts.open > 0 ? stats.alerts.open : null;
          return (
            <li key={item.id}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => `mobnav__link ${isActive ? 'is-active' : ''}`}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="mobnav-active"
                        className="mobnav__glow"
                        transition={{ type: 'spring', stiffness: 460, damping: 38 }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="mobnav__icon">
                      <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
                      {badge !== null && (
                        <span className="mobnav__badge" aria-hidden="true">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </span>
                    <span className="mobnav__label">{item.label}</span>
                    {badge !== null && (
                      <span className="sr-only">{badge} open alerts</span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
