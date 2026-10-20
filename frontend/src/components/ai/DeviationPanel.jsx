import { motion } from 'framer-motion';
import { ArrowRight, Brain } from 'lucide-react';
import AnalyticsChart from '../charts/AnalyticsChart.jsx';
import { useChartColors } from '../../context/ThemeContext.jsx';
import './DeviationPanel.css';

/**
 * Connects analytics to AI conclusions:
 *   Historical Trend → Current Reading → Expected Range → Deviation → AI Detection
 * This is what makes AIMDS read as a decision-support system rather than a
 * graph viewer.
 */
export default function DeviationPanel({
  title = 'Energy · Sunflower 1st Floor',
  subtitle = 'Observed reading against the modelled envelope',
  data,
  unit = 'kWh',
  current,
  expected,
  deviation,
  detection = 'Anomaly flagged by AIMDS-Anomaly v3.2',
  confidence = 94,
}) {
  const c = useChartColors();

  const steps = [
    { id: 'hist', label: 'Historical Trend', value: '24 h rolling baseline' },
    { id: 'cur', label: 'Current Reading', value: `${current} ${unit}`, tone: 'accent' },
    { id: 'exp', label: 'Expected Range', value: `${expected} ${unit}` },
    { id: 'dev', label: 'Deviation', value: deviation, tone: 'crit' },
    { id: 'ai', label: 'AI Detection', value: `${confidence}% confidence`, tone: 'blue' },
  ];

  return (
    <section className="devp" aria-label="Analytics to AI detection">
      <header className="devp__head">
        <div className="min0">
          <p className="eyebrow eyebrow-accent">Analytics → AI</p>
          <h3 className="devp__title">{title}</h3>
          <p className="devp__sub">{subtitle}</p>
        </div>
        <span className="devp__badge">
          <Brain size={13} aria-hidden="true" />
          Explained
        </span>
      </header>

      <div className="devp__chart">
        <AnalyticsChart
          type="area"
          data={data}
          band
          unit={unit}
          height={230}
          ariaLabel={`${title}: observed values plotted against the expected range`}
          series={[
            { key: 'expected', name: 'Expected', color: c.blue, dashed: true, noFill: true, strokeWidth: 1.4 },
            { key: 'value', name: 'Observed', color: c.accent, strokeWidth: 2.2 },
          ]}
          showLegend
        />
        <p className="devp__legend-note">
          <span className="devp__swatch" aria-hidden="true" /> Shaded area = modelled expected
          envelope
        </p>
      </div>

      <ol className="devp__ladder">
        {steps.map((s, i) => (
          <motion.li
            key={s.id}
            className={`devp__step ${s.tone ? `tone-${s.tone}` : ''}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.32 }}
          >
            <span className="devp__step-inner">
              <span className="devp__step-label">{s.label}</span>
              <span className="devp__step-value num">{s.value}</span>
            </span>
            {i < steps.length - 1 && (
              <ArrowRight size={13} className="devp__arrow" aria-hidden="true" />
            )}
          </motion.li>
        ))}
      </ol>

      <p className="devp__detect">{detection}</p>
    </section>
  );
}
