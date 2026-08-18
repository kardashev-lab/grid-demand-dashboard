import { useMemo, useState, type MouseEvent } from "react";
import {
  Axis,
  ChartFrame,
  ChartTooltip,
  LineSeries,
  closestIndex,
  clientToViewBoxX,
  createLinearScales,
  padDomain,
} from "kardashev-charts";
import type { HistoryMap } from "@/lib/types";
import { REGION_COLORS } from "@/lib/regions";

interface Props {
  history: HistoryMap;
  regions?: string[];
}

function tickLabel(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

function fullLabel(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function DemandChart({ history, regions }: Props) {
  const visible = regions ?? Object.keys(history);

  const seriesReadings = useMemo(() => {
    return visible.map((region) => ({
      region,
      color: REGION_COLORS[region] ?? "#6b7280",
      readings: history[region] ?? [],
    }));
  }, [history, visible]);

  if (!seriesReadings.some((s) => s.readings.length > 0)) {
    return <div className="chart-wrap" style={{ height: 300 }} />;
  }

  return (
    <div className="chart-wrap">
      <ChartFrame height={300} theme="substation" minWidth={60}>
        {(size) => (
          <DemandInner series={seriesReadings} width={size.width} height={size.height} />
        )}
      </ChartFrame>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          paddingTop: 8,
          fontSize: 12,
          color: "rgba(255,255,255,0.35)",
        }}
      >
        {visible.map((r) => (
          <span key={r} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 2, background: REGION_COLORS[r] ?? "#6b7280" }} />
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}

const CHART_PADDING = { top: 4, right: 16, bottom: 28, left: 42 };

function DemandInner({
  series,
  width,
  height,
}: {
  series: Array<{ region: string; color: string; readings: { value: number; timestamp: string }[] }>;
  width: number;
  height: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const padding = CHART_PADDING;

  const { scales, xs, times, drawn, yTicks, xTicks } = useMemo(() => {
    const times = Array.from(
      new Set(
        series.flatMap((s) => s.readings.map((r) => Date.parse(r.timestamp)))
      )
    ).sort((a, b) => a - b);
    const vals = series.flatMap((s) => s.readings.map((r) => r.value));
    const t0 = times[0] ?? Date.now();
    const t1 = times[times.length - 1] ?? t0 + 1;
    const [lo, hi] = padDomain(
      vals.length ? Math.min(...vals) : 0,
      vals.length ? Math.max(...vals) : 1,
      0.08
    );
    const scales = createLinearScales({
      width,
      height,
      xDomain: [t0, t1],
      yDomain: [lo, hi],
      padding,
    });
    const xs = times.map((t) => scales.x(t));
    const drawn = series.map((s) => ({
      key: s.region,
      color: s.color,
      points: s.readings.map((r) => ({
        x: scales.x(Date.parse(r.timestamp)),
        y: scales.y(r.value),
      })),
    }));
    const tickCount = Math.min(8, Math.max(2, times.length));
    const xTicks = Array.from({ length: tickCount }, (_, i) => {
      const t = t0 + (i / (tickCount - 1)) * (t1 - t0);
      return { value: t, label: tickLabel(t) };
    });
    const formatY = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v)));
    const yTicks = [lo, (lo + hi) / 2, hi].map((v) => ({
      value: v,
      label: formatY(v),
    }));
    return { scales, xs, times, drawn, yTicks, xTicks };
  }, [series, width, height]);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    setHover(closestIndex(xs, clientToViewBoxX(e.currentTarget, e.clientX, width)));
  };

  const hoverT = hover != null ? times[hover] : null;
  const hx = hover != null ? xs[hover] : null;

  return (
    <div style={{ position: "relative", width, height }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <Axis
          x={scales.x}
          y={scales.y}
          width={width}
          height={height}
          padding={padding}
          theme="substation"
          xTicks={xTicks}
          yTicks={yTicks}
          showGrid
        />
        {drawn.map((s) => (
          <LineSeries
            key={s.key}
            points={s.points}
            stroke={s.color}
            strokeWidth={2}
            curve="monotone"
          />
        ))}
        {hx != null && (
          <line
            x1={hx}
            x2={hx}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke="rgba(52,211,153,0.25)"
          />
        )}
      </svg>
      {hoverT != null && hx != null && (
        <div style={{ position: "absolute", left: Math.min(hx + 8, width - 180), top: 8 }}>
          <ChartTooltip
            theme="substation"
            style={{
              background: "#0b1812",
              border: "1px solid rgba(52,211,153,0.15)",
              borderRadius: 10,
            }}
          >
            <div style={{ marginBottom: 6, color: "rgba(255,255,255,0.5)" }}>
              {fullLabel(hoverT)}
            </div>
            {series.map((s) => {
              const v = nearestValue(s.readings, hoverT, 15 * 60_000);
              if (v == null) return null;
              return (
                <div key={s.region} style={{ display: "flex", gap: 8, marginBottom: 2 }}>
                  <span style={{ width: 8, height: 2, background: s.color, marginTop: 7 }} />
                  <span style={{ color: "rgba(255,255,255,0.55)", minWidth: 48 }}>{s.region}</span>
                  <span>{v.toLocaleString()} MW</span>
                </div>
              );
            })}
          </ChartTooltip>
        </div>
      )}
    </div>
  );
}

function nearestValue(
  readings: Array<{ value: number; timestamp: string }>,
  t: number,
  maxDt: number
): number | null {
  let best: number | null = null;
  let bestDt = Infinity;
  for (const r of readings) {
    const dt = Math.abs(Date.parse(r.timestamp) - t);
    if (dt < bestDt) {
      bestDt = dt;
      best = r.value;
    }
  }
  return bestDt <= maxDt ? best : null;
}
