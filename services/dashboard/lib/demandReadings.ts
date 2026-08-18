import type { DemandReading } from "./types";

export interface LoadPoint {
  ts: string;
  iso: string;
  zone: string;
  mw_actual: number | null;
  mw_forecast: number | null;
}

const SPIKE_MW = 8000;
const NEIGHBOR_MW = 4000;
const MAX_DT_MS = 720_000;
const HOUR_NEIGHBOR_MS = 600_000;

export function loadQueryUrl(apiBase: string, iso: string, hours: number): string {
  const limit = hours * 12 + 48;
  const base = apiBase.replace(/\/$/, "");
  return `${base}/load?iso=${encodeURIComponent(iso)}&zone=${encodeURIComponent(iso)}&hours=${hours}&limit=${limit}`;
}

function isExactHour(ts: string): boolean {
  const d = new Date(ts);
  return d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
}

export function dropHourBoundaryContamination(readings: DemandReading[]): DemandReading[] {
  const backbone = readings.filter((r) => !isExactHour(r.timestamp));
  if (backbone.length < 12) return readings;

  return readings.filter((r) => {
    if (!isExactHour(r.timestamp)) return true;
    const t = Date.parse(r.timestamp);
    let nearest: DemandReading | null = null;
    let best = Infinity;
    for (const o of backbone) {
      const dt = Math.abs(Date.parse(o.timestamp) - t);
      if (dt <= HOUR_NEIGHBOR_MS && dt < best) {
        best = dt;
        nearest = o;
      }
    }
    if (!nearest) return false;
    return Math.abs(r.value - nearest.value) < SPIKE_MW;
  });
}

export function despikeLoad(readings: DemandReading[]): DemandReading[] {
  if (readings.length < 3) return readings;

  const kept: DemandReading[] = [readings[0]];
  for (let i = 1; i < readings.length - 1; i++) {
    const prev = readings[i - 1];
    const cur = readings[i];
    const next = readings[i + 1];
    const dt0 = Date.parse(cur.timestamp) - Date.parse(prev.timestamp);
    const dt1 = Date.parse(next.timestamp) - Date.parse(cur.timestamp);
    if (dt0 > 0 && dt0 <= MAX_DT_MS && dt1 > 0 && dt1 <= MAX_DT_MS) {
      const isolated =
        Math.abs(cur.value - prev.value) >= SPIKE_MW &&
        Math.abs(cur.value - next.value) >= SPIKE_MW;
      const neighborsAgree = Math.abs(next.value - prev.value) <= NEIGHBOR_MW;
      if (isolated && neighborsAgree) continue;
    }
    kept.push(cur);
  }
  kept.push(readings[readings.length - 1]);

  if (kept.length >= 2) {
    const prev = kept[kept.length - 2];
    const last = kept[kept.length - 1];
    const dt = Date.parse(last.timestamp) - Date.parse(prev.timestamp);
    if (dt > 0 && dt <= MAX_DT_MS && Math.abs(last.value - prev.value) >= SPIKE_MW) {
      kept.pop();
    }
  }
  return kept;
}

export function toDemandReadings(iso: string, rows: LoadPoint[]): DemandReading[] {
  const now = Date.now() + 10 * 60_000;
  const actual = rows.filter(
    (r) =>
      r.mw_actual != null &&
      r.mw_actual > 0 &&
      Date.parse(r.ts) <= now
  );
  const native = actual.filter((r) => r.zone === iso);
  const chosen = native.length >= 8 ? native : actual;
  const readings = chosen
    .map((r) => ({
      region: iso,
      value: Math.round(r.mw_actual as number),
      unit: "MW",
      timestamp: new Date(r.ts).toISOString(),
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return despikeLoad(dropHourBoundaryContamination(readings));
}

export function historySpanHours(history: DemandReading[]): number {
  if (history.length < 2) return history.length;
  const t0 = Date.parse(history[0].timestamp);
  const t1 = Date.parse(history[history.length - 1].timestamp);
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) return history.length;
  return Math.max(1, Math.round((t1 - t0) / 3_600_000));
}
