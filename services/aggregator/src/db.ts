// postgres-backed durable storage for hourly demand readings.
// connects only if DATABASE_URL is set, so tests/dev without postgres still work.

import { Pool } from 'pg';
import { DemandReading } from './store';

let pool: Pool | null = null;

export function isEnabled(): boolean {
  return !!process.env.DATABASE_URL;
}

export async function init(): Promise<void> {
  if (!isEnabled()) {
    console.log('DATABASE_URL not set, running without persistence');
    return;
  }

  pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  pool.on('error', (err) => console.error('Postgres pool error:', err.message));

  // one row per region per hour. hour_bucket is computed app-side because
  // postgres rejects to_char(timestamptz) in a STORED generated column
  // (the function isn't IMMUTABLE).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS demand (
      region TEXT NOT NULL,
      ts TIMESTAMPTZ NOT NULL,
      value INTEGER NOT NULL,
      unit TEXT NOT NULL DEFAULT 'MW',
      hour_bucket TEXT NOT NULL,
      PRIMARY KEY (region, hour_bucket)
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_demand_region_ts ON demand(region, ts DESC);`);

  console.log('Postgres connected, schema ready');
}

// "2026-05-09T10:42:13Z" -> "2026-05-09T10"
function hourBucketOf(timestamp: string): string {
  return new Date(timestamp).toISOString().slice(0, 13);
}

export async function insertReading(reading: DemandReading): Promise<void> {
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO demand (region, ts, value, unit, hour_bucket) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (region, hour_bucket) DO UPDATE
         SET ts = EXCLUDED.ts, value = EXCLUDED.value`,
      [reading.region, reading.timestamp, reading.value, reading.unit, hourBucketOf(reading.timestamp)]
    );
  } catch (err) {
    console.error(`DB insert failed for ${reading.region}:`, (err as Error).message);
  }
}

// pull last N hours per region for hydrating the in-memory store
export async function loadHistory(hours = 48): Promise<Record<string, DemandReading[]>> {
  if (!pool) return {};
  const res = await pool.query(
    `WITH ranked AS (
       SELECT region, ts, value, unit,
              ROW_NUMBER() OVER (PARTITION BY region ORDER BY ts DESC) AS rn
       FROM demand
     )
     SELECT region, ts, value, unit FROM ranked
     WHERE rn <= $1
     ORDER BY region, ts ASC`,
    [hours]
  );

  const out: Record<string, DemandReading[]> = {};
  for (const row of res.rows) {
    const r: DemandReading = {
      region: row.region,
      value: Number(row.value),
      unit: row.unit,
      timestamp: new Date(row.ts).toISOString(),
    };
    (out[r.region] ??= []).push(r);
  }
  return out;
}
