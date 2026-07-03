// magnitude treemap - tile area is proportional to current MW, click to select.

import { Treemap, ResponsiveContainer } from 'recharts';
import { DemandMap } from '../types';
import { REGION_COLORS } from '../regions';

interface Props {
  demand: DemandMap;
  selected: string | null;
  onSelect: (region: string) => void;
}

interface TreemapNode {
  name: string;
  size: number;
  color: string;
}

export function TreemapPanel({ demand, selected, onSelect }: Props) {
  // sort descending so the largest BA gets the biggest tile in the top-left
  const data: TreemapNode[] = Object.entries(demand)
    .map(([region, r]) => ({
      name: region,
      size: r.value,
      color: REGION_COLORS[region] ?? '#6b7280',
    }))
    .sort((a, b) => b.size - a.size);

  return (
    <div className="treemap-wrap">
      <ResponsiveContainer width="100%" height={300}>
        <Treemap
          data={data}
          dataKey="size"
          stroke="#0a0f1e"
          aspectRatio={4 / 3}
          isAnimationActive={false}
          // custom tile so we control fill, label, and click behaviour
          content={
            ((p: TileProps) => (
              <Tile
                {...p}
                selected={selected}
                onSelect={onSelect}
              />
            )) as unknown as React.ReactElement
          }
        />
      </ResponsiveContainer>
    </div>
  );
}

interface TileProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  size?: number;
  color?: string;
  index?: number;
  depth?: number;
  selected?: string | null;
  onSelect?: (region: string) => void;
}

function Tile(props: TileProps) {
  const { x = 0, y = 0, width = 0, height = 0, name, size, color, depth, selected, onSelect } = props;
  // recharts renders a root node at depth 0 that wraps everything, skip it
  if (depth === 0 || !name || !size) return <g />;

  const isSelected = selected === name;
  // only show text if the tile is big enough, tiny tiles get unreadable fast
  const showLabel = width > 56 && height > 28;
  const showValue = width > 80 && height > 48;

  return (
    <g style={{ cursor: 'pointer' }} onClick={() => onSelect && onSelect(name)}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          fillOpacity: isSelected ? 1 : 0.78,
          stroke: isSelected ? '#f8fafc' : '#0a0f1e',
          strokeWidth: isSelected ? 2 : 1,
        }}
      />
      {showLabel && (
        <text
          x={x + 10}
          y={y + 20}
          fill="#0a0f1e"
          fontWeight={700}
          fontSize={Math.min(15, Math.max(11, width / 9))}
          style={{ pointerEvents: 'none' }}
        >
          {name}
        </text>
      )}
      {showValue && (
        <text
          x={x + 10}
          y={y + 38}
          fill="rgba(10,15,30,0.7)"
          fontSize={11}
          style={{ pointerEvents: 'none' }}
        >
          {size.toLocaleString()} MW
        </text>
      )}
    </g>
  );
}
