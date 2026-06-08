import { useEffect, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { DemandMap } from '../types';
import { ISO_BY_FIPS, REGION_COLORS } from '../regions';

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
  const [pinned, setPinned] = useState<HoverInfo | null>(null);

  useEffect(() => {
    if (!selected) setPinned(null);
  }, [selected]);

  const active = hover ?? pinned;

  const showInfo = (stateName: string, iso: string | null, x = 0, y = 0) => ({
    stateName,
    iso,
    x,
    y,
  });

  return (
    <div className="map-wrap">
      <div className="map-container" style={{ touchAction: 'manipulation' }}>
        <ComposableMap
          projection="geoAlbersUsa"
          width={780}
          height={460}
          style={{ width: '100%', height: 'auto' }}
        >
          <Geographies geography={TOPO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const fips = String(geo.id ?? '').padStart(2, '0');
                const iso = ISO_BY_FIPS[fips] ?? null;
                const fill = iso ? REGION_COLORS[iso] : '#1f2937';
                const stateName = String(geo.properties.name ?? '');
                const isInSelected = iso !== null && iso === selected;
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
                      setHover(showInfo(stateName, iso, e.clientX, e.clientY));
                    }}
                    onMouseMove={(e: React.MouseEvent<SVGPathElement>) => {
                      setHover((prev) => prev && { ...prev, x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => {
                      if (!iso) return;
                      onSelect(iso);
                      const info = showInfo(stateName, iso);
                      setPinned((prev) => (prev?.iso === iso ? null : info));
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {active && (
          <div
            className={`map-tooltip${pinned && !hover ? ' map-tooltip--pinned' : ''}`}
            style={
              pinned && !hover
                ? { borderColor: pinned.iso ? REGION_COLORS[pinned.iso] : '#475569' }
                : {
                    left: active.x + 12,
                    top: active.y + 12,
                    borderColor: active.iso ? REGION_COLORS[active.iso] : '#475569',
                  }
            }
          >
            <div className="map-tooltip-state">{active.stateName}</div>
            {active.iso ? (
              <>
                <div className="map-tooltip-iso" style={{ color: REGION_COLORS[active.iso] }}>
                  {active.iso}
                </div>
                {demand[active.iso] ? (
                  <div className="map-tooltip-value">
                    {demand[active.iso].value.toLocaleString()} MW
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
