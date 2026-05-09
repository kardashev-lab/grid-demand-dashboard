
import { useState, useEffect, useCallback } from 'react';
import { DemandCard } from './components/DemandCard';
import { DemandChart } from './components/DemandChart';
import { DemandMap, HistoryMap } from './types';
import './index.css';

const REGIONS = ['CAISO', 'ERCOT', 'PJM'];
const POLL_MS = 10_000;

export default function App() {
  const [demand, setDemand] = useState<DemandMap>({});
  const [history, setHistory] = useState<HistoryMap>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connected, setConnected] = useState(true);

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

  const hasData = Object.keys(demand).length > 0;

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="header-brand">
            <span className={`live-dot ${connected ? 'live-dot--on' : 'live-dot--off'}`} />
            <h1>Grid Demand Dashboard</h1>
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
        <div className="cards-grid">
          {REGIONS.map((r) => (
            <DemandCard key={r} region={r} data={demand[r] ?? null} />
          ))}
        </div>

        {hasData && (
          <div className="chart-card">
            <DemandChart history={history} />
          </div>
        )}

        {!hasData && (
          <div className="empty-state">
            <p>Waiting for data from fetchers…</p>
          </div>
        )}
      </main>
    </div>
  );
}
