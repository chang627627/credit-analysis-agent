// ---------------------------------------------------------------------------
// Portfolio monitoring — the "always-on" half of the agentic workforce.
//
// sweepPortfolio() is an async generator (same pattern as runAgent): each sweep
// reviews every deal in the book, drifting its key metrics with a deterministic
// random walk (simulating new quarterly figures), re-testing covenants, and
// emitting typed MonitorEvents. Deals whose covenants breach — or drift into
// thin headroom — raise escalation items for a human to review.
//
// Like the analysis loop, it never imports React; useMonitor reduces the events.
// ---------------------------------------------------------------------------

import type { Deal } from './mockData';
import { sleep, uid } from './util';

export type CovenantHealth = 'pass' | 'watch' | 'breach';
export type DealHealth = 'healthy' | 'watch' | 'breach';

export interface MonitorCovenant {
  name: string;
  threshold: string;
  actual: string;
  status: CovenantHealth;
}

export interface PortfolioDealState {
  dealId: string;
  name: string;
  borrower: string;
  riskScore: number;
  leverageX: number;
  interestCoverageX: number;
  fixedChargeCoverageX: number;
  liquidity: number;
  covenants: MonitorCovenant[];
  health: DealHealth;
  /** change vs the previous sweep (0 on the first review) */
  deltas: { leverageX: number; interestCoverageX: number; liquidity: number };
  lastSweepId: number;
}

export interface EscalationItem {
  id: string;
  /** dedup key — one open item per deal+covenant+severity */
  key: string;
  dealId: string;
  dealName: string;
  severity: 'warning' | 'critical';
  reason: string;
  at: number;
  status: 'open' | 'acknowledged';
}

export type MonitorEvent =
  | { type: 'sweep_started'; sweepId: number }
  | { type: 'deal_reviewed'; sweepId: number; state: PortfolioDealState }
  | { type: 'escalation'; item: EscalationItem }
  | { type: 'sweep_finished'; sweepId: number };

export interface MonitorContext {
  readonly speed: number;
  signal?: AbortSignal;
}

// --- deterministic drift ----------------------------------------------------

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Walk step in [-magnitude, +magnitude], deterministic per (deal, sweep, salt). */
function step(dealId: string, sweepId: number, salt: number, magnitude: number): number {
  return (rand(hash(dealId) + sweepId, salt) * 2 - 1) * magnitude;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

// --- covenant tests (shared thresholds across the book) ----------------------

function maxLimit(v: number, breach: number, watch: number): CovenantHealth {
  return v > breach ? 'breach' : v > watch ? 'watch' : 'pass';
}
function minLimit(v: number, breach: number, watch: number): CovenantHealth {
  return v < breach ? 'breach' : v < watch ? 'watch' : 'pass';
}

export async function* sweepPortfolio(
  deals: Deal[],
  prev: Map<string, PortfolioDealState>,
  sweepId: number,
  ctx: MonitorContext,
): AsyncGenerator<MonitorEvent> {
  yield { type: 'sweep_started', sweepId };

  for (const deal of deals) {
    await sleep(240 / ctx.speed, ctx.signal);

    const p = prev.get(deal.id);
    const f = deal.financials;
    const baseLev = p?.leverageX ?? f.leverageX;
    const baseIc = p?.interestCoverageX ?? f.interestCoverageX;
    const baseFcc = p?.fixedChargeCoverageX ?? f.fixedChargeCoverageX;
    const baseLiq = p?.liquidity ?? f.liquidity;
    const baseRisk = p?.riskScore ?? deal.risk.score;

    // riskier credits drift adversely; healthier ones hold steadier
    const bias = (baseRisk - 50) / 100; // ≈ -0.45 … +0.45

    const lev = clamp(r2(baseLev + step(deal.id, sweepId, 1, 0.14) + bias * 0.05), 1.2, 7.5);
    const ic = clamp(r2(baseIc + step(deal.id, sweepId, 2, 0.12) - bias * 0.04), 0.6, 8);
    const fcc = clamp(r2(baseFcc + step(deal.id, sweepId, 3, 0.05) - bias * 0.02), 0.5, 3);
    const liq = clamp(r1(baseLiq + step(deal.id, sweepId, 4, 1.4) - bias * 0.5), 1, 60);
    const risk = clamp(Math.round(baseRisk + step(deal.id, sweepId, 5, 2.5) + bias * 1.5), 5, 95);

    const covenants: MonitorCovenant[] = [
      { name: 'Max Total Leverage', threshold: '≤ 4.00x', actual: `${lev.toFixed(2)}x`, status: maxLimit(lev, 4.0, 3.7) },
      { name: 'Min Interest Coverage', threshold: '≥ 2.00x', actual: `${ic.toFixed(2)}x`, status: minLimit(ic, 2.0, 2.3) },
      { name: 'Min Fixed-Charge Coverage', threshold: '≥ 1.10x', actual: `${fcc.toFixed(2)}x`, status: minLimit(fcc, 1.1, 1.25) },
      { name: 'Min Liquidity', threshold: '≥ $10.0M', actual: `$${liq.toFixed(1)}M`, status: minLimit(liq, 10, 12.5) },
    ];

    const health: DealHealth = covenants.some((c) => c.status === 'breach')
      ? 'breach'
      : covenants.some((c) => c.status === 'watch')
        ? 'watch'
        : 'healthy';

    const state: PortfolioDealState = {
      dealId: deal.id,
      name: deal.name,
      borrower: deal.document.borrower,
      riskScore: risk,
      leverageX: lev,
      interestCoverageX: ic,
      fixedChargeCoverageX: fcc,
      liquidity: liq,
      covenants,
      health,
      deltas: {
        leverageX: p ? r2(lev - baseLev) : 0,
        interestCoverageX: p ? r2(ic - baseIc) : 0,
        liquidity: p ? r1(liq - baseLiq) : 0,
      },
      lastSweepId: sweepId,
    };

    yield { type: 'deal_reviewed', sweepId, state };

    // raise escalations for anything not passing (hook dedups by key)
    for (const c of covenants) {
      if (c.status === 'pass') continue;
      yield {
        type: 'escalation',
        item: {
          id: uid('esc'),
          key: `${deal.id}:${c.name}:${c.status}`,
          dealId: deal.id,
          dealName: deal.name,
          severity: c.status === 'breach' ? 'critical' : 'warning',
          reason:
            c.status === 'breach'
              ? `${c.name} ${c.actual} breaches the ${c.threshold} covenant`
              : `${c.name} ${c.actual} is approaching its ${c.threshold} limit — thin headroom`,
          at: Date.now(),
          status: 'open',
        },
      };
    }
  }

  yield { type: 'sweep_finished', sweepId };
}
