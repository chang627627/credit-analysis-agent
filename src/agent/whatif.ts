// ---------------------------------------------------------------------------
// WHAT-IF / sensitivity model + THE decision rule.
//
// A pure, deterministic recompute of a deal's covenants (with signed headroom),
// ratios and risk score from a handful of editable drivers (EBITDA, total debt,
// interest rate, liquidity), and the ONE decision rule every surface ends on:
// the agent loop (filed figures, the revised gate after a send-back), the
// what-if panel and its flip zones, and "countersign as amended" all call
// `decide`, so they can never disagree.
//
// The rule is "severity-gated triage" (thresholds: policy.ts):
//   1. data gate    load-bearing confidence < 75%            → ESCALATE (verify)
//   2. knock-outs   score ≥ 75 · FCC < 1.00x · leverage > 6.00x
//                   · a breach no cure within policy can fix  → DECLINE
//   3. exceptions   a curable breach · headroom < 15%
//                   · score ≥ 60                              → ESCALATE
//   4. otherwise                                              → APPROVE
// Every outcome carries its specific reasons, with magnitudes.
//
// Layering (so the cure search can never recurse into the decision):
//   recompute()  figures → covenants + headroom + risk  (no decision)
//   probe()      the numeric "isClean" predicate the cure search targets,
//                split into its debt side, liquidity side and risk score
//   findCure()   smallest sponsor equity that makes a scenario clean
//                (cureBlockFor(): the constraint that binds when none does)
//   decide()     pure: structured input (incl. the cure signal) → Decision
//   evaluate()   recompute + cure signal + decide
//
// No React, no side effects. Calibrated to the FILED ratios, so the baseline
// scenario reproduces each deal's published figures exactly (every delta is
// zero at base) and the sandbox can never disagree with the gate there.
// ---------------------------------------------------------------------------

import type { CovenantTest, Deal } from './mockData';
import type { DecisionBasis, Recommendation } from './types';
import { ratingFor, ratingGrade, riskTone } from './rating';
import {
  CONF_FLOOR,
  CURE_CAP,
  DECLINE_SCORE,
  FCC_FLOOR,
  LEVERAGE_OUTER_LIMIT,
  MIN_HEADROOM,
  REFER_SCORE,
} from './policy';
import { fmtM, fmtX } from './format';

// ===========================================================================
// Covenants and headroom
// ===========================================================================

export type CovenantKind = 'leverage' | 'interest' | 'fixed' | 'liquidity' | 'other';

/** One covenant tested against a set of figures, with its signed headroom. */
export interface CovenantCheck {
  name: string;
  kind: CovenantKind;
  /** the tested figure as a sentence subject: 'Total leverage', 'Liquidity' */
  metric: string;
  /** 'max' = a ceiling (leverage), 'min' = a floor (coverage, liquidity) */
  dir: 'max' | 'min';
  /** as printed, amended when the reviewer overrode it: '≤ 4.00x' */
  threshold: string;
  /** as printed: '4.26x', '$14.2M' */
  actual: string;
  limit: number;
  /** the actual as a number (NaN when it could not be read) */
  value: number;
  /**
   * Signed headroom (fraction): max-ratio 1 − actual/limit; min-ratio and
   * liquidity 1 − limit/actual (= (actual − floor)/actual). Negative = breach.
   * null when the figure could not be read (the filed status then decides).
   */
  headroom: number | null;
  breach: boolean;
}

/** Signed headroom of a covenant reading (see CovenantCheck.headroom). */
export function headroomOf(dir: 'max' | 'min', value: number, limit: number): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(limit)) return null;
  if (dir === 'max') return limit > 0 ? 1 - value / limit : value <= limit ? 0 : -1;
  return value > 0 ? 1 - limit / value : value >= limit ? 0 : -1;
}

/**
 * Float slack on every headroom comparison, so a figure sitting exactly ON a
 * line (3.40x against a 15% cushion on 4.00x) never reads as past it because
 * of a last-bit rounding error.
 */
const H_EPS = 1e-9;

/** Where a headroom sits against the policy: past the line, inside the cushion, or clear of it. */
export type HeadroomStatus = 'breach' | 'thin' | 'clear';

/** The policy's reading of a headroom (null when the figure could not be read). */
export function headroomStatus(h: number | null): HeadroomStatus | null {
  if (h === null || !Number.isFinite(h)) return null;
  return h < -H_EPS ? 'breach' : h < MIN_HEADROOM - H_EPS ? 'thin' : 'clear';
}

interface CovenantSpec {
  name: string;
  kind: CovenantKind;
  dir: 'max' | 'min';
  limit: number;
  threshold: string;
  filedValue: number;
  filedActual: string;
  filedBreach: boolean;
}

/** Map a covenant to the ratio it tests, by name — robust across canned + uploaded deals. */
function classify(name: string): CovenantKind {
  const n = name.toLowerCase();
  if (n.includes('leverage')) return 'leverage';
  if (n.includes('interest')) return 'interest';
  if (n.includes('fixed')) return 'fixed';
  if (n.includes('liquid')) return 'liquidity';
  return 'other';
}

/**
 * Parse a threshold string like "≤ 4.00x" / "≥ $10.0M" into a direction + number.
 * A threshold printed without a comparison sign takes its direction from the
 * covenant's name ("Max …" / "Min …"), then from what it tests (a leverage test
 * is a ceiling, coverage and liquidity are floors). An unreadable number is NaN,
 * so the covenant's headroom is unknown and its filed status decides.
 */
function parseThreshold(t: string, name: string, kind: CovenantKind): { dir: 'max' | 'min'; value: number } {
  let dir: 'max' | 'min';
  if (/[≤<]/.test(t)) dir = 'max';
  else if (/[≥>]/.test(t)) dir = 'min';
  else if (/\bmax(imum)?\b/i.test(name)) dir = 'max';
  else if (/\bmin(imum)?\b/i.test(name)) dir = 'min';
  else dir = kind === 'leverage' ? 'max' : 'min';
  const m = t.match(/\d+(\.\d+)?|\.\d+/);
  return { dir, value: m ? parseFloat(m[0]) : NaN };
}

