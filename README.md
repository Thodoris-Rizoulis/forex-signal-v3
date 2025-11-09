# Forex Signal v3

Real-time foreign exchange signal platform that ingests market data, detects trends and consolidations, and broadcasts actionable breakout opportunities to a React dashboard and any connected clients.

## Highlights

- **Automated market ingestion** – Polls FastForex for minute data, normalizes it into hourly/4h candles, and stores history in PostgreSQL.
- **Multi-timeframe analytics** – EMA, RSI, MACD, ADX, and swing-structure logic power trend confirmation and consolidation scoring.
- **Breakout opportunity engine** – Filters consolidations, validates volume/momentum/session quality, and emits structured signals.
- **Live delivery** – REST API plus WebSocket broadcast (`type: "new_opportunity"`) keep the dashboard and third-party consumers up to date.
- **Operational visibility** – Structured logging to the `"Logs"` table (or console) and deterministic testing endpoints for replaying scenarios.

## Architecture Overview

```
backend (Node.js / Express / TypeScript)
│
├── src/app.ts          # Boots API, ensures schema, starts background workers
├── services/           # Long-running loops (fetcher, trend, consolidation, breakout, retention)
├── models/             # Lightweight SQL models using pg Pool and plain queries
├── routes/             # REST endpoints mounted under /api
└── utils/              # Candle aggregation, indicators, logging, session heuristics

frontend (React + Vite + Tailwind)
│
├── src/components/     # Dashboard layout, opportunities list, management UIs
├── src/hooks/          # WebSocket hook for live signals
└── src/services/api.ts # REST client helpers that mirror backend filters

postgres (via Docker or external instance)
└── Schema ensured at runtime by src/dbInit.ts
```

### Data & Signal Flow

1. `runDataFetcher` groups active currency pairs by base currency and calls `https://api.fastforex.io/fetch-multi`.
2. Rates are stored in the `"Rates"` table; `candleUtils` aggregates them into hourly/four-hour candles.
3. `TrendDetectorService` updates pair trend state (direction, ADX strength, timestamps) on the `"Pairs"` table.
4. `ConsolidationService` uses ZigZag algorithm to detect consolidations, score quality, and persist to `"Consolidations"`; also handles breakout detection and opportunity creation.
5. Each new opportunity is pushed to connected WebSocket clients and available through REST filters.

## Backend Services

- **`runDataFetcher`** (`services/dataFetcher.ts`): Minute-level ingestion; respects `FETCH_INTERVAL` (seconds).
- **`runTrendDetector`** (`services/TrendDetectorService.ts`): Multi-timeframe trend analysis scheduled with `TREND_DETECTOR_INTERVAL` (seconds ⇒ ms).
- **`runConsolidationService`** (`services/ConsolidationService.ts`): ZigZag-based consolidation detection and breakout analysis; interval configurable via `.env`.
- **`runDataRetention`** (`services/dataRetention.ts`): Daily cleanup of rates older than 30 days.

All workers start automatically from `src/app.ts`. For deterministic tests, call service methods directly or use the testing routes outlined later.

## Frontend Snapshot

- React 19 + Vite 7 + Tailwind 4 UI driven by `client/src/components/`.
- `client/src/hooks/useWebSocket.ts` maintains a resilient connection, buffering the 50 most recent signals.
- REST helpers in `client/src/services/api.ts` mirror backend pagination/filtering for rates, opportunities, pairs, and strategies.

## Getting Started

### Prerequisites

