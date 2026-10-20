// ---------------------------------------------------------------------------
// Countersign V2 · the store contracts (THREE-PANE.md §6.1, §6.2 as revised by
// R2). Every type the V2 store publishes lives here. store.tsx keeps the
// provider and re-exports these (`export type * from './contracts'`), so
// `import type { … } from './store'` keeps working. Pure types: no runtime
// code lives here.
//
// R2 (owner revision): the agent panel is command and control only. It holds
// one-line status, the plan prompt, Q&A and the composer; it never displays
// data and holds no decision. The WHOLE decision (call, note, verbs,
// attestation, signature lines, sealed record) is the memo's Decision card
// (FileAt 'signature'). So there is no memo → panel cue (no threadCue, no
// revealInThread) and no panel note focus (no noteFocus): J / K and "Show row"
// go to the flagged row in the memo.
// ---------------------------------------------------------------------------

import type { CreditAgentApi, StepView, RunDecision } from '../../hooks/useCreditAgent';
import type { MonitorApi } from '../../hooks/useMonitor';
import type { Amendment, ApprovalPackage, NoteProvenance, PlanStep } from '../../agent/types';
import type { Deal } from '../../agent/mockData';
import type { DriverKey, Scenario } from '../../agent/whatif';
import type { Route } from './route';
import type { MemoSection, MemoTarget, ThreadAction } from '../model/types';   // type-only; model/types imports from here too

export type Policy = 'gate' | 'auto';
export type HoldReason = 'engaged' | 'manual' | 'left' | 'hidden' | 'policy-off';
export type LedgerChip = 'all' | 'reviewer' | 'policy' | 'flags' | 'exhibits' | 'monitor';

export interface PresentedAtSign {
  attestation: string | null; primaryLabel: string | null;
  signedOver: string[]; notesOpened: { opened: number; total: number };
  keyFigures: { label: string; value: string }[];
}
export interface CaseFileSnapshot {
  dealId: string; runId: number; deal: Deal;
  plan: PlanStep[]; steps: StepView[]; pkg: ApprovalPackage;
  outcome: 'approve' | 'reject'; decision: RunDecision;
  note: string | null; noteProvenance: NoteProvenance | null; amendments: Amendment[] | null; auto: boolean;
  startedAt: number; awaitingAt: number | null; decidedAt: number;
  routed: boolean;                 // countersigned ESCALATE raised into the monitor queue
  presented: PresentedAtSign | null;
}                                  // events always come from auditHistory filtered by runId
export interface GateState {
  pkgKey: string | null;           // `${runId}:${revision}` the draft belongs to
  note: string;
  insertedDraft: string | null;
  /**
   * R4 (Mobbin audit fix 1): the refusal verb the reviewer armed. A first press of Return or Reject
   * (click, S, R) never acts: it arms that verb, puts the reviewer in the note with its text
   * selected, and the note label asks the verb's question. A second press of the SAME verb commits
   * when the note has text; the other refusal verb re-arms to it; Cancel or Esc in the card disarms;
   * signing clears it.
   */
  armed: 'reject' | 'rework' | null;
  /** the armed verb was pressed again with an empty note: the calm inline hint shows (cleared by any text) */
  reasonHint: boolean;
  levMax: number | null;           // amended Max Total Leverage ceiling (null = as filed)
  liqMin: number | null;           // amended Min Liquidity floor (null = as filed)
  held: boolean; holdReason: HoldReason | null;   // survives route changes until pkgKey changes
  autoDeadline: number | null;
  leaving: boolean;
  opened: string[];                // flag ids opened by explicit actions
  justSigned: { runId: number; verb: 'approve' | 'reject'; auto: boolean; at: number; presented: PresentedAtSign } | null;
}
export interface PlanState {
  enabledIds: string[]; held: boolean; holdReason: 'manual' | 'left' | 'hidden' | null; deadline: number | null;
}
export interface MonitorLogEntry {
  id: string;                      // `${escalationId}:${kind}:${severity}` (dedupe key)
  escalationId: string; kind: 'raised' | 'upgraded' | 'acknowledged' | 'resolved'; reraised: boolean;
  at: number; dealId: string; dealName: string; origin: 'monitor' | 'countersign';
  covenant: string | null; severity: 'warning' | 'critical'; reason: string; actual: string | null; threshold: string | null;
}

