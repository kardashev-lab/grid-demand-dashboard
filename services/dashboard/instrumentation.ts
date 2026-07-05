// Next.js instrumentation hook: register() runs exactly once when the server process
// boots (see https://nextjs.org/docs/app/guides/instrumentation). Starts the same
// in-process demand poller the old Express aggregator ran, so the in-memory store is
// warm before the first request -- not per-request, not per-render.
//
// Only runs in Railway's single-process mode. When AGGREGATOR_API_URL is set (the
// docker-compose/Kubernetes "distributed" deployment -- see lib/aggregator.ts), a
// separate aggregator container already owns polling via Redis Streams/Postgres;
// this app is a pure frontend there and must not run a second, competing poller.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.AGGREGATOR_API_URL) {
    const { startPoller } = await import("./lib/poller");
    startPoller();
  }
}
