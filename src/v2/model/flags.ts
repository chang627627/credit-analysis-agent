// ---------------------------------------------------------------------------
// Countersign V2 · flags and anchors (spec §9.4). One classifier turns every
// engine flag into a page meaning (FlagKind), and `anchorFor` gives it the grid
// row it belongs beside, so a flag is never lost and never floats.
// Also: the amend-term helpers (gate state → engine Amendment[] → overrides).
// ---------------------------------------------------------------------------

import type { CovenantTest, Deal } from '../../agent/mockData';
import type { Amendment, Flag } from '../../agent/types';
import type { TermOverrides } from '../../agent/whatif';
import { EM, fmtM, fmtX } from './format';
import type { FigureId, FlagKind, MemoSection, MemoTarget, SectionId } from './types';

/**
 * Engine flag → page meaning. Order matters: the reviewer/structuring flags are
 * warnings too, so they are recognised by their message before severity.
 */
export function classifyFlag(f: Flag): FlagKind {
  const m = f.message;
  if (m.startsWith('Reviewer send-back')) return 'send-back';
  if (m.startsWith('Restructure proposed')) return 'restructure';
  if (m.startsWith('Structuring search exhausted')) return 'no-cure';
  if (/returned \d+% confidence/.test(m)) return 'low-confidence';
  if (f.severity === 'critical') return 'breach';
  if (f.severity === 'warning') return 'watch';
  return 'info';
}

/** Counted notes ("to review", "signed over"): breach, watch, low-confidence, no-cure. */
export function isCounted(kind: FlagKind): boolean {
  return kind === 'breach' || kind === 'watch' || kind === 'low-confidence' || kind === 'no-cure';
}

/** The text before the first spaced em dash, with a trailing '.' removed. */
export function flagClause(message: string): string {
  return message.split(` ${EM} `)[0].replace(/\.$/, '');
}

type CovKind = 'leverage' | 'interest' | 'fixed' | 'liquidity' | 'other';

/** The same name → ratio mapping as whatif's classify (kept private there). */
export function covenantKind(name: string): CovKind {
  const n = name.toLowerCase();
  if (n.includes('leverage')) return 'leverage';
  if (n.includes('interest')) return 'interest';
  if (n.includes('fixed')) return 'fixed';
  if (n.includes('liquid')) return 'liquidity';
  return 'other';
}

/** The filed covenant a figure is tested against (leverage, interest, fixed, liquidity), if any. */
export function covenantForFigure(deal: Deal, fig: FigureId): CovenantTest | undefined {
  const kind = fig === 'leverage' ? 'leverage' : fig === 'interest' ? 'interest' : fig === 'fixed' ? 'fixed' : fig === 'liquidity' ? 'liquidity' : null;
  if (!kind) return undefined;
  return deal.covenants.find((c) => covenantKind(c.name) === kind);
}

const MEMO_SECTIONS: readonly string[] = ['recommendation', 'financials', 'risk', 'peers', 'covenants', 'exhibits', 'stress', 'signature', 'monitoring'];

/** A section id as a memo card, or null when it names none ('revision-2' and the fixed cards). */
function memoSectionOf(id: string): MemoSection | null {
  if (MEMO_SECTIONS.includes(id)) return id as MemoSection;
  const rev = /^revision-(\d+)$/.exec(id);
  return rev ? `revision-${Number(rev[1])}` : null;
}

/**
 * Where a memo anchor lives (THREE-PANE §2.6): fig:* → financials · cov:* → covenants ·
 * rev<n>:* → revision-n · sec:<id> → that card · anything else → the page header.
 * The anchor rides along so the memo can nearest-scroll and cue the exact row.
 */
export function memoTargetOfAnchor(anchorId: string): MemoTarget {
  if (anchorId.startsWith('fig:')) return { section: 'financials', anchorId };
  if (anchorId.startsWith('cov:')) return { section: 'covenants', anchorId };
  const rev = /^rev(\d+):/.exec(anchorId);
  if (rev) return { section: `revision-${Number(rev[1])}`, anchorId };
  if (anchorId.startsWith('sec:')) {
    const section = memoSectionOf(anchorId.slice(4));
    if (section) return { section, anchorId };
  }
  return { section: 'header', anchorId: null };
}

/** A row anchor ("Show row") as opposed to a section anchor ("Show in memo"). */
export function isRowAnchor(anchorId: string): boolean {
  return !anchorId.startsWith('sec:');
}

/** step_extract→financials … step_package→recommendation, step_rework_N→`revision-N`. */
export function sectionOfStep(stepId: string): SectionId {
  const rework = /^step_rework_(\d+)$/.exec(stepId);
  if (rework) return `revision-${Number(rework[1])}`;
  switch (stepId) {
    case 'step_extract':
      return 'financials';
    case 'step_risk':
      return 'risk';
    case 'step_peers':
      return 'peers';
    case 'step_covenants':
      return 'covenants';
    default:
      return 'recommendation';
  }
}

