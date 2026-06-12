import { useEffect, useState } from 'react';
import type { EscalationItem, PortfolioDealState } from '../agent/monitor';

// The "always-on" surface: the monitoring agent's view of the whole book, plus
// the escalation queue — the human half of the workforce model.

const HEALTH_LABEL = { healthy: 'Healthy', watch: 'Watch', breach: 'Breach' } as const;

function Delta({ value, badWhenUp, suffix = '' }: { value: number; badWhenUp: boolean; suffix?: string }) {
  if (value === 0) return <span className="pdelta pdelta--flat">·</span>;
  const up = value > 0;
  const bad = up === badWhenUp;
  return (
    <span className={`pdelta ${bad ? 'pdelta--bad' : 'pdelta--good'}`}>
      {up ? '▲' : '▼'} {Math.abs(value)}
      {suffix}
    </span>
  );
}

function timeAgo(t: number, now: number): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

export function PortfolioView({
  rows,
  escalations,
  sweeping,
  lastSweepAt,
  sweepCount,
  onSweepNow,
  onAcknowledge,
  onOpenDeal,
}: {
  rows: PortfolioDealState[];
  escalations: EscalationItem[];
  sweeping: boolean;
  lastSweepAt: number | null;
  sweepCount: number;
  onSweepNow: () => void;
  onAcknowledge: (id: string) => void;
  onOpenDeal: (dealId: string) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const order = { breach: 0, watch: 1, healthy: 2 } as const;
  const sorted = [...rows].sort((a, b) => order[a.health] - order[b.health] || a.name.localeCompare(b.name));
  const open = escalations.filter((e) => e.status === 'open');
  const acked = escalations.filter((e) => e.status === 'acknowledged');

  const stats = [
    { k: 'Deals monitored', v: rows.length, tone: '' },
    { k: 'Healthy', v: rows.filter((r) => r.health === 'healthy').length, tone: 'good' },
    { k: 'Watch', v: rows.filter((r) => r.health === 'watch').length, tone: 'warn' },
    { k: 'In breach', v: rows.filter((r) => r.health === 'breach').length, tone: 'bad' },
    { k: 'Open escalations', v: open.length, tone: 'accent' },
  ];

  return (
    <section className="portfolio">
      <header className="portfolio__head">
        <div>
          <h2 className="portfolio__title">Portfolio monitor</h2>
          <p className="portfolio__sub">
            The monitoring agent re-tests every covenant on a cadence and escalates drift to a human.
            Figures are simulated.
          </p>
        </div>
        <div className="portfolio__controls">
          <span className={`monitorchip ${sweeping ? 'monitorchip--live' : ''}`}>
            <span className="status__dot" />
            {sweeping
              ? 'Sweeping…'
              : lastSweepAt
                ? `Sweep #${sweepCount} · ${timeAgo(lastSweepAt, now)}`
                : 'Starting…'}
          </span>
          <button className="btn" onClick={onSweepNow} disabled={sweeping}>
            Sweep now
          </button>
        </div>
      </header>

      <div className="pstats">
        {stats.map((s) => (
          <div className={`pstat ${s.tone ? `pstat--${s.tone}` : ''}`} key={s.k}>
            <span className="pstat__k">{s.k}</span>
            <span className="pstat__v">{s.v}</span>
          </div>
        ))}
      </div>

      <div className="portfolio__grid">
        <div className="ptablewrap">
          <table className="ptable">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Risk</th>
                <th>Leverage</th>
                <th>Int. cov.</th>
                <th>Liquidity</th>
                <th>Covenants</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="ptable__empty">
                    First sweep in progress…
                  </td>
                </tr>
              )}
              {sorted.map((d) => (
                <tr key={d.dealId} className={`ptable__row ptable__row--${d.health}`}>
                  <td>
                    <button className="ptable__deal" onClick={() => onOpenDeal(d.dealId)} title="Open in Credit Analysis">
                      <strong>{d.name}</strong>
                      <span>{d.borrower}</span>
                    </button>
                  </td>
                  <td className="ptable__mono">{d.riskScore}</td>
                  <td className="ptable__mono">
                    {d.leverageX.toFixed(2)}x <Delta value={d.deltas.leverageX} badWhenUp suffix="x" />
                  </td>
                  <td className="ptable__mono">
                    {d.interestCoverageX.toFixed(2)}x <Delta value={d.deltas.interestCoverageX} badWhenUp={false} suffix="x" />
                  </td>
                  <td className="ptable__mono">
                    ${d.liquidity.toFixed(1)}M <Delta value={d.deltas.liquidity} badWhenUp={false} suffix="M" />
                  </td>
                  <td>
                    <span className="covdots">
                      {d.covenants.map((c) => (
                        <span
                          key={c.name}
                          className={`covdot covdot--${c.status}`}
                          title={`${c.name}: ${c.actual} vs ${c.threshold} — ${c.status.toUpperCase()}`}
                        />
                      ))}
                    </span>
                  </td>
                  <td>
                    <span className={`health health--${d.health}`}>{HEALTH_LABEL[d.health]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="queue">
          <div className="queue__head">
            <span className="queue__tag">escalations · needs human</span>
            <span className="queue__count">{open.length}</span>
          </div>
          {open.length === 0 && acked.length === 0 && (
            <p className="queue__empty">Nothing needs review — the agent will escalate covenant drift here.</p>
          )}
          {open.length > 0 && (
            <div className="queue__items">
              {open.map((e) => (
                <div key={e.id} className={`esc esc--${e.severity}`}>
                  <div className="esc__top">
                    <span className="esc__icon">{e.severity === 'critical' ? '■' : '▲'}</span>
                    <strong className="esc__deal">{e.dealName}</strong>
                    <span className="esc__time">{timeAgo(e.at, now)}</span>
                  </div>
                  <p className="esc__reason">{e.reason}</p>
                  <div className="esc__actions">
                    <button className="btn btn--ghost btn--sm" onClick={() => onAcknowledge(e.id)}>
                      Acknowledge
                    </button>
                    <button className="btn btn--sm" onClick={() => onOpenDeal(e.dealId)}>
                      Open deal →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {acked.length > 0 && (
            <div className="queue__acked">
              {acked.map((e) => (
                <div key={e.id} className="esc esc--acked">
                  <span className="esc__icon">✓</span>
                  <span className="esc__reason">
                    {e.dealName} — {e.reason}
                  </span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
