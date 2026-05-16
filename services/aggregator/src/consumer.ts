// redis streams consumer. Uses XREADGROUP so unacked messages are replayed
// on restart - that's how we recover state without losing readings.

import Redis from 'ioredis';
import { updateDemand, DemandReading } from './store';
import { insertReading } from './db';

const STREAM_KEY = 'demand';
const GROUP = 'aggregators';
const CONSUMER = 'aggregator-1';

export async function startConsumer(redisUrl: string): Promise<void> {
  const redis = new Redis(redisUrl, { lazyConnect: true });
  redis.on('error', (err) => console.error('Redis error:', err.message));
  await redis.connect();

  try {
    await redis.xgroup('CREATE', STREAM_KEY, GROUP, '0', 'MKSTREAM');
    console.log('Consumer group created');
  } catch (err: unknown) {
    // BUSYGROUP just means group already exists
    if (!(err instanceof Error) || !err.message.includes('BUSYGROUP')) throw err;
  }

  console.log('Consumer ready, waiting for messages...');

  await drainPending(redis);

  while (true) {
    try {
      const results = (await redis.xreadgroup(
        'GROUP', GROUP, CONSUMER,
        'COUNT', '10',
        'BLOCK', '5000',
        'STREAMS', STREAM_KEY, '>'
      )) as [string, [string, string[]][]][] | null;

      if (!results) continue;

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
          await insertReading(reading);
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

async function drainPending(redis: Redis): Promise<void> {
  const pending = (await redis.xreadgroup(
    'GROUP', GROUP, CONSUMER,
    'COUNT', '100',
    'STREAMS', STREAM_KEY, '0'
  )) as [string, [string, string[]][]][] | null;

  if (!pending) return;

  let count = 0;
  for (const [, messages] of pending) {
    for (const [id, fields] of messages) {
      const data = fieldsToMap(fields);
      const reading: DemandReading = {
        region: data.region,
        value: parseFloat(data.value),
        unit: data.unit,
        timestamp: data.timestamp,
      };
      updateDemand(reading);
      await insertReading(reading);
      await redis.xack(STREAM_KEY, GROUP, id);
      count++;
    }
  }
  if (count > 0) console.log(`Replayed ${count} pending messages from before restart`);
}

function fieldsToMap(fields: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) map[fields[i]] = fields[i + 1];
  return map;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
