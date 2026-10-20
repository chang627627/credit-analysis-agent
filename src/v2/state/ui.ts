// ---------------------------------------------------------------------------
// UI state (spec §9.1 UiState, THREE-PANE.md §6.1 as revised by R2): source
// pane, cites, the memo cue (the agent panel's links, J / K, Show row, Edit in
// memo and the stress test all scroll the memo; nothing scrolls the panel),
// stress scratch, ledger view state, confirms and the palette. The composer's
// thread entries live here too (state/composer.ts writes them). Also the small
// environment hooks the provider needs and cssMs(), the one bridge from JS
// waits to the CSS motion tokens.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react';
import { baselineScenario } from '../../agent/whatif';
import type { Deal } from '../../agent/mockData';
import type { Scenario } from '../../agent/whatif';
import { selectFile, selectLedger, selectLiveDealId, selectSignature, stressRecord } from '../model';
import type { MemoTarget } from '../model';
import type { Route } from './route';
import type { Box, UiState, V2Actions, V2Internals, V2Store } from './store';
import { bringDecisionIn, canDecide, markOpenedIn, onLiveFile, pkgKeyOf } from './gate';
import { closeDrawerIn, resetPanesForFile } from './panes';
import { cssEscape, onFrames, rendered } from './reveal';

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

export function initialUi(): UiState {
  return {
    sourceOpen: false,
    cites: null,
    memoCue: null,
    noteCursor: -1,
    amendFocus: null,
    confirm: null,
    paletteOpen: false,
    ledgerOpen: {},
    ledgerChip: 'all',
    stress: {},
    planPreview: {},
    removedFiles: [],
    removeConfirm: null,
    attached: {},
    thread: [],
    threadEpoch: {},
    composerDraft: {},
    parsingSince: null,
    pendingUploadOpen: false,
    announce: null,
  };
}

// ---- route hygiene (spec §9.2 #7, THREE-PANE.md §6.3) -----------------------

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

/**
 * Clear everything that belongs to one file's reading session. The composer
 * thread is NOT cleared: each file's entries are hidden by its epoch instead
 * (THREE-PANE.md §4.4), so a sealed file keeps its Q&A.
 */
export function clearReading(x: V2Internals): void {
  x.setUi((u) =>
    u.cites === null && u.memoCue === null && u.noteCursor === -1 && u.confirm === null
      ? u
      : { ...u, cites: null, memoCue: null, noteCursor: -1, confirm: null },
  );
}

/** At this memo pane width and up the source pushes the canvas; below it overlays (file.css, @container viz). */
export const VIZ_SOURCE_PUSH_MIN = 1064;

/** True when an open source overlays the memo. Before a case file mounts (navigating from the
    Desk, Book or Ledger) there is no [data-viz]: treat that as overlay, so the next file never
    opens already covered. Never throws. */
export function sourceIsOverlay(): boolean {
  try {
    const el = document.querySelector('[data-viz]');
    return !(el instanceof HTMLElement) || el.clientWidth < VIZ_SOURCE_PUSH_MIN;
  } catch {
    return true;
  }
}

/**
 * Apply route hygiene for a route the app is moving to. Called synchronously
 * by navigate() (so a palette "navigate, then open a confirm" sequence keeps
 * its confirm) and from an effect for hash changes that bypass navigate().
 * Opening another file also closes an overlaid source (so the next file never
 * opens already covered; a pushed source is a reading preference and stays
 * open), ends a transient panel reveal and closes the drawer. Any other place
 * change closes the confirm strip and the drawer.
 */
export function routeHygiene(x: V2Internals, to: Route): void {
  const h = x.hygiene.current;
  const file = fileKeyOf(to, h.file);
  const place = placeKeyOf(to);
  if (file !== h.file) {
    x.hygiene.current = { file, place };
    clearReading(x);
    if (sourceIsOverlay()) x.setUi((u) => (u.sourceOpen ? { ...u, sourceOpen: false } : u));
    resetPanesForFile(x);
    return;
  }
  if (place !== h.place) {
    x.hygiene.current = { file, place };
    x.setUi((u) => (u.confirm === null ? u : { ...u, confirm: null }));
    closeDrawerIn(x);
  }
}

