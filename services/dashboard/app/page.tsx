import DashboardClient from "@/components/DashboardClient";
import { getLatest, getHistory } from "@/lib/store";

// Force per-request rendering so every request sees fresh data rather than a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default function Home() {
  // Reads the in-memory store directly -- same process, no network hop, no fetch
  // that can fail. The poller (instrumentation.ts -> lib/poller.ts) keeps it warm.
  const initialDemand = getLatest();
  const initialHistory = getHistory();

  return <DashboardClient initialDemand={initialDemand} initialHistory={initialHistory} />;
}
