import { useEffect, useState } from 'react';
import {
  Bell,
  Database,
  Gauge,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Server,
  Smartphone,
  Sun,
  User,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Logo from '../components/ui/Logo.jsx';
import StatusIndicator from '../components/ui/StatusIndicator.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { API_BASE_URL, notificationService, USE_MOCK } from '../services/api.js';
import './Settings.css';

function Toggle({ id, label, desc, checked, onChange }) {
  return (
    <div className="set__toggle">
      <div className="min0">
        <label htmlFor={id} className="set__toggle-label">
          {label}
        </label>
        <p className="set__toggle-desc">{desc}</p>
      </div>
      <button
        type="button"
        id={id}
        className="switch"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

const THEME_OPTS = [
  { id: 'dark', label: 'Dark', icon: Moon, desc: 'Command-centre default' },
  { id: 'light', label: 'Light', icon: Sun, desc: 'Daylight legibility' },
  { id: 'system', label: 'System', icon: Monitor, desc: 'Follow device setting' },
];

export default function Settings() {
  const { preference, setPreference, theme } = useTheme();
  const { user, logout } = useAuth();
  const { overview, stats } = useData();
  const { push } = useToast();

  const [notif, setNotif] = useState({
    critical: true,
    warning: true,
    info: false,
    digest: true,
    sound: false,
  });
  const [prefs, setPrefs] = useState({
    refresh: '30',
    unitSystem: 'metric',
    energyThreshold: '500',
    tempThreshold: '27',
    autoAck: false,
  });
  const [sms, setSms] = useState({
    mobile_number: '',
    sms_enabled: false,
    sms_critical: true,
    sms_warning: true,
    sms_info: false,
    cooldown_seconds: 900,
  });
  const [smsHistory, setSmsHistory] = useState([]);
  const [smsLoading, setSmsLoading] = useState(!USE_MOCK);
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsTesting, setSmsTesting] = useState(false);

  useEffect(() => {
    if (USE_MOCK) return undefined;
    let alive = true;
    Promise.all([notificationService.settings(), notificationService.history(20)])
      .then(([settings, history]) => {
        if (!alive) return;
        setSms((current) => ({ ...current, ...settings, mobile_number: settings.mobile_number || '' }));
        setSmsHistory(history || []);
      })
      .catch((error) => {
        if (alive) push({ tone: 'warning', title: 'SMS settings unavailable', message: error.message || 'Could not load notification settings.' });
      })
      .finally(() => alive && setSmsLoading(false));
    return () => { alive = false; };
  }, [push]);

  const save = async () => {
    if (USE_MOCK) {
      push({ tone: 'warning', title: 'Live backend required', message: 'SMS settings are not saved in mock mode.' });
      return;
    }
    setSmsSaving(true);
    try {
      const saved = await notificationService.updateSettings(sms);
      setSms((current) => ({ ...current, ...saved, mobile_number: saved.mobile_number || '' }));
      push({ tone: 'success', title: 'Preferences saved', message: 'SMS routing and monitoring preferences were saved to the backend.' });
    } catch (error) {
      push({ tone: 'warning', title: 'Save failed', message: error.message || 'Could not save SMS settings.' });
    } finally {
      setSmsSaving(false);
    }
  };

  const sendTestSms = async () => {
    if (USE_MOCK) {
      push({ tone: 'warning', title: 'Live backend required', message: 'A real SMS cannot be sent in mock mode.' });
      return;
    }
    setSmsTesting(true);
    try {
      const result = await notificationService.testSms('AIMDS SMS gateway test from the Settings page.');
      setSmsHistory((history) => [result, ...history].slice(0, 20));
      push({ tone: 'success', title: 'SMS submitted', message: `Gateway accepted the message with ID ${result.provider_message_id}.` });
    } catch (error) {
      const detail = error?.detail?.message || error?.message || 'The SMS gateway did not accept the message.';
      push({ tone: 'warning', title: 'SMS not sent', message: detail });
    } finally {
      setSmsTesting(false);
    }
  };

  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        subtitle="Profile, appearance, notification routing, monitoring thresholds and backend connection."
        meta={
          <div className="set__brand-meta">
            <Logo size="xs" />
            <span className="eyebrow eyebrow-accent">AIMDS Node Identity & Governance</span>
          </div>
        }
        actions={
          <button type="button" className="btn btn--primary" onClick={save} disabled={smsSaving}>
            {smsSaving ? 'Saving…' : 'Save changes'}
          </button>
        }
      />

      <div className="grid-2">
        {/* ---------------- profile ---------------- */}
        <section className="set__card">
          <header className="set__head">
            <span className="set__head-icon" aria-hidden="true">
              <User size={15} />
            </span>
            <div className="min0">
              <h2 className="set__title">Profile</h2>
              <p className="set__sub">Identity used across the console</p>
            </div>
          </header>

          <div className="set__profile">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user?.name || 'Profile'}
                className="set__avatar-img"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="set__avatar" aria-hidden="true">
                {user?.initials ?? 'OL'}
              </span>
            )}
            <div className="min0">
              <p className="set__profile-name">{user?.name}</p>
              <p className="set__profile-mail num">{user?.email}</p>
            </div>
          </div>

          <div className="set__fields">
            <div className="field">
              <label className="field__label" htmlFor="set-name">
                Display name
              </label>
              <input id="set-name" className="input" defaultValue={user?.name} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="set-mail">
                Email
              </label>
              <input id="set-mail" className="input" type="email" defaultValue={user?.email} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="set-role">
                Role
              </label>
              <select id="set-role" className="select" defaultValue={user?.role}>
                <option>System Administrator</option>
                <option>Operations Lead</option>
                <option>Facilities Engineer</option>
                <option>Viewer</option>
              </select>
            </div>
          </div>

          <button type="button" className="btn btn--ghost set__logout" onClick={logout}>
            <LogOut size={15} aria-hidden="true" />
            Sign out
          </button>
        </section>

        {/* ---------------- theme ---------------- */}
        <section className="set__card">
          <header className="set__head">
            <span className="set__head-icon" aria-hidden="true">
              <Palette size={15} />
            </span>
            <div className="min0">
              <h2 className="set__title">Theme</h2>
              <p className="set__sub">Remembered on this device · currently {theme}</p>
            </div>
          </header>

          <div className="set__themes" role="radiogroup" aria-label="Theme preference">
            {THEME_OPTS.map((opt) => {
              const Icon = opt.icon;
              const active = preference === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`set__theme ${active ? 'is-active' : ''}`}
                  onClick={() => setPreference(opt.id)}
                >
                  <span className={`set__theme-swatch is-${opt.id}`} aria-hidden="true">
                    <Icon size={14} />
                  </span>
                  <span className="set__theme-label">{opt.label}</span>
                  <span className="set__theme-desc">{opt.desc}</span>
                </button>
              );
            })}
          </div>

          <div className="set__palette">
            <span className="eyebrow">AIMDS operating palette</span>
            <ul>
              <li>
                <span style={{ background: '#0D1117' }} aria-hidden="true" />
                <span className="num">0D1117</span>
              </li>
              <li>
                <span style={{ background: '#73D6BB' }} aria-hidden="true" />
                <span className="num">73D6BB</span>
              </li>
              <li>
                <span style={{ background: '#7DA4F7' }} aria-hidden="true" />
                <span className="num">7DA4F7</span>
              </li>
              <li>
                <span style={{ background: '#EDF3F7' }} aria-hidden="true" />
                <span className="num">EDF3F7</span>
              </li>
            </ul>
          </div>
        </section>

        {/* ---------------- notifications ---------------- */}
        <section className="set__card">
          <header className="set__head">
            <span className="set__head-icon" aria-hidden="true">
              <Bell size={15} />
            </span>
            <div className="min0">
              <h2 className="set__title">Notifications</h2>
              <p className="set__sub">Which events reach you, and how</p>
            </div>
          </header>

          <div className="set__toggles">
            <Toggle
              id="n-crit"
              label="Critical alerts"
              desc="Immediate push for critical deviations"
              checked={notif.critical}
              onChange={(v) => setNotif((n) => ({ ...n, critical: v }))}
            />
            <Toggle
              id="n-warn"
              label="Warning alerts"
              desc="Deviations outside the expected envelope"
              checked={notif.warning}
              onChange={(v) => setNotif((n) => ({ ...n, warning: v }))}
            />
            <Toggle
              id="n-info"
              label="Informational events"
              desc="Firmware, calibration and housekeeping notices"
              checked={notif.info}
              onChange={(v) => setNotif((n) => ({ ...n, info: v }))}
            />
            <Toggle
              id="n-digest"
              label="Daily AI digest"
              desc="Morning summary of findings and recommendations"
              checked={notif.digest}
              onChange={(v) => setNotif((n) => ({ ...n, digest: v }))}
            />
            <Toggle
              id="n-sound"
              label="Sound on critical"
              desc="Audible cue when a critical alert is raised"
              checked={notif.sound}
              onChange={(v) => setNotif((n) => ({ ...n, sound: v }))}
            />
          </div>
        </section>

        {/* ---------------- SMS routing ---------------- */}
        <section className="set__card set__sms-card">
          <header className="set__head">
            <span className="set__head-icon" aria-hidden="true">
              <Smartphone size={15} />
            </span>
            <div className="min0">
              <h2 className="set__title">Mobile SMS alerts</h2>
              <p className="set__sub">Real gateway delivery for configured alert events</p>
            </div>
            <StatusIndicator status={sms.sms_enabled ? 'normal' : 'standby'} />
          </header>

          <div className="set__fields">
            <div className="field">
              <label className="field__label" htmlFor="sms-mobile">Mobile number</label>
              <input
                id="sms-mobile"
                className="input num"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+14155552671"
                value={sms.mobile_number}
                onChange={(e) => setSms((current) => ({ ...current, mobile_number: e.target.value }))}
                aria-describedby="sms-mobile-help"
              />
              <p id="sms-mobile-help" className="field__hint">Use international E.164 format, for example +14155552671.</p>
            </div>
            <Toggle
              id="sms-enabled"
              label="Enable SMS delivery"
              desc="Send configured threshold alerts to this number"
              checked={sms.sms_enabled}
              onChange={(v) => setSms((current) => ({ ...current, sms_enabled: v }))}
            />
            <Toggle
              id="sms-critical"
              label="Critical alerts"
              desc="Send immediately when a critical threshold is detected"
              checked={sms.sms_critical}
              onChange={(v) => setSms((current) => ({ ...current, sms_critical: v }))}
            />
            <Toggle
              id="sms-warning"
              label="Warning alerts"
              desc="Send threshold warnings outside the expected envelope"
              checked={sms.sms_warning}
              onChange={(v) => setSms((current) => ({ ...current, sms_warning: v }))}
            />
            <div className="field">
              <label className="field__label" htmlFor="sms-cooldown">Duplicate cooldown</label>
              <select
                id="sms-cooldown"
                className="select"
                value={sms.cooldown_seconds}
                onChange={(e) => setSms((current) => ({ ...current, cooldown_seconds: Number(e.target.value) }))}
              >
                <option value={300}>5 minutes</option>
                <option value={900}>15 minutes</option>
                <option value={1800}>30 minutes</option>
                <option value={3600}>1 hour</option>
                <option value={86400}>24 hours</option>
              </select>
            </div>
            <div className="set__sms-actions">
              <button type="button" className="btn btn--ghost btn--sm" onClick={sendTestSms} disabled={smsTesting || smsLoading || !sms.mobile_number}>
                {smsTesting ? 'Contacting gateway…' : 'Send test SMS'}
              </button>
              <span className="field__hint">Success is shown only after Twilio accepts the message.</span>
            </div>
          </div>

          <div className="set__sms-history" aria-live="polite">
            <div className="set__sms-history-head">
              <span className="eyebrow"><Bell size={11} aria-hidden="true" /> Recent SMS delivery history</span>
              {smsLoading && <span className="field__hint">Loading…</span>}
            </div>
            {!smsLoading && smsHistory.length === 0 && <p className="field__hint">No SMS attempts recorded.</p>}
            {smsHistory.slice(0, 5).map((item) => (
              <div className="set__sms-row" key={item.id}>
                <span className={`set__sms-status set__sms-status--${item.status}`}>{item.status}</span>
                <span className="min0">{item.alert_type || item.alert_id}</span>
                <span className="num">{item.occurred_at ? new Date(item.occurred_at).toLocaleString() : '—'}</span>
                {item.error_message && <span className="set__sms-error">{item.error_message}</span>}
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- monitoring ---------------- */}
        <section className="set__card">
          <header className="set__head">
            <span className="set__head-icon" aria-hidden="true">
              <Gauge size={15} />
            </span>
            <div className="min0">
              <h2 className="set__title">Monitoring preferences</h2>
              <p className="set__sub">Cadence, units and alert thresholds</p>
            </div>
          </header>

          <div className="set__fields">
            <div className="field">
              <label className="field__label" htmlFor="set-refresh">
                Refresh interval
              </label>
              <select
                id="set-refresh"
                className="select"
                value={prefs.refresh}
                onChange={(e) => setPrefs((p) => ({ ...p, refresh: e.target.value }))}
              >
                <option value="10">Every 10 seconds</option>
                <option value="30">Every 30 seconds</option>
                <option value="60">Every minute</option>
                <option value="300">Every 5 minutes</option>
              </select>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="set-units">
                Unit system
              </label>
              <select
                id="set-units"
                className="select"
                value={prefs.unitSystem}
                onChange={(e) => setPrefs((p) => ({ ...p, unitSystem: e.target.value }))}
              >
                <option value="metric">Metric (kWh, L, °C)</option>
                <option value="imperial">Imperial (kWh, gal, °F)</option>
              </select>
            </div>

            <div className="set__pair">
              <div className="field">
                <label className="field__label" htmlFor="set-energy">
                  Energy threshold (kWh)
                </label>
                <input
                  id="set-energy"
                  className="input num"
                  type="number"
                  value={prefs.energyThreshold}
                  onChange={(e) => setPrefs((p) => ({ ...p, energyThreshold: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="set-temp">
                  Temperature threshold (°C)
                </label>
                <input
                  id="set-temp"
                  className="input num"
                  type="number"
                  value={prefs.tempThreshold}
                  onChange={(e) => setPrefs((p) => ({ ...p, tempThreshold: e.target.value }))}
                />
              </div>
            </div>

            <Toggle
              id="m-auto"
              label="Auto-acknowledge informational events"
              desc="Keeps the alert centre focused on actionable items"
              checked={prefs.autoAck}
              onChange={(v) => setPrefs((p) => ({ ...p, autoAck: v }))}
            />
          </div>
        </section>
      </div>

      {/* ---------------- system ---------------- */}
      <section className="set__card">
        <header className="set__head">
          <span className="set__head-icon" aria-hidden="true">
            <Server size={15} />
          </span>
          <div className="min0">
            <h2 className="set__title">System</h2>
            <p className="set__sub">Backend connection and environment</p>
          </div>
          <StatusIndicator status={overview?.status || 'standby'} />
        </header>

        <div className="set__sysbrand">
          <Logo size="md" />
          <div className="min0">
            <p className="set__sysbrand-title">AIMDS Official Enterprise Telemetry Node</p>
            <p className="set__sysbrand-sub num">Identity: AIMDS-NODE-01 · SCADA Protocol v2.6 · Since 2026</p>
          </div>
        </div>

        <div className="set__fields">
          <div className="field">
            <label className="field__label" htmlFor="set-api">
              FastAPI base URL
            </label>
            <input id="set-api" className="input num" defaultValue={API_BASE_URL} />
            <p className="field__hint">
              Consumed by <code>src/services/api.js</code>. All UI data flows through that layer.
            </p>
          </div>
        </div>

        <dl className="set__sysgrid">
          <div>
            <dt>
              <Database size={11} aria-hidden="true" /> Environment
            </dt>
            <dd>{overview?.environment || 'Loading…'}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd className="num">v{overview?.version || '—'}</dd>
          </div>
          <div>
            <dt>Uptime</dt>
            <dd className="num">{overview?.uptime || '—'}</dd>
          </div>
          <div>
            <dt>Latency</dt>
            <dd className="num">{overview?.latencyMs ?? '—'} ms</dd>
          </div>
          <div>
            <dt>Blocks</dt>
            <dd className="num">{stats.blockCount}</dd>
          </div>
          <div>
            <dt>Sensors</dt>
            <dd className="num">{stats.sensorCount}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
