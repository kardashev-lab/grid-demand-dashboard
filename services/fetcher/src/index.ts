// Fetcher entry point. Polls gridstatus.io and pushes readings to the Redis stream.
// We use Streams (not pub/sub) so messages persist if the aggregator is temporarily down.

import axios from 'axios';
import Redis from 'ioredis';
import { fetchDemand } from './client';

const REGION = process.env.REGION ?? 'CAISO';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const GRIDSTATUS_API_KEY = process.env.GRIDSTATUS_API_KEY;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL ?? '60000');
const STREAM_KEY = 'demand';

if (!GRIDSTATUS_API_KEY) {
  console.error('GRIDSTATUS_API_KEY is required. Get a free key at https://www.gridstatus.io/settings/api');
  process.exit(1);
}

const redis = new Redis(REDIS_URL, { lazyConnect: true });

redis.on('error', (err) => console.error(`[${REGION}] Redis error:`, err.message));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Fetch the latest demand value and push it onto the Redis stream.
// Returns how long to wait before the next poll (normal interval or rate-limit backoff).
async function poll(): Promise<number> {
  try {
    const value = await fetchDemand(REGION, GRIDSTATUS_API_KEY!);
    await redis.xadd(
      STREAM_KEY, '*',
      'region', REGION,
      'value', String(value),
      'unit', 'MW',
      'timestamp', new Date().toISOString()
    );
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
  console.log(`Fetcher starting - region=${REGION} interval=${POLL_INTERVAL}ms`);
  await redis.connect();
  // Loop instead of setInterval so the wait always comes after the poll finishes,
  // which means rate-limit backoff is respected before the next attempt.
  while (true) {
    const waitMs = await poll();
    await sleep(waitMs);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
