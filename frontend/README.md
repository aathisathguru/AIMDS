# AIMDS

**AI-Based Multi-Utility Monitoring and Decision Support System** — operations console.

AIMDS watches electricity, water, temperature, humidity and power load across a
building estate, learns what "normal" looks like for each floor, and surfaces
deviations as structured decisions rather than raw dashboards.

```
Simulation → Backend API → Database → AI Analysis → Anomaly Detection
           → Insights → Recommendations → AIMDS Dashboard
```

This folder is the **frontend**. It runs standalone against a built-in
simulation layer, or against the FastAPI service in `../backend` by setting a
single environment variable.

---

## Two ways to view it

**1 · Open `aimds-standalone.html`.** One self-contained file — every script and
stylesheet inlined, no server, no network, no install. Double-click it, or open
it in any preview pane. This is the quickest way to see the app.

**2 · Run the dev server.**

```bash
npm install
npm run dev        # http://localhost:5173
```

> Opening `index.html` directly will **not** work. It is a Vite entry stub
> (`<div id="root">` plus a module script) that has to be served — that is what
> `aimds-standalone.html` exists for.

| Script                     | What it does                                       |
| -------------------------- | -------------------------------------------------- |
| `npm run dev`              | Vite dev server with HMR                            |
| `npm run build`            | Production build to `dist/` (code-split)            |
| `npm run build:standalone` | Regenerates `aimds-standalone.html`                 |
| `npm run preview`          | Serve the production build locally                  |
| `npm run lint`             | oxlint over `src/`                                  |

**Sign-in credentials:** `aathi@gmail.com` / `abu0923` (or `ops@aimds.io` / `aimds-demo`).

### Where it runs

The app adapts to what the host environment allows, so the same code works
served, from the filesystem, and inside a locked-down preview frame:

| Environment                    | Router          | Notes                                            |
| ------------------------------ | --------------- | ------------------------------------------------ |
| `http(s)://`                   | `BrowserRouter` | Clean paths — `/blocks/SF/floors/1F`              |
| `file://`                      | `HashRouter`    | History API unavailable                           |
| Sandboxed frame / opaque origin | `MemoryRouter`  | `pushState` and `localStorage` both throw there   |

In an opaque origin `localStorage` raises `SecurityError`, so theme, session and
rail preferences fall back to in-memory defaults rather than crashing. Forms are
wired to both `submit` and `click`, because sandboxed frames without
`allow-forms` never fire a submit event.

---

## Stack

React 19 · JavaScript (no TypeScript) · Vite · React Router · Recharts ·
Framer Motion · Lucide React · plain CSS with custom properties.

No CSS framework, no component library, no state-management library. Everything
visual is hand-built against the design tokens.

---

## Screens

| Route                                  | Screen           | Purpose                                                        |
| -------------------------------------- | ---------------- | -------------------------------------------------------------- |
| `/login`                               | Login            | Animated network background, MONITOR → ANALYZE → DECIDE         |
| `/`                                    | Dashboard        | System overview strip + block-wise monitoring + priority finding |
| `/blocks`                              | Blocks           | Every block as a live elevation; **+ Add block**                 |
| `/blocks/:blockId`                     | Block Details    | Floor elevation, block trend, floor comparison                   |
| `/blocks/:blockId/floors/:floorId`     | Floor Monitoring | Utility readings vs expected envelope, per-floor sensors         |
| `/live`                                | Live Monitoring  | Streaming telemetry, connection health, rolling window           |
| `/sensors`                             | Sensors          | Every provisioned device, filterable, expandable                 |
| `/analytics`                           | Analytics        | Trends, comparisons and the deviation evidence behind the AI     |
| `/alerts`                              | Alerts           | Critical / Warning / Information / Resolved, with actions        |
| `/insights`                            | AI Insights      | Structured findings — not a chat window                          |
| `/reports`                             | Reports          | Section builder + live preview + export placeholders             |
| `/settings`                            | Settings         | Profile, theme, notifications, thresholds, backend connection    |
| `/more`                                | More             | Mobile-only secondary navigation hub                             |

---

## Signature components

- **`BlockVisualization`** — the building rendered as a stacked elevation.
  Floors are clickable, lift on hover and carry per-sensor status dots. It is a
  CSS **container-query** component, so the same markup stays legible in a
  narrow grid card and in a full-width panel.
- **`FlowGraph`** — the system pipeline (Simulation → Sensors → API → Database →
  AI Engine → AIMDS). The nodes are static; only the data particles animate.
  Horizontal on desktop, vertical on mobile.
- **`AIDecisionFlow`** — how a conclusion was reached: Sensor Data → Pattern
  Analysis → Anomaly Detection → Severity → Possible Cause → Recommendation.
- **`DeviationPanel`** — the Analytics ↔ AI link: Historical Trend → Current
  Reading → Expected Range → Deviation → AI Detection.
- **`AIInsightCard`** — every finding answers WHAT, WHERE, HOW SERIOUS, WHY and
  WHAT TO DO.

---

## Project structure

