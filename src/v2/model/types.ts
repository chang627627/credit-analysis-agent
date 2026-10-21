// ---------------------------------------------------------------------------
// Countersign V2 · model view types (spec §9.4, THREE-PANE.md §7.1 and R2.4).
// Screens render these verbatim: every label, number and sentence a screen
// shows arrives already composed in one of these objects. Pure types: no
// runtime code lives here. R2: the agent panel is AgentPanelView (one-line
// status lines with links, the plan prompt, the composer); everything shown,
// and the whole decision (SignatureView), lives in the memo pane.
// ---------------------------------------------------------------------------

import type { MeaningTone, StatusKey } from '../kit/types';
import type { SigState } from '../kit/SignatureLine';
import type { DriverKey } from '../../agent/whatif';
import type { FileAt, Route } from '../state/route';
import type { LedgerChip, Policy } from '../state/contracts';

export type { MeaningTone, StatusKey, SigState, DriverKey, FileAt, Route, LedgerChip, Policy };

// ---- shared vocabulary types (declared here once; vocab.ts and flags.ts use them)

/** Human verbs on the record (§5). Words live in `VERB_WORD`. */
export type Verb = 'countersigned' | 'countersigned-amended' | 'auto-countersigned' | 'returned' | 'rejected' | 'cancelled';

/** The closed actor set of the Ledger (§7.5). */
export type Actor = 'Credit Analyst' | 'Reviewer' | 'Policy' | 'Portfolio Monitor';

/** What an engine flag means on the page (`classifyFlag`). */
export type FlagKind = 'breach' | 'watch' | 'low-confidence' | 'send-back' | 'restructure' | 'no-cure' | 'info';

/** A palette command's effect; `state/commands.ts` maps it onto `V2Actions`. The palette never signs (THREE-PANE §6.5): 'go-signature' is "Go to decision" → requestSign('button'). */
export type CommandAction =
  | { kind: 'go-signature' } | { kind: 'approve-plan' } | { kind: 'cancel-plan' }
  | { kind: 'stop' } | { kind: 'open-file'; dealId: string } | { kind: 'start-file'; dealId: string }
  | { kind: 'route'; route: Route } | { kind: 'export-file'; dealId: string } | { kind: 'export-session' }
  | { kind: 'sweep' } | { kind: 'speed'; value: number } | { kind: 'policy'; value: Policy } | { kind: 'href'; href: string };

/** One row of `selectCommands`. */
export interface CommandView { id: string; label: string; section: string; hint?: string; kbd?: string; action: CommandAction }

/** The text a covenant cushion meter and its figure carry (`cushionOf`). */
export interface CushionView { pct: number; text: string; tone: 'neutral' | 'warn' | 'bad' }

// ---- view types (spec §9.4, verbatim)

export interface StatusText { state: StatusKey; text: string }
export interface TokenView { word: string; tone: MeaningTone }
export interface ConfirmView { kind: 'start' | 'stop'; text: string; confirmLabel: string; cancelLabel: string; tone: 'neutral' | 'bad' }
export type SectionId = 'recommendation' | 'financials' | 'risk' | 'peers' | 'covenants' | `revision-${number}`;
export type FigureId = 'revenue' | 'ebitda' | 'margin' | 'debt' | 'leverage' | 'interest' | 'fixed' | 'liquidity';
export type EvidenceView =
  | { cls: 'quoted'; text: 'Quoted'; para: number; paraLabel: string; markId: string; citeIndex: number }
  | { cls: 'derived'; text: 'Derived'; formula: string; operands: { text: string; markId: string | null; citeIndex: number | null }[] }
  | { cls: 'unquoted'; text: 'Not in the CIM · extraction\u00a0model' }   // R4.3: no CIM sentence states it (vocab NOT_IN_CIM; no-break space)
  | { cls: 'model'; text: string };

// ---- memo targets and section heads (THREE-PANE §2.6, §5.3, §5.5)

/** A memo card: every FileAt plus the page header. */
export type MemoSection = FileAt | 'header';
/** Where a link lands in the memo: 'fig:leverage' | 'cov:Max Total Leverage' | 'rev2:debt' | 'sec:risk' | null (the card head). */
export interface MemoTarget { section: MemoSection; anchorId: string | null }

