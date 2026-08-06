import { Sparkline as KitSparkline } from "kardashev-charts";
import type { DemandReading } from "@/lib/types";

interface Props {
  readings: DemandReading[];
  color: string;
  width?: number;
  height?: number;
}

export function Sparkline({ readings, color, width = 140, height = 40 }: Props) {
  if (readings.length < 2) {
    return <div className="sparkline-empty" style={{ width, height }} />;
  }
  return (
    <KitSparkline
      values={readings.map((r) => r.value)}
      width={width}
      height={height}
      color={color}
      className="sparkline"
    />
  );
}
