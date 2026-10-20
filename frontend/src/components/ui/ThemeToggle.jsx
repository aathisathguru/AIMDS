import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import './ThemeToggle.css';

export default function ThemeToggle({ compact = false }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      type="button"
      className={`theme-toggle ${compact ? 'is-compact' : ''}`}
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <motion.span
          className="theme-toggle__knob"
          animate={{ x: isDark ? 0 : 20 }}
          transition={{ type: 'spring', stiffness: 480, damping: 32 }}
        >
          <motion.span
            key={isDark ? 'moon' : 'sun'}
            initial={{ opacity: 0, rotate: -70, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="theme-toggle__glyph"
          >
            {isDark ? <Moon size={12} strokeWidth={2.4} /> : <Sun size={12} strokeWidth={2.4} />}
          </motion.span>
        </motion.span>
      </span>
    </button>
  );
}
