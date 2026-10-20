import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  Sliders,
  Sun,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { currentUser } from '../../data/mockData.js';
import ThemeToggle from '../ui/ThemeToggle.jsx';
import './ProfileDropdown.css';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();

  const [imgError, setImgError] = useState(false);

  const displayName = user?.name || currentUser.name;
  const displayRole = user?.role || currentUser.role || 'System Administrator';
  const displayInitials = user?.initials || currentUser.initials || 'AA';
  const displayEmail = user?.email || currentUser.email || 'aathi@gmail.com';
  const displayPicture = !imgError && user?.picture ? user.picture : null;

  useEffect(() => {
    setImgError(false);
  }, [user?.picture]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleNavigate = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate('/login');
  };

  const handleToggleTheme = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  };

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`profile-menu__trigger ${isOpen ? 'is-active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`User profile: ${displayName}`}
        title={`${displayName} (${displayRole})`}
      >
        {displayPicture ? (
          <img
            src={displayPicture}
            alt={displayName}
            className="profile-menu__avatar-img"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="profile-menu__avatar-btn" aria-hidden="true">
            {displayInitials}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="profile-menu__dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            role="menu"
            aria-label="User profile menu"
          >
            {/* Header / Identity */}
            <div className="profile-menu__header">
              {displayPicture ? (
                <img
                  src={displayPicture}
                  alt={displayName}
                  className="profile-menu__avatar-lg-img"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="profile-menu__avatar-lg" aria-hidden="true">
                  {displayInitials}
                </span>
              )}
              <div className="profile-menu__user-info">
                <span className="profile-menu__name">{displayName}</span>
                <span className="profile-menu__role-badge">{displayRole}</span>
                {displayEmail && <span className="profile-menu__email">{displayEmail}</span>}
              </div>
            </div>

            <div className="profile-menu__divider" />

            {/* Navigation options */}
            <div className="profile-menu__group" role="group" aria-label="Account actions">
              <button
                type="button"
                className="profile-menu__item"
                role="menuitem"
                onClick={() => handleNavigate('/settings')}
              >
                <User size={15} className="profile-menu__icon" aria-hidden="true" />
                <span className="profile-menu__label">Profile</span>
              </button>

              <button
                type="button"
                className="profile-menu__item"
                role="menuitem"
                onClick={() => handleNavigate('/settings')}
              >
                <Settings size={15} className="profile-menu__icon" aria-hidden="true" />
                <span className="profile-menu__label">Account Settings</span>
              </button>

              <button
                type="button"
                className="profile-menu__item"
                role="menuitem"
                onClick={() => handleNavigate('/settings')}
              >
                <Sliders size={15} className="profile-menu__icon" aria-hidden="true" />
                <span className="profile-menu__label">Preferences</span>
              </button>

              <button
                type="button"
                className="profile-menu__item"
                role="menuitem"
                onClick={() => handleNavigate('/settings')}
              >
                <ShieldCheck size={15} className="profile-menu__icon" aria-hidden="true" />
                <span className="profile-menu__label">Security</span>
              </button>
            </div>

            <div className="profile-menu__divider" />

            {/* Theme switcher */}
            <div className="profile-menu__group" role="group" aria-label="Appearance">
              <div
                className="profile-menu__theme-row"
                role="button"
                tabIndex={0}
                onClick={handleToggleTheme}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleToggleTheme(e);
                  }
                }}
                aria-label={`Toggle theme: currently ${isDark ? 'Dark Mode' : 'Light Mode'}`}
                title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              >
                <div className="profile-menu__theme-left">
                  {isDark ? (
                    <Moon size={15} className="profile-menu__icon" aria-hidden="true" />
                  ) : (
                    <Sun size={15} className="profile-menu__icon" aria-hidden="true" />
                  )}
                  <span className="profile-menu__label">
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </div>
                <div className="profile-menu__theme-toggle" onClick={(e) => e.stopPropagation()}>
                  <ThemeToggle compact />
                </div>
              </div>
            </div>

            <div className="profile-menu__divider" />

            {/* Sign out */}
            <div className="profile-menu__group" role="group" aria-label="Session">
              <button
                type="button"
                className="profile-menu__item profile-menu__logout"
                role="menuitem"
                onClick={handleLogout}
              >
                <LogOut size={15} className="profile-menu__icon" aria-hidden="true" />
                <span className="profile-menu__label">Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
