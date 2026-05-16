// in-memory store. latest reading + last 48 hourly buckets per region.
// hydrated from postgres on startup so the dashboard isn't empty after a fresh boot.

export interface DemandReading {
  region: string;
  value: number;
  unit: string;
  timestamp: string;
}

interface RegionState {
  latest: DemandReading;
  history: DemandReading[];
}

const HISTORY_HOURS = 48;

const store = new Map<string, RegionState>();

function hourBucket(timestamp: string): string {
  return timestamp.slice(0, 13);
}

export function updateDemand(reading: DemandReading): void {
  const prev = store.get(reading.region);
  const history = prev ? prev.history.slice() : [];

  if (history.length > 0) {
    const last = history[history.length - 1];
    if (hourBucket(last.timestamp) === hourBucket(reading.timestamp)) {
      history[history.length - 1] = reading;
    } else {
      history.push(reading);
      if (history.length > HISTORY_HOURS) history.shift();
    }
  } else {
    history.push(reading);
  }

  store.set(reading.region, { latest: reading, history });
}

// seed the store from a region->history map (used on startup from DB)
export function hydrate(byRegion: Record<string, DemandReading[]>): void {
  let count = 0;
  for (const [region, readings] of Object.entries(byRegion)) {
    if (readings.length === 0) continue;
    const trimmed = readings.slice(-HISTORY_HOURS);
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
