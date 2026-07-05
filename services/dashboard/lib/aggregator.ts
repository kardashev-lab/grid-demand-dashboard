// In the docker-compose/Kubernetes "distributed" deployment, this app is a pure
// frontend: a separate aggregator container (Redis Streams consumer group -> Postgres,
// see services/aggregator/src/index.ts) owns the actual polling/coordination, and this
// app just proxies to its API. AGGREGATOR_API_URL is set only in that mode (docker-compose.yml
// sets it to http://aggregator:3000); it's absent in Railway's single-process mode, where
// this app owns polling itself (lib/poller.ts + instrumentation.ts).
export const AGGREGATOR_API_URL = process.env.AGGREGATOR_API_URL;

export function isProxyMode(): boolean {
  return !!AGGREGATOR_API_URL;
}
