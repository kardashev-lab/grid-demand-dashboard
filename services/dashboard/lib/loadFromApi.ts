// Serverless-safe data loader: fetches demand directly from kardashev-data.
// Used on Vercel (no long-lived in-memory poller). Railway can still warm
// the in-process store via instrumentation.ts -> poller.ts.

import { loadQueryUrl, toDemandReadings, type LoadPoint } from "./demandReadings";
import { REGIONS } from "./regions";
import type { DemandReading } from "./types";

const KARDASHEV_API = (
  process.env.KARDASHEV_API_URL ?? "https://data.kardashevlabs.org"
).replace(/\/$/, "");
const BACKFILL_HOURS = parseInt(process.env.BACKFILL_HOURS ?? "48", 10);

async function fetchRegion(iso: string, hours: number): Promise<LoadPoint[]> {
  const url = loadQueryUrl(KARDASHEV_API, iso, hours);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${iso}`);
  return res.json() as Promise<LoadPoint[]>;
}

export async function loadDemandFromApi(): Promise<{
  latest: Record<string, DemandReading>;
  history: Record<string, DemandReading[]>;
}> {
  const latest: Record<string, DemandReading> = {};
  const history: Record<string, DemandReading[]> = {};

  await Promise.all(
    REGIONS.map(async (iso) => {
      try {
        const rows = await fetchRegion(iso, BACKFILL_HOURS);
        const readings = toDemandReadings(iso, rows);
        if (readings.length === 0) return;
        history[iso] = readings;
        latest[iso] = readings[readings.length - 1];
      } catch (err) {
        console.error(`[loadFromApi] ${iso}:`, (err as Error).message);
      }
    })
  );

  return { latest, history };
}
