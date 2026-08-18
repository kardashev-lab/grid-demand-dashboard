// detail view for the selected BA: current MW, hour-over-hour delta, sparkline.

import { historySpanHours } from "@/lib/demandReadings";
import { REGION_COLORS, REGION_LABELS } from "@/lib/regions";
import type { DemandReading } from "@/lib/types";
import { Sparkline } from "./Sparkline";

interface Props {
  region: string | null;
  data: DemandReading | null;
  history?: DemandReading[];
}

// used to tag regions as ISO/RTO vs non-ISO balancing authorities in the UI
const ISO_SET = new Set(['CAISO', 'ERCOT', 'PJM', 'MISO', 'NYISO', 'ISONE', 'SPP']);

export function DetailPanel({ region, data, history }: Props) {
  if (!region) {
    return (
      <div className="detail detail--empty">
        <p>Select a tile or state to drill in.</p>
      </div>
    );
  }

  const color = REGION_COLORS[region] ?? '#6b7280';
  const label = REGION_LABELS[region] ?? region;
  const isIso = ISO_SET.has(region);

  // hour-over-hour percent change, only show if we have at least 2 data points
  let delta: number | null = null;
  if (history && history.length >= 2) {
    const prev = history[history.length - 2].value;
    const curr = history[history.length - 1].value;
    if (prev) delta = ((curr - prev) / prev) * 100;
  }

  const max = history && history.length ? Math.max(...history.map((h) => h.value)) : null;
  const min = history && history.length ? Math.min(...history.map((h) => h.value)) : null;

  return (
    <div className="detail" style={{ '--accent': color } as React.CSSProperties}>
      <div className="detail-head">
        <span className="detail-dot" style={{ background: color }} />
        <div className="detail-titles">
          <div className="detail-region">{region}</div>
          <div className="detail-label">{label}</div>
        </div>
        <span className={`detail-tag ${isIso ? 'detail-tag--iso' : 'detail-tag--ba'}`}>
          {isIso ? 'ISO/RTO' : 'Non-ISO BA'}
        </span>
      </div>

      {data ? (
        <>
          <div className="detail-value">
            <span className="detail-num">{data.value.toLocaleString()}</span>
            <span className="detail-unit">MW</span>
          </div>

          {delta !== null && (
            <div className={`detail-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}`}>
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '–'} {Math.abs(delta).toFixed(2)}%
              <span className="detail-delta-label">vs previous hour</span>
            </div>
          )}

          {history && history.length >= 2 && (
            <div className="detail-spark">
              <div className="detail-spark-meta">
                <span>Last {historySpanHours(history)} hours</span>
                {min !== null && max !== null && (
                  <span>
                    {min.toLocaleString()} - {max.toLocaleString()} MW
                  </span>
                )}
              </div>
              <Sparkline readings={history} color={color} width={320} height={80} />
            </div>
          )}

          <div className="detail-foot">
            Updated {new Date(data.timestamp).toLocaleTimeString()}
          </div>
        </>
      ) : (
        <div className="detail-awaiting">Awaiting data…</div>
      )}
    </div>
  );
}