/** The one-line takeaway under a set section's title (model/takeaways.ts). `token` / `prior` only on the recommendation. */
export interface TakeawayView { state: StatusKey; text: string; token: TokenView | null; prior: TokenView | null; basis: string | null }
/**
 * Right of the section eyebrow: a status label while the card is drafting, excluded or stopped.
 * A set card has no aside: its tool, confidence and duration sit in the card footer (R2.2).
 */
export type SectionAside =
  | { kind: 'status'; state: StatusKey; text: string };
/**
 * The set card's footer (THREE-PANE R2.2): ONE quiet line, "Document Intelligence · 94% · 1.1 s",
 * with a "Record" disclosure, collapsed by default, holding the tool's args in, data out and the
 * reasoning (`record`). The confidence span takes `confTone` (ink-3 at 90% and above, warn 75 to
 * 89%, bad below the 75% floor); `text` is the whole line for assistive text.
 */
export interface SectionFooter {
  tool: string; conf: string; confTone: 'ink-3' | 'warn' | 'bad'; duration: string;
  text: string; recordLabel: string; record: StubView;
}
/**
 * A flag with no row of its own, marked as one line at the foot of its card (R2.2): for example
 * "Earnings are highly sensitive to commodity prices" (watch, Covenants) or "Risk Engine returned
 * 70% confidence (floor 75%)" (watch, Risk). Row flags are marked on their row instead
 * (FigureRow.mark, CovenantRow.actualTone); the Financials card also carries the evidence check
 * here when a figure is not quoted in the CIM. `anchorId` is the line's own scroll and cue target.
 */
export interface SectionFlagLine { id: string; flagId: string | null; state: StatusKey; text: string; anchorId: string }

export interface TopBarView {
  /** attention: set only while something waits on the reviewer (a dot in the sidebar, appended to the accessible name); no totals, no ambient counts */
  tabs: { id: 'desk' | 'book' | 'ledger'; label: string; attention: string | null }[];
  active: 'desk' | 'book' | 'ledger' | 'settings'; policyOn: boolean; policyLabel: string; policyShort: string;
  /** the clean-approval rule in one line (policyRule().short), the policy switch's Tip: says what "clean" means (R4.2) */
  policyRule: string;
  speedLabel: string; speeds: { value: number; label: string; checked: boolean }[]; searchKbd: string;
  /** the top bar's left side now that navigation lives in the sidebar */
  sectionTitle: string;
}
export interface SettingsView {
  title: string;
  intro: string;
  /** help: the clean-approval rule in words (policyRule().full), never hand-restated numbers (R4.2) */
  policy: { label: string; help: string; on: boolean };
  pace: { label: string; help: string; options: { id: string; label: string; count: string }[]; active: string };
  removed: { text: string; restoreLabel: string } | null;
}
export interface PolicyView {
  on: boolean; eligible: boolean; armed: boolean; line: string;
  checks: { ok: boolean; text: string }[] | null;   // null when policy off
  countdown: string | null;                          // '4 s' while armed
  holdLabel: string | null;                          // from holdReason
}

export type DeskStage = 'awaiting' | 'plan-review' | 'drafting' | 'error' | 'not-started' | 'decided';
export interface DeskRow {
  dealId: string; name: string; borrower: string; facility: string; uploaded: boolean;
  leverage: { text: string; tone: 'ink' | 'bad' }; call: TokenView | null;
  stage: StatusText; subMeta: string | null;
  action: { kind: 'review' | 'open-plan' | 'open' | 'draft' | 'open-record' | 're-run'; label: string; variant: 'primary' | 'secondary' | 'ghost'; disabled: boolean } | null;
  confirm: ConfirmView | null;
  /** remove from the Desk (session only; the Ledger keeps the record) */
  remove?: { label: string; disabled: boolean };
  removeConfirm?: { text: string; confirmLabel: string; cancelLabel: string } | null;
}
export interface DeskView {
  title: string; summary: string;
  groups: { stage: DeskStage; label: string; status: StatusKey; count: string; rows: DeskRow[] }[];
  parsing: StatusText | null;
  drop: { label: string; sub: string; chooseLabel: string; disabledReason: string | null };
}

