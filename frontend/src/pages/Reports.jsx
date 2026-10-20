import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Check, FileDown, FileText, Sheet } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Logo from '../components/ui/Logo.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import StatusIndicator from '../components/ui/StatusIndicator.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { reportHistory } from '../data/mockData.js';
import { reportService, USE_MOCK } from '../services/api.js';
import { useServiceData } from '../hooks/useServiceData.js';
import { formatNumber } from '../utils/format.js';
import './Reports.css';

const SECTIONS = [
  { id: 'block', label: 'Block summary', desc: 'Status rollup, totals and floor breakdown' },
  { id: 'floor', label: 'Floor summary', desc: 'Per-floor utility readings and occupancy' },
  { id: 'usage', label: 'Utility usage', desc: 'Energy, water, temperature and load' },
  { id: 'trends', label: 'Historical trends', desc: 'Charts for the selected period' },
  { id: 'alerts', label: 'Alerts', desc: 'Raised, acknowledged and resolved events' },
  { id: 'ai', label: 'AI insights', desc: 'Findings, causes and recommendations' },
];

const PERIODS = [
  { id: '7d', label: 'Last 7 days', short: '7 days' },
  { id: '30d', label: 'Last 30 days', short: '30 days' },
  { id: 'q', label: 'This quarter', short: 'Quarter' },
];

