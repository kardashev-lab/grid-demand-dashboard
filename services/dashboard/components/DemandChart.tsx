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

type ChartPoint = Record<string, string | number>;

function bucketLabel(timestamp: string): string {
  const d = new Date(timestamp);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

function fullLabel(timestamp: string): string {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function DemandChart({ history, regions }: Props) {
  const visible = regions ?? Object.keys(history);

  const { data, labels } = useMemo(() => {
    const visibleSet = new Set(visible);
    const ordered: { sortKey: number; label: string; full: string }[] = [];
    const seen = new Map<string, ChartPoint>();

    for (const [region, readings] of Object.entries(history)) {
      if (!visibleSet.has(region)) continue;
      for (const r of readings) {
        const sortKey = new Date(r.timestamp).getTime();
        const label = bucketLabel(r.timestamp);
        let point = seen.get(label);
        if (!point) {
          point = { time: label, _full: fullLabel(r.timestamp) };
          seen.set(label, point);
          ordered.push({ sortKey, label, full: point._full as string });
        }
        point[region] = r.value;
      }
    }

    ordered.sort((a, b) => a.sortKey - b.sortKey);
    const data = ordered.map((o) => seen.get(o.label)!).slice(-288);
    return { data, labels: visible };
  }, [history, visible]);

  if (!data.length) {
    return <div className="chart-wrap" style={{ height: 300 }} />;
  }

  return (
    <div className="chart-wrap">
      <ChartFrame height={300} theme="substation" minWidth={60}>
        {(size) => (
          <DemandInner data={data} labels={labels} width={size.width} height={size.height} />
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
        {labels.map((r) => (
          <span key={r} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 2, background: REGION_COLORS[r] ?? "#6b7280" }} />
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}

function DemandInner({
  data,
  labels,
  width,
  height,
}: {
  data: ChartPoint[];
  labels: string[];
  width: number;
  height: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const padding = { top: 4, right: 16, bottom: 28, left: 42 };

  const { scales, xs, series, yTicks, xTicks } = useMemo(() => {
    const n = data.length;
    const vals: number[] = [];
    for (const d of data) {
      for (const r of labels) {
        const v = d[r];
        if (typeof v === "number") vals.push(v);
      }
    }
    const [lo, hi] = padDomain(
      vals.length ? Math.min(...vals) : 0,
      vals.length ? Math.max(...vals) : 1,
      0.08
    );
    const scales = createLinearScales({
      width,
      height,
      xDomain: [0, Math.max(n - 1, 1)],
      yDomain: [lo, hi],
      padding,
    });
    const xs = data.map((_, i) => scales.x(i));
    const series = labels.map((r) => ({
      key: r,
      color: REGION_COLORS[r] ?? "#6b7280",
      points: data.map((d, i) => ({
        x: scales.x(i),
        y: typeof d[r] === "number" ? scales.y(d[r] as number) : null,
      })),
    }));
    const tickCount = Math.min(12, n);
    const xTicks = Array.from({ length: tickCount }, (_, i) => {
      const idx = tickCount === 1 ? 0 : Math.round((i / (tickCount - 1)) * (n - 1));
      return { value: idx, label: String(data[idx].time) };
    });
    const formatY = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v)));
    const yTicks = [lo, (lo + hi) / 2, hi].map((v) => ({
      value: v,
      label: formatY(v),
    }));
    return { scales, xs, series, yTicks, xTicks };
  }, [data, labels, width, height]);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    setHover(closestIndex(xs, clientToViewBoxX(e.currentTarget, e.clientX, width)));
  };

  const h = hover != null ? data[hover] : null;
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
        {series.map((s) => (
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
      {h && hx != null && (
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
              {String(h._full)}
            </div>
            {labels.map((r) => {
              const v = h[r];
              if (typeof v !== "number") return null;
              return (
                <div key={r} style={{ display: "flex", gap: 8, marginBottom: 2 }}>
                  <span style={{ width: 8, height: 2, background: REGION_COLORS[r] ?? "#6b7280", marginTop: 7 }} />
                  <span style={{ color: "rgba(255,255,255,0.55)", minWidth: 48 }}>{r}</span>
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