// ---- three-pane state (§1.5, §6.1)

/** Column mode at viewport >= 1024px, drawer mode below (matchMedia, live). */
export type ChatLayout = 'column' | 'drawer';
/**
 * chatOpen: the owner's choice in column mode (persisted 'v2.chatOpen', state/panes.ts only).
 * revealed: a transient reveal over a hidden panel (column mode, never persisted).
 * drawerOpen: the drawer is open (drawer mode, never persisted, starts false).
 */
export interface PaneState { chatOpen: boolean; revealed: boolean; drawerOpen: boolean }

/** One composer exchange line in the thread (§4.3, §4.4). */
export interface ThreadEntry {
  id: string; dealId: string; t: number;
  role: 'you' | 'answer';
  text: string; meta: string | null;
  tone: 'answer' | 'done' | 'refusal';
  action: ThreadAction | null;
}

/** A cue carries time: consumers react to a tick change, and on mount honour a cue whose `at` is under 1000 ms old (§2.6). */
export interface Cue { tick: number; at: number }

export interface UiState {
  sourceOpen: boolean;
  cites: { dealId: string; markIds: string[]; index: number } | null;
  /** panel → memo (and J / K, Show row, Edit in memo, the stress test): scroll that card, cue the row or head */
  memoCue: (Cue & { section: MemoSection; anchorId: string | null; instant: boolean }) | null;
  noteCursor: number;              // J / K position in FileView.toReview; -1 = none yet
  amendFocus: { kind: 'leverage' | 'liquidity'; tick: number } | null;
  confirm: { kind: 'start'; dealId: string } | { kind: 'stop' } | null;
  paletteOpen: boolean;
  ledgerOpen: Record<string, boolean>;
  ledgerChip: LedgerChip;
  stress: Record<string, { open: boolean; scenario: Scenario }>;   // keyed by dealId
  /** optional plan steps unticked on a not-started file's plan, before it starts (keyed by dealId) */
  planPreview: Record<string, string[]>;
  /** files removed from the Desk this session (hidden everywhere but the Ledger, which keeps every record) */
  removedFiles: string[];
  /** the Desk row whose remove confirm is open */
  removeConfirm: string | null;
  attached: Record<number, string[]>;                              // stressRecord keys attached, per runId
  thread: ThreadEntry[];                    // capped 300; not cleared by clearReading
  threadEpoch: Record<string, number>;      // per dealId: entries older than the epoch are hidden
  composerDraft: Record<string, string>;    // per dealId, not persisted
  parsingSince: number | null;
  pendingUploadOpen: boolean;      // navigate to the new file when parsing ends
  announce: string | null;
}

// ---- actions (§6.2, full list)