export type FileMode = 'not-started' | 'plan-review' | 'running' | 'gate' | 'sealed' | 'error';
export interface StubView { stepId: string; tool: string; meta: string; confTone: 'ink-3' | 'warn' | 'bad'; recordMeta: string; argsLabel: string; argsCount: string; args: unknown; resultLabel: string; resultCount: string; result: unknown; reasoning: string }
export interface NoteView {
  id: string; flagId: string | null; kind: FlagKind | 'evidence-check';
  tone: 'breach' | 'watch' | 'info' | 'returned' | 'signed-over'; status: StatusKey;
  heading: string; text: string; meta: string;
  anchorId: string; counted: boolean; opened: boolean;
  /** where "Show row" / "Show in memo" / "Amend term" land in the memo */
  target: MemoTarget;
  /** labels: 'Show row' (row anchors) | 'Show in memo' (section anchors) | 'Amend term' */
  actions: { kind: 'show' | 'memo' | 'amend'; label: string }[]; amendKind: 'leverage' | 'liquidity' | null;
}
export interface FigureRow { id: FigureId; anchorId: string; label: string; value: string; evidence: EvidenceView; group: 'size' | 'tested'; valueTone: 'ink' | 'bad'; mark: 'breach' | null }
/**
 * THREE-PANE R4.3 (Mobbin audit fix 3): where a covenant's Actual comes from, read from the figure's
 * Financials row. cls and text are that row's evidence ('Not in the CIM · extraction model',
 * 'Derived · 96.3 ÷ 22.6', 'Quoted · CIM para 2'); line is the t-meta line under the Actual, set
 * only when the CIM does not state the figure ('Not in CIM', the short form, since the Actual
 * column is 88px); target is that Financials row ('fig:interest'), where the Actual traces
 * (cueMemo: scroll and one flash); ariaLabel is the trace's accessible name.
 */
export interface CovenantEvidence { cls: EvidenceView['cls']; text: string; line: string | null; target: MemoTarget; ariaLabel: string }
export interface CovenantRow {
  anchorId: string; name: string; threshold: string; amended: { from: string; to: string } | null;
  actual: string; actualTone: 'ink' | 'bad'; cushion: { pct: number; text: string; tone: 'neutral' | 'warn' | 'bad' };
  status: 'pass' | 'breach'; statusText: string;
  amend: { kind: 'leverage' | 'liquidity'; value: number; step: number; min: number; max: number; prefix: string; suffix: string } | null;
  /** the Actual's evidence (R4.3); null in the stress test, whose actuals are scenario values, not the filed figures */
  evidence: CovenantEvidence | null;
}
export interface KeyFigureView { label: string; value: string; sub: string | null; caption: string | null; tone: 'ink' | 'warn' | 'bad'; dot: MeaningTone | null; evidenceText: string; anchorId: string; ariaLabel: string; target: MemoTarget }
/** basis, prior, token and sentence are kept for the exports; the card shows them through `takeaway`. */
export interface RecommendationBody { basis: string; prior: TokenView | null; token: TokenView; sentence: string; summary: string; keyFigures: KeyFigureView[]; aidLabel: string; nearestFlip: string; stressLinkLabel: string; reworkLine: string | null; summaryLabel: string; keyFiguresLabel: string }
export interface RiskBody { scoreText: string; outOf: string; rating: string; tone: MeaningTone; value: number; tick: number; tickCaption: string; evidence: EvidenceView; drivers: { factor: string; impact: string; tone: 'good' | 'warn' | 'bad' | 'ink-2' }[]; scoreLabel: string; driversLabel: string }
export interface PeersBody { label: string; rows: { cohort: string; leverage: string; interest: string; margin: string; isDeal: boolean }[] }
/** proposalLabel: 'Proposed revision' | 'Outcome' */
export interface RevisionBody { n: number; returned: { quote: string; attribution: string } | null; viable: boolean; summary: string | null; redline: { label: string; from: string; to: string; unchanged: boolean; anchorId: string }[]; noCure: string | null; noteLabel: string; proposalLabel: string }
export type SectionPhase = 'pending' | 'drafting' | 'set' | 'excluded' | 'stopped';
interface SectionBase {
  id: SectionId; anchorId: string;                      // 'sec:<id>'
  eyebrow: string; heading: string;
  phase: SectionPhase; status: StatusKey; statusLabel: string;
  aside: SectionAside | null;                           // drafting / excluded / stopped only
  takeaway: TakeawayView | null;                        // only when phase === 'set'; facts only before step 5
  phaseLine: string | null;                             // pending / excluded copy; null when set, drafting or stopped
  drafting: { line: string; caret: boolean } | null;
  /** set cards (the step returned): the one quiet record line and its collapsed "Record" (R2.2) */
  footer: SectionFooter | null;
  /** row-less flags of this card, one marked line each, in emission order (R2.2); empty when none */
  flagLines: SectionFlagLine[];
}                                                       // removed: ordinal, suffix, pendingLine, stub, notes
export type SectionView =
  | (SectionBase & { kind: 'recommendation'; body: RecommendationBody | null })
  | (SectionBase & { kind: 'financials'; body: FigureRow[] | null; blockLabels: { size: string; tested: string } })
  | (SectionBase & { kind: 'risk'; body: RiskBody | null })
  | (SectionBase & { kind: 'peers'; body: PeersBody | null })
  | (SectionBase & { kind: 'covenants'; body: CovenantRow[] | null; testsLabel: string })
  | (SectionBase & { kind: 'revision'; body: RevisionBody | null });
