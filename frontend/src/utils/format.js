export const TONE_BY_STATUS = {
  normal: 'ok',
  operational: 'ok',
  online: 'ok',
  resolved: 'ok',
  active: 'ok',
  attention: 'warn',
  warning: 'warn',
  degraded: 'warn',
  critical: 'crit',
  info: 'info',
  standby: 'info',
  offline: 'idle',
  idle: 'idle',
};

export const toneFor = (status) => TONE_BY_STATUS[status] ?? 'idle';

export const SEVERITY_RANK = { critical: 0, warning: 1, info: 2, resolved: 3 };

export function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const n = Number(value);
  if (Math.abs(n) >= 10000) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return n.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : digits,
    maximumFractionDigits: digits,
  });
}

export function relativeTime(minutes) {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function secondsAgo(seconds) {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  return relativeTime(Math.floor(seconds / 60));
}

export function deltaTone(delta) {
  if (delta > 4) return 'warn';
  if (delta < -4) return 'ok';
  return 'idle';
}

/** Worst floor status inside a block, used for the block-level rollup. */
export function rollupStatus(floors) {
  if (!floors || !floors.length) return 'normal';
  if (floors.some((f) => f.status === 'critical')) return 'critical';
  if (floors.some((f) => f.status === 'attention')) return 'attention';
  if (floors.every((f) => f.status === 'offline')) return 'offline';
  return 'normal';
}

export const SEVERITY_LABEL = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Information',
  resolved: 'Resolved',
};

export const SEVERITY_TONE = {
  critical: 'crit',
  warning: 'warn',
  info: 'info',
  resolved: 'ok',
};
