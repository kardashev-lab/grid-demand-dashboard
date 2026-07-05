// In-memory store. Latest reading + up to 576 slots (48h at 5-min resolution) per region.
// EIA-backed regions fill ~48 slots (hourly); native ISO regions fill up to 576 (5-min).

import type { DemandReading } from "./types";

interface RegionState {
  latest: DemandReading;
  history: DemandReading[];
}

// 48h x 12 intervals/hour = 576 slots at 5-min resolution
const HISTORY_SLOTS = 576;

// Pinned to globalThis rather than a plain module-level variable: Next.js can compile
// instrumentation.ts (where the poller writes) and Route Handlers/Server Components
// (where this gets read) into separate bundles, each getting their own copy of an
// ordinary module singleton. globalThis is shared across the whole process regardless
// of bundle boundaries, so the poller's writes are actually visible to reads.
declare global {
  // eslint-disable-next-line no-var
  var __demandStore: Map<string, RegionState> | undefined;
}
const store = globalThis.__demandStore ?? (globalThis.__demandStore = new Map<string, RegionState>());

// round to nearest 5-min boundary so rapid duplicate writes don't stack
function fiveMinBucket(timestamp: string): string {
  const d = new Date(timestamp);
  d.setSeconds(0, 0);
  d.setMinutes(Math.floor(d.getMinutes() / 5) * 5);
  return d.toISOString().slice(0, 16);
}

export function updateDemand(reading: DemandReading): void {
  const prev = store.get(reading.region);
  const history = prev ? prev.history.slice() : [];

  if (history.length > 0) {
    const last = history[history.length - 1];
    if (fiveMinBucket(last.timestamp) === fiveMinBucket(reading.timestamp)) {
      history[history.length - 1] = reading;
    } else {
      history.push(reading);
      if (history.length > HISTORY_SLOTS) history.shift();
    }
  } else {
    history.push(reading);
  }

  store.set(reading.region, { latest: reading, history });
}

// seed the store from a region->history map (used on startup from kardashev-data)
export function hydrate(byRegion: Record<string, DemandReading[]>): void {
  let count = 0;
  for (const [region, readings] of Object.entries(byRegion)) {
    if (readings.length === 0) continue;
    const trimmed = readings.slice(-HISTORY_SLOTS);
    store.set(region, { latest: trimmed[trimmed.length - 1], history: trimmed });
    count += trimmed.length;
  }
  console.log(`Hydrated store with ${count} readings across ${Object.keys(byRegion).length} regions`);
}

export function getLatest(): Record<string, DemandReading> {
  const out: Record<string, DemandReading> = {};
  for (const [region, state] of store) out[region] = state.latest;
  return out;
}

export function getHistory(): Record<string, DemandReading[]> {
  const out: Record<string, DemandReading[]> = {};
  for (const [region, state] of store) out[region] = state.history;
  return out;
}
