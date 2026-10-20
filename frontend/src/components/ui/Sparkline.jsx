import { useId, useMemo } from 'react';

/**
 * Dependency-free inline sparkline. Used inside dense cards where a full
 * Recharts instance would be wasteful.
 */
export default function Sparkline({
  data = [],
  width = 120,
  height = 34,
  tone = 'var(--accent)',
  fill = true,
  strokeWidth = 1.6,
  label = 'Trend',
}) {
  const id = useId().replace(/:/g, '');
  const { line, area } = useMemo(() => {
    if (!data.length) return { line: '', area: '' };
    const vals = data.map((d) => (typeof d === 'number' ? d : d.value));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const stepX = width / Math.max(vals.length - 1, 1);
    const pts = vals.map((v, i) => {
      const x = i * stepX;
      const y = height - 2 - ((v - min) / span) * (height - 5);
      return [Number(x.toFixed(2)), Number(y.toFixed(2))];
    });
    const l = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
    const a = `${l} L${width},${height} L0,${height} Z`;
    return { line: l, area: a };
  }, [data, width, height]);

  if (!data.length) return null;

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, overflow: 'visible' }}
      role="img"
      aria-label={label}
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tone} stopOpacity="0.26" />
              <stop offset="100%" stopColor={tone} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#spark-${id})`} />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke={tone}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