```
src/
├── main.jsx                 Providers + environment-aware router selection
├── App.jsx                  Route table; routes are lazy-loaded per screen
├── styles/
│   ├── tokens.css           Palette, type scale, spacing, radii, motion, z-index
│   └── base.css             Reset, focus rings, buttons, fields, utilities
├── config/navigation.jsx    Nav groups, mobile nav, page titles
├── data/mockData.js         Blocks, floors, sensors, alerts, insights, series
├── services/api.js          The only place that talks to the backend
├── context/                 ThemeContext, AuthContext, DataContext
├── hooks/                   useMediaQuery, useLiveStream, useParallax, useServiceData
├── utils/format.js          Status tones, number and time formatting
├── components/
│   ├── layout/              Sidebar, Navbar, MobileNavigation, CommandPalette, Layout
│   ├── ui/                  StatusIndicator, Modal, States, Segmented, Toast, …
│   ├── blocks/              BlockVisualization, FloorCard, AddBlockModal
│   ├── monitoring/          UtilityCard, SensorCard, ConnectionCard
│   ├── flow/                FlowGraph, AIDecisionFlow
│   ├── ai/                  AIInsightCard, DeviationPanel
│   ├── charts/              AnalyticsChart (the single Recharts wrapper)
│   ├── alerts/              AlertCard
│   ├── dashboard/           SystemRibbon
│   └── login/               NetworkCanvas
└── pages/                   One folder-free `.jsx` + co-located `.css` per screen

tools/standalone.mjs         Folds the standalone build into one HTML file
```

Every component keeps its CSS next to it. There is no global stylesheet beyond
`tokens.css` and `base.css`.

---

## Connecting the FastAPI backend

All network access lives in **`src/services/api.js`**. No component calls
`fetch` directly.

```js
export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api';
export const USE_MOCK = import.meta.env?.VITE_USE_MOCK !== 'false';
```

By default `USE_MOCK` is **true**: every service resolves against the bundled
fixtures and no backend is needed. To run against the real API:

```bash
cp .env.example .env.local     # sets VITE_USE_MOCK=false
npm run dev
```

Then start the service in a second terminal:

```bash
cd ../backend
./.venv/bin/uvicorn app.main:app --reload --port 8000
```

The dev server proxies `/api` to `http://localhost:8000` (see
`vite.config.js`), so the browser only ever makes same-origin requests and
there is no CORS hop. Override the target with `AIMDS_API_TARGET` if the
backend lives elsewhere.

### How data reaches the screen

| Layer                         | Responsibility                                                   |
| ----------------------------- | ---------------------------------------------------------------- |
| `services/api.js`             | The only module that issues HTTP. Mock/live switch lives here.     |
| `context/DataContext.jsx`     | Hydrates blocks, alerts, insights and overview once on mount.      |
| `hooks/useServiceData.js`     | Per-panel fetches (chart series, report history) with a seed value.|

Both hydration paths render a **local fixture as the seed first**, then replace
it with the response. Two consequences worth knowing:

- No chart ever flashes empty while a filter change is in flight.
- If the backend is unreachable, the console keeps showing the last known
  snapshot and flags it, instead of collapsing into error states. Sign-in is
  the exception — with `VITE_USE_MOCK=false` a failed `/api/auth/login`
  surfaces an inline error, because there is nothing honest to fall back to.

`useLiveStream` isolates the streaming transport the same way: swap its
interval for a WebSocket or SSE connection and nothing downstream moves.

---

## Adding a block

The architecture is data-driven — nothing is hard-coded around Sunflower.
`+ Add block` collects a name, ID, floor count, location and description, then
`generateFloors()` / `createBlock()` build the floor structure and provision a
default five-sensor set per floor in React state. The new block appears
immediately in the Blocks grid, the dashboard block switcher, the analytics
filters and the report scope.

Ships with **Sunflower (SF)** — Base, Ground, 1st, 2nd — and **Lotus (LT)**.

---

## Design system

Four brand colours, used deliberately:

| Token      | Value     | Role                            |
| ---------- | --------- | ------------------------------- |
| `--ink`    | `#1C1C1E` | Dark surfaces and dark-mode text |
| `--accent` | `#E67E22` | Primary action, energy, focus    |
| `--blue`   | `#4A90E2` | Data, AI, secondary series       |
| `--paper`  | `#F3F3F5` | Light surfaces and dark-mode text |

Status colours (`ok`, `warn`, `crit`, `info`, `idle`) are derived to stay
AA-legible on both themes. **Status is never communicated by colour alone** —
every indicator carries an icon and a text label.

**Theming.** Dark and light are two separately designed palettes, not an
inversion. The choice persists in `localStorage` (`aimds.theme`), honours
`prefers-color-scheme` when set to *System*, and cross-fades rather than
snapping.

**Motion.** Framer Motion is used for page transitions, card entrance, hover
lift, modal/sheet presentation, floor selection, pipeline particles and AI
reveals. Everything collapses to a fade under `prefers-reduced-motion`.

---

## Responsive behaviour

Mobile-first, verified at 320 / 390 / 768 / 1280 / 1600 px with no horizontal
overflow, no clipped text and no console errors.

| Width     | Navigation           | Layout                                       |
| --------- | -------------------- | -------------------------------------------- |
| < 768px   | Bottom nav + More    | Single column, modals become bottom sheets    |
| 768–1023  | Icon-only rail       | Two columns where it helps                    |
| ≥ 1024    | Full rail (collapsible) | Command-centre split layouts               |
| ≥ 1440    | Full rail            | Three-column insight grids                    |

The mobile layouts reorganise the hierarchy rather than shrinking the desktop
one. Components that can appear at very different widths — the block elevation,
the system ribbon, sensor cards — use **container queries** so they respond to
the space they are actually given, not to the viewport.

---

## Accessibility

- Visible focus rings on every interactive element (`:focus-visible`).
- Skip-to-content link; `/` and `Cmd/Ctrl-K` open the command palette.
- Landmarks, `aria-expanded` / `aria-controls` on every disclosure,
  `aria-label` on icon-only controls, `role="listbox"` in the palette.
- Charts carry text alternatives and are backed by readable summary figures.
- 44px minimum touch targets on mobile.
- Full `prefers-reduced-motion` support.