export interface V2Actions {
  navigate(to: Route): void;
  setPolicy(p: Policy): void;                  // switching off while armed → holdAuto('policy-off')
  setSpeed(n: number): void;
  startFile(dealId: string, opts?: { toggle?: { stepId: string; include: boolean } }): void;   // optional toggle rides x.pendingPlanToggle (§6.3)
  confirmStart(): void;
  requestStop(): void;                         // opens the stop confirm
  confirmStop(): void;                         // agent.reset(); also sets threadEpoch[live]
  cancelConfirm(): void;                       // also clears pendingPlanToggle
  upload(file: File): void;                    // agent.uploadDeal + parsingSince + pendingUploadOpen
  togglePlanStep(stepId: string): void;        // also holds the plan countdown ('manual')
  togglePreviewStep(dealId: string, stepId: string): void; // a not-started file's plan, before it starts
  draftFile(dealId: string): void;
  requestRemove(dealId: string): void;         // opens the row's confirm (never for the live run's file)
  confirmRemove(): void;
  cancelRemove(): void;
  restoreRemoved(): void;                      // Settings: bring removed files back to the Desk             // start AND approve the plan as shown (one click; the confirm guard still applies)
  holdPlan(): void;
  approvePlan(): void;                         // agent.approvePlan(plan.enabledIds)
  cancelPlan(): void;                          // agent.cancelPlan()
  setNote(text: string): void;                 // holdAuto('engaged'); clears reasonHint when non-empty; insertedDraft = null when cleared
  insertDraft(): void;                         // note = draftNoteFor(pkg); insertedDraft = that; holdAuto('engaged'); clears reasonHint
  setThreshold(kind: 'leverage' | 'liquidity', v: number | null): void;  // holdAuto('engaged'); v equal to filed → null
  revertAmendments(): void;
  /**
   * R2.3, relative to the memo Decision card (the registered root, see registerDecision):
   *  - 'card'   the card's primary verb itself (click, Enter, Space): signs at once (live file only).
   *  - 'key'    A: signs when the card's reviewer line is on screen (below the doc bar, inside the
   *             window, not covered by the drawer or an overlaid source); otherwise phase one only.
   *  - 'button' "Go to decision" (doc bar, palette), the panel's "Decision →" and the composer's
   *             refusal link: phase one only, never signs.
   * Phase one: navigate to the live file if needed, close the drawer and an overlaid source, bring
   * the verbs and the reviewer line into view, and focus the primary (or, for 'button', the note
   * field while a refusal verb is armed). After a signature (or a rejection) the reviewer line is brought into view so the
   * ink (or the stamp) lands in view, and focus that fell to the body goes to the card's
   * [data-record-focus] (tabIndex -1).
   */
  requestSign(source: 'key' | 'button' | 'card'): void;
  /**
   * R4 (Mobbin audit fix 1), Return (tryRework: click, S) and Reject (tryReject: click, R, or ⌘↵ in
   * the card while armed). Every press holds the countdown and clears what covers the memo. A press
   * of a verb that is not armed NEVER acts: it arms it (gate.armed), brings the note and that verb
   * into view, focuses the note and selects its text (pendingNoteFocus when the field is unmounted).
   * A press of the armed verb commits when the note has text; with an empty note it stays armed,
   * focuses the note and shows the calm hint (reasonHint). Committing Reject seals the run;
   * committing Return recedes (leaving), then the loop resumes after --dur-2 (focus lost to the
   * body → the card's pending line).
   */
  tryReject(): void;
  tryRework(): void;
  /** Cancel (the link beside the verbs) or Esc in the card: disarm; focus lost to the body returns to the verb it disarmed */
  disarm(): void;
  reviewManually(): void;                      // holdAuto('manual')
  registerDecision(el: HTMLElement | null): void;          // the memo Decision card root ([data-decision]); consumes pendingSignFocus
  registerNoteField(el: HTMLTextAreaElement | null): void; // the card's reviewer note field; consumes pendingNoteFocus
  openSource(): void; closeSource(): void; toggleSource(): void;   // opening closes the drawer
  cite(dealId: string, markIds: string[], startIndex: number): void;   // opens the source
  citeStep(delta: 1 | -1): void;
  clearCites(): void;
  /**
   * Scroll the memo to a card (and row) and cue it: the panel's "Section →" links, Edit in memo,
   * Show row. Drawer mode closes the drawer first unless keepDrawer. The Decision card
   * ({ section: 'signature' }) at the live gate is brought into view exactly like
   * requestSign('button') (verbs and reviewer line in view, primary or note field focused).
   */
  cueMemo(target: MemoTarget, opts?: { instant?: boolean; keepDrawer?: boolean }): void;
  focusNote(delta: 1 | -1): void;              // J / K: next / previous FileView.toReview row in the memo (cueMemo); counts it opened at the live gate
  focusNoteById(noteId: string): void;         // Signed over "Show row": that note's row in the memo; counts it opened at the live gate
  focusAmend(kind: 'leverage' | 'liquidity'): void;
  openStress(dealId: string): void;            // also cueMemo({ section: 'stress', anchorId: null })
  closeStress(dealId: string): void;
  setDriver(dealId: string, key: DriverKey, v: number): void;
  resetStress(dealId: string): void;
  attachStress(dealId: string): void;          // live only: agent.logWhatIf(label, detail) + attached[runId].push(key)
  setChatOpen(open: boolean): void;            // explicit (persists in column mode); the panel's collapse chevron, `]`
  toggleChat(): void;                          // explicit
  submitComposer(dealId: string, text: string): void;      // §4 intents; typing never signs, returns or rejects (refused with a link to the Decision card)
  setComposerDraft(dealId: string, text: string): void;   // engages (§4.3): holds a running countdown
  sweepNow(): void;
  acknowledge(id: string): void;               // monitor.acknowledge
  markHandedOff(id: string): void;             // monitor.acknowledge on a countersign-origin item
  exportFile(dealId: string): void;
  exportSession(): void;
  setPaletteOpen(v: boolean): void;
  toggleLedgerGroup(key: string): void;
  setLedgerChip(c: LedgerChip): void;
}
export interface V2Store {
  agent: CreditAgentApi;
  monitor: MonitorApi;
  route: Route;
  navSeq: number;
  now: number;                     // Date.now(), refreshed by ONE 1000ms interval
  reducedMotion: boolean;          // matchMedia('(prefers-reduced-motion: reduce)'), live
  tabVisible: boolean;             // document.visibilityState === 'visible', live
  modKey: string;                  // '⌘' or 'Ctrl'
  policy: Policy;                  // persisted 'v2.autonomy' (V1 used 'autonomy')
  plan: PlanState;
  gate: GateState;
  snapshots: Record<string, CaseFileSnapshot>;   // latest sealed run per dealId
  snapshotList: CaseFileSnapshot[];              // every sealed run, for export
  monitorLog: MonitorLogEntry[];                 // append-only
  ui: UiState;
  panes: PaneState;
  chatLayout: ChatLayout;
  actions: V2Actions;
}