const METRIC: Record<Exclude<CovenantKind, 'other'>, string> = {
  leverage: 'Total leverage',
  interest: 'Interest coverage',
  fixed: 'Fixed-charge coverage',
  liquidity: 'Liquidity',
};

const metricOf = (c: { kind: CovenantKind; name: string }): string => (c.kind === 'other' ? c.name : METRIC[c.kind]);
/** mid-sentence form: 'interest coverage' (an unmodelled covenant keeps its own name) */
const metricLower = (c: { kind: CovenantKind; name: string }): string =>
  c.kind === 'other' ? c.name : METRIC[c.kind].toLowerCase();

/** the covenant as a reset names it: 'the leverage, interest coverage and fixed-charge coverage covenants' */
const RESET_NAME: Record<Exclude<CovenantKind, 'other'>, string> = {
  leverage: 'leverage',
  interest: 'interest coverage',
  fixed: 'fixed-charge coverage',
  liquidity: 'liquidity',
};
const resetName = (c: { kind: CovenantKind; name: string }): string => (c.kind === 'other' ? c.name : RESET_NAME[c.kind]);

/** The covenants the gate can amend (leverage ceiling, liquidity floor: see TermOverrides). */
const AMENDABLE: readonly CovenantKind[] = ['leverage', 'liquidity'];

/** 'a', 'a and b', 'a, b and c' */
function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const fmtActual = (kind: CovenantKind, v: number): string => (kind === 'liquidity' ? fmtM(v) : fmtX(v));

// Covenant thresholds parsed once per deal (the cure search reads them thousands of times).
const SPEC_CACHE = new WeakMap<Deal, CovenantSpec[]>();

function specsOf(deal: Deal): CovenantSpec[] {
  const hit = SPEC_CACHE.get(deal);
  if (hit) return hit;
  const specs = deal.covenants.map((c): CovenantSpec => {
    const kind = classify(c.name);
    const { dir, value } = parseThreshold(c.threshold, c.name, kind);
    const m = c.actual.match(/[\d.]+/);
    return {
      name: c.name,
      kind,
      dir,
      limit: value,
      threshold: c.threshold,
      filedValue: m ? parseFloat(m[0]) : NaN,
      filedActual: c.actual,
      filedBreach: c.status === 'breach',
    };
  });
  SPEC_CACHE.set(deal, specs);
  return specs;
}

/** Covenant-threshold overrides the reviewer proposes at the gate. */
export interface TermOverrides {
  /** amended Max Total Leverage ceiling, e.g. 4.3 (x) */
  leverageMax?: number;
  /** amended Min Liquidity floor, e.g. 8 ($M) */
  liquidityMin?: number;
}

function withOverrides(specs: CovenantSpec[], o?: TermOverrides): CovenantSpec[] {
  if (!o) return specs;
  const lev = o.leverageMax !== undefined && Number.isFinite(o.leverageMax) ? o.leverageMax : undefined;
  const liq = o.liquidityMin !== undefined && Number.isFinite(o.liquidityMin) ? o.liquidityMin : undefined;
  if (lev === undefined && liq === undefined) return specs;
  return specs.map((c) => {
    const v = c.kind === 'leverage' ? lev : c.kind === 'liquidity' ? liq : undefined;
    if (v === undefined) return c;
    return { ...c, limit: v, threshold: `${c.dir === 'max' ? '≤' : '≥'} ${fmtActual(c.kind, v)}` };
  });
}

/** Headroom + breach of one spec at a value. An unreadable figure keeps its filed status. */
function assess(c: CovenantSpec, value: number): { headroom: number | null; breach: boolean } {
  const headroom = headroomOf(c.dir, value, c.limit);
  return { headroom, breach: headroom === null ? c.filedBreach : headroom < -H_EPS };
}

/** A covenant meets the cure target: no breach and, when readable, at least the policy cushion. */
function clears(c: CovenantSpec, value: number): boolean {
  const h = headroomOf(c.dir, value, c.limit);
  return h === null ? !c.filedBreach : h >= MIN_HEADROOM - H_EPS;
}

function checkOf(c: CovenantSpec, value: number, actual: string): CovenantCheck {
  const { headroom, breach } = assess(c, value);
  return {
    name: c.name,
    kind: c.kind,
    metric: metricOf(c),
    dir: c.dir,
    threshold: c.threshold,
    actual,
    limit: c.limit,
    value,
    headroom,
    breach,
  };
}

/** The deal's FILED covenant actuals tested against its (optionally amended) thresholds. */
export function filedChecks(deal: Deal, overrides?: TermOverrides): CovenantCheck[] {
  return withOverrides(specsOf(deal), overrides).map((c) => checkOf(c, c.filedValue, c.filedActual));
}

/** The smallest headroom among the readable checks, and whose it is. */
function tightestOf(checks: CovenantCheck[]): CovenantCheck | null {
  let t: CovenantCheck | null = null;
  for (const c of checks) if (c.headroom !== null && (t === null || c.headroom < (t.headroom as number))) t = c;
  return t;
}

// ===========================================================================
// THE decision rule
// ===========================================================================

/** The run's load-bearing confidence (the minimum) and the tool that read it. */
export interface DecisionConfidence {
  value: number;
  /** the observation's label, e.g. 'Risk Engine' */
  source: string;
}

/** A cure exists within the policy cap; `contribution` is its minimal size when it was sized. */
export interface CureSignal {
  /** minimal sponsor equity, $M — null when only existence was tested */
  contribution: number | null;
}