export default function Reports() {
  // Generated-report history comes from the service layer; the bundled
  // fixture is the seed so the panel is populated on the first frame.
  const { data: history } = useServiceData(() => reportService.history(), reportHistory, []);

  const { blocks, alerts, insights, stats } = useData();
  const { push } = useToast();

  const [scope, setScope] = useState('SF');
  const [period, setPeriod] = useState('7d');
  const [enabled, setEnabled] = useState(() =>
    Object.fromEntries(SECTIONS.map((s) => [s.id, true])),
  );
  const [exporting, setExporting] = useState('');

  const block = blocks.find((b) => b.code === scope);
  const selectedCount = Object.values(enabled).filter(Boolean).length;

  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? '';

  const summary = useMemo(
    () => ({
      floors: block?.floors?.length ?? 0,
      sensors: block?.sensorCount ?? block?.sensors?.length ?? 0,
      energy: block?.totals?.energy ?? block?.energy ?? 0,
      water: block?.totals?.water ?? block?.water ?? 0,
      alerts: alerts.filter((a) => a.blockCode === scope).length,
      insights: insights.filter((i) => i.blockCode === scope).length,
    }),
    [block, alerts, insights, scope],
  );

  const exportAs = async (format) => {
    if (exporting) return;
    setExporting(format);
    try {
      const result = await reportService.export({
        name: `${block?.name ?? 'AIMDS'} monitoring report`,
        scope: block?.code ?? 'all',
        period,
        format: format.toLowerCase(),
        sections: Object.entries(enabled).filter(([, value]) => value).map(([key]) => key),
      });
      push({
        tone: 'success',
        title: `${format} export queued`,
        message: result?.message || (USE_MOCK ? 'Export request recorded in this browser session.' : 'The reporting service accepted the export job.'),
      });
    } catch (error) {
      push({ tone: 'warning', title: `${format} export failed`, message: error?.message || 'Try again.' });
    } finally {
      setExporting('');
    }
  };

  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="Documentation"
        title="Reports"
        subtitle="Compose a monitoring report from the configured AIMDS data source. Configure the scope and sections, then queue an export."
        meta={
          <div className="rp__brand-meta">
            <Logo size="xs" />
            <span className="eyebrow eyebrow-accent">AIMDS Enterprise Reporting Node</span>
          </div>
        }
        actions={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => exportAs('CSV')} disabled={Boolean(exporting)}>
              <Sheet size={15} aria-hidden="true" />
              Export CSV
            </button>
            <button type="button" className="btn btn--primary" onClick={() => exportAs('PDF')} disabled={Boolean(exporting)}>
              <FileDown size={15} aria-hidden="true" />
              {exporting === 'PDF' ? 'Queueing…' : 'Export PDF'}
            </button>
          </>
        }
      />

      <div className="grid-split">
        {/* ---------------- builder ---------------- */}
        <div className="stack">
          <section className="rp__panel">
            <header className="rp__panel-head">
              <div>
                <p className="eyebrow eyebrow-accent">Report scope</p>
                <h2 className="rp__panel-title">What should the report cover?</h2>
              </div>
            </header>

            <div className="rp__scope">
              <div className="field">
                <label className="field__label" htmlFor="rp-block">
                  Block
                </label>
                <select
                  id="rp-block"
                  className="select"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                >
                  {blocks.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <span className="field__label">Period</span>
                <Segmented
                  size="sm"
                  ariaLabel="Reporting period"
                  value={period}
                  onChange={setPeriod}
                  options={PERIODS}
                />
              </div>
            </div>

            <fieldset className="rp__sections">
              <legend className="field__label">Sections ({selectedCount}/{SECTIONS.length})</legend>
              <ul>
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <label className={`rp__section ${enabled[s.id] ? 'is-on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={enabled[s.id]}
                        onChange={(e) =>
                          setEnabled((prev) => ({ ...prev, [s.id]: e.target.checked }))
                        }
                      />
                      <span className="rp__section-box" aria-hidden="true">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span className="min0">
                        <span className="rp__section-label">{s.label}</span>
                        <span className="rp__section-desc">{s.desc}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          </section>

          {/* ---------------- history ---------------- */}
          <section className="rp__panel">
            <header className="rp__panel-head">
              <div>
                <p className="eyebrow eyebrow-accent">Recent reports</p>
                <h2 className="rp__panel-title">Generated history</h2>
              </div>
            </header>

            <ul className="rp__history">
              {history.map((r) => (
                <li key={r.id} className="rp__history-row">
                  <span className="rp__history-icon" aria-hidden="true">
                    {r.format === 'CSV' ? <Sheet size={14} /> : <FileText size={14} />}
                  </span>
                  <span className="min0">
                    <span className="rp__history-name">{r.name}</span>
                    <span className="rp__history-meta num">
                      {r.id} · {r.scope} · {r.period}
                    </span>
                  </span>
                  <span className="rp__history-size num">{r.size}</span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm rp__history-btn"
                    onClick={() => exportAs(r.format)}
                  >
                    <FileDown size={13} aria-hidden="true" />
                    {r.format}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ---------------- preview ---------------- */}
        <motion.section
          className="rp__preview"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          aria-label="Report preview"
        >
          <div className="rp__preview-chrome">
            <span className="eyebrow">Preview</span>
            <StatusIndicator status="standby" label="Draft" size="sm" />
          </div>

          <div className="rp__doc">
            <header className="rp__doc-head">
              <div className="rp__doc-brand-row">
                <Logo size="md" />
                <span className="eyebrow eyebrow-accent">Official Telemetry Report</span>
              </div>
              <h3 className="rp__doc-title">
                {block?.name} ({block?.code}) — Utility Monitoring Report
              </h3>
              <p className="rp__doc-sub num">
                <Calendar size={11} aria-hidden="true" /> {periodLabel} · generated{' '}
                {new Date().toISOString().slice(0, 10)}
              </p>
            </header>

            {enabled.block && (
              <section className="rp__doc-sec">
                <h4>Block summary</h4>
                <dl className="rp__doc-grid">
                  <div>
                    <dt>Floors</dt>
                    <dd className="num">{summary.floors}</dd>
                  </div>
                  <div>
                    <dt>Sensors</dt>
                    <dd className="num">{summary.sensors}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{block?.status}</dd>
                  </div>
                </dl>
              </section>
            )}

            {enabled.usage && (
              <section className="rp__doc-sec">
                <h4>Utility usage</h4>
                <dl className="rp__doc-grid">
                  <div>
                    <dt>Energy</dt>
                    <dd className="num">{formatNumber(summary.energy)} kWh</dd>
                  </div>
                  <div>
                    <dt>Water</dt>
                    <dd className="num">{formatNumber(summary.water)} L</dd>
                  </div>
                  <div>
                    <dt>Load</dt>
                    <dd className="num">{formatNumber(block?.totals.load)} kW</dd>
                  </div>
                </dl>
              </section>
            )}

            {enabled.floor && (
              <section className="rp__doc-sec">
                <h4>Floor summary</h4>
                <ul className="rp__doc-list">
                  {block?.floors.map((f) => (
                    <li key={f.id}>
                      <span className="num">{f.short}</span>
                      <span>{f.name}</span>
                      <span className="num">{formatNumber(f.utilities.energy.value)} kWh</span>
                      <StatusIndicator status={f.status} size="sm" />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {enabled.trends && (
              <section className="rp__doc-sec">
                <h4>Historical trends</h4>
                <p className="rp__doc-note">
                  Energy, water and temperature charts for {periodLabel.toLowerCase()} are embedded
                  in the exported document.
                </p>
              </section>
            )}

            {enabled.alerts && (
              <section className="rp__doc-sec">
                <h4>Alerts</h4>
                <p className="rp__doc-note num">
                  {summary.alerts} events in scope · {stats.alerts.critical} critical estate-wide
                </p>
              </section>
            )}

            {enabled.ai && (
              <section className="rp__doc-sec">
                <h4>AI insights</h4>
                <p className="rp__doc-note num">
                  {summary.insights} findings with causes and recommended actions
                </p>
              </section>
            )}

            <footer className="rp__doc-foot num">
              AIMDS v1.4.0 · Simulation environment · Page 1 of 1
            </footer>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
