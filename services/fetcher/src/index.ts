// fetcher entry point - polls EIA and pushes readings onto a Redis stream

import axios from 'axios';
import Redis from 'ioredis';
import { fetchDemand, fetchHistory } from './client';

const REGION = process.env.REGION ?? 'CAISO';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const EIA_API_KEY = process.env.EIA_API_KEY;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL ?? '1200000');
const BACKFILL_HOURS = parseInt(process.env.BACKFILL_HOURS ?? '48');
const STREAM_KEY = 'demand';

if (!EIA_API_KEY) {
  console.error('EIA_API_KEY is required. Register for a free key at https://api.eia.gov/register/');
  process.exit(1);
}

const redis = new Redis(REDIS_URL, { lazyConnect: true });
redis.on('error', (err) => console.error(`[${REGION}] Redis error:`, err.message));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// push a single reading onto the Redis stream for the aggregator to consume
async function publish(value: number, timestamp: string): Promise<void> {
  await redis.xadd(
    STREAM_KEY, '*',
    'region', REGION,
    'value', String(value),
    'unit', 'MW',
    'timestamp', timestamp
  );
}

// on first boot we replay recent history into the stream so the dashboard
// isn't empty — the aggregator deduplicates via hour_bucket in postgres
async function backfill(): Promise<void> {
  try {
    const rows = await fetchHistory(REGION, EIA_API_KEY!, BACKFILL_HOURS);
    for (const row of rows) {
      await publish(row.value, row.timestamp);
    }
    console.log(`[${REGION}] Backfilled ${rows.length} hourly readings`);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      console.warn(`[${REGION}] Backfill rate limited, skipping`);
      return;
    }
    console.error(`[${REGION}] Backfill error:`, (err as Error).message);
  }
}

async function poll(): Promise<number> {
  try {
    const value = await fetchDemand(REGION, EIA_API_KEY!);
    await publish(value, new Date().toISOString());
    console.log(`[${REGION}] Published ${value} MW`);
    return POLL_INTERVAL;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      const retryAfter = parseInt(err.response.headers['retry-after'] ?? '60') * 1000;
      console.warn(`[${REGION}] Rate limited, waiting ${retryAfter / 1000}s before next poll`);
      return retryAfter;
    }
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
