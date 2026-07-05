// hourly trend chart, filtered to a few BAs so it's readable

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { HistoryMap } from "@/lib/types";
import { REGION_COLORS } from "@/lib/regions";

interface Props {
  history: HistoryMap;
  regions?: string[];
}

type ChartPoint = Record<string, string | number>;

function bucketLabel(timestamp: string): string {
  const d = new Date(timestamp);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

function fullLabel(timestamp: string): string {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function DemandChart({ history, regions }: Props) {
  const visible = regions ?? Object.keys(history);
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
  // show last 24h: 288 slots at 5-min, 24 slots at hourly, both fit well
  const data = ordered.map((o) => seen.get(o.label)!).slice(-288);

  const formatY = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="time"
            tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }}
            tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 12) - 1)}
          />
          <YAxis
            tickFormatter={formatY}
            tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0b1812',
              border: '1px solid rgba(52,211,153,0.15)',
              borderRadius: '10px',
              color: '#f8fafc',
              fontSize: 13,
            }}
            labelFormatter={(_, payload: ReadonlyArray<{ payload?: ChartPoint }>) => {
              const full = payload?.[0]?.payload?._full;
              return typeof full === 'string' ? full : '';
            }}
            formatter={(v: number) => [`${v.toLocaleString()} MW`]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', paddingTop: 8 }}
          />
          {visible.map((r) => (
            <Line
              key={r}
              type="monotone"
              dataKey={r}
              stroke={REGION_COLORS[r] ?? '#6b7280'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
