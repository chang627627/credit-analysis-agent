// ---------------------------------------------------------------------------
// Countersign V2 · case file selectors (spec §7.2, §9.4 "File resolution",
// "Data sources for sections", "Key figures", "Notes"; THREE-PANE.md §5, R2.2).
//
// `fileContext` resolves which run a file shows (live, sealed snapshot, or the
// bare deal) exactly once; every other derivation (sections, notes, the doc
// bar, the header, the source) reads that context. The Desk, the decision
// blocks and the exports reuse the same context, so a file reads the same on
// every screen. Step results are narrowed with type guards and fall back to the
// deal's own fields; nothing here throws on an unexpected shape. The memo is
// one paper card per section (eyebrow, title, a facts-only takeaway, labelled
// blocks, one quiet record footer); flags are marked where they sit (the row,
// or one line at the foot of the card). The agent panel only points here
// (select-thread.ts), and the decision is the memo's Decision card.
// ---------------------------------------------------------------------------

import type { CovenantTest, Deal, ExtractedFinancials, RiskScore } from '../../agent/mockData';
import { CURE_CAP, MIN_HEADROOM } from '../../agent/policy';
import { DECLINE_SCORE, ratingFor, riskTone } from '../../agent/rating';
import { gatingConfidence, getPlan } from '../../agent/runAgent';
import type { Amendment, ApprovalPackage, DecisionBasis, Flag, NoteProvenance, PlanStep, Recommendation, ToolName } from '../../agent/types';
import { amendedOutcome, baselineScenario, cureBlockFor, decisionForDeal, describeCureBlock, evaluate, findCure, fmtHeadroom } from '../../agent/whatif';
import type { DecisionConfidence, Scenario } from '../../agent/whatif';
import type { AuditHistoryEntry, RunDecision, RunRecord, StepView } from '../../hooks/useCreditAgent';
import type { CaseFileSnapshot, PresentedAtSign, V2Store } from '../state/contracts';
import {
  cushionOf,
  distanceOf,
  evidenceFor,
  evidenceText,
  FIGURES,
  financialValue,
  fmtFigure,
  modelEvidence,
  paragraphsOf,
  parseThreshold,
  quotedSpans,
  segmentsOf,
} from './evidence';
import type { QuotedSpan } from './evidence';
import {
  amendmentsFor,
  anchorFor,
  classifyFlag,
  covenantForFigure,
  covenantKind,
  flagClause,
  isCounted,
  isRowAnchor,
  memoTargetOfAnchor,
  overridesFromAmendments,
  sectionOfStep,
} from './flags';
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
  chatShown,
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
  ConfirmView,
  CovenantEvidence,
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
  MemoTarget,
  NoteView,
  PeersBody,
  RecommendationBody,
  RevisionBody,
  RiskBody,
  SectionAside,
  SectionFlagLine,
  SectionFooter,
  SectionId,
  SectionPhase,
  SectionView,
  SourceView,
  StatusKey,
  StatusText,
  StubView,
  TakeawayView,
} from './types';
import {
  covenantsTakeaway,
  financialsTakeaway,
  peersTakeaway,
  recommendationTakeaway,
  revisionTakeaway,
  riskTakeaway,
} from './takeaways';
import {
  COPY,
  driverTone,
  noCureText,
  NOT_IN_CIM,
  NOT_IN_CIM_SHORT,
  policyPct,
  provenanceText,
  sectionHeading,
  STATUS_WORD,
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

export function asFinancials(v: unknown, deal: Deal): ExtractedFinancials {
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

export function asRisk(v: unknown, deal: Deal): RiskScore {
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
export function lowerFirst(t: string): string {
  return t.length > 0 ? t[0].toLowerCase() + t.slice(1) : t;
}

/** First letter upper-cased (a list that opens a sentence). */
function upperFirst(t: string): string {
  return t.length > 0 ? t[0].toUpperCase() + t.slice(1) : t;
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
  if (amendedRecOf(deal, amendments, pkg) === 'approve') return false;
  return true;
}

/**
 * The package was held by the rule's data gate: a load-bearing reading came in under the 75%
 * confidence floor, so the agent escalated for verification whatever the figures say.
 */
export function dataGated(pkg: Pick<ApprovalPackage, 'decisionBasis'> | null | undefined): boolean {
  return !!pkg && pkg.decisionBasis === 'unverified-data';
}

/**
 * The same decide rule on the amended terms (null when nothing is amended): the engine's
 * `amendedOutcome` (headroom included, so a waiver that leaves 1% headroom escalates). On a
 * data-gated package the gate still holds: amending a term never verifies a figure, so the
 * amended call stays ESCALATE with the package's own verification reason.
 */
export function amendedDecisionOf(
  deal: Deal,
  amendments: Amendment[] | null,
  pkg?: Pick<ApprovalPackage, 'decisionBasis' | 'decisionReasons'> | null,
): { recommendation: Recommendation; reasons: string[] } | null {
  if (!amendments || amendments.length === 0) return null;
  if (dataGated(pkg)) return { recommendation: 'escalate', reasons: pkg?.decisionReasons ?? [] };
  const o = amendedOutcome(deal, overridesFromAmendments(amendments));
  return { recommendation: o.recommendation, reasons: o.reasons };
}

/** The call the same decide rule gives on the amended terms (null when nothing is amended). */
export function amendedRecOf(deal: Deal, amendments: Amendment[] | null, pkg?: Pick<ApprovalPackage, 'decisionBasis'> | null): Recommendation | null {
  return amendedDecisionOf(deal, amendments, pkg)?.recommendation ?? null;
}

/**
 * What a countersignature commits, said against the agent's own call, for the sealed caption,
 * the case-file seal and the Ledger run header. As filed: 'concurs ESCALATE'. As amended, the
 * amended outcome (never the agent's call): 'approves on <terms>', 'concurs ESCALATE on <terms>'
 * when it is the agent's call too, else 'records ESCALATE on <terms>'.
 */
export function signedVerdict(
  deal: Deal,
  agentRec: Recommendation,
  amendments: Amendment[] | null,
  terms: string,
  pkg?: Pick<ApprovalPackage, 'decisionBasis'> | null,
): string {
  const am = amendedRecOf(deal, amendments, pkg);
  if (am === null) return `concurs ${tokenWord(agentRec)}`;
  if (am === 'approve') return `approves on ${terms}`;
  return `${am === agentRec ? 'concurs' : 'records'} ${tokenWord(am)} on ${terms}`;
}

/** The case-file seal's reviewer clause for an amended countersignature: what was signed. */
function amendedWho(deal: Deal, amendments: Amendment[] | null, pkg: ApprovalPackage | null): string {
  const am = amendedRecOf(deal, amendments, pkg);
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
export function amendable(ctx: FileCtx): boolean {
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
// The decision (the engine's one rule, read, never re-derived by hand)
// =============================================================================

/** The decision as the memo states it: the call, the tier of the rule and its specific reasons. */
export interface DecisionView {
  recommendation: Recommendation;
  basis: DecisionBasis;
  /** the rule's reasons with magnitudes, as the engine wrote them (at most four) */
  reasons: string[];
}

/**
 * The run's load-bearing confidence (the data gate's input): the lowest reading of the gating
 * tools this run has returned, labelled with the tool, exactly as the agent loop computes it.
 */
export function runConfidence(ctx: FileCtx): DecisionConfidence | undefined {
  const by: Partial<Record<ToolName, number>> = {};
  for (const st of ctx.steps) if (st.call && st.result) by[st.call.name] = st.result.confidence;
  return gatingConfidence(by);
}

const FILED_CACHE = new WeakMap<Deal, Map<string, DecisionView & { minHeadroom: number | null }>>();

/**
 * The rule on the FILED figures for this run (the rev 1 call): the run's confidences feed the
 * data gate, the cure is sized for the reason text. The same call the agent loop gated on.
 */
export function filedDecision(ctx: FileCtx): DecisionView & { minHeadroom: number | null } {
  const conf = runConfidence(ctx);
  let byKey = FILED_CACHE.get(ctx.deal);
  if (!byKey) {
    byKey = new Map();
    FILED_CACHE.set(ctx.deal, byKey);
  }
  const k = conf ? `${conf.source}@${conf.value}` : 'none';
  const hit = byKey.get(k);
  if (hit) return hit;
  const d = decisionForDeal(ctx.deal, { confidence: conf, sizeCure: true });
  const v = { recommendation: d.recommendation, basis: d.basis, reasons: d.reasons, minHeadroom: d.minHeadroom };
  if (byKey.size > 20) byKey.clear();
  byKey.set(k, v);
  return v;
}

/** The scenario a viable cure proposes (the Structuring Engine's revised debt and liquidity). */
export function revisedScenario(deal: Deal, cure: CureData): Scenario {
  return { ...baselineScenario(deal), debt: cure.revised.totalDebtM, liquidity: cure.revised.liquidityM };
}

/**
 * The decision the package carries: the engine's own call, basis and reasons. A package built
 * before the engine recorded them is re-decided through the same rule (never a hand-made rule).
 */
export function packageDecision(ctx: FileCtx, pkg: ApprovalPackage): DecisionView {
  if (pkg.decisionBasis && pkg.decisionReasons && pkg.decisionReasons.length > 0) {
    return { recommendation: pkg.recommendation, basis: pkg.decisionBasis, reasons: pkg.decisionReasons };
  }
  const cure = pkg.restructure ? cureOf(ctx, pkg.revision) : null;
  const d = cure ? evaluate(ctx.deal, revisedScenario(ctx.deal, cure), { confidence: runConfidence(ctx) }).decision : filedDecision(ctx);
  return { recommendation: pkg.recommendation, basis: d.basis, reasons: d.reasons };
}

/** The revised structure re-decided (data gate included), with its headroom checks: what revision N proposes. */
function revisedOutcome(ctx: FileCtx, cure: CureData) {
  return evaluate(ctx.deal, revisedScenario(ctx.deal, cure), { confidence: runConfidence(ctx) });
}

/**
 * A reason as one memo line states it: a long reason keeps its own head clause (its text up to
 * the first colon, e.g. "4 covenants breach." or "No cure within policy."); the full reason stays
 * on the package, in the export, on the Decision card of a DECLINE and in the composer's answer.
 */
export function shortReason(r: string, max = 140): string {
  if (r.length <= max) return r;
  const i = r.indexOf(': ');
  return i > 0 ? `${r.slice(0, i)}.` : r;
}

// =============================================================================
// Drafting point (doc bar, Desk stage, tab title agree on "where the pen is")
// =============================================================================

interface DraftPoint { heading: string; index: number; total: number; rework: number | null; tag: string | null }

export function draftPoint(ctx: FileCtx): DraftPoint {
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

export function decidedState(decision: RunDecision): StatusKey {
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
      const rev = ctx.pkg?.revision ?? 1;
      const text = `Awaiting you · rev ${rev}`;
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
// Notes (flags as the memo marks them, the Signed over list, J/K)
// =============================================================================

interface FlagRef { flag: Flag; kind: FlagKind; step: StepView; anchorId: string }

/** Every flag of the run in emission order (steps in creation order, flags in order within each). */
function flagRefs(ctx: FileCtx): FlagRef[] {
  const out: FlagRef[] = [];
  for (const step of ctx.steps) {
    for (const flag of step.flags) {
      out.push({ flag, kind: classifyFlag(flag), step, anchorId: anchorFor(flag, step.id, ctx.deal) });
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

/** One flag note with the step that emitted it and when (the panel's flag line and the card's foot lines read it). */
export interface FlagNote { note: NoteView; kind: FlagKind; stepId: string; t: number | null }

export interface NotesBuild {
  /** every flag note in emission order, send-backs included (the revision card states those) */
  notes: FlagNote[];
  /** counted, non-superseded notes in emission order (J/K and the Signed over list walk them) */
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

/** The note actions for an anchor: "Show row" on a row, "Show in memo" on a section, then "Amend term". */
function noteActions(anchorId: string, amend: boolean): NoteView['actions'] {
  const out: NoteView['actions'] = [isRowAnchor(anchorId) ? { kind: 'show', label: COPY.showRow } : { kind: 'memo', label: COPY.showInMemo }];
  if (amend) out.push({ kind: 'amend', label: COPY.amendTerm });
  return out;
}

/** Flag kinds a revision card already states in its own body (the send-back quote, the proposal, the no-cure line). */
const REVISION_STATED: FlagKind[] = ['send-back', 'restructure', 'no-cure'];

/**
 * Where J / K, Signed over and the panel land for a flag: its row, or, for a row-less flag that the
 * card marks as one line at its foot (flagLinesOf), that line ('flag:<flagId>'), so the cue flashes
 * the flag itself rather than the card head. Revision-stated flags have no line: their card's head.
 */
function noteTarget(anchorId: string, flagId: string, kind: FlagKind): MemoTarget {
  const t = memoTargetOfAnchor(anchorId);
  if (isRowAnchor(anchorId) || t.section === 'header' || REVISION_STATED.includes(kind)) return t;
  return { section: t.section, anchorId: `flag:${flagId}` };
}

export function buildNotes(ctx: FileCtx): NotesBuild {
  const s = ctx.s;
  const refs = flagRefs(ctx);
  const timeOf = flagTimer(ctx.entries);
  const canAmend = amendable(ctx);
  const sealedApprove = ctx.mode === 'sealed' && ctx.seal?.outcome === 'approve';
  const opened = ctx.live ? s.gate.opened : [];
  const notes: FlagNote[] = [];

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

    let { tone, status } = noteTone(ref.kind);
    if (sup !== null) {
      tone = 'info';
      status = 'info';
    } else if (counted && sealedApprove) {
      tone = 'signed-over';
      status = 'signed-over';
    }

    notes.push({
      kind: ref.kind,
      stepId: ref.step.id,
      t,
      note: {
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
        target: noteTarget(ref.anchorId, ref.flag.id, ref.kind),
        actions: noteActions(ref.anchorId, amendKind !== null),
        amendKind,
      },
    });
  }

  return { notes, toReview: notes.filter((n) => n.note.counted).map((n) => n.note) };
}

// =============================================================================
// Section bodies
// =============================================================================

/** The four figures the covenant package tests (the "Tested by covenants" block). */
const TESTED_FIGURES: FigureId[] = ['leverage', 'interest', 'fixed', 'liquidity'];

/**
 * The eight memo figures. A tested figure that breaches its FILED covenant carries the one
 * emphasis of the Financials card (breach mark + bad-ink value); thin headroom is not marked
 * here, the takeaway names it. Amendments never move these marks (they are tested in §4).
 */
export function figureRows(ctx: FileCtx, data: unknown): FigureRow[] {
  const f = asFinancials(data, ctx.deal);
  return FIGURES.map(({ id, label }) => {
    const v = financialValue(f, id);
    const value = fmtFigure(id, v);
    const tested = TESTED_FIGURES.includes(id);
    const cov = tested ? covenantForFigure(ctx.deal, id) : undefined;
    const breach = !!cov && cushionOf(cov.threshold, value).tone === 'bad';
    return {
      id,
      anchorId: `fig:${id}`,
      label,
      value,
      evidence: evidenceFor(id, v, ctx.deal, ctx.paras, ctx.markIds),
      group: tested ? 'tested' : 'size',
      valueTone: breach ? 'bad' : 'ink',
      mark: breach ? 'breach' : null,
    };
  });
}

/** The file's eight figure rows, read from its extraction step (the deal's filed figures before it runs). */
export function fileFigureRows(ctx: FileCtx): FigureRow[] {
  const extract = ctx.steps.find((st) => st.id === 'step_extract');
  return figureRows(ctx, extract?.result?.data);
}

/** The figure a covenant tests (leverage, interest, fixed, liquidity), or null for any other covenant. */
function figureOfCovenant(name: string): FigureId | null {
  const kind = covenantKind(name);
  return kind === 'other' ? null : kind;
}

/**
 * THREE-PANE R4.3 (Mobbin audit fix 3): a covenant's Actual carries its figure's evidence, read from
 * the Financials row, so a covenant input the CIM does not state says so where the test reads it.
 * The line under the Actual is set only for that class (the short form: the column is 88px). Null
 * when the covenant tests no memo figure.
 */
export function covenantEvidence(c: CovenantTest, rows: FigureRow[]): CovenantEvidence | null {
  const fig = figureOfCovenant(c.name);
  const row = fig ? rows.find((r) => r.id === fig) : undefined;
  if (!row) return null;
  const text = evidenceText(row.evidence);
  return {
    cls: row.evidence.cls,
    text,
    line: row.evidence.cls === 'unquoted' ? NOT_IN_CIM_SHORT : null,
    target: memoTargetOfAnchor(row.anchorId),
    ariaLabel: `${c.name} actual ${c.actual}. ${text}. Show in ${sectionHeading('financials')}.`,
  };
}

/**
 * R4.3: the deal's covenant tests whose Actual the CIM does not state (the figure's evidence is
 * 'Not in the CIM · extraction model'), in table order, each with its Financials row. One reading for
 * the Financials foot line, the covenant rows, the Decision card's info item and the sealed caption.
 */
export function covenantInputsNotInCim(deal: Deal, rows: FigureRow[]): { covenant: CovenantTest; row: FigureRow }[] {
  const out: { covenant: CovenantTest; row: FigureRow }[] = [];
  for (const c of deal.covenants) {
    const fig = figureOfCovenant(c.name);
    const row = fig ? rows.find((r) => r.id === fig) : undefined;
    if (row && row.evidence.cls === 'unquoted') out.push({ covenant: c, row });
  }
  return out;
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
    scoreLabel: COPY.riskScoreBlock,
    driversLabel: COPY.riskDriversBlock,
  };
}

/** The simulated "Sector median" cohort (the middle cohort when none is named so). */
function peerMedian(p: PeersData): PeerFig | undefined {
  return p.peers.find((x) => /median/i.test(x.cohort)) ?? p.peers[Math.floor(p.peers.length / 2)];
}

function peersBody(data: unknown): PeersBody | null {
  const p = asPeers(data);
  if (!p) return null;
  const row = (cohort: string, x: PeerFig, isDeal: boolean) => ({
    cohort,
    leverage: fmtX(x.leverageX),
    interest: fmtX(x.interestCoverageX),
    margin: fmtFigure('margin', x.ebitdaMarginPct),
    isDeal,
  });
  return {
    label: COPY.peersBlock,
    rows: [row('This deal', p.deal, true), ...p.peers.map((x) => row(x.cohort, x, false))],
  };
}

const AMEND_FIELD = {
  leverage: { step: 0.05, min: 1, max: 8, prefix: '≤ ', suffix: 'x' },
  liquidity: { step: 0.5, min: 0, max: 50, prefix: '≥ $', suffix: 'M' },
} as const;

/**
 * One covenant row: signed cushion on the effective threshold; status re-tested under amendments.
 * `evidence` is the Actual's (R4.3); the stress test passes none (its actuals are scenario values).
 */
export function covenantRow(
  c: CovenantTest,
  amendments: Amendment[],
  changed: string[],
  amend: CovenantRow['amend'],
  evidence: CovenantEvidence | null = null,
): CovenantRow {
  const eff = effectiveThreshold(c.name, c.threshold, amendments);
  const pass = (c.status === 'pass') !== changed.includes(c.name);
  const word = pass ? STATUS_WORD.pass : STATUS_WORD.breach;
  return {
    anchorId: `cov:${c.name}`,
    name: c.name,
    threshold: c.threshold,
    amended: eff.amended,
    actual: c.actual,
    actualTone: pass ? 'ink' : 'bad',
    cushion: cushionOf(eff.threshold, c.actual),
    status: pass ? 'pass' : 'breach',
    statusText: eff.amended ? `${word} · as amended` : word,
    amend,
    evidence,
  };
}

function covenantRows(ctx: FileCtx, data: unknown, rows: FigureRow[]): CovenantRow[] {
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
    return covenantRow(c, amendments, changed, amend, covenantEvidence(c, rows));
  });
}

function keyFigures(ctx: FileCtx, pkg: ApprovalPackage, rows: FigureRow[]): KeyFigureView[] {
  return pkg.keyMetrics.map((k) => {
    const id = figureOfLabel(k.label);
    const label = sentenceCase(k.label);
    const [value, second] = k.value.split(' · ');
    const revised = k.source === 'propose_restructure' && !!pkg.restructure;
    const row = id ? rows.find((r) => r.id === id) : undefined;
    const evidence: EvidenceView = revised ? modelEvidence('revised') : row?.evidence ?? { cls: 'unquoted', text: NOT_IN_CIM };
    const anchorId = revised && id ? `rev${pkg.revision}:${id}` : id ? `fig:${id}` : 'sec:financials';
    const cov = id ? covenantForFigure(ctx.deal, id) : undefined;
    let caption: string | null = null;
    let tone: KeyFigureView['tone'] = 'ink';
    let dot: MeaningTone | null = null;
    if (cov) {
      const cushion = cushionOf(cov.threshold, value);
      const distance = distanceOf(cov.name, cov.threshold, value);
      caption = cushion.tone === 'bad' ? `${distance} ${cov.threshold}` : `${distance} · ${cov.threshold}`;
      tone = cushionTone(cushion);
      dot = tone === 'bad' ? 'bad' : tone === 'warn' ? 'warn' : null;
    }
    const sub = id === 'ebitda' && second ? `${second} margin` : second ?? null;
    const evText = evidenceText(evidence);
    // the figure takes the reader to its own row (or card) in the memo
    const where = sectionHeading(revised && id ? `revision-${pkg.revision}` : 'financials');
    return {
      label,
      value,
      sub,
      caption,
      tone,
      dot,
      evidenceText: evText,
      anchorId,
      ariaLabel: `${label} ${value}${caption ? `, ${caption}` : ''}. ${evText}. Show in ${where}.`,
      target: memoTargetOfAnchor(anchorId),
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
  // a data-gated memo escalated for verification: the flip is read on the figures as extracted,
  // whose own call (the rule without the gate) is named first, so the line never contradicts the token
  const gated = dataGated(pkg);
  if (!pkg.restructure) {
    const line = nearestFlipCached(ctx.deal);
    return gated ? `${COPY.flipUnverified(tokenWord(decisionForDeal(ctx.deal).recommendation))} · ${line}` : line;
  }
  const cure = cureOf(ctx, pkg.revision);
  if (!cure) return COPY.flipSeeStress;
  const scenario = revisedScenario(ctx.deal, cure);
  const standing = gated ? evaluate(ctx.deal, scenario).recommendation : pkg.recommendation;
  const line = `${COPY.flipOnRevised} · ${nearestFlipCached(ctx.deal, { scenario, rec: standing })}`;
  return gated ? `${COPY.flipUnverified(tokenWord(standing))} · ${line}` : line;
}

export function filedCounts(ctx: FileCtx): { breaches: number; score: number } {
  const tests = asCovenants(stepData(ctx, 'step_covenants'), ctx.deal);
  const risk = asRisk(stepData(ctx, 'step_risk'), ctx.deal);
  return { breaches: tests.filter((c) => c.status === 'breach').length, score: risk.score };
}

/** The verb phrase that opens the recommendation sentence. */
const REC_LEAD: Record<Recommendation, string> = {
  approve: 'Approve.',
  escalate: 'Escalate to a credit officer.',
  decline: 'Decline as structured.',
};

/**
 * Step 5's sentence: the call, then the rule's first reason as the engine wrote it (with its
 * magnitudes), so the memo's recommendation and the Decision card read the same decision.
 */
function recommendationSentence(ctx: FileCtx, pkg: ApprovalPackage): string {
  const d = packageDecision(ctx, pkg);
  const lead = d.reasons.length > 0 ? shortReason(d.reasons[0]) : '';
  if (pkg.restructure) {
    const equity = fmtM(pkg.restructure.contribution);
    if (d.recommendation === 'approve') return `Approve the revised structure. With ${equity} sponsor equity, ${lowerFirst(lead)}`;
    // (the basis line already says the figures are the revised structure's)
  }
  return `${REC_LEAD[d.recommendation]} ${lead}`.trim();
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
  return {
    basis: restructured ? `On the proposed revised structure · rev ${pkg.revision}` : COPY.basisFiled,
    prior: restructured ? tokenOf(filedDecision(ctx).recommendation) : null,
    token: tokenOf(pkg.recommendation),
    sentence: recommendationSentence(ctx, pkg),
    summary: pkg.summary,
    keyFigures: keyFigures(ctx, pkg, rows),
    aidLabel: COPY.aidLabel,
    nearestFlip: flipLine(ctx, pkg),
    stressLinkLabel: COPY.stressLink,
    reworkLine,
    summaryLabel: COPY.summaryBlock,
    keyFiguresLabel: COPY.keyFiguresBlock,
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
  const labels = { noteLabel: COPY.reviewerNoteBlock, proposalLabel: COPY.outcomeBlock };
  const r = revisionResult(ctx, data);
  if (r.kind === 'no-cure') return { n, returned, viable: false, summary: null, redline: [], noCure: noCureTextFor(ctx.deal), ...labels };
  // The filed structure is already clean (the search returns a zero contribution): no restructure
  // was proposed and the recommendation stands. Never a "$0.0M sponsor equity" proposal, and never
  // the no-cure line, which would be false here.
  if (r.kind === 'none-needed') return { n, returned, viable: true, summary: COPY.noRestructureNeeded, redline: [], noCure: null, ...labels };
  const cure = r.cure;
  const f = ctx.deal.financials;
  const filed = filedDecision(ctx);
  // the revised structure through the same rule (data gate included): what revision n proposes
  const o = revisedOutcome(ctx, cure);
  const d = o.decision;
  const score = o.risk.score;
  const line = (key: string, label: string, from: string, to: string) => ({ label, from, to, unchanged: from === to, anchorId: `rev${n}:${key}` });
  const split =
    `${fmtM(cure.debtPaydownM)} debt paydown` + (cure.liquidityTopUpM > 0 ? ` and ${fmtM(cure.liquidityTopUpM)} to liquidity` : '');
  const tight = o.headroom.find((c) => c.name === d.tightest);
  const cushion = policyPct(MIN_HEADROOM);
  const clears =
    tight && tight.headroom !== null
      ? `Every covenant clears with at least ${cushion} headroom on the revised structure (tightest: ${lowerFirst(tight.metric)} ${fmtHeadroom(tight.headroom)})`
      : `Every covenant clears with at least ${cushion} headroom on the revised structure`;
  const verdict =
    d.recommendation === 'approve'
      ? ''
      : d.basis === 'unverified-data'
        ? ` The figures still rest on unverified extraction, so the rule holds ${tokenWord(d.recommendation)} for verification.`
        : ` ${d.reasons.map((x) => shortReason(x)).join(' ')}`;
  const pctOrDash = (h: number | null) => (h === null ? COPY.noCall : fmtHeadroom(h));
  return {
    n,
    returned,
    viable: true,
    summary: `The Structuring Engine proposes ${fmtM(cure.contributionM)} sponsor equity as ${split}. ${clears}, and risk recomputes to ${score} (${ratingFor(score)}) through the same decide rule.${verdict}`,
    redline: [
      line('equity', 'Sponsor equity', COPY.noCall, fmtM(cure.contributionM)),
      line('debt', 'Total debt', fmtM(f.totalDebt), fmtM(cure.revised.totalDebtM)),
      line('leverage', 'Total leverage', fmtX(f.leverageX), fmtX(cure.revised.leverageX)),
      line('interest', 'Interest coverage', fmtX(f.interestCoverageX), fmtX(cure.revised.interestCoverageX)),
      line('liquidity', 'Liquidity', fmtM(f.liquidity), fmtM(cure.revised.liquidityM)),
      line('headroom', 'Tightest headroom', pctOrDash(filed.minHeadroom), pctOrDash(o.minHeadroom)),
      line('risk', 'Risk score', String(filedCounts(ctx).score), String(score)),
      line('recommendation', 'Recommendation', tokenWord(filed.recommendation), tokenWord(d.recommendation)),
    ],
    noCure: null,
    noteLabel: COPY.reviewerNoteBlock,
    proposalLabel: COPY.proposalBlock,
  };
}

/**
 * What the Structuring Engine returned for a revision: a viable cure, nothing to cure (the
 * filed structure is already clean: a zero contribution), or no cure within the cap. Read from
 * the step's result; an unreadable result falls back to the same pure search.
 */
function revisionResult(ctx: FileCtx, data: unknown): { kind: 'cure'; cure: CureData } | { kind: 'none-needed' } | { kind: 'no-cure' } {
  const parsed = asCure(data);
  if (parsed && !parsed.viable) return { kind: 'no-cure' };
  if (parsed && parsed.viable) return parsed.contributionM <= 0 ? { kind: 'none-needed' } : { kind: 'cure', cure: parsed };
  const found = findCure(ctx.deal);
  if (!found) return { kind: 'no-cure' };
  const cure = cureFromEngine(ctx.deal);
  return found.contribution <= 0 || !cure ? { kind: 'none-needed' } : { kind: 'cure', cure };
}

/** Revision n's own outcome for its takeaway: a viable cure (FROM becomes TO), nothing to cure, or no cure. */
function revisionOutcome(ctx: FileCtx, data: unknown): Parameters<typeof revisionTakeaway>[0] {
  const filed = filedDecision(ctx);
  const standing = filed.recommendation;
  const gated = filed.basis === 'unverified-data';
  const r = revisionResult(ctx, data);
  if (r.kind === 'no-cure') return { kind: 'no-cure', rec: standing };
  if (r.kind === 'none-needed') return { kind: 'none-needed', rec: standing, gated };
  const d = revisedOutcome(ctx, r.cure).decision;
  return {
    kind: 'cure',
    contributionM: r.cure.contributionM,
    revisedLeverageX: r.cure.revised.leverageX,
    from: standing,
    to: d.recommendation,
    gated: d.basis === 'unverified-data',
  };
}

/** §10 no-cure copy with the deal's own cap (35% of total debt, floored to $0.1M as the cure search caps it). */
function noCureTextFor(deal: Deal): string {
  // the constraint that binds (a covenant the cushion cannot reach, the risk score, …), from the same search
  const block = cureBlockFor(deal);
  return noCureText(
    fmtM(Math.floor(CURE_CAP * Math.max(0, deal.financials.totalDebt) * 10 + 1e-9) / 10),
    block ? describeCureBlock(block) : undefined,
  );
}

export function stubOf(step: StepView): StubView | null {
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

type SectionBaseView = Omit<SectionView, 'kind' | 'body' | 'blockLabels' | 'testsLabel'>;

/**
 * Where the pen is while drafting, when no step is running (between two steps, right after a
 * send-back, before the first step starts): that pending card shows the drafting line and the
 * one caret, so the memo always has exactly one drafting card while the run is live.
 */
function penSection(ctx: FileCtx): SectionId | null {
  if (ctx.mode !== 'running') return null;
  if (ctx.steps.some((st) => st.status === 'running')) return null;
  const pkg = ctx.pkg;
  if (pkg) {
    const n = pkg.revision + 1;
    const rework = ctx.plan.find((p) => p.id === `step_rework_${n}`);
    return rework && !ctx.steps.some((st) => st.id === rework.id) ? `revision-${n}` : null;
  }
  if (ctx.steps.some((st) => st.id === 'step_package' && st.status === 'done')) return null; // the recommendation shows its own gap
  const next = ctx.plan.find((p) => !p.skipped && reworkN(p.id) === null && !ctx.steps.some((st) => st.id === p.id));
  return next ? STEP_SECTION[next.id] ?? sectionOfStep(next.id) : null;
}

/** Right of the eyebrow: a status label while drafting, excluded or stopped. A set card has none (its footer carries the record). */
function asideOf(phase: SectionPhase): SectionAside | null {
  switch (phase) {
    case 'drafting':
      return { kind: 'status', state: 'drafting', text: STATUS_WORD.drafting };
    case 'excluded':
      return { kind: 'status', state: 'excluded', text: STATUS_WORD.excluded };
    case 'stopped':
      return { kind: 'status', state: 'error', text: COPY.stopped };
    default:
      return null;
  }
}

/**
 * The set card's footer (R2.2): "Document Intelligence · 94% · 1.1 s" and the collapsed "Record"
 * (args in, data out, the reasoning). Null until the step has returned.
 */
export function footerOf(step: StepView | undefined): SectionFooter | null {
  const record = step ? stubOf(step) : null;
  const r = step?.result;
  if (!step || !r || !record) return null;
  const conf = fmtConf(r.confidence);
  const duration = fmtDuration(r.durationMs);
  return {
    tool: record.tool,
    conf,
    confTone: confTone(r.confidence),
    duration,
    text: `${record.tool} · ${conf} · ${duration}`,
    recordLabel: COPY.record,
    record,
  };
}

/**
 * The row-less flags of one card, one marked line each, in emission order (R2.2). A flag anchored
 * to a row is marked on that row instead; the Financials card adds the evidence check when a
 * figure is not quoted in the CIM.
 */
function flagLinesOf(ctx: FileCtx, id: SectionId, notes: NotesBuild, rows: FigureRow[]): SectionFlagLine[] {
  const out: SectionFlagLine[] = [];
  for (const n of notes.notes) {
    if (n.note.anchorId !== `sec:${id}` || REVISION_STATED.includes(n.kind)) continue;
    out.push({ id: n.note.id, flagId: n.note.flagId, state: n.note.status, text: flagClause(n.note.text), anchorId: `flag:${n.note.flagId ?? n.note.id}` });
  }
  if (id === 'financials') {
    const check = evidenceCheckLine(ctx, rows);
    if (check) out.push({ id: 'evidence-check', flagId: null, state: 'info', text: check, anchorId: 'flag:evidence-check' });
  }
  return out;
}

/**
 * The evidence check as one memo line (R4.3), or null when every figure is quoted or derived from
 * quoted figures. It names the covenant tests whose inputs the CIM does not state, counted and named
 * from the figures, and says where those figures come from (the extraction model); a figure outside
 * the covenant tests that the CIM does not state is named after them.
 */
export function evidenceCheckLine(ctx: FileCtx, rows: FigureRow[]): string | null {
  const unstated = rows.filter((r) => r.evidence.cls === 'unquoted');
  if (unstated.length === 0) return null;
  const inputs = covenantInputsNotInCim(ctx.deal, rows);
  const others = unstated.filter((r) => !inputs.some((i) => i.row.id === r.id));
  const names = (list: FigureRow[]) => listJoin(list.map((r) => lowerFirst(r.label)));
  const parts: string[] = [];
  if (inputs.length > 0) {
    const n = inputs.length;
    const total = ctx.deal.covenants.length;
    const one = n === 1;
    parts.push(
      `${n} of ${total} covenant ${total === 1 ? 'test' : 'tests'} ${one ? 'uses a figure' : 'use figures'} the CIM does not state (${names(inputs.map((i) => i.row))}); ${one ? 'it comes' : 'they come'} from the extraction model.`,
    );
    if (others.length > 0) parts.push(`${upperFirst(names(others))} ${others.length === 1 ? 'is' : 'are'} not stated in the CIM either.`);
  } else {
    const one = others.length === 1;
    parts.push(
      `${others.length} of ${rows.length} figures ${one ? 'is' : 'are'} not stated in the CIM (${names(others)}); ${one ? 'it comes' : 'they come'} from the extraction model.`,
    );
  }
  const extract = ctx.steps.find((st) => st.id === 'step_extract');
  if (ctx.deal.uploaded && extract?.result) parts.push(`Extraction ran at ${fmtConf(extract.result.confidence)} confidence on an unseen document.`);
  return parts.join(' ');
}

/**
 * One paper card per section (THREE-PANE §5.3, §5.4, R3). Live drafting, no skeleton cards: not
 * started and plan review return none (the memo is its header; the plan lives in the agent panel),
 * and a card exists once its step has started. Running returns exactly one drafting card (the pen
 * sits on the next card between steps); a set card carries its takeaway. A skipped optional step
 * has no card, and steps are numbered among the included ones ("Step 3 of 4").
 */
export function buildSections(ctx: FileCtx, rows: FigureRow[], built?: NotesBuild): SectionView[] {
  const out: SectionView[] = [];
  const notes = built ?? buildNotes(ctx);
  const pkg = ctx.pkg;
  const running = ctx.mode === 'running';
  if (ctx.mode === 'not-started' || ctx.mode === 'plan-review') return out;
  const runnable = ctx.plan.filter((p) => reworkN(p.id) === null && !p.skipped);
  const pen = penSection(ctx);
  // a run that errored keeps a card where it stopped (the panel's "Drafting stopped at …" line links
  // there): the last step's section, or Financials when nothing started
  const lastStep = ctx.steps.length > 0 ? ctx.steps[ctx.steps.length - 1] : undefined;
  const stopAt: SectionId | null =
    ctx.mode !== 'error' ? null : lastStep ? (reworkN(lastStep.id) !== null ? sectionOfStep(lastStep.id) : STEP_SECTION[lastStep.id] ?? sectionOfStep(lastStep.id)) : 'financials';
  const amendments = amendmentsOf(ctx);
  const amended = amendments.length > 0;

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
    // likewise a revision is set only once its revised package is assembled (the gap before it suspends)
    if (n !== null && phase === 'set' && running && (!pkg || pkg.revision < n)) phase = 'drafting';
    if (phase === 'pending' && pen === id) phase = 'drafting';
    if (phase === 'pending' && stopAt === id) phase = 'stopped';
    // live drafting: a step not yet started, or skipped, has no card
    if (phase === 'pending' || phase === 'excluded') continue;

    const status: StatusKey =
      phase === 'set' ? 'done' : phase === 'drafting' ? 'drafting' : 'error';
    const callLine = step?.call && !step.result ? `Calling ${step.call.label}…` : null;
    const drafting =
      phase === 'drafting' ? { line: callLine ?? (n !== null ? COPY.draftingRevision(n) : COPY.draftingLine), caret: running } : null;
    const phaseLine = null;
    const ordinal = runnable.findIndex((p) => p.id === planStep.id) + 1;
    const tool = TOOL_LABEL[planStep.toolName];
    const eyebrow = n !== null ? `${STATUS_WORD.returned} · ${tool}` : `Step ${ordinal} of ${runnable.length} · ${tool}`;

    const base: SectionBaseView = {
      id,
      anchorId: `sec:${id}`,
      eyebrow,
      heading: sectionHeading(id),
      phase,
      status,
      statusLabel: phase === 'stopped' ? COPY.stopped : STATUS_WORD[status],
      aside: asideOf(phase),
      takeaway: null,
      phaseLine,
      drafting,
      footer: phase === 'set' || phase === 'stopped' ? footerOf(step) : null,
      flagLines: phase === 'set' ? flagLinesOf(ctx, id, notes, rows) : [],
    };
    const set = phase === 'set';
    const data = step?.result?.data;
    const withTake = (t: TakeawayView | null): SectionBaseView => (set && t ? { ...base, takeaway: t } : base);

    if (id === 'recommendation') {
      const body = set && pkg ? recommendationBody(ctx, pkg, rows) : null;
      out.push({ ...withTake(body ? recommendationTakeaway(body) : null), kind: 'recommendation', body });
    } else if (id === 'financials') {
      const take = set ? financialsTakeaway(ctx.deal, asFinancials(data, ctx.deal), amended) : null;
      out.push({ ...withTake(take), kind: 'financials', body: set ? rows : null, blockLabels: { size: COPY.figureGroupSize, tested: COPY.figureGroupTested } });
    } else if (id === 'risk') {
      out.push({ ...withTake(set ? riskTakeaway(asRisk(data, ctx.deal)) : null), kind: 'risk', body: set ? riskBody(ctx, data) : null });
    } else if (id === 'peers') {
      const peers = set ? asPeers(data) : null;
      const median = peers ? peerMedian(peers) : undefined;
      const take = peers && median ? peersTakeaway(peers.deal.leverageX, median.leverageX) : null;
      out.push({ ...withTake(take), kind: 'peers', body: set ? peersBody(data) : null });
    } else if (id === 'covenants') {
      const body = set ? covenantRows(ctx, data, rows) : null;
      out.push({
        ...withTake(body ? covenantsTakeaway(body, amended) : null),
        kind: 'covenants',
        body,
        testsLabel: amended ? COPY.testsAmended : COPY.testsFiled,
      });
    } else if (n !== null) {
      const body = set ? revisionBody(ctx, n, data) : null;
      out.push({ ...withTake(body ? revisionTakeaway(revisionOutcome(ctx, data)) : null), kind: 'revision', body });
    }
  }
  return out;
}

// =============================================================================
// Header, source, appendix, doc bar
// =============================================================================

/**
 * The seal sentence. `full` states the agent's call and who signed ("The agent recommended
 * ESCALATE. You countersigned."), for the Decision card's sealed record;
 * `who` is the reviewer clause alone for the header ("You countersigned as amended."), which
 * never shows a token. Null until sealed.
 */
export function sealHeadline(ctx: FileCtx): { who: string; full: string } | null {
  const sl = ctx.seal;
  const pkg = ctx.pkg;
  if (ctx.mode !== 'sealed' || !sl || !pkg) return null;
  const rec = `The agent recommended ${tokenWord(pkg.recommendation)}${pkg.restructure ? ' on the revised structure' : ''}.`;
  const who =
    sl.decision === 'auto-countersigned'
      ? 'The policy countersigned.'
      : sl.decision === 'rejected'
        ? 'You rejected the memo.'
        : sl.decision === 'countersigned-amended'
          ? 'You countersigned as amended.'
          : 'You countersigned.';
  const fullWho = sl.decision === 'countersigned-amended' ? amendedWho(ctx.deal, sl.amendments, pkg) : who;
  return { who, full: `${rec} ${fullWho}` };
}

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
    // the top of a sealed memo never states the agent's call: the who-clause only (THREE-PANE §5.11)
    seal = { state: decidedState(sl.decision), headline: sealHeadline(ctx)?.who ?? '', receipt };
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
  const meta = m.sweepCount > 0 && m.lastSweepAt !== null ? `sweep #${m.sweepCount} · ${fmtAgo(ctx.s.now - m.lastSweepAt)}` : 'first sweep pending';
  if (!p) return { eyebrow: COPY.appendixEyebrow, heading: COPY.appendixTitle, meta, rows: null, empty: COPY.firstSweepPending };
  return {
    eyebrow: COPY.appendixEyebrow,
    heading: COPY.appendixTitle,
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
      // the plan countdown arms only with the plan card on screen: a plan that never armed asks
      // for the panel instead of showing a frozen countdown (THREE-PANE §1.5, §5.10)
      status = {
        state: 'awaiting',
        text: s.plan.held
          ? 'Plan review · held'
          : s.plan.deadline !== null
            ? `Plan review · drafting starts in ${fmtCountdown(s.plan.deadline, s.now)}`
            : COPY.planReviewInPanel,
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
        // no live waiting clock at the gate (owner: it only pressures the reviewer); the Ledger
        // records how long the memo was suspended, after the fact
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

  const atGate = ctx.live && ctx.mode === 'gate';
  return {
    fileName: d.name,
    files,
    status,
    elapsed,
    extraction,
    policySuffix,
    countdown,
    goToDecision: atGate,
    goToDrafting: ctx.mode === 'running',
    // the decision is in the memo now ("Go to decision" scrolls to its card): a hidden panel always gets its toggle
    chatToggle: null,
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
// selectFile and the local Ask intercepts
// =============================================================================

export function selectFile(s: V2Store, dealId: string): FileView | null {
  const ctx = fileContext(s, dealId);
  if (!ctx) return null;
  const notes = buildNotes(ctx);
  const rows = fileFigureRows(ctx);
  const sections = buildSections(ctx, rows, notes);
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
    sections,
    toReview: notes.toReview,
    sourceView: sourceView(ctx),
    appendix: appendixView(ctx),
    rows: {
      exhibits: exhibitEntries(ctx).length > 0,
      stress: pkg !== null && (ctx.mode === 'gate' || ctx.mode === 'sealed' || ctx.mode === 'running'),
      // live drafting (THREE-PANE R3): the Decision card and the appendix are written last, so they
      // arrive with the agent's package (the gate) and stay through a send-back's revision
      signature: (ctx.mode === 'running' && pkg !== null) || ctx.mode === 'gate' || ctx.mode === 'sealed',
      monitoring: pkg !== null || ctx.mode === 'gate' || ctx.mode === 'sealed',
    },
    primary,
    flagsOnRecord: pkg ? pkg.flags.length : 0,
    countedNotes: notes.toReview.length,
  };
}

/**
 * Local intercepts for composer questions (§9.4, THREE-PANE §4.3): what-if questions point at
 * the stress test; on a restructured revision the recommendation and leverage
 * questions answer from the revision (the engine responder only knows the
 * filed figures). Everything else goes to the engine's rule-based responder.
 */
export function askRoute(
  q: string,
  ctx: {
    restructured: boolean;
    revision: number;
    rec: Recommendation | null;
    summary: string | null;
    filedLeverage: string;
    revisedLeverage: string | null;
    /** the package's decision reasons as the engine wrote them (null before a package exists) */
    reasons?: string[] | null;
  },
): { kind: 'engine' } | { kind: 'local'; text: string; stress: boolean } {
  if (/what.?if|waiver|step.?down|stress|scenario|sensitiv/i.test(q)) {
    return {
      kind: 'local',
      stress: true,
      text: 'Use the stress test in this file, below the Decision card. It re-runs the same decide rule the agent uses, and you can attach a scenario as an exhibit.',
    };
  }
  // a decision question answers with the rule's own reasons (the engine responder only restates the summary)
  if (ctx.rec && ctx.reasons && ctx.reasons.length > 0 && /why|recommend|decision|approve|decline|escalat/i.test(q)) {
    const lead = ctx.restructured
      ? `On revision ${ctx.revision} the agent recommends ${tokenWord(ctx.rec)} on the revised structure.`
      : `The agent recommends ${tokenWord(ctx.rec)}.`;
    // every principal reason, in full (a DECLINE's breach list and its no-cure reason included)
    return { kind: 'local', stress: false, text: `${lead} ${ctx.reasons.join(' ')}` };
  }
  if (ctx.restructured && /why|recommend|decision|approve|decline|escalat/i.test(q)) {
    const word = ctx.rec ? tokenWord(ctx.rec) : '';
    return {
      kind: 'local',
      stress: false,
      text: `On revision ${ctx.revision} the agent recommends ${word} on the revised structure.${ctx.summary ? ` ${ctx.summary}` : ''}`,
    };
  }
  if (ctx.restructured && /leverage|levered/i.test(q)) {
    return {
      kind: 'local',
      stress: false,
      text: `Filed leverage is ${ctx.filedLeverage} against the ≤ 4.00x covenant. Revision ${ctx.revision} proposes a restructure that brings it to ${ctx.revisedLeverage ?? ctx.filedLeverage}.`,
    };
  }
  return { kind: 'engine' };
}