/**
 * Why no cure exists within the cap: the constraint of the cure target (the
 * clean approval) that sponsor equity cannot meet. The search splits the
 * target by what each half of the equity moves — paydown moves the debt-side
 * tests, a liquidity top-up the liquidity tests, both move the risk score.
 */
export type CureBlock =
  /** no debt, so the 35% cap is zero */
  | { kind: 'no-debt'; capM: number }
  /** even the whole cap as paydown leaves these short (covenants: mid-sentence names) */
  | { kind: 'paydown'; capM: number; covenants: string[]; fccFloor: boolean; outerLimit: boolean }
  /** even the whole cap to liquidity leaves these short */
  | { kind: 'liquidity'; capM: number; covenants: string[] }
  /** each half fits alone, but together they need more than the cap */
  | { kind: 'combined'; capM: number; needM: number; paydownM: number; liquidityM: number }
  /** every covenant can clear, but the risk score stays at or above the referral line */
  | { kind: 'score'; capM: number; best: number };

/** The binding constraint as a clause: "even $39.2M of debt paydown (the 35% cap) leaves …". */
export function describeCureBlock(b: CureBlock): string {
  const cap = fmtM(b.capM);
  const cushion = pct0(MIN_HEADROOM);
  switch (b.kind) {
    case 'no-debt':
      return `there is no debt to size sponsor equity against (the cap is ${pct0(CURE_CAP)} of total debt)`;
    case 'paydown': {
      const parts: string[] = [];
      if (b.covenants.length > 0) parts.push(`${listJoin(b.covenants)} short of the ${cushion} cushion`);
      if (b.fccFloor) parts.push(`fixed-charge coverage under the ${fmtX(FCC_FLOOR)} floor`);
      if (b.outerLimit) parts.push(`total leverage above the ${fmtX(LEVERAGE_OUTER_LIMIT)} outer limit`);
      return `even ${cap} of debt paydown (the ${pct0(CURE_CAP)} cap) leaves ${listJoin(parts)}`;
    }
    case 'liquidity':
      return `even ${cap} to liquidity (the ${pct0(CURE_CAP)} cap) leaves ${listJoin(b.covenants)} short of the ${cushion} cushion`;
    case 'combined':
      return `clearing every covenant with the ${cushion} cushion needs ${fmtM(b.needM)} (${fmtM(b.paydownM)} paydown, ${fmtM(b.liquidityM)} to liquidity), more than the ${cap} cap`;
    case 'score':
      return `the risk score stays at or above the ${REFER_SCORE} referral line (${b.best} at best within the ${cap} cap)`;
  }
}

export interface DecisionInput {
  checks: CovenantCheck[];
  score: number;
  fixedChargeCoverageX: number;
  leverageX: number;
  /**
   * Only read when a covenant breaches: an object = a cure exists within the
   * cap, null = none does, omitted = not assessed (escalates; never declines).
   */
  cure?: CureSignal | null;
  /** with `cure: null`: what sponsor equity cannot fix (worded into the no-cure reason) */
  cureBlock?: CureBlock | null;
  /** the cure cap for this structure, $M (worded into the no-cure reason) */
  cureCapM?: number;
  /** omitted (the what-if sandbox, filed-figure previews) = the data gate is skipped */
  confidence?: DecisionConfidence;
}

/** Which tier of the rule decided (declared with the package types). */
export type { DecisionBasis };

export type DecisionTrigger =
  | 'low-confidence'
  | 'score-decline'
  | 'fcc-floor'
  | 'leverage-outer'
  | 'breach-no-cure'
  | 'breach-curable'
  | 'thin-headroom'
  | 'score-refer';

export interface Decision {
  recommendation: Recommendation;
  basis: DecisionBasis;
  /** specific reasons with magnitudes (at most four principal reasons) */
  reasons: string[];
  /** every rule that fired, in rule order */
  triggers: DecisionTrigger[];
  /** display only: the count is never a threshold */
  breaches: number;
  minHeadroom: number | null;
  /** the covenant with the least headroom */
  tightest: string | null;
  cure?: CureSignal | null;
  /** when no cure exists: the constraint that binds */
  cureBlock?: CureBlock | null;
  /**
   * Data gate only: what the figures would imply once verified — information
   * for the memo, never the recommendation.
   */
  implied?: { recommendation: Recommendation; basis: DecisionBasis; reasons: string[] };
}

const MAX_REASONS = 4;

/**
 * Signed headroom as printed: '−6.5%', '4.8%'. A breach never prints as
 * '0.0%': one that rounds away at one decimal shows two ('−0.04%').
 */
export function fmtHeadroom(h: number): string {
  if (!Number.isFinite(h)) return 'n/a';
  const v = Math.abs(h * 100).toFixed(1);
  if (h < -H_EPS) return v === '0.0' ? `−${Math.max(0.01, Math.abs(h * 100)).toFixed(2)}%` : `−${v}%`;
  return `${v}%`;
}
const pct0 = (f: number) => `${Math.round(f * 100)}%`;
const byHeadroom = (a: CovenantCheck, b: CovenantCheck) =>
  (a.headroom ?? Number.NEGATIVE_INFINITY) - (b.headroom ?? Number.NEGATIVE_INFINITY);
/** ' (−6.5% headroom)' — empty when the figure could not be read */
const hTxt = (c: CovenantCheck, word = ' headroom') => (c.headroom !== null ? ` (${fmtHeadroom(c.headroom)}${word})` : '');

/** Leverage the outer limit can be tested against (negative or infinite = no positive EBITDA). */
const leverageMeasurable = (lev: number) => Number.isFinite(lev) && lev >= 0;

/**
 * The covenant reset an ESCALATE can offer beside sponsor equity: every
 * covenant inside the cushion (or breached) reset to leave it. Null when a reset
 * alone cannot approve — the risk score is the blocker. Worded "a covenant
 * reset" only when every covenant to reset is one the gate can amend (the
 * leverage ceiling, the liquidity floor); otherwise it names them, so a reviewer
 * who amends the leverage ceiling alone is not told that it will be enough.
 */
