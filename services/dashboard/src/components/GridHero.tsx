// full-bleed hero — title, live status, and headline KPIs over transmission photo

import { DemandMap, HistoryMap } from '../types';
import { REGION_COLORS, REGIONS } from '../regions';

interface Props {
  demand: DemandMap;
  history: HistoryMap;
  lastUpdated: Date | null;
  connected: boolean;
}

export function GridHero({ demand, history, lastUpdated, connected }: Props) {
  const entries = Object.entries(demand);
  const total = entries.reduce((s, [, r]) => s + r.value, 0);
  const live = entries.length;
  const hasData = live > 0;

  const movers = entries
    .map(([region, r]) => {
      const h = history[region];
      if (!h || h.length < 2) return null;
      const prev = h[h.length - 2].value;
      if (!prev) return null;
      return { region, delta: ((r.value - prev) / prev) * 100 };
    })
    .filter((m): m is { region: string; delta: number } => !!m);
  const topMover = movers.slice().sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];

  const sorted = entries.slice().sort(([, a], [, b]) => b.value - a.value);
  const peak = sorted[0];
  const low = sorted[sorted.length - 1];

  return (
    <section className="grid-hero">
      <div className="grid-hero__bg" aria-hidden>
        <img
          className="grid-hero__photo"
          src="/images/hero-transmission.jpg"
          alt=""
          loading="eager"
          decoding="async"
        />
        <div className="grid-hero__shade" />
      </div>

      <div className="grid-hero__content">
        <span className="grid-hero__badge">
          <span className={`live-dot ${connected ? 'live-dot--on' : 'live-dot--off'}`} />
          {connected ? 'Live' : 'Disconnected'} · {REGIONS.length} balancing authorities · EIA hourly
        </span>

        {hasData ? (
          <>
            <h1 className="grid-hero__title">
              <span className="grid-hero__accent">{(total / 1000).toFixed(1)} GW</span>
              {' '}flowing across the US grid
            </h1>
            <p className="grid-hero__sub">
              {total.toLocaleString()} MW · {live}/{REGIONS.length} BAs reporting
              {lastUpdated && (
                <> · Updated {lastUpdated.toLocaleTimeString()}</>
              )}
            </p>

            <div className="grid-hero__pills">
              {peak && (
                <div className="grid-hero__pill">
                  <span className="grid-hero__pill-value" style={{ color: REGION_COLORS[peak[0]] }}>
                    {peak[0]}
                  </span>
                  <span className="grid-hero__pill-label">Peak · {peak[1].value.toLocaleString()} MW</span>
                </div>
              )}
              {topMover && (
                <div className="grid-hero__pill">
                  <span className="grid-hero__pill-value" style={{ color: REGION_COLORS[topMover.region] }}>
                    {topMover.region}
                  </span>
                  <span className={`grid-hero__pill-label ${topMover.delta > 0 ? 'up' : topMover.delta < 0 ? 'down' : ''}`}>
                    {topMover.delta > 0 ? '▲' : topMover.delta < 0 ? '▼' : '–'}{' '}
                    {Math.abs(topMover.delta).toFixed(2)}% vs prev hour
                  </span>
                </div>
              )}
              {low && peak && low[0] !== peak[0] && (
                <div className="grid-hero__pill">
                  <span className="grid-hero__pill-value" style={{ color: REGION_COLORS[low[0]] }}>
                    {low[0]}
                  </span>
                  <span className="grid-hero__pill-label">Smallest · {low[1].value.toLocaleString()} MW</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <h1 className="grid-hero__title">
              US Grid <span className="grid-hero__accent">Demand</span>
            </h1>
            <p className="grid-hero__sub">
              Real-time electricity load across CAISO, ERCOT, PJM, MISO, and 11 more balancing authorities.
              Waiting for fetchers…
            </p>
          </>
        )}
      </div>
    </section>
  );
}
