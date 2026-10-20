import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar.jsx';
import Navbar from './Navbar.jsx';
import MobileNavigation from './MobileNavigation.jsx';
import CommandPalette from './CommandPalette.jsx';
import ErrorBoundary from '../ui/ErrorBoundary.jsx';
import { useIsDesktop, usePrefersReducedMotion } from '../../hooks/useMediaQuery.js';
import './Layout.css';

const RAIL_KEY = 'aimds.rail.collapsed';

export default function Layout() {
  const location = useLocation();
  const reduced = usePrefersReducedMotion();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(RAIL_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const isDesktop = useIsDesktop();

  // Between 768px and 1023px the rail is always the icon-only mini variant,
  // so the stored preference only applies from 1024px upwards.
  const railMini = collapsed || !isDesktop;

  const toggleRail = useCallback(() => {
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(RAIL_KEY, c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });
  }, []);

  // Global "/" shortcut for search (ignored while typing).
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === '/' && !typing && !searchOpen) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  // Scroll to top on route change.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }, [location.pathname, reduced]);

  return (
    <div className={`shell ${collapsed ? 'is-mini' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <Sidebar collapsed={railMini} showCollapseToggle={isDesktop} onToggleCollapse={toggleRail} />

      <div className="shell__body">
        <Navbar onOpenSearch={() => setSearchOpen(true)} />

        <main className="shell__main" id="main" tabIndex={-1}>
          <div className="shell__canvas" aria-hidden="true" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              className="shell__page"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileNavigation />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
