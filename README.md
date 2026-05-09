# Grid Demand Dashboard

Project for CSC 258 - Distributed Systems. We built a system that shows real-time electricity demand from CAISO (California), ERCOT (Texas), and PJM (mid-Atlantic) using a microservices architecture.

## Team

**Ashutosh Mathore** - Built the aggregator service and REST API. Set up the Redis consumer group inside the aggregator so it can replay any unacknowledged messages after a restart, which is how the system recovers state without a separate database. Also structured the API endpoints so throughput and latency can be measured under load, which is what we need for the elasticity experiments in iteration 2. Handled Docker Compose setup including health checks so services start in the right order.

**Prithish Soni** - Built the fetcher microservice and the gridstatus.io API client. Designed the fetcher as the unit of horizontal scaling - one Docker image running as three separate containers, each differentiated only by the REGION environment variable, which is what the HPA will target in iteration 2. Also implemented exponential backoff on 429 responses so the fetchers degrade gracefully when the external API rate limits them instead of hammering it in a loop.

**Pushpinder Pal Singh** - Chose Redis Streams over pub/sub so messages are persisted on the stream even when the aggregator is temporarily down, which is what makes the pending message replay possible in the first place. Also built the React dashboard and wrote the integration tests. The dashboard is where eventual consistency is visible in practice since the readings shown are always a few polling cycles behind the real grid.

## How it works

Each fetcher polls gridstatus.io once per minute and publishes the reading to a Redis stream. The aggregator consumes from that stream using a consumer group and keeps the latest values in memory. The React frontend polls the aggregator REST API every 10 seconds and updates the display.

We used Redis Streams instead of pub/sub because messages persist on the stream even when the consumer is down, so if the aggregator restarts it can replay what it missed.

## Dependencies

Fetcher uses `ioredis` for Redis and `axios` for HTTP calls to gridstatus.io. Aggregator uses `express`, `cors`, `ioredis`, and `jest`/`supertest` for tests. Dashboard uses React, Recharts for the chart, and Vite.

## Environment

Copy `.env.example` to `.env` and fill in your API key:

```
cp .env.example .env
```

`GRIDSTATUS_API_KEY` is required, get a free key at https://www.gridstatus.io/settings/api. The fetchers exit immediately if it is not set. `POLL_INTERVAL` is how often fetchers poll in ms, default is 60000. The free tier has a 1M row/month limit so we kept it at 1 minute.

## Running

Requires Docker Desktop.

```bash
docker compose up --build
```

Dashboard is at http://localhost:8080. First readings show up after about 60 seconds. You can also check the aggregator directly at http://localhost:3000/api/demand.

To run without Docker you need Node 20+ and Redis running locally. Start the aggregator with `REDIS_URL=redis://localhost:6379 npm run dev` inside `services/aggregator`, the fetcher with `REGION=CAISO GRIDSTATUS_API_KEY=yourkey npm run dev` inside `services/fetcher`, and the dashboard with `npm run dev` inside `services/dashboard`. Vite proxies `/api` to port 3000 automatically in dev mode.

## Tests

```bash
cd services/aggregator
npm test
```

Six tests covering the REST endpoints. No Redis connection needed since we seed the store directly in the tests.

## What's left for Iteration 2

Iteration 1 runs entirely on Docker Compose. Iteration 2 moves the same system to Kubernetes and adds autoscaling and failure experiments.

**Kubernetes manifests** - We need to write `k8s/` manifests for each service (namespace, redis deployment/service, one fetcher deployment per region, aggregator deployment/service, dashboard deployment/service). The aggregator needs CPU requests set so the HPA has something to measure.

**Secrets** - The `GRIDSTATUS_API_KEY` needs to move into a Kubernetes Secret instead of an environment variable in the compose file.

**HPA** - A HorizontalPodAutoscaler on the aggregator targeting 50% CPU, min 1 replica, max 5. The fetcher is the natural unit to scale per region but the aggregator is the bottleneck under read load so that's what we're autoscaling.

**Load test script** - A shell script that hammers `/api/demand` with concurrent requests to drive CPU up and trigger the HPA. We'll watch `kubectl get hpa -w` while it runs to measure how fast the cluster scales out and back down.

**Chaos/recovery script** - A script that deletes the aggregator pod and times how long until the endpoint responds again. This validates that Kubernetes restarts the pod and that the consumer group replays the pending messages from the Redis stream so we don't lose data.

**Experiment runner** - Orchestrates both experiments back to back and saves the output (replica counts before/after, recovery time) to a log file for the writeup.
