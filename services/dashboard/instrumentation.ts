// Next.js instrumentation hook: register() runs exactly once when the server process
// boots (see https://nextjs.org/docs/app/guides/instrumentation). Starts the
// in-process demand poller so the in-memory store is warm before the first request --
// not per-request, not per-render.
//
// Skip on Vercel: serverless instances don't keep a warm poller, and API routes /
// page.tsx fetch kardashev-data on demand via lib/loadFromApi.ts instead.
export async function register() {
  if (process.env.VERCEL) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPoller } = await import("./lib/poller");
    startPoller();
  }
}
