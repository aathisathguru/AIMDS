import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, ChevronRight, Search, Slash } from 'lucide-react';
import { useData } from '../../context/DataContext.jsx';
import { PAGE_TITLES } from '../../config/navigation.jsx';
import ProfileDropdown from './ProfileDropdown.jsx';
import Logo from '../ui/Logo.jsx';
import './Navbar.css';

function useCrumbs(pathname, blocks) {
  return useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    if (!parts.length) return [{ label: 'Dashboard', to: '/' }];

    const crumbs = [];
    if (parts[0] === 'blocks') {
      crumbs.push({ label: 'Blocks', to: '/blocks' });

      if (parts[1] === 'academics') {
        crumbs.push({ label: 'Academics', to: '/blocks/academics' });
        if (parts[2]) {
          const block = blocks.find((b) => b.code.toLowerCase() === parts[2].toLowerCase() || b.id.toLowerCase() === parts[2].toLowerCase());
          if (block) {
            crumbs.push({ label: block.name, to: `/blocks/academics/${block.code}` });
            if (parts[3] === 'floors' && parts[4]) {
              const floor = block.floors?.find((f) => f.code.toLowerCase() === parts[4].toLowerCase());
              if (floor) {
                crumbs.push({
                  label: floor.name,
                  to: `/blocks/academics/${block.code}/floors/${floor.code}`,
                });
              }
            }
          }
        }
        return crumbs;
      }

      if (parts[1] === 'hostel' || parts[1] === 'hostels') {
        crumbs.push({ label: 'Hostel', to: '/blocks/hostel' });
        if (parts[2]) {
          const hostel = blocks.find((b) => b.code.toLowerCase() === parts[2].toLowerCase() || b.id.toLowerCase() === parts[2].toLowerCase());
          if (hostel) {
            crumbs.push({ label: hostel.name, to: `/blocks/hostel/${hostel.code}` });
          }
        }
        return crumbs;
      }

      // Legacy direct /blocks/:blockId
      if (parts[1]) {
        const block = blocks.find((b) => b.code.toLowerCase() === parts[1].toLowerCase());
        if (block) {
          if (block.category === 'hostel') {
            crumbs.push({ label: 'Hostel', to: '/blocks/hostel' });
            crumbs.push({ label: block.name, to: `/blocks/hostel/${block.code}` });
          } else {
            crumbs.push({ label: 'Academics', to: '/blocks/academics' });
            crumbs.push({ label: block.name, to: `/blocks/academics/${block.code}` });
            if (parts[2] === 'floors' && parts[3]) {
              const floor = block.floors?.find((f) => f.code.toLowerCase() === parts[3].toLowerCase());
              if (floor) {
                crumbs.push({
                  label: floor.name,
                  to: `/blocks/academics/${block.code}/floors/${floor.code}`,
                });
              }
            }
          }
        }
      }
      return crumbs;
    }
    return [{ label: PAGE_TITLES[`/${parts[0]}`] ?? parts[0], to: `/${parts[0]}` }];
  }, [pathname, blocks]);
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <time className="topbar__clock num" dateTime={now.toISOString()}>
      {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </time>
  );
}

export default function Navbar({ onOpenSearch }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { blocks, stats, overview } = useData();
  const crumbs = useCrumbs(pathname, blocks);
  const openAlerts = stats.alerts.open;

  return (
    <header className="topbar">
      <div className="topbar__left min0">
        <Link to="/" className="topbar__logo" aria-label="AIMDS home" title="AIMDS Telemetry Console">
          <Logo size="sm" showWordmark={false} />
        </Link>

        <nav className="topbar__crumbs" aria-label="Breadcrumb">
          <ol>
            {crumbs.map((c, i) => (
              <li key={`${c.to || c.label}-${i}`}>
                <ChevronRight size={13} aria-hidden="true" className="topbar__sep" />
                {i === crumbs.length - 1 ? (
                  <span aria-current="page">{c.label}</span>
                ) : (
                  <Link to={c.to}>{c.label}</Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <h1 className="topbar__mobile-title">
          {crumbs[crumbs.length - 1]?.label ?? 'Dashboard'}
        </h1>
      </div>

      <div className="topbar__right">
        <div className="topbar__env" title={`Environment: ${overview.environment}`}>
          <motion.span
            className="topbar__env-dot"
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          />
          <span>{overview.environment}</span>
        </div>

        <Clock />

        <button
          type="button"
          className="topbar__search"
          onClick={onOpenSearch}
          aria-label="Search blocks, floors and sensors"
        >
          <Search size={15} aria-hidden="true" />
          <span>Search…</span>
          <kbd aria-hidden="true">
            <Slash size={10} />
          </kbd>
        </button>

        <button
          type="button"
          className="icon-btn topbar__bell"
          onClick={() => navigate('/alerts')}
          aria-label={`Alerts — ${openAlerts} open`}
        >
          <Bell size={18} />
          {openAlerts > 0 && (
            <span className="topbar__bell-badge num" aria-hidden="true">
              {openAlerts}
            </span>
          )}
        </button>

        <ProfileDropdown />
      </div>
    </header>
  );
}
