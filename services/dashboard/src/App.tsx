// root dashboard component - polls the aggregator API and lays out the
// hero, treemap, coverage map, detail panel, and trend chart.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DemandChart } from './components/DemandChart';
import { RegionMap } from './components/RegionMap';
import { TreemapPanel } from './components/TreemapPanel';
import { DetailPanel } from './components/DetailPanel';
import { GridHero } from './components/GridHero';
import { DemandMap, HistoryMap } from './types';
import './index.css';

// 5-minute poll — CAISO/ERCOT/MISO/NYISO now publish 5-min native data
const POLL_MS = 300_000;

export default function App() {
  const [demand, setDemand] = useState<DemandMap>({});
  const [history, setHistory] = useState<HistoryMap>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connected, setConnected] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const userClearedSelection = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const [dRes, hRes] = await Promise.all([
        fetch('/api/demand'),
        fetch('/api/demand/history'),
      ]);
      if (!dRes.ok || !hRes.ok) throw new Error('API error');
      const [d, h] = await Promise.all([dRes.json(), hRes.json()]);
      setDemand(d);
      setHistory(h);
      setLastUpdated(new Date());
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    if (selected) return;
    if (userClearedSelection.current) return;
    const top = Object.entries(demand).sort(([, a], [, b]) => b.value - a.value)[0]?.[0];
    if (top) setSelected(top);
  }, [demand, selected]);

  const hasData = Object.keys(demand).length > 0;

  const trendRegions = useMemo(() => {
    const top = Object.entries(demand)
      .sort(([, a], [, b]) => b.value - a.value)
      .map(([k]) => k);
    if (!selected) return top.slice(0, 5);
    return Array.from(new Set([selected, ...top])).slice(0, 5);
  }, [demand, selected]);

  return (
    <div className="app">
      <div className="ambient" aria-hidden>
        <div className="ambient__orb ambient__orb--sky" />
        <div className="ambient__orb ambient__orb--amber" />
      </div>

      <GridHero
        demand={demand}
        history={history}
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
              <TreemapPanel demand={demand} selected={selected} onSelect={setSelected} />
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
                <RegionMap demand={demand} selected={selected} onSelect={setSelected} />
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
                  data={selected ? demand[selected] ?? null : null}
                  history={selected ? history[selected] : undefined}
                />
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Trends</h2>
                  <p className="panel-sub">
                    {trendRegions.length > 0
                      ? `5-min · ${trendRegions.join(' · ')}`
                      : 'Awaiting data…'}
                  </p>
                </div>
              </div>
              <DemandChart history={history} regions={trendRegions} />
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
              <p className="empty-state__title">Waiting for data from fetchers…</p>
              <p className="empty-state__hint">Ensure <code>EIA_API_KEY</code> is set and fetchers are running.</p>
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
        </p>
      </footer>
    </div>
  );
}
