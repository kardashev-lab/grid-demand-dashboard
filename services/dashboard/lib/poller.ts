// In-process poller: fetches all 15 regions from kardashev-data on boot (backfill) and
// every POLL_INTERVAL after that. Started once from instrumentation.ts when the
// server boots.

import { loadQueryUrl, toDemandReadings, type LoadPoint } from "./demandReadings";
import { REGIONS } from "./regions";
import { hydrate, updateDemand } from "./store";
import type { DemandReading } from "./types";

const KARDASHEV_API = process.env.KARDASHEV_API_URL ?? "https://data.kardashevlabs.org";
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL ?? "300000", 10); // 5 min
const BACKFILL_HOURS = parseInt(process.env.BACKFILL_HOURS ?? "48", 10);

async function fetchRegion(iso: string, hours: number): Promise<LoadPoint[]> {
  const url = loadQueryUrl(KARDASHEV_API.replace(/\/$/, ""), iso, hours);
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${iso}`);
  return res.json() as Promise<LoadPoint[]>;
}

async function backfillAll(): Promise<void> {
  const byRegion: Record<string, DemandReading[]> = {};
  await Promise.allSettled(
    REGIONS.map(async (iso) => {
      try {
        const rows = await fetchRegion(iso, BACKFILL_HOURS);
        byRegion[iso] = toDemandReadings(iso, rows);
        console.log(`[poller] Backfilled ${iso}: ${byRegion[iso].length} rows`);
      } catch (err) {
        console.error(`[poller] Backfill ${iso}:`, (err as Error).message);
      }
    })
  );
  if (Object.keys(byRegion).length > 0) hydrate(byRegion);
}

async function pollAll(): Promise<void> {
  await Promise.allSettled(
    REGIONS.map(async (iso) => {
      try {
        const rows = await fetchRegion(iso, 3);
        const readings = toDemandReadings(iso, rows);
        if (readings.length > 0) {
          const latest = readings[readings.length - 1];
          updateDemand(latest);
          console.log(`[poller] ${iso} ${latest.value} MW`);
        }
      } catch (err) {
        console.error(`[poller] ${iso}:`, (err as Error).message);
      }
    })
  );
}

let started = false;

// Called once from instrumentation.ts when the server boots.
export function startPoller(): void {
  if (started) return;
  started = true;

  void (async () => {
    try {
      await backfillAll();
      setInterval(() => {
        void pollAll();
      }, POLL_INTERVAL);
    } catch (err) {
      console.error("[poller] loop error:", (err as Error).message);
    }
  })();
}