export interface DocBarView {
  fileName: string; files: { dealId: string; label: string; meta: string }[];
  status: StatusText; elapsed: string | null;
  extraction: { text: string; tone: 'ink-3' | 'warn' | 'bad' } | null;   // shown when extraction confidence < 90%
  policySuffix: string | null;
  countdown: { reviewLabel: string } | null;        // the status already carries the countdown text
  goToDecision: boolean; goToDrafting: boolean;
  /** the "Agent panel" toggle: set whenever the panel is hidden ("Go to decision" scrolls the memo, it never opens the panel) */
  chatToggle: { label: string } | null;
  actions: { kind: 'stop' | 'export' | 'rerun' | 'ledger'; label: string; variant: 'secondary' | 'ghost'; disabled: boolean }[];
  confirm: ConfirmView | null;
}
export interface HeaderView {
  eyebrow: string; borrower: string; meta: string; prepared: string; uploaded: boolean;
  cancelled: { text: string; linkLabel: string } | null;
  /** headline is the who-clause only ("You countersigned."); the agent's call is stated at the foot (THREE-PANE §5.11) */
  seal: { state: StatusKey; headline: string; receipt: string } | null;
}
export interface SourceView {
  open: boolean; heading: string; title: string; borrower: string; facility: string; simulated: boolean;
  paragraphs: { n: number; label: string; segments: { text: string; markId: string | null; active: boolean }[] }[];
  stepper: { label: string; hasPrev: boolean; hasNext: boolean } | null;
  quoted: { count: number; markIds: string[]; showAllLabel: string };
  spineLabel: string; spineCount: string;
  /** the doc bar's horizontal source toggle: 'Source CIM · 4 quoted' / 'Hide source' */
  toggleLabel: string;
}
export interface AppendixView { eyebrow: string; heading: string; meta: string; rows: { name: string; threshold: string; actual: string; cushion: { pct: number; text: string; tone: 'neutral' | 'warn' | 'bad' }; status: StatusText }[] | null; empty: string | null }
export interface FileView {
  dealId: string; mode: FileMode; live: boolean; source: 'live' | 'snapshot' | 'deal';
  runId: number | null; revision: number; restructured: boolean;
  docBar: DocBarView; header: HeaderView; sections: SectionView[];
  /** counted, non-superseded notes in emission order; J/K walk them and each note's target is its memo row or card */
  toReview: NoteView[]; sourceView: SourceView; appendix: AppendixView | null;
  rows: { exhibits: boolean; stress: boolean; signature: boolean; monitoring: boolean };
  primary: { label: string; kbd: string; action: 'draft' | 'start-drafting'; disabled: boolean; disabledReason: string | null } | null;
  flagsOnRecord: number; countedNotes: number;
}

export type SignatureState = 'pending' | 'gate' | 'countdown' | 'held' | 'leaving' | 'signed' | 'signed-auto' | 'rejected';
/**
 * The memo's Decision card (THREE-PANE R2.2), the ONE place to decide, after step 5 and before the
 * stress test. Rendered in full: signed over list, reviewer note, amendment summary, the call
 * directly above the verbs, the verb row with a consequence under each, the attestation and policy
 * line, then the signature lines, which become the sealed record after the decision.
 */
