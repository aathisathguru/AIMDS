# AIMDS Implementation and Audit Report

Date: 2026-10-15

## Implemented

### SMS alert integration

- Added authenticated `GET/PATCH /api/notifications/settings` for E.164 mobile-number configuration.
- Added `GET /api/notifications/history` with per-user delivery history.
- Added `POST /api/notifications/test-sms` for an explicit gateway test.
- Added server-only Twilio configuration:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `AIMDS_TWILIO_FROM_NUMBER`
  - `AIMDS_SMS_COOLDOWN_SECONDS`
- Added SMS routing in the Settings page with mobile number, enable/disable, severity controls, cooldown selector, test action and recent delivery history.
- Added real Twilio REST submission. A message is recorded as `submitted` only when Twilio returns a successful response containing a provider SID.
- Missing credentials are recorded as `not_configured` and return HTTP 503; no simulated success is produced.
- Gateway failures are recorded as `failed` with the provider/error message.
- Added cooldown and trigger-key deduplication so repeated telemetry for the same alert/severity/location does not send duplicate SMS within the configured cooldown.
- Added shared alert rules so the visible alert feed and telemetry-triggered SMS use the same voltage, temperature and power thresholds.
- Added Supabase migrations for notification settings, SMS history, indexes and backend-only RLS, plus telemetry computed-field columns.

### General dashboard repairs

- Removed the frontend-only hardcoded login credential gate; live authentication now reaches the backend.
- Redacted `password_hash` from password, Google and signup auth responses.
- Wired Analytics export to the backend report export endpoint instead of a toast-only placeholder.
- Passed the configured telemetry device ID into Live Monitoring.
- Fixed analytics range option rendering.
- Fixed Settings and Sidebar crashes while live API data is loading.
- Preserved truthful live-only behavior: pages do not claim fixture measurements are real.

## Verification performed

| Check | Result |
|---|---|
| Frontend production build | Passed (`vite build`) |
| Frontend lint | Passed with 5 existing non-blocking style/performance warnings |
| Python compilation | Passed |
| Notification unit tests | 3 passed |
| Auth response redaction | Passed; no `password_hash` returned |
| Notification settings GET/PATCH | Passed |
| E.164 validation | Passed |
| Missing-gateway test | Passed; HTTP 503 and `not_configured`, not success |
| Injected sender delivery path | Passed; records `submitted` and provider SID |
| Cooldown/deduplication | Passed; repeated trigger produced no second send |
| Desktop browser smoke test | Passed: login, Settings route, SMS card, controls, no unexpected page errors |
| Mobile browser smoke test | Passed: login, Settings route, SMS card, controls, no unexpected page errors |
| Settings persistence | Passed in live backend smoke test; number survived reload |
| Supabase notification route discovery | Passed |

## Required production setup

1. Apply both new SQL migrations in the Supabase project:
   - `backend/supabase/migrations/202610150001_sms_notifications.sql`
   - `backend/supabase/migrations/202610150002_telemetry_fields.sql`
2. Set the four Twilio/server variables in the backend runtime environment. Keep them out of frontend environment files and source control.
3. Use a Twilio number or approved sender permitted for the destination countries.
4. Configure a valid E.164 number in Settings, enable SMS delivery, select severities, and save.
5. Use **Send test SMS**. The UI will report success only after Twilio accepts the request. A Twilio `submitted` response means accepted by the provider, not handset delivery; delivery callbacks/status webhooks are not yet implemented.
6. Send a real threshold telemetry event and confirm its provider SID/status in Settings history and Twilio logs.

## Remaining issues / limitations

- No Twilio credentials were present in this sandbox, so no real SMS was sent and handset delivery could not be verified. The implementation correctly reported this as `not_configured`.
- Supabase credentials were not connected in this sandbox; the API fallback was tested with in-memory persistence. Apply the migrations and validate against the target Supabase project before production use.
- The current delivery status is provider submission status. Twilio delivery callbacks (`delivered`, `undelivered`) are not yet wired.
- The existing frontend lint command still reports five non-blocking warnings in pre-existing code (`sort`/`reverse` and object spread patterns).
- The existing report endpoint queues an export record rather than returning a generated downloadable file; this task connected the button to that backend action but did not redesign the reporting worker/export storage.
- The full application has been statically inventoried and the main live shell/SMS paths were browser-tested. Every individual control on every page was not exhaustively clicked in this run; pages that still depend on target Supabase data should be rechecked after migrations are applied.

## Hybrid AI implementation update

- Added `backend/app/services/hybrid_ai.py` with chronological feature engineering, duplicate removal, missing-value handling, rolling baselines, Isolation Forest anomaly detection, optional XGBoost fault classification, interpretable risk levels, and evaluation metrics.
- XGBoost is trained only when a verified binary fault/anomaly label column is discovered. No label is fabricated when the source does not provide one.
- Added `/api/ai/hybrid/summary`, `/api/ai/hybrid/history`, and controlled `/api/ai/hybrid/retrain` endpoints.
- Added `backend/scripts/train_hybrid.py` for reproducible CSV training and artifact/metadata output.
- Added `202610150003_hybrid_ai.sql` for model-run and prediction audit tables.
- AI Insights now uses the hybrid engine and distinguishes validated fault probability from anomaly-only evidence.
- The live hybrid API was tested with an empty telemetry store and correctly returned `insufficient_data`; it did not produce fabricated anomaly or fault results.
- The requested Kaggle dataset could not be downloaded in this environment because the public Kaggle API returned HTTP 403 and no Kaggle API credentials or connector were configured. Dataset schema, labels, model metrics, and artifacts therefore remain pending authenticated dataset access.
