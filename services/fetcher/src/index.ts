// fetcher entry point - polls kardashev-data and pushes readings onto a Redis stream

import Redis from 'ioredis';
import { fetchDemand, fetchHistory } from './client';

const REGION = process.env.REGION ?? 'CAISO';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL ?? '1200000');
const BACKFILL_HOURS = parseInt(process.env.BACKFILL_HOURS ?? '48');
const STREAM_KEY = 'demand';

const redis = new Redis(REDIS_URL, { lazyConnect: true });
redis.on('error', (err) => console.error(`[${REGION}] Redis error:`, err.message));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function publish(value: number, timestamp: string): Promise<void> {
  await redis.xadd(
    STREAM_KEY, '*',
    'region', REGION,
    'value', String(value),
    'unit', 'MW',
    'timestamp', timestamp,
  );
}

async function backfill(): Promise<void> {
  try {
    const rows = await fetchHistory(REGION, BACKFILL_HOURS);
    for (const row of rows) {
      await publish(row.value, row.timestamp);
    }
    console.log(`[${REGION}] Backfilled ${rows.length} hourly readings`);
  } catch (err) {
    console.error(`[${REGION}] Backfill error:`, (err as Error).message);
  }
}

async function poll(): Promise<number> {
  try {
    const value = await fetchDemand(REGION);
    await publish(value, new Date().toISOString());
    console.log(`[${REGION}] Published ${value} MW`);
    return POLL_INTERVAL;
  } catch (err) {
    console.error(`[${REGION}] Poll error:`, (err as Error).message);
    return POLL_INTERVAL;
  }
}

async function main(): Promise<void> {
  console.log(`Fetcher starting - region=${REGION} interval=${POLL_INTERVAL}ms backfill=${BACKFILL_HOURS}h`);
  await redis.connect();
  await backfill();
  while (true) {
    const waitMs = await poll();
    await sleep(waitMs);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
