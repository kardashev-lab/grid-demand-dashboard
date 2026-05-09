// gridstatus.io API client - fetches electricity demand for a given region

import axios from 'axios';

const BASE_URL = 'https://api.gridstatus.io/v1';

// These are the dataset names on gridstatus.io for each region.
// We found these by looking at their example notebooks on GitHub.
const DATASET_MAP: Record<string, string> = {
  CAISO: 'caiso_standardized_hourly',
  ERCOT: 'ercot_standardized_hourly',
  PJM: 'pjm_standardized_hourly',
};

// The load column isn't always named the same thing across datasets,
// so we check a few candidates and take the first one that has a value.
// 'load.load' is the actual column name in the standardized datasets
const LOAD_COLUMNS = ['load.load', 'load', 'net_load', 'demand'];

export async function fetchDemand(region: string, apiKey: string): Promise<number> {
  const dataset = DATASET_MAP[region];
  if (!dataset) throw new Error(`Unknown region: ${region}`);

  // We fetch the last 3 hours because the data is published hourly and there
  // can be a delay, so going back 1 hour sometimes returns nothing.
  const startTime = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

  const response = await axios.get<GridStatusResponse>(
    `${BASE_URL}/datasets/${dataset}/query`,
    {
      headers: { 'x-api-key': apiKey },
      params: {
        start_time: startTime,
        limit: 10,
        return_format: 'json',
        json_schema: 'array-of-arrays',
      },
      timeout: 12000,
    }
  );

  const raw = response.data?.data;
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error(`No data returned for ${dataset}`);
  }

  // row 0 = column names, rows 1+ = actual data (ascending by time)
  const columns = raw[0] as string[];
  const rows = raw.slice(1) as Array<Array<string | number>>;
  const latestRow = rows[rows.length - 1];
  const record = Object.fromEntries(columns.map((col, i) => [col, latestRow[i]]));

  // find whichever load column exists in this dataset
  for (const col of LOAD_COLUMNS) {
    const val = record[col];
    if (val !== undefined && val !== null && val !== '') {
      const num = Number(val);
      if (!isNaN(num) && num > 0) return Math.round(num);
    }
  }

  throw new Error(`Couldn't find a load column. Got these columns: ${columns.join(', ')}`);
}

// The actual response type from the API when using json_schema=array-of-arrays
interface GridStatusResponse {
  data: Array<string[] | Array<string | number>>;
  meta: { hasNextPage: boolean; cursor?: string };
}
