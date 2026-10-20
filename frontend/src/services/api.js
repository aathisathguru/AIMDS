/* ==========================================================================
   AIMDS · API service layer
   --------------------------------------------------------------------------
   Single boundary between the UI and the backend. Components never call
   fetch() directly — they call these functions. Live mode is the default;
   failed requests are surfaced rather than replaced with fixture readings.

   FastAPI contract assumed:
     GET  /api/system/overview
     GET  /api/blocks
     POST /api/blocks
     GET  /api/blocks/{code}
     GET  /api/blocks/{code}/floors/{floorCode}
     GET  /api/sensors?block=&floor=&type=
     GET  /api/readings?sensor=&range=
     GET  /api/alerts?severity=
     PATCH/api/alerts/{id}
     GET  /api/ai/insights
     GET  /api/reports
     POST /api/reports/export
   ========================================================================== */

import {
  blocks as mockBlocks,
  alerts as mockAlerts,
  aiInsights as mockInsights,
  systemOverview as mockOverview,
  reportHistory as mockReports,
  getSeries,
  getComparisonSeries,
  getUtilityMix,
  createBlock,
  findBlock,
  findFloor,
  allSensors,
} from '../data/mockData.js';

export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api';
// Mock mode is opt-in only; live mode must expose API failures instead of
// silently rendering fabricated sensor values.
export const USE_MOCK = import.meta.env?.VITE_USE_MOCK === 'true';

const LATENCY = 260;

function delay(payload, ms = LATENCY) {
  return new Promise((resolve) => setTimeout(() => resolve(payload), ms));
}

