// ---------------------------------------------------------------------------
// The gate (spec §8, §9.2 #2-#4, THREE-PANE.md R2.2, R2.3): the reviewer's
// draft (note, provenance, amended terms), the verbs (sign, return, reject)
// with every V1 integrity guard, and the clean-approval policy countdown with
// its holds. The whole decision is ONE card in the memo pane (the Decision
// card, FileAt 'signature', registered through registerDecision); the agent
// panel holds no decision and only points at the card.
//
// Integrity rules this file exists to keep:
//   - a refusal attempt always holds the countdown first, so a countdown can
//     never fire through a refusal (the composer engages the same way,
//     state/composer.ts);
//   - no countdown completes off screen: it arms only while the live file is
//     the route and the tab is visible, and re-checks every condition at the
//     deadline;
//   - an open Stop or Re-run confirm strip is engagement: the countdown holds
//     under it and never arms, so the policy cannot sign a memo the reviewer is
//     deciding whether to discard; so is unsent text in the live file's composer;
//   - a note counts as opened only at the live gate, before the seal, so a
//     sealed record never changes after the signature;
//   - every verb is dead while the card recedes (leaving) and once this run
//     has been signed;
//   - A is two-phase unless the card's reviewer line is already on screen:
//     the first press only brings the verbs and the line into view and focuses
//     the primary; the next press signs. Activating the primary itself (click,
//     Enter, Space) is the deliberate act and signs at once.
// ---------------------------------------------------------------------------

import { useEffect } from 'react';
import { draftNoteFor } from '../../agent/draftNote';
import type { Deal } from '../../agent/mockData';
import type { NoteProvenance } from '../../agent/types';
import type { CreditAgentApi } from '../../hooks/useCreditAgent';
import { AUTO_COUNTDOWN_MS, AUTO_NOTE, amendmentsFor, selectFile, selectLiveDealId, selectSignature } from '../model';
import type { GateState, HoldReason, Policy, PresentedAtSign, V2Actions, V2Internals, V2Store } from './store';
import { cssMs, sourceIsOverlay } from './ui';
import { closeDrawerIn } from './panes';
import { focusLost, onFrames, onScreen, rendered, revealInBand } from './reveal';

// ---- persistence (v2.autonomy) ----------------------------------------------

const POLICY_KEY = 'v2.autonomy';

export function readPolicy(): Policy {
  try {
    return localStorage.getItem(POLICY_KEY) === 'auto' ? 'auto' : 'gate';
  } catch {
    return 'gate';
  }
}

function writePolicy(p: Policy): void {
  try {
    localStorage.setItem(POLICY_KEY, p);
  } catch {
    /* storage unavailable: the policy still applies for this session */
  }
}

// ---- state ------------------------------------------------------------------

export function initialGate(): GateState {
  return {
    pkgKey: null,
    note: '',
    insertedDraft: null,
    needNote: null,
    levMax: null,
    liqMin: null,
    held: false,
    holdReason: null,
    autoDeadline: null,
    leaving: false,
    opened: [],
    focusTick: 0,
    justSigned: null,
  };
}

/** `${runId}:${revision}` of the package suspended at the gate, or null. */
export function pkgKeyOf(agent: CreditAgentApi): string | null {
  return agent.status === 'awaiting_approval' && agent.approvalPackage
    ? `${agent.runId}:${agent.approvalPackage.revision}`
    : null;
}

/** Note provenance, derived (never stored): who actually wrote the words. */
export function provenanceOf(g: GateState): NoteProvenance | undefined {
  if (!g.note.trim()) return undefined;
  if (g.insertedDraft === null) return 'authored';
  return g.note.trim() === g.insertedDraft.trim() ? 'drafted-verbatim' : 'drafted-edited';
}

function liveDeal(s: V2Store): Deal | undefined {
  const id = selectLiveDealId(s);
  return id ? s.agent.dealsFull.find((d) => d.id === id) : undefined;
}

/** The route is the live file's case file. */
export function onLiveFile(s: V2Store): boolean {
  const live = selectLiveDealId(s);
  return live !== null && s.route.name === 'file' && s.route.dealId === live;
}

function signedThisRun(s: V2Store): boolean {
  const js = s.gate.justSigned;
  return js !== null && js.runId === s.agent.runId;
}

/** Verbs are dead while the block recedes and once this run is signed. */
function verbsDead(s: V2Store): boolean {
  return s.gate.leaving || signedThisRun(s);
}

