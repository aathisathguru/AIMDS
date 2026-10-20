import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain,
  ChartSpline,
  ChevronRight,
  FileText,
  LogOut,
  Radio,
  Settings as SettingsIcon,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import ThemeToggle from '../components/ui/ThemeToggle.jsx';
import StatusIndicator from '../components/ui/StatusIndicator.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import './More.css';

const LINKS = [
  { to: '/sensors', label: 'Sensors', desc: 'All provisioned devices', icon: Radio },
  { to: '/analytics', label: 'Analytics', desc: 'Trends and comparisons', icon: ChartSpline },
  { to: '/insights', label: 'AI Insights', desc: 'Findings and recommendations', icon: Brain },
  { to: '/reports', label: 'Reports', desc: 'Compose and export', icon: FileText },
  { to: '/settings', label: 'Settings', desc: 'Profile, theme, thresholds', icon: SettingsIcon },
];

export default function More() {
  const { user, logout } = useAuth();
  const { overview, stats } = useData();
  const { theme } = useTheme();

  return (
    <div className="stack stack--lg">
      <PageHeader eyebrow="Navigation" title="More" />

      <section className="more__user">
        {user?.picture ? (
          <img
            src={user.picture}
            alt={user?.name || 'User'}
            className="more__avatar-img"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="more__avatar" aria-hidden="true">
            {user?.initials ?? 'OL'}
          </span>
        )}
        <div className="min0">
          <p className="more__name">{user?.name}</p>
          <p className="more__role num">{user?.role}</p>
        </div>
        <StatusIndicator status="online" label="Signed in" size="sm" />
      </section>

      <nav aria-label="Secondary navigation">
        <ul className="more__links">
          {LINKS.map((l, i) => {
            const Icon = l.icon;
            return (
              <motion.li
                key={l.to}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Link to={l.to} className="more__link">
                  <span className="more__link-icon" aria-hidden="true">
                    <Icon size={17} strokeWidth={1.9} />
                  </span>
                  <span className="min0">
                    <span className="more__link-label">{l.label}</span>
                    <span className="more__link-desc">{l.desc}</span>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" className="more__chev" />
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      <section className="more__row">
        <div className="min0">
          <p className="more__row-label">Appearance</p>
          <p className="more__row-desc">Currently {theme} mode</p>
        </div>
        <ThemeToggle />
      </section>

      <section className="more__stats">
        <div>
          <span className="eyebrow">Blocks</span>
          <span className="num">{stats.blockCount}</span>
        </div>
        <div>
          <span className="eyebrow">Sensors</span>
          <span className="num">{stats.sensorCount}</span>
        </div>
        <div>
          <span className="eyebrow">Open alerts</span>
          <span className="num">{stats.alerts.open}</span>
        </div>
        <div>
          <span className="eyebrow">Version</span>
          <span className="num">v{overview.version}</span>
        </div>
      </section>

      <button type="button" className="btn btn--ghost btn--block more__logout" onClick={logout}>
        <LogOut size={16} aria-hidden="true" />
        Sign out
      </button>

      <p className="more__foot num">
        AIMDS · AI-Based Multi-Utility Monitoring and Decision Support System
      </p>
    </div>
  );
}
