// ---------------------------------------------------------------------------
// Countersign V2 · case file selectors (spec §7.2, §9.4 "File resolution",
// "Data sources for sections", "Key figures", "Notes", "Ask").
//
// `fileContext` resolves which run a file shows (live, sealed snapshot, or the
// bare deal) exactly once; every other derivation (sections, notes, the doc
// bar, the header, the source) reads that context. The Desk, the decision
// blocks and the exports reuse the same context, so a file reads the same on
// every screen. Step results are narrowed with type guards and fall back to the
// deal's own fields; nothing here throws on an unexpected shape.
// ---------------------------------------------------------------------------

import type { CovenantTest, Deal, ExtractedFinancials, RiskScore } from '../../agent/mockData';
import { DECLINE_SCORE, ratingFor, riskTone } from '../../agent/rating';
import { getPlan } from '../../agent/runAgent';
import type { Amendment, ApprovalPackage, Flag, NoteProvenance, PlanStep, Recommendation } from '../../agent/types';
import { amendedOutcome, baselineScenario, decide, findCure } from '../../agent/whatif';
import type { AuditHistoryEntry, RunDecision, RunRecord, StepView } from '../../hooks/useCreditAgent';
import type { CaseFileSnapshot, PresentedAtSign, V2Store } from '../state/store';
import {
  cushionOf,
  distanceOf,
  evidenceFor,
  evidenceText,
  FIGURES,
  fmtFigure,
  modelEvidence,
  paragraphsOf,
  paraLabel,
  parseThreshold,
  quotedSpans,
  segmentsOf,
} from './evidence';
import type { QuotedSpan } from './evidence';
import { amendmentsFor, anchorFor, classifyFlag, covenantKind, isCounted, overridesFromAmendments, sectionOfStep } from './flags';
import { nearestFlip, scenarioKey } from './flip';
import type { FlipOrigin } from './flip';
import {
  dotJoin,
  fmtAgo,
  fmtClock,
  fmtConf,
  fmtCountdown,
  fmtDuration,
  fmtElapsed,
  fmtHM,
  fmtM,
  fmtStamp,
  fmtX,
  listJoin,
  plural,
} from './format';
import { startConfirmCopy, stopConfirmCopy } from './select-commands';
import {
  dealOf,
  entriesOf,
  isRunLive,
  latestAwaitingAt,
  latestRunOfDeal,
  runOf,
  selectLiveDealId,
  selectPolicy,
  verbsDead,
} from './select-top';
import type {
  AppendixView,
  AskView,
  ConfirmView,
  ContentsView,
  CovenantRow,
  CushionView,
  DeskRow,
  DeskStage,
  DocBarView,
  EvidenceView,
  FigureId,
  FigureRow,
  FileMode,
  FileView,
  FlagKind,
  HeaderView,
  KeyFigureView,
  MeaningTone,
  NoteView,
  PeersBody,
  RecommendationBody,
  RevisionBody,
  RiskBody,
  SectionId,
  SectionPhase,
  SectionView,
  SourceView,
  StatusKey,
  StatusText,
  StubView,
} from './types';
import {
  COPY,
  driverTone,
  noCureText,
  PLAN_COUNTDOWN_S,
  provenanceText,
  sectionHeading,
  sectionOrdinal,
  STATUS_WORD,
  STEP_DESCRIBE,
  STEP_SECTION,
  tokenOf,
  tokenWord,
  TOOL_LABEL,
  VERB_WORD,
} from './vocab';

// =============================================================================
// Type guards over step results (spec §9.4 "Data sources for sections")
// =============================================================================

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
function isStr(v: unknown): v is string {
  return typeof v === 'string';
}

function asFinancials(v: unknown, deal: Deal): ExtractedFinancials {
  if (!isObj(v)) return deal.financials;
  const keys: (keyof ExtractedFinancials)[] = [
    'revenueTtm',
    'ebitdaTtm',
    'ebitdaMarginPct',
    'totalDebt',
    'leverageX',
    'interestCoverageX',
    'fixedChargeCoverageX',
    'liquidity',
  ];
  return keys.every((k) => isNum(v[k])) ? (v as unknown as ExtractedFinancials) : deal.financials;
}

function asRisk(v: unknown, deal: Deal): RiskScore {
  if (!isObj(v) || !isNum(v.score) || !isStr(v.rating) || !Array.isArray(v.drivers)) return deal.risk;
  const drivers = v.drivers.filter((d): d is { factor: string; impact: string } => isObj(d) && isStr(d.factor) && isStr(d.impact));
  return { score: v.score, scale: isStr(v.scale) ? v.scale : deal.risk.scale, rating: v.rating, drivers };
}

function asCovenants(v: unknown, deal: Deal): CovenantTest[] {
  if (!Array.isArray(v)) return deal.covenants;
  const ok = v.every(
    (c) => isObj(c) && isStr(c.name) && isStr(c.threshold) && isStr(c.actual) && (c.status === 'pass' || c.status === 'breach'),
  );
  return ok ? (v as CovenantTest[]) : deal.covenants;
}

interface PeerFig { leverageX: number; interestCoverageX: number; ebitdaMarginPct: number }
interface PeersData { deal: PeerFig; peers: (PeerFig & { cohort: string })[]; position: string }

function isPeerFig(v: unknown): v is PeerFig {
  return isObj(v) && isNum(v.leverageX) && isNum(v.interestCoverageX) && isNum(v.ebitdaMarginPct);
}

function asPeers(v: unknown): PeersData | null {
  if (!isObj(v) || !isPeerFig(v.deal) || !Array.isArray(v.peers) || !isStr(v.position)) return null;
  const peers = v.peers.filter((p): p is PeerFig & { cohort: string } => isPeerFig(p) && isObj(p) && isStr(p.cohort));
  return { deal: v.deal, peers, position: v.position };
}

export interface CureData {
  viable: true;
  contributionM: number;
  debtPaydownM: number;
  liquidityTopUpM: number;
  revised: { totalDebtM: number; leverageX: number; interestCoverageX: number; liquidityM: number; riskScore: number };
  breachesRemaining: number;
}

/** A Structuring Engine result: a viable cure, an exhausted search, or null when unreadable. */
export function asCure(v: unknown): CureData | { viable: false } | null {
  if (!isObj(v)) return null;
  if (v.viable === false) return { viable: false };
  const r = v.revised;
  if (
    v.viable === true &&
    isNum(v.contributionM) &&
    isNum(v.debtPaydownM) &&
    isNum(v.liquidityTopUpM) &&
    isObj(r) &&
    isNum(r.totalDebtM) &&
    isNum(r.leverageX) &&
    isNum(r.interestCoverageX) &&
    isNum(r.liquidityM) &&
    isNum(r.riskScore)
  ) {
    return {
      viable: true,
      contributionM: v.contributionM,
      debtPaydownM: v.debtPaydownM,
      liquidityTopUpM: v.liquidityTopUpM,
      revised: {
        totalDebtM: r.totalDebtM,
        leverageX: r.leverageX,
        interestCoverageX: r.interestCoverageX,
        liquidityM: r.liquidityM,
        riskScore: r.riskScore,
      },
      breachesRemaining: isNum(v.breachesRemaining) ? v.breachesRemaining : 0,
    };
  }
  return null;
}

/** The deal's own cure, computed by the same pure search the Structuring Engine runs (fallback). */
function cureFromEngine(deal: Deal): CureData | null {
  const c = findCure(deal);
  if (!c || c.contribution <= 0) return null;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    viable: true,
    contributionM: c.contribution,
    debtPaydownM: c.debtPaydown,
    liquidityTopUpM: c.liquidityTopUp,
    revised: {
      totalDebtM: c.scenario.debt,
      leverageX: r2(c.outcome.ratios.leverageX),
      interestCoverageX: r2(c.outcome.ratios.interestCoverageX),
      liquidityM: c.scenario.liquidity,
      riskScore: c.outcome.risk.score,
    },
    breachesRemaining: c.outcome.breaches,
  };
}

// =============================================================================
// Small shared helpers
// =============================================================================

const REWORK_RE = /^step_rework_(\d+)$/;

/** The revision number of a rework step id, or null. */
export function reworkN(stepId: string): number | null {
  const m = REWORK_RE.exec(stepId);
  return m ? Number(m[1]) : null;
}

/** The rework step's own words say whether it proposes a restructure (title set at step start). */
export function reworkProposes(title: string): boolean {
  return title.startsWith('Propose revised structure');
}

/** The tag after "Revision N" for a rework step. */
export function reworkTag(title: string): string {
  return reworkProposes(title) ? 'proposed restructure' : 'recommendation stands';
}

/** First letter lower-cased (verb words inside a sentence). */
function lowerFirst(t: string): string {
  return t.length > 0 ? t[0].toLowerCase() + t.slice(1) : t;
}

/** 'Total Leverage' → 'Total leverage'; acronyms and parentheses stay as written. */
function sentenceCase(label: string): string {
  return label
    .split(' ')
    .map((w, i) => (i > 0 && /^[A-Z][a-z]+$/.test(w) ? w.toLowerCase() : w))
    .join(' ');
}

/** 'args 3 fields' style counts: an array counts items, an object counts fields. */
function countOf(v: unknown): string {
  if (Array.isArray(v)) return plural(v.length, 'item');
  if (isObj(v)) return plural(Object.keys(v).length, 'field');
  return '1 value';
}

