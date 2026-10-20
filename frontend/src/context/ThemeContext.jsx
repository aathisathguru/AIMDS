import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'aimds.theme';

function systemTheme() {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function readStored() {
  if (typeof window === 'undefined') return 'dark';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage unavailable */
  }
  return 'dark';
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readStored);
  const [resolved, setResolved] = useState(() =>
    readStored() === 'system' ? systemTheme() : readStored(),
  );

  useEffect(() => {
    const next = preference === 'system' ? systemTheme() : preference;
    setResolved(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      /* ignore */
    }
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setResolved(mq.matches ? 'light' : 'dark');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    root.style.colorScheme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#1C1C1E' : '#F3F3F5');
  }, [resolved]);

  const toggle = useCallback(() => {
    setPreference((p) => {
      const current = p === 'system' ? systemTheme() : p;
      return current === 'dark' ? 'light' : 'dark';
    });
  }, []);

  const value = useMemo(
    () => ({ theme: resolved, preference, setPreference, toggle, isDark: resolved === 'dark' }),
    [resolved, preference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

/** Chart palette resolved per theme (Recharts needs literal colors). */
export function useChartColors() {
  const { isDark } = useTheme();
  return useMemo(
    () =>
      isDark
        ? {
            accent: '#00D4FF',
            blue: '#3A86FF',
            purple: '#A78BFA',
            ok: '#00E676',
            crit: '#FF3366',
            grid: 'rgba(0, 212, 255, 0.08)',
            axis: 'rgba(180, 215, 255, 0.45)',
            band: 'rgba(0, 212, 255, 0.14)',
            surface: '#0F1728',
            border: 'rgba(0, 212, 255, 0.16)',
            text: '#F0F4FC',
            dim: 'rgba(180, 215, 255, 0.65)',
          }
        : {
            accent: '#0077B6',
            blue: '#0284C7',
            purple: '#7C3AED',
            ok: '#059669',
            crit: '#DC2626',
            grid: 'rgba(14, 116, 144, 0.10)',
            axis: 'rgba(15, 23, 42, 0.50)',
            band: 'rgba(2, 132, 199, 0.12)',
            surface: '#FFFFFF',
            border: 'rgba(14, 116, 144, 0.20)',
            text: '#0F172A',
            dim: 'rgba(15, 23, 42, 0.70)',
          },
    [isDark],
  );
}
