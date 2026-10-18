// ---------------------------------------------------------------------------
// Countersign V2 · flip analysis (spec §9.4, Appendix A). ONE bisection serves
// both the "Nearest flip" line (analysis aid) and the stress test's zone
// boundaries, so a boundary label and the nearest-flip sentence always agree.
// Everything ends on the engine's own `evaluate` → `decide`.
// ---------------------------------------------------------------------------

import type { Deal } from '../../agent/mockData';
import type { Recommendation } from '../../agent/types';
import { baselineScenario, driversFor, evaluate } from '../../agent/whatif';
import type { Driver, DriverKey, Scenario } from '../../agent/whatif';
import { fmtM, fmtRate, fmtSigned } from './format';
import type { MeaningTone, TokenView } from './types';
import { tokenOf, tokenWord } from './vocab';

/** APPROVE good · ESCALATE warn · DECLINE bad (flip zones, outcome tokens). */
export function recTone(r: Recommendation): MeaningTone {
  return r === 'approve' ? 'good' : r === 'escalate' ? 'warn' : 'bad';
}

/** Display precision a boundary snaps to: 0.1 for $M, 0.05 for the rate. */
function precisionOf(d: Driver): number {
  return d.unit === 'pct' ? 0.05 : 0.1;
}

function roundTo(v: number, p: number): number {
  const inv = Math.round(1 / p);
  return Math.round(v * inv) / inv;
}

/** A driver value as printed: '$90.4M' or '11.25%'. */
export function fmtDriverValue(d: Pick<Driver, 'unit'>, v: number): string {
  return d.unit === 'pct' ? fmtRate(v) : fmtM(v);
}

/** A driver delta as printed: '−$5.9M' or '+0.25%'. */
export function fmtDriverDelta(d: Pick<Driver, 'unit'>, delta: number): string {
  return d.unit === 'pct' ? fmtSigned(delta, 'pct', 2) : fmtSigned(delta, 'usd');
}

function recAt(deal: Deal, scenario: Scenario, key: DriverKey, v: number): Recommendation {
  return evaluate(deal, { ...scenario, [key]: v }).recommendation;
}

interface Boundary {
  /** snapped boundary value, on the flipping side (its recommendation is `rec`) */
  value: number;
  /** recommendation beyond the boundary */
  rec: Recommendation;
  dir: 1 | -1;
}

/**
 * Walk from `start` in `dir` in steps of (max − min)/400 until the recommendation
 * changes; bisect 50 times between the last same point and the first different
 * point; snap to display precision toward the flipping side; confirm with
 * evaluate, stepping one more unit if needed. Null when nothing changes in range.
 */
function scanFrom(deal: Deal, scenario: Scenario, d: Driver, start: number, dir: 1 | -1): Boundary | null {
  const step = (d.max - d.min) / 400;
  if (!(step > 0)) return null;
  const from = recAt(deal, scenario, d.key, start);
  let same = start;
  let diff: number | null = null;
  for (let guard = 0; guard < 1000; guard++) {
    let next = same + dir * step;
    const atEnd = dir > 0 ? next >= d.max : next <= d.min;
    if (atEnd) next = dir > 0 ? d.max : d.min;
    if (next === same) return null;
    if (recAt(deal, scenario, d.key, next) !== from) {
      diff = next;
      break;
    }
    if (atEnd) return null;
    same = next;
  }
  if (diff === null) return null;

  let lo = same; // recommendation === from
  let hi = diff; // recommendation !== from
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (recAt(deal, scenario, d.key, mid) === from) lo = mid;
    else hi = mid;
  }

  const p = precisionOf(d);
  let snapped = roundTo(dir > 0 ? Math.ceil(hi / p - 1e-6) * p : Math.floor(hi / p + 1e-6) * p, p);
  let rec = recAt(deal, scenario, d.key, snapped);
  if (rec === from) {
    snapped = roundTo(snapped + dir * p, p);
    rec = recAt(deal, scenario, d.key, snapped);
  }
  if (rec === from) return null;
  return { value: snapped, rec, dir };
}

/**
 * Appendix A: the nearest single-driver change of the call.
 *  'Nearest flip · Total debt ≤ $90.4M (−$5.9M) → APPROVE'
 *  'No single driver reaches APPROVE in range · nearest change: Total debt ≤ $98.3M (−$13.7M) → ESCALATE'
 */
export function nearestFlip(deal: Deal): string {
  const base = baselineScenario(deal);
  const baseRec = evaluate(deal, base).recommendation;
  const candidates: { d: Driver; b: Boundary; dist: number }[] = [];
  for (const d of driversFor(deal)) {
    for (const dir of [-1, 1] as const) {
      const b = scanFrom(deal, base, d, d.base, dir);
      if (!b) continue;
      const dist = d.base !== 0 ? Math.abs(b.value - d.base) / Math.abs(d.base) : Math.abs(b.value - d.base);
      candidates.push({ d, b, dist });
    }
  }
  const nearest = (list: typeof candidates) => list.reduce<(typeof candidates)[number] | null>((best, c) => (!best || c.dist < best.dist ? c : best), null);
  const phrase = (c: (typeof candidates)[number]) =>
    `${c.d.label} ${c.b.dir < 0 ? '≤' : '≥'} ${fmtDriverValue(c.d, c.b.value)} (${fmtDriverDelta(c.d, c.b.value - c.d.base)}) → ${tokenWord(c.b.rec)}`;

  if (baseRec !== 'approve') {
    const toApprove = nearest(candidates.filter((c) => c.b.rec === 'approve'));
    if (toApprove) return `Nearest flip · ${phrase(toApprove)}`;
    const any = nearest(candidates);
    if (any) return `No single driver reaches ${tokenWord('approve')} in range · nearest change: ${phrase(any)}`;
    return 'No single driver changes the recommendation in range';
  }
  const any = nearest(candidates);
  return any ? `Nearest flip · ${phrase(any)}` : 'No single driver changes the recommendation in range';
}

