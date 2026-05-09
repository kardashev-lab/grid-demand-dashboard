
import { createApp } from './app';
import { startConsumer } from './consumer';

const PORT = parseInt(process.env.PORT ?? '3000');
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

createApp().listen(PORT, () => {
  console.log(`Aggregator listening on :${PORT}`);
  startConsumer(REDIS_URL).catch((err) => {
    console.error('Consumer failed to start:', err);
    process.exit(1);
  });
});
