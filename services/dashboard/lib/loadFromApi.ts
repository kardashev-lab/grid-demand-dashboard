// Serverless-safe data loader: fetches demand directly from kardashev-data.
// Used on Vercel (no long-lived in-memory poller). Railway can still warm
// the in-process store via instrumentation.ts -> poller.ts.

import { REGIONS } from "./regions";
import type { DemandReading } from "./types";

const KARDASHEV_API = (
  process.env.KARDASHEV_API_URL ?? "https://data.kardashevlabs.org"
).replace(/\/$/, "");
const BACKFILL_HOURS = parseInt(process.env.BACKFILL_HOURS ?? "48", 10);

interface LoadPoint {
  ts: string;
  iso: string;
  zone: string;
  mw_actual: number | null;
  mw_forecast: number | null;
}

async function fetchRegion(iso: string, hours: number): Promise<LoadPoint[]> {
  const limit = hours * 15;
  const url = `${KARDASHEV_API}/load?iso=${iso}&hours=${hours}&limit=${limit}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${iso}`);
  return res.json() as Promise<LoadPoint[]>;
}

function toReadings(iso: string, rows: LoadPoint[]): DemandReading[] {
  return rows
    .filter((r) => r.mw_actual && r.mw_actual > 0)
    .map((r) => ({
      region: iso,
      value: Math.round(r.mw_actual!),
      unit: "MW",
      timestamp: new Date(r.ts).toISOString(),
    }))
    .reverse(); // kardashev returns DESC; UI expects ASC
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
        const readings = toReadings(iso, rows);
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
