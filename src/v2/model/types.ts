// ---------------------------------------------------------------------------
// Countersign V2 · model view types (spec §9.4). Screens render these verbatim:
// every label, number and sentence a screen shows arrives already composed in
// one of these objects. Pure types: no runtime code lives here.
// ---------------------------------------------------------------------------

import type { MeaningTone, StatusKey } from '../kit/types';
import type { SigState } from '../kit/SignatureLine';
import type { DriverKey } from '../../agent/whatif';
import type { Route } from '../state/route';
import type { LedgerChip, Policy } from '../state/store';

export type { MeaningTone, StatusKey, SigState, DriverKey, Route, LedgerChip, Policy };

// ---- shared vocabulary types (declared here once; vocab.ts and flags.ts use them)

/** Human verbs on the record (§5). Words live in `VERB_WORD`. */
export type Verb = 'countersigned' | 'countersigned-amended' | 'auto-countersigned' | 'returned' | 'rejected' | 'cancelled';

/** The closed actor set of the Ledger (§7.5). */
export type Actor = 'Credit Analyst' | 'Reviewer' | 'Policy' | 'Portfolio Monitor';

/** What an engine flag means on the page (`classifyFlag`). */
export type FlagKind = 'breach' | 'watch' | 'low-confidence' | 'send-back' | 'restructure' | 'no-cure' | 'info';

/** A palette command's effect; `state/commands.ts` maps it onto `V2Actions`. */
export type CommandAction =
  | { kind: 'sign' } | { kind: 'go-signature' } | { kind: 'approve-plan' } | { kind: 'cancel-plan' }
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
  | { cls: 'unquoted'; text: 'Unquoted · extracted' }
  | { cls: 'model'; text: string };

export interface TopBarView {
  tabs: { id: 'desk' | 'book' | 'ledger'; label: string; count: string | null; countTone: 'accent' | 'warn' | 'ink-3' }[];
  active: 'desk' | 'book' | 'ledger'; policyOn: boolean; policyLabel: string; policyShort: string;
  speedLabel: string; speeds: { value: number; label: string; checked: boolean }[]; searchKbd: string;
  /** the top bar's left side now that navigation lives in the sidebar */
  sectionTitle: string;
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
  actions: { kind: 'show' | 'trace' | 'amend'; label: string }[]; traceStepId: string | null; amendKind: 'leverage' | 'liquidity' | null;
}
export interface FigureRow { id: FigureId; anchorId: string; label: string; value: string; evidence: EvidenceView }
export interface CovenantRow {
  anchorId: string; name: string; threshold: string; amended: { from: string; to: string } | null;
  actual: string; cushion: { pct: number; text: string; tone: 'neutral' | 'warn' | 'bad' };
  status: 'pass' | 'breach'; statusText: string;
  amend: { kind: 'leverage' | 'liquidity'; value: number; step: number; min: number; max: number; prefix: string; suffix: string } | null;
}
export interface KeyFigureView { label: string; value: string; sub: string | null; caption: string | null; tone: 'ink' | 'warn' | 'bad'; dot: MeaningTone | null; evidenceText: string; traceStepId: string; anchorId: string; ariaLabel: string }
export interface RecommendationBody { basis: string; prior: TokenView | null; token: TokenView; sentence: string; summary: string; keyFigures: KeyFigureView[]; aidLabel: string; nearestFlip: string; stressLinkLabel: string; reworkLine: string | null }
export interface RiskBody { scoreText: string; outOf: string; rating: string; tone: MeaningTone; value: number; tick: number; tickCaption: string; evidence: EvidenceView; drivers: { factor: string; impact: string; tone: 'good' | 'warn' | 'bad' | 'ink-2' }[] }
export interface PeersBody { rows: { cohort: string; leverage: string; interest: string; margin: string; isDeal: boolean }[]; position: string }
export interface RevisionBody { n: number; returned: { quote: string; attribution: string } | null; viable: boolean; summary: string | null; redline: { label: string; from: string; to: string; unchanged: boolean; anchorId: string }[]; noCure: string | null }
export type SectionPhase = 'pending' | 'drafting' | 'set' | 'excluded' | 'stopped';
interface SectionBase { id: SectionId; anchorId: string; ordinal: string; heading: string; suffix: string | null; phase: SectionPhase; status: StatusKey; statusLabel: string; pendingLine: string; drafting: { text: string; callLine: string | null; caret: boolean } | null; stub: StubView | null; notes: NoteView[] }
export type SectionView =
  | (SectionBase & { kind: 'recommendation'; body: RecommendationBody | null })
  | (SectionBase & { kind: 'financials'; body: FigureRow[] | null })
  | (SectionBase & { kind: 'risk'; body: RiskBody | null })
  | (SectionBase & { kind: 'peers'; body: PeersBody | null })
  | (SectionBase & { kind: 'covenants'; body: CovenantRow[] | null })
  | (SectionBase & { kind: 'revision'; body: RevisionBody | null });