function resetClause(i: DecisionInput): string | null {
  if (!(i.score < REFER_SCORE)) return null;
  const need = i.checks.filter((c) => c.breach || headroomStatus(c.headroom) === 'thin');
  if (need.length === 0) return null;
  if (need.every((c) => AMENDABLE.includes(c.kind))) return 'a covenant reset';
  const names = listJoin(need.map(resetName));
  return `a reset of the ${names} covenant${need.length > 1 ? 's' : ''}`;
}

/** The rule on the figures alone (tiers 2–4). */
function ruleOn(i: DecisionInput): Decision {
  const breached = i.checks.filter((c) => c.breach).sort(byHeadroom);
  const tight = tightestOf(i.checks);
  const scoreRead = Number.isFinite(i.score);
  const grade = scoreRead ? ratingGrade(i.score) : '';
  const base = {
    breaches: breached.length,
    minHeadroom: tight ? tight.headroom : null,
    tightest: tight ? tight.name : null,
    cure: i.cure,
    cureBlock: i.cure === null ? (i.cureBlock ?? null) : null,
  };
  const triggers: DecisionTrigger[] = [];

  // --- 2. knock-outs → DECLINE (a figure that cannot be shown to clear a floor fails it)
  const scoreKO = i.score >= DECLINE_SCORE;
  const fccKO = !(i.fixedChargeCoverageX >= FCC_FLOOR);
  const levKO = !leverageMeasurable(i.leverageX) || i.leverageX > LEVERAGE_OUTER_LIMIT;
  const noCure = breached.length > 0 && i.cure === null;
  if (scoreKO || fccKO || levKO || noCure) {
    const reasons: string[] = [];
    if (scoreKO) {
      triggers.push('score-decline');
      reasons.push(`Risk score ${i.score} is at or above the ${DECLINE_SCORE} decline line (${grade}).`);
    }
    if (fccKO) {
      triggers.push('fcc-floor');
      reasons.push(
        Number.isFinite(i.fixedChargeCoverageX)
          ? `Fixed-charge coverage ${fmtX(i.fixedChargeCoverageX)} is below the ${fmtX(FCC_FLOOR)} floor: cash flow does not cover fixed charges.`
          : `Fixed-charge coverage could not be computed, so the ${fmtX(FCC_FLOOR)} floor is not shown to be met.`,
      );
    }
    if (levKO) {
      triggers.push('leverage-outer');
      reasons.push(
        leverageMeasurable(i.leverageX)
          ? `Total leverage ${fmtX(i.leverageX)} is above the ${fmtX(LEVERAGE_OUTER_LIMIT)} house outer limit.`
          : `Total leverage cannot be measured without positive EBITDA, so the ${fmtX(LEVERAGE_OUTER_LIMIT)} house outer limit is not met.`,
      );
    }
    if (noCure) {
      triggers.push('breach-no-cure');
      const room = MAX_REASONS - reasons.length; // at least 1: at most three knock-outs precede
      const why = base.cureBlock ? describeCureBlock(base.cureBlock) : null;
      const cap = i.cureCapM !== undefined ? ` (sponsor equity capped at ${fmtM(i.cureCapM)})` : '';
      const noCureLine = why ? `No cure within policy: ${why}.` : `No cure within policy${cap}.`;
      const list = () =>
        breached.map((c, k) => `${metricLower(c)} ${c.actual} vs ${c.threshold}${hTxt(c, k === 0 ? ' headroom' : '')}`).join(', ');
      if (breached.length === 1) {
        // one breach: one reason, the binding constraint folded in
        const c = breached[0];
        reasons.push(`${c.metric} ${c.actual} vs the ${c.threshold} covenant${hTxt(c)}; no cure within policy${why ? `: ${why}` : cap}.`);
      } else if (breached.length + 1 <= room) {
        for (const c of breached) reasons.push(`${c.metric} ${c.actual} breaches the ${c.threshold} covenant${hTxt(c)}.`);
        reasons.push(noCureLine);
      } else if (room >= 2) {
        reasons.push(`${breached.length} covenants breach: ${list()}.`);
        reasons.push(noCureLine);
      } else {
        reasons.push(`${breached.length} covenants breach with no cure within policy${cap}: ${list()}.`);
      }
    }
    return { ...base, recommendation: 'decline', basis: 'knock-out', reasons, triggers };
  }

  // --- 3. exceptions → ESCALATE
  const reasons: string[] = [];
  if (breached.length > 0) {
    triggers.push('breach-curable');
    const parts = breached.map((c, k) => `${k === 0 ? c.metric : metricLower(c)} ${c.actual} breaches the ${c.threshold} covenant${hTxt(c)}`);
    const reset = resetClause(i);
    const equity =
      i.cure == null // not assessed (a null cure declined above)
        ? 'sponsor equity'
        : i.cure.contribution
          ? `${fmtM(i.cure.contribution)} sponsor equity`
          : `sponsor equity within the ${pct0(CURE_CAP)} policy cap`;
    const cureText =
      i.cure == null ? `a cure (${reset ? `${equity} or ${reset}` : equity})` : reset ? `${equity} or ${reset}` : equity;
    reasons.push(`${parts.join('; ')}. Approve subject to ${cureText}.`);
  }
  const thin = i.checks.filter((c) => !c.breach && headroomStatus(c.headroom) === 'thin').sort(byHeadroom);
  // (a breach is already the thinnest headroom there is: it fires above, so only passes list here)
  if (thin.length > 0) {
    triggers.push('thin-headroom');
    const list = thin.map((c) => `${metricLower(c)} ${fmtHeadroom(c.headroom as number)}`).join(', ');
    reasons.push(`Thin headroom: ${list} (policy cushion ${pct0(MIN_HEADROOM)}).`);
  }
  if (!(i.score < REFER_SCORE)) {
    triggers.push('score-refer');
    reasons.push(
      scoreRead
        ? `Risk score ${i.score} (${grade}) is at or above the ${REFER_SCORE} referral line.`
        : `The risk score could not be computed, so it is not shown to be under the ${REFER_SCORE} referral line.`,
    );
  }
  if (triggers.length > 0) return { ...base, recommendation: 'escalate', basis: 'exception', reasons, triggers };

  // --- 4. clean → APPROVE (a human still countersigns)
  return {
    ...base,
    recommendation: 'approve',
    basis: 'clean',
    reasons: [`Every covenant clears with at least ${pct0(MIN_HEADROOM)} headroom; risk score ${i.score} (${grade}).`],
    triggers,
  };
}

