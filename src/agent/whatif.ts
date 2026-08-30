// ---------------------------------------------------------------------------
// WHAT-IF / sensitivity model — a pure, deterministic recompute of a deal's
// covenants, ratios, risk score and recommendation from a handful of editable
// drivers (EBITDA, total debt, interest rate, liquidity).
//
// Why this exists: the canned deals carry *fixed* covenant statuses and risk
// scores. To let an analyst stress the inputs and watch the recommendation flip
// live, those outputs have to be DERIVED rather than read — and the derivation
// has to end on the *same* decision rule the agent uses (`decide`), so the
// stress test and the agent can never disagree.
//
// No React, no side effects (it lives in src/agent/ for that reason). It is
// calibrated so the baseline scenario reproduces each deal's published figures
// exactly — every delta is zero at base — which keeps it honest: at the base
// case the panel matches the agent's own numbers to the decimal.
// ---------------------------------------------------------------------------

import type { CovenantTest, Deal } from './mockData';
import type { Recommendation } from './types';

/**
 * THE decision rule, in one place. A breach gates everything; a breach plus a
 * high risk score is a decline, otherwise it escalates to a human.
 * `recommendationFor` in runAgent.ts delegates here, so the agent loop and the
 * what-if panel apply byte-for-byte identical logic.
 */
export function decide(breaches: number, riskScore: number): Recommendation {
  return breaches === 0 ? 'approve' : riskScore >= 75 ? 'decline' : 'escalate';
}

export type DriverKey = 'ebitda' | 'debt' | 'rate' | 'liquidity';

export interface Driver {
  key: DriverKey;
  label: string;
  /** drives both value formatting and the sense of "higher is better" */
  unit: 'usd' | 'pct';
  /** true when a HIGHER value is better for the credit (EBITDA, liquidity) */
  higherBetter: boolean;
  base: number;
  min: number;
  max: number;
  step: number;
}

export type Scenario = Record<DriverKey, number>;

