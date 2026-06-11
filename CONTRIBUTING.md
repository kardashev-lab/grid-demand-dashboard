# Contributing to Grid Demand Dashboard

Thanks for helping make live US electricity demand easier to see. This project monitors demand across 15 balancing authorities and includes a small distributed-services stack for ingest, storage, and visualization.

## What this repo does

- Fetches demand data from the [kardashev-data](https://github.com/kardashev-lab/kardashev-data) API.
- Serves a REST API from the aggregator service.
- Visualizes regional demand in a React dashboard.
- Includes optional Redis Streams, Postgres, Docker Compose, and Helm/Kubernetes deployment paths.

Stack: React/Vite, Node.js/Express, TypeScript, Redis Streams, Postgres, Docker Compose, Helm/Kubernetes, Railway.

## Local setup

```bash
cp .env.example .env   # defaults work out of the box, no API key needed
docker compose up --build
```

Open:

- Dashboard: `http://localhost:8080`
- API: `http://localhost:3001/api/demand`

## Before opening a PR

```bash
cd services/aggregator
npm test
```

If you change the dashboard, run it locally and include screenshots.

## Good first contributions

- Improve loading and stale-data states.
- Add a clearer timestamp/timezone label.
- Improve mobile map interactions.
- Add tests for one aggregator endpoint.
- Document one balancing authority and its region code.

## Reliability guidelines

- Keep API responses backwards-compatible when possible.
- Do not block app startup when optional services are unavailable.
- Keep timestamps explicit.
- Do not commit `.env` files or API keys.

## PR guidelines

- Keep changes focused by service.
- Include test output for backend changes.
- Include screenshots for dashboard changes.
- Mention whether Redis/Postgres were used in local testing.
