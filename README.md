# Grid Demand Dashboard

Live at **[grid-demand.kardashevlabs.org](https://grid-demand.kardashevlabs.org)** · Part of [Kardashev Labs](https://kardashevlabs.org)

US electricity demand across **15 balancing authorities** (~95% of CONUS load): regional map, treemap, and 48-hour trends.

**Stack:** Next.js (server-rendered) on **[Railway](https://railway.app)**. A single process polls kardashev-data in-process, serves the API, and server-renders the UI — no separate services, no Redis, no Postgres.

## Data source

Demand data comes from the [kardashev-data](https://github.com/kardashev-lab/kardashev-data) API
(`data.kardashevlabs.org`), which ingests ISO/RTO and EIA feeds. No API key required.

The dashboard is server-rendered, so the current demand numbers are visible in the raw HTML
to crawlers/AI agents, not just after client JS runs (`instrumentation.ts` → `lib/poller.ts`
keeps an in-memory store warm; `app/page.tsx` reads it directly for SSR).

## Local development

```bash
cd services/dashboard && npm install && npm run dev
```

Open http://localhost:3000. Defaults work out of the box — no env vars required.

## Deploy on Railway

Connect this repo in Railway. **`railway.toml`** targets **`Dockerfile.railway`** and probes **`/health`**.
No required variables.

## Layout

| | |
|--|--|
| `services/dashboard` | The whole app: Next.js frontend + API routes + in-process poller |