// ---- helpers -----------------------------------------------------------------

/**
 * One counter for every memo cue tick. It never resets, so a cue written after
 * clearReading nulled the last one can never repeat the tick a mounted
 * consumer already handled.
 */
let cueSeq = 0;

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

/**
 * Scroll the memo to a card (and row) and cue it (THREE-PANE.md §2.6): in
 * drawer mode the drawer closes first (unless keepDrawer), then FileScreen
 * scrolls to the card and flashes the row or head.
 */
export function cueMemoIn(x: V2Internals, target: MemoTarget, opts?: { instant?: boolean; keepDrawer?: boolean }): void {
  if (!opts?.keepDrawer) closeDrawerIn(x);
  cueSeq += 1;
  const tick = cueSeq;
  x.setUi((u) => ({
    ...u,
    memoCue: { section: target.section, anchorId: target.anchorId, instant: !!opts?.instant, tick, at: Date.now() },
  }));
}

// ---- flagged rows: J / K and Signed over take the reviewer to the row in the memo ----

/** A flagged memo row the reviewer is taken to: where it is, the flag it counts for, and how it is announced. */
interface RowNote {
  id: string;
  flagId: string | null;
  target: MemoTarget;
  heading: string;
  text: string;
}

/** The counted, non-superseded flags of a file, top to bottom (FileView.toReview). */
function rowsToReview(s: V2Store, dealId: string): RowNote[] {
  return safe(() => {
    const view = selectFile(s, dealId);
    return view ? view.toReview.map((n) => ({ id: n.id, flagId: n.flagId, target: n.target, heading: n.heading, text: n.text })) : [];
  }, []);
}

/** A Signed over row of the Decision card, for a note that is not (or no longer) counted. */
function signedOverRow(s: V2Store, dealId: string, noteId: string): RowNote | null {
  return safe(() => {
    const sig = selectSignature(s, dealId);
    const o = sig ? sig.signedOver.find((r) => r.noteId === noteId) : undefined;
    return o ? { id: o.noteId, flagId: o.flagId, target: o.target, heading: o.text, text: '' } : null;
  }, null);
}

/** The live-region sentence for a row the reviewer is taken to. */
function rowAnnouncement(note: RowNote, position: { index: number; count: number } | null): string {
  const heading = note.heading.replace(/[.\s]+$/, '');
  const lead = position ? `Note ${position.index + 1} of ${position.count} · ${heading}` : heading;
  return note.text.trim() ? `${lead}. ${note.text}` : `${lead}.`;
}

/** The memo element a target lands on: the anchored row or head, else the card. */
function memoElement(target: MemoTarget): HTMLElement | null {
  try {
    const root = document.querySelector('[data-viz]') ?? document;
    if (target.anchorId) {
      const row = root.querySelector(`[data-anchor="${cssEscape(target.anchorId)}"]`);
      if (rendered(row)) return row;
    }
    const card = root.querySelector(`[data-section="${cssEscape(target.section)}"]`);
    return rendered(card) ? card : null;
  } catch {
    return null;
  }
}

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
  | 'cueMemo'
  | 'focusNote'
  | 'focusNoteById'
  | 'focusAmend'
  | 'openStress'
  | 'closeStress'
  | 'setDriver'
  | 'resetStress'
  | 'attachStress'
  | 'setPaletteOpen'
  | 'toggleLedgerGroup'
  | 'setLedgerChip'
>;

