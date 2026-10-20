# AIMDS — Backend

FastAPI service behind the AIMDS operations console.

It serves the estate model (blocks, floors, sensors), time-series readings, the
alert feed, AI insights and report history that the React frontend consumes.

---

## Run it

```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
./\.venv/bin/uvicorn app.main:app --reload --port 8000
```

### Supabase

The API uses Supabase PostgreSQL when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured. Copy `.env.example` to `.env`, set the server-only credentials, and apply `supabase/migrations/202610100001_supabase_schema.sql` through the Supabase SQL editor or the project migration workflow.

The backend persists estate metadata, live telemetry readings, users, alerts, reports, and bearer sessions in Supabase. Sensor-dependent values remain unavailable until validated Velxio telemetry is received; no deterministic sensor fixtures are seeded. Row Level Security is enabled and the service-role key is never sent to the browser.

| URL                            | What it is                          |
| ------------------------------ | ----------------------------------- |
| `http://localhost:8000/docs`    | Swagger UI — try every endpoint     |
| `http://localhost:8000/redoc`   | ReDoc reference                     |
| `http://localhost:8000/openapi.json` | Machine-readable schema        |
| `http://localhost:8000/healthz` | Liveness probe                      |

The frontend's dev server proxies `/api` here, so run both and the console
talks to this service with no CORS round trip. See `../frontend/README.md`.

---

## Endpoints

All are mounted under `/api`.

| Method  | Path                                | Purpose                                      |
| ------- | ----------------------------------- | -------------------------------------------- |
| `GET`   | `/system/overview`                  | Status, uptime, AI state, ingest rate         |
| `GET`   | `/system/stats`                     | Block / floor / sensor / alert counters       |
| `GET`   | `/system/health`                    | Per-component health                          |
| `GET`   | `/system/pipeline`                  | Simulation → dashboard stages                 |
| `GET`   | `/blocks`                           | Every monitored block, floors embedded        |
| `POST`  | `/blocks`                           | Provision a block — generates floors + sensors|
| `GET`   | `/blocks/{code}`                    | One block                                     |
| `GET`   | `/blocks/{code}/floors/{floorCode}` | One floor                                     |
| `GET`   | `/sensors`                          | Filter by `block`, `floor`, `type`, `status`  |
| `GET`   | `/sensors/{id}`                     | One sensor                                    |
| `GET`   | `/readings`                         | Series by `sensor`, `range`, optional `base`  |
| `GET`   | `/readings/comparison`              | Floor-by-floor comparison                     |
| `GET`   | `/readings/mix`                     | Utility mix per floor                         |
| `GET`   | `/alerts`                           | Filter by `severity`, `block`                 |
| `GET`   | `/alerts/counts`                    | Counts per severity                           |
| `PATCH` | `/alerts/{id}`                      | `{acknowledged:true}` or `{severity:"resolved"}` |
| `GET`   | `/ai/insights`                      | Filter by `kind`, `severity`                  |
| `GET`   | `/ai/insights/{id}`                 | One insight                                   |
| `GET`   | `/ai/decision-flow`                 | Sensor data → recommendation stages           |
| `GET`   | `/ai/hybrid/summary`                | Latest hybrid anomaly/trend/risk result       |
| `GET`   | `/ai/hybrid/history`                | Recent hybrid risk decisions                  |
| `POST`  | `/ai/hybrid/retrain`                | Controlled retraining from stored readings    |
| `GET`   | `/reports`                          | Generated report history                      |
| `POST`  | `/reports/export`                   | Queue a PDF/CSV export                        |
| `POST`  | `/auth/login`                       | `{identifier}` → `{token, user}`              |
| `POST`  | `/auth/logout`                      | Ends the session                              |

---

## Layout

```
app/
├── main.py                 FastAPI app, CORS, router registration
├── schemas.py              Pydantic request/response models
├── core/
│   ├── config.py           Settings from the environment
│   └── rng.py              Deterministic RNG — a bit-exact port of the frontend's
├── data/seed.json          Alerts, insights, reports, taxonomy, overview
├── services/
│   ├── estate.py           Block/floor/sensor generation + in-memory store
│   ├── readings.py         Time-series generators
│   └── operations.py       Alerts, insights, reports, overview
└── routers/                One module per resource
```

