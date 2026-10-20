# AIMDS project analysis

**Archive analysed:** `aimds_velxio_live_only.zip`  
**Analysis date:** 2026-10-15  
**Scope:** all archived source/configuration/assets relevant to runtime behavior, plus build and backend smoke validation.

## 1. What this project is

AIMDS is an **AI-Based Multi-Utility Monitoring and Decision Support System** for a building/campus estate. It is an operations console intended to monitor:

- electricity: voltage, current, power, energy and cost;
- environment: temperature and humidity;
- estate hierarchy: blocks, floors and sensors;
- live device status and telemetry history;
- alerts, structured insights, reports and recommendations.

The current implementation is a **full-stack telemetry dashboard**, not a trained AI/ML system. Its “AI” behavior is currently represented by deterministic engineering rules and structured insight cards. The backend evaluates thresholds such as undervoltage, overvoltage, high temperature, high power and stale/offline telemetry; it does not call an AI model or perform learned anomaly detection.

The intended live path is:

```text
ESP32 / Velxio simulator
  -> POST /api/telemetry/ingest with X-AIMDS-Device-Token
  -> FastAPI validation and normalization
  -> in-memory rolling history + optional Supabase persistence
  -> threshold-based alerts/insights/reports
  -> authenticated frontend polling of latest/history/status
  -> AIMDS React operations console
```

## 2. Project composition

The archive contains 209 entries (173 regular files after extraction; the remainder are directory entries), approximately 24,000 lines of source/configuration, and three major parts:

| Area | Contents | Role |
|---|---|---|
| `frontend/` | React 19, Vite, React Router, Recharts, Framer Motion, Lucide, plain CSS | Responsive operations console and standalone demo build |
| `backend/` | FastAPI, Pydantic, Uvicorn, Supabase client | Authenticated API, telemetry ingestion, estate model and rule-based operations logic |
| `hardware/velxio/` | `aimds_telemetry.ino` | ESP32/DHT22 publisher for Velxio simulation or hardware |
| `backend/supabase/migrations/` | PostgreSQL/Supabase DDL and RLS policies | Normalized estate/auth tables plus telemetry readings table |
| root files | npm workspace configuration, README, lockfile | Monorepo commands and documentation |

Important bundled assets include a 1.25 MB self-contained `frontend/aimds-standalone.html`, campus background images, logos and favicon files.

## 3. Frontend architecture

### Entry and routing

`frontend/src/main.jsx` selects the router based on the environment:

- `BrowserRouter` for normal HTTP(S) hosting;
- `HashRouter` for `file://` standalone use;
- `MemoryRouter` for opaque/sandboxed frames.

`App.jsx` defines public login/signup routes and a protected layout for the dashboard. Most pages are lazy-loaded for code splitting.

### Screens

The frontend includes routes for:

- dashboard;
- academic/hostel blocks and block details;
- floor monitoring;
- live monitoring;
- sensors;
- analytics;
- alerts;
- AI insights;
- reports;
- settings and mobile “More” navigation.

### Data boundary

`frontend/src/services/api.js` is the single network boundary. Components do not call `fetch` directly. The `VITE_USE_MOCK` switch controls whether services use bundled fixtures or the FastAPI API.

- `VITE_USE_MOCK=true`: local fixtures/simulation, no backend required.
- `VITE_USE_MOCK=false`: HTTP calls to `/api`, normally proxied by Vite to port 8000.

`DataContext` hydrates blocks, alerts, insights and overview. `useLiveStream` polls telemetry latest/history/status at a two-second cadence when live mode is enabled.

### Standalone mode

`frontend/aimds-standalone.html` is a generated, self-contained visual/demo artifact. It is useful for previewing the UI without installing dependencies or running the API. It uses the mock/simulation path and is not a live telemetry deployment.

## 4. Backend architecture

### API surface

The FastAPI application in `backend/app/main.py` mounts these protected resource groups under `/api`:

- `/system`: overview, stats, health and pipeline;
- `/blocks`: list, create, block detail and floor detail;
- `/sensors`: filterable sensor list and sensor detail;
- `/readings`: live series, comparisons and utility mix;
- `/alerts`: list, counts and acknowledge/resolve patch;
- `/ai`: insights and decision flow;
- `/reports`: report history and export queue placeholder;
- `/telemetry`: device ingest, latest, history, status and WebSocket endpoint;
- `/auth`: local login, signup, Google login, current user, user list and logout.

`/healthz` and `/` are public service/meta endpoints.

### Estate data

