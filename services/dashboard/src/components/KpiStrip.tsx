// summary cards across the top: total load, top hourly mover, peak/smallest BA.

import { DemandMap, HistoryMap } from '../types';
import { REGION_COLORS, REGIONS } from '../regions';

interface Props {
  demand: DemandMap;
  history: HistoryMap;
}

export function KpiStrip({ demand, history }: Props) {
  const entries = Object.entries(demand);
  const total = entries.reduce((s, [, r]) => s + r.value, 0);
  const live = entries.length;

  // find whichever BA moved the most (up or down) in the last hour
  const movers = entries
    .map(([region, r]) => {
      const h = history[region];
      if (!h || h.length < 2) return null;
      const prev = h[h.length - 2].value;
      if (!prev) return null;
      return { region, delta: ((r.value - prev) / prev) * 100 };
    })
    .filter((m): m is { region: string; delta: number } => !!m);
  const topMover = movers.slice().sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];

  // sort so we can grab the highest and lowest BAs for the summary cards
  const sorted = entries.slice().sort(([, a], [, b]) => b.value - a.value);
  const peak = sorted[0];
  const low = sorted[sorted.length - 1];

  return (
    <div className="kpi-strip">
      <div className="kpi">
        <div className="kpi-label">Total Load</div>
        <div className="kpi-value">
          {(total / 1000).toFixed(1)}
          <span className="kpi-unit">GW</span>
        </div>
        <div className="kpi-foot">
          {total.toLocaleString()} MW · {live}/{REGIONS.length} BAs live
        </div>
      </div>

      {topMover ? (
        <div className="kpi">
          <div className="kpi-label">Top Mover</div>
          <div className="kpi-value" style={{ color: REGION_COLORS[topMover.region] }}>
            {topMover.region}
          </div>
          <div className={`kpi-foot ${topMover.delta > 0 ? 'up' : topMover.delta < 0 ? 'down' : ''}`}>
            {topMover.delta > 0 ? '▲' : topMover.delta < 0 ? '▼' : '–'} {Math.abs(topMover.delta).toFixed(2)}% vs prev hour
          </div>
        </div>
      ) : (
        <div className="kpi kpi--muted">
          <div className="kpi-label">Top Mover</div>
          <div className="kpi-value">—</div>
          <div className="kpi-foot">need 2+ hourly samples</div>
        </div>
      )}

      {peak && (
        <div className="kpi">
          <div className="kpi-label">Peak Region</div>
          <div className="kpi-value" style={{ color: REGION_COLORS[peak[0]] }}>
            {peak[0]}
          </div>
          <div className="kpi-foot">{peak[1].value.toLocaleString()} MW</div>
        </div>
      )}

      {low && peak && low[0] !== peak[0] && (
        <div className="kpi">
          <div className="kpi-label">Smallest BA</div>
          <div className="kpi-value" style={{ color: REGION_COLORS[low[0]] }}>
            {low[0]}
          </div>
          <div className="kpi-foot">{low[1].value.toLocaleString()} MW</div>
        </div>
      )}
    </div>
  );
}
