// EIA v2 API client. Pulls latest hourly demand for a balancing authority.

import axios from 'axios';

const BASE_URL = 'https://api.eia.gov/v2';

// EIA uses different codes than the common ISO abbreviations everyone else uses
const RESPONDENT_MAP: Record<string, string> = {
  CAISO: 'CISO',
  ERCOT: 'ERCO',
  PJM: 'PJM',
  MISO: 'MISO',
  NYISO: 'NYIS',
  ISONE: 'ISNE',
  SPP: 'SWPP',
  BPAT: 'BPAT',
  TVA: 'TVA',
  SOCO: 'SOCO',
  FPL: 'FPL',
  DUK: 'DUK',
  SRP: 'SRP',
  PSCO: 'PSCO',
  PACE: 'PACE',
};

export interface HistoryRow {
  timestamp: string;
  value: number;
}

export async function fetchDemand(region: string, apiKey: string): Promise<number> {
  const rows = await fetchRows(region, apiKey, 8);
  for (const row of rows) {
    if (row.value > 0) return Math.round(row.value);
  }
  throw new Error(`No valid demand value in latest ${rows.length} rows for ${region}`);
}

// last N hourly rows, newest -> oldest already filtered to valid values
export async function fetchHistory(region: string, apiKey: string, hours: number): Promise<HistoryRow[]> {
  const rows = await fetchRows(region, apiKey, hours);
  return rows
    .filter((r) => r.value > 0)
    .map((r) => ({ timestamp: r.timestamp, value: Math.round(r.value) }));
}

async function fetchRows(region: string, apiKey: string, length: number): Promise<{ timestamp: string; value: number }[]> {
  const respondent = RESPONDENT_MAP[region];
  if (!respondent) throw new Error(`Unknown region: ${region}`);

  const response = await axios.get<EiaResponse>(
    `${BASE_URL}/electricity/rto/region-data/data/`,
    {
      params: {
        api_key: apiKey,
        frequency: 'hourly',
        'data[0]': 'value',
        'facets[respondent][]': respondent,
        'facets[type][]': 'D',
        'sort[0][column]': 'period',
        'sort[0][direction]': 'desc',
        length,
      },
      timeout: 12000,
    }
  );

  const rows = response.data?.response?.data;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`No data returned for ${respondent}`);
  }

  return rows.map((row) => ({
    // EIA periods look like "2026-05-09T10" — tack on minutes/seconds so Date() is happy
    timestamp: new Date(row.period + ':00:00Z').toISOString(),
    value: Number(row.value),
  }));
}

interface EiaRow {
  period: string;
  respondent: string;
  type: string;
  value: number | string | null;
  'value-units'?: string;
}

interface EiaResponse {
  response: {
    data: EiaRow[];
    total?: number;
  };
}
