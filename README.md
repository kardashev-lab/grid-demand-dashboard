# Grid Demand Dashboard

Live at **[grid-demand.kardashevlabs.org](https://grid-demand.kardashevlabs.org)** · Part of [Kardashev Labs](https://kardashevlabs.org)

US electricity demand across **15 balancing authorities** (~95% of CONUS load): regional map, treemap, and 48-hour trends.

**Stack:** Next.js dashboard (server-rendered) · Express/TypeScript aggregator API · Redis Streams + Postgres (distributed stack) · Docker Compose · Helm/Kubernetes · slim **[Railway](https://railway.app)** image (`Dockerfile.railway`).

## Data source

Demand data comes from the [kardashev-data](https://github.com/kardashev-lab/kardashev-data) API
(`data.kardashevlabs.org`), which ingests ISO/RTO and EIA feeds. No API key required.

## Two deployment modes

| Mode | Entry point | What runs |
|------|-------------|-----------|
| **Distributed** (Compose / Kubernetes) | `aggregator/src/index.ts` | 15 fetcher processes → Redis stream → aggregator (consumer group + Postgres) → dashboard (proxies to the aggregator's API, set via `AGGREGATOR_API_URL`) |
| **Single-process** (Railway, production) | `dashboard` (Next.js) | The dashboard container polls kardashev-data in-process itself (`instrumentation.ts` → `lib/poller.ts`) and serves both the API and the server-rendered UI — no separate aggregator process |

The distributed stack exists to demonstrate stream-based ingest, durable consumer groups,
and horizontal scaling (see [docs/SUBMISSION_README.md](docs/SUBMISSION_README.md) for the
full Kubernetes write-up, chaos-recovery and load experiments). Production runs the simpler
single-process mode. The dashboard is server-rendered (Next.js) in both modes, so the current
demand numbers are visible in the raw HTML to crawlers/AI agents, not just after client JS runs.

## Quick start

```bash
cp .env.example .env   # defaults work out of the box
docker compose up --build
```

| | URL |
|--|-----|
| Dashboard | http://localhost:8080 |
| API | http://localhost:3001/api/demand |

The aggregator binds container port 3000, published on host port **3001** to avoid clashing
with other dev stacks.

**Tests:** `cd services/aggregator && npm test`

## Local frontend development

```bash
cd services/dashboard && npm install && npm run dev
```

The dashboard polls kardashev-data in-process on its own (same as Railway) -- no separate
aggregator process needed. To instead point it at a locally-running aggregator (distributed
mode), set `AGGREGATOR_API_URL=http://localhost:3001` before `npm run dev`.

## Deploy on Railway

Connect this repo in Railway. **`railway.toml`** targets **`Dockerfile.railway`** and probes **`/health`**.
No required variables. Optional **`DATABASE_URL`** (Railway Postgres) persists hourly readings and
hydrates history on boot.

## Kubernetes (Helm)

```bash
helm upgrade --install grid-demand charts/grid-demand
```

See `charts/grid-demand/values.yaml` for image, HPA, and Postgres options, and
[docs/SUBMISSION_README.md](docs/SUBMISSION_README.md) for the Minikube walkthrough.

## Layout

| | |
|--|--|
| `services/dashboard` | Next.js (server-rendered); owns polling + API in Railway mode, proxies to the aggregator in distributed mode |
| `services/aggregator` | REST API, Redis consumer (`index.ts`), Railway entry (`railway.ts`) |
| `services/fetcher` | kardashev-data poller (one region per process in Compose/K8s) |
| `charts/grid-demand` | Helm chart |
| `docker-compose.yml` | Full local distributed stack |
| `scripts/` | Load-test and chaos-recovery experiments |