export interface SignatureView {
  state: SignatureState;
  /** 'Your countersignature · CAM-2026-0417 · rev 1' while open; 'Countersignature record · …' once sealed */
  eyebrow: string;
  /** 'Decision' (the panel's "Decision →" lands here) */
  heading: string; pendingLine: string | null;
  returned: { rev: number; text: string }[];
  /** linkLabel: 'Show row' (row anchors) | 'Show in memo' (section anchors) */
  signedOver: { flagId: string; noteId: string; state: StatusKey; text: string; cleared: boolean; opened: boolean; target: MemoTarget; linkLabel: string }[];
  signedOverLabel: string;
  /**
   * THREE-PANE R4.3 (Mobbin audit fix 3): ONE non-blocking info item after the Signed over rows,
   * '3 covenant inputs are not stated in the CIM' with 'Show in memo' (the Covenants card). Not a
   * flag: never in signedOver, never counted in "you opened n of N", never read by the policy or
   * the call. Null when every covenant input is stated in (or derived from) the CIM, and pending.
   */
  inputsNotInCim: { text: string; linkLabel: string; target: MemoTarget } | null;
  agent: { text: string; caption: string };
  /** the open line is a record, not a control (the primary verb signs) */
  reviewer: { sigState: SigState; caption: string; ink: 'none' | 'animate' | 'static'; autoText: string | null; rejectedWord: string | null; fillMs: number; reviewLabel: string | null };
  policy: PolicyView;
  /** sealed only: 'The agent recommended ESCALATE. You countersigned.' */
  record: { state: StatusKey; headline: string } | null;
  /**
   * label: 'Reviewer note · on the record', or the armed verb's question ('Why reject it? · on the
   * record' / 'What should the agent revise? · quoted in Revision 2'). hint: the calm line after the
   * armed verb is pressed again with an empty note ('Write a reason first.'); never an alert.
   */
  note: { value: string; label: string; placeholder: string; draftLabel: string; draftDisabled: boolean; chip: string | null; hint: string | null } | null;
  /** editTarget: the first amended covenant's row in the memo ("Edit in memo" lands there, then focusAmend(editKind)) */
  amendment: { text: string; token: TokenView; revertLabel: string; editLabel: string; editKind: 'leverage' | 'liquidity'; editTarget: MemoTarget } | null;
  attestation: string | null;
  /** The agent's overall recommendation, stated directly above the verbs: lead + token (always the agent's own call) + question + one-sentence reason. */
  call: { lead: string; token: TokenView; title: string; why: string } | null;
  /**
   * R4 (Mobbin audit fix 1): a first press of Return or Reject arms it. armed: the armed refusal verb;
   * its label is then the commit label ('Return with note' / 'Reject now', no wider than the resting
   * label) and its kbd the commit chord (⌘↵, from the note); cancelLabel ('Cancel', a quiet link in
   * the same row) only while armed. kbd null = no chip: while armed, A and the other refusal key
   * cannot act from the note where arming puts focus (A never signs over an armed refusal), so their
   * chips drop. The consequence captions (notes) never change.
   */
  verbs: {
    primary: string; returnLabel: string; rejectLabel: string; disabled: boolean;
    armed: 'reject' | 'rework' | null; cancelLabel: string | null;
    kbd: { sign: string | null; ret: string | null; rej: string | null }; notes: { sign: string; ret: string; rej: string };
  } | null;
  sealed: { caption: string; quote: string | null; provenance: string | null; amendments: { label: string; from: string; to: string }[]; routed: string | null; routedLinkLabel: string | null; checks: { ok: boolean; text: string }[] | null } | null;
}
export interface StressView {
  open: boolean; available: 'live' | 'readonly'; collapsedLine: string; openLabel: string; eyebrow: string; baseLabel: string;
  drivers: { key: DriverKey; label: string; value: number; min: number; max: number; step: number; valueText: string; deltaText: string | null; deltaTone: 'good' | 'bad' | 'ink-3'; zones: { tone: MeaningTone; fromPct: number; toPct: number }[]; boundaries: { pct: number; text: string; tone: MeaningTone }[] }[];
  outcome: { base: TokenView; live: TokenView; text: string; key: string };
  covenants: CovenantRow[];
  attach: { label: string; disabled: boolean; reason: string | null } | null;   // null when readonly
  readonlyNote: string | null; resetLabel: string; resetDisabled: boolean;
  /** folds the sandbox back to its one-line row (the scenario is kept) */
  closeLabel: string;
}
export interface ExhibitView { id: string; letter: string; heading: string; meta: string; detail: string; from: TokenView; to: TokenView; result: 'flips' | 'holds' }
/**
 * R4.6 (audit fix 5): the open Acknowledge strip under a Book item, rendered by the kit
 * ConfirmStrip with its reason field. `text` is the one consequence line under the field (whether
 * a reason is required, then what acknowledging does); `hint` is the calm line after a confirm with
 * no reason on a breach. The item's own Acknowledge button hides while the strip is open.
 */