export interface ScenarioOutcome {
  ratios: {
    leverageX: number;
    interestCoverageX: number;
    fixedChargeCoverageX: number;
    ebitdaMarginPct: number;
  };
  covenants: CovenantTest[];
  risk: { score: number; rating: string; tone: 'good' | 'warn' | 'bad' };
  breaches: number;
  recommendation: Recommendation;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** The implied annual interest rate (fraction) that reproduces the deal's coverage at base. */
function baseRateFraction(deal: Deal): number {
  const f = deal.financials;
  if (f.totalDebt <= 0 || f.interestCoverageX <= 0) return 0.08;
  // interestCoverage = EBITDA / (debt · rate)  ⇒  rate = EBITDA / (cov · debt)
  return f.ebitdaTtm / (f.interestCoverageX * f.totalDebt);
}

/** Fixed charges beyond interest (scheduled amortization etc.), backed out at base. */
function fixedChargeBase(deal: Deal): number {
  const f = deal.financials;
  if (f.fixedChargeCoverageX <= 0 || f.interestCoverageX <= 0) return 0;
  const interest = f.ebitdaTtm / f.interestCoverageX;
  // fcc = EBITDA / (interest + fixedBase)  ⇒  fixedBase = EBITDA / fcc − interest
  return Math.max(0, f.ebitdaTtm / f.fixedChargeCoverageX - interest);
}

/** The base-case driver values, read straight off the deal (interest rate inferred). */
export function baselineScenario(deal: Deal): Scenario {
  const f = deal.financials;
  return {
    ebitda: f.ebitdaTtm,
    debt: f.totalDebt,
    rate: r2(baseRateFraction(deal) * 100),
    liquidity: f.liquidity,
  };
}

/** Slider definitions, with ranges anchored generously around each deal's base. */
export function driversFor(deal: Deal): Driver[] {
  const b = baselineScenario(deal);
  return [
    {
      key: 'ebitda',
      label: 'Adj. EBITDA',
      unit: 'usd',
      higherBetter: true,
      base: b.ebitda,
      min: Math.max(1, r1(b.ebitda * 0.4)),
      max: r1(b.ebitda * 1.8),
      step: 0.1,
    },
    {
      key: 'debt',
      label: 'Total debt',
      unit: 'usd',
      higherBetter: false,
      base: b.debt,
      min: r1(b.debt * 0.5),
      max: r1(b.debt * 1.6),
      step: 0.1,
    },
    {
      key: 'rate',
      label: 'Interest rate',
      unit: 'pct',
      higherBetter: false,
      base: b.rate,
      min: 3,
      max: Math.max(20, Math.ceil(b.rate + 6)),
      step: 0.25,
    },
    {
      key: 'liquidity',
      label: 'Liquidity',
      unit: 'usd',
      higherBetter: true,
      base: b.liquidity,
      min: 0,
      max: Math.max(20, r1(b.liquidity * 2.2)),
      step: 0.5,
    },
  ];
}

/** A contiguous span of driver values that all produce the same recommendation. */
export interface FlipZone {
  rec: Recommendation;
  from: number;
  to: number;
}

/**
 * Sweep one driver across its range (holding the other drivers at the current
 * scenario values) and collapse the results into recommendation zones — the
 * decision boundary, computed so the UI can paint it on the slider track.
 * Pure and cheap: ~samples evaluate() calls of plain arithmetic.
 */
export function flipZonesFor(deal: Deal, scenario: Scenario, driver: Driver, samples = 140): FlipZone[] {
  const zones: FlipZone[] = [];
  const span = driver.max - driver.min;
  for (let i = 0; i <= samples; i++) {
    const v = driver.min + (span * i) / samples;
    const rec = evaluate(deal, { ...scenario, [driver.key]: v }).recommendation;
    const last = zones[zones.length - 1];
    if (last && last.rec === rec) last.to = v;
    else zones.push({ rec, from: v, to: v });
  }
  return zones;
}

/** The minimal restructure that makes a deal signable, found by pure search. */
export interface Cure {
  /** total sponsor equity contribution, $M (0 = base structure already passes) */
  contribution: number;
  debtPaydown: number;
  liquidityTopUp: number;
  scenario: Scenario;
  outcome: ScenarioOutcome;
}

/**
 * Search for the smallest sponsor-equity contribution (applied as debt paydown,
 * optionally part-allocated to balance-sheet liquidity) that clears the whole
 * covenant package — i.e. makes the SAME `decide` rule return 'approve'.
 * Capped at 35% of total debt ("policy limit"); beyond that a deal isn't
 * restructured, it's a different deal. Returns null when no cure exists within
 * the cap (e.g. Cobalt — its breaches are too deep). Pure and deterministic.
 */
export function findCure(deal: Deal): Cure | null {
  const base = baselineScenario(deal);
  const baseOut = evaluate(deal, base);
  if (baseOut.recommendation === 'approve') {
    return { contribution: 0, debtPaydown: 0, liquidityTopUp: 0, scenario: base, outcome: baseOut };
  }
  const maxE = base.debt * 0.35;
  for (let e = 0.5; e <= maxE; e = r1(e + 0.5)) {
    // prefer full paydown; fall back to splitting some of it into liquidity
    for (const f of [1, 0.8, 0.6]) {
      const s: Scenario = {
        ...base,
        debt: r1(base.debt - e * f),
        liquidity: r1(base.liquidity + e * (1 - f)),
      };
      const outcome = evaluate(deal, s);
      if (outcome.recommendation === 'approve') {
        return {
          contribution: e,
          debtPaydown: r1(e * f),
          liquidityTopUp: r1(e * (1 - f)),
          scenario: s,
          outcome,
        };
      }
    }
  }
  return null;
}

/** Covenant-threshold overrides the reviewer proposes at the gate. */
export interface TermOverrides {
  /** amended Max Total Leverage ceiling, e.g. 4.3 (x) */
  leverageMax?: number;
  /** amended Min Liquidity floor, e.g. 8 ($M) */
  liquidityMin?: number;
}

export interface AmendedOutcome {
  breaches: number;
  recommendation: Recommendation;
  /** names of covenants whose pass/breach status changed under the amendments */
  changed: string[];
}

/**
 * "Countersign as amended": re-test the deal's FILED covenant actuals against
 * reviewer-amended thresholds and re-run the same `decide` rule. Pure — the
 * gate previews the amended recommendation live as the reviewer edits terms.
 */
export function amendedOutcome(deal: Deal, overrides: TermOverrides): AmendedOutcome {
  const changed: string[] = [];
  let breaches = 0;
  for (const c of deal.covenants) {
    const kind = classify(c.name);
    const { dir, value } = parseThreshold(c.threshold);
    const actualM = c.actual.match(/[\d.]+/);
    const actual = actualM ? parseFloat(actualM[0]) : NaN;
    const threshold =
      kind === 'leverage' && overrides.leverageMax !== undefined
        ? overrides.leverageMax
        : kind === 'liquidity' && overrides.liquidityMin !== undefined
          ? overrides.liquidityMin
          : value;
    const pass = Number.isNaN(actual) ? c.status !== 'breach' : dir === 'max' ? actual <= threshold : actual >= threshold;
    if (!pass) breaches += 1;
    if (pass !== (c.status !== 'breach')) changed.push(c.name);
  }
  return { breaches, recommendation: decide(breaches, deal.risk.score), changed };
}

type Kind = 'leverage' | 'interest' | 'fixed' | 'liquidity' | 'other';

/** Map a covenant to the ratio it tests, by name — robust across canned + uploaded deals. */
function classify(name: string): Kind {
  const n = name.toLowerCase();
  if (n.includes('leverage')) return 'leverage';
  if (n.includes('interest')) return 'interest';
  if (n.includes('fixed')) return 'fixed';
  if (n.includes('liquid')) return 'liquidity';
  return 'other';
}

/** Parse a threshold string like "≤ 4.00x" / "≥ $10.0M" into a direction + number. */
function parseThreshold(t: string): { dir: 'max' | 'min'; value: number } {
  const dir = t.includes('≤') || t.includes('<') ? 'max' : 'min';
  const m = t.match(/[\d.]+/);
  return { dir, value: m ? parseFloat(m[0]) : 0 };
}

function ratingFor(score: number): string {
  if (score < 30) return 'Ba2 / Non-investment grade';
  if (score < 45) return 'Ba3 / Speculative';
  if (score < 60) return 'B2 / Speculative';
  if (score < 75) return 'B3 / Highly speculative';
  return 'Caa1 / Substantial risk';
}

/**
 * Recompute everything from a scenario. At the baseline scenario this returns
 * exactly the deal's published covenants, ratios and risk score; away from it,
 * leverage and coverage move the score through a transparent, baseline-anchored
 * sensitivity (every term is zero at base).
 */
export function evaluate(deal: Deal, s: Scenario): ScenarioOutcome {
  const f = deal.financials;
  const ebitda = Math.max(0.1, s.ebitda);
  const debt = Math.max(0.1, s.debt);
  const rate = Math.max(0.001, s.rate / 100); // percent → fraction
  const liquidity = Math.max(0, s.liquidity);

  const interest = debt * rate;
  const fixedBase = fixedChargeBase(deal);

  const leverageX = debt / ebitda;
  const interestCoverageX = ebitda / interest;
  const fixedChargeCoverageX = ebitda / (interest + fixedBase);
  const ebitdaMarginPct = f.revenueTtm > 0 ? (ebitda / f.revenueTtm) * 100 : f.ebitdaMarginPct;

  const actualFor = (kind: Kind): number =>
    kind === 'leverage'
      ? leverageX
      : kind === 'interest'
        ? interestCoverageX
        : kind === 'fixed'
          ? fixedChargeCoverageX
          : liquidity; // 'liquidity'
  const fmt = (kind: Kind, v: number): string =>
    kind === 'liquidity' ? `$${v.toFixed(1)}M` : `${v.toFixed(2)}x`;

  const covenants: CovenantTest[] = deal.covenants.map((c) => {
    const kind = classify(c.name);
    if (kind === 'other') return c; // unmodelled covenant → leave it untouched
    const { dir, value } = parseThreshold(c.threshold);
    const actual = actualFor(kind);
    const pass = dir === 'max' ? actual <= value : actual >= value;
    return { ...c, actual: fmt(kind, actual), status: pass ? 'pass' : 'breach' };
  });

  const breaches = covenants.filter((c) => c.status === 'breach').length;

  // Risk: baseline-anchored sensitivity. Leverage and coverage dominate (as in
  // the deals' own driver lists); each delta is zero at base so the score there
  // equals the published score. Clamped to keep the gauge readable.
  const baseLev = f.totalDebt / f.ebitdaTtm;
  const score = clamp(
    Math.round(
      deal.risk.score +
        9 * (leverageX - baseLev) +
        5 * (f.interestCoverageX - interestCoverageX) +
        4 * (f.fixedChargeCoverageX - fixedChargeCoverageX) +
        0.4 * (f.liquidity - liquidity),
    ),
    1,
    99,
  );
  const tone: 'good' | 'warn' | 'bad' = score < 40 ? 'good' : score < 70 ? 'warn' : 'bad';

  return {
    ratios: { leverageX, interestCoverageX, fixedChargeCoverageX, ebitdaMarginPct },
    covenants,
    risk: { score, rating: ratingFor(score), tone },
    breaches,
    recommendation: decide(breaches, score),
  };
}