/** Confidence tone: neutral at 90% and above, warn 75 to 89, bad below the floor. Never green. */
export function confTone(c: number): 'ink-3' | 'warn' | 'bad' {
  return c >= 0.9 ? 'ink-3' : c >= 0.75 ? 'warn' : 'bad';
}

function cushionTone(c: CushionView): 'ink' | 'warn' | 'bad' {
  return c.tone === 'bad' ? 'bad' : c.tone === 'warn' ? 'warn' : 'ink';
}

function toolLabelOf(step: StepView | undefined, plan: PlanStep | undefined): string {
  if (step?.call?.label) return step.call.label;
  return plan ? TOOL_LABEL[plan.toolName] : 'Credit Analyst';
}

/** The covenant a figure is tested against (leverage, interest, fixed, liquidity), if any. */
function covenantForFigure(deal: Deal, fig: FigureId): CovenantTest | undefined {
  const kind = fig === 'leverage' ? 'leverage' : fig === 'interest' ? 'interest' : fig === 'fixed' ? 'fixed' : fig === 'liquidity' ? 'liquidity' : null;
  if (!kind) return undefined;
  return deal.covenants.find((c) => covenantKind(c.name) === kind);
}

/** Key-metric label → figure id. */
function figureOfLabel(label: string): FigureId | null {
  const l = label.toLowerCase();
  if (l.includes('revenue')) return 'revenue';
  if (l.includes('ebitda')) return 'ebitda';
  if (l.includes('leverage')) return 'leverage';
  if (l.includes('interest')) return 'interest';
  if (l.includes('fixed')) return 'fixed';
  if (l.includes('liquid')) return 'liquidity';
  return null;
}

/** "Max Total Leverage covenant" → "Max Total Leverage". */
export function amendmentName(a: Amendment): string {
  return a.label.replace(/ covenant$/, '');
}

/**
 * A countersigned ESCALATE routes onward unless the recorded amendments resolve it to APPROVE.
 * This is the ONE predicate every consequence line reads (decision panel, attestation, seal);
 * state/files `shouldRoute` performs the routing and must stay identical to it.
 */
export function routesOnSign(pkg: ApprovalPackage, deal: Deal, amendments: Amendment[] | null, auto: boolean): boolean {
  if (pkg.recommendation !== 'escalate' || auto) return false;
  if (amendedRecOf(deal, amendments) === 'approve') return false;
  return true;
}

/** The call the same decide rule gives on the amended terms (null when nothing is amended). */
export function amendedRecOf(deal: Deal, amendments: Amendment[] | null): Recommendation | null {
  return amendments && amendments.length > 0 ? amendedOutcome(deal, overridesFromAmendments(amendments)).recommendation : null;
}

/**
 * What a countersignature commits, said against the agent's own call, for the sealed caption,
 * the case-file seal and the Ledger run header. As filed: 'concurs ESCALATE'. As amended, the
 * amended outcome (never the agent's call): 'approves on <terms>', 'concurs ESCALATE on <terms>'
 * when it is the agent's call too, else 'records ESCALATE on <terms>'.
 */
export function signedVerdict(deal: Deal, agentRec: Recommendation, amendments: Amendment[] | null, terms: string): string {
  const am = amendedRecOf(deal, amendments);
  if (am === null) return `concurs ${tokenWord(agentRec)}`;
  if (am === 'approve') return `approves on ${terms}`;
  return `${am === agentRec ? 'concurs' : 'records'} ${tokenWord(am)} on ${terms}`;
}

/** The case-file seal's reviewer clause for an amended countersignature: what was signed. */
function amendedWho(deal: Deal, amendments: Amendment[] | null): string {
  const am = amendedRecOf(deal, amendments);
  return am === null ? 'You countersigned as amended.' : `You countersigned as amended: ${tokenWord(am)} on your amended terms.`;
}

/** Effective threshold of a covenant under amendments (the recorded `to`, else as filed). */
function effectiveThreshold(name: string, threshold: string, amendments: Amendment[]): { threshold: string; amended: { from: string; to: string } | null } {
  const a = amendments.find((x) => amendmentName(x) === name);
  return a ? { threshold: a.to, amended: { from: a.from, to: a.to } } : { threshold, amended: null };
}

/** Filed covenants whose pass/breach flips under the amendments (the engine's amendedOutcome). */
export function amendedChanged(deal: Deal, amendments: Amendment[]): string[] {
  return amendments.length > 0 ? amendedOutcome(deal, overridesFromAmendments(amendments)).changed : [];
}

// =============================================================================
// Run timing (receipt, Ledger meta, wait clocks)
// =============================================================================

export interface RunTiming {
  /** active drafting time: the run's span minus every suspension */
  draftedMs: number;
  /** the latest suspension, up to the decision (or now) */
  finalWaitMs: number | null;
}

/** Walk a run's entries: each "Awaiting human approval" opens a suspension, a send-back closes it. */
export function runTiming(entries: AuditHistoryEntry[], startedAt: number, endAt: number): RunTiming {
  let open: number | null = null;
  let total = 0;
  let finalWait: number | null = null;
  for (const e of entries) {
    if (e.label.startsWith('Awaiting human approval')) open = e.t;
    else if (e.label === 'Plan extended · reviewer send-back' && open !== null) {
      total += Math.max(0, e.t - open);
      open = null;
    }
  }
  if (open !== null) {
    finalWait = Math.max(0, endAt - open);
    total += finalWait;
  }
  return { draftedMs: Math.max(0, endAt - startedAt - total), finalWaitMs: finalWait };
}

// =============================================================================
// File context: which run a file shows (spec §9.4 "File resolution")
// =============================================================================

export interface SealInfo {
  outcome: 'approve' | 'reject';
  decision: RunDecision;
  note: string | null;
  provenance: NoteProvenance | null;
  amendments: Amendment[] | null;
  auto: boolean;
  decidedAt: number;
  routed: boolean;
  presented: PresentedAtSign | null;
}

export interface FileCtx {
  s: V2Store;
  deal: Deal;
  live: boolean;
  source: 'live' | 'snapshot' | 'deal';
  mode: FileMode;
  runId: number | null;
  run: RunRecord | undefined;
  plan: PlanStep[];
  steps: StepView[];
  pkg: ApprovalPackage | null;
  seal: SealInfo | null;
  snapshot: CaseFileSnapshot | null;
  cancelled: { run: RunRecord; detail: string; at: number; prior: CaseFileSnapshot | null } | null;
  entries: AuditHistoryEntry[];
  paras: { n: number; label: string; text: string }[];
  spans: QuotedSpan[];
  markIds: string[];
}

function presentedFor(s: V2Store, runId: number): PresentedAtSign | null {
  const js = s.gate.justSigned;
  if (js && js.runId === runId) return js.presented;
  return s.snapshotList.find((x) => x.runId === runId)?.presented ?? null;
}

function liveSeal(s: V2Store, deal: Deal, pkg: ApprovalPackage | null, run: RunRecord | undefined): SealInfo {
  const a = s.agent;
  const outcome: 'approve' | 'reject' = a.status === 'approved' ? 'approve' : 'reject';
  const amendments = a.decisionAmendments && a.decisionAmendments.length > 0 ? a.decisionAmendments : null;
  const decision: RunDecision =
    run?.decision && run.decision !== 'cancelled'
      ? run.decision
      : a.decisionAuto
        ? 'auto-countersigned'
        : outcome === 'approve'
          ? amendments
            ? 'countersigned-amended'
            : 'countersigned'
          : 'rejected';
  return {
    outcome,
    decision,
    note: a.decisionNote,
    provenance: a.decisionNoteProvenance,
    amendments,
    auto: a.decisionAuto,
    decidedAt: a.decidedAt ?? run?.decidedAt ?? s.now,
    routed: outcome === 'approve' && !!pkg && routesOnSign(pkg, deal, amendments, a.decisionAuto),
    presented: presentedFor(s, a.runId),
  };
}

function snapshotSeal(s: V2Store, snap: CaseFileSnapshot): SealInfo {
  return {
    outcome: snap.outcome,
    decision: snap.decision,
    note: snap.note,
    provenance: snap.noteProvenance,
    amendments: snap.amendments && snap.amendments.length > 0 ? snap.amendments : null,
    auto: snap.auto,
    decidedAt: snap.decidedAt,
    routed: snap.routed,
    presented: snap.presented ?? presentedFor(s, snap.runId),
  };
}

function ctxBase(s: V2Store, deal: Deal) {
  const paras = paragraphsOf(deal.document.body);
  const spans = quotedSpans(deal, paras);
  return {
    s,
    deal,
    paras,
    spans,
    markIds: spans.map((x) => x.markId),
    seal: null as SealInfo | null,
    snapshot: null as CaseFileSnapshot | null,
    cancelled: null as FileCtx['cancelled'],
  };
}

/**
 * The file's latest SEALED record, read from its snapshot regardless of what the file shows now
 * (a re-run in plan review, drafting, at the gate or cancelled). Null when nothing was sealed.
 * The file export reads this, so a sealed record exports intact even after the deal is re-run.
 */
export function snapshotContext(s: V2Store, dealId: string): FileCtx | null {
  const deal = dealOf(s, dealId);
  const snap = s.snapshots[dealId];
  if (!deal || !snap) return null;
  return {
    ...ctxBase(s, deal),
    live: false,
    source: 'snapshot',
    mode: 'sealed',
    runId: snap.runId,
    run: runOf(s, snap.runId),
    plan: snap.plan,
    steps: snap.steps,
    pkg: snap.pkg,
    seal: snapshotSeal(s, snap),
    snapshot: snap,
    entries: entriesOf(s, snap.runId),
  };
}