`services/estate.py` defines a sizeable generated campus estate. It contains academic blocks such as Learning Center, IB, Applied Sciences, Sunflower, Mech, Research Park and Lotus, plus hostel definitions. Academic floors and sensors are provisioned from templates. Sensor-dependent values are intentionally `None`/standby until actual telemetry is mapped.

The Supabase-enabled path hydrates and synchronizes normalized block/floor/sensor tables. Without Supabase, the estate and operational state are in memory for the process lifetime.

### Telemetry

`services/telemetry.py`:

1. validates input through Pydantic;
2. computes power from voltage × current when needed;
3. accumulates energy using `P * dt`;
4. computes cost using a default INR 7.50/kWh tariff;
5. maps known devices to Sunflower/1F;
6. keeps a bounded per-device in-memory history;
7. optionally inserts into Supabase;
8. broadcasts telemetry to connected WebSocket clients.

The bundled sketch publishes temperature/humidity from a DHT22. Voltage/current/power intentionally remain JSON `null` until electrical sensors are wired.

### Operations/“AI” behavior

`services/operations.py` derives alerts and insights from the latest telemetry. Examples:

- voltage below 190 V: warning;
- voltage above 250 V: critical;
- temperature above 35 °C: warning/critical above 45 °C;
- power above 2500 W: warning;
- no stream, stale stream and disconnected stream: status alerts;
- stable 20–30 °C: an efficiency insight.

The decision flow is descriptive and deterministic. There is no model inference, feature store, training pipeline, or external AI provider integration in the archived code.

### Persistence and security model

When Supabase credentials are configured, the server uses the service-role key and Supabase tables with backend-only RLS policies. Browser clients are intended to interact only with FastAPI. Sessions use random bearer tokens; only token hashes are stored in Supabase. Passwords use PBKDF2-SHA256 for newly created users.

Without Supabase, users, sessions, estate mutations, alert state and telemetry history are process-local and disappear on restart.

## 5. Validation performed

| Check | Result |
|---|---|
| Frontend `npm ci --ignore-scripts` | Passed; 79 audited packages, 0 reported vulnerabilities |
| Frontend production build | Passed with a Vite deprecation warning about `advancedChunks` |
| Frontend lint | Passed with 5 non-blocking warnings, 0 errors |
| Python `compileall` | Passed |
| Backend dependency install | Passed in isolated `backend/.venv` |
| Backend root endpoint | Passed |
| Backend `/healthz` | Passed |
| Protected `/api/blocks` without auth | Correctly returned 401 |
| Demo local login | Passed |
| Authenticated `/api/blocks` | Passed; returned 20 estate blocks |
| Telemetry ingest without configured token | Correctly returned 503 |

Lint warnings are mainly modern-array-method/style warnings (`reverse`, `sort`, and object spread in maps), not current build failures.

## 6. Important findings

### High priority

#### H1 — Backend login can return `password_hash`

`backend/app/routers/auth.py` returns raw `user_data` in the login and Google-login `LoginResponse`. `users.upsert_local_user()` retains the database `password_hash` field. The `public_user()` helper exists, but it is not applied to the response in those two paths.

Impact: for a persisted user with a password hash, the API can expose the PBKDF2 hash to the browser. A hash is not the plaintext password, but it is still credential material and should never be returned.

Fix: always return `users.public_user(user_data)` in login/Google-login responses and add an automated assertion that response JSON never contains `password_hash`, `token_hash` or other private fields.

#### H2 — Live frontend login is hardcoded to two demo accounts

`frontend/src/pages/Login.jsx` rejects every identifier/password pair except:

- `aathi@gmail.com` / `abu0923`;
- `ops@aimds.io` / `aimds-demo`.

This happens before the API call. Therefore, although the backend implements signup and persisted user authentication, a newly created user cannot sign in through the normal frontend in live mode. It also makes the UI enforce credentials independently of the backend.

Fix: remove the hardcoded credential gate. Let the backend validate credentials in live mode; retain demo validation only inside the mock mode if a demo-only restriction is desired.

#### H3 — Supabase telemetry insert schema does not match normalized row

`services/telemetry.py` inserts the complete normalized `row`, which includes `energy`, `cost`, `block_code` and `floor_code`. The telemetry migration defines no columns for those four fields. Supabase insertion is wrapped in a broad `except Exception: pass`, so the API can appear to accept readings while persistence silently fails.

Fix one of these approaches:

- add the computed/location columns to `aimds_telemetry_readings` and migrate existing installations; or
- explicitly build a database payload containing only migration columns and put computed/location values into `metadata`; and
- log/metric persistence failures instead of suppressing them silently.

