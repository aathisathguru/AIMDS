import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Radio, Search } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Logo from '../components/ui/Logo.jsx';
import SensorCard from '../components/monitoring/SensorCard.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import { EmptyState } from '../components/ui/States.jsx';
import { useData } from '../context/DataContext.jsx';
import { SENSOR_TYPES } from '../data/mockData.js';
import './Sensors.css';

const STATUS_OPTS = [
  { id: 'all', label: 'All' },
  { id: 'normal', label: 'Normal' },
  { id: 'attention', label: 'Attention' },
  { id: 'critical', label: 'Critical' },
];

export default function Sensors() {
  const { blocks } = useData();
  const [params] = useSearchParams();
  const focus = params.get('focus');

  const [blockCode, setBlockCode] = useState('all');
  const [floorCode, setFloorCode] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState(focus ?? '');

  const allSensors = useMemo(
    () =>
      blocks.flatMap((b) => {
        const floorSensors = (b.floors || []).flatMap((f) =>
          (f.sensors || []).map((s) => ({ ...s, blockName: b.name, floorName: f.name })),
        );
        const directSensors = (b.sensors || []).map((s) => ({
          ...s,
          blockName: b.name,
          floorName: s.floorCode === 'MAIN' ? 'Mains' : 'Direct',
        }));
        return floorSensors.length > 0 ? floorSensors : directSensors;
      }),
    [blocks],
  );

  const floorOptions = useMemo(() => {
    const source = blockCode === 'all' ? blocks : blocks.filter((b) => b.code === blockCode);
    const seen = new Map();
    source.forEach((b) =>
      (b.floors || []).forEach((f) => {
        if (!seen.has(f.code)) seen.set(f.code, f.name);
      }),
    );
    return [...seen.entries()].map(([code, name]) => ({ code, name }));
  }, [blocks, blockCode]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allSensors.filter((s) => {
      if (blockCode !== 'all' && s.blockCode !== blockCode) return false;
      if (floorCode !== 'all' && s.floorCode !== floorCode) return false;
      if (type !== 'all' && s.key !== type) return false;
      if (status !== 'all' && s.status !== status) return false;
      if (q && !`${s.id} ${s.type} ${s.blockName} ${s.floorName}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [allSensors, blockCode, floorCode, type, status, query]);

  const counts = useMemo(
    () =>
      allSensors.reduce(
        (acc, s) => {
          acc[s.status] = (acc[s.status] ?? 0) + 1;
          return acc;
        },
        { normal: 0, attention: 0, critical: 0, offline: 0 },
      ),
    [allSensors],
  );

  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="Instrumentation"
        title="Sensors"
        meta={
          <>
            <div className="sen__brand-badge">
              <Logo size="xs" />
              <span className="eyebrow eyebrow-accent">AIMDS Grid Sensor Telemetry</span>
            </div>
            <span className="sen__stat num">
              <strong>{allSensors.length}</strong> total
            </span>
            <span className="sen__stat num">
              <strong>{counts.normal}</strong> normal
            </span>
            <span className="sen__stat num">
              <strong>{counts.attention}</strong> attention
            </span>
            <span className="sen__stat num">
              <strong>{counts.critical}</strong> critical
            </span>
          </>
        }
      />

      <section className="sen__filters" aria-label="Sensor filters">
        <div className="sen__search">
          <Search size={15} aria-hidden="true" />
          <input
            className="input sen__search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sensor ID, type, block or floor…"
            aria-label="Search sensors"
          />
        </div>

        <div className="sen__selects">
          <div className="field">
            <label className="field__label" htmlFor="f-block">
              Block
            </label>
            <select
              id="f-block"
              className="select"
              value={blockCode}
              onChange={(e) => {
                setBlockCode(e.target.value);
                setFloorCode('all');
              }}
            >
              <option value="all">All blocks</option>
              {blocks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="f-floor">
              Floor
            </label>
            <select
              id="f-floor"
              className="select"
              value={floorCode}
              onChange={(e) => setFloorCode(e.target.value)}
            >
              <option value="all">All floors</option>
              {floorOptions.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="f-type">
              Sensor type
            </label>
            <select
              id="f-type"
              className="select"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">All types</option>
              {SENSOR_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="sen__status">
          <span className="field__label">Status</span>
          <Segmented
            size="sm"
            ariaLabel="Filter by status"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTS}
          />
        </div>
      </section>

      <div className="sen__resultbar">
        <span className="num">
          {rows.length} sensor{rows.length === 1 ? '' : 's'}
        </span>
        {(blockCode !== 'all' || floorCode !== 'all' || type !== 'all' || status !== 'all' || query) && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setBlockCode('all');
              setFloorCode('all');
              setType('all');
              setStatus('all');
              setQuery('');
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No sensors match"
          message="Adjust the filters or clear the search to see the full sensor list."
        />
      ) : (
        <div className="grid-auto">
          {rows.map((s, i) => (
            <SensorCard key={s.id} sensor={s} index={i} defaultOpen={focus === s.id} />
          ))}
        </div>
      )}
    </div>
  );
}