/** The partial rule a count and a score can still evaluate (see the overload). */
function decideOnCounts(breaches: number, riskScore: number): Recommendation {
  if (riskScore >= DECLINE_SCORE) return 'decline';
  return breaches > 0 || riskScore >= REFER_SCORE ? 'escalate' : 'approve';
}

/**
 * THE decision rule, in one place: severity-gated triage, first match wins.
 * Pure — the cure signal and the confidence are inputs, never computed here.
 */
export function decide(input: DecisionInput): Decision;
/**
 * @deprecated Backward-compatible path for callers that only hold a breach
 * count and a score: the part of the rule those two can evaluate (score ≥ 75
 * declines; a breach or score ≥ 60 escalates). It cannot see headroom, FCC,
 * leverage or the cure — pass a `DecisionInput` for the real decision.
 */
export function decide(breaches: number, riskScore: number): Recommendation;
export function decide(input: DecisionInput | number, riskScore = 0): Decision | Recommendation {
  if (typeof input === 'number') return decideOnCounts(input, riskScore);
  const ruled = ruleOn(input);
  // --- 1. data gate: neither an approval nor an adverse action rests on unverified extraction.
  // An unreadable confidence is not a verified one: it gates too.
  const c = input.confidence;
  if (c && !(c.value >= CONF_FLOOR)) {
    const read = Number.isFinite(c.value)
      ? // floored, so a reading just under the floor never prints AS the floor
        `read at ${Math.floor(c.value * 100 + 1e-9)}% confidence`
      : 'returned no readable confidence';
    return {
      ...ruled,
      recommendation: 'escalate',
      basis: 'unverified-data',
      reasons: [`Verify the extracted figures: ${c.source} ${read} (floor ${pct0(CONF_FLOOR)}).`],
      triggers: ['low-confidence'],
      implied: { recommendation: ruled.recommendation, basis: ruled.basis, reasons: ruled.reasons },
    };
  }
  return ruled;
}

/** The clean-approval predicate (tier 4), shared by `isClean` and the cure search. */
function cleanOn(breaches: number, minH: number | null, score: number, fcc: number, lev: number): boolean {
  return (
    breaches === 0 &&
    (minH === null || minH >= MIN_HEADROOM - H_EPS) &&
    score < REFER_SCORE &&
    fcc >= FCC_FLOOR &&
    leverageMeasurable(lev) &&
    lev <= LEVERAGE_OUTER_LIMIT
  );
}

// ===========================================================================
// Drivers and scenarios
// ===========================================================================

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

/** Recomputed figures for a scenario — no decision (so the cure search cannot recurse). */
export interface CoreOutcome {
  ratios: {
    leverageX: number;
    interestCoverageX: number;
    fixedChargeCoverageX: number;
    ebitdaMarginPct: number;
  };
  covenants: CovenantTest[];
  /** the same covenants with signed headroom (parallel to `covenants`) */
  headroom: CovenantCheck[];
  minHeadroom: number | null;
  risk: { score: number; rating: string; tone: 'good' | 'warn' | 'bad' };
  breaches: number;
}

