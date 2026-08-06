// magnitude treemap - tile area is proportional to current MW, click to select.

import { useMemo } from "react";
import {
  hierarchy,
  treemap,
  treemapSquarify,
  type HierarchyRectangularNode,
} from "d3-hierarchy";
import { ChartFrame } from "kardashev-charts";
import type { DemandMap } from "@/lib/types";
import { REGION_COLORS } from "@/lib/regions";

interface Props {
  demand: DemandMap;
  selected: string | null;
  onSelect: (region: string) => void;
}

interface Leaf {
  name: string;
  size: number;
  color: string;
}

type TreeNode = {
  name: string;
  size?: number;
  color?: string;
  children?: TreeNode[];
};

export function TreemapPanel({ demand, selected, onSelect }: Props) {
  const leaves: Leaf[] = Object.entries(demand)
    .map(([region, r]) => ({
      name: region,
      size: r.value,
      color: REGION_COLORS[region] ?? "#6b7280",
    }))
    .sort((a, b) => b.size - a.size);

  return (
    <div className="treemap-wrap">
      <ChartFrame height={300} theme="substation" minWidth={60}>
        {(size) => (
          <TreemapInner
            leaves={leaves}
            width={size.width}
            height={size.height}
            selected={selected}
            onSelect={onSelect}
          />
        )}
      </ChartFrame>
    </div>
  );
}

function TreemapInner({
  leaves,
  width,
  height,
  selected,
  onSelect,
}: {
  leaves: Leaf[];
  width: number;
  height: number;
  selected: string | null;
  onSelect: (region: string) => void;
}) {
  const nodes = useMemo(() => {
    const rootData: TreeNode = {
      name: "root",
      children: leaves.map((l) => ({
        name: l.name,
        size: l.size,
        color: l.color,
      })),
    };

    const root = hierarchy(rootData)
      .sum((d) => d.size ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    treemap<TreeNode>()
      .tile(treemapSquarify.ratio(4 / 3))
      .size([width, height])
      .paddingInner(1)(root);

    return root.leaves() as HierarchyRectangularNode<TreeNode>[];
  }, [leaves, width, height]);

  return (
    <svg width={width} height={height}>
      {nodes.map((node) => {
        const d = node.data;
        if (!d.name || d.size == null) return null;
        const x = node.x0;
        const y = node.y0;
        const w = node.x1 - node.x0;
        const h = node.y1 - node.y0;
        const isSelected = selected === d.name;
        const showLabel = w > 56 && h > 28;
        const showValue = w > 80 && h > 48;
        return (
          <g
            key={d.name}
            style={{ cursor: "pointer" }}
            onClick={() => onSelect(d.name)}
          >
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              style={{
                fill: d.color ?? "#6b7280",
                fillOpacity: isSelected ? 1 : 0.78,
                stroke: isSelected ? "#f8fafc" : "#0a0f1e",
                strokeWidth: isSelected ? 2 : 1,
              }}
            />
            {showLabel && (
              <text
                x={x + 10}
                y={y + 20}
                fill="#0a0f1e"
                fontWeight={700}
                fontSize={Math.min(15, Math.max(11, w / 9))}
                style={{ pointerEvents: "none" }}
              >
                {d.name}
              </text>
            )}
            {showValue && (
              <text
                x={x + 10}
                y={y + 38}
                fill="rgba(10,15,30,0.7)"
                fontSize={11}
                style={{ pointerEvents: "none" }}
              >
                {d.size.toLocaleString()} MW
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
