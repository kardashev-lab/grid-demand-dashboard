import { useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { DemandMap } from '../types';
import { ISO_BY_FIPS, REGION_COLORS } from '../regions';

// pre-built TopoJSON from us-atlas — saves us from bundling our own geo data
const TOPO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

interface Props {
  demand: DemandMap;
  selected: string | null;
  onSelect: (region: string) => void;
}

interface HoverInfo {
  stateName: string;
  iso: string | null;
  x: number;
  y: number;
}

export function RegionMap({ demand, selected, onSelect }: Props) {
  const [hover, setHover] = useState<HoverInfo | null>(null);

  return (
    <div className="map-wrap">
      <div className="map-container">
        <ComposableMap
          projection="geoAlbersUsa"
          width={780}
          height={460}
          style={{ width: '100%', height: 'auto' }}
        >
          <Geographies geography={TOPO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                // geo.id is the FIPS code but sometimes comes without the leading zero
                const fips = String(geo.id ?? '').padStart(2, '0');
                const iso = ISO_BY_FIPS[fips] ?? null;
                const fill = iso ? REGION_COLORS[iso] : '#1f2937';
                const stateName = String(geo.properties.name ?? '');
                const isInSelected = iso !== null && iso === selected;
                // dim other BAs when one is selected so the active one pops
                const dimmed = selected !== null && !isInSelected && iso !== null;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke={isInSelected ? '#f8fafc' : '#0a0f1e'}
                    strokeWidth={isInSelected ? 1.5 : 0.5}
                    style={{
                      default: {
                        outline: 'none',
                        opacity: iso ? (dimmed ? 0.35 : isInSelected ? 1 : 0.85) : 0.3,
                        transition: 'opacity 0.2s, stroke-width 0.2s',
                      },
                      hover: {
                        outline: 'none',
                        opacity: 1,
                        cursor: iso ? 'pointer' : 'default',
                      },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(e: React.MouseEvent<SVGPathElement>) => {
                      setHover({ stateName, iso, x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e: React.MouseEvent<SVGPathElement>) => {
                      setHover((prev) => prev && { ...prev, x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => {
                      if (iso) onSelect(iso);
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {hover && (
          <div
            className="map-tooltip"
            style={{
              left: hover.x + 12,
              top: hover.y + 12,
              borderColor: hover.iso ? REGION_COLORS[hover.iso] : '#475569',
            }}
          >
            <div className="map-tooltip-state">{hover.stateName}</div>
            {hover.iso ? (
              <>
                <div className="map-tooltip-iso" style={{ color: REGION_COLORS[hover.iso] }}>
                  {hover.iso}
                </div>
                {demand[hover.iso] ? (
                  <div className="map-tooltip-value">
                    {demand[hover.iso].value.toLocaleString()} MW
                  </div>
                ) : (
                  <div className="map-tooltip-value muted">awaiting data</div>
                )}
              </>
            ) : (
              <div className="map-tooltip-iso muted">no covered BA</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
