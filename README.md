# Grid Demand Dashboard

US electricity demand across **15 balancing authorities**, hourly data from the **[EIA Open Data API](https://www.eia.gov/opendata/)** (free key: [register](https://api.eia.gov/register/)).

**Stack:** React dashboard · Express API · optional Redis Streams + Postgres · Docker Compose · Helm/Kubernetes · slim **[Railway](https://railway.app)** image (`Dockerfile.railway`).

---

## Quick start

```bash
cp .env.example .env   # set EIA_API_KEY
docker compose up --build
```

| | URL |
|--|-----|
| Dashboard | http://localhost:8080 |
| API | http://localhost:3000/api/demand |

**Tests:** `cd services/aggregator && npm test`

---

## Deploy on Railway

Connect this repo in Railway, add **`EIA_API_KEY`**. Build uses **`railway.toml`** + **`Dockerfile.railway`** (single container: UI + API + in-process polling). Optional **`DATABASE_URL`** if you attach Postgres.

---

## Layout

| | |
|--|--|
| `services/dashboard` | React (Vite) |
| `services/aggregator` | REST API, Redis consumer, Railway entry |
| `services/fetcher` | EIA poller (one region per process in Compose/K8s) |
| `charts/grid-demand` | Helm chart |
| `docker-compose.yml` | Full local stack |