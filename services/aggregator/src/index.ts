// aggregator entry point - polls kardashev-data API directly for all regions
// and serves the in-memory store via the Express app.
// No Redis or fetcher processes required.

import { createApp } from './app';
import { hydrate, updateDemand, DemandReading } from './store';

const PORT = parseInt(process.env.PORT ?? '3000');
const KARDASHEV_API = process.env.KARDASHEV_API_URL ?? 'https://data.kardashevlabs.org';
const POLL_MS = 20 * 60 * 1000; // 20 minutes

const REGIONS = [
  'CAISO', 'ERCOT', 'PJM', 'MISO', 'NYISO', 'ISONE',
  'SPP', 'BPAT', 'TVA', 'SOCO', 'FPL', 'DUK', 'SRP', 'PSCO', 'PACE',
];

interface LoadPoint {
  ts: string;
  iso: string;
  zone: string;
  mw_actual: number | null;
  mw_forecast: number | null;
}

async function fetchRegion(iso: string, hours: number): Promise<LoadPoint[]> {
  const url = `${KARDASHEV_API}/load?iso=${iso}&hours=${hours}&limit=${hours + 5}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${iso}`);
  return res.json() as Promise<LoadPoint[]>;
}

function toReadings(iso: string, rows: LoadPoint[]): DemandReading[] {
  return rows
    .filter((r) => r.mw_actual && r.mw_actual > 0)
    .map((r) => ({
      region: iso,
      value: Math.round(r.mw_actual!),
      unit: 'MW',
      timestamp: new Date(r.ts).toISOString(),
    }))
    .reverse(); // kardashev returns DESC; store expects ASC
}

async function pollAll(hours: number): Promise<void> {
  const byRegion: Record<string, DemandReading[]> = {};
  await Promise.allSettled(
    REGIONS.map(async (iso) => {
      try {
        const rows = await fetchRegion(iso, hours);
        byRegion[iso] = toReadings(iso, rows);
        console.log(`Fetched ${byRegion[iso].length} rows for ${iso}`);
      } catch (err) {
        console.error(`Failed to fetch ${iso}:`, (err as Error).message);
      }
    })
  );
  if (Object.keys(byRegion).length > 0) hydrate(byRegion);
}

async function pollLatest(): Promise<void> {
  await Promise.allSettled(
    REGIONS.map(async (iso) => {
      try {
        const rows = await fetchRegion(iso, 3);
        const readings = toReadings(iso, rows);
        if (readings.length > 0) {
          updateDemand(readings[readings.length - 1]);
        }
      } catch (err) {
        console.error(`Poll failed for ${iso}:`, (err as Error).message);
      }
    })
  );
}

async function main() {
  console.log(`Aggregator starting — polling ${KARDASHEV_API}`);

  // hydrate with 48h history before the server opens
  await pollAll(48);

  createApp().listen(PORT, () => {
    console.log(`Aggregator listening on :${PORT}`);
  });

  // keep refreshing latest values every 20 minutes
  setInterval(pollLatest, POLL_MS);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
