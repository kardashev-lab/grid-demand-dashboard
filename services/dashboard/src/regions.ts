// region metadata used across the dashboard. 7 ISOs/RTOs + 8 non-ISO BAs.

export const REGIONS = [
  'CAISO', 'ERCOT', 'PJM', 'MISO', 'NYISO', 'ISONE', 'SPP',
  'BPAT', 'TVA', 'SOCO', 'FPL', 'DUK', 'SRP', 'PSCO', 'PACE',
] as const;

export type RegionCode = (typeof REGIONS)[number];

export const REGION_LABELS: Record<string, string> = {
  CAISO: 'California ISO',
  ERCOT: 'Texas ERCOT',
  PJM:   'PJM Interconnection',
  MISO:  'Midcontinent ISO',
  NYISO: 'New York ISO',
  ISONE: 'ISO New England',
  SPP:   'Southwest Power Pool',
  BPAT:  'Bonneville Power',
  TVA:   'Tennessee Valley',
  SOCO:  'Southern Company',
  FPL:   'Florida Power & Light',
  DUK:   'Duke Energy Carolinas',
  SRP:   'Salt River Project',
  PSCO:  'Public Service Co. CO',
  PACE:  'PacifiCorp East',
};

// hand-picked so adjacent regions on the map don't look the same
export const REGION_COLORS: Record<string, string> = {
  CAISO: '#3b82f6',
  ERCOT: '#10b981',
  PJM:   '#f59e0b',
  MISO:  '#a855f7',
  NYISO: '#ec4899',
  ISONE: '#14b8a6',
  SPP:   '#f97316',
  BPAT:  '#06b6d4',
  TVA:   '#84cc16',
  SOCO:  '#ef4444',
  FPL:   '#eab308',
  DUK:   '#6366f1',
  SRP:   '#d946ef',
  PSCO:  '#22c55e',
  PACE:  '#f43f5e',
};

// state FIPS code -> primary BA. Some states overlap multiple BAs in real life;
// we just pick the dominant one for the map.
export const ISO_BY_FIPS: Record<string, RegionCode> = {
  '06': 'CAISO',
  '48': 'ERCOT',
  '10': 'PJM', '11': 'PJM', '21': 'PJM', '24': 'PJM', '34': 'PJM',
  '39': 'PJM', '42': 'PJM', '51': 'PJM', '54': 'PJM',
  '05': 'MISO', '17': 'MISO', '18': 'MISO', '19': 'MISO', '22': 'MISO',
  '26': 'MISO', '27': 'MISO', '28': 'MISO', '29': 'MISO', '38': 'MISO',
  '46': 'MISO', '55': 'MISO',
  '36': 'NYISO',
  '09': 'ISONE', '23': 'ISONE', '25': 'ISONE', '33': 'ISONE', '44': 'ISONE', '50': 'ISONE',
  '20': 'SPP', '31': 'SPP', '40': 'SPP', '35': 'SPP',
  '53': 'BPAT', '41': 'BPAT', '16': 'BPAT', '30': 'BPAT',
  '47': 'TVA',
  '13': 'SOCO', '01': 'SOCO',
  '12': 'FPL',
  '37': 'DUK', '45': 'DUK',
  '04': 'SRP',
  '08': 'PSCO',
  '49': 'PACE', '56': 'PACE', '32': 'PACE',
};
