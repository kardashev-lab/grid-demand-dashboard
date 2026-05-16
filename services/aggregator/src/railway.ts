// Single-process entry for Railway: poll EIA for all regions in-process, optional
// Postgres, serve API + built React dashboard. No Redis or separate fetchers.

import path from 'path';
import axios from 'axios';
import { createApp } from './app';
import * as db from './db';
import { hydrate, updateDemand, type DemandReading } from './store';
import { fetchDemand, fetchHistory } from './eiaClient';

const REGIONS = [
  'CAISO', 'ERCOT', 'PJM', 'MISO', 'NYISO', 'ISONE', 'SPP',
  'BPAT', 'TVA', 'SOCO', 'FPL', 'DUK', 'SRP', 'PSCO', 'PACE',
] as const;

const PORT = parseInt(process.env.PORT ?? '3000', 10);
// Containers must listen on all interfaces; localhost-only breaks Railway healthchecks.
const HOST = process.env.HOST ?? '0.0.0.0';
const EIA_API_KEY = process.env.EIA_API_KEY;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL ?? '1200000');
const BACKFILL_HOURS = parseInt(process.env.BACKFILL_HOURS ?? '48');
const STAGGER_MS = parseInt(process.env.EIA_STAGGER_MS ?? '300');

const STATIC_DIR = process.env.STATIC_DIR ?? path.join(__dirname, '..', '..', 'dashboard', 'dist');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function applyReading(reading: DemandReading): Promise<void> {
  updateDemand(reading);
  await db.insertReading(reading);
}

async function backfillRegion(region: string): Promise<void> {
  try {
    const rows = await fetchHistory(region, EIA_API_KEY!, BACKFILL_HOURS);
    for (const row of rows) {
      await applyReading({
        region,
        value: row.value,
        unit: 'MW',
        timestamp: row.timestamp,
      });
    }
    console.log(`[railway] Backfilled ${region}: ${rows.length} buckets`);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      console.warn(`[railway] Backfill ${region}: rate limited, skipping`);
      return;
    }
    console.error(`[railway] Backfill ${region}:`, (err as Error).message);
  }
}

async function pollRegion(region: string): Promise<void> {
  try {
    const value = await fetchDemand(region, EIA_API_KEY!);
    const timestamp = new Date().toISOString();
    await applyReading({ region, value, unit: 'MW', timestamp });
    console.log(`[railway] ${region} ${value} MW`);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      console.warn(`[railway] ${region}: rate limited`);
      return;
    }
    console.error(`[railway] ${region}:`, (err as Error).message);
  }
}

async function runBackfillAll(): Promise<void> {
  for (const region of REGIONS) {
    await backfillRegion(region);
    await sleep(STAGGER_MS);
  }
}

async function runPollAll(): Promise<void> {
  for (const region of REGIONS) {
    await pollRegion(region);
    await sleep(STAGGER_MS);
  }
}

async function main(): Promise<void> {
  if (!EIA_API_KEY) {
    console.error('EIA_API_KEY is required (Railway variable or .env)');
    process.exit(1);
  }

  const staticRoot = process.env.SERVE_STATIC === '0' ? undefined : STATIC_DIR;
  const app = createApp(staticRoot);

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`Railway app listening on ${HOST}:${PORT} static=${staticRoot ?? '(api only)'}`);
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

  void (async () => {
    await runBackfillAll();
    await runPollAll();
    setInterval(() => {
      void runPollAll();
    }, POLL_INTERVAL);
  })();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
