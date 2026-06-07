// kardashev-data API client. Pulls latest hourly demand for a balancing authority.

import axios from 'axios';

const API_BASE = process.env.KARDASHEV_API_URL ?? 'https://data.kardashevlabs.org';

const ISO_MAP: Record<string, string> = {
  CAISO: 'CAISO',
  ERCOT: 'ERCOT',
  PJM:   'PJM',
  MISO:  'MISO',
  NYISO: 'NYISO',
  ISONE: 'ISONE',
  SPP:   'SPP',
  BPAT:  'BPAT',
  TVA:   'TVA',
  SOCO:  'SOCO',
  FPL:   'FPL',
  DUK:   'DUK',
  SRP:   'SRP',
  PSCO:  'PSCO',
  PACE:  'PACE',
};

export interface HistoryRow {
  timestamp: string;
  value: number;
}

interface LoadPoint {
  ts: string;
  iso: string;
  zone: string;
  mw_actual: number | null;
  mw_forecast: number | null;
}

async function fetchLoadRows(region: string, hours: number): Promise<LoadPoint[]> {
  const iso = ISO_MAP[region];
  if (!iso) throw new Error(`Unknown region: ${region}`);

  const response = await axios.get<LoadPoint[]>(`${API_BASE}/load`, {
    params: { iso, hours, limit: hours + 5 },
    timeout: 12000,
  });

  return response.data ?? [];
}

export async function fetchDemand(region: string): Promise<number> {
  const rows = await fetchLoadRows(region, 3);
  for (const row of rows) {
    if (row.mw_actual && row.mw_actual > 0) return Math.round(row.mw_actual);
  }
  throw new Error(`No valid demand value in latest rows for ${region}`);
}

export async function fetchHistory(region: string, hours: number): Promise<HistoryRow[]> {
  const rows = await fetchLoadRows(region, hours);
  return rows
    .filter((r) => r.mw_actual && r.mw_actual > 0)
    .map((r) => ({ timestamp: new Date(r.ts).toISOString(), value: Math.round(r.mw_actual!) }));
}