/** Low-confidence flags name the tool first ('Risk Engine returned 70% confidence …'). */
const TOOL_SECTION: { prefix: string; section: (emitting: SectionId) => SectionId }[] = [
  { prefix: 'Risk Engine', section: () => 'risk' },
  { prefix: 'Peer Benchmarks', section: () => 'peers' },
  { prefix: 'Memo Builder', section: () => 'recommendation' },
  { prefix: 'Document Intelligence', section: () => 'financials' },
  { prefix: 'Covenant Tester', section: () => 'covenants' },
  // the Structuring Engine only runs inside a rework step: its revision section
  { prefix: 'Structuring Engine', section: (emitting) => emitting },
];

/**
 * The grid row a flag's margin note sits beside:
 *  breach → `cov:<name>` of the covenant its message starts with;
 *  watch → `cov:<name>` by ratio keyword, else the emitting section;
 *  low-confidence → the section the named tool wrote;
 *  send-back / restructure / no-cure → the emitting revision section;
 *  fallback → the emitting step's section (a flag is never lost).
 */
export function anchorFor(flag: Flag, emittingStepId: string, deal: Deal): string {
  const emitting = sectionOfStep(emittingStepId);
  const fallback = `sec:${emitting}`;
  const kind = classifyFlag(flag);
  const msg = flag.message;
  switch (kind) {
    case 'breach': {
      const cov = deal.covenants.find((c) => msg.startsWith(c.name));
      return cov ? `cov:${cov.name}` : fallback;
    }
    case 'watch': {
      const lower = msg.toLowerCase();
      const order: CovKind[] = ['leverage', 'interest', 'fixed', 'liquidity'];
      const key: Record<CovKind, string> = { leverage: 'leverage', interest: 'interest', fixed: 'fixed', liquidity: 'liquid', other: '' };
      for (const k of order) {
        if (!lower.includes(key[k])) continue;
        const cov = deal.covenants.find((c) => covenantKind(c.name) === k);
        if (cov) return `cov:${cov.name}`;
      }
      return fallback;
    }
    case 'low-confidence': {
      const hit = TOOL_SECTION.find((t) => msg.startsWith(t.prefix));
      return hit ? `sec:${hit.section(emitting)}` : fallback;
    }
    case 'send-back':
    case 'restructure':
    case 'no-cure':
      return fallback;
    default:
      return fallback;
  }
}

// ---- amend terms (gate draft → engine record → what-if overrides)

/**
 * The engine Amendment[] for the live gate draft. Labels are exactly
 * 'Max Total Leverage covenant' / 'Min Liquidity covenant'; from/to read
 * '≤ 4.00x' → '≤ 4.30x' and '≥ $10.0M' → '≥ $8.0M'. A value equal to the filed
 * term is not an amendment.
 */
export function amendmentsFor(deal: Deal, levMax: number | null, liqMin: number | null): Amendment[] {
  const out: Amendment[] = [];
  for (const c of deal.covenants) {
    const kind = covenantKind(c.name);
    if (kind === 'leverage' && levMax !== null && Number.isFinite(levMax)) {
      const to = `≤ ${fmtX(levMax)}`;
      if (to !== c.threshold) out.push({ label: `${c.name} covenant`, from: c.threshold, to });
    }
    if (kind === 'liquidity' && liqMin !== null && Number.isFinite(liqMin)) {
      const to = `≥ ${fmtM(liqMin)}`;
      if (to !== c.threshold) out.push({ label: `${c.name} covenant`, from: c.threshold, to });
    }
  }
  return out;
}

/** What-if overrides from the live gate draft (null = term as filed). */
export function overridesFor(levMax: number | null, liqMin: number | null): TermOverrides {
  const o: TermOverrides = {};
  if (levMax !== null && Number.isFinite(levMax)) o.leverageMax = levMax;
  if (liqMin !== null && Number.isFinite(liqMin)) o.liquidityMin = liqMin;
  return o;
}

/**
 * What-if overrides parsed from a RECORDED decision ('≤ 4.30x' → leverageMax
 * 4.3, '≥ $8.0M' → liquidityMin 8). The record is the source after the seal.
 */
export function overridesFromAmendments(a: Amendment[] | null): TermOverrides {
  const o: TermOverrides = {};
  for (const am of a ?? []) {
    const m = am.to.match(/[\d.]+/);
    if (!m) continue;
    const v = parseFloat(m[0]);
    if (!Number.isFinite(v)) continue;
    const kind = covenantKind(am.label);
    if (kind === 'leverage') o.leverageMax = v;
    else if (kind === 'liquidity') o.liquidityMin = v;
  }
  return o;
}