function atGate(s: V2Store): boolean {
  return s.agent.status === 'awaiting_approval' && s.agent.approvalPackage !== null;
}

/** The reviewer can decide right now: a package at the gate, not receding, not signed. */
export function canDecide(s: V2Store): boolean {
  return atGate(s) && !verbsDead(s);
}

/** V1's clean-approval rule, unchanged. */
export function isEligible(s: V2Store): boolean {
  const pkg = s.agent.approvalPackage;
  return (
    s.policy === 'auto' &&
    s.agent.status === 'awaiting_approval' &&
    !!pkg &&
    pkg.recommendation === 'approve' &&
    pkg.flags.length === 0 &&
    pkg.revision === 1 &&
    pkg.keyMetrics.every((m) => m.confidence >= 0.9)
  );
}

/** Eligible AND visible: not held, the live file on screen, the tab visible, not receding, not signed. */
export function isArmed(s: V2Store): boolean {
  return (
    isEligible(s) &&
    s.gate.pkgKey === pkgKeyOf(s.agent) &&
    !s.gate.held &&
    onLiveFile(s) &&
    s.tabVisible &&
    !s.gate.leaving &&
    !signedThisRun(s)
  );
}

// ---- shared mutations ---------------------------------------------------------

/** Hold the policy countdown until the package changes. */
export function holdAuto(x: V2Internals, reason: HoldReason): void {
  const g = x.gateRef.current;
  const counting = g.autoDeadline !== null;
  if (g.held && g.holdReason === reason && !counting) return;
  x.setGate({ ...g, held: true, holdReason: reason, autoDeadline: null });
  if (counting) x.announce('held');
}

/**
 * Record that the reviewer was shown a flag's note (never blocks). Only the
 * live gate's draft takes a mark: before the package's draft exists, while the
 * block recedes, and once the run is signed (a sealed record) nothing changes.
 */
export function markOpenedIn(x: V2Internals, flagId: string): void {
  const s = x.current();
  if (!atGate(s) || verbsDead(s)) return;
  const g = x.gateRef.current;
  if (g.pkgKey !== pkgKeyOf(s.agent)) return;
  if (g.opened.includes(flagId)) return;
  x.setGate({ ...g, opened: [...g.opened, flagId] });
}

/** What the reviewer saw at the moment of signing (sealed with the snapshot). */
export function presentedFor(s: V2Store, dealId: string): PresentedAtSign {
  const empty: PresentedAtSign = {
    attestation: null,
    primaryLabel: null,
    signedOver: [],
    notesOpened: { opened: 0, total: 0 },
    keyFigures: [],
  };
  try {
    const sig = selectSignature(s, dealId);
    const file = selectFile(s, dealId);
    const rec = file ? file.sections.find((sec) => sec.kind === 'recommendation') : undefined;
    const keyFigures =
      rec && rec.kind === 'recommendation' && rec.body
        ? rec.body.keyFigures.map((k) => ({ label: k.label, value: k.value }))
        : [];
    if (!sig) return { ...empty, keyFigures };
    return {
      attestation: sig.attestation,
      primaryLabel: sig.verbs ? sig.verbs.primary : null,
      signedOver: sig.signedOver.map((o) => o.text),
      notesOpened: { opened: sig.signedOver.filter((o) => o.opened).length, total: sig.signedOver.length },
      keyFigures,
    };
  } catch {
    return empty;
  }
}

/** The policy signs: /auto/, never ink. Only called after every arming condition re-checked. */
function signAuto(x: V2Internals, s: V2Store): void {
  const live = selectLiveDealId(s);
  if (!live) return;
  const presented = presentedFor(s, live);
  x.setGate((g) => ({
    ...g,
    autoDeadline: null,
    justSigned: { runId: s.agent.runId, verb: 'approve', auto: true, at: Date.now(), presented },
  }));
  s.agent.approve(AUTO_NOTE, { auto: true });
}

/** The filed covenant threshold for an amendable term, parsed from the deal. */
function filedThreshold(deal: Deal, kind: 'leverage' | 'liquidity'): number | null {
  const cov = deal.covenants.find((c) => (kind === 'leverage' ? /leverage/i.test(c.name) : /liquid/i.test(c.name)));
  const m = cov ? cov.threshold.match(/\d*\.?\d+/) : null;
  return m ? parseFloat(m[0]) : null;
}

