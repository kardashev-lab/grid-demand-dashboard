import DashboardClient from "@/components/DashboardClient";
import { getLatest, getHistory } from "@/lib/store";
import { loadDemandFromApi } from "@/lib/loadFromApi";

// Force per-request rendering so every request sees fresh data rather than a
// build-time snapshot.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function Home() {
  // Prefer the in-memory store when the Railway poller has warmed it.
  // On Vercel (serverless) the store is empty, so fall back to a direct
  // kardashev-data fetch for the first paint.
  let initialDemand = getLatest();
  let initialHistory = getHistory();

  if (Object.keys(initialDemand).length === 0) {
    const loaded = await loadDemandFromApi();
    initialDemand = loaded.latest;
    initialHistory = loaded.history;
  }

  return (
    <DashboardClient
      initialDemand={initialDemand}
      initialHistory={initialHistory}
    />
  );
}