/**
 * Recommendation zones along one driver's track (the other drivers held at the
 * scenario), with labelled boundaries. Boundaries come from the same scan as
 * `nearestFlip`, walked outward from the current value, so at the base scenario
 * the nearest boundary IS the nearest-flip number. Zones are gapless 0 → 100%.
 */
export function stressZones(
  deal: Deal,
  scenario: Scenario,
  key: DriverKey,
): { zones: { tone: MeaningTone; fromPct: number; toPct: number }[]; boundaries: { pct: number; text: string; tone: MeaningTone }[] } {
  const d = driversFor(deal).find((x) => x.key === key);
  if (!d || !(d.max > d.min)) return { zones: [], boundaries: [] };
  const span = d.max - d.min;
  const pctOf = (v: number) => Math.round(((Math.min(d.max, Math.max(d.min, v)) - d.min) / span) * 10000) / 100;
  const cur = Math.min(d.max, Math.max(d.min, scenario[key]));

  const found: Boundary[] = [];
  for (const dir of [-1, 1] as const) {
    let s = cur;
    for (let guard = 0; guard < 24; guard++) {
      const b = scanFrom(deal, scenario, d, s, dir);
      if (!b) break;
      if (dir > 0 ? b.value <= s : b.value >= s) break;
      found.push(b);
      s = b.value;
    }
  }

  const edges = [...new Set(found.map((b) => b.value))].sort((a, b) => a - b);
  const cuts = [d.min, ...edges.filter((v) => v > d.min && v < d.max), d.max];
  const zones: { tone: MeaningTone; fromPct: number; toPct: number }[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i];
    const b = cuts[i + 1];
    if (!(b > a)) continue;
    const tone = recTone(recAt(deal, scenario, key, (a + b) / 2));
    const last = zones[zones.length - 1];
    if (last && last.tone === tone) last.toPct = pctOf(b);
    else zones.push({ tone, fromPct: pctOf(a), toPct: pctOf(b) });
  }
  if (zones.length > 0) {
    zones[0].fromPct = 0;
    zones[zones.length - 1].toPct = 100;
  }

  const boundaries = found
    .filter((b) => b.value > d.min && b.value < d.max)
    .sort((a, b) => a.value - b.value)
    .map((b) => ({ pct: pctOf(b.value), text: fmtDriverValue(d, b.value), tone: recTone(b.rec) }));
  return { zones, boundaries };
}

/** A stable key for a scenario (attach dedupe per run). */
export function scenarioKey(deal: Deal, scenario: Scenario): string {
  return driversFor(deal)
    .map((d) => `${d.key}=${scenario[d.key].toFixed(2)}`)
    .join('|');
}

/** Drivers whose printed value differs from base. */
export function changedDrivers(deal: Deal, scenario: Scenario): Driver[] {
  const base = baselineScenario(deal);
  return driversFor(deal).filter((d) => fmtDriverValue(d, scenario[d.key]) !== fmtDriverValue(d, base[d.key]));
}

/**
 * The audit entry an attached stress test writes:
 *  label  'Stress test attached · ESCALATE → APPROVE (flips)' | '(holds)'
 *  detail 'Total debt $96.3M→$90.4M ⇒ risk 58→55, breaches 1→0'
 */
export function stressRecord(deal: Deal, scenario: Scenario): { label: string; detail: string; key: string } {
  const base = baselineScenario(deal);
  const b = evaluate(deal, base);
  const l = evaluate(deal, scenario);
  const parts = changedDrivers(deal, scenario).map(
    (d) => `${d.label} ${fmtDriverValue(d, base[d.key])}→${fmtDriverValue(d, scenario[d.key])}`,
  );
  const result = b.recommendation !== l.recommendation ? 'flips' : 'holds';
  const changes = parts.length > 0 ? parts.join(', ') : 'Base case';
  return {
    label: `Stress test attached · ${tokenWord(b.recommendation)} → ${tokenWord(l.recommendation)} (${result})`,
    detail: `${changes} ⇒ risk ${b.risk.score}→${l.risk.score}, breaches ${b.breaches}→${l.breaches}`,
    key: scenarioKey(deal, scenario),
  };
}

const WORD_REC: Record<string, Recommendation> = { APPROVE: 'approve', ESCALATE: 'escalate', DECLINE: 'decline' };

/** Read a stress label back into tokens (Exhibits); null for anything else. */
export function parseStressLabel(label: string): { from: TokenView; to: TokenView; result: 'flips' | 'holds' } | null {
  const m = /(APPROVE|ESCALATE|DECLINE) → (APPROVE|ESCALATE|DECLINE) \((flips|holds)\)/.exec(label);
  if (!m) return null;
  return { from: tokenOf(WORD_REC[m[1]]), to: tokenOf(WORD_REC[m[2]]), result: m[3] === 'flips' ? 'flips' : 'holds' };
}
