// ---------------------------------------------------------------------------
// Countersign V2 · evidence (spec §1 pillar 1, §9.4). ONE classifier gives every
// memo figure exactly one evidence class, using the SAME formatter set for the
// CIM match and the memo: an uploaded CIM that states its leverage therefore
// reclassifies that figure as Quoted automatically. Also the covenant cushion
// and distance (signed, one shared scale).
// ---------------------------------------------------------------------------

import type { Deal, ExtractedFinancials } from '../../agent/mockData';
import { MIN_HEADROOM } from '../../agent/policy';
import { headroomOf } from '../../agent/whatif';
import { fmtM, fmtPct, fmtSigned, fmtX } from './format';
import type { CushionView, EvidenceView, FigureId } from './types';
import { NOT_IN_CIM, NOT_IN_CIM_SHORT } from './vocab';

/** 'CIM para 2': the plain-words address of a CIM paragraph (owner feedback: the ¶ mark read as noise). */
export function paraLabel(n: number): string {
  return `CIM para ${n}`;
}

/** Split a CIM body on blank lines and join wrapped lines with one space. */
export function paragraphsOf(body: string): { n: number; label: string; text: string }[] {
  return body
    .split(/\n[ \t]*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter((p) => p.length > 0)
    .map((text, i) => ({ n: i + 1, label: String(i + 1), text }));
}

/** The eight figures in memo order, with their labels. */
export const FIGURES: { id: FigureId; label: string }[] = [
  { id: 'revenue', label: 'Revenue (TTM)' },
  { id: 'ebitda', label: 'Adj. EBITDA' },
  { id: 'margin', label: 'EBITDA margin' },
  { id: 'debt', label: 'Total debt' },
  { id: 'leverage', label: 'Total leverage' },
  { id: 'interest', label: 'Interest coverage' },
  { id: 'fixed', label: 'Fixed-charge coverage' },
  { id: 'liquidity', label: 'Liquidity' },
];

/** The figure's value on the deal's filed financials. */
export function figureValue(deal: Deal, fig: FigureId): number {
  return financialValue(deal.financials, fig);
}

/** The figure's value on a set of extracted financials (a step result or the deal's own). */
export function financialValue(f: ExtractedFinancials, fig: FigureId): number {
  switch (fig) {
    case 'revenue':
      return f.revenueTtm;
    case 'ebitda':
      return f.ebitdaTtm;
    case 'margin':
      return f.ebitdaMarginPct;
    case 'debt':
      return f.totalDebt;
    case 'leverage':
      return f.leverageX;
    case 'interest':
      return f.interestCoverageX;
    case 'fixed':
      return f.fixedChargeCoverageX;
    case 'liquidity':
      return f.liquidity;
  }
}

/** The one formatter per figure (money 1dp, percent 1dp, ratios 2dp). */
export function fmtFigure(fig: FigureId, value: number): string {
  switch (fig) {
    case 'revenue':
    case 'ebitda':
    case 'debt':
    case 'liquidity':
      return fmtM(value);
    case 'margin':
      return fmtPct(value);
    default:
      return fmtX(value);
  }
}

/** Stable id of a quoted span: paragraph number and character offset ('m2-63'). */
export function markIdFor(para: number, offset: number): string {
  return `m${para}-${offset}`;
}

/** First standalone occurrence of `needle` in `text` (not inside a longer number). */
function findStandalone(text: string, needle: string): number {
  let from = 0;
  for (;;) {
    const i = text.indexOf(needle, from);
    if (i < 0) return -1;
    const before = i > 0 ? text[i - 1] : '';
    const after = text[i + needle.length] ?? '';
    if (!/[0-9.]/.test(before) && !/[0-9]/.test(after)) return i;
    from = i + 1;
  }
}

export interface QuotedSpan { markId: string; para: number; start: number; end: number; figures: FigureId[] }

/**
 * Every quoted span in the file, in document order (paragraph, then offset).
 * Two figures with the same formatted string share one span.
 */
export function quotedSpans(deal: Deal, paras: { n: number; text: string }[]): QuotedSpan[] {
  const byId = new Map<string, QuotedSpan>();
  for (const { id } of FIGURES) {
    const needle = fmtFigure(id, figureValue(deal, id));
    for (const p of paras) {
      const at = findStandalone(p.text, needle);
      if (at < 0) continue;
      const markId = markIdFor(p.n, at);
      const hit = byId.get(markId);
      if (hit) hit.figures.push(id);
      else byId.set(markId, { markId, para: p.n, start: at, end: at + needle.length, figures: [id] });
      break;
    }
  }
  return [...byId.values()].sort((a, b) => a.para - b.para || a.start - b.start);
}

/** Paragraph text cut into plain and marked segments (marks are not interactive). */
export function segmentsOf(
  text: string,
  para: number,
  spans: QuotedSpan[],
  activeMarkId: string | null,
): { text: string; markId: string | null; active: boolean }[] {
  const mine = spans.filter((s) => s.para === para).sort((a, b) => a.start - b.start);
  const out: { text: string; markId: string | null; active: boolean }[] = [];
  let cursor = 0;
  for (const s of mine) {
    if (s.start < cursor) continue;
    if (s.start > cursor) out.push({ text: text.slice(cursor, s.start), markId: null, active: false });
    out.push({ text: text.slice(s.start, s.end), markId: s.markId, active: s.markId === activeMarkId });
    cursor = s.end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), markId: null, active: false });
  return out;
}

