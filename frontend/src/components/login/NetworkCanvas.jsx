import { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery.js';

/**
 * Refined infrastructure / telemetry network backdrop:
 * Faint architectural wireframe building, subtle telemetry points,
 * muted network nodes, and calm data pulse lines.
 * Designed to feel like monitoring infrastructure without competing with content.
 */
export default function NetworkCanvas({ pointer = { x: 0, y: 0 } }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ nodes: [], particles: [], telemetry: [], w: 0, h: 0, dpr: 1 });
  const rafRef = useRef(0);
  const pointerRef = useRef(pointer);
  const { isDark } = useTheme();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    pointerRef.current = pointer;
  }, [pointer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    const palette = isDark
      ? {
          node: 'rgba(0, 212, 255, 0.25)',
          link: 'rgba(0, 212, 255,',
          accent: 'rgba(0, 212, 255, 0.75)',
          blue: 'rgba(58, 134, 255, 0.70)',
          building: 'rgba(0, 212, 255, 0.08)',
          buildingFill: 'rgba(58, 134, 255, 0.025)',
          telemetryText: 'rgba(0, 212, 255, 0.45)',
          grid: 'rgba(0, 212, 255, 0.035)',
        }
      : {
          node: 'rgba(2, 132, 199, 0.22)',
          link: 'rgba(2, 132, 199,',
          accent: 'rgba(0, 119, 182, 0.65)',
          blue: 'rgba(2, 132, 199, 0.55)',
          building: 'rgba(2, 132, 199, 0.08)',
          buildingFill: 'rgba(2, 132, 199, 0.02)',
          telemetryText: 'rgba(15, 23, 42, 0.45)',
          grid: 'rgba(2, 132, 199, 0.03)',
        };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const s = stateRef.current;
      s.w = rect.width;
      s.h = rect.height;
      s.dpr = dpr;

      // Restrained node density so it never feels busy
      const density = Math.max(18, Math.min(52, Math.round((rect.width * rect.height) / 22000)));

      s.nodes = Array.from({ length: density }, () => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.09,
        vy: (Math.random() - 0.5) * 0.09,
        r: 0.9 + Math.random() * 1.1,
        depth: 0.35 + Math.random() * 0.65,
      }));

      // Small number of calm data pulses
      s.particles = Array.from({ length: Math.round(density / 3.8) }, () => ({
        a: Math.floor(Math.random() * density),
        b: Math.floor(Math.random() * density),
        t: Math.random(),
        speed: 0.0018 + Math.random() * 0.003,
        warm: Math.random() > 0.65,
      }));

      // Telemetry markers positioned relative to building
      s.telemetry = [
        { label: 'Velxio device · awaiting telemetry', floor: 1, xRatio: 0.82 },
        { label: 'SF-2F [NORMAL]', floor: 0, xRatio: 0.28 },
        { label: 'SF-GF [212 L]', floor: 2, xRatio: 0.72 },
        { label: 'SF-BASE [OK]', floor: 3, xRatio: 0.35 },
      ];
    };

    const drawBuilding = (s) => {
      // Anchored behind the left column
      const cx = s.w >= 1024 ? s.w * 0.28 : s.w * 0.5;
      const cy = s.h * 0.52;
      const bw = Math.min(s.w * 0.36, 280);
      const fh = Math.min(s.h * 0.095, 52);
      const floors = 4;
      const totalH = fh * floors;
      const px = pointerRef.current.x * 6;
      const py = pointerRef.current.y * 5;

      ctx.save();
      ctx.translate(cx - bw / 2 + px, cy - totalH / 2 + py);

      // Faint floor rectangles
      for (let i = 0; i < floors; i += 1) {
        const y = i * fh;
        ctx.beginPath();
        ctx.rect(0, y, bw, fh);
        ctx.fillStyle = palette.buildingFill;
        ctx.fill();
        ctx.strokeStyle = palette.building;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Floor index
        ctx.font = '8px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillStyle = palette.telemetryText;
        ctx.fillText(`0${floors - i}`, 6, y + 12);

        // Small telemetry sensor dots
        for (let d = 0; d < 3; d += 1) {
          const dx = bw * (0.24 + d * 0.28);
          const dy = y + fh / 2;
          ctx.beginPath();
          ctx.arc(dx, dy, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = i === 1 && d === 1 ? palette.accent : palette.blue;
          ctx.globalAlpha = 0.45;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Small telemetry callout badges
      s.telemetry.forEach((t) => {
        const y = t.floor * fh + fh / 2;
        const x = bw * t.xRatio;
        ctx.font = '7.5px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillStyle = palette.telemetryText;
        ctx.fillText(t.label, x + 6, y + 2.5);
      });

      // Roof cap
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(bw + 6, 0);
      ctx.strokeStyle = palette.building;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Ground reference line
      ctx.beginPath();
      ctx.moveTo(-28, totalH + 6);
      ctx.lineTo(bw + 28, totalH + 6);
      ctx.strokeStyle = palette.building;
      ctx.stroke();

      ctx.restore();
    };

    const frame = () => {
      const s = stateRef.current;
      ctx.clearRect(0, 0, s.w, s.h);

      const px = pointerRef.current.x;
      const py = pointerRef.current.y;

      // Draw faint structural engineering grid in background
      if (s.w >= 768) {
        ctx.save();
        ctx.strokeStyle = palette.grid;
        ctx.lineWidth = 0.5;
        const gridSize = 72;
        const startX = (s.w % gridSize) / 2;
        const startY = (s.h % gridSize) / 2;

        for (let x = startX; x < s.w; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, s.h);
          ctx.stroke();
        }
        for (let y = startY; y < s.h; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(s.w, y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Telemetry proximity links (subtle, low alpha)
      for (let i = 0; i < s.nodes.length; i += 1) {
        const a = s.nodes[i];
        for (let j = i + 1; j < s.nodes.length; j += 1) {
          const b = s.nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 135) {
            const alpha = (1 - dist / 135) * 0.07;
            ctx.beginPath();
            ctx.moveTo(a.x + px * a.depth * 8, a.y + py * a.depth * 6);
            ctx.lineTo(b.x + px * b.depth * 8, b.y + py * b.depth * 6);
            ctx.strokeStyle = `${palette.link}${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      // Draw building & telemetry readouts
      drawBuilding(s);

      // Network nodes
      s.nodes.forEach((n) => {
        if (!reduced) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < -16) n.x = s.w + 16;
          if (n.x > s.w + 16) n.x = -16;
          if (n.y < -16) n.y = s.h + 16;
          if (n.y > s.h + 16) n.y = -16;
        }
        ctx.beginPath();
        ctx.arc(n.x + px * n.depth * 8, n.y + py * n.depth * 6, n.r, 0, Math.PI * 2);
        ctx.fillStyle = palette.node;
        ctx.globalAlpha = 0.12 + n.depth * 0.12;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Data pulse particles travelling between nodes
      s.particles.forEach((p) => {
        const a = s.nodes[p.a];
        const b = s.nodes[p.b];
        if (!a || !b) return;
        if (!reduced) {
          p.t += p.speed;
          if (p.t > 1) {
            p.t = 0;
            p.a = Math.floor(Math.random() * s.nodes.length);
            p.b = Math.floor(Math.random() * s.nodes.length);
          }
        }
        const x = a.x + (b.x - a.x) * p.t + px * 8;
        const y = a.y + (b.y - a.y) * p.t + py * 6;
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = p.warm ? palette.accent : palette.blue;
        ctx.globalAlpha = 0.35;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      if (!reduced) rafRef.current = requestAnimationFrame(frame);
    };

    resize();
    frame();

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) frame();
    });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [isDark, reduced]);

  return <canvas ref={canvasRef} className="login__canvas" aria-hidden="true" />;
}
