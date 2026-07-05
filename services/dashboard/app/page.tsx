import DashboardClient from "@/components/DashboardClient";
import { getLatest, getHistory } from "@/lib/store";
import { AGGREGATOR_API_URL } from "@/lib/aggregator";
import type { DemandMap, HistoryMap } from "@/lib/types";

// Force per-request rendering so every request sees fresh data rather than a
// build-time snapshot.
export const dynamic = "force-dynamic";

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export default async function Home() {
  let initialDemand: DemandMap;
  let initialHistory: HistoryMap;

  if (AGGREGATOR_API_URL) {
    // Distributed mode: a separate aggregator container owns the data; this app is
    // a pure frontend, so SSR has to fetch over the network like any other client.
    [initialDemand, initialHistory] = await Promise.all([
      safeFetch<DemandMap>(`${AGGREGATOR_API_URL}/api/demand`, {}),
      safeFetch<HistoryMap>(`${AGGREGATOR_API_URL}/api/demand/history`, {}),
    ]);
  } else {
    // Railway single-process mode: reads the in-memory store directly -- same
    // process, no network hop, no fetch that can fail. The poller
    // (instrumentation.ts -> lib/poller.ts) keeps it warm.
    initialDemand = getLatest();
    initialHistory = getHistory();
  }

  return <DashboardClient initialDemand={initialDemand} initialHistory={initialHistory} />;
}
