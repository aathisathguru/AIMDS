import { useMemo, useState } from 'react';
import { BellOff, Filter } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Logo from '../components/ui/Logo.jsx';
import AlertCard from '../components/alerts/AlertCard.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import { EmptyState } from '../components/ui/States.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { SEVERITY_RANK } from '../utils/format.js';
import './Alerts.css';

export default function Alerts() {
  const { alerts, blocks, acknowledgeAlert, resolveAlert } = useData();
  const { push } = useToast();
  const [severity, setSeverity] = useState('all');
  const [blockCode, setBlockCode] = useState('all');

  const counts = useMemo(
    () =>
      alerts.reduce(
        (acc, a) => {
          acc[a.severity] = (acc[a.severity] ?? 0) + 1;
          acc.all += 1;
          return acc;
        },
        { all: 0, critical: 0, warning: 0, info: 0, resolved: 0 },
      ),
    [alerts],
  );

  const rows = useMemo(() => {
    const list = alerts.filter((a) => {
      if (severity !== 'all' && a.severity !== severity) return false;
      if (blockCode !== 'all' && a.blockCode !== blockCode) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      return s !== 0 ? s : a.minutesAgo - b.minutesAgo;
    });
  }, [alerts, severity, blockCode]);

  const handleAck = (id) => {
    acknowledgeAlert(id);
    push({ tone: 'info', title: `${id} acknowledged`, message: 'Owner notified in the operations channel.' });
  };

  const handleResolve = (id) => {
    resolveAlert(id);
    push({ tone: 'success', title: `${id} resolved`, message: 'Event archived for AI pattern learning.' });
  };

  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="Operations"
        title="Alert Centre"
        meta={
          <>
            <div className="al__brand-badge">
              <Logo size="xs" />
              <span className="eyebrow eyebrow-accent">AIMDS SCADA Dispatch</span>
            </div>
            <span className="al__pill tone-crit num">
              <strong>{counts.critical}</strong> critical
            </span>
            <span className="al__pill tone-warn num">
              <strong>{counts.warning}</strong> warning
            </span>
            <span className="al__pill tone-info num">
              <strong>{counts.info}</strong> information
            </span>
            <span className="al__pill tone-ok num">
              <strong>{counts.resolved}</strong> resolved
            </span>
          </>
        }
      />

      <section className="al__filters" aria-label="Alert filters">
        <div className="al__filter-group">
          <span className="field__label">
            <Filter size={11} aria-hidden="true" /> Severity
          </span>
          <Segmented
            size="sm"
            ariaLabel="Filter by severity"
            value={severity}
            onChange={setSeverity}
            options={[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'critical', label: 'Critical', count: counts.critical },
              { id: 'warning', label: 'Warning', count: counts.warning },
              { id: 'info', label: 'Info', count: counts.info },
              { id: 'resolved', label: 'Resolved', count: counts.resolved },
            ]}
          />
        </div>

        <div className="field al__block-select">
          <label className="field__label" htmlFor="al-block">
            Block
          </label>
          <select
            id="al-block"
            className="select"
            value={blockCode}
            onChange={(e) => setBlockCode(e.target.value)}
          >
            <option value="all">All blocks</option>
            {blocks.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>
      </section>

      {rows.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="No alerts in this view"
          message="Nothing matches the current filters. Utilities in scope are inside their expected envelopes."
        />
      ) : (
        <div className="al__list">
          {rows.map((a, i) => (
            <AlertCard
              key={a.id}
              alert={a}
              index={i}
              onAcknowledge={handleAck}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}
