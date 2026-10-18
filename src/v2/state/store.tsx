// ---------------------------------------------------------------------------
// The V2 store (spec §9.1). V2Provider calls useCreditAgent() and useMonitor()
// exactly once, owns every piece of V2 state, runs the orchestration effects
// and the keyboard map, and exposes one V2Store through useV2(). Screens are a
// pure reduction of this store through the model's selectors and call only
// store.actions.*; the engine is untouched.
// ---------------------------------------------------------------------------

import { createContext, useContext, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useCreditAgent } from '../../hooks/useCreditAgent';
import type { CreditAgentApi, StepView, RunDecision } from '../../hooks/useCreditAgent';
import { useMonitor } from '../../hooks/useMonitor';
import type { MonitorApi } from '../../hooks/useMonitor';
import type { Amendment, ApprovalPackage, NoteProvenance, PlanStep } from '../../agent/types';
import type { Deal } from '../../agent/mockData';
import type { DriverKey, Scenario } from '../../agent/whatif';
import type { Route } from './route';
import { useHashRoute } from './route';
import { createUiActions, initialUi, placeKeyOf, routeHygiene, useNow, useReducedMotion, useRefState, useTabVisible } from './ui';
import { createGateActions, initialGate, readPolicy, useGateEffects } from './gate';
import { createPlanActions, initialPlan, usePlanEffects } from './plan';
import { createFileActions, useSnapshots } from './files';
import { useMonitorLog } from './monitorLog';
import { useV2Effects } from './effects';
import { useShortcuts } from './shortcuts';

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
  needNote: 'reject' | 'rework' | null;
  levMax: number | null;           // amended Max Total Leverage ceiling (null = as filed)
  liqMin: number | null;           // amended Min Liquidity floor (null = as filed)
  held: boolean; holdReason: HoldReason | null;   // survives route changes until pkgKey changes
  autoDeadline: number | null;
  leaving: boolean;
  opened: string[];                // flag ids opened by explicit actions
  focusTick: number;               // focus the note field
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
export interface UiState {
  sourceOpen: boolean;
  cites: { dealId: string; markIds: string[]; index: number } | null;
  trace: { stepId: string; anchorId: string | null; tick: number } | null;
  flash: { anchorId: string; tick: number } | null;
  noteFocus: { noteId: string; tick: number } | null;
  noteCursor: number;              // -1 = none yet
  amendFocus: { kind: 'leverage' | 'liquidity'; tick: number } | null;
  showReasoning: boolean;          // persisted 'v2.showReasoning'
  confirm: { kind: 'start'; dealId: string } | { kind: 'stop' } | null;
  paletteOpen: boolean;
  ledgerOpen: Record<string, boolean>;
  ledgerChip: LedgerChip;
  stress: Record<string, { open: boolean; scenario: Scenario }>;   // keyed by dealId
  attached: Record<number, string[]>;                              // stressRecord keys attached, per runId
  thread: { id: string; runId: number; role: 'you' | 'answer'; text: string; at: number }[];  // local intercepts; at = agent.messages.length when added
  parsingSince: number | null;
  pendingUploadOpen: boolean;      // navigate to the new file when parsing ends
  announce: string | null;
}
export interface V2Actions {
  navigate(to: Route): void;
  setPolicy(p: Policy): void;                  // switching off while armed → holdAuto('policy-off')
  setSpeed(n: number): void;
  startFile(dealId: string): void;             // no-op while parsing; confirm if ANY run is live; else agent.start + navigate
  confirmStart(): void;
  requestStop(): void;                         // opens the stop confirm
  confirmStop(): void;                         // agent.reset()
  cancelConfirm(): void;
  upload(file: File): void;                    // agent.uploadDeal + parsingSince + pendingUploadOpen
  togglePlanStep(stepId: string): void;        // also holds the plan countdown ('manual')
  holdPlan(): void;
  approvePlan(): void;                         // agent.approvePlan(plan.enabledIds)
  cancelPlan(): void;                          // agent.cancelPlan()
  setNote(text: string): void;                 // holdAuto('engaged'); clears needNote when non-empty; insertedDraft = null when cleared
  insertDraft(): void;                         // note = draftNoteFor(pkg); insertedDraft = that; holdAuto('engaged')
  setThreshold(kind: 'leverage' | 'liquidity', v: number | null): void;  // holdAuto('engaged'); v equal to filed → null
  revertAmendments(): void;
  requestSign(source: 'key' | 'button' | 'line' | 'palette'): void;     // two-phase (§8)
  tryReject(): void;
  tryRework(): void;
  reviewManually(): void;                      // holdAuto('manual')
  registerSignatureLine(el: HTMLElement | null): void;
  markOpened(flagId: string): void;
  openSource(): void; closeSource(): void; toggleSource(): void;
  cite(dealId: string, markIds: string[], startIndex: number): void;   // opens the source
  citeStep(delta: 1 | -1): void;
  clearCites(): void;
  trace(stepId: string, anchorId: string | null): void;
  flashAnchor(anchorId: string): void;
  focusNote(delta: 1 | -1): void;              // stepper / J K; marks opened
  focusNoteById(noteId: string): void;         // "Show note" in Signed over; marks opened
  focusAmend(kind: 'leverage' | 'liquidity'): void;
  setShowReasoning(v: boolean): void;
  openStress(dealId: string): void;
  closeStress(dealId: string): void;
  setDriver(dealId: string, key: DriverKey, v: number): void;
  resetStress(dealId: string): void;
  attachStress(dealId: string): void;          // live only: agent.logWhatIf(label, detail) + attached[runId].push(key)
  ask(dealId: string, text: string): void;     // askRoute → local entry pair in ui.thread, or agent.sendMessage
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
  actions: V2Actions;
}

