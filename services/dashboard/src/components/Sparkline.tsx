import { DemandReading } from '../types';

interface Props {
  readings: DemandReading[];
  color: string;
  width?: number;
  height?: number;
}

// inline svg sparkline, no recharts needed
export function Sparkline({ readings, color, width = 140, height = 40 }: Props) {
  if (readings.length < 2) {
    return <div className="sparkline-empty" style={{ width, height }} />;
  }

  const values = readings.map((r) => r.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // avoid division by zero when all readings are identical
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // closed polygon that fills the area under the sparkline for visual weight
  const areaPath = `M0,${height} L${points
    .split(' ')
    .map((p) => p.replace(',', ' '))
    .join(' L')} L${width},${height} Z`;

  // gradient id needs to be unique per color so multiple sparklines don't clash
  const id = `spark-grad-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="sparkline" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
