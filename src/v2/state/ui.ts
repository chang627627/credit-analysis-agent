// ---------------------------------------------------------------------------
// UI state (spec §9.1 UiState): source pane, cites, trace/flash/note cues,
// stress scratch, ledger view state, the local Ask thread, confirms and the
// palette. Also the small environment hooks the provider needs and cssMs(),
// the one bridge from JS waits to the CSS motion tokens.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react';
import { baselineScenario } from '../../agent/whatif';
import type { Deal } from '../../agent/mockData';
import type { Scenario } from '../../agent/whatif';
import { askRoute, fmtX, selectAsk, selectFile, selectLedger, selectLiveDealId, stressRecord } from '../model';
import type { Route } from './route';
import type { Box, UiState, V2Actions, V2Internals, V2Store } from './store';
import { markOpenedIn } from './gate';

// ---- the motion-token bridge -------------------------------------------------

/**
 * Read a duration token (for example `--dur-2`) from the computed style of the
 * .v2 root and return milliseconds. Under reduced motion the token is 0, so a
 * JS wait keyed on it collapses to 0 automatically. Unparseable means 0.
 */
export function cssMs(name: string): number {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const m = raw.match(/^(-?\d*\.?\d+)(ms|s)$/);
    if (!m) return 0;
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return m[2] === 's' ? n * 1000 : n;
  } catch {
    return 0;
  }
}

// ---- ref-backed state --------------------------------------------------------

export type Update<T> = T | ((prev: T) => T);

/**
 * useState whose latest value is also readable synchronously through a ref.
 * Actions and timers read the ref (two key presses in one tick must see each
 * other's writes); renders read the state. The setter computes from the ref,
 * so it is safe to call repeatedly before React re-renders.
 */
export function useRefState<T>(init: () => T): [T, Box<T>, (u: Update<T>) => void] {
  const [state, setState] = useState<T>(init);
  const ref = useRef<T>(state);
  const set = useCallback((u: Update<T>) => {
    const next = typeof u === 'function' ? (u as (prev: T) => T)(ref.current) : u;
    if (Object.is(next, ref.current)) return;
    ref.current = next;
    setState(next);
  }, []);
  return [state, ref, set];
}

// ---- environment hooks -------------------------------------------------------

/** Date.now(), refreshed by ONE 1000ms interval for the whole app. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Live prefers-reduced-motion. */
export function useReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [match, setMatch] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia(query).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const on = () => setMatch(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);
  return match;
}