// ---- shell-internal plumbing (state/ modules only) ----------------------------

export interface Box<T> {
  current: T;
}
export type Setter<T> = (u: T | ((prev: T) => T)) => void;
export type AnnounceKind = 'gate' | 'signed' | 'auto' | 'rejected' | 'returned' | 'attached' | 'held';

/**
 * What the state/ modules share. Ref-backed slices are readable synchronously
 * (two actions in one tick see each other's writes); current() is the last
 * rendered store with every ref-backed slice at its latest value.
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
  captureSnapshot: (snap: CaseFileSnapshot) => void;
  lineRef: Box<HTMLElement | null>;
  /** when phase one navigated to the line (0 = none): focus it once it mounts, briefly */
  pendingLineFocus: Box<number>;
  hygiene: Box<{ file: string | null; place: string }>;
  decidedRuns: Box<Set<number>>;
  announceQueue: Box<AnnounceKind[]>;
  announce: (kind: AnnounceKind) => void;
}

const V2Context = createContext<V2Store | null>(null);

function detectModKey(): string {
  try {
    return /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
  } catch {
    return 'Ctrl';
  }
}

export function V2Provider(props: { children: ReactNode }) {
  // the engine, exactly once
  const agent = useCreditAgent();
  const monitor = useMonitor(agent.dealsFull, agent.speed);

  const router = useHashRoute();
  const now = useNow();
  const reducedMotion = useReducedMotion();
  const [tabVisible, tabVisibleRef] = useTabVisible();
  const modKey = useMemo(detectModKey, []);
  const [policy, policyRef, setPolicy] = useRefState(readPolicy);
  const [plan, planRef, setPlan] = useRefState(initialPlan);
  const [gate, gateRef, setGate] = useRefState(initialGate);
  const [ui, uiRef, setUi] = useRefState(initialUi);
  const snaps = useSnapshots();
  const monitorLog = useMonitorLog(monitor.escalations);

  const routeRef = useRef<Route>(router.route);
  routeRef.current = router.route;
  const storeRef = useRef<V2Store | null>(null);
  const lineRef = useRef<HTMLElement | null>(null);
  const pendingLineFocus = useRef<number>(0);
  const hygiene = useRef<{ file: string | null; place: string }>({
    file: router.route.name === 'file' ? router.route.dealId : null,
    place: placeKeyOf(router.route),
  });
  const decidedRuns = useRef<Set<number>>(new Set());
  const announceQueue = useRef<AnnounceKind[]>([]);

  const navigateRaw = router.navigate;
  const capture = snaps.capture;
  // every member is a stable ref or setter, so one internals object serves every render
  const x = useMemo<V2Internals>(() => {
    const rendered = () => {
      const s = storeRef.current;
      if (!s) throw new Error('V2 store read before the first render');
      return s;
    };
    const internals: V2Internals = {
      rendered,
      current: () => ({
        ...rendered(),
        route: routeRef.current,
        tabVisible: tabVisibleRef.current,
        policy: policyRef.current,
        plan: planRef.current,
        gate: gateRef.current,
        ui: uiRef.current,
        now: Date.now(),
      }),
      navigate: (to) => {
        routeHygiene(internals, to);
        routeRef.current = to;
        navigateRaw(to);
      },
      routeRef,
      tabVisibleRef,
      policyRef,
      setPolicy,
      planRef,
      setPlan,
      gateRef,
      setGate,
      uiRef,
      setUi,
      captureSnapshot: capture,
      lineRef,
      pendingLineFocus,
      hygiene,
      decidedRuns,
      announceQueue,
      announce: (kind) => {
        announceQueue.current = [...announceQueue.current, kind];
      },
    };
    return internals;
  }, [navigateRaw, capture, tabVisibleRef, policyRef, setPolicy, planRef, setPlan, gateRef, setGate, uiRef, setUi]);

  const actions = useMemo<V2Actions>(
    () => ({
      navigate: (to) => x.navigate(to),
      setSpeed: (n) => x.current().agent.setSpeed(n),
      sweepNow: () => x.current().monitor.sweepNow(),
      acknowledge: (id) => x.current().monitor.acknowledge(id),
      markHandedOff: (id) => {
        const m = x.current().monitor;
        const item = m.escalations.find((e) => e.id === id);
        if (item && item.origin === 'countersign') m.acknowledge(id);
      },
      ...createUiActions(x),
      ...createGateActions(x),
      ...createPlanActions(x),
      ...createFileActions(x),
    }),
    [x],
  );

  const store: V2Store = {
    agent,
    monitor,
    route: router.route,
    navSeq: router.navSeq,
    now,
    reducedMotion,
    tabVisible,
    modKey,
    policy,
    plan,
    gate,
    snapshots: snaps.snapshots,
    snapshotList: snaps.snapshotList,
    monitorLog,
    ui,
    actions,
  };
  storeRef.current = store;

  usePlanEffects(store, x);
  useGateEffects(store, x);
  useV2Effects(store, x);
  useShortcuts(x);

  return <V2Context.Provider value={store}>{props.children}</V2Context.Provider>;
}

export function useV2(): V2Store {
  const s = useContext(V2Context);
  if (!s) throw new Error('useV2() must be used inside <V2Provider>');
  return s;
}