// ---- the memo Decision card: find, reveal, focus ---------------------------

/** A focus hand-off asked for before its target mounted is honoured only if the target mounts this promptly. */
const FOCUS_WINDOW_MS = 3000;
/** Frames the post-signature reveal waits for the sealed card to render (the engine seals within a task). */
const SEAL_FRAMES = 20;

/** The registered card root, when it is on the page. */
function cardOf(x: V2Internals): HTMLElement | null {
  const card = x.decisionRef.current;
  return card && card.isConnected ? card : null;
}

/** The card's primary verb button ([data-sign-primary]). */
function primaryOf(card: HTMLElement | null): HTMLElement | null {
  if (!card) return null;
  const el = card.querySelector('[data-sign-primary] button');
  return rendered(el) ? el : null;
}

/**
 * The card's reviewer signature line: the kit SignatureLine root
 * ([data-pattern="P-01"][data-role="reviewer"]), else the [data-record-focus]
 * wrapper around the lines. Null when neither is rendered.
 */
function reviewerLineOf(card: HTMLElement | null): HTMLElement | null {
  if (!card) return null;
  const line = card.querySelector('[data-pattern="P-01"][data-role="reviewer"]');
  if (rendered(line)) return line;
  const record = card.querySelector('[data-record-focus]');
  return rendered(record) ? record : null;
}

/** The registered reviewer note field, when it is on the page. */
function noteFieldOf(x: V2Internals): HTMLTextAreaElement | null {
  const f = x.noteFieldRef.current;
  return f && f.isConnected && f.getClientRects().length > 0 ? f : null;
}

/** Smooth unless the reader asked for reduced motion. */
function behaviorOf(x: V2Internals): ScrollBehavior {
  return x.current().reducedMotion ? 'auto' : 'smooth';
}

/** The decision is in the memo: the drawer (over the memo's left edge) and an overlaid source (its right edge) step aside. */
function clearMemoCovers(x: V2Internals): void {
  closeDrawerIn(x, { returnFocus: false });
  if (x.uiRef.current.sourceOpen && sourceIsOverlay()) x.setUi((u) => (u.sourceOpen ? { ...u, sourceOpen: false } : u));
}

/**
 * Bring the card's verbs and reviewer line into view (centred, one scroll) and
 * focus a control: the note field when `noteFirst` and a note is required (an
 * S or R that found it empty), else the primary verb. Returns false when the
 * card has nothing to focus yet (not at the gate, or not laid out).
 */
function presentDecision(x: V2Internals, card: HTMLElement, noteFirst: boolean, behavior: ScrollBehavior): boolean {
  const field = noteFieldOf(x);
  if (noteFirst && field && x.gateRef.current.needNote !== null) {
    revealInBand([field], 'center', behavior);
    field.focus({ preventScroll: true });
    return true;
  }
  const primary = primaryOf(card);
  const line = reviewerLineOf(card);
  if (!primary && !line) return false;
  revealInBand([primary, line], 'center', behavior);
  if (primary) primary.focus({ preventScroll: true });
  return true;
}

/** Present the card on the next frames (after the commit that closed a drawer or mounted the card). */
function presentDecisionSoon(x: V2Internals, noteFirst: boolean, behavior: ScrollBehavior): void {
  onFrames(() => {
    const card = cardOf(x);
    return card !== null && presentDecision(x, card, noteFirst, behavior);
  });
}

/**
 * After a signature or a rejection, once the sealed card has rendered, bring
 * the reviewer line into view (instant, the least distance) so the ink or the
 * REJECTED stamp lands where the reviewer is looking. The verbs are gone, so
 * focus that fell to the body goes to the card's record ([data-record-focus],
 * tabIndex -1) without scrolling; focus held anywhere else is left alone.
 */
function revealSealSoon(x: V2Internals, runId: number): void {
  onFrames(() => {
    const c = x.current();
    if (c.agent.runId !== runId) return true;
    if (c.agent.status !== 'approved' && c.agent.status !== 'rejected') return false;
    const card = cardOf(x);
    revealInBand([reviewerLineOf(card)], 'nearest', 'auto');
    const record = card ? card.querySelector('[data-record-focus]') : null;
    if (focusLost() && rendered(record) && record.hasAttribute('tabindex')) record.focus({ preventScroll: true });
    return true;
  }, SEAL_FRAMES);
}

