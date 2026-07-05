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

// Hand-picked so adjacent regions on the map don't look the same.
// Hues keep the original adjacency relationships but are desaturated
// and lightness-matched so the treemap/map read as one palette instead
// of a full-saturation rainbow.
export const REGION_COLORS: Record<string, string> = {
  CAISO: '#6ea3cf',
  ERCOT: '#54b08d',
  PJM:   '#e3b04e',
  MISO:  '#9d8ec7',
  NYISO: '#c98ba6',
  ISONE: '#5fb3ab',
  SPP:   '#d99a62',
  BPAT:  '#67b4c9',
  TVA:   '#a8bf6e',
  SOCO:  '#cf7d6d',
  FPL:   '#d4bc72',
  DUK:   '#8a93c9',
  SRP:   '#bd8cc0',
  PSCO:  '#7dbb84',
  PACE:  '#bf7e85',
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
