// ---------------------------------------------------------------------------
// The gate (spec §8, §9.2 #2-#4): the reviewer's draft (note, provenance,
// amended terms), the verbs (sign, return, reject) with every V1 integrity
// guard, and the clean-approval policy countdown with its holds.
//
// Integrity rules this file exists to keep:
//   - a refusal attempt always holds the countdown first, so a countdown can
//     never fire through a refusal;
//   - no countdown completes off screen: it arms only while the live file is
//     the route and the tab is visible, and re-checks every condition at the
//     deadline;
//   - every verb is dead while the block recedes (leaving) and once this run
//     has been signed;
//   - signing is two-phase: the first press only brings the line into view.
// ---------------------------------------------------------------------------

import { useEffect } from 'react';
import { draftNoteFor } from '../../agent/draftNote';
import type { Deal } from '../../agent/mockData';
import type { NoteProvenance } from '../../agent/types';
import type { CreditAgentApi } from '../../hooks/useCreditAgent';
import { AUTO_COUNTDOWN_MS, AUTO_NOTE, amendmentsFor, selectFile, selectLiveDealId, selectSignature } from '../model';
import type { GateState, HoldReason, Policy, PresentedAtSign, V2Actions, V2Internals, V2Store } from './store';
import { cssMs } from './ui';

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

/** Record that the reviewer explicitly opened a flag's note (never blocks). */
export function markOpenedIn(x: V2Internals, flagId: string): void {
  const g = x.gateRef.current;
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

// ---- actions ------------------------------------------------------------------

/** A phase-one navigation hands focus to the line only if it mounts promptly. */
const LINE_FOCUS_WINDOW_MS = 3000;

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
  | 'registerSignatureLine'
  | 'markOpened'
>;

export function createGateActions(x: V2Internals): GateActions {
  const focusLine = (el: HTMLElement, reducedMotion: boolean) => {
    el.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
    el.focus({ preventScroll: true });
  };

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

    // two-phase: phase one only brings the line into view; phase two signs the LIVE draft
    requestSign: (source) => {
      const s = x.current();
      if (!atGate(s) || verbsDead(s)) return;
      const live = selectLiveDealId(s);
      if (!live) return;
      const here = onLiveFile(s);
      const el = x.lineRef.current;
      let visible = false;
      if (here && el && el.isConnected) {
        const rect = el.getBoundingClientRect();
        const bar = document.querySelector('[data-docbar]');
        const barBottom = bar ? bar.getBoundingClientRect().bottom : 0;
        visible = rect.height > 0 && rect.top >= barBottom && rect.bottom <= window.innerHeight;
      }
      if (!visible || source === 'button') {
        if (here && el && el.isConnected) {
          focusLine(el, s.reducedMotion);
        } else {
          x.pendingLineFocus.current = Date.now();
          x.navigate({ name: 'file', dealId: live, at: 'signature' });
        }
        return;
      }
      const g = s.gate;
      const deal = liveDeal(s);
      const amendments = deal ? amendmentsFor(deal, g.levMax, g.liqMin) : [];
      const provenance = provenanceOf(g);
      const presented = presentedFor(s, live);
      // manual signing always wins over a countdown
      x.setGate({
        ...x.gateRef.current,
        autoDeadline: null,
        justSigned: { runId: s.agent.runId, verb: 'approve', auto: false, at: Date.now(), presented },
      });
      s.agent.approve(g.note.trim() ? g.note : undefined, { amendments, provenance });
    },

    tryReject: () => {
      const s = x.current();
      if (!atGate(s) || verbsDead(s)) return;
      holdAuto(x, 'engaged');
      const g = x.gateRef.current;
      if (!g.note.trim()) {
        x.setGate({ ...g, needNote: 'reject', focusTick: g.focusTick + 1 });
        return;
      }
      const live = selectLiveDealId(s);
      const presented = presentedFor(s, live ?? '');
      x.setGate({
        ...g,
        needNote: null,
        justSigned: { runId: s.agent.runId, verb: 'reject', auto: false, at: Date.now(), presented },
      });
      s.agent.reject(g.note, provenanceOf(g));
    },

    tryRework: () => {
      const s = x.current();
      if (!atGate(s) || verbsDead(s)) return;
      holdAuto(x, 'engaged');
      const g = x.gateRef.current;
      if (!g.note.trim()) {
        x.setGate({ ...g, needNote: 'rework', focusTick: g.focusTick + 1 });
        return;
      }
      const note = g.note;
      const provenance = provenanceOf(g);
      x.setGate({ ...g, needNote: null, leaving: true });
      const resume = () => {
        x.current().agent.requestRework(note, provenance);
        x.setGate((cur) => (cur.leaving ? { ...cur, leaving: false } : cur));
        x.announce('returned');
      };
      // wait out the recede (the --dur-2 token; 0 under reduced motion)
      const ms = cssMs('--dur-2');
      if (ms <= 0) resume();
      else window.setTimeout(resume, ms);
    },

    reviewManually: () => holdAuto(x, 'manual'),

    registerSignatureLine: (el) => {
      x.lineRef.current = el;
      const since = x.pendingLineFocus.current;
      if (el && since > 0) {
        x.pendingLineFocus.current = 0;
        if (Date.now() - since > LINE_FOCUS_WINDOW_MS) return;
        const reduced = x.current().reducedMotion;
        window.requestAnimationFrame(() => {
          if (el.isConnected) focusLine(el, reduced);
        });
      }
    },

    markOpened: (flagId) => markOpenedIn(x, flagId),
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

  // arm while eligible and visible; when that stops, say why (a hold) or just stop
  const armed = isArmed(s);
  useEffect(() => {
    const g = x.gateRef.current;
    if (armed) {
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
  }, [armed, s.gate.autoDeadline, s.gate.held, x]);

  // at the deadline, re-check EVERY arming condition before the policy signs
  const deadline = s.gate.autoDeadline;
  useEffect(() => {
    if (deadline === null) return;
    const id = window.setTimeout(() => {
      const c = x.current();
      if (c.gate.autoDeadline !== deadline) return;
      if (!isArmed(c)) return;
      signAuto(x, c);
    }, Math.max(0, deadline - Date.now()));
    return () => window.clearTimeout(id);
  }, [deadline, x]);
}