/**
 * After a return for revision the verbs and the note field unmount (the card waits for the next
 * revision), so focus that fell to the body goes to the card's pending line ([data-record-focus],
 * tabIndex -1) once the card reads pending, without scrolling: the panel never takes focus (R2).
 * Focus held anywhere else is left alone.
 */
function focusPendingSoon(x: V2Internals, runId: number): void {
  onFrames(() => {
    if (x.current().agent.runId !== runId) return true;
    const card = cardOf(x);
    if (!card || card.getAttribute('data-state') !== 'pending') return false;
    const line = card.querySelector('[data-record-focus]');
    if (focusLost() && rendered(line) && line.hasAttribute('tabindex')) line.focus({ preventScroll: true });
    return true;
  }, SEAL_FRAMES);
}

/** Focus the reviewer note field, bringing it into view first (it sits mid-card). */
function focusNoteSoon(x: V2Internals, field: HTMLTextAreaElement): void {
  onFrames(() => {
    if (!field.isConnected || field.getClientRects().length === 0) return false;
    revealInBand([field], 'center', behaviorOf(x));
    field.focus({ preventScroll: true });
    return true;
  });
}

/** Unsent text in the live file's composer is engagement (state/composer.ts): a countdown holds instead of arming. */
export function composerEngaged(s: V2Store): boolean {
  const live = selectLiveDealId(s);
  return live !== null && (s.ui.composerDraft[live] ?? '').trim() !== '';
}

/**
 * S or R with an empty note: say a reason is needed and put the reviewer in
 * the note. A mounted field is focused through focusTick (the card's own
 * handler) and directly; an unmounted one is focused by registerNoteField when
 * it mounts within the window.
 */
function askForNote(x: V2Internals, kind: 'reject' | 'rework'): void {
  const g = x.gateRef.current;
  const field = noteFieldOf(x);
  if (field) {
    x.pendingNoteFocus.current = 0;
    x.setGate({ ...g, needNote: kind, focusTick: g.focusTick + 1 });
    focusNoteSoon(x, field);
    return;
  }
  x.pendingNoteFocus.current = Date.now();
  x.setGate({ ...g, needNote: kind });
}

/** Keep a registered element unless a stale one is being released (React may release after the next registers). */
function register<T extends HTMLElement>(box: { current: T | null }, el: T | null): void {
  if (el) {
    box.current = el;
    return;
  }
  const cur = box.current;
  if (!cur || !cur.isConnected) box.current = null;
}

/**
 * Phase one (THREE-PANE.md R2.3): nothing is signed. Off the live file, go
 * there (the card focuses its primary when it mounts, through
 * pendingSignFocus); on it, clear what covers the memo, bring the verbs and the
 * reviewer line into view and focus the primary (or, for "Go to decision" after
 * an S or R that needs a note, the note field).
 */
export function bringDecisionIn(x: V2Internals, source: 'key' | 'button'): void {
  const s = x.current();
  if (!atGate(s) || verbsDead(s)) return;
  const live = selectLiveDealId(s);
  if (!live) return;
  if (!onLiveFile(s)) {
    x.pendingSignFocus.current = Date.now();
    x.navigate({ name: 'file', dealId: live, at: 'signature' });
    if (source === 'key') x.announce('sign-ready');
    return;
  }
  clearMemoCovers(x);
  if (cardOf(x)) {
    x.pendingSignFocus.current = 0;
    presentDecisionSoon(x, source === 'button', behaviorOf(x));
  } else {
    x.pendingSignFocus.current = Date.now(); // registerDecision presents it within the window
  }
  if (source === 'key') x.announce('sign-ready');
}

// ---- actions ------------------------------------------------------------------

export type GateActions = Pick<
  V2Actions,
  | 'setPolicy'
  | 'setNote'
  | 'insertDraft'
  | 'setThreshold'
  | 'revertAmendments'
  | 'requestSign'
  | 'tryReject'
  | 'tryRework'
  | 'reviewManually'
  | 'registerDecision'
  | 'registerNoteField'
>;