/** Live document visibility, with a ref that updates synchronously (timers re-check it). */
export function useTabVisible(): [boolean, Box<boolean>] {
  const read = () => document.visibilityState === 'visible';
  const [visible, setVisible] = useState(read);
  const ref = useRef<boolean>(visible);
  useEffect(() => {
    const on = () => {
      const v = read();
      ref.current = v;
      setVisible(v);
    };
    on();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return [visible, ref];
}

// ---- persistence (v2.showReasoning) -----------------------------------------

const SHOW_REASONING_KEY = 'v2.showReasoning';

function readShowReasoning(): boolean {
  try {
    return localStorage.getItem(SHOW_REASONING_KEY) === '1';
  } catch {
    return false;
  }
}

function writeShowReasoning(v: boolean): void {
  try {
    localStorage.setItem(SHOW_REASONING_KEY, v ? '1' : '0');
  } catch {
    /* storage unavailable: the toggle still works for this session */
  }
}

export function initialUi(): UiState {
  return {
    sourceOpen: false,
    cites: null,
    trace: null,
    flash: null,
    noteFocus: null,
    noteCursor: -1,
    amendFocus: null,
    showReasoning: readShowReasoning(),
    confirm: null,
    paletteOpen: false,
    ledgerOpen: {},
    ledgerChip: 'all',
    stress: {},
    attached: {},
    thread: [],
    parsingSince: null,
    pendingUploadOpen: false,
    announce: null,
  };
}

// ---- route hygiene (spec §9.2 #7) -------------------------------------------

/** The file a route is about; non-file routes keep the last file (browsing the Book is not a deal change). */
export function fileKeyOf(route: Route, last: string | null): string | null {
  return route.name === 'file' ? route.dealId : last;
}

/** Where the user is, ignoring the scroll target: any change closes an inline confirm. */
export function placeKeyOf(route: Route): string {
  switch (route.name) {
    case 'file':
      return `file:${route.dealId}`;
    case 'ledger':
      return `ledger:${route.file ?? ''}`;
    default:
      return route.name;
  }
}

/** Clear everything that belongs to one file's reading session. */
export function clearReading(x: V2Internals): void {
  x.setUi((u) =>
    u.cites === null && u.trace === null && u.noteCursor === -1 && u.confirm === null && u.thread.length === 0
      ? u
      : { ...u, cites: null, trace: null, noteCursor: -1, confirm: null, thread: [] },
  );
}

/**
 * Apply route hygiene for a route the app is moving to. Called synchronously
 * by navigate() (so a palette "navigate, then open a confirm" sequence keeps
 * its confirm) and from an effect for hash changes that bypass navigate().
 */
export function routeHygiene(x: V2Internals, to: Route): void {
  const h = x.hygiene.current;
  const file = fileKeyOf(to, h.file);
  const place = placeKeyOf(to);
  if (file !== h.file) {
    x.hygiene.current = { file, place };
    clearReading(x);
    return;
  }
  if (place !== h.place) {
    x.hygiene.current = { file, place };
    x.setUi((u) => (u.confirm === null ? u : { ...u, confirm: null }));
  }
}

// ---- helpers -----------------------------------------------------------------

function nextTick(prev: { tick: number } | null): number {
  return prev ? prev.tick + 1 : 1;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function dealOf(s: V2Store, dealId: string): Deal | undefined {
  return s.agent.dealsFull.find((d) => d.id === dealId);
}

function isBase(deal: Deal, scenario: Scenario): boolean {
  const base = baselineScenario(deal);
  return (Object.keys(base) as (keyof Scenario)[]).every((k) => Math.abs(base[k] - scenario[k]) < 1e-9);
}

let threadSeq = 0;

// ---- actions -----------------------------------------------------------------

export type UiActions = Pick<
  V2Actions,
  | 'cancelConfirm'
  | 'openSource'
  | 'closeSource'
  | 'toggleSource'
  | 'cite'
  | 'citeStep'
  | 'clearCites'
  | 'trace'
  | 'flashAnchor'
  | 'focusNote'
  | 'focusNoteById'
  | 'focusAmend'
  | 'setShowReasoning'
  | 'openStress'
  | 'closeStress'
  | 'setDriver'
  | 'resetStress'
  | 'attachStress'
  | 'ask'
  | 'setPaletteOpen'
  | 'toggleLedgerGroup'
  | 'setLedgerChip'
>;

export function createUiActions(x: V2Internals): UiActions {
  /** The file on screen (its toReview list is the counted notes, in page order). */
  const reviewNotes = (s: V2Store) => {
    const r = s.route;
    if (r.name !== 'file') return null;
    return safe(() => selectFile(s, r.dealId), null);
  };

  return {
    cancelConfirm: () => x.setUi((u) => (u.confirm === null ? u : { ...u, confirm: null })),

    openSource: () => x.setUi((u) => (u.sourceOpen ? u : { ...u, sourceOpen: true })),
    closeSource: () => x.setUi((u) => (u.sourceOpen ? { ...u, sourceOpen: false } : u)),
    toggleSource: () => x.setUi((u) => ({ ...u, sourceOpen: !u.sourceOpen })),

    cite: (dealId, markIds, startIndex) => {
      if (markIds.length === 0) return;
      const index = Math.min(markIds.length - 1, Math.max(0, Math.round(startIndex)));
      x.setUi((u) => ({ ...u, sourceOpen: true, cites: { dealId, markIds: [...markIds], index } }));
    },
    citeStep: (delta) =>
      x.setUi((u) => {
        if (!u.cites) return u;
        const index = Math.min(u.cites.markIds.length - 1, Math.max(0, u.cites.index + delta));
        return index === u.cites.index ? u : { ...u, cites: { ...u.cites, index } };
      }),
    clearCites: () => x.setUi((u) => (u.cites ? { ...u, cites: null } : u)),

    trace: (stepId, anchorId) => x.setUi((u) => ({ ...u, trace: { stepId, anchorId, tick: nextTick(u.trace) } })),
    flashAnchor: (anchorId) => x.setUi((u) => ({ ...u, flash: { anchorId, tick: nextTick(u.flash) } })),

    focusNote: (delta) => {
      const s = x.current();
      const view = reviewNotes(s);
      const notes = view ? view.toReview : [];
      if (!view || notes.length === 0) return;
      const n = notes.length;
      const cur = s.ui.noteCursor;
      const next = cur < 0 || cur >= n ? (delta === 1 ? 0 : n - 1) : (cur + delta + n) % n;
      const note = notes[next];
      x.setUi((u) => ({ ...u, noteCursor: next, noteFocus: { noteId: note.id, tick: nextTick(u.noteFocus) } }));
      if (note.flagId && view.live) markOpenedIn(x, note.flagId);
    },
    focusNoteById: (noteId) => {
      const s = x.current();
      const view = reviewNotes(s);
      const idx = view ? view.toReview.findIndex((n) => n.id === noteId) : -1;
      const note =
        view && idx >= 0
          ? view.toReview[idx]
          : view
            ? view.sections.flatMap((sec) => sec.notes).find((n) => n.id === noteId) ?? null
            : null;
      x.setUi((u) => ({
        ...u,
        noteCursor: idx >= 0 ? idx : u.noteCursor,
        noteFocus: { noteId, tick: nextTick(u.noteFocus) },
      }));
      if (note && note.flagId && view && view.live) markOpenedIn(x, note.flagId);
    },
    focusAmend: (kind) => x.setUi((u) => ({ ...u, amendFocus: { kind, tick: nextTick(u.amendFocus) } })),

    setShowReasoning: (v) => {
      writeShowReasoning(v);
      x.setUi((u) => (u.showReasoning === v ? u : { ...u, showReasoning: v }));
    },

    openStress: (dealId) => {
      const deal = dealOf(x.current(), dealId);
      if (!deal) return;
      x.setUi((u) => {
        const cur = u.stress[dealId];
        if (cur && cur.open) return u;
        return { ...u, stress: { ...u.stress, [dealId]: { open: true, scenario: cur ? cur.scenario : baselineScenario(deal) } } };
      });
    },
    closeStress: (dealId) =>
      x.setUi((u) => {
        const cur = u.stress[dealId];
        if (!cur || !cur.open) return u;
        return { ...u, stress: { ...u.stress, [dealId]: { ...cur, open: false } } };
      }),
    setDriver: (dealId, key, v) => {
      const deal = dealOf(x.current(), dealId);
      if (!deal || !Number.isFinite(v)) return;
      x.setUi((u) => {
        const cur = u.stress[dealId] ?? { open: true, scenario: baselineScenario(deal) };
        if (cur.scenario[key] === v) return u;
        return { ...u, stress: { ...u.stress, [dealId]: { ...cur, scenario: { ...cur.scenario, [key]: v } } } };
      });
    },
    resetStress: (dealId) => {
      const deal = dealOf(x.current(), dealId);
      if (!deal) return;
      x.setUi((u) => {
        const cur = u.stress[dealId];
        return { ...u, stress: { ...u.stress, [dealId]: { open: cur ? cur.open : true, scenario: baselineScenario(deal) } } };
      });
    },
    // live only: the scratch scenario goes on the record as an exhibit, once per run
    attachStress: (dealId) => {
      const s = x.current();
      if (dealId !== selectLiveDealId(s)) return;
      const st = s.agent.status;
      if (!s.agent.approvalPackage) return;
      if (st !== 'awaiting_approval' && st !== 'approved' && st !== 'rejected' && st !== 'running') return;
      const deal = dealOf(s, dealId);
      const entry = s.ui.stress[dealId];
      if (!deal || !entry || isBase(deal, entry.scenario)) return;
      const rec = stressRecord(deal, entry.scenario);
      const runId = s.agent.runId;
      if ((s.ui.attached[runId] ?? []).includes(rec.key)) return;
      s.agent.logWhatIf(rec.label, rec.detail);
      x.setUi((u) => ({ ...u, attached: { ...u.attached, [runId]: [...(u.attached[runId] ?? []), rec.key] } }));
      x.announce('attached');
    },

    // Ask: the live file only, once its memo exists; local intercepts answer in
    // place, everything else goes to the engine's rule-based responder
    ask: (dealId, text) => {
      const q = text.trim();
      if (!q) return;
      const s = x.current();
      const view = safe(() => selectAsk(s, dealId), null);
      if (!view || !view.enabled) return;
      const deal = dealOf(s, dealId);
      if (!deal) return;
      const pkg = s.agent.approvalPackage;
      const restructured = !!(pkg && pkg.restructure);
      const revisedLeverage =
        restructured && pkg ? pkg.keyMetrics.find((m) => /leverage/i.test(m.label))?.value ?? null : null;
      const route = askRoute(q, {
        restructured,
        revision: pkg ? pkg.revision : 1,
        rec: pkg ? pkg.recommendation : null,
        summary: pkg ? pkg.summary : null,
        filedLeverage: fmtX(deal.financials.leverageX),
        revisedLeverage,
      });
      if (route.kind === 'engine') {
        s.agent.sendMessage(q);
        return;
      }
      const at = s.agent.messages.length;
      const runId = s.agent.runId;
      threadSeq += 2;
      x.setUi((u) => ({
        ...u,
        thread: [
          ...u.thread,
          { id: `ask_${threadSeq - 1}`, runId, role: 'you', text: q, at },
          { id: `ask_${threadSeq}`, runId, role: 'answer', text: route.text, at },
        ],
      }));
    },

    setPaletteOpen: (v) => x.setUi((u) => (u.paletteOpen === v ? u : { ...u, paletteOpen: v })),

    // flip what the reader SEES (the latest run defaults open), not a raw flag
    toggleLedgerGroup: (key) => {
      const s = x.current();
      const shown = safe(() => {
        const view = selectLedger(s, null);
        for (const f of view.files) for (const r of f.runs) if (r.key === key) return r.expanded;
        return null;
      }, null);
      x.setUi((u) => ({ ...u, ledgerOpen: { ...u.ledgerOpen, [key]: !(shown ?? u.ledgerOpen[key] ?? false) } }));
    },
    setLedgerChip: (c) => x.setUi((u) => (u.ledgerChip === c ? u : { ...u, ledgerChip: c })),
  };
}
