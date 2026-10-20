import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, ChartSpline, Download, Home } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Logo from '../components/ui/Logo.jsx';
import AnalyticsChart from '../components/charts/AnalyticsChart.jsx';
import DeviationPanel from '../components/ai/DeviationPanel.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import { useData } from '../context/DataContext.jsx';
import { useChartColors } from '../context/ThemeContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { getComparisonSeries, getSeries, getSortedFloors, getUtilityMix, RANGES } from '../data/mockData.js';
import { readingService, reportService } from '../services/api.js';
import { useServiceData } from '../hooks/useServiceData.js';
import { formatNumber } from '../utils/format.js';
import './Analytics.css';

const RANGE_OPTS = RANGES.map((r) => ({ id: r.id, label: r.label }));

export default function Analytics() {
  const { blocks } = useData();
  const c = useChartColors();
  const { push } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Separate blocks by category exactly matching the Blocks page
  const academicList = useMemo(() => blocks.filter((b) => b.category !== 'hostel'), [blocks]);
  const hostelList = useMemo(() => blocks.filter((b) => b.category === 'hostel'), [blocks]);
  const boysHostels = useMemo(() => hostelList.filter((h) => h.subCategory === 'boys'), [hostelList]);
  const girlsHostels = useMemo(() => hostelList.filter((h) => h.subCategory !== 'boys'), [hostelList]);

  const [categoryFilter, setCategoryFilter] = useState('all');

  const paramBlock = searchParams.get('block');
  const paramFloor = searchParams.get('floor');

  const [blockCode, setBlockCode] = useState(() => {
    if (paramBlock && blocks.some((b) => b.code?.toLowerCase() === paramBlock.toLowerCase())) {
      return blocks.find((b) => b.code?.toLowerCase() === paramBlock.toLowerCase())?.code;
    }
    return academicList[0]?.code ?? blocks[0]?.code ?? 'LC';
  });

  const [floorCode, setFloorCode] = useState(() => paramFloor || 'all');
  const [sensorId, setSensorId] = useState('all');
  const [range, setRange] = useState('24h');
  const [exporting, setExporting] = useState(false);

  const block = useMemo(() => {
    return blocks.find((b) => b.code === blockCode) ?? academicList[0] ?? blocks[0];
  }, [blocks, blockCode, academicList]);

  const isHostelBlock = block?.category === 'hostel';

  // Sort floors ascending: Basement -> Ground -> Floor 1 -> Floor 2 -> Floor 3
  const displayFloors = useMemo(() => {
    return getSortedFloors(block?.floors || []);
  }, [block]);

  const scopedFloor = useMemo(() => {
    if (floorCode === 'all') return null;
    return displayFloors.find((f) => f.code === floorCode) ?? null;
  }, [displayFloors, floorCode]);

  const sensorOptions = useMemo(() => {
    if (scopedFloor) return scopedFloor.sensors || [];
    if (displayFloors.length > 0) return displayFloors.flatMap((f) => f.sensors || []);
    return block?.sensors || [];
  }, [scopedFloor, displayFloors, block]);

  const scopeSeed = `${blockCode}-${floorCode}-${sensorId}`;
  const scopeLabel = useMemo(() => {
    if (!block) return 'Estate Overview';
    if (isHostelBlock) {
      return `${block?.name || 'Hostel'} Hostel · Direct Mains Telemetry`;
    }
    return `${block?.name || 'Block'}${
      scopedFloor ? ` · ${scopedFloor.name}` : ` · All ${displayFloors.length} Floors`
    }`;
  }, [isHostelBlock, block, scopedFloor, displayFloors.length]);

  /*
   * Every chart below is fetched through the service layer. The `useMemo`
   * fixture passed as the seed renders on the first frame, so switching a
   * filter never blanks a chart; the resolved response then replaces it.
   */
  const energyQuery = useMemo(
    () => ({
      seed: `${scopeSeed}-energy`,
      range,
    }),
    [scopeSeed, range, scopedFloor, block],
  );
  const { data: energy } = useServiceData(
    () => readingService.series(energyQuery),
    useMemo(() => getSeries(energyQuery), [energyQuery]),
    [energyQuery],
  );

  const waterQuery = useMemo(
    () => ({
      seed: `${scopeSeed}-water`,
      range,
    }),
    [scopeSeed, range, scopedFloor, block],
  );
  const { data: water } = useServiceData(
    () => readingService.series(waterQuery),
    useMemo(() => getSeries(waterQuery), [waterQuery]),
    [waterQuery],
  );

  const tempQuery = useMemo(
    () => ({
      seed: `${scopeSeed}-temp`,
      range,
    }),
    [scopeSeed, range, scopedFloor, block],
  );
  const { data: temperature } = useServiceData(
    () => readingService.series(tempQuery),
    useMemo(() => getSeries(tempQuery), [tempQuery]),
    [tempQuery],
  );

  const cmpRange = range === '24h' ? '7d' : range;
  const { data: comparison } = useServiceData(
    () => readingService.comparison(cmpRange, block?.code),
    useMemo(() => getComparisonSeries(cmpRange, block), [cmpRange, block]),
    [cmpRange, block],
  );

  const comparisonSeries = useMemo(() => {
    const palette = [
      c.blue,
      c.ok,
      c.accent,
      c.crit,
      '#f59e0b',
      '#8b5cf6',
      '#06b6d4',
    ];
    if (displayFloors && displayFloors.length > 0) {
      return displayFloors.map((f, idx) => ({
        key: f?.name || f?.code || `floor-${idx}`,
        name: f?.name || f?.code || `Floor ${idx + 1}`,
        color: palette[idx % palette.length],
      }));
    }
    // Hostels: peer cohort
    const cohort = isHostelBlock
      ? hostelList.filter((h) => h?.subCategory === block?.subCategory)
      : hostelList;
    const peers = (block ? [block, ...cohort.filter((h) => h?.code !== block?.code)] : cohort)
      .filter(Boolean)
      .slice(0, 4);
    return peers.map((p, idx) => ({
      key: p?.name || p?.code || `peer-${idx}`,
      name: p?.name || p?.code || `Peer ${idx + 1}`,
      color: palette[idx % palette.length],
    }));
  }, [displayFloors, isHostelBlock, hostelList, block, c]);

  const { data: mix } = useServiceData(
    () => readingService.mix(block?.code),
    useMemo(() => getUtilityMix(block), [block]),
    [block],
  );

  const tableRows = useMemo(() => (Array.isArray(energy) ? energy.slice(-8).toReversed() : []), [energy]);

  const totals = useMemo(() => {
    if (!Array.isArray(energy) || energy.length === 0) {
      return { sum: 0, peak: 0, low: 0, avg: 0 };
    }
    const sum = energy.reduce((n, d) => n + (d?.value || 0), 0);
    const peak = Math.max(...energy.map((d) => d?.value || 0));
    const low = Math.min(...energy.map((d) => d?.value || 0));
    return { sum, peak, low, avg: sum / energy.length };
  }, [energy]);

  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await reportService.export({
        name: `Analytics export · ${scopeLabel}`,
        scope: scopeLabel,
        period: range,
        format: 'csv',
        sections: ['Energy series', 'Comparison', 'Utility mix'],
      });
      push({
        tone: 'success',
        title: 'Export accepted',
        message: result?.message || 'The backend accepted the analytics export request.',
      });
    } catch (error) {
      push({ tone: 'warning', title: 'Export failed', message: error.message || 'Could not queue the analytics export.' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="Historical"
        title="Analytics"
        meta={
          <div className="an__brand-meta">
            <Logo size="xs" />
            <span className="eyebrow eyebrow-accent">AIMDS High-Rate Telemetry Analytics</span>
          </div>
        }
        actions={
          <button
            type="button"
            className="btn btn--ghost"
            onClick={exportData}
            disabled={exporting}
          >
            <Download size={15} aria-hidden="true" />
            {exporting ? 'Queueing…' : 'Export data'}
          </button>
        }
      />

      {/* ---------------- filters ---------------- */}
      <section className="an__filters" aria-label="Analytics filters">
        <div className="an__category-pills">
          <span className="field__label">Estate Category</span>
          <div className="an__pill-group">
            <button
              type="button"
              className={`an__pill-btn ${categoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              All ({blocks.length})
            </button>
            <button
              type="button"
              className={`an__pill-btn academics ${categoryFilter === 'academics' ? 'active' : ''}`}
              onClick={() => {
                setCategoryFilter('academics');
                if (isHostelBlock && academicList.length > 0) {
                  setBlockCode(academicList[0].code);
                  setFloorCode('all');
                  setSensorId('all');
                  setSearchParams({ block: academicList[0].code });
                }
              }}
            >
              <Building2 size={13} aria-hidden="true" />
              Academics ({academicList.length})
            </button>
            <button
              type="button"
              className={`an__pill-btn hostel ${categoryFilter === 'hostels' ? 'active' : ''}`}
              onClick={() => {
                setCategoryFilter('hostels');
                if (!isHostelBlock && hostelList.length > 0) {
                  setBlockCode(hostelList[0].code);
                  setFloorCode('all');
                  setSensorId('all');
                  setSearchParams({ block: hostelList[0].code });
                }
              }}
            >
              <Home size={13} aria-hidden="true" />
              Hostels ({hostelList.length})
            </button>
          </div>
        </div>

        <div className="an__controls-row">
          <div className="an__selects">
            <div className="field">
              <div className="an__field-label-row">
                <label className="field__label" htmlFor="an-block">
                  Block / Facility
                </label>
                {isHostelBlock ? (
                  <span className="an__type-tag hostel">Hostel</span>
                ) : (
                  <span className="an__type-tag academics">
                    {displayFloors.length} Floors
                  </span>
                )}
              </div>
              <select
                id="an-block"
                className="select"
                value={blockCode}
                onChange={(e) => {
                  setBlockCode(e.target.value);
                  setFloorCode('all');
                  setSensorId('all');
                  setSearchParams({ block: e.target.value });
                }}
              >
                {(categoryFilter === 'all' || categoryFilter === 'academics') && (
                  <optgroup label="Academic Blocks">
                    {academicList.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name} ({b.code}) · {b.floors?.length ?? 0} Floors
                      </option>
                    ))}
                  </optgroup>
                )}
                {(categoryFilter === 'all' || categoryFilter === 'hostels') && (
                  <>
                    <optgroup label="Hostels — Boys Accommodations">
                      {boysHostels.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name} ({b.code}) · Boys Hostel
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Hostels — Girls Accommodations">
                      {girlsHostels.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name} ({b.code}) · Girls Hostel
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
            </div>

            <div className="field">
              <div className="an__field-label-row">
                <label className="field__label" htmlFor="an-floor">
                  Floor
                </label>
                {!isHostelBlock && scopedFloor && (
                  <span className="an__type-tag">
                    {scopedFloor.short || scopedFloor.code}
                  </span>
                )}
              </div>
              <select
                id="an-floor"
                className="select"
                value={floorCode}
                disabled={isHostelBlock}
                onChange={(e) => {
                  setFloorCode(e.target.value);
                  setSensorId('all');
                  if (e.target.value !== 'all') {
                    setSearchParams({ block: blockCode, floor: e.target.value });
                  } else {
                    setSearchParams({ block: blockCode });
                  }
                }}
              >
                {isHostelBlock ? (
                  <option value="all">Direct Mains (No Floor Slabs)</option>
                ) : (
                  <>
                    <option value="all">All floors ({displayFloors.length} total)</option>
                    {displayFloors.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.name} {f.status === 'attention' ? '⚠️ Attention' : ''}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="field">
              <div className="an__field-label-row">
                <label className="field__label" htmlFor="an-sensor">
                  Sensor
                </label>
                <span className="an__type-tag num">
                  {sensorOptions.length} total
                </span>
              </div>
              <select
                id="an-sensor"
                className="select"
                value={sensorId}
                onChange={(e) => setSensorId(e.target.value)}
              >
                <option value="all">All sensors ({sensorOptions.length} total)</option>
                {sensorOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.type} ({s.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="an__range">
            <span className="field__label">Time period</span>
            <Segmented
              size="sm"
              ariaLabel="Time period"
              value={range}
              onChange={setRange}
              options={RANGE_OPTS}
            />
          </div>
        </div>
      </section>

      {/* ---------------- summary ---------------- */}
      <section className="an__summary" aria-label="Period summary">
        <div>
          <span className="eyebrow">Scope</span>
          <p className="an__summary-val">{scopeLabel}</p>
        </div>
        <div>
          <span className="eyebrow">Total energy</span>
          <p className="an__summary-val num">{formatNumber(totals.sum, 0)} kWh</p>
        </div>
        <div>
          <span className="eyebrow">Average</span>
          <p className="an__summary-val num">{formatNumber(totals.avg)} kWh</p>
        </div>
        <div>
          <span className="eyebrow">Peak</span>
          <p className="an__summary-val num">{formatNumber(totals.peak)} kWh</p>
        </div>
        <div>
          <span className="eyebrow">Minimum</span>
          <p className="an__summary-val num">{formatNumber(totals.low)} kWh</p>
        </div>
      </section>

      {/* ---------------- trends ---------------- */}
      <div className="grid-2">
        <section className="chart-panel">
          <header className="chart-panel__head">
            <div className="min0">
              <p className="chart-panel__title">Energy trend</p>
              <p className="chart-panel__sub">kWh · {scopeLabel}</p>
            </div>
          </header>
          <AnalyticsChart
            type="area"
            data={energy}
            unit="kWh"
            band
            showLegend
            ariaLabel="Energy trend with expected envelope"
            series={[
              { key: 'expected', name: 'Expected', color: c.blue, dashed: true, noFill: true, strokeWidth: 1.4 },
              { key: 'value', name: 'Energy', color: c.accent, strokeWidth: 2.2 },
            ]}
          />
        </section>

        <section className="chart-panel">
          <header className="chart-panel__head">
            <div className="min0">
              <p className="chart-panel__title">Water trend</p>
              <p className="chart-panel__sub">Litres · {scopeLabel}</p>
            </div>
          </header>
          <AnalyticsChart
            type="area"
            data={water}
            unit="L"
            ariaLabel="Water consumption trend"
            series={[{ key: 'value', name: 'Water', color: c.blue }]}
          />
        </section>

        <section className="chart-panel">
          <header className="chart-panel__head">
            <div className="min0">
              <p className="chart-panel__title">Temperature trend</p>
              <p className="chart-panel__sub">°C · comfort band 24–27 °C</p>
            </div>
          </header>
          <AnalyticsChart
            type="line"
            data={temperature}
            unit="°C"
            referenceLine={27}
            ariaLabel="Temperature trend against comfort threshold"
            series={[{ key: 'value', name: 'Temperature', color: c.accent, strokeWidth: 2 }]}
          />
        </section>

        <section className="chart-panel">
          <header className="chart-panel__head">
            <div className="min0">
              <p className="chart-panel__title">
                {isHostelBlock ? 'Residential cohort comparison' : 'Utility comparison'}
              </p>
              <p className="chart-panel__sub">
                {isHostelBlock
                  ? `${block?.name || 'Residence'} vs peer ${block?.subCategory === 'boys' ? 'Boys' : 'Girls'} residences (kWh)`
                  : `Energy by floor · ${block?.name || 'All Blocks'} (${displayFloors?.length || 0} floors)`}
              </p>
            </div>
          </header>
          <AnalyticsChart
            type="bar"
            data={comparison}
            unit="kWh"
            showLegend
            ariaLabel={isHostelBlock ? 'Energy comparison across residences' : 'Energy comparison across floors'}
            series={comparisonSeries}
          />
        </section>
      </div>

      {/* ---------------- analytics → AI ---------------- */}
      <DeviationPanel
        title={`Energy · ${block?.name || 'Estate'} ${scopedFloor ? scopedFloor.name : isHostelBlock ? 'Direct Mains' : 'All Floors'}`}
        subtitle="How the AI conclusion follows from the historical record"
        data={energy}
        unit="kWh"
        current={formatNumber(energy[energy.length - 1]?.value ?? 0)}
        expected={`${energy[energy.length - 1]?.low ?? 0}–${energy[energy.length - 1]?.high ?? 0}`}
        deviation={`${(
          (((energy[energy.length - 1]?.value ?? 1) - (energy[energy.length - 1]?.expected ?? 1)) /
            (energy[energy.length - 1]?.expected || 1)) *
          100
        ).toFixed(1)}%`}
      />

      {/* ---------------- utility mix + table ---------------- */}
      <div className="grid-split">
        <section className="chart-panel">
          <header className="chart-panel__head">
            <div className="min0">
              <p className="chart-panel__title">
                {isHostelBlock ? 'Facility utility mix' : 'Utility mix by floor'}
              </p>
              <p className="chart-panel__sub">
                {isHostelBlock
                  ? `${block?.name || 'Facility'} direct telemetry · Energy, water and connected load`
                  : `Energy, water and connected load across ${displayFloors?.length || 0} floors`}
              </p>
            </div>
          </header>
          <AnalyticsChart
            type="bar"
            data={mix}
            showLegend
            ariaLabel="Utility mix across floors"
            series={[
              { key: 'energy', name: 'Energy (kWh)', color: c.accent },
              { key: 'water', name: 'Water (L)', color: c.blue },
              { key: 'load', name: 'Load (kW)', color: c.ok },
            ]}
          />
        </section>

        <section className="an__table-panel">
          <header className="chart-panel__head">
            <div className="min0">
              <p className="chart-panel__title">
                <ChartSpline size={14} aria-hidden="true" /> Historical values
              </p>
              <p className="chart-panel__sub">Most recent 8 intervals</p>
            </div>
          </header>
          <div className="an__table-wrap">
            <table className="an__table">
              <caption className="sr-only">
                Recent energy readings with expected range and deviation
              </caption>
              <thead>
                <tr>
                  <th scope="col">Interval</th>
                  <th scope="col">Observed</th>
                  <th scope="col">Expected</th>
                  <th scope="col">Deviation</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => {
                  const dev = ((row.value - row.expected) / row.expected) * 100;
                  const tone = Math.abs(dev) > 14 ? 'crit' : Math.abs(dev) > 7 ? 'warn' : 'ok';
                  return (
                    <tr key={row.label}>
                      <td className="num">{row.label}</td>
                      <td className="num">{row.value}</td>
                      <td className="num an__dim">
                        {row.low}–{row.high}
                      </td>
                      <td className={`num an__dev tone-${tone}`}>
                        {dev > 0 ? '+' : ''}
                        {dev.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