export interface ScenarioOutcome extends CoreOutcome {
  recommendation: Recommendation;
  basis: DecisionBasis;
  reasons: string[];
  decision: Decision;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
/** strip float noise (76.80000000000001 → 76.8) without moving a value */
const tidy = (n: number) => Math.round(n * 1e6) / 1e6;

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

interface Figures {
  leverageX: number;
  interestCoverageX: number;
  fixedChargeCoverageX: number;
  ebitdaMarginPct: number;
  liquidity: number;
}

/** The structural model, before calibration: ratios straight from the drivers. */
function rawFiguresAt(deal: Deal, s: Scenario): Figures {
  const f = deal.financials;
  const ebitda = Math.max(0.1, s.ebitda);
  const debt = Math.max(0.1, s.debt);
  const rate = Math.max(0.001, s.rate / 100); // percent → fraction
  const interest = debt * rate;
  return {
    leverageX: debt / ebitda,
    interestCoverageX: ebitda / interest,
    fixedChargeCoverageX: ebitda / (interest + fixedChargeBase(deal)),
    ebitdaMarginPct: f.revenueTtm > 0 ? (ebitda / f.revenueTtm) * 100 : f.ebitdaMarginPct,
    liquidity: Math.max(0, s.liquidity),
  };
}

interface Calibration {
  /** filed ratio ÷ structural ratio at the baseline (1 when the filed ratio is unusable) */
  k: { leverageX: number; interestCoverageX: number; fixedChargeCoverageX: number };
  /** the calibrated figures at the baseline: the filed ratios */
  base: Figures;
}

const CALIBRATION = new WeakMap<Deal, Calibration>();

/**
 * Anchor the model to the FILED ratios. The filed figures are rounded (4.26x
 * where debt ÷ EBITDA is 4.2611x; the base rate prints as 11.18%), so the raw
 * model would sit a hair off the record at base: 14.98% headroom where the
 * gate tested 15.0%, and the sandbox could disagree with the gate on exactly
 * the files that sit on a line. Each ratio is scaled by filed ÷ model at the
 * baseline, so the model reproduces the filed ratios there and moves with the
 * drivers proportionally everywhere else (monotonicity and shape unchanged).
 */
function calibrationOf(deal: Deal): Calibration {
  const hit = CALIBRATION.get(deal);
  if (hit) return hit;
  const f = deal.financials;
  const raw = rawFiguresAt(deal, baselineScenario(deal));
  const ratio = (filed: number, model: number) =>
    Number.isFinite(filed) && filed > 0 && Number.isFinite(model) && model > 0 ? filed / model : 1;
  const k = {
    leverageX: ratio(f.leverageX, raw.leverageX),
    interestCoverageX: ratio(f.interestCoverageX, raw.interestCoverageX),
    fixedChargeCoverageX: ratio(f.fixedChargeCoverageX, raw.fixedChargeCoverageX),
  };
  const cal: Calibration = { k, base: scaled(raw, k) };
  CALIBRATION.set(deal, cal);
  return cal;
}

function scaled(x: Figures, k: Calibration['k']): Figures {
  return {
    ...x,
    leverageX: x.leverageX * k.leverageX,
    interestCoverageX: x.interestCoverageX * k.interestCoverageX,
    fixedChargeCoverageX: x.fixedChargeCoverageX * k.fixedChargeCoverageX,
  };
}

function figuresAt(deal: Deal, s: Scenario): Figures {
  return scaled(rawFiguresAt(deal, s), calibrationOf(deal).k);
}

function valueAt(c: CovenantSpec, x: Figures): number {
  switch (c.kind) {
    case 'leverage':
      return x.leverageX;
    case 'interest':
      return x.interestCoverageX;
    case 'fixed':
      return x.fixedChargeCoverageX;
    case 'liquidity':
      return x.liquidity;
    default:
      return c.filedValue; // unmodelled covenant → its filed reading
  }
}

/**
 * Risk: baseline-anchored sensitivity. Leverage and coverage dominate (as in
 * the deals' own driver lists); each delta is taken against the calibrated
 * baseline figures, so it is zero at base and the score there equals the
 * published score. Clamped to keep the gauge readable. (All figures are
 * finite: the model floors EBITDA, debt and the rate.)
 */
function scoreAt(deal: Deal, x: Figures): number {
  const b = calibrationOf(deal).base;
  return clamp(
    Math.round(
      deal.risk.score +
        9 * (x.leverageX - b.leverageX) +
        5 * (b.interestCoverageX - x.interestCoverageX) +
        4 * (b.fixedChargeCoverageX - x.fixedChargeCoverageX) +
        0.4 * (b.liquidity - x.liquidity),
    ),
    1,
    99,
  );
}

function recomputeWith(deal: Deal, specs: CovenantSpec[], s: Scenario): CoreOutcome {
  const x = figuresAt(deal, s);
  const headroom = specs.map((c) => {
    const v = valueAt(c, x);
    return checkOf(c, v, c.kind === 'other' ? c.filedActual : fmtActual(c.kind, v));
  });
  const covenants: CovenantTest[] = deal.covenants.map((c, i) => {
    const k = headroom[i];
    if (!k || k.kind === 'other') return c; // unmodelled covenant → leave it untouched
    return { ...c, threshold: k.threshold, actual: k.actual, status: k.breach ? 'breach' : 'pass' };
  });
  const tight = tightestOf(headroom);
  const score = scoreAt(deal, x);
  return {
    ratios: {
      leverageX: x.leverageX,
      interestCoverageX: x.interestCoverageX,
      fixedChargeCoverageX: x.fixedChargeCoverageX,
      ebitdaMarginPct: x.ebitdaMarginPct,
    },
    covenants,
    headroom,
    minHeadroom: tight ? tight.headroom : null,
    risk: { score, rating: ratingFor(score), tone: riskTone(score) },
    breaches: headroom.filter((c) => c.breach).length,
  };
}

/**
 * The core recompute: ratios, covenants with signed headroom, and the risk
 * score for a scenario — NO decision. (At the baseline it reproduces the
 * deal's published covenants, ratios and score.)
 */
export function recompute(deal: Deal, s: Scenario, overrides?: TermOverrides): CoreOutcome {
  return recomputeWith(deal, withOverrides(specsOf(deal), overrides), s);
}

/** Tier 4 of the rule on a recomputed scenario: approvable at standard authority. */
export function isClean(o: CoreOutcome): boolean {
  return cleanOn(o.breaches, o.minHeadroom, o.risk.score, o.ratios.fixedChargeCoverageX, o.ratios.leverageX);
}

/**
 * The cure target (tier 4, `isClean`) split by what each half of a sponsor's
 * equity moves: `debtOk` = every covenant on debt, EBITDA or the rate (and any
 * unmodelled one) with the policy cushion, FCC over its floor and leverage
 * inside the outer limit — a debt paydown moves these; `liqOk` = every
 * liquidity covenant with the cushion — a liquidity top-up moves these; and the
 * risk score, which both move. Clean ⇔ debtOk ∧ liqOk ∧ score under the
 * referral line, computed without building strings (the search runs it often).
 */
interface Probe {
  debtOk: boolean;
  liqOk: boolean;
  score: number;
}

function probe(deal: Deal, specs: CovenantSpec[], s: Scenario): Probe {
  const x = figuresAt(deal, s);
  let debtOk =
    x.fixedChargeCoverageX >= FCC_FLOOR && leverageMeasurable(x.leverageX) && x.leverageX <= LEVERAGE_OUTER_LIMIT;
  let liqOk = true;
  for (const c of specs) {
    if (clears(c, valueAt(c, x))) continue;
    if (c.kind === 'liquidity') liqOk = false;
    else debtOk = false;
  }
  return { debtOk, liqOk, score: scoreAt(deal, x) };
}

const cleanProbe = (p: Probe) => p.debtOk && p.liqOk && p.score < REFER_SCORE;

// ===========================================================================
// Cure search
// ===========================================================================

/** The minimal restructure that makes a deal signable, found by pure search. */
export interface Cure {
  /** total sponsor equity contribution, $M (0 = the structure is already clean) */
  contribution: number;
  debtPaydown: number;
  liquidityTopUp: number;
  scenario: Scenario;
  outcome: ScenarioOutcome;
  /** the policy cap the search ran under, $M (35% of the structure's debt) */
  capM: number;
}

/** The cap in $0.1M units: 35% of the structure's debt, rounded down. */
function capTenths(s: Scenario): number {
  return Math.max(0, Math.floor(CURE_CAP * Math.max(0, s.debt) * 10 + 1e-9));
}

/** `p` × $0.1M of debt paydown and `t` × $0.1M to balance-sheet liquidity. */
function withEquity(s: Scenario, p: number, t: number): Scenario {
  return { ...s, debt: tidy(s.debt - p / 10), liquidity: tidy(s.liquidity + t / 10) };
}

/** The smallest k in [lo, hi] with ok(k), for ok monotone and ok(hi) true. */
function lowest(lo: number, hi: number, ok: (k: number) => boolean): number {
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ok(mid)) hi = mid;
    else lo = mid + 1;
  }
  return hi;
}