/** Resolve the run a file shows. Null for an unknown deal id. */
export function fileContext(s: V2Store, dealId: string): FileCtx | null {
  const deal = dealOf(s, dealId);
  if (!deal) return null;
  const a = s.agent;
  const base = ctxBase(s, deal);

  if (dealId === selectLiveDealId(s)) {
    if (a.status === 'plan_review') {
      return { ...base, live: true, source: 'live', mode: 'plan-review', runId: null, run: undefined, plan: a.plan, steps: [], pkg: null, entries: [] };
    }
    const run = runOf(s, a.runId);
    const mode: FileMode =
      a.status === 'running'
        ? 'running'
        : a.status === 'awaiting_approval'
          ? 'gate'
          : a.status === 'approved' || a.status === 'rejected'
            ? 'sealed'
            : 'error';
    const pkg = a.approvalPackage;
    return {
      ...base,
      live: true,
      source: 'live',
      mode,
      runId: a.runId,
      run,
      plan: a.plan,
      steps: a.steps,
      pkg,
      seal: mode === 'sealed' ? liveSeal(s, deal, pkg, run) : null,
      entries: entriesOf(s, a.runId),
    };
  }

  const latest = latestRunOfDeal(s, dealId);
  const snap = s.snapshots[dealId] ?? null;
  if (latest && latest.decision === 'cancelled' && (!snap || latest.runId > snap.runId)) {
    const entries = entriesOf(s, latest.runId);
    let detail = 'reset before a decision';
    let at = latest.decidedAt ?? latest.startedAt;
    for (const e of entries) {
      if (e.label === 'Run cancelled') {
        if (e.detail) detail = e.detail;
        at = e.t;
      }
    }
    return {
      ...base,
      live: false,
      source: 'deal',
      mode: 'not-started',
      runId: null,
      run: undefined,
      plan: getPlan(),
      steps: [],
      pkg: null,
      cancelled: { run: latest, detail, at, prior: snap },
      entries: [],
    };
  }
  if (snap) return snapshotContext(s, dealId);
  return { ...base, live: false, source: 'deal', mode: 'not-started', runId: null, run: undefined, plan: getPlan(), steps: [], pkg: null, entries: [] };
}

/** The live gate on this file, at a package built on the filed figures (amendable). */
function amendable(ctx: FileCtx): boolean {
  return ctx.live && ctx.mode === 'gate' && !!ctx.pkg && !ctx.pkg.restructure && !verbsDead(ctx.s);
}

/** Amendments in force for the page: the live draft at the gate, or the recorded ones after the seal. */
export function amendmentsOf(ctx: FileCtx): Amendment[] {
  if (ctx.live && ctx.mode === 'gate' && ctx.pkg && !ctx.pkg.restructure) {
    return amendmentsFor(ctx.deal, ctx.s.gate.levMax, ctx.s.gate.liqMin);
  }
  if (ctx.mode === 'sealed' && ctx.seal?.amendments) return ctx.seal.amendments;
  return [];
}

/** Where the suspension of this file started (the latest "Awaiting human approval"). */
export function awaitingAtOf(ctx: FileCtx): number | null {
  return latestAwaitingAt(ctx.entries) ?? ctx.snapshot?.awaitingAt ?? null;
}

/** The step result data for a step id, if it ran. */
function stepData(ctx: FileCtx, stepId: string): unknown {
  return ctx.steps.find((st) => st.id === stepId)?.result?.data;
}

/** The Structuring Engine's result for revision N (fallback: the same pure search). */
export function cureOf(ctx: FileCtx, n: number): CureData | null {
  const c = asCure(stepData(ctx, `step_rework_${n}`));
  // a viable result with no contribution means the filed structure already passes: nothing was proposed
  if (c && c.viable) return c.contributionM > 0 ? c : null;
  if (c && !c.viable) return null;
  return cureFromEngine(ctx.deal);
}

// =============================================================================
// Drafting point (doc bar, Desk stage, tab title agree on "where the pen is")
// =============================================================================

interface DraftPoint { heading: string; index: number; total: number; rework: number | null; tag: string | null }

function draftPoint(ctx: FileCtx): DraftPoint {
  const runnable = ctx.plan.filter((p) => !p.skipped && reworkN(p.id) === null);
  const total = runnable.length;
  let cur: StepView | undefined;
  for (const st of ctx.steps) if (st.status === 'running') cur = st;
  if (!cur && ctx.steps.length > 0) cur = ctx.steps[ctx.steps.length - 1];
  // a send-back resumes the loop before the revision step starts: the pen is already on revision N
  const pkg = ctx.pkg;
  if (ctx.mode === 'running' && pkg && (!cur || (reworkN(cur.id) ?? 0) <= pkg.revision)) {
    const n = pkg.revision + 1;
    const title = ctx.plan.find((p) => p.id === `step_rework_${n}`)?.title;
    return { heading: sectionHeading(`revision-${n}`), index: total, total, rework: n, tag: title ? reworkTag(title) : null };
  }
  if (cur) {
    const n = reworkN(cur.id);
    if (n !== null) {
      const title = ctx.plan.find((p) => p.id === cur?.id)?.title ?? cur.title;
      return { heading: sectionHeading(`revision-${n}`), index: total, total, rework: n, tag: reworkTag(title) };
    }
    let idx = runnable.findIndex((p) => p.id === cur?.id);
    if (cur.status === 'done' && idx >= 0 && idx < runnable.length - 1) idx += 1;
    const step = runnable[Math.max(0, idx)];
    const sec = step ? STEP_SECTION[step.id] ?? sectionOfStep(step.id) : 'recommendation';
    return { heading: sectionHeading(sec), index: Math.max(0, idx) + 1, total, rework: null, tag: null };
  }
  const first = runnable[0];
  return { heading: sectionHeading(first ? STEP_SECTION[first.id] ?? sectionOfStep(first.id) : 'financials'), index: 1, total, rework: null, tag: null };
}

// =============================================================================
// Stage (Desk rows, the doc-bar file menu)
// =============================================================================

export interface StageView {
  stage: DeskStage;
  status: StatusText;
  subMeta: string | null;
  action: DeskRow['action'];
}

function decidedState(decision: RunDecision): StatusKey {
  return decision === 'auto-countersigned' ? 'signed-auto' : decision === 'rejected' ? 'rejected' : decision === 'cancelled' ? 'cancelled' : 'signed';
}

/** Counted flags of a package, with whether an amendment cleared each (its covenant now passes). */
export function countedFlagsOf(deal: Deal, pkg: ApprovalPackage, amendments: Amendment[]): { flag: Flag; kind: FlagKind; cleared: boolean; covenant: string | null }[] {
  const changed = amendedChanged(deal, amendments);
  return pkg.flags
    .map((flag) => ({ flag, kind: classifyFlag(flag) }))
    .filter((x) => isCounted(x.kind))
    .map(({ flag, kind }) => {
      const anchor = anchorFor(flag, 'step_covenants', deal);
      const covenant = anchor.startsWith('cov:') ? anchor.slice(4) : null;
      return { flag, kind, cleared: kind === 'breach' && covenant !== null && changed.includes(covenant), covenant };
    });
}

/** The parsing reason every start control carries while extraction runs. */
export function parsingReason(s: V2Store): string | null {
  return s.agent.parsing ? `Extraction in progress · ${s.agent.parsing.name}` : null;
}

export function stageOf(ctx: FileCtx): StageView {
  const s = ctx.s;
  const parsing = s.agent.parsing !== null;
  switch (ctx.mode) {
    case 'plan-review': {
      const p = s.plan;
      const text = p.held
        ? 'Plan review · held'
        : p.deadline !== null
          ? `Plan review · starts in ${fmtCountdown(p.deadline, s.now)}`
          : 'Plan review · open the file to start';
      return { stage: 'plan-review', status: { state: 'awaiting', text }, subMeta: null, action: { kind: 'open-plan', label: COPY.openPlan, variant: 'secondary', disabled: false } };
    }
    case 'running': {
      const dp = draftPoint(ctx);
      const elapsed = ctx.run ? fmtElapsed(s.now - ctx.run.startedAt) : null;
      const text = ['Drafting', dp.heading, elapsed].filter((x): x is string => !!x).join(' · ');
      return { stage: 'drafting', status: { state: 'drafting', text }, subMeta: null, action: { kind: 'open', label: COPY.open, variant: 'ghost', disabled: false } };
    }
    case 'gate': {
      const at = awaitingAtOf(ctx);
      const rev = ctx.pkg?.revision ?? 1;
      const text = `Awaiting you · rev ${rev}${at !== null ? ` · waiting ${fmtElapsed(s.now - at)}` : ''}`;
      return { stage: 'awaiting', status: { state: 'awaiting', text }, subMeta: null, action: { kind: 'review', label: COPY.reviewAndCountersign, variant: 'primary', disabled: false } };
    }
    case 'error':
      return {
        stage: 'error',
        status: { state: 'error', text: 'Run error · drafting stopped' },
        subMeta: null,
        action: { kind: 're-run', label: COPY.reRun, variant: 'secondary', disabled: parsing },
      };
    case 'sealed': {
      const seal = ctx.seal;
      if (!seal || !ctx.pkg) break;
      const state = decidedState(seal.decision);
      const text = `${VERB_WORD[seal.decision]} ${fmtHM(seal.decidedAt)}`;
      const counted = countedFlagsOf(ctx.deal, ctx.pkg, seal.amendments ?? []).filter((x) => !x.cleared);
      const parts: string[] = [];
      if (seal.outcome === 'approve') {
        const breaches = counted.filter((x) => x.kind === 'breach').length;
        if (breaches > 0) parts.push(`signed over ${plural(breaches, 'breach', 'breaches')}`);
        else if (counted.length > 0) parts.push(`signed over ${plural(counted.length, 'note')}`);
        if (seal.routed) parts.push('routed to the Book');
      } else if (counted.length > 0) {
        parts.push(`${plural(counted.length, 'note')} on the record`);
      }
      return {
        stage: 'decided',
        status: { state, text },
        subMeta: parts.length > 0 ? parts.join(' · ') : 'no notes',
        action: { kind: 'open-record', label: COPY.openRecord, variant: 'ghost', disabled: false },
      };
    }
    default:
      break;
  }
  return {
    stage: 'not-started',
    status: { state: 'pending', text: STATUS_WORD.pending },
    subMeta: ctx.cancelled ? `Last run cancelled · ${ctx.cancelled.detail}` : null,
    action: { kind: 'draft', label: COPY.draftMemo, variant: 'secondary', disabled: parsing },
  };
}