export interface BookAckView {
  label: string;                 // the strip's accessible name: "Acknowledge Max Total Leverage on Project Cobalt"
  text: string;                  // "Required for a breach. Stays quiet until it recovers."
  placeholder: string;           // "Why is this acceptable for now?" (also the field's accessible name)
  value: string;
  required: boolean;
  hint: string | null;           // "Write why it is acceptable first."
  confirmLabel: string;
  cancelLabel: string;
}
export interface BookItem {
  id: string; origin: 'monitor' | 'countersign'; status: StatusText; covenant: string; reading: string; distance: string; raised: string; muted: boolean;
  action: { kind: 'acknowledge' | 'mark-handed-off'; label: string } | null; link: { label: string; route: Route } | null; doneText: string | null;
  /** R4.6: the open Acknowledge strip (monitor items only), else null */
  ack: BookAckView | null;
  /** R4.6: an acknowledged monitor item's line under its figures: "until it recovers · “Waiver in negotiation with sponsor”" */
  ackRecord: string | null;
}
export interface BookRow { dealId: string; name: string; borrower: string; resolvedMeta: string | null; status: StatusText; tightest: { name: string; reading: string } | null; cushion: { pct: number; text: string; tone: 'neutral' | 'warn' | 'bad' } | null; tests: string; risk: { text: string; tone: 'ink' | 'bad' }; checked: string; items: BookItem[] }
export interface BookView { title: string; verdict: StatusText | null; disclosure: string; cadence: string; sweepLabel: string; sweepDisabled: boolean; empty: string | null; rows: BookRow[] }
export interface LedgerRow { id: string; time: string; actor: Actor; event: string; detail: string | null; raw: Record<string, string>; chip: LedgerChip }
export interface LedgerRun { key: string; runId: number; dealId: string; expanded: boolean; header: StatusText & { meta: string }; decision: { time: string; actor: Actor; verb: string; note: string | null; provenance: string | null; amendments: { label: string; from: string; to: string }[]; facts: string } | null; rows: LedgerRow[]; openFile: Route | null; openFileLabel: string }
export interface LedgerView {
  title: string; summary: string; note: string; exportLabel: string;
  chips: { id: LedgerChip; label: string; count: string }[]; activeChip: LedgerChip;
  fileFilter: { label: string; clearLabel: string } | null;
  empty: string | null;
  files: { key: string; heading: string; runs: LedgerRun[] }[];
  monitor: { heading: string; rows: LedgerRow[] } | null;
}

// ---- the agent panel (THREE-PANE R2.1, R2.4) ---------------------------------
// The middle pane is command and control only: one-line status from the agent, the
// plan prompt, the reviewer's questions and short answers, the composer. It never
// displays data and holds no decision: every number, list, record and the whole
// decision live in the memo pane, and a panel line only POINTS at them with a link.

/** A link a composer reply carries (stored on ThreadEntry). selectAgentPanel maps it onto a ThreadLine link: memo → its card, decision → the Decision card ('signature'), stress → the stress test; source and ledger carry no memo card and render no link. */
export type ThreadAction =
  | { kind: 'memo'; label: string; target: MemoTarget }
  | { kind: 'decision'; label: string }
  | { kind: 'stress'; label: string }
  | { kind: 'source'; label: string }
  | { kind: 'ledger'; label: string };

/**
 * 'answer' is a composer reply that stays in the panel (a command acknowledgement, a refusal, the
 * help line; it may clip to 2 lines). 'answered' is the ONE pointer line a real answer about the deal
 * leaves in the panel, "Answered in the memo · Questions →" (R4.5): the answer itself is in the memo.
 */