### Medium priority

#### M1 — The configured frontend device ID is not used by Live Monitoring

`frontend/.env.example` defines `VITE_TELEMETRY_DEVICE_ID`, and `Dashboard.jsx` passes it to its live hook, but `LiveMonitoring.jsx` calls `useLiveStream` without a `deviceId`. Live Monitoring therefore requests latest/history/status for any device rather than the configured device. This is harmless with one device but becomes incorrect once multiple devices transmit.

Fix: centralize the configured device ID or pass it into Live Monitoring explicitly.

#### M2 — Google credential fallback accepts unverified JWT payloads

`verify_google_token()` first attempts proper Google verification, but if that fails it parses a three-part JWT locally and trusts the payload email. A caller can construct a JWT-shaped string with an arbitrary email and potentially sign in if the earlier verification paths are unavailable/fail.

Fix: remove the unverified JWT fallback in production. Require successful Google signature/audience/issuer/expiry validation, and fail closed when Google verification dependencies/configuration are unavailable.

#### M3 — Hardware sketch contains an apparent token/configuration error

In `hardware/velxio/aimds_telemetry.ino`:

```cpp
#define AIMDS_DEVICE_TOKEN "https://velxio.dev/aathiboopathymi/s5-mini-project-simulation/"
```

The backend expects `AIMDS_TELEMETRY_INGEST_TOKEN`, which should be a shared random secret. The current value looks like a Velxio project URL, not an ingest token. The Wi-Fi setup also uses an open SSID with no password and the sketch uses plain HTTP.

Fix: replace the token with the exact long random backend token through a safe secret-injection process; configure the real Wi-Fi credentials/transport; use HTTPS or a protected local network where appropriate; rotate the token if this archive has been shared publicly.

### Lower priority / maintainability

#### L1 — Documentation and behavior are slightly inconsistent

Some comments/README sections describe mock mode as the default, while `api.js` currently sets `USE_MOCK` only when `VITE_USE_MOCK === 'true'`, making live mode the code default when the variable is unset. The shipped standalone build is separately generated and behaves as a mock/demo artifact, but fresh Vite runs without `.env.local` may attempt live API calls.

Fix: choose one default and align comments, `.env.example`, README text and code. For a safer local developer experience, defaulting to mock mode unless explicitly set false is usually clearer.

#### L2 — Several API/database failures are swallowed

Telemetry persistence, Supabase reads and some authentication/network operations catch broad exceptions. This keeps the UI alive but can hide data loss or make production diagnosis difficult.

Fix: emit structured server logs, expose a database/persistence health state, and distinguish “no data” from “data source failed”.

#### L3 — Reports and some operational state are placeholders/in-memory

The report export endpoint queues an in-memory record; it does not generate a PDF/CSV file or connect to a task queue. Alert acknowledgement/resolution is also process-local unless the relevant persistence path is implemented. This is acceptable for a prototype but should not be described as durable production reporting without a worker/storage implementation.

#### L4 — No automated test suite is included

The archive has build/lint configuration but no visible unit, integration, API contract or end-to-end test suite. The most important missing tests concern auth response redaction, Google verification fail-closed behavior, telemetry persistence schema, device filtering and restart durability.

## 7. Recommended next steps

1. **Fix auth data exposure** by applying `public_user()` to every auth response and adding tests.
2. **Remove frontend hardcoded login validation** in live mode.
3. **Align telemetry row and Supabase schema**, then stop suppressing persistence errors.
4. **Replace/rotate the sketch token**, configure real secrets safely and decide on HTTPS/network requirements.
5. **Remove unverified Google JWT fallback** and enforce audience/issuer/expiry checks.
6. **Pass the configured device ID into every live view**.
7. **Add a small backend integration test suite** for login, protected routes, telemetry ingest, telemetry persistence payload, alerts and device filtering.
8. **Clarify mock/live defaults** in code and documentation.
9. **Implement durable report export and operational-state persistence** if this is moving beyond a demo/prototype.

## 8. Bottom line

AIMDS is a well-structured prototype/early product for a campus utility monitoring console. The separation between frontend services, FastAPI routers, domain services, Supabase persistence and the Velxio publisher is clear, and the frontend builds successfully. Its strongest working path is the live telemetry ingestion/status experience with deterministic threshold-based decisions.

It should currently be treated as **prototype or pre-production** rather than production-ready. The most material blockers are the auth response redaction issue, the frontend’s hardcoded credential gate, the telemetry/Supabase schema mismatch, the unsafe Google fallback, and the apparent device-token misconfiguration in the hardware sketch.
