// aggregator entry point for the distributed stack (Compose / Kubernetes):
// consumes demand readings from the Redis stream published by the fetcher fleet,
// persists them to Postgres when configured, and serves the REST API.
//
// For the single-process Railway deployment (no Redis, no fetchers) see railway.ts.

import { createApp } from './app';
import { startConsumer } from './consumer';
import * as db from './db';
import { hydrate } from './store';

const PORT = parseInt(process.env.PORT ?? '3000');
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

async function main() {
  try {
    await db.init();
    if (db.isEnabled()) {
      const history = await db.loadHistory(48);
      hydrate(history);
      console.log(`Hydrated store from Postgres (${Object.keys(history).length} regions)`);
    }
  } catch (err) {
    console.error('Postgres unavailable, continuing in-memory only:', (err as Error).message);
  }

  createApp().listen(PORT, () => {
    console.log(`Aggregator listening on :${PORT}`);
  });

  // runs forever; unacked messages are replayed on restart via the consumer group
  await startConsumer(REDIS_URL);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