export type ThreadLineKind = 'run' | 'step' | 'flag' | 'revision' | 'gate' | 'you' | 'answer' | 'answered' | 'system' | 'decided';
export interface ThreadLine {
  id: string;
  kind: ThreadLineKind;
  glyph: StatusKey | null;
  text: string;                                    // one line, plain (a panel reply may clip to 2 lines)
  /**
   * The memo card to scroll to ('signature' = the Decision card). anchorId, when set, is the row
   * inside that card the link cues (the 'answered' line's entry, 'qa:<entryId>'); absent = the card.
   */
  link: { label: string; target: FileAt; anchorId?: string } | null;
}
export interface PlanPromptView {
  text: string;
  /** the plan itself, one line per step (Claude Code style checklist); optional steps carry a checkbox */
  steps: { id: string; n: number; title: string; tool: string; optional: boolean; included: boolean; toggleLabel: string }[];
  start: { label: string; kbd: string; disabled: boolean };
  optional: { stepId: string; label: string; included: boolean } | null; // 'Skip peers' / 'Include peers'
  cancelLabel: string;
  /** a not-started file's plan: Start drafting starts and approves at once; no Cancel, no countdown */
  preview: boolean;
  countdown: { text: string; holdLabel: string | null } | null;
}
export interface AgentPanelView {
  title: string;
  lines: ThreadLine[];
  plan: PlanPromptView | null;
  /** not-started file: the visible way to start (the panel is where work starts) */
  start: { label: string; kbd: string; disabled: boolean } | null;
  composer: { placeholder: string; disabled: boolean; disabledReason: string | null };
}

// ---- the composer (THREE-PANE §4) ------------------------------------------

export interface ComposerContext {
  dealId: string; dealName: string; mode: FileMode; live: boolean; otherLiveName: string | null;
  parsing: string | null; askEnabled: boolean; askDisabledReason: string | null;
  plan: { stepId: string; heading: string; optional: boolean; included: boolean }[];
  planCountdown: boolean; policyCountdown: boolean; policyEligible: boolean;
  amendable: boolean; stressAvailable: boolean; atGate: boolean;
}
export type ComposerToggle = { stepId: string; include: boolean };
export type ComposerIntent =
  | { kind: 'start'; toggle: ComposerToggle | null } | { kind: 'start-plan'; toggle: ComposerToggle } | { kind: 'approve-plan' }
  | { kind: 'toggle-step'; stepId: string; include: boolean }
  | { kind: 'hold'; target: 'plan' | 'policy' } | { kind: 'stop' } | { kind: 'open-stress' }
  | { kind: 'question'; text: string; stress: boolean }
  | { kind: 'refuse'; reason: 'decision' | 'amend' | 'note' | 'required-step' | 'ambiguous' | 'no-plan' | 'plan-fixed' | 'already-live'
      | 'parsing' | 'question-closed' | 'nothing-to-hold' | 'nothing-running' | 'no-stress' | 'unknown'; stepId?: string };
export type ComposerOutcome = 'done' | 'already' | 'confirm-opened' | 'refused';
/**
 * memo: set only on a real answer about the deal (the engine responder, or a deterministic answer
 * composed from the package), never on a command acknowledgement, a refusal, the help line or the
 * stress-test pointer. Such an answer goes in full to the memo's Questions block, and the panel keeps
 * one pointer line to it (R4.5). runId is the run whose package answered (exports and the Ledger
 * group the question under it).
 */
export interface ComposerReply { tone: 'answer' | 'done' | 'refusal'; text: string; meta: string | null; action: ThreadAction | null; memo: { runId: number | null } | null }

// ---- the memo's Questions block (THREE-PANE R4.5) ------------------------------

/**
 * One answered question in the memo's Questions block: the question as typed (its head), the full
 * answer, the quiet meta line ("rule-based responder · simulated · 14:32") and the memo card the
 * answer concerns ("Covenants →", the same target the panel reply used to carry). anchorId
 * 'qa:<entryId>' is the entry's own cue target: the panel's "Questions →" scrolls to it and flashes it.
 */
export interface QuestionEntryView {
  id: string; anchorId: string;
  question: string; answer: string; meta: string;
  link: { label: string; target: MemoTarget } | null;
}
/**
 * The memo's Questions block (R4.5): scratch in the provisional frame (never a MemoCard),
 * after the Decision card and before the stress test. It exists only once the file has an answered
 * question since its epoch (a re-run starts fresh); selectQuestions returns null before that.
 */
export interface QuestionsView { eyebrow: string; aid: string; entries: QuestionEntryView[] }
/** One answered question in the file and session exports (R4.5): at is ISO 8601, source the meta line's source. */
export interface QuestionExport { question: string; answer: string; at: string; source: string }
