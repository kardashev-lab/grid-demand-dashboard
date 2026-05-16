// aggregator entry point - boots the API server, hydrates the in-memory store
// from postgres, then starts the redis stream consumer.

import { createApp } from './app';
import { startConsumer } from './consumer';
import * as db from './db';
import { hydrate } from './store';

const PORT = parseInt(process.env.PORT ?? '3000');
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

async function main() {
  // if postgres is available, backfill the in-memory store so charts aren't empty on boot
  await db.init();
  if (db.isEnabled()) {
    const history = await db.loadHistory(48);
    hydrate(history);
  }

  createApp().listen(PORT, () => {
    console.log(`Aggregator listening on :${PORT}`);
    startConsumer(REDIS_URL).catch((err) => {
      console.error('Consumer failed to start:', err);
      process.exit(1);
    });
  });
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