export interface DocBarView {
  fileName: string; files: { dealId: string; label: string; meta: string }[];
  status: StatusText; elapsed: string | null;
  extraction: { text: string; tone: 'ink-3' | 'warn' | 'bad' } | null;   // shown when extraction confidence < 90%
  policySuffix: string | null;
  countdown: { reviewLabel: string } | null;        // the status already carries the countdown text
  stepper: { label: string; count: number } | null;
  goToSignature: boolean; goToDrafting: boolean;
  actions: { kind: 'stop' | 'export' | 'rerun' | 'ledger'; label: string; variant: 'secondary' | 'ghost'; disabled: boolean }[];
  confirm: ConfirmView | null;
}
export interface HeaderView {
  eyebrow: string; borrower: string; meta: string; prepared: string; uploaded: boolean;
  cancelled: { text: string; linkLabel: string } | null;
  seal: { state: StatusKey; headline: string; receipt: string } | null;
}
export interface ContentsView {
  mode: 'not-started' | 'plan-review';
  rows: { stepId: string; ordinal: string; title: string; describe: string; tool: string; required: boolean; included: boolean; tag: string }[];
  sourceLine: string; countdown: string | null; held: boolean; holdLabel: string; unattendedNote: string | null;
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
export interface AppendixView { heading: string; meta: string; rows: { name: string; threshold: string; actual: string; cushion: { pct: number; text: string; tone: 'neutral' | 'warn' | 'bad' }; status: StatusText }[] | null; empty: string | null }
export interface FileView {
  dealId: string; mode: FileMode; live: boolean; source: 'live' | 'snapshot' | 'deal';
  runId: number | null; revision: number; restructured: boolean;
  docBar: DocBarView; header: HeaderView; contents: ContentsView | null; sections: SectionView[];
  headerMargin: { showReasoning: boolean; reasoningLabel: string; evidenceCheck: NoteView | null };
  toReview: NoteView[]; sourceView: SourceView; appendix: AppendixView | null;
  rows: { exhibits: boolean; stress: boolean; signature: boolean; monitoring: boolean };
  primary: { label: string; kbd: string; action: 'draft' | 'start-drafting'; disabled: boolean; disabledReason: string | null } | null;
  flagsOnRecord: number; countedNotes: number;
}

export type SignatureState = 'pending' | 'gate' | 'countdown' | 'held' | 'leaving' | 'signed' | 'signed-auto' | 'rejected';
export interface SignatureView {
  state: SignatureState; heading: string; pendingLine: string | null;
  returned: { rev: number; text: string }[];
  signedOver: { flagId: string; noteId: string; state: StatusKey; text: string; cleared: boolean; opened: boolean }[];
  signedOverLabel: string;
  agent: { text: string; caption: string };
  reviewer: { sigState: SigState; caption: string; kbd: string | null; ink: 'none' | 'animate' | 'static'; autoText: string | null; rejectedWord: string | null; fillMs: number; reviewLabel: string | null };
  policy: PolicyView;
  note: { value: string; label: string; placeholder: string; draftLabel: string; draftDisabled: boolean; chip: string | null; hint: string | null } | null;
  amendment: { text: string; token: TokenView; revertLabel: string } | null;
  attestation: string | null;
  /** The agent's overall recommendation, stated beside the verbs so the reviewer never scrolls back up to find what they are deciding. */
  call: { lead: string; token: TokenView; title: string; why: string } | null;
  verbs: { primary: string; returnLabel: string; rejectLabel: string; disabled: boolean; kbd: { sign: string; ret: string; rej: string }; notes: { sign: string; ret: string; rej: string } } | null;
  sealed: { caption: string; quote: string | null; provenance: string | null; amendments: { label: string; from: string; to: string }[]; routed: string | null; routedLinkLabel: string | null; checks: { ok: boolean; text: string }[] | null } | null;
}
export interface StressView {
  open: boolean; available: 'live' | 'readonly'; collapsedLine: string; openLabel: string; eyebrow: string; baseLabel: string;
  drivers: { key: DriverKey; label: string; value: number; min: number; max: number; step: number; valueText: string; deltaText: string | null; deltaTone: 'good' | 'bad' | 'ink-3'; zones: { tone: MeaningTone; fromPct: number; toPct: number }[]; boundaries: { pct: number; text: string; tone: MeaningTone }[] }[];
  outcome: { base: TokenView; live: TokenView; text: string; key: string };
  covenants: CovenantRow[];
  attach: { label: string; disabled: boolean; reason: string | null } | null;   // null when readonly
  readonlyNote: string | null; resetLabel: string; resetDisabled: boolean;
}
export interface ExhibitView { id: string; letter: string; heading: string; meta: string; detail: string; from: TokenView; to: TokenView; result: 'flips' | 'holds' }
export interface BookItem { id: string; origin: 'monitor' | 'countersign'; status: StatusText; covenant: string; reading: string; distance: string; raised: string; muted: boolean; action: { kind: 'acknowledge' | 'mark-handed-off'; label: string } | null; link: { label: string; route: Route } | null; doneText: string | null }
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
export interface AskView { enabled: boolean; placeholder: string; disabledReason: string | null; thread: { id: string; role: 'you' | 'answer'; text: string; meta: string | null }[] }