type CureSearch = { found: { p: number; t: number }; block: null } | { found: null; block: CureBlock };

/**
 * The exact minimal cure on the $0.1M grid. Paydown only helps the debt-side
 * tests and a top-up only the liquidity tests, so each side's smallest
 * sufficient amount (pMin, tMin) is a binary search; if either side cannot
 * clear with the whole cap, or both together need more than it, there is no
 * cure — and the side that failed is the reason. What remains is the risk
 * score. For a fixed amount E it is concave in the paydown share (leverage is
 * linear in the paydown, both coverages convex) and linear in the top-up, so
 * its best split over the feasible range [pMin, E − tMin] sits at one END of
 * it; a 5% interior grid is checked as well, as a guard on that claim. More
 * equity only helps on a fixed split, so the smallest amount is a binary
 * search too. Full paydown is preferred on ties. Existence (`size: false`)
 * tests only the cap.
 */
function searchCure(deal: Deal, specs: CovenantSpec[], s: Scenario, size: boolean): CureSearch {
  const cap = capTenths(s);
  const capM = cap / 10;
  const at = (p: number, t: number) => probe(deal, specs, withEquity(s, p, t));
  const zero = probe(deal, specs, s);
  if (cleanProbe(zero)) return { found: { p: 0, t: 0 }, block: null };
  if (cap <= 0) return { found: null, block: { kind: 'no-debt', capM } };

  // each half alone, with the whole cap
  let pMin = 0;
  if (!zero.debtOk) {
    if (!at(cap, 0).debtOk) return { found: null, block: paydownBlock(deal, specs, withEquity(s, cap, 0), capM) };
    pMin = lowest(1, cap, (p) => at(p, 0).debtOk);
  }
  let tMin = 0;
  if (!zero.liqOk) {
    if (!at(0, cap).liqOk) return { found: null, block: liquidityBlock(deal, specs, withEquity(s, 0, cap), capM) };
    tMin = lowest(1, cap, (t) => at(0, t).liqOk);
  }
  if (pMin + tMin > cap) {
    return { found: null, block: { kind: 'combined', capM, needM: (pMin + tMin) / 10, paydownM: pMin / 10, liquidityM: tMin / 10 } };
  }

  // the score: the best split of E tenths, paydown-heavy first
  const splitAt = (e: number): { p: number; t: number } | null => {
    const hiP = e - tMin;
    const cands = [hiP];
    for (let k = 1; k < 20; k++) cands.push(Math.round(hiP - ((hiP - pMin) * k) / 20));
    cands.push(pMin);
    for (const p of cands) if (cleanProbe(at(p, e - p))) return { p, t: e - p };
    return null;
  };
  const atCap = splitAt(cap);
  if (!atCap) {
    const best = Math.min(at(cap - tMin, tMin).score, at(pMin, cap - pMin).score);
    return { found: null, block: { kind: 'score', capM, best } };
  }
  if (!size) return { found: atCap, block: null };
  const e = lowest(pMin + tMin, cap, (k) => splitAt(k) !== null);
  return { found: splitAt(e) ?? atCap, block: null };
}

/** What still fails on the debt side with the whole cap paid down. */
function paydownBlock(deal: Deal, specs: CovenantSpec[], s: Scenario, capM: number): CureBlock {
  const x = figuresAt(deal, s);
  return {
    kind: 'paydown',
    capM,
    covenants: specs.filter((c) => c.kind !== 'liquidity' && !clears(c, valueAt(c, x))).map(metricLower),
    fccFloor: !(x.fixedChargeCoverageX >= FCC_FLOOR),
    outerLimit: !leverageMeasurable(x.leverageX) || x.leverageX > LEVERAGE_OUTER_LIMIT,
  };
}

/** What still fails on the liquidity side with the whole cap added to liquidity. */
function liquidityBlock(deal: Deal, specs: CovenantSpec[], s: Scenario, capM: number): CureBlock {
  const x = figuresAt(deal, s);
  return {
    kind: 'liquidity',
    capM,
    covenants: specs.filter((c) => c.kind === 'liquidity' && !clears(c, valueAt(c, x))).map(metricLower),
  };
}

function cureSignal(
  deal: Deal,
  specs: CovenantSpec[],
  s: Scenario,
  size: boolean,
): { cure: CureSignal | null; cureBlock: CureBlock | null } {
  const r = searchCure(deal, specs, s, size);
  return r.found
    ? { cure: { contribution: size ? (r.found.p + r.found.t) / 10 : null }, cureBlock: null }
    : { cure: null, cureBlock: r.block };
}