export function createUiActions(x: V2Internals): UiActions {
  /** The case file on screen, or null off the file route. */
  const routeFile = (s: V2Store): string | null => (s.route.name === 'file' ? s.route.dealId : null);

  /**
   * Take the reviewer to a flagged row in the memo (the drawer steps aside), and
   * count the flag as opened once that row is on the page, at the same live
   * gate it was asked for (markOpenedIn refuses any mark after the seal).
   */
  const showRow = (s: V2Store, dealId: string, note: RowNote, cursor: number | null, announce: string) => {
    x.setUi((u) => ({ ...u, noteCursor: cursor ?? u.noteCursor, announce }));
    cueMemoIn(x, note.target);
    const flagId = note.flagId;
    if (!flagId || selectLiveDealId(s) !== dealId) return;
    const key = pkgKeyOf(s.agent);
    if (key === null) return;
    onFrames(() => {
      if (!memoElement(note.target)) return false;
      if (pkgKeyOf(x.current().agent) === key) markOpenedIn(x, flagId);
      return true;
    });
  };

  return {
    cancelConfirm: () => {
      x.pendingPlanToggle.current = null;
      x.setUi((u) => (u.confirm === null ? u : { ...u, confirm: null }));
    },

    // the drawer and an open source are mutually exclusive: opening the source closes the drawer
    openSource: () => {
      closeDrawerIn(x);
      x.setUi((u) => (u.sourceOpen ? u : { ...u, sourceOpen: true }));
    },
    closeSource: () => x.setUi((u) => (u.sourceOpen ? { ...u, sourceOpen: false } : u)),
    toggleSource: () => {
      if (!x.uiRef.current.sourceOpen) closeDrawerIn(x);
      x.setUi((u) => ({ ...u, sourceOpen: !u.sourceOpen }));
    },

    cite: (dealId, markIds, startIndex) => {
      if (markIds.length === 0) return;
      const index = Math.min(markIds.length - 1, Math.max(0, Math.round(startIndex)));
      closeDrawerIn(x);
      x.setUi((u) => ({ ...u, sourceOpen: true, cites: { dealId, markIds: [...markIds], index } }));
    },
    citeStep: (delta) =>
      x.setUi((u) => {
        if (!u.cites) return u;
        const index = Math.min(u.cites.markIds.length - 1, Math.max(0, u.cites.index + delta));
        return index === u.cites.index ? u : { ...u, cites: { ...u.cites, index } };
      }),
    clearCites: () => x.setUi((u) => (u.cites ? { ...u, cites: null } : u)),

    // the Decision card at the live gate comes into view like "Go to decision" (verbs and the
    // reviewer line, the primary or the note field focused); every other target is a memo cue
    cueMemo: (target, opts) => {
      const s = x.current();
      if (target.section === 'signature' && onLiveFile(s) && canDecide(s)) {
        bringDecisionIn(x, 'button');
        return;
      }
      cueMemoIn(x, target, { instant: opts?.instant, keepDrawer: opts?.keepDrawer });
    },

    // J / K: the counted flags of the file on screen, top to bottom; each lands on its memo row
    focusNote: (delta) => {
      const s = x.current();
      const dealId = routeFile(s);
      if (!dealId) return;
      const list = rowsToReview(s, dealId);
      if (list.length === 0) return;
      const n = list.length;
      const cur = s.ui.noteCursor;
      const next = cur < 0 || cur >= n ? (delta === 1 ? 0 : n - 1) : (cur + delta + n) % n;
      const note = list[next];
      showRow(s, dealId, note, next, rowAnnouncement(note, { index: next, count: n }));
    },
    // a Signed over "Show row": the counted flag when it is one, else the card's own row
    focusNoteById: (noteId) => {
      const s = x.current();
      const dealId = routeFile(s);
      if (!dealId) return;
      const list = rowsToReview(s, dealId);
      const idx = list.findIndex((n) => n.id === noteId);
      const note = idx >= 0 ? list[idx] : signedOverRow(s, dealId, noteId);
      if (!note) return;
      const position = idx >= 0 ? { index: idx, count: list.length } : null;
      showRow(s, dealId, note, idx >= 0 ? idx : null, rowAnnouncement(note, position));
    },
    focusAmend: (kind) => x.setUi((u) => ({ ...u, amendFocus: { kind, tick: nextTick(u.amendFocus) } })),

    // opening (or re-asking for) the stress test also brings it into view
    openStress: (dealId) => {
      const deal = dealOf(x.current(), dealId);
      if (!deal) return;
      x.setUi((u) => {
        const cur = u.stress[dealId];
        if (cur && cur.open) return u;
        return { ...u, stress: { ...u.stress, [dealId]: { open: true, scenario: cur ? cur.scenario : baselineScenario(deal) } } };
      });
      cueMemoIn(x, { section: 'stress', anchorId: null });
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