// =============================================================================
// Notes (margin) and the evidence check
// =============================================================================

interface FlagRef { flag: Flag; kind: FlagKind; step: StepView; anchorId: string; sectionId: SectionId }

/** Every flag on the page in emission order, with its anchor and the section whose margin holds it. */
function flagRefs(ctx: FileCtx, sectionIds: SectionId[]): FlagRef[] {
  const out: FlagRef[] = [];
  for (const step of ctx.steps) {
    for (const flag of step.flags) {
      const anchorId = anchorFor(flag, step.id, ctx.deal);
      let sectionId: SectionId = anchorId.startsWith('cov:') ? 'covenants' : (anchorId.slice(4) as SectionId);
      if (!sectionIds.includes(sectionId)) sectionId = sectionOfStep(step.id);
      out.push({ flag, kind: classifyFlag(flag), step, anchorId, sectionId });
    }
  }
  return out;
}

/** Flag message → the times its "Flag · <severity>" audit entries were written, consumed in order. */
function flagTimer(entries: AuditHistoryEntry[]): (message: string) => number | null {
  const queue = new Map<string, number[]>();
  for (const e of entries) {
    if (!e.label.startsWith('Flag · ') || !e.detail) continue;
    const q = queue.get(e.detail);
    if (q) q.push(e.t);
    else queue.set(e.detail, [e.t]);
  }
  return (message) => {
    const q = queue.get(message);
    return q && q.length > 0 ? q.shift() ?? null : null;
  };
}

/** A restructured revision supersedes rev 1's filed-figure notes: they are no longer on the package. */
function supersededBy(ctx: FileCtx, ref: FlagRef): number | null {
  const pkg = ctx.pkg;
  if (!pkg || !pkg.restructure) return null;
  if (pkg.flags.some((f) => f.id === ref.flag.id)) return null;
  const n = reworkN(ref.step.id);
  if (n !== null && n > pkg.revision) return null; // emitted while drafting the next revision
  return pkg.revision;
}

