// shared frontend types. mirrors the shape returned by the aggregator API.

export interface DemandReading {
  region: string;
  value: number;
  unit: string;
  timestamp: string;
}

export type DemandMap = Record<string, DemandReading>;
export type HistoryMap = Record<string, DemandReading[]>;
