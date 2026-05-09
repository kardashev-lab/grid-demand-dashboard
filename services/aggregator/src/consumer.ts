// Redis Streams consumer for the aggregator.
// Uses XREADGROUP so we can track which messages were processed — if the aggregator
// crashes, it replays unacknowledged messages on restart instead of losing them.

import Redis from 'ioredis';
import { updateDemand, DemandReading } from './store';

const STREAM_KEY = 'demand';
const GROUP = 'aggregators';
const CONSUMER = 'aggregator-1';

export async function startConsumer(redisUrl: string): Promise<void> {
  const redis = new Redis(redisUrl, { lazyConnect: true });
  redis.on('error', (err) => console.error('Redis error:', err.message));
  await redis.connect();

  try {
    // MKSTREAM creates the stream if it doesn't exist yet
    await redis.xgroup('CREATE', STREAM_KEY, GROUP, '0', 'MKSTREAM');
    console.log('Consumer group created');
  } catch (err: unknown) {
    // BUSYGROUP means the group already exists, which is fine on restart
    if (!(err instanceof Error) || !err.message.includes('BUSYGROUP')) throw err;
  }

  console.log('Consumer ready, waiting for messages...');

  // Handle any messages that were delivered before the last restart
  await drainPending(redis);

  // Main loop, blocks up to 5 seconds waiting for new messages
  while (true) {
    try {
      const results = (await redis.xreadgroup(
        'GROUP', GROUP, CONSUMER,
        'COUNT', '10',
        'BLOCK', '5000',
        'STREAMS', STREAM_KEY, '>'  // '>' means only new, undelivered messages
      )) as [string, [string, string[]][]][] | null;

      if (!results) continue; // timeout, just loop again

      for (const [, messages] of results) {
        for (const [id, fields] of messages) {
          const data = fieldsToMap(fields);
          const reading: DemandReading = {
            region: data.region,
            value: parseFloat(data.value),
            unit: data.unit,
            timestamp: data.timestamp,
          };
          updateDemand(reading);
          // XACK tells Redis we've processed this message so it leaves the pending list
          await redis.xack(STREAM_KEY, GROUP, id);
          console.log(`Consumed [${reading.region}] ${reading.value} ${reading.unit}`);
        }
      }
    } catch (err) {
      console.error('Consumer loop error:', (err as Error).message);
      await sleep(1000);
    }
  }
}

// On restart, replay any messages we received but didn't acknowledge before going down.
// This is how we recover state without needing a separate database.
async function drainPending(redis: Redis): Promise<void> {
  const pending = (await redis.xreadgroup(
    'GROUP', GROUP, CONSUMER,
    'COUNT', '100',
    'STREAMS', STREAM_KEY, '0'  // '0' means give me my own pending messages
  )) as [string, [string, string[]][]][] | null;

  if (!pending) return;

  let count = 0;
  for (const [, messages] of pending) {
    for (const [id, fields] of messages) {
      const data = fieldsToMap(fields);
      updateDemand({
        region: data.region,
        value: parseFloat(data.value),
        unit: data.unit,
        timestamp: data.timestamp,
      });
      await redis.xack(STREAM_KEY, GROUP, id);
      count++;
    }
  }
  if (count > 0) console.log(`Replayed ${count} pending messages from before restart`);
}

// Redis returns fields as a flat array ["key1", "val1", "key2", "val2", ...]
// This converts it to a regular object
function fieldsToMap(fields: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    map[fields[i]] = fields[i + 1];
  }
  return map;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