export function createGateActions(x: V2Internals): GateActions {
  return {
    setPolicy: (p) => {
      if (x.policyRef.current === p) return;
      // switching off while a countdown runs is a hold with its own reason
      if (p === 'gate' && x.gateRef.current.autoDeadline !== null) holdAuto(x, 'policy-off');
      x.setPolicy(p);
      writePolicy(p);
    },

    setNote: (text) => {
      if (atGate(x.current())) holdAuto(x, 'engaged');
      const g = x.gateRef.current;
      const cleared = text.trim() === '';
      x.setGate({
        ...g,
        note: text,
        needNote: cleared ? g.needNote : null,
        insertedDraft: cleared ? null : g.insertedDraft,
      });
    },

    // the draft is inserted only on an explicit click; its provenance rides on
    insertDraft: () => {
      const s = x.current();
      const pkg = s.agent.approvalPackage;
      if (!atGate(s) || !pkg || verbsDead(s)) return;
      holdAuto(x, 'engaged');
      const draft = draftNoteFor(pkg);
      x.setGate({ ...x.gateRef.current, note: draft, insertedDraft: draft, needNote: null });
    },

    setThreshold: (kind, v) => {
      const s = x.current();
      if (!atGate(s) || verbsDead(s)) return;
      holdAuto(x, 'engaged');
      const deal = liveDeal(s);
      let value = v === null || !Number.isFinite(v) ? null : v;
      const filed = deal ? filedThreshold(deal, kind) : null;
      if (value !== null && filed !== null && Math.abs(value - filed) < 1e-9) value = null;
      const g = x.gateRef.current;
      x.setGate(kind === 'leverage' ? { ...g, levMax: value } : { ...g, liqMin: value });
    },

    revertAmendments: () => {
      const g = x.gateRef.current;
      if (g.levMax === null && g.liqMin === null) return;
      x.setGate({ ...g, levMax: null, liqMin: null });
    },

    // THREE-PANE.md R2.3. 'card' (the primary itself) signs at once; 'key' (A) signs only while
    // the card's reviewer line is on screen on the live file; 'button' (Go to decision, the
    // panel's Decision link, the composer's refusal link) never signs. Otherwise phase one.
    requestSign: (source) => {
      const s = x.current();
      if (!atGate(s) || verbsDead(s)) return;
      const live = selectLiveDealId(s);
      if (!live) return;
      const here = onLiveFile(s);
      const card = here ? cardOf(x) : null;
      const line = reviewerLineOf(card) ?? primaryOf(card);
      // the primary signs only on the live file's own card; A only while the line is on screen
      const sign = here && (source === 'card' || (source === 'key' && line !== null && onScreen(line)));
      if (!sign) {
        bringDecisionIn(x, source === 'key' ? 'key' : 'button');
        return;
      }
      const g = s.gate;
      const deal = liveDeal(s);
      const amendments = deal ? amendmentsFor(deal, g.levMax, g.liqMin) : [];
      const provenance = provenanceOf(g);
      const presented = presentedFor(s, live);
      // manual signing always wins over a countdown
      x.pendingSignFocus.current = 0;
      x.setGate({
        ...x.gateRef.current,
        autoDeadline: null,
        justSigned: { runId: s.agent.runId, verb: 'approve', auto: false, at: Date.now(), presented },
      });
      s.agent.approve(g.note.trim() ? g.note : undefined, { amendments, provenance });
      // the ink draws in view: nothing covers the memo (the drawer, an overlaid source), and the
      // line is brought in once sealed
      clearMemoCovers(x);
      revealSealSoon(x, s.agent.runId);
    },

    tryReject: () => {
      const s = x.current();
      if (!atGate(s) || verbsDead(s)) return;
      holdAuto(x, 'engaged');
      if (onLiveFile(s)) clearMemoCovers(x);
      const g = x.gateRef.current;
      if (!g.note.trim()) {
        askForNote(x, 'reject');
        return;
      }
      const live = selectLiveDealId(s);
      const presented = presentedFor(s, live ?? '');
      x.pendingNoteFocus.current = 0;
      x.setGate({
        ...g,
        needNote: null,
        justSigned: { runId: s.agent.runId, verb: 'reject', auto: false, at: Date.now(), presented },
      });
      s.agent.reject(g.note, provenanceOf(g));
      revealSealSoon(x, s.agent.runId);
    },

    tryRework: () => {
      const s = x.current();
      if (!atGate(s) || verbsDead(s)) return;
      holdAuto(x, 'engaged');
      if (onLiveFile(s)) clearMemoCovers(x);
      const g = x.gateRef.current;
      if (!g.note.trim()) {
        askForNote(x, 'rework');
        return;
      }
      const note = g.note;
      const provenance = provenanceOf(g);
      x.pendingNoteFocus.current = 0;
      x.setGate({ ...g, needNote: null, leaving: true });
      const runId = s.agent.runId;
      const resume = () => {
        x.current().agent.requestRework(note, provenance);
        x.setGate((cur) => (cur.leaving ? { ...cur, leaving: false } : cur));
        x.announce('returned');
        focusPendingSoon(x, runId);
      };
      // wait out the recede (the --dur-2 token; 0 under reduced motion)
      const ms = cssMs('--dur-2');
      if (ms <= 0) resume();
      else window.setTimeout(resume, ms);
    },

    reviewManually: () => holdAuto(x, 'manual'),

    // the memo Decision card registers its root; a phase-one press made before it mounted
    // (Go to decision from another route, A off the file) presents it now: the verbs and the
    // reviewer line come into view and the primary takes focus
    registerDecision: (el) => {
      register(x.decisionRef, el);
      const since = x.pendingSignFocus.current;
      if (!el || since <= 0) return;
      x.pendingSignFocus.current = 0;
      if (Date.now() - since > FOCUS_WINDOW_MS) return;
      // instant: the file's own scroll to the card ([at]) may still be animating
      presentDecisionSoon(x, false, 'auto');
    },

    // the card's note field registers itself; an S or R made before it mounted focuses it now
    registerNoteField: (el) => {
      register(x.noteFieldRef, el);
      const since = x.pendingNoteFocus.current;
      if (!el || since <= 0) return;
      x.pendingNoteFocus.current = 0;
      if (Date.now() - since > FOCUS_WINDOW_MS) return;
      focusNoteSoon(x, el);
    },

  };
}