// ---- shell-internal plumbing (state/ modules only) ----------------------------

export interface Box<T> {
  current: T;
}
export type Setter<T> = (u: T | ((prev: T) => T)) => void;
export type AnnounceKind = 'gate' | 'signed' | 'auto' | 'rejected' | 'returned' | 'attached' | 'held' | 'sign-ready' | 'need-reason';

/**
 * What the state/ modules share. Ref-backed slices are readable synchronously
 * (two actions in one tick see each other's writes); current() is the last
 * rendered store with every ref-backed slice at its latest value (panes included).
 */
export interface V2Internals {
  rendered: () => V2Store;
  current: () => V2Store;
  navigate: (to: Route) => void;
  routeRef: Box<Route>;
  tabVisibleRef: Box<boolean>;
  policyRef: Box<Policy>;
  setPolicy: Setter<Policy>;
  planRef: Box<PlanState>;
  setPlan: Setter<PlanState>;
  gateRef: Box<GateState>;
  setGate: Setter<GateState>;
  uiRef: Box<UiState>;
  setUi: Setter<UiState>;
  panesRef: Box<PaneState>;
  setPanes: Setter<PaneState>;
  captureSnapshot: (snap: CaseFileSnapshot) => void;
  /** the registered memo Decision card root */
  decisionRef: Box<HTMLElement | null>;
  /** the registered reviewer note field */
  noteFieldRef: Box<HTMLTextAreaElement | null>;
  /** when phase one asked for the card's primary before the card mounted (0 = none): registerDecision focuses it within 3000 ms */
  pendingSignFocus: Box<number>;
  /** when arming Return or Reject asked for the note field before it mounted (0 = none): registerNoteField focuses it (text selected) within 3000 ms */
  pendingNoteFocus: Box<number>;
  /** a compound start's plan toggle, applied when that deal's plan review opens */
  pendingPlanToggle: Box<{ dealId: string; stepId: string; include: boolean } | null>;
  /** auto-reveal keys already fired: 'plan:<epoch>' (the plan prompt lives in the panel; the gate never reveals it) */
  autoRevealed: Box<Set<string>>;
  hygiene: Box<{ file: string | null; place: string }>;
  decidedRuns: Box<Set<number>>;
  announceQueue: Box<AnnounceKind[]>;
  announce: (kind: AnnounceKind) => void;
}
