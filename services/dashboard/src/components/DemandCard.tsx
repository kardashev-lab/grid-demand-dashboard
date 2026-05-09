import { DemandReading } from '../types';

interface Props {
  region: string;
  data: DemandReading | null;
}

const LABELS: Record<string, string> = {
  CAISO: 'California ISO',
  ERCOT: 'Texas ERCOT',
  PJM: 'PJM Interconnection',
};

const COLORS: Record<string, string> = {
  CAISO: '#3b82f6',
  ERCOT: '#10b981',
  PJM: '#f59e0b',
};

export function DemandCard({ region, data }: Props) {
  const color = COLORS[region] ?? '#6b7280';
  const label = LABELS[region] ?? region;

  return (
    <div className="demand-card" style={{ '--accent': color } as React.CSSProperties}>
      <div className="card-header">
        <span className="region-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <span className="region-label">{label}</span>
      </div>

      {data ? (
        <>
          <div className="demand-value">
            <span className="value-number">{data.value.toLocaleString()}</span>
            <span className="value-unit">{data.unit}</span>
          </div>
          <div className="card-footer">
            {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </>
      ) : (
        <div className="awaiting">Awaiting data…</div>
      )}
    </div>
  );
}
