/*
 * Live-only compatibility surface.
 *
 * The application no longer ships sensor, chart, alert, insight, report, or
 * KPI fixtures. These metadata exports keep existing presentation components
 * import-compatible while all measurements come from FastAPI telemetry.
 */
export const UTILITIES = [
  { id: 'power', label: 'Power', unit: 'kW', tone: 'accent', icon: 'gauge' },
  { id: 'energy', label: 'Energy', unit: 'kWh', tone: 'accent', icon: 'zap' },
  { id: 'voltage', label: 'Voltage', unit: 'V', tone: 'accent', icon: 'zap' },
  { id: 'current', label: 'Current', unit: 'A', tone: 'blue', icon: 'activity' },
  { id: 'water', label: 'Water', unit: 'L', tone: 'blue', icon: 'droplets' },
  { id: 'waterFlow', label: 'Water Flow', unit: 'L/min', tone: 'blue', icon: 'waves' },
  { id: 'cost', label: "Today's Cost", unit: '₹', tone: 'accent', icon: 'circle-dollar-sign' },
  { id: 'temperature', label: 'Temperature', unit: '°C', tone: 'accent', icon: 'thermometer' },
  { id: 'humidity', label: 'Humidity', unit: '%', tone: 'blue', icon: 'waves' },
  { id: 'load', label: 'Power Load', unit: 'kW', tone: 'accent', icon: 'gauge' },
];
export const SENSOR_TYPES = [
  { key: 'energy', type: 'Energy Meter', unit: 'kWh', prefix: 'EM', model: 'EMX-4200' },
  { key: 'water', type: 'Water Flow', unit: 'L', prefix: 'WF', model: 'AQF-118' },
  { key: 'temperature', type: 'Temperature', unit: '°C', prefix: 'TS', model: 'THS-22' },
  { key: 'humidity', type: 'Humidity', unit: '%', prefix: 'HS', model: 'THS-22' },
  { key: 'load', type: 'Power Load', unit: 'kW', prefix: 'PL', model: 'PLM-90' },
];
export const STATUS_META = {
  normal: { label: 'Normal', tone: 'ok' }, operational: { label: 'Operational', tone: 'ok' },
  attention: { label: 'Attention', tone: 'warn' }, critical: { label: 'Critical', tone: 'crit' },
  offline: { label: 'Offline', tone: 'idle' }, standby: { label: 'Standby', tone: 'info' },
};
export const ACADEMIC_BLOCK_DEFS = [];
export const HOSTEL_DEFS = [];
export const blocks = [];
export const academicBlocks = [];
export const hostelBlocks = [];
export const alerts = [];
export const aiInsights = [];
export const reportHistory = [];
export const systemOverview = null;
export const currentUser = { name: 'Operator', email: '', role: 'Operations Engineer', initials: 'OP' };
export const pipelineStages = [
  { id: 'ingest', name: 'Telemetry ingestion', detail: 'Validated readings from the Velxio device' },
  { id: 'features', name: 'Feature engineering', detail: 'Rolling trends, deltas and baseline deviations' },
  { id: 'model', name: 'Hybrid model', detail: 'Isolation Forest and optional validated XGBoost' },
  { id: 'decision', name: 'Risk decision', detail: 'Interpretable low, medium, high or critical assessment' },
];
export const decisionStages = [
  { id: 'sensor', label: 'Sensor data', icon: 'radio', caption: 'Latest validated telemetry values' },
  { id: 'pattern', label: 'Historical pattern', icon: 'activity', caption: 'Chronological baseline and trend comparison' },
  { id: 'anomaly', label: 'Anomaly detection', icon: 'scan', caption: 'Isolation Forest anomaly score' },
  { id: 'severity', label: 'Risk level', icon: 'gauge', caption: 'Evidence-based risk classification' },
  { id: 'cause', label: 'Supporting evidence', icon: 'search', caption: 'Observed deviations and model availability' },
  { id: 'recommendation', label: 'Recommended action', icon: 'target', caption: 'Inspect and validate before maintenance action' },
];
export const RANGES = [
  { id: '24h', label: '24 hours' },
  { id: '7d', label: '7 days' },
  { id: '6w', label: '6 weeks' },
  { id: '6m', label: '6 months' },
];
export function getSeries() { return []; }
export function getSortedFloors(floors = []) { return [...floors]; }
export function getComparisonSeries() { return []; }
export function getUtilityMix() { return []; }
export function findBlock(list, code) { return list.find((block) => block.code === code) ?? null; }
export function findFloor(block, floorCode) { return block?.floors?.find((floor) => floor.code === floorCode) ?? null; }
export function allSensors(list) { return list.flatMap((block) => [...(block.floors || []).flatMap((floor) => floor.sensors || []), ...(block.sensors || [])]); }
export function countByStatus() { return { normal: 0, attention: 0, critical: 0, offline: 0 }; }
export function alertCounts(list = []) { return { total: list.length, open: list.filter((item) => item.severity !== 'resolved').length, critical: 0, warning: 0, info: 0, resolved: 0 }; }
export function generateFloors(blockCode, floorCount) {
  return Array.from({ length: Math.max(0, Number(floorCount) || 0) }, (_, index) => ({
    id: `${blockCode}-${index + 1}F`, code: `${index + 1}F`, name: `${index + 1} Floor`, short: `${index + 1}`,
    blockCode, status: 'standby', utilities: {}, sensors: [],
  })).toReversed();
}
export function createBlock({ name, code, floorCount, location, description, category, subCategory }) {
  const floors = category === 'hostel' ? [] : generateFloors(code, floorCount);
  return { id: code, code, name, category, subCategory, location, description, status: 'standby', floors, sensors: [], sensorCount: 0, totals: { energy: null, water: null, load: null } };
}
