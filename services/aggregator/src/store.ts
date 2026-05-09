// In-memory store for the aggregator. Keeps the latest reading and last 20 readings per region.
// No database needed — the aggregator rebuilds this from Redis on restart.

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

const HISTORY_SIZE = 20;

// Keyed by region name (e.g. "CAISO", "ERCOT", "PJM")
const store = new Map<string, RegionState>();

// Called by the consumer each time it processes a message from the stream
export function updateDemand(reading: DemandReading): void {
  const prev = store.get(reading.region);
  const history = prev ? [...prev.history, reading].slice(-HISTORY_SIZE) : [reading];
  store.set(reading.region, { latest: reading, history });
}

// Returns the most recent reading for every region we've heard from
export function getLatest(): Record<string, DemandReading> {
  const out: Record<string, DemandReading> = {};
  for (const [region, state] of store) {
    out[region] = state.latest;
  }
  return out;
}

// Returns the full history for all regions (used by the /history endpoint)
export function getHistory(): Record<string, DemandReading[]> {
  const out: Record<string, DemandReading[]> = {};
  for (const [region, state] of store) {
    out[region] = state.history;
  }
  return out;
}
