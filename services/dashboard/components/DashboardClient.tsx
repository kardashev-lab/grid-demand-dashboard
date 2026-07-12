"use client";

// root dashboard component - polls /api/demand + /api/demand/history and lays out the
// hero, treemap, coverage map, detail panel, and trend chart. Initial data comes from
// the server component (app/page.tsx), which reads the in-memory store directly (no
// network hop) so the first paint already has real numbers, not an empty shell.

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { DemandChart } from './DemandChart';
import { TreemapPanel } from './TreemapPanel';
import { DetailPanel } from './DetailPanel';
import { GridHero } from './GridHero';
import type { DemandMap, HistoryMap } from '@/lib/types';
import { localTimeZoneAbbr } from '@/lib/time';

// react-simple-maps manipulates SVG DOM extensively and isn't worth SSR-ing (the
// real GEO-relevant content -- actual MW numbers -- already renders in GridHero/
// TreemapPanel/DetailPanel/DemandChart as plain text).
const RegionMap = dynamic(() => import('./RegionMap').then((m) => m.RegionMap), { ssr: false });

// 5-minute poll: CAISO/ERCOT/MISO/NYISO now publish 5-min native data
const POLL_MS = 300_000;

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('API error');
    return r.json();
  });

interface Props {
  initialDemand?: DemandMap;
  initialHistory?: HistoryMap;
}

export default function DashboardClient({ initialDemand, initialHistory }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  // Always starts null (not new Date()): computing a timestamp in a useState
  // initializer runs once at SSR time and again at hydration, producing two
  // different values and a hydration text mismatch. The effect below sets it
  // client-only, after hydration completes.
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const userClearedSelection = useRef(false);

  const { data: demand, error: demandError } = useSWR<DemandMap>('/api/demand', fetcher, {
    refreshInterval: POLL_MS,
    fallbackData: initialDemand,
  });
  const { data: history, error: historyError } = useSWR<HistoryMap>(
    '/api/demand/history',
    fetcher,
    { refreshInterval: POLL_MS, fallbackData: initialHistory }
  );

  const connected = !demandError && !historyError;
  const demandMap = demand ?? {};
  const historyMap = history ?? {};

  useEffect(() => {
    if (demand) setLastUpdated(new Date());
  }, [demand]);

  useEffect(() => {
    if (selected) return;
    if (userClearedSelection.current) return;
    const top = Object.entries(demandMap).sort(([, a], [, b]) => b.value - a.value)[0]?.[0];
    if (top) setSelected(top);
  }, [demandMap, selected]);

  const hasData = Object.keys(demandMap).length > 0;

  const trendRegions = useMemo(() => {
    const top = Object.entries(demandMap)
      .sort(([, a], [, b]) => b.value - a.value)
      .map(([k]) => k);
    if (!selected) return top.slice(0, 5);
    return Array.from(new Set([selected, ...top])).slice(0, 5);
  }, [demandMap, selected]);

  return (
    <div className="app">
      <div className="ambient" aria-hidden>
        <div className="ambient__orb ambient__orb--sky" />
        <div className="ambient__orb ambient__orb--amber" />
      </div>

      <GridHero
        demand={demandMap}
        history={historyMap}
        lastUpdated={lastUpdated}
        connected={connected}
      />

      <main className="main">
        {hasData ? (
          <>
            <section className="panel panel--featured">
              <div className="panel-head">
                <div>
                  <h2>Magnitude</h2>
                  <p className="panel-sub">Tile area is proportional to current load. Click any tile.</p>
                </div>
              </div>
              <TreemapPanel demand={demandMap} selected={selected} onSelect={setSelected} />
            </section>

            <section className="map-detail-grid">
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Coverage</h2>
                    <p className="panel-sub">Hover any state. Click to drill in.</p>
                  </div>
                  {selected && (
                    <button
                      className="clear-btn"
                      onClick={() => {
                        userClearedSelection.current = true;
                        setSelected(null);
                      }}
                    >
                      Clear selection
                    </button>
                  )}
                </div>
                <RegionMap demand={demandMap} selected={selected} onSelect={setSelected} />
              </div>
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Detail</h2>
                    <p className="panel-sub">Selected balancing authority</p>
                  </div>
                </div>
                <DetailPanel
                  region={selected}
                  data={selected ? demandMap[selected] ?? null : null}
                  history={selected ? historyMap[selected] : undefined}
                />
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Trends</h2>
                  <p className="panel-sub">
                    {trendRegions.length > 0
                      ? `5-min · ${trendRegions.join(' · ')} · ${localTimeZoneAbbr()}`
                      : 'Awaiting data…'}
                  </p>
                </div>
              </div>
              <DemandChart history={historyMap} regions={trendRegions} />
            </section>
          </>
        ) : (
          <div className="empty-state">
            <img
              className="empty-state__img"
              src="/images/hero-substation.jpg"
              alt=""
              loading="lazy"
              decoding="async"
            />
            <div className="empty-state__content">
              <p className="empty-state__title">Waiting for data…</p>
              <p className="empty-state__hint">The poller backfills on boot, check back in a moment.</p>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          Data via{' '}
          <a href="https://www.eia.gov/opendata/" target="_blank" rel="noopener noreferrer">EIA Open Data</a>
          {' · '}
          <a href="https://kardashevlabs.org" target="_blank" rel="noopener noreferrer">Kardashev Labs</a>
          {' · '}Use this data in Python:{' '}
          <a href="https://pypi.org/project/kardashev/" target="_blank" rel="noopener noreferrer">pip install kardashev</a>
        </p>
      </footer>
    </div>
  );
}