function noteHeading(ref: FlagRef): string {
  const cov = ref.anchorId.startsWith('cov:') ? ref.anchorId.slice(4) : null;
  switch (ref.kind) {
    case 'breach':
      return cov ? `Breach · ${cov}` : STATUS_WORD.breach;
    case 'watch':
      return cov ? `Watch · ${cov}` : STATUS_WORD.watch;
    case 'low-confidence': {
      const tool = Object.values(TOOL_LABEL).find((t) => ref.flag.message.startsWith(t));
      return tool ? `Low confidence · ${tool}` : 'Low confidence';
    }
    case 'send-back': {
      const m = /^Reviewer send-back \(rev (\d+)/.exec(ref.flag.message);
      return `${STATUS_WORD.returned} · rev ${m ? m[1] : '1'}`;
    }
    case 'restructure':
      return 'Restructure proposed';
    case 'no-cure':
      return 'No cure within policy';
    default:
      return STATUS_WORD.info;
  }
}

function noteTone(kind: FlagKind): { tone: NoteView['tone']; status: StatusKey } {
  switch (kind) {
    case 'breach':
      return { tone: 'breach', status: 'breach' };
    case 'watch':
    case 'low-confidence':
    case 'no-cure':
      return { tone: 'watch', status: 'watch' };
    case 'send-back':
      return { tone: 'returned', status: 'returned' };
    default:
      return { tone: 'info', status: 'info' };
  }
}

export interface NotesBuild {
  bySection: Map<SectionId, NoteView[]>;
  /** counted notes in page order (signed-over after an approval) */
  toReview: NoteView[];
}

/** Steps 1 to 4 first; the recommendation is read LAST, after any revisions, right above the
    signature (owner feedback: nobody reads the conclusion before walking steps 1 to 4). */
const PAGE_ORDER: SectionId[] = ['financials', 'risk', 'peers', 'covenants'];

/** Section ids on the page, in page order (steps 1 to 4, each revision, then the recommendation). */
function pageSectionIds(ctx: FileCtx): SectionId[] {
  const out: SectionId[] = [...PAGE_ORDER];
  for (const p of ctx.plan) {
    const n = reworkN(p.id);
    if (n !== null) out.push(`revision-${n}`);
  }
  out.push('recommendation');
  return out;
}

export function buildNotes(ctx: FileCtx): NotesBuild {
  const s = ctx.s;
  const ids = pageSectionIds(ctx);
  const refs = flagRefs(ctx, ids);
  const timeOf = flagTimer(ctx.entries);
  const canAmend = amendable(ctx);
  const sealedApprove = ctx.mode === 'sealed' && ctx.seal?.outcome === 'approve';
  const opened = ctx.live ? s.gate.opened : [];
  const bySection = new Map<SectionId, NoteView[]>();

  for (const ref of refs) {
    const t = timeOf(ref.flag.message);
    const sup = supersededBy(ctx, ref);
    const counted = isCounted(ref.kind) && sup === null;
    const planStep = ctx.plan.find((p) => p.id === ref.step.id);
    const tool = toolLabelOf(ref.step, planStep);
    const clock = t !== null ? ` · ${fmtClock(t)}` : '';
    let meta: string;
    if (ref.kind === 'send-back') {
      const m = /^Reviewer send-back \(rev (\d+)/.exec(ref.flag.message);
      meta = `Reviewer · rev ${m ? m[1] : '1'}${clock}`;
    } else {
      meta = `raised by ${tool}${clock}`;
    }
    if (sup !== null) meta += ` · superseded by rev ${sup}`;

    const covName = ref.anchorId.startsWith('cov:') ? ref.anchorId.slice(4) : null;
    const covKind = covName ? covenantKind(covName) : 'other';
    const amendKind: NoteView['amendKind'] =
      canAmend && counted && (covKind === 'leverage' || covKind === 'liquidity') ? covKind : null;
    const actions: NoteView['actions'] = [];
    if (covName) actions.push({ kind: 'show', label: COPY.showRow });
    actions.push({ kind: 'trace', label: COPY.trace });
    if (amendKind) actions.push({ kind: 'amend', label: COPY.amendTerm });

    let { tone, status } = noteTone(ref.kind);
    if (sup !== null) {
      tone = 'info';
      status = 'info';
    } else if (counted && sealedApprove) {
      tone = 'signed-over';
      status = 'signed-over';
    }

    const note: NoteView = {
      id: `note:${ref.flag.id}`,
      flagId: ref.flag.id,
      kind: ref.kind,
      tone,
      status,
      heading: noteHeading(ref),
      text: ref.flag.message,
      meta,
      anchorId: ref.anchorId,
      counted,
      opened: opened.includes(ref.flag.id),
      actions,
      traceStepId: ref.step.id,
      amendKind,
    };
    const list = bySection.get(ref.sectionId);
    if (list) list.push(note);
    else bySection.set(ref.sectionId, [note]);
  }

  const toReview: NoteView[] = [];
  for (const id of ids) for (const n of bySection.get(id) ?? []) if (n.counted) toReview.push(n);
  return { bySection, toReview };
}

function evidenceCheckNote(ctx: FileCtx, rows: FigureRow[]): NoteView {
  const unquoted = rows.filter((r) => r.evidence.cls === 'unquoted');
  const names = unquoted.map((r) => lowerFirst(r.label));
  let text =
    unquoted.length === 0
      ? `All ${rows.length} figures are quoted in the CIM or derived from quoted figures.`
      : `${unquoted.length} of ${rows.length} figures are not quoted in the CIM: ${listJoin(names)}. They come from the extraction model; verify against the source.`;
  const extract = ctx.steps.find((st) => st.id === 'step_extract');
  if (ctx.deal.uploaded && extract?.result) {
    text += ` Extraction ran at ${fmtConf(extract.result.confidence)} confidence on an unseen document.`;
  }
  return {
    id: 'note:evidence-check',
    flagId: null,
    kind: 'evidence-check',
    tone: 'info',
    status: 'info',
    heading: COPY.evidenceCheck,
    text,
    meta: COPY.evidenceCheckMeta,
    anchorId: 'sec:financials',
    counted: false,
    opened: false,
    actions: [{ kind: 'trace', label: COPY.trace }],
    traceStepId: 'step_extract',
    amendKind: null,
  };
}

// =============================================================================
// Section bodies
// =============================================================================

function figureRows(ctx: FileCtx, data: unknown): FigureRow[] {
  const f = asFinancials(data, ctx.deal);
  const value = (id: FigureId): number => {
    switch (id) {
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
  };
  return FIGURES.map(({ id, label }) => {
    const v = value(id);
    return { id, anchorId: `fig:${id}`, label, value: fmtFigure(id, v), evidence: evidenceFor(id, v, ctx.deal, ctx.paras, ctx.markIds) };
  });
}

function riskBody(ctx: FileCtx, data: unknown): RiskBody {
  const r = asRisk(data, ctx.deal);
  return {
    scoreText: String(r.score),
    outOf: COPY.riskOutOf,
    rating: r.rating,
    tone: riskTone(r.score),
    value: r.score,
    tick: DECLINE_SCORE,
    tickCaption: COPY.riskTickCaption,
    evidence: modelEvidence('risk'),
    drivers: r.drivers.map((d) => ({ factor: d.factor, impact: d.impact, tone: driverTone(d.impact) })),
  };
}

function peersBody(ctx: FileCtx, data: unknown): PeersBody | null {
  const p = asPeers(data);
  if (!p) return null;
  const median = p.peers.find((x) => /median/i.test(x.cohort)) ?? p.peers[Math.floor(p.peers.length / 2)];
  const row = (cohort: string, x: PeerFig, isDeal: boolean) => ({
    cohort,
    leverage: fmtX(x.leverageX),
    interest: fmtX(x.interestCoverageX),
    margin: fmtFigure('margin', x.ebitdaMarginPct),
    isDeal,
  });
  return {
    rows: [row('This deal', p.deal, true), ...p.peers.map((x) => row(x.cohort, x, false))],
    position: `${ctx.deal.name} is ${p.position}${median ? ` (${fmtX(median.leverageX)})` : ''}. Comparables are simulated.`,
  };
}

const AMEND_FIELD = {
  leverage: { step: 0.05, min: 1, max: 8, prefix: '≤ ', suffix: 'x' },
  liquidity: { step: 0.5, min: 0, max: 50, prefix: '≥ $', suffix: 'M' },
} as const;

/** One covenant row: signed cushion on the effective threshold; status re-tested under amendments. */
export function covenantRow(c: CovenantTest, amendments: Amendment[], changed: string[], amend: CovenantRow['amend']): CovenantRow {
  const eff = effectiveThreshold(c.name, c.threshold, amendments);
  const pass = (c.status === 'pass') !== changed.includes(c.name);
  const word = pass ? STATUS_WORD.pass : STATUS_WORD.breach;
  return {
    anchorId: `cov:${c.name}`,
    name: c.name,
    threshold: c.threshold,
    amended: eff.amended,
    actual: c.actual,
    cushion: cushionOf(eff.threshold, c.actual),
    status: pass ? 'pass' : 'breach',
    statusText: eff.amended ? `${word} · as amended` : word,
    amend,
  };
}

function covenantRows(ctx: FileCtx, data: unknown): CovenantRow[] {
  const tests = asCovenants(data, ctx.deal);
  const amendments = amendmentsOf(ctx);
  const changed = amendedChanged(ctx.deal, amendments);
  const fields = amendable(ctx);
  const g = ctx.s.gate;
  return tests.map((c) => {
    const kind = covenantKind(c.name);
    let amend: CovenantRow['amend'] = null;
    if (fields && (kind === 'leverage' || kind === 'liquidity')) {
      const filed = parseThreshold(c.threshold).value;
      const value = kind === 'leverage' ? g.levMax ?? filed : g.liqMin ?? filed;
      amend = { kind, value, ...AMEND_FIELD[kind] };
    }
    return covenantRow(c, amendments, changed, amend);
  });
}

function keyFigures(ctx: FileCtx, pkg: ApprovalPackage, rows: FigureRow[]): KeyFigureView[] {
  return pkg.keyMetrics.map((k) => {
    const id = figureOfLabel(k.label);
    const label = sentenceCase(k.label);
    const [value, second] = k.value.split(' · ');
    const revised = k.source === 'propose_restructure' && !!pkg.restructure;
    const row = id ? rows.find((r) => r.id === id) : undefined;
    const evidence: EvidenceView = revised ? modelEvidence('revised') : row?.evidence ?? { cls: 'unquoted', text: 'Unquoted · extracted' };
    const traceStepId = revised ? `step_rework_${pkg.revision}` : 'step_extract';
    const anchorId = revised && id ? `rev${pkg.revision}:${id}` : id ? `fig:${id}` : 'sec:financials';
    const cov = id ? covenantForFigure(ctx.deal, id) : undefined;
    let caption: string | null = null;
    let tone: KeyFigureView['tone'] = 'ink';
    let dot: MeaningTone | null = null;
    if (cov) {
      const cushion = cushionOf(cov.threshold, value);
      const distance = distanceOf(cov.name, cov.threshold, value);
      caption = cushion.pct < 0 ? `${distance} ${cov.threshold}` : `${distance} · ${cov.threshold}`;
      tone = cushionTone(cushion);
      dot = tone === 'bad' ? 'bad' : tone === 'warn' ? 'warn' : null;
    }
    const sub = id === 'ebitda' && second ? `${second} margin` : second ?? null;
    const evText = evidenceText(evidence);
    const toolLabel = revised ? TOOL_LABEL.propose_restructure : TOOL_LABEL.extract_financials;
    return {
      label,
      value,
      sub,
      caption,
      tone,
      dot,
      evidenceText: evText,
      traceStepId,
      anchorId,
      ariaLabel: `${label} ${value}${caption ? `, ${caption}` : ''}. ${evText}. Trace to ${toolLabel}.`,
    };
  });
}

/** Cache: the nearest-flip scan is pure over an immutable deal object (and an optional origin). */
const FLIP_CACHE = new WeakMap<Deal, Map<string, string>>();
function nearestFlipCached(deal: Deal, origin?: FlipOrigin): string {
  let byKey = FLIP_CACHE.get(deal);
  if (!byKey) {
    byKey = new Map();
    FLIP_CACHE.set(deal, byKey);
  }
  const k = origin ? `${origin.rec}@${scenarioKey(deal, origin.scenario)}` : 'filed';
  const hit = byKey.get(k);
  if (hit !== undefined) return hit;
  const v = nearestFlip(deal, origin);
  if (byKey.size > 40) byKey.clear();
  byKey.set(k, v);
  return v;
}

/**
 * The analysis aid under the recommendation. On a revised structure the standing call is the
 * revised one, so the flip is read from the revised figures (how far that APPROVE is from being
 * lost), never from the filed figures, which would offer a flip "to APPROVE" under an APPROVE.
 */
function flipLine(ctx: FileCtx, pkg: ApprovalPackage): string {
  if (!pkg.restructure) return nearestFlipCached(ctx.deal);
  const cure = cureOf(ctx, pkg.revision);
  if (!cure) return COPY.flipSeeStress;
  const scenario = { ...baselineScenario(ctx.deal), debt: cure.revised.totalDebtM, liquidity: cure.revised.liquidityM };
  return `${COPY.flipOnRevised} · ${nearestFlipCached(ctx.deal, { scenario, rec: pkg.recommendation })}`;
}

function filedCounts(ctx: FileCtx): { breaches: number; score: number } {
  const tests = asCovenants(stepData(ctx, 'step_covenants'), ctx.deal);
  const risk = asRisk(stepData(ctx, 'step_risk'), ctx.deal);
  return { breaches: tests.filter((c) => c.status === 'breach').length, score: risk.score };
}

function recommendationSentence(ctx: FileCtx, pkg: ApprovalPackage): string {
  if (pkg.restructure) {
    const cure = cureOf(ctx, pkg.revision);
    const score = cure ? cure.revised.riskScore : ctx.deal.risk.score;
    return `Approve the revised structure. ${fmtM(pkg.restructure.contribution)} sponsor equity clears every covenant; risk ${score} (${pkg.riskRating}).`;
  }
  const { breaches, score } = filedCounts(ctx);
  switch (pkg.recommendation) {
    case 'approve':
      return `Approve. Every covenant passes on the filed figures; risk ${score} (${pkg.riskRating}).`;
    case 'escalate':
      return `Escalate to a credit officer. ${breaches === 1 ? '1 covenant breach rules' : `${breaches} covenant breaches rule`} out approval; risk ${score} sits below the ${DECLINE_SCORE} decline line.`;
    case 'decline':
      return `Decline as structured. ${plural(breaches, 'covenant breach', 'covenant breaches')} and risk ${score}, at or above the ${DECLINE_SCORE} decline line.`;
  }
}

function recommendationBody(ctx: FileCtx, pkg: ApprovalPackage, rows: FigureRow[]): RecommendationBody {
  const restructured = !!pkg.restructure;
  let reworkLine: string | null = null;
  if (ctx.mode === 'running') {
    for (const st of ctx.steps) {
      const n = reworkN(st.id);
      if (n !== null && n > pkg.revision && st.status === 'running') {
        reworkLine = `Revision ${n} is being drafted. This recommendation is from rev ${pkg.revision}.`;
      }
    }
  }
  const filed = filedCounts(ctx);
  const filedRec = decide(filed.breaches, filed.score);
  return {
    basis: restructured ? `On the proposed revised structure · rev ${pkg.revision}` : COPY.basisFiled,
    prior: restructured ? tokenOf(filedRec) : null,
    token: tokenOf(pkg.recommendation),
    sentence: recommendationSentence(ctx, pkg),
    summary: pkg.summary,
    keyFigures: keyFigures(ctx, pkg, rows),
    aidLabel: COPY.aidLabel,
    nearestFlip: flipLine(ctx, pkg),
    stressLinkLabel: COPY.stressLink,
    reworkLine,
  };
}

/** The send-back that opened revision N: the note, its provenance and when it was written. */
export function returnedRecord(ctx: FileCtx, n: number): { note: string; provenance: NoteProvenance; at: number | null } {
  const step = ctx.steps.find((st) => st.id === `step_rework_${n}`);
  const planStep = ctx.plan.find((p) => p.id === `step_rework_${n}`);
  let note: string | null = null;
  const argNote = step?.call?.args.reviewerNote;
  if (isStr(argNote)) note = argNote;
  if (note === null && ctx.pkg && ctx.pkg.reviewerNotes.length >= n - 1) note = ctx.pkg.reviewerNotes[n - 2] ?? null;
  if (note === null && step) {
    const m = /“([\s\S]*?)” Restating/.exec(step.thinking);
    if (m) note = m[1];
  }
  const g = ctx.s.gate;
  if (note === null && ctx.live && g.note.trim()) note = g.note.trim();

  let provenance: NoteProvenance = 'authored';
  const flag = step?.flags.find((f) => f.message.startsWith('Reviewer send-back'));
  if (flag) {
    if (flag.message.includes('note agent-drafted, accepted verbatim')) provenance = 'drafted-verbatim';
    else if (flag.message.includes('note agent-drafted, edited by reviewer')) provenance = 'drafted-edited';
  } else if (ctx.live && g.insertedDraft !== null && g.note.trim()) {
    provenance = g.note.trim() === g.insertedDraft.trim() ? 'drafted-verbatim' : 'drafted-edited';
  }

  let at: number | null = null;
  for (const e of ctx.entries) {
    if (e.label === 'Plan extended · reviewer send-back' && (!planStep || e.detail === planStep.title)) at = e.t;
  }
  return { note: note ?? '', provenance, at };
}

function revisionBody(ctx: FileCtx, n: number, data: unknown): RevisionBody {
  const rec = returnedRecord(ctx, n);
  const returned = rec.note
    ? {
        quote: `“${rec.note}”`,
        attribution: ['Reviewer', `rev ${n - 1}`, rec.at !== null ? fmtHM(rec.at) : null, provenanceText(rec.provenance, false, true)]
          .filter((x): x is string => !!x)
          .join(' · '),
      }
    : null;
  const parsed = asCure(data);
  if (parsed && !parsed.viable) {
    return { n, returned, viable: false, summary: null, redline: [], noCure: noCureTextFor(ctx.deal) };
  }
  // The filed structure already clears every covenant (the search returns a zero contribution, or
  // finds nothing to cure): no restructure was proposed and the recommendation stands. Never a
  // "$0.0M sponsor equity" proposal, and never the no-cure line, which would be false here.
  const needsNone = parsed && parsed.viable ? parsed.contributionM <= 0 : filedCounts(ctx).breaches === 0;
  if (needsNone) return { n, returned, viable: true, summary: COPY.noRestructureNeeded, redline: [], noCure: null };
  const cure = parsed && parsed.viable ? parsed : cureFromEngine(ctx.deal);
  if (!cure) return { n, returned, viable: false, summary: null, redline: [], noCure: noCureTextFor(ctx.deal) };
  const f = ctx.deal.financials;
  const score = cure.revised.riskScore;
  const { breaches: filedBreaches, score: filedScore } = filedCounts(ctx);
  const fromRec = tokenWord(decide(filedBreaches, filedScore));
  const toRec = tokenWord(decide(cure.breachesRemaining, score));
  const line = (key: string, label: string, from: string, to: string) => ({ label, from, to, unchanged: from === to, anchorId: `rev${n}:${key}` });
  const split =
    `${fmtM(cure.debtPaydownM)} debt paydown` + (cure.liquidityTopUpM > 0 ? ` and ${fmtM(cure.liquidityTopUpM)} to liquidity` : '');
  return {
    n,
    returned,
    viable: true,
    summary: `The Structuring Engine proposes ${fmtM(cure.contributionM)} sponsor equity as ${split}. Every covenant passes on the revised structure, and risk recomputes to ${score} (${ratingFor(score)}) through the same decide rule.`,
    redline: [
      line('equity', 'Sponsor equity', COPY.noCall, fmtM(cure.contributionM)),
      line('debt', 'Total debt', fmtM(f.totalDebt), fmtM(cure.revised.totalDebtM)),
      line('leverage', 'Total leverage', fmtX(f.leverageX), fmtX(cure.revised.leverageX)),
      line('interest', 'Interest coverage', fmtX(f.interestCoverageX), fmtX(cure.revised.interestCoverageX)),
      line('liquidity', 'Liquidity', fmtM(f.liquidity), fmtM(cure.revised.liquidityM)),
      line('risk', 'Risk score', String(filedScore), String(score)),
      line('recommendation', 'Recommendation', fromRec, toRec),
    ],
    noCure: null,
  };
}

/** §10 no-cure copy with the deal's own cap (35% of total debt, the Structuring Engine's policy limit). */
function noCureTextFor(deal: Deal): string {
  return noCureText(fmtM(deal.financials.totalDebt * 0.35));
}

function stubOf(step: StepView): StubView | null {
  if (!step.call || !step.result) return null;
  const conf = step.result.confidence;
  const argsCount = countOf(step.call.args);
  const resultCount = countOf(step.result.data);
  return {
    stepId: step.id,
    tool: step.call.label,
    meta: `${fmtDuration(step.result.durationMs)} · ${fmtConf(conf)}`,
    confTone: confTone(conf),
    recordMeta: `args ${argsCount} · result ${resultCount}`,
    argsLabel: COPY.argsLabel,
    argsCount,
    args: step.call.args,
    resultLabel: COPY.resultLabel,
    resultCount,
    result: step.result.data,
    reasoning: step.thinking,
  };
}

// =============================================================================
// Sections
// =============================================================================

type SectionBaseView = Omit<SectionView, 'kind' | 'body'>;

function buildSections(ctx: FileCtx, notes: NotesBuild, rows: FigureRow[]): SectionView[] {
  if (ctx.mode === 'not-started' || ctx.mode === 'plan-review') return [];
  const out: SectionView[] = [];
  const pkg = ctx.pkg;
  const running = ctx.mode === 'running';

  const planFor = (sec: SectionId): PlanStep | undefined =>
    ctx.plan.find((p) => (reworkN(p.id) !== null ? sectionOfStep(p.id) === sec : (STEP_SECTION[p.id] ?? sectionOfStep(p.id)) === sec));

  for (const id of pageSectionIds(ctx)) {
    const planStep = planFor(id);
    if (!planStep) continue;
    const step = ctx.steps.find((st) => st.id === planStep.id);
    const n = reworkN(planStep.id);
    let phase: SectionPhase;
    if (planStep.skipped) phase = 'excluded';
    else if (!step) phase = 'pending';
    else if (step.status === 'done') phase = 'set';
    else if (running) phase = 'drafting';
    else if (ctx.mode === 'error') phase = 'stopped';
    else phase = step.result ? 'set' : 'stopped';
    // the memo is "set" only once its package exists (a short gap after the Memo Builder returns)
    if (id === 'recommendation' && phase === 'set' && !pkg) phase = running ? 'drafting' : 'pending';
    if (n !== null && phase === 'set' && !step?.result) phase = running ? 'drafting' : 'stopped';

    const status: StatusKey =
      phase === 'set' ? 'done' : phase === 'drafting' ? 'drafting' : phase === 'excluded' ? 'excluded' : phase === 'stopped' ? 'error' : 'pending';
    const drafting =
      phase === 'drafting' && step
        ? {
            text: step.thinking,
            callLine: step.call && !step.result ? `Calling ${step.call.label}…` : null,
            caret: running,
          }
        : null;

    let suffix: string | null = null;
    const baseView: SectionBaseView = {
      id,
      anchorId: `sec:${id}`,
      ordinal: sectionOrdinal(id),
      heading: sectionHeading(id),
      suffix,
      phase,
      status,
      statusLabel: phase === 'stopped' ? COPY.stopped : STATUS_WORD[status],
      pendingLine: id === 'recommendation' ? COPY.pendingRecommendation : COPY.pendingSection,
      drafting,
      stub: step && phase !== 'drafting' ? stubOf(step) : null,
      notes: notes.bySection.get(id) ?? [],
    };
    const set = phase === 'set';

    if (id === 'recommendation') {
      out.push({ ...baseView, kind: 'recommendation', body: set && pkg ? recommendationBody(ctx, pkg, rows) : null });
    } else if (id === 'financials') {
      out.push({ ...baseView, kind: 'financials', body: set ? rows : null });
    } else if (id === 'risk') {
      out.push({ ...baseView, kind: 'risk', body: set ? riskBody(ctx, step?.result?.data) : null });
    } else if (id === 'peers') {
      out.push({ ...baseView, kind: 'peers', body: set ? peersBody(ctx, step?.result?.data) : null });
    } else if (id === 'covenants') {
      const body = set ? covenantRows(ctx, step?.result?.data) : null;
      if (body) {
        const breached = body.filter((r) => r.status === 'breach').length;
        suffix = breached === 0 ? `· all ${body.length} pass` : `· ${breached} of ${body.length} breached`;
      }
      out.push({ ...baseView, suffix, kind: 'covenants', body });
    } else if (n !== null) {
      suffix = `· ${reworkTag(planStep.title)}`;
      out.push({ ...baseView, suffix, kind: 'revision', body: set ? revisionBody(ctx, n, step?.result?.data) : null });
    }
  }
  return out;
}

// =============================================================================
// Header, contents, source, appendix, doc bar
// =============================================================================

function headerView(ctx: FileCtx): HeaderView {
  const d = ctx.deal;
  const drafted = ctx.mode === 'running' || ctx.mode === 'gate' || ctx.mode === 'sealed' || ctx.mode === 'error';
  const rev = ctx.pkg?.revision ?? 1;
  const startedAt = ctx.run?.startedAt ?? ctx.snapshot?.startedAt ?? null;
  const preparedAt = awaitingAtOf(ctx) ?? startedAt;
  const lastPara = ctx.paras.length > 0 ? ctx.paras[ctx.paras.length - 1].n : 1;
  const range = lastPara > 1 ? `paras 1 to ${lastPara}` : 'para 1';
  const when = drafted && preparedAt !== null ? fmtStamp(preparedAt) : COPY.notDraftedYet;

  let cancelled: HeaderView['cancelled'] = null;
  if (ctx.cancelled) {
    const c = ctx.cancelled;
    const prior = c.prior
      ? ` The previous record (run ${c.prior.runId}, ${lowerFirst(VERB_WORD[c.prior.decision])} ${fmtHM(c.prior.decidedAt)}) is in the Ledger.`
      : ' Its event trail is in the Ledger.';
    cancelled = { text: `Last run cancelled ${fmtHM(c.at)} · ${c.detail}.${prior}`, linkLabel: COPY.openInLedger };
  }

  let seal: HeaderView['seal'] = null;
  if (ctx.mode === 'sealed' && ctx.seal && ctx.pkg) {
    const sl = ctx.seal;
    const pkg = ctx.pkg;
    const rec = `The agent recommended ${tokenWord(pkg.recommendation)}${pkg.restructure ? ' on the revised structure' : ''}.`;
    const who =
      sl.decision === 'auto-countersigned'
        ? 'The policy countersigned.'
        : sl.decision === 'rejected'
          ? 'You rejected the memo.'
          : sl.decision === 'countersigned-amended'
            ? amendedWho(ctx.deal, sl.amendments)
            : 'You countersigned.';
    const timing = runTiming(ctx.entries, startedAt ?? sl.decidedAt, sl.decidedAt);
    const finalWait = timing.finalWaitMs ?? (preparedAt !== null ? Math.max(0, sl.decidedAt - preparedAt) : 0);
    const confs = ctx.steps.filter((st) => st.result).map((st) => st.result?.confidence ?? 1);
    const lowest = confs.length > 0 ? Math.min(...confs) : null;
    const receipt = [
      plural(ctx.steps.length, 'step'),
      plural(ctx.steps.filter((st) => st.call).length, 'tool call'),
      `drafted in ${fmtDuration(timing.draftedMs)}`,
      `suspended ${fmtElapsed(finalWait)}`,
      lowest !== null ? `lowest confidence ${fmtConf(lowest)}` : null,
      `rev ${pkg.revision}`,
      ctx.runId !== null ? `run ${ctx.runId}` : null,
    ]
      .filter((x): x is string => !!x)
      .join(' · ');
    seal = { state: decidedState(sl.decision), headline: `${rec} ${who}`, receipt };
  }

  return {
    eyebrow: COPY.eyebrow,
    borrower: d.document.borrower,
    meta: `${dotJoin(d.document.facility)} · ${d.memoId}${drafted ? ` · rev ${rev}` : ''}`,
    prepared: `${COPY.preparedBy} · ${when} · source: ${d.name} CIM, ${range}`,
    uploaded: !!d.uploaded,
    cancelled,
    seal,
  };
}

function contentsView(ctx: FileCtx): ContentsView | null {
  if (ctx.mode !== 'not-started' && ctx.mode !== 'plan-review') return null;
  const s = ctx.s;
  const review = ctx.mode === 'plan-review';
  const rows = ctx.plan
    .filter((p) => reworkN(p.id) === null)
    .map((p) => {
      const sec = STEP_SECTION[p.id] ?? sectionOfStep(p.id);
      const required = !p.optional;
      return {
        stepId: p.id,
        ordinal: sectionOrdinal(sec),
        title: sectionHeading(sec),
        describe: STEP_DESCRIBE[p.id] ?? p.title,
        tool: TOOL_LABEL[p.toolName],
        required,
        included: review ? required || s.plan.enabledIds.includes(p.id) : true,
        tag: required ? COPY.required : COPY.optionalTag,
      };
    });
  let countdown: string | null = null;
  if (review) {
    countdown = s.plan.held
      ? COPY.heldStartWhenReady
      : `Drafting starts in ${fmtCountdown(s.plan.deadline ?? s.now + PLAN_COUNTDOWN_S(s.agent.speed) * 1000, s.now)}`;
  }
  return {
    mode: review ? 'plan-review' : 'not-started',
    rows,
    sourceLine: `Source · ${ctx.deal.name} CIM · ${plural(ctx.paras.length, 'paragraph')}`,
    countdown,
    held: review && s.plan.held,
    holdLabel: COPY.hold,
    unattendedNote: review ? COPY.unattendedNote : null,
  };
}

function sourceView(ctx: FileCtx): SourceView {
  const s = ctx.s;
  const d = ctx.deal;
  const cites = s.ui.cites && s.ui.cites.dealId === d.id && s.ui.cites.markIds.length > 0 ? s.ui.cites : null;
  const active = cites ? cites.markIds[Math.min(cites.markIds.length - 1, Math.max(0, cites.index))] ?? null : null;
  const count = ctx.markIds.length;
  return {
    open: s.ui.sourceOpen,
    heading: `Source · ${d.name} CIM.pdf`,
    title: dotJoin(d.document.title),
    borrower: d.document.borrower,
    facility: dotJoin(d.document.facility),
    simulated: !!d.uploaded,
    paragraphs: ctx.paras.map((p) => ({ n: p.n, label: p.label, segments: segmentsOf(p.text, p.n, ctx.spans, active) })),
    stepper: cites
      ? { label: `${cites.index + 1} of ${cites.markIds.length}`, hasPrev: cites.index > 0, hasNext: cites.index < cites.markIds.length - 1 }
      : null,
    quoted: { count, markIds: ctx.markIds, showAllLabel: `Show all quoted (${count})` },
    spineLabel: COPY.sourceSpine,
    spineCount: String(count),
    toggleLabel: s.ui.sourceOpen ? COPY.hideSource : `${COPY.sourceToggle} · ${count} quoted`,
  };
}

/** The monitor's covenant health → §5 status word. */
export function healthStatus(h: 'pass' | 'watch' | 'breach' | 'healthy'): StatusText {
  if (h === 'breach') return { state: 'breach', text: STATUS_WORD.breach };
  if (h === 'watch') return { state: 'watch', text: STATUS_WORD.watch };
  return { state: 'pass', text: STATUS_WORD.pass };
}

function appendixView(ctx: FileCtx): AppendixView {
  const m = ctx.s.monitor;
  const p = m.portfolio.find((x) => x.dealId === ctx.deal.id);
  const head = 'Simulated drift on the filed figures';
  const meta =
    m.sweepCount > 0 && m.lastSweepAt !== null
      ? `${head} · sweep #${m.sweepCount} · ${fmtAgo(ctx.s.now - m.lastSweepAt)}`
      : `${head} · first sweep pending`;
  if (!p) return { heading: COPY.appendixHeading, meta, rows: null, empty: COPY.firstSweepPending };
  return {
    heading: COPY.appendixHeading,
    meta,
    rows: p.covenants.map((c) => ({
      name: c.name,
      threshold: c.threshold,
      actual: c.actual,
      cushion: cushionOf(c.threshold, c.actual),
      status: healthStatus(c.status),
    })),
    empty: null,
  };
}

/** The doc-bar / Desk confirm for this file, if one is open (start on this file, or stop of the live run here). */
export function confirmFor(s: V2Store, dealId: string): ConfirmView | null {
  const c = s.ui.confirm;
  // both confirms are about discarding a LIVE run: once it is decided (or gone) the strip would
  // promise a cancellation that cannot happen, so a stale confirm never renders
  if (!c || !isRunLive(s)) return null;
  if (c.kind === 'start') return c.dealId === dealId ? startConfirmCopy(s, dealId) : null;
  return selectLiveDealId(s) === dealId ? stopConfirmCopy(s) : null;
}

function docBarView(ctx: FileCtx, notes: NotesBuild, confirm: ConfirmView | null): DocBarView {
  const s = ctx.s;
  const d = ctx.deal;
  const parsing = s.agent.parsing !== null;
  const files = s.agent.dealsFull.map((x) => {
    const c = x.id === d.id ? ctx : fileContext(s, x.id);
    return { dealId: x.id, label: x.name, meta: c ? stageOf(c).status.text : STATUS_WORD.pending };
  });

  let status: StatusText = { state: 'pending', text: STATUS_WORD.pending };
  let elapsed: string | null = null;
  let countdown: DocBarView['countdown'] = null;
  let policySuffix: string | null = null;
  let actions: DocBarView['actions'] = [];
  const stop = { kind: 'stop' as const, label: COPY.stop, variant: 'ghost' as const, disabled: false };

  switch (ctx.mode) {
    case 'not-started':
      status = { state: 'pending', text: `${STATUS_WORD.pending} · ${COPY.cimReady} · ${plural(ctx.paras.length, 'paragraph')}` };
      break;
    case 'plan-review':
      status = {
        state: 'awaiting',
        text: s.plan.held
          ? 'Plan review · held'
          : `Plan review · drafting starts in ${fmtCountdown(s.plan.deadline ?? s.now + PLAN_COUNTDOWN_S(s.agent.speed) * 1000, s.now)}`,
      };
      break;
    case 'running': {
      const dp = draftPoint(ctx);
      status = {
        state: 'drafting',
        text: dp.rework !== null ? `Drafting · ${dp.heading} · ${dp.tag ?? ''}`.replace(/ · $/, '') : `Drafting · ${dp.heading} · step ${dp.index} of ${dp.total}`,
      };
      elapsed = ctx.run ? fmtElapsed(s.now - ctx.run.startedAt) : null;
      actions = [stop];
      break;
    }
    case 'gate': {
      const policy = selectPolicy(s);
      const rev = ctx.pkg?.revision ?? 1;
      const at = awaitingAtOf(ctx);
      const n = notes.toReview.length;
      if (s.gate.leaving) {
        status = { state: 'awaiting', text: 'Returning for revision' };
      } else if (policy.armed) {
        status = { state: 'awaiting', text: policy.line };
        countdown = { reviewLabel: COPY.reviewManually };
      } else if (policy.holdLabel) {
        status = { state: 'awaiting', text: `${STATUS_WORD.awaiting} · rev ${rev} · ${lowerFirst(policy.holdLabel)}` };
      } else {
        const parts = [STATUS_WORD.awaiting, `rev ${rev}`];
        if (n > 0) parts.push(`${plural(n, 'note')} to review`);
        if (at !== null) parts.push(`waiting ${fmtElapsed(s.now - at)}`);
        status = { state: 'awaiting', text: parts.join(' · ') };
      }
      if (policy.on && !policy.eligible) policySuffix = 'Policy · not eligible';
      actions = [stop];
      break;
    }
    case 'sealed': {
      const sl = ctx.seal;
      if (sl) {
        const rev = ctx.pkg?.revision ?? 1;
        const word = VERB_WORD[sl.decision];
        const text =
          sl.decision === 'countersigned' || sl.decision === 'countersigned-amended'
            ? `${word} ${fmtHM(sl.decidedAt)} · rev ${rev}`
            : `${word} ${fmtHM(sl.decidedAt)}`;
        status = { state: decidedState(sl.decision), text: ctx.source === 'snapshot' ? `${text} · ${COPY.sealedInSession}` : text };
      }
      actions = [
        { kind: 'export', label: COPY.exportFile, variant: 'secondary', disabled: false },
        { kind: 'rerun', label: COPY.reRun, variant: 'ghost', disabled: parsing },
        { kind: 'ledger', label: COPY.openInLedger, variant: 'ghost', disabled: false },
      ];
      break;
    }
    case 'error':
      status = { state: 'error', text: `${STATUS_WORD.error} · drafting stopped at ${draftPoint(ctx).heading}` };
      actions = [{ kind: 'rerun', label: COPY.reRun, variant: 'ghost', disabled: parsing }];
      break;
  }

  const extract = ctx.steps.find((st) => st.id === 'step_extract');
  const conf = extract?.result?.confidence;
  const extraction = conf !== undefined && conf < 0.9 ? { text: `Extraction ${fmtConf(conf)}`, tone: confTone(conf) } : null;

  const n = notes.toReview.length;
  const cursor = s.ui.noteCursor;
  const stepper = n > 0 ? { label: `${cursor >= 0 && cursor < n ? String(cursor + 1) : COPY.noCall} of ${n}`, count: n } : null;

  return {
    fileName: d.name,
    files,
    status,
    elapsed,
    extraction,
    policySuffix,
    countdown,
    stepper,
    goToSignature: ctx.mode === 'gate',
    goToDrafting: ctx.mode === 'running',
    actions,
    confirm,
  };
}

// =============================================================================
// Exhibits (shared with the decision blocks)
// =============================================================================

/** The run's attached stress tests, in time order (spec §7.3: always from auditHistory). */
export function exhibitEntries(ctx: FileCtx): AuditHistoryEntry[] {
  if (ctx.runId === null) return [];
  return ctx.entries.filter((e) => e.kind === 'whatif');
}

// =============================================================================
// selectFile / selectAsk
// =============================================================================

export function selectFile(s: V2Store, dealId: string): FileView | null {
  const ctx = fileContext(s, dealId);
  if (!ctx) return null;
  const notes = buildNotes(ctx);
  const extract = ctx.steps.find((st) => st.id === 'step_extract');
  const rows = figureRows(ctx, extract?.result?.data);
  const sections = buildSections(ctx, notes, rows);
  const financialsSet = sections.some((sec) => sec.kind === 'financials' && sec.phase === 'set');
  const parsing = parsingReason(s);
  const pkg = ctx.pkg;
  const confirm = confirmFor(s, dealId);

  let primary: FileView['primary'] = null;
  if (ctx.mode === 'not-started') {
    primary = { label: COPY.draftMemo, kbd: `${s.modKey}↵`, action: 'draft', disabled: parsing !== null, disabledReason: parsing };
  } else if (ctx.mode === 'plan-review') {
    primary = { label: COPY.startDrafting, kbd: `${s.modKey}↵`, action: 'start-drafting', disabled: false, disabledReason: null };
  }

  return {
    dealId,
    mode: ctx.mode,
    live: ctx.live,
    source: ctx.source,
    runId: ctx.runId,
    revision: pkg?.revision ?? 1,
    restructured: !!pkg?.restructure,
    docBar: docBarView(ctx, notes, confirm),
    header: headerView(ctx),
    contents: contentsView(ctx),
    sections,
    headerMargin: {
      showReasoning: s.ui.showReasoning,
      reasoningLabel: COPY.showAllReasoning,
      evidenceCheck: financialsSet ? evidenceCheckNote(ctx, rows) : null,
    },
    toReview: notes.toReview,
    sourceView: sourceView(ctx),
    appendix: appendixView(ctx),
    rows: {
      exhibits: exhibitEntries(ctx).length > 0,
      stress: pkg !== null && (ctx.mode === 'gate' || ctx.mode === 'sealed' || ctx.mode === 'running'),
      signature: ctx.mode === 'running' || ctx.mode === 'gate' || ctx.mode === 'sealed',
      monitoring: true,
    },
    primary,
    flagsOnRecord: pkg ? pkg.flags.length : 0,
    countedNotes: notes.toReview.length,
  };
}

export function selectAsk(s: V2Store, dealId: string): AskView {
  const a = s.agent;
  const live = dealId === selectLiveDealId(s);
  const enabled = live && (a.status === 'awaiting_approval' || a.status === 'approved' || a.status === 'rejected');
  let disabledReason: string | null = null;
  if (!enabled) {
    if (!live) disabledReason = s.snapshots[dealId] ? COPY.askDisabledSnapshot : COPY.askDisabledNotStarted;
    else if (a.status === 'plan_review') disabledReason = COPY.askDisabledNotStarted;
    else disabledReason = COPY.askDisabledRunning;
  }
  const thread: AskView['thread'] = [];
  if (live) {
    const local = s.ui.thread.filter((t) => t.runId === a.runId);
    const emitLocal = (i: number) => {
      for (const t of local) {
        if (t.at !== i) continue;
        thread.push({ id: t.id, role: t.role, text: t.text, meta: t.role === 'answer' ? COPY.askMetaLocal : null });
      }
    };
    a.messages.forEach((m, i) => {
      emitLocal(i);
      thread.push({ id: m.id, role: m.role === 'user' ? 'you' : 'answer', text: m.text, meta: m.role === 'user' ? null : COPY.askMetaEngine });
    });
    emitLocal(a.messages.length);
  }
  return { enabled, placeholder: COPY.askPlaceholder, disabledReason, thread };
}

/**
 * Local intercepts for "Ask about this file" (§9.4): what-if questions point at
 * the stress test; on a restructured revision the recommendation and leverage
 * questions answer from the revision (the engine responder only knows the
 * filed figures). Everything else goes to the engine's rule-based responder.
 */
export function askRoute(
  q: string,
  ctx: { restructured: boolean; revision: number; rec: Recommendation | null; summary: string | null; filedLeverage: string; revisedLeverage: string | null },
): { kind: 'engine' } | { kind: 'local'; text: string } {
  if (/what.?if|waiver|step.?down|stress|scenario|sensitiv/i.test(q)) {
    return {
      kind: 'local',
      text: 'Use the stress test in this file, below the exhibits. It re-runs the same decide rule the agent uses, and you can attach a scenario as an exhibit.',
    };
  }
  if (ctx.restructured && /why|recommend|decision|approve|decline|escalat/i.test(q)) {
    const word = ctx.rec ? tokenWord(ctx.rec) : '';
    return {
      kind: 'local',
      text: `On revision ${ctx.revision} the agent recommends ${word} on the revised structure.${ctx.summary ? ` ${ctx.summary}` : ''}`,
    };
  }
  if (ctx.restructured && /leverage|levered/i.test(q)) {
    return {
      kind: 'local',
      text: `Filed leverage is ${ctx.filedLeverage} against the ≤ 4.00x covenant. Revision ${ctx.revision} proposes a restructure that brings it to ${ctx.revisedLeverage ?? ctx.filedLeverage}.`,
    };
  }
  return { kind: 'engine' };
}