/** Thin fetch wrapper used once the FastAPI backend is wired in. */
export async function request(path, options = {}) {
  const { method = 'GET', body, signal, headers } = options;
  let token = '';
  try {
    const stored = JSON.parse(window.localStorage.getItem('aimds.session') || 'null');
    token = stored?.token || '';
  } catch {
    token = '';
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (
      res.status === 401 &&
      !path.startsWith('/auth/login') &&
      !path.startsWith('/auth/signup') &&
      !path.startsWith('/auth/google')
    ) {
      try {
        window.localStorage.removeItem('aimds.session');
      } catch {
        /* storage may be unavailable */
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('aimds:unauthorized', { detail: { path, status: 401 } }));
      }
    }
    const detail = await res.text().catch(() => '');
    let parsedDetail = detail;
    try {
      const parsed = JSON.parse(detail);
      parsedDetail = parsed.detail ?? parsed;
    } catch {
      /* Preserve plain-text gateway/server errors. */
    }
    const message = typeof parsedDetail === 'string' ? parsedDetail : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, parsedDetail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export class ApiError extends Error {
  constructor(message, status = 0, detail = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export async function safeRequest(remoteCall, fallbackFn) {
  if (USE_MOCK) return fallbackFn();
  return remoteCall();
}

/* ---------------------------------------------------------------- system -- */

export const systemService = {
  getOverview: () => safeRequest(() => request('/system/overview'), () => delay(mockOverview)),
  getHealth: () =>
    safeRequest(
      () => request('/system/health'),
      () => delay({ api: 'operational', database: 'operational', ai: 'operational' }),
    ),
};

/* ---------------------------------------------------------------- blocks -- */

export const blockService = {
  list: () => safeRequest(() => request('/blocks'), () => delay(mockBlocks)),
  get: (code) =>
    safeRequest(() => request(`/blocks/${code}`), () => delay(findBlock(mockBlocks, code))),
  getFloor: (code, floorCode) =>
    safeRequest(
      () => request(`/blocks/${code}/floors/${floorCode}`),
      () => delay(findFloor(findBlock(mockBlocks, code), floorCode)),
    ),
  create: (payload) =>
    safeRequest(
      () => request('/blocks', { method: 'POST', body: payload }),
      () => delay(createBlock(payload), 420),
    ),
};

/* --------------------------------------------------------------- sensors -- */

export const sensorService = {
  list: (filters = {}) => {
    const fallback = () => {
      let rows = allSensors(mockBlocks);
      if (filters.block && filters.block !== 'all') {
        rows = rows.filter((s) => s.blockCode === filters.block);
      }
      if (filters.floor && filters.floor !== 'all') {
        rows = rows.filter((s) => s.floorCode === filters.floor);
      }
      if (filters.type && filters.type !== 'all') {
        rows = rows.filter((s) => s.key === filters.type);
      }
      if (filters.status && filters.status !== 'all') {
        rows = rows.filter((s) => s.status === filters.status);
      }
      return delay(rows);
    };

    if (USE_MOCK) return fallback();
    const q = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v && v !== 'all'),
    ).toString();
    return safeRequest(() => request(`/sensors${q ? `?${q}` : ''}`), fallback);
  },
};

/* -------------------------------------------------------------- readings -- */

export const readingService = {
  series: ({ seed, range, base, variance, anomalyAt, anomalyFactor }) => {
    const fallback = () =>
      delay(getSeries({ seed, range, base, variance, anomalyAt, anomalyFactor }), 120);
    if (USE_MOCK) return fallback();
    // The server owns the curve; `base` is forwarded so a scoped selection
    // (block/floor/sensor) charts against the right magnitude.
    const q = new URLSearchParams({ sensor: seed, range });
    if (base !== undefined && base !== null) q.set('base', String(base));
    return safeRequest(() => request(`/readings?${q.toString()}`), fallback);
  },
  comparison: (range, block) => {
    const q = new URLSearchParams({ range });
    if (block) q.set('block', block);
    return safeRequest(
      () => request(`/readings/comparison?${q.toString()}`),
      () => delay(getComparisonSeries(range, block), 120),
    );
  },
  mix: (block) => {
    const q = block ? `?block=${encodeURIComponent(block)}` : '';
    return safeRequest(
      () => request(`/readings/mix${q}`),
      () => delay(getUtilityMix(block), 120),
    );
  },
};

/* ---------------------------------------------------------------- alerts -- */

export const alertService = {
  list: (severity = 'all') =>
    safeRequest(
      () => request(`/alerts${severity !== 'all' ? `?severity=${severity}` : ''}`),
      () =>
        delay(severity === 'all' ? mockAlerts : mockAlerts.filter((a) => a.severity === severity)),
    ),
  acknowledge: (id) =>
    safeRequest(
      () => request(`/alerts/${id}`, { method: 'PATCH', body: { acknowledged: true } }),
      () => delay({ id, acknowledged: true }, 200),
    ),
  resolve: (id) =>
    safeRequest(
      () => request(`/alerts/${id}`, { method: 'PATCH', body: { severity: 'resolved' } }),
      () => delay({ id, severity: 'resolved' }, 200),
    ),
};

/* -------------------------------------------------------------------- ai -- */

export const aiService = {
  insights: () =>
    safeRequest(
      () => request('/ai/insights'),
      () => delay(mockInsights),
    ),
  insight: (id) =>
    safeRequest(
      () => request(`/ai/insights/${id}`),
      () => delay(mockInsights.find((i) => i.id === id) ?? null),
    ),
};

/* --------------------------------------------------------------- reports -- */

export const reportService = {
  history: () =>
    safeRequest(
      () => request('/reports'),
      () => delay(mockReports),
    ),
  export: (payload) =>
    safeRequest(
      () => request('/reports/export', { method: 'POST', body: payload }),
      () => delay({ queued: true, ...payload }, 600),
    ),
};

/* ---------------------------------------------------------- notifications -- */
export const notificationService = {
  settings: () => request('/notifications/settings'),
  updateSettings: (payload) => request('/notifications/settings', { method: 'PATCH', body: payload }),
  history: (limit = 50) => request(`/notifications/history?limit=${limit}`),
  testSms: (message) => request('/notifications/test-sms', { method: 'POST', body: { message } }),
};

/* ------------------------------------------------------------ telemetry -- */

export const telemetryService = {
  latest: (deviceId) => {
    if (USE_MOCK) return Promise.resolve(null);
    const query = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : '';
    return request(`/telemetry/latest${query}`);
  },
  history: (deviceId, limit = 60) => {
    if (USE_MOCK) return Promise.resolve([]);
    const params = new URLSearchParams({ limit: String(limit) });
    if (deviceId) params.set('deviceId', deviceId);
    return request(`/telemetry/history?${params.toString()}`);
  },
  status: (deviceId) => {
    const query = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : '';
    return request(`/telemetry/status${query}`);
  },
};

/* ------------------------------------------------------------------ auth -- */

export const authService = {
  login: async ({ identifier, password }) => {
    const isAathi = (identifier || '').toLowerCase() === 'aathi@gmail.com';
    const fallbackUser = {
      name: isAathi ? 'Aathi' : 'Operations Lead',
      email: identifier || 'aathi@gmail.com',
      role: 'System Administrator',
      initials: isAathi ? 'AA' : 'OL',
    };

    if (USE_MOCK) {
      return delay(
        {
          token: 'mock-jwt-token',
          user: fallbackUser,
        },
        500,
      );
    }

    try {
      return await request('/auth/login', { method: 'POST', body: { identifier, password } });
    } catch (err) {
      console.warn('FastAPI backend login failed:', err);
      throw err;
    }
  },
  googleLogin: async ({ credential, email, name, picture }) => {
    const isAathi = (email || '').toLowerCase() === 'aathi@gmail.com';
    const fallbackUser = {
      name: name || (isAathi ? 'Aathi' : 'Google Operator'),
      email: email || (isAathi ? 'aathi@gmail.com' : 'operator.google@aimds.io'),
      role: isAathi ? 'System Administrator' : 'Operations Engineer',
      initials: (name || (isAathi ? 'Aathi' : 'Google Operator'))
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      picture: picture || null,
    };

    if (USE_MOCK) {
      return delay(
        {
          token: 'mock-google-token',
          user: fallbackUser,
        },
        400,
      );
    }

    try {
      return await request('/auth/google', {
        method: 'POST',
        body: { credential, email, name, picture },
      });
    } catch (err) {
      console.warn('Backend Google auth failed:', err);
      throw err;
    }
  },
  signup: async ({ name, email, password, role }) => {
    const fallbackUser = {
      name: name || 'Operator',
      email: email || 'operator@aimds.io',
      role: role || 'Operations Engineer',
      initials: (name || 'Operator')
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      picture: null,
    };

    if (USE_MOCK) {
      return delay(
        {
          token: 'mock-signup-token',
          user: fallbackUser,
        },
        500,
      );
    }

    try {
      return await request('/auth/signup', {
        method: 'POST',
        body: { name, email, password, role },
      });
    } catch (err) {
      console.warn('FastAPI backend signup failed:', err);
      throw err;
    }
  },
  getUsers: () => safeRequest(() => request('/auth/users'), () => delay([])),
  logout: () => (USE_MOCK ? delay({ ok: true }, 120) : request('/auth/logout', { method: 'POST' }).catch(() => ({ ok: true }))),
};

export default {
  systemService,
  blockService,
  sensorService,
  readingService,
  alertService,
  aiService,
  reportService,
  notificationService,
  telemetryService,
  authService,
};