- Node.js ≥ 18 and npm.
- Docker Engine (optional, recommended for local Postgres).
- FastForex API key (https://api.fastforex.io/).

### 1. Provision PostgreSQL

```powershell
cd "c:\Users\theor\NEW ERA\forex_signal_v3"
docker compose -f docker/docker-compose.yml up -d
```

Default credentials (`forex_user` / `forex_pass`, DB `forex_db`) match repository defaults.

### 2. Configure Environment

Create an `.env` file in the repository root:

```ini
DB_HOST=localhost
DB_PORT=5432
DB_USER=forex_user
DB_PASS=forex_pass
DB_NAME=forex_db
FASTFOREX_API_KEY=your-fastforex-key
FETCH_INTERVAL=60
TREND_DETECTOR_INTERVAL=300
CONSOLIDATION_DETECTOR_INTERVAL=600
CONSOLIDATION_BREAKOUT_INTERVAL=3600
LOG_TO_CONSOLE=true
```

All variables are optional; unspecified values fall back to defaults in `src/config/index.ts`.

### 3. Install Dependencies

```powershell
npm install
cd client
npm install
cd ..
```

### 4. Run the Platform

```powershell
# backend (starts API, background jobs, WebSocket on port 3000)
npm start

# frontend (new terminal)
cd client
npm run dev -- --open
```

Express auto-creates tables on first run via `ensureTables()`; no separate migrations are required.

### 5. Stop Services

```powershell
# stop docker stack
docker compose -f docker/docker-compose.yml down
```

## Environment Reference

| Variable                                                                     | Purpose                                              | Default                                                     |
| ---------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`                        | PostgreSQL connection parameters                     | `localhost`, `5432`, `forex_user`, `forex_pass`, `forex_db` |
| `FASTFOREX_API_KEY`                                                          | Credential for FastForex `fetch-multi` endpoint      | none (required for live data)                               |
| `FETCH_INTERVAL`                                                             | Seconds between data fetch cycles                    | `60`                                                        |
| `TREND_DETECTOR_INTERVAL`                                                    | Seconds between trend scans (converted to ms)        | `300`                                                       |
| `CONSOLIDATION_DETECTOR_INTERVAL`                                            | Seconds between consolidation scans                  | `600`                                                       |
| `CONSOLIDATION_BREAKOUT_INTERVAL`                                            | Seconds between breakout checks                      | `3600`                                                      |
| `CONSOLIDATION_DUPLICATE_CHECK_HOURS`                                        | Timeframe for deduplicating consolidations           | `4`                                                         |
| `CONSOLIDATION_MIN_LIFESPAN_MINUTES`                                         | Minimum time before breakout evaluation              | `30`                                                        |
| `MAX_ATR_RATIO`, `MAX_STD_DEV_PERCENT`, `MAX_RANGE_PERCENT`                  | Consolidation quality thresholds                     | `3.0`, `0.02`, `0.03`                                       |
| `TREND_PERSISTENCE_MINUTES`, `ADX_START_THRESHOLD`, `ADX_MAINTAIN_THRESHOLD` | Trend hysteresis tuning                              | `30`, `25`, `23`                                            |
| `LOG_TO_CONSOLE`                                                             | When `true`, bypasses DB logger and prints to stdout | unset (logs to DB)                                          |

## REST & Testing Interfaces

Key routes exposed under `/api`:

- `GET /api/health` – readiness check.
- `GET /api/pairs`, `POST /api/pairs` – manage currency pairs.
- `GET /api/strategies` – list activated strategies.
- `GET /api/opportunities` – paginated opportunities; filters include `pair_id`, `strategy_id`, `signal_type`, `evaluation_status`, `start_date`, `end_date`.
- `GET /api/rates` – historical rates with pagination and optional warnings for large ranges.
- `GET /api/rates/timeseries/:pairId` – optimized OHLC aggregation for charting (`interval=1m|5m|15m|1h|1d`).
- `POST /api/rates` – manual rate insertion (useful for tests).
- `POST /api/test/trend` – Replay trend detection for `{ pairId, startDate, endDate }` without mutating state.
- `POST /api/test/consolidation` – Evaluate consolidations for a historical window.

## WebSocket Contract

- Endpoint: `ws://localhost:3000` in development, `wss://<host>` in production.
- Messages are JSON with `type` discriminator:
  - `connection` – Welcome/ping responses.
  - `new_opportunity` – Payload mirrors `models/Opportunity` shape (ids, rates, signal metadata).
- The frontend retains only the 50 most recent messages; adjust `useWebSocket` if you need persistence.

## Database Schema

`src/dbInit.ts` creates and manages all tables:

- `"Currencies"`, `"Pairs"`, `"Strategies"`, `"Rates"`, `"Opportunities"`, `"Consolidations"`, `"Logs"`.
- Enum `signal_type_enum` (`BUY`/`SELL`).
- Existing schema is dropped/updated in code; introduce structural changes directly inside `ensureTables()`.

## Testing & Quality Checks

- **Service replays**: Use `/api/test/trend` and `/api/test/consolidation` endpoints to validate indicator tuning with historical ranges.
- **Unit tests**: There is no dedicated test harness; prefer direct service invocation for deterministic runs.
- **Logs**: Examine `"Logs"` table or enable `LOG_TO_CONSOLE=true` for development visibility.

## Deployment Notes

- Expose port 3000 for both REST and WebSocket traffic.
- Ensure background workers remain active (process-level timers); consider a process manager (PM2, systemd, container orchestrator).
- Provide persistent Postgres storage (see `docker/docker-compose.yml` volume definitions).
- Monitor FastForex rate limits and adjust `FETCH_INTERVAL` and detector intervals accordingly.

## Maintenance Tips

- Adding new indicators or signals: extend utility modules in `src/utils/` and wire updates into the corresponding service.
- Schema changes: modify `src/dbInit.ts`; restart the service to apply.
- Frontend theming: Tailwind tokens live in `client/tailwind.config.js` and `client/src/index.css`.

---

For additional context on collaborating with AI agents inside this repository, see `.github/copilot-instructions.md`.