/** The quoted span (if any) for one formatted string, as markId + cite index. */
function quoteOf(
  needle: string,
  paras: { n: number; text: string }[],
  quotedMarkIds: string[],
): { para: number; markId: string; citeIndex: number } | null {
  for (const p of paras) {
    const at = findStandalone(p.text, needle);
    if (at < 0) continue;
    const markId = markIdFor(p.n, at);
    const citeIndex = quotedMarkIds.indexOf(markId);
    return { para: p.n, markId, citeIndex: citeIndex < 0 ? 0 : citeIndex };
  }
  return null;
}

/**
 * Exactly one class per figure:
 *  quoted when the formatted string occurs in a paragraph (first match);
 *  leverage otherwise derived 'debt ÷ ebitda', each operand carrying its own cite;
 *  interest / fixed / liquidity (and anything else not found) 'Not in the CIM · extraction model'
 *  (class 'unquoted': no CIM sentence states it, the extraction model produced it; R4.3).
 */
export function evidenceFor(
  fig: FigureId,
  value: number,
  deal: Deal,
  paras: { n: number; text: string }[],
  quotedMarkIds: string[],
): EvidenceView {
  const q = quoteOf(fmtFigure(fig, value), paras, quotedMarkIds);
  if (q) return { cls: 'quoted', text: 'Quoted', para: q.para, paraLabel: paraLabel(q.para), markId: q.markId, citeIndex: q.citeIndex };
  if (fig === 'leverage') {
    const f = deal.financials;
    const operand = (fid: FigureId, v: number) => {
      const oq = quoteOf(fmtFigure(fid, v), paras, quotedMarkIds);
      return { text: v.toFixed(1), markId: oq ? oq.markId : null, citeIndex: oq ? oq.citeIndex : null };
    };
    const debt = operand('debt', f.totalDebt);
    const ebitda = operand('ebitda', f.ebitdaTtm);
    return { cls: 'derived', text: 'Derived', formula: `${debt.text} ÷ ${ebitda.text}`, operands: [debt, ebitda] };
  }
  return unquotedEvidence();
}

/** The class of a figure no CIM sentence states (R4.3): the short form on screen, the full wording for assistive tech (R4.8). */
export function unquotedEvidence(): EvidenceView {
  return { cls: 'unquoted', text: NOT_IN_CIM_SHORT, full: NOT_IN_CIM };
}

/** Model-output evidence (not a CIM figure): the Risk Engine score or a revised structure. */
export function modelEvidence(source: 'risk' | 'revised'): EvidenceView {
  return source === 'risk'
    ? { cls: 'model', text: 'Model output · Risk Engine (internal-pd-v3)' }
    : { cls: 'model', text: 'Model output · Structuring Engine' };
}

/**
 * The class in full words, for accessible names and sentences: 'Quoted · CIM para 2' · 'Derived ·
 * 96.3 ÷ 22.6' · 'Not in the CIM · extraction model' · 'Model output · …'.
 */
export function evidenceText(e: EvidenceView): string {
  switch (e.cls) {
    case 'quoted':
      return `Quoted · ${e.paraLabel}`;
    case 'derived':
      return `Derived · ${e.formula}`;
    case 'unquoted':
      return e.full;
    case 'model':
      return e.text;
  }
}

/**
 * The class as printed under a key figure (R4.8): evidenceText, except that a figure the CIM does
 * not state reads the short 'Not in CIM', so the caption keeps to one line as before R4.3. The full
 * wording stays in the figure's accessible name.
 */
export function evidenceCaption(e: EvidenceView): string {
  return e.cls === 'unquoted' ? e.text : evidenceText(e);
}

/** Parse a threshold like '≤ 4.00x' / '≥ $10.0M'. */
export function parseThreshold(t: string): { dir: 'max' | 'min'; value: number; money: boolean } {
  const dir = t.includes('≤') || t.includes('<') ? 'max' : 'min';
  const m = t.match(/[\d.]+/);
  return { dir, value: m ? parseFloat(m[0]) : 0, money: t.includes('$') };
}

function parseActual(a: string): number {
  const m = a.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : NaN;
}

/**
 * Signed headroom exactly as the decision rule measures it (the engine's
 * `headroomOf`): a max covenant 1 − a/t, a min covenant 1 − t/a (= (a − t)/a),
 * printed as a percent. Tone bad below zero (a breach), warn under the policy
 * cushion (MIN_HEADROOM, 15%: the rule's "thin headroom"), neutral at or above
 * it. The tone reads the unrounded headroom, so a covenant row is thin exactly
 * when the rule calls it thin; the text rounds half away from zero.
 */
export function cushionOf(threshold: string, actual: string): CushionView {
  const t = parseThreshold(threshold);
  const a = parseActual(actual);
  const h = t.value === 0 ? null : headroomOf(t.dir, a, t.value);
  if (h === null) return { pct: 0, text: fmtSigned(0, 'pct'), tone: 'warn' };
  const raw = h * 100;
  // decimal rounding, half away from zero (1 − 5.71/4 is −42.75%, printed −42.8%)
  const pct = (Math.sign(raw) * Math.round(Math.abs(raw) * 10 + 1e-6)) / 10 || 0;
  const tone = h < 0 ? 'bad' : h < MIN_HEADROOM ? 'warn' : 'neutral';
  return { pct, text: fmtSigned(pct, 'pct'), tone };
}

/** '1.71x over' · '$4.1M short' · '0.10x room' · '$4.2M room'. */
export function distanceOf(name: string, threshold: string, actual: string): string {
  const t = parseThreshold(threshold);
  const a = parseActual(actual);
  if (!Number.isFinite(a)) return '';
  const diff = Math.abs(a - t.value);
  const amount = t.money ? fmtM(diff) : fmtX(diff);
  const breached = t.dir === 'max' ? a > t.value : a < t.value;
  if (!breached) return `${amount} room`;
  return `${amount} ${t.dir === 'max' ? 'over' : 'short'}`;
}
