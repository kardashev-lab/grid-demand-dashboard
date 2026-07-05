# Contributing to Grid Demand Dashboard

Thanks for helping make live US electricity demand easier to see.

## What this repo does

- Fetches demand data from the [kardashev-data](https://github.com/kardashev-lab/kardashev-data) API.
- Serves a small REST API (`/api/demand`, `/api/demand/history`, `/api/demand/:region`) and
  a server-rendered dashboard, both from one Next.js app.

Stack: Next.js (server-rendered React), TypeScript, Railway.

## Local setup

```bash
cd services/dashboard
npm install
npm run dev
```

Open http://localhost:3000 — defaults work out of the box, no API key needed.

## Before opening a PR

```bash
cd services/dashboard
npm run build
```

If you change the dashboard UI, run it locally and include screenshots.

## Good first contributions

- Improve loading and stale-data states.
- Add a clearer timestamp/timezone label.
- Improve mobile map interactions.
- Document one balancing authority and its region code.

## Reliability guidelines

- Keep API responses backwards-compatible when possible.
- Keep timestamps explicit.
- Do not commit `.env` files or API keys.

## PR guidelines

- Include screenshots for dashboard changes.
