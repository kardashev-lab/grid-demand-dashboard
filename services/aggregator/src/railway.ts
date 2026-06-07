// Single-process entry for Railway: poll kardashev-data for all regions in-process,
// serve API + built React dashboard. No Redis, no fetcher fleet, no EIA key needed.

import path from 'path';
import { createApp } from './app';
import * as db from './db';
import { hydrate, updateDemand, type DemandReading } from './store';

const REGIONS = [
  'CAISO', 'ERCOT', 'PJM', 'MISO', 'NYISO', 'ISONE', 'SPP',
  'BPAT', 'TVA', 'SOCO', 'FPL', 'DUK', 'SRP', 'PSCO', 'PACE',
] as const;

function listenPort(): number {
  const n = parseInt(process.env.PORT ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 3000;
}

const PORT = listenPort();
const HOST = process.env.HOST ?? '0.0.0.0';
const KARDASHEV_API = process.env.KARDASHEV_API_URL ?? 'https://data.kardashevlabs.org';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL ?? '1200000');
const BACKFILL_HOURS = parseInt(process.env.BACKFILL_HOURS ?? '48');
const STATIC_DIR = process.env.STATIC_DIR ?? path.join(__dirname, '..', '..', 'dashboard', 'dist');

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

async function backfillAll(): Promise<void> {
  const byRegion: Record<string, DemandReading[]> = {};
  await Promise.allSettled(
    REGIONS.map(async (iso) => {
      try {
        const rows = await fetchRegion(iso, BACKFILL_HOURS);
        byRegion[iso] = toReadings(iso, rows);
        console.log(`[railway] Backfilled ${iso}: ${byRegion[iso].length} rows`);
      } catch (err) {
        console.error(`[railway] Backfill ${iso}:`, (err as Error).message);
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
        const readings = toReadings(iso, rows);
        if (readings.length > 0) {
          const latest = readings[readings.length - 1];
          updateDemand(latest);
          await db.insertReading(latest);
          console.log(`[railway] ${iso} ${latest.value} MW`);
        }
      } catch (err) {
        console.error(`[railway] ${iso}:`, (err as Error).message);
      }
    })
  );
}

async function main(): Promise<void> {
  const staticRoot = process.env.SERVE_STATIC === '0' ? undefined : STATIC_DIR;
  const app = createApp(staticRoot);

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(
        `[railway] listening host=${HOST} port=${PORT} static=${staticRoot ?? '(api only)'}`
      );
      resolve();
    });
    server.on('error', reject);
  });

  try {
    await db.init();
    if (db.isEnabled()) {
      const history = await db.loadHistory(48);
      hydrate(history);
    }
  } catch (err) {
    console.error('Postgres unavailable, continuing in-memory only:', (err as Error).message);
  }

  // backfill history then keep polling
  void (async () => {
    try {
      await backfillAll();
      setInterval(() => { void pollAll(); }, POLL_INTERVAL);
    } catch (err) {
      console.error('[railway] poll loop error:', (err as Error).message);
    }
  })();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
