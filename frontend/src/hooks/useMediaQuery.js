import { useEffect, useState } from 'react';

/** Mobile-first media query hook. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export const useIsMobile = () => !useMediaQuery('(min-width: 768px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
export const useIsWide = () => useMediaQuery('(min-width: 1440px)');

export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