// ---- effects ------------------------------------------------------------------

export function useGateEffects(s: V2Store, x: V2Internals): void {
  // a new package at the gate gets a fresh draft (and a fresh, unheld policy)
  const key = pkgKeyOf(s.agent);
  useEffect(() => {
    if (key === null || x.gateRef.current.pkgKey === key) return;
    x.setGate((g) => ({ ...initialGate(), pkgKey: key, justSigned: g.justSigned }));
    x.announce('gate');
  }, [key, x]);

  // arm while eligible and visible; when that stops, say why (a hold) or just stop.
  // An open confirm strip (Stop, or a start that would replace this run) is
  // engagement: it holds instead of arming. This covers a gate reached under a
  // strip opened while drafting, and a palette Stop or Re-run that navigates to
  // the file and opens its strip in the same tick. Unsent text in the live
  // file's composer is engagement too (typed before the gate was reached).
  const armed = isArmed(s);
  const confirmOpen = s.ui.confirm !== null;
  const drafting = composerEngaged(s);
  useEffect(() => {
    const g = x.gateRef.current;
    if (armed) {
      if (x.uiRef.current.confirm !== null || composerEngaged(x.current())) {
        holdAuto(x, 'engaged');
        return;
      }
      if (g.autoDeadline === null && !g.held) x.setGate({ ...g, autoDeadline: Date.now() + AUTO_COUNTDOWN_MS });
      return;
    }
    if (g.autoDeadline === null) return;
    const c = x.current();
    if (c.policy !== 'auto') holdAuto(x, 'policy-off');
    else if (c.agent.status !== 'awaiting_approval' || g.pkgKey !== pkgKeyOf(c.agent)) x.setGate({ ...g, autoDeadline: null });
    else if (!onLiveFile(c)) holdAuto(x, 'left');
    else if (!c.tabVisible) holdAuto(x, 'hidden');
    else x.setGate({ ...g, autoDeadline: null });
  }, [armed, confirmOpen, drafting, s.gate.autoDeadline, s.gate.held, x]);

  // at the deadline, re-check EVERY arming condition before the policy signs
  const deadline = s.gate.autoDeadline;
  useEffect(() => {
    if (deadline === null) return;
    const id = window.setTimeout(() => {
      const c = x.current();
      if (c.gate.autoDeadline !== deadline) return;
      if (!isArmed(c)) return;
      if (c.ui.confirm !== null || composerEngaged(c)) {
        holdAuto(x, 'engaged');
        return;
      }
      signAuto(x, c);
    }, Math.max(0, deadline - Date.now()));
    return () => window.clearTimeout(id);
  }, [deadline, x]);
}
