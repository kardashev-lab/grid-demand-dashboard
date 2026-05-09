// connectNulls keeps the line drawn through gaps when a fetcher was temporarily down

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
import { HistoryMap } from '../types';

interface Props {
  history: HistoryMap;
}

const COLORS: Record<string, string> = {
  CAISO: '#3b82f6',
  ERCOT: '#10b981',
  PJM: '#f59e0b',
};

type ChartPoint = Record<string, string | number>;

export function DemandChart({ history }: Props) {
  // Merge by timestamp key; keep last 20 unique timestamps
  const timeMap = new Map<string, ChartPoint>();

  for (const [region, readings] of Object.entries(history)) {
    for (const r of readings) {
      const key = new Date(r.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const point = timeMap.get(key) ?? { time: key };
      point[region] = r.value;
      timeMap.set(key, point);
    }
  }

  const data = Array.from(timeMap.values()).slice(-20);
  const regions = Object.keys(history);

  const formatY = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);

  return (
    <div className="chart-wrap">
      <p className="chart-title">Demand History — last 20 readings per region</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatY}
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: 13,
            }}
            formatter={(v: number) => [`${v.toLocaleString()} MW`]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }}
          />
          {regions.map((r) => (
            <Line
              key={r}
              type="monotone"
              dataKey={r}
              stroke={COLORS[r] ?? '#6b7280'}
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