/**
 * Search for the smallest sponsor-equity contribution — debt paydown,
 * optionally part-allocated to balance-sheet liquidity, to $0.1M — that makes
 * the structure CLEAN: every covenant with at least the 15% policy cushion,
 * risk under the referral line, FCC over its floor, leverage inside the outer
 * limit — exactly the scenarios the same `decide` rule approves. Capped at 35%
 * of total debt ("policy limit"); beyond that a deal isn't restructured, it's
 * a different deal. Returns null when no cure exists within the cap (e.g.
 * Cobalt: `cureBlockFor` says why). Pure.
 */
export function findCure(deal: Deal, from: Scenario = baselineScenario(deal), overrides?: TermOverrides): Cure | null {
  const specs = withOverrides(specsOf(deal), overrides);
  const r = searchCure(deal, specs, from, true);
  if (!r.found) return null;
  const { p, t } = r.found;
  const scenario = p === 0 && t === 0 ? from : withEquity(from, p, t);
  return {
    contribution: (p + t) / 10,
    debtPaydown: p / 10,
    liquidityTopUp: t / 10,
    scenario,
    // a clean scenario has no breach, so this evaluate never searches again
    outcome: evaluate(deal, scenario, { overrides }),
    capM: capTenths(from) / 10,
  };
}

/**
 * Why no cure exists within the cap (null when one does): the constraint that
 * binds — a covenant the cushion cannot reach, the FCC floor, the outer
 * leverage limit, the combined amount, or the risk score.
 */
export function cureBlockFor(deal: Deal, from: Scenario = baselineScenario(deal), overrides?: TermOverrides): CureBlock | null {
  return searchCure(deal, withOverrides(specsOf(deal), overrides), from, false).block;
}

// ===========================================================================
// Decisions: scenario, filed figures, amended terms
// ===========================================================================

export interface EvaluateOptions {
  /** reviewer-amended thresholds to test against */
  overrides?: TermOverrides;
  /** the run's load-bearing confidence; omitted = no data gate (the sandbox) */
  confidence?: DecisionConfidence;
  /** size the minimal cure for the reason text (default: existence only — fast) */
  sizeCure?: boolean;
}

/**
 * Recompute everything from a scenario and decide on it. At the baseline this
 * returns exactly the deal's published covenants, ratios and risk score; away
 * from it, leverage and coverage move the score through a transparent,
 * baseline-anchored sensitivity (every term is zero at base).
 */
export function evaluate(deal: Deal, s: Scenario, opts: EvaluateOptions = {}): ScenarioOutcome {
  const specs = withOverrides(specsOf(deal), opts.overrides);
  const core = recomputeWith(deal, specs, s);
  const decision = decide({
    checks: core.headroom,
    score: core.risk.score,
    fixedChargeCoverageX: core.ratios.fixedChargeCoverageX,
    leverageX: core.ratios.leverageX,
    ...(core.breaches > 0 ? cureSignal(deal, specs, s, opts.sizeCure === true) : {}),
    cureCapM: capTenths(s) / 10,
    confidence: opts.confidence,
  });
  return { ...core, recommendation: decision.recommendation, basis: decision.basis, reasons: decision.reasons, decision };
}

export interface DealDecisionOptions {
  confidence?: DecisionConfidence;
  overrides?: TermOverrides;
  /** size the minimal cure for the reason text (default: existence only) */
  sizeCure?: boolean;
}

function decideFiled(deal: Deal, opts: DealDecisionOptions): { decision: Decision; checks: CovenantCheck[] } {
  const specs = withOverrides(specsOf(deal), opts.overrides);
  const checks = specs.map((c) => checkOf(c, c.filedValue, c.filedActual));
  const base = baselineScenario(deal);
  const decision = decide({
    checks,
    score: deal.risk.score,
    fixedChargeCoverageX: deal.financials.fixedChargeCoverageX,
    leverageX: deal.financials.leverageX,
    // the cure is searched on the model from the baseline (calibrated: it reproduces the filed figures)
    ...(checks.some((c) => c.breach) ? cureSignal(deal, specs, base, opts.sizeCure === true) : {}),
    cureCapM: capTenths(base) / 10,
    confidence: opts.confidence,
  });
  return { decision, checks };
}

/**
 * The decision on the deal's FILED figures (the covenant actuals as tested,
 * the extracted FCC and leverage, the published risk score) — what the agent
 * recommends at the gate. Pass the run's confidence to apply the data gate.
 */
export function decisionForDeal(deal: Deal, opts: DealDecisionOptions = {}): Decision {
  return decideFiled(deal, opts).decision;
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
 * Same rule, no data gate, cure existence only: plain arithmetic, cheap.
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

export interface AmendedOutcome {
  breaches: number;
  recommendation: Recommendation;
  /** names of covenants whose pass/breach status changed under the amendments */
  changed: string[];
  basis: DecisionBasis;
  reasons: string[];
  minHeadroom: number | null;
  decision: Decision;
}

/**
 * "Countersign as amended": re-test the deal's FILED covenant actuals against
 * reviewer-amended thresholds and re-run the same `decide` rule (headroom
 * included — a waiver that leaves 1% headroom is a thin approval, so it
 * escalates). No data gate. Pure — the gate previews it live as terms change.
 */
export function amendedOutcome(deal: Deal, overrides: TermOverrides): AmendedOutcome {
  const { decision, checks } = decideFiled(deal, { overrides, sizeCure: true });
  const filed = specsOf(deal);
  return {
    breaches: decision.breaches,
    recommendation: decision.recommendation,
    changed: checks.filter((c, i) => c.breach !== filed[i].filedBreach).map((c) => c.name),
    basis: decision.basis,
    reasons: decision.reasons,
    minHeadroom: decision.minHeadroom,
    decision,
  };
}
