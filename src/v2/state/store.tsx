// ---------------------------------------------------------------------------
// The V2 store (spec §9.1, THREE-PANE.md §6). V2Provider calls useCreditAgent()
// and useMonitor() exactly once, owns every piece of V2 state (including the
// agent panel's panes and layout), runs the orchestration effects and the
// keyboard map, and exposes one V2Store through useV2(). Screens are a pure
// reduction of this store through the model's selectors and call only
// store.actions.*; the engine is untouched.
// ---------------------------------------------------------------------------

import { createContext, useContext, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useCreditAgent } from '../../hooks/useCreditAgent';
import { useMonitor } from '../../hooks/useMonitor';
import type { Route } from './route';
import { useHashRoute } from './route';
import type { AnnounceKind, V2Actions, V2Internals, V2Store } from './contracts';
import { createUiActions, initialUi, placeKeyOf, routeHygiene, useNow, useReducedMotion, useRefState, useTabVisible } from './ui';
import { createGateActions, initialGate, initialPolicy, useGateEffects } from './gate';
import { createPlanActions, initialPlan, usePlanEffects } from './plan';
import { createFileActions, useSnapshots } from './files';
import { createPaneActions, initialPanes, useChatLayout, usePaneEffects } from './panes';
import { createComposerActions } from './composer';
import { useMonitorLog } from './monitorLog';
import { useV2Effects } from './effects';
import { useShortcuts } from './shortcuts';

// Every store type lives in contracts.ts (THREE-PANE.md §6.1); `import type { … } from './store'` keeps working.
export type * from './contracts';

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
  const engine = useCreditAgent();

  const router = useHashRoute();
  const now = useNow();
  const reducedMotion = useReducedMotion();
  const [tabVisible, tabVisibleRef] = useTabVisible();
  const modKey = useMemo(detectModKey, []);
  const [policy, policyRef, setPolicy] = useRefState(initialPolicy);
  const [plan, planRef, setPlan] = useRefState(initialPlan);
  const [gate, gateRef, setGate] = useRefState(initialGate);
  const [ui, uiRef, setUi] = useRefState(initialUi);
  // files removed from the Desk this session are hidden from every screen, the palette and the
  // monitor; the engine and the Ledger (auditHistory, runs) keep the full record
  const removed = ui.removedFiles;
  const agent = useMemo(
    () =>
      removed.length === 0
        ? engine
        : { ...engine, dealsFull: engine.dealsFull.filter((d) => !removed.includes(d.id)), deals: engine.deals.filter((d) => !removed.includes(d.id)) },
    [engine, removed],
  );
  const monitor = useMonitor(agent.dealsFull, agent.speed);
  const [panes, panesRef, setPanes] = useRefState(initialPanes);
  const [chatLayout, chatLayoutRef] = useChatLayout();
  const snaps = useSnapshots();
  const monitorLog = useMonitorLog(monitor.escalations);

  const routeRef = useRef<Route>(router.route);
  routeRef.current = router.route;
  const storeRef = useRef<V2Store | null>(null);
  const decisionRef = useRef<HTMLElement | null>(null);
  const noteFieldRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingSignFocus = useRef<number>(0);
  const pendingNoteFocus = useRef<number>(0);
  const pendingPlanToggle = useRef<{ dealId: string; stepId: string; include: boolean } | null>(null);
  const autoRevealed = useRef<Set<string>>(new Set());
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
        panes: panesRef.current,
        chatLayout: chatLayoutRef.current,
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
      panesRef,
      setPanes,
      captureSnapshot: capture,
      decisionRef,
      noteFieldRef,
      pendingSignFocus,
      pendingNoteFocus,
      pendingPlanToggle,
      autoRevealed,
      hygiene,
      decidedRuns,
      announceQueue,
      announce: (kind) => {
        announceQueue.current = [...announceQueue.current, kind];
      },
    };
    return internals;
  }, [navigateRaw, capture, tabVisibleRef, policyRef, setPolicy, planRef, setPlan, gateRef, setGate, uiRef, setUi, panesRef, setPanes, chatLayoutRef]);

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
      ...createPaneActions(x),
      ...createComposerActions(x),
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
    panes,
    chatLayout,
    actions,
  };
  storeRef.current = store;

  usePlanEffects(store, x);
  useGateEffects(store, x);
  useV2Effects(store, x);
  usePaneEffects(store, x); // after useV2Effects: its route hygiene runs first in the same commit
  useShortcuts(x);

  return <V2Context.Provider value={store}>{props.children}</V2Context.Provider>;
}

export function useV2(): V2Store {
  const s = useContext(V2Context);
  if (!s) throw new Error('useV2() must be used inside <V2Provider>');
  return s;
}
