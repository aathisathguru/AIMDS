import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartColors } from '../../context/ThemeContext.jsx';
import { useIsMobile } from '../../hooks/useMediaQuery.js';
import './AnalyticsChart.css';

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <p className="chart-tip__label num">{label}</p>
      <ul>
        {payload
          .filter((p) => p.value !== undefined && p.value !== null && p.dataKey !== 'band')
          .map((p) => (
            <li key={p.dataKey}>
              <span className="chart-tip__swatch" style={{ background: p.color }} aria-hidden="true" />
              <span className="chart-tip__name">{p.name}</span>
              <span className="chart-tip__val num">
                {Array.isArray(p.value) ? `${p.value[0]}–${p.value[1]}` : p.value}
                {unit ? ` ${unit}` : ''}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

/**
 * Theme-aware, always-responsive Recharts wrapper.
 * Height shrinks on phones and the container is width:100% with min-width:0
 * so charts can never push the page into horizontal scroll.
 */
export default function AnalyticsChart({
  type = 'area',
  data = [],
  series = [],
  xKey = 'label',
  unit = '',
  height,
  showLegend = false,
  showGrid = true,
  band = false,
  referenceLine,
  ariaLabel = 'Chart',
}) {
  const c = useChartColors();
  const isMobile = useIsMobile();
  const h = height ?? (isMobile ? 200 : 280);
  const chartData = data || [];

  const axisProps = useMemo(
    () => ({
      stroke: 'transparent',
      tick: { fill: c.axis, fontSize: 10, fontFamily: 'var(--font-mono)' },
      tickLine: false,
      axisLine: false,
    }),
    [c.axis],
  );

  // Cap the number of x labels so ticks never collide on narrow panels.
  const maxTicks = isMobile ? 5 : 9;
  const xInterval =
    chartData.length > maxTicks ? Math.max(0, Math.ceil(chartData.length / maxTicks) - 1) : 0;
  const anim = { animationDuration: 620, animationEasing: 'ease-out' };

  // `referenceLine` accepts either a bare number (a threshold) or
  // `{ y, label, tone }` for baselines and other annotated guides.
  const refLine =
    referenceLine === undefined || referenceLine === null
      ? null
      : typeof referenceLine === 'number'
        ? { y: referenceLine, label: 'Threshold', tone: 'crit' }
        : { tone: 'neutral', label: 'Baseline', ...referenceLine };

  return (
    <div className="chart-shell" style={{ height: h }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }} barGap={3}>
            {showGrid && <CartesianGrid strokeDasharray="3 4" stroke={c.grid} vertical={false} />}
            <XAxis dataKey={xKey} {...axisProps} interval={xInterval} minTickGap={12} tickMargin={8} />
            <YAxis {...axisProps} width={isMobile ? 34 : 46} tickCount={5} domain={[0, 'auto']} allowDecimals={false} />
            <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: c.border, strokeWidth: 1, strokeDasharray: '3 3' }} />
            {showLegend && (
              <Legend verticalAlign="top" align="right" height={28} iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: c.dim, paddingBottom: 6 }} />
            )}
            {refLine && (
              <ReferenceLine y={refLine.y} stroke={refLine.tone === 'neutral' ? c.dim : c.crit} strokeDasharray="4 4" strokeWidth={1.2} label={{ value: refLine.label, position: 'insideBottomRight', fill: refLine.tone === 'neutral' ? c.dim : c.crit, fontSize: 9, fontFamily: 'var(--font-mono)' }} />
            )}
            {series.map((s, idx) => (
              <Bar
                key={s.key || s.dataKey || `bar-${idx}`}
                dataKey={s.dataKey || s.key}
                name={s.name}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={isMobile ? 16 : 34}
                {...anim}
              />
            ))}
          </BarChart>
        ) : type === 'line' ? (
          <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 4" stroke={c.grid} vertical={false} />}
            <XAxis dataKey={xKey} {...axisProps} interval={xInterval} minTickGap={12} tickMargin={8} />
            <YAxis {...axisProps} width={isMobile ? 34 : 46} tickCount={5} domain={['auto', 'auto']} allowDecimals={false} />
            <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: c.border, strokeWidth: 1, strokeDasharray: '3 3' }} />
            {showLegend && (
              <Legend verticalAlign="top" align="right" height={28} iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: c.dim, paddingBottom: 6 }} />
            )}
            {refLine && (
              <ReferenceLine y={refLine.y} stroke={refLine.tone === 'neutral' ? c.dim : c.crit} strokeDasharray="4 4" strokeWidth={1.2} label={{ value: refLine.label, position: 'insideBottomRight', fill: refLine.tone === 'neutral' ? c.dim : c.crit, fontSize: 9, fontFamily: 'var(--font-mono)' }} />
            )}
            {series.map((s, idx) => (
              <Line
                key={s.key || s.dataKey || `line-${idx}`}
                type="monotone"
                dataKey={s.dataKey || s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={s.strokeWidth ?? 2}
                strokeDasharray={s.dashed ? '4 4' : undefined}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: c.surface }}
                {...anim}
              />
            ))}
          </LineChart>
        ) : (
          <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {series.map((s, idx) => (
                <linearGradient key={s.key || s.dataKey || `grad-${idx}`} id={`grad-${s.key || s.dataKey || idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={band ? 0.2 : 0.34} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            {showGrid && <CartesianGrid strokeDasharray="3 4" stroke={c.grid} vertical={false} />}
            <XAxis dataKey={xKey} {...axisProps} interval={xInterval} minTickGap={12} tickMargin={8} />
            <YAxis {...axisProps} width={isMobile ? 34 : 46} tickCount={5} domain={['auto', 'auto']} allowDecimals={false} />
            <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: c.border, strokeWidth: 1, strokeDasharray: '3 3' }} />
            {showLegend && (
              <Legend verticalAlign="top" align="right" height={28} iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: c.dim, paddingBottom: 6 }} />
            )}
            {refLine && (
              <ReferenceLine y={refLine.y} stroke={refLine.tone === 'neutral' ? c.dim : c.crit} strokeDasharray="4 4" strokeWidth={1.2} label={{ value: refLine.label, position: 'insideBottomRight', fill: refLine.tone === 'neutral' ? c.dim : c.crit, fontSize: 9, fontFamily: 'var(--font-mono)' }} />
            )}
            {band && (
              <Area
                key="expected-band"
                dataKey="band"
                name="Expected range"
                stroke="none"
                fill={c.band}
                isAnimationActive={false}
                activeDot={false}
                legendType="none"
              />
            )}
            {series.map((s, idx) => (
              <Area
                key={s.key || s.dataKey || `area-${idx}`}
                type="monotone"
                dataKey={s.dataKey || s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={s.strokeWidth ?? 2}
                strokeDasharray={s.dashed ? '4 4' : undefined}
                fill={s.noFill ? 'transparent' : `url(#grad-${s.key || s.dataKey || idx})`}
                activeDot={{ r: 4, strokeWidth: 2, stroke: c.surface }}
                {...anim}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
