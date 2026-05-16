// root dashboard component - polls the aggregator API and lays out the
// KPI strip, treemap, coverage map, detail panel, and trend chart.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DemandChart } from './components/DemandChart';
import { RegionMap } from './components/RegionMap';
import { KpiStrip } from './components/KpiStrip';
import { TreemapPanel } from './components/TreemapPanel';
import { DetailPanel } from './components/DetailPanel';
import { DemandMap, HistoryMap } from './types';
import { REGIONS } from './regions';
import './index.css';

// 10 minutes between polls — EIA only updates hourly so no point hammering it
const POLL_MS = 600_000;

export default function App() {
  const [demand, setDemand] = useState<DemandMap>({});
  const [history, setHistory] = useState<HistoryMap>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connected, setConnected] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  // once the user manually clears selection, stop auto-picking the top BA
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

  // auto-select the biggest BA on first load so the detail panel isn't blank
  useEffect(() => {
    if (selected) return;
    if (userClearedSelection.current) return;
    const top = Object.entries(demand).sort(([, a], [, b]) => b.value - a.value)[0]?.[0];
    if (top) setSelected(top);
  }, [demand, selected]);

  const hasData = Object.keys(demand).length > 0;

  // cap to 5 lines max — more than that and the chart turns into spaghetti
  const trendRegions = useMemo(() => {
    const top = Object.entries(demand)
      .sort(([, a], [, b]) => b.value - a.value)
      .map(([k]) => k);
    if (!selected) return top.slice(0, 5);
    return Array.from(new Set([selected, ...top])).slice(0, 5);
  }, [demand, selected]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="header-brand">
            <span className={`live-dot ${connected ? 'live-dot--on' : 'live-dot--off'}`} />
            <div className="header-titles">
              <h1>US Grid Demand</h1>
              <p className="header-sub">{REGIONS.length} balancing authorities · live from EIA</p>
            </div>
          </div>
          <div className="header-status">
            {lastUpdated && (
              <span className="updated-at">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            {!connected && <span className="badge-error">Disconnected</span>}
          </div>
        </div>
      </header>

      <main className="main">
        {hasData ? (
          <>
            <KpiStrip demand={demand} history={history} />

            <section className="panel">
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
                      ? `Hourly · ${trendRegions.join(' · ')}`
                      : 'Awaiting data…'}
                  </p>
                </div>
              </div>
              <DemandChart history={history} regions={trendRegions} />
            </section>
          </>
        ) : (
          <div className="empty-state">
            <p>Waiting for data from fetchers…</p>
          </div>
        )}
      </main>
    </div>
  );
}
