import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './useMediaQuery.js';

/**
 * Subtle pointer parallax. Returns a normalised offset in the range
 * [-1, 1] on both axes, measured against the viewport centre.
 * Disabled for touch devices and reduced-motion users.
 */
export function useParallax({ strength = 1, disabled = false } = {}) {
  const reduced = usePrefersReducedMotion();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const raf = useRef(0);

  useEffect(() => {
    if (reduced || disabled) return undefined;
    if (window.matchMedia('(hover: none)').matches) return undefined;

    const onMove = (e) => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2 * strength;
        const y = (e.clientY / window.innerHeight - 0.5) * 2 * strength;
        setOffset({ x, y });
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf.current);
    };
  }, [reduced, disabled, strength]);

  return offset;
}
