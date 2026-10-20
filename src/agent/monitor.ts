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
import { fmtHeadroom, headroomOf, headroomStatus } from './whatif';
import { MIN_HEADROOM } from './policy';

export type CovenantHealth = 'pass' | 'watch' | 'breach';
export type DealHealth = 'healthy' | 'watch' | 'breach';

export interface MonitorCovenant {
  name: string;
  threshold: string;
  actual: string;
  status: CovenantHealth;
}

/** One sweep's observation of a deal — the monitor's own short history (the
    KPI tiles read the previous sweep's health from it). */
export interface SweepSnapshot {
  sweepId: number;
  leverageX: number;
  health: DealHealth;
}

/** Ring-buffer cap for per-deal sweep history. */
export const HISTORY_CAP = 12;

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
  /** last HISTORY_CAP sweeps, oldest first (current sweep included last) */
  history: SweepSnapshot[];
  lastSweepId: number;
}

export interface EscalationItem {
  id: string;
  /**
   * Dedup key — ONE item per deal+covenant (`${dealId}:${covenant}`). Severity
   * is a property of the item, not part of its identity: a watch that worsens
   * into a breach upgrades the same item in place instead of opening a second
   * card beside a stale warning.
   */
  key: string;
  dealId: string;
  dealName: string;
  severity: 'warning' | 'critical';
  /** Refreshed every sweep while the item is open, so it never quotes stale figures. */
  reason: string;
  /** when the item was first raised */
  at: number;
  /** 'resolved' = the covenant passed on consecutive sweeps after the item was raised */
  status: 'open' | 'acknowledged' | 'resolved';
  /** where it came from: a monitor sweep (default) or a countersigned ESCALATE memo */
  origin?: 'monitor' | 'countersign';
  /** monitor items: the covenant this item tracks */
  covenant?: string;
  /** monitor items: the live reading the reason was last written from */
  actual?: string;
  threshold?: string;
  /** last time a sweep refreshed this item */
  updatedAt?: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
}

/** One covenant's reading on a sweep, passing or not — the hook uses passing
    readings to resolve items and re-arm their keys after recovery. */
export interface CovenantReading {
  key: string;
  dealId: string;
  covenant: string;
  status: CovenantHealth;
}

/** The single dedup key format for monitor escalations. */
export const escalationKey = (dealId: string, covenant: string) => `${dealId}:${covenant}`;

export type MonitorEvent =
  | { type: 'sweep_started'; sweepId: number }
  | { type: 'deal_reviewed'; sweepId: number; state: PortfolioDealState }
  | { type: 'escalation'; item: EscalationItem }
  /** every covenant reading of the sweep (passing ones included), after its escalations */
  | { type: 'covenants_tested'; sweepId: number; readings: CovenantReading[] }
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

/**
 * A covenant's health read the way the decision rule reads it: signed headroom
 * against the house policy cushion (MIN_HEADROOM) — past the line = breach,
 * inside the cushion = watch. So the Book and the analysis can never call the
 * same headroom different things (a file at 3.60x on a 4.00x ceiling, 10%
 * headroom, is "watch" here because `decide` escalates it as thin).
 */
function healthOf(dir: 'max' | 'min', v: number, limit: number): { status: CovenantHealth; headroom: number | null } {
  const headroom = headroomOf(dir, v, limit);
  const s = headroomStatus(headroom);
  return { status: s === 'breach' ? 'breach' : s === 'thin' ? 'watch' : 'pass', headroom };
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

    const tests = [
      { name: 'Max Total Leverage', threshold: '≤ 4.00x', actual: `${lev.toFixed(2)}x`, ...healthOf('max', lev, 4.0) },
      { name: 'Min Interest Coverage', threshold: '≥ 2.00x', actual: `${ic.toFixed(2)}x`, ...healthOf('min', ic, 2.0) },
      { name: 'Min Fixed-Charge Coverage', threshold: '≥ 1.10x', actual: `${fcc.toFixed(2)}x`, ...healthOf('min', fcc, 1.1) },
      { name: 'Min Liquidity', threshold: '≥ $10.0M', actual: `$${liq.toFixed(1)}M`, ...healthOf('min', liq, 10) },
    ];
    const covenants: MonitorCovenant[] = tests.map(({ name, threshold, actual, status }) => ({ name, threshold, actual, status }));

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
      history: [...(p?.history ?? []), { sweepId, leverageX: lev, health }].slice(-HISTORY_CAP),
      lastSweepId: sweepId,
    };

    yield { type: 'deal_reviewed', sweepId, state };

    // raise escalations for anything not passing (the hook dedups by key and
    // upgrades/refreshes an open item in place)
    const now = Date.now();
    for (const c of tests) {
      if (c.status === 'pass') continue;
      const room = c.headroom !== null ? ` (${fmtHeadroom(c.headroom)} headroom)` : '';
      yield {
        type: 'escalation',
        item: {
          id: uid('esc'),
          key: escalationKey(deal.id, c.name),
          dealId: deal.id,
          dealName: deal.name,
          severity: c.status === 'breach' ? 'critical' : 'warning',
          reason:
            c.status === 'breach'
              ? `${c.name} ${c.actual} breaches the ${c.threshold} covenant${room}`
              : `${c.name} ${c.actual} is inside the ${Math.round(MIN_HEADROOM * 100)}% policy cushion of its ${c.threshold} limit${room} — thin headroom`,
          at: now,
          status: 'open',
          origin: 'monitor',
          covenant: c.name,
          actual: c.actual,
          threshold: c.threshold,
          updatedAt: now,
        },
      };
    }
    yield {
      type: 'covenants_tested',
      sweepId,
      readings: covenants.map((c) => ({ key: escalationKey(deal.id, c.name), dealId: deal.id, covenant: c.name, status: c.status })),
    };
  }

  yield { type: 'sweep_finished', sweepId };
}