---

## Why the data is generated, not random

`core/rng.py` is a faithful port of the FNV-1a + mulberry32 pair the frontend
uses validated timestamped telemetry from Velxio
bit-for-bit against Node.

The frontend does not substitute offline sensor fixtures. If the two sides
generated data independently, the standalone build and the live API would
describe different buildings: different sensor readings, different floor totals,
different expected ranges. Instead `GET /api/blocks` returns exactly the
structure the frontend would have produced on its own, so switching
`VITE_USE_MOCK` changes *where* the data comes from and nothing else.

The estate is therefore reproducible: restart the process and Sunflower's 1st
the critical alert and the AI insight quote.

---

## State

`EstateStore` and `OperationsStore` hold state in memory for the process
lifetime. Blocks created via `POST /blocks` and alerts acknowledged via `PATCH`
persist according to the configured Supabase persistence and live device mappings.

This is deliberately the shape a real persistence layer would take — the stores
expose `list_*` / `get_*` / `create_*` / `update_*` methods and the routers
never touch data structures directly. Swapping in SQLAlchemy means rewriting the
two store classes; the routers, schemas and the frontend stay untouched.

Authentication uses server-managed bearer sessions persisted in Supabase. Local
login verifies the stored password hash; Google login requires a verified
credential when Google OAuth is configured.

---

## Configuration

| Variable                  | Default                                            |
| ------------------------- | -------------------------------------------------- |
| `AIMDS_API_PREFIX`        | `/api`                                              |
| `AIMDS_HOST`              | `0.0.0.0`                                           |
| `AIMDS_PORT`              | `8000`                                              |
| `AIMDS_CORS_ORIGINS`      | `http://localhost:5173,http://127.0.0.1:5173,…`     |
| `AIMDS_CORS_ORIGIN_REGEX` | `https://.*\.e2b\.app`                              |

---

## Stack

FastAPI 0.115 · Uvicorn 0.34 · Pydantic 2.10 · Python 3.13 with the official
Supabase client. The service uses no ORM or task queue.

## Velxio ESP32 telemetry

The exact publisher sketch is at `../hardware/velxio/aimds_telemetry.ino`. It
posts DHT22 temperature and humidity to `POST /api/telemetry/ingest`; voltage,
current, and power remain JSON `null` until matching sensors are wired and the
existing hardware read variables are connected.

1. Set `AIMDS_TELEMETRY_INGEST_TOKEN` in the backend `.env` to a long random value.
2. Put the same value in `AIMDS_DEVICE_TOKEN` in the sketch.
3. Run FastAPI on port `8000` and run the frontend with `VITE_USE_MOCK=false`.
4. For hosted Velxio, run `velxiogw`, pair it in the WiFi panel (Maker plan), and
   use `host.velxio.internal`. Velxio’s official docs state that the free hosted
   plan does not pair the local gateway; Velxio Desktop runs locally and does not
   need it.

The ingest route uses `X-AIMDS-Device-Token`. Dashboard latest/history routes
use the normal AIMDS bearer session. Readings persist in Supabase table
`aimds_telemetry_readings` with backend-only RLS.

## Hybrid AI training

Install the dependencies from `requirements.txt`, then train from an authenticated
Kaggle CSV export or another real CSV with supported numeric telemetry columns:

```bash
PYTHONPATH=. .venv/bin/python scripts/train_hybrid.py path/to/real_dataset.csv \
  --output-dir artifacts/hybrid
```

The trainer sorts by a detected timestamp, removes duplicates, engineers deltas
and rolling baselines, and evaluates chronological train/validation/test slices.
Isolation Forest is always separated from supervised classification. XGBoost is
trained only when a verified binary fault/anomaly label is discovered. Without
labels, the artifact and API explicitly report that no calibrated fault
probability is available.
