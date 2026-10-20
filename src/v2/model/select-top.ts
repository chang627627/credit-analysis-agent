// ---------------------------------------------------------------------------
// Countersign V2 · top-level selectors: the live file, the top bar, the tab
// title and the clean-approval policy view. Pure over the store snapshot.
// Also the small store lookups every other selector shares (deal by id, run by
// id, a run's audit entries, the latest suspension), so they read one way.
// ---------------------------------------------------------------------------

import type { Deal } from '../../agent/mockData';
import type { ApprovalPackage } from '../../agent/types';
import type { AuditHistoryEntry, RunRecord } from '../../hooks/useCreditAgent';
import type { V2Store } from '../state/contracts';
import { fmtConf, fmtCountdown, fmtSpeed, plural } from './format';
import type { PolicyView, TopBarView } from './types';
import { AUTO_COUNTDOWN_MS, COPY, HOLD_CAPTION, POLICY_MIN_CONFIDENCE, tokenWord } from './vocab';

// ---- shared store lookups ----------------------------------------------------

/** The deal object for an id (sample or uploaded), or undefined. */
export function dealOf(s: V2Store, dealId: string | null): Deal | undefined {
  if (!dealId) return undefined;
  return s.agent.dealsFull.find((d) => d.id === dealId);
}

/** The RunRecord for a run id, or undefined. */
export function runOf(s: V2Store, runId: number | null): RunRecord | undefined {
  if (runId === null) return undefined;
  return s.agent.runs.find((r) => r.runId === runId);
}

/** Every audit entry of one run, oldest first. */
export function entriesOf(s: V2Store, runId: number | null): AuditHistoryEntry[] {
  if (runId === null) return [];
  return s.agent.auditHistory.filter((e) => e.runId === runId);
}

/** The time of the latest "Awaiting human approval" entry (the current suspension), or null. */
export function latestAwaitingAt(entries: AuditHistoryEntry[]): number | null {
  let at: number | null = null;
  for (const e of entries) if (e.label.startsWith('Awaiting human approval')) at = e.t;
  return at;
}

/** The newest RunRecord of a deal, or undefined. */
export function latestRunOfDeal(s: V2Store, dealId: string): RunRecord | undefined {
  let best: RunRecord | undefined;
  for (const r of s.agent.runs) if (r.dealId === dealId && (!best || r.runId > best.runId)) best = r;
  return best;
}

/** `${runId}:${revision}` of the package suspended at the gate, or null (mirrors state/gate). */
export function gatePkgKey(s: V2Store): string | null {
  const a = s.agent;
  return a.status === 'awaiting_approval' && a.approvalPackage ? `${a.runId}:${a.approvalPackage.revision}` : null;
}

/** This run has already been signed (approve, reject or policy). */
export function signedThisRun(s: V2Store): boolean {
  const js = s.gate.justSigned;
  return js !== null && js.runId === s.agent.runId;
}

/** Gate verbs are dead while the block recedes and once this run is signed. */
export function verbsDead(s: V2Store): boolean {
  return s.gate.leaving || signedThisRun(s);
}

// ---- the live file -----------------------------------------------------------

/**
 * The live file (fixes the upload race): idle → null; plan_review → the
 * selected deal (start(dealId) sets it synchronously); otherwise the deal of
 * the current RunRecord, falling back to the selected deal.
 */
export function selectLiveDealId(s: V2Store): string | null {
  const a = s.agent;
  if (a.status === 'idle') return null;
  if (a.status === 'plan_review') return a.selectedDealId;
  return a.runs.find((r) => r.runId === a.runId)?.dealId ?? a.selectedDealId;
}

/** True while a run is live in any pre-decision phase. */
export function isRunLive(s: V2Store): boolean {
  const st = s.agent.status;
  return st === 'plan_review' || st === 'running' || st === 'awaiting_approval';
}

/** The route shows the live file. */
export function onLiveFile(s: V2Store): boolean {
  const live = selectLiveDealId(s);
  return live !== null && s.route.name === 'file' && s.route.dealId === live;
}

/**
 * The agent panel is on screen (THREE-PANE §1.5): the route is a known case file and, in
 * column mode, the owner keeps it open or a transient reveal shows it; in drawer mode the
 * drawer is open. Desk, Book, Ledger and unknown files never show the panel.
 */
export function chatShown(s: V2Store): boolean {
  // owner rule: after the Desk, a case file is always three panes; the agent panel cannot be hidden
  return s.route.name === 'file' && !!dealOf(s, s.route.dealId);
}

export const SPEED_STEPS = [0.5, 1, 2, 4];

export function selectTopBar(s: V2Store): TopBarView {
  const r = s.route.name;
  const active: TopBarView['active'] = r === 'book' ? 'book' : r === 'ledger' ? 'ledger' : r === 'settings' ? 'settings' : 'desk';
  const st = s.agent.status;
  // a badge is a promise that something needs you: only the Desk, only while a file waits on the
  // reviewer (plan review or the countersignature). The Book's monitor items are ambient and live on
  // its own screen, so they carry no count here.
  const waiting = selectLiveDealId(s) !== null && (st === 'plan_review' || st === 'awaiting_approval');
  return {
    tabs: [
      { id: 'desk', label: COPY.tabDesk, attention: waiting ? COPY.fileWaiting : null },
      { id: 'book', label: COPY.tabBook, attention: null },
      { id: 'ledger', label: COPY.tabLedger, attention: null },
    ],
    active,
    policyOn: s.policy === 'auto',
    policyLabel: COPY.policyLabel,
    policyShort: COPY.policyShort,
    speedLabel: fmtSpeed(s.agent.speed),
    speeds: SPEED_STEPS.map((value) => ({ value, label: fmtSpeed(value), checked: value === s.agent.speed })),
    searchKbd: `${s.modKey}K`,
    sectionTitle: active === 'book' ? COPY.tabBook : active === 'ledger' ? COPY.tabLedger : active === 'settings' ? COPY.settings : r === 'file' ? COPY.caseFile : COPY.tabDesk,
  };
}

/** "▍ Drafting 4 of 5 · Countersign" · "● Awaiting your countersignature · Countersign" · "☑ Plan review · Countersign" · "Countersign". */
export function selectTabTitle(s: V2Store): string {
  const a = s.agent;
  if (a.status === 'running') {
    const runnable = a.plan.filter((p) => !p.skipped);
    const current = a.steps.length > 0 ? a.steps[a.steps.length - 1].id : null;
    const at = current ? runnable.findIndex((p) => p.id === current) : -1;
    const n = at >= 0 ? at + 1 : Math.max(1, Math.min(a.steps.length, runnable.length));
    return `▍ Drafting ${n} of ${runnable.length} · ${COPY.brand}`;
  }
  if (a.status === 'awaiting_approval') return `● Awaiting your countersignature · ${COPY.brand}`;
  if (a.status === 'plan_review') return `☑ Plan review · ${COPY.brand}`;
  return COPY.brand;
}

/** The four clean-approval checks against a package (V1's rule, unchanged). */
export function policyChecks(pkg: Pick<ApprovalPackage, 'recommendation' | 'flags' | 'revision' | 'keyMetrics'>): { ok: boolean; text: string }[] {
  const lowest = pkg.keyMetrics.reduce((m, k) => Math.min(m, k.confidence), 1);
  const confOk = pkg.keyMetrics.every((k) => k.confidence >= POLICY_MIN_CONFIDENCE);
  return [
    pkg.recommendation === 'approve'
      ? { ok: true, text: `Recommendation is ${tokenWord('approve')}` }
      : { ok: false, text: `Recommendation is ${tokenWord(pkg.recommendation)}` },
    pkg.flags.length === 0 ? { ok: true, text: 'No flags on record' } : { ok: false, text: `${plural(pkg.flags.length, 'flag')} on record` },
    pkg.revision === 1 ? { ok: true, text: 'First pass' } : { ok: false, text: `Revision ${pkg.revision}` },
    confOk
      ? { ok: true, text: 'Every key figure at 90% confidence or above' }
      : { ok: false, text: `Lowest key-figure confidence ${fmtConf(lowest)}` },
  ];
}

/**
 * The clean-approval policy, as the live gate sees it. `eligible` is V1's rule;
 * `armed` adds the visibility guards exactly as state/gate arms the countdown
 * (the draft belongs to this package, no hold, the live file on screen, the tab
 * visible, not receding, this run not yet signed): no countdown runs where you
 * cannot see it.
 */
export function selectPolicy(s: V2Store): PolicyView {
  const on = s.policy === 'auto';
  const pkg = s.agent.approvalPackage;
  const atGate = s.agent.status === 'awaiting_approval' && pkg !== null;
  if (!on) return { on, eligible: false, armed: false, line: COPY.policyOff, checks: null, countdown: null, holdLabel: null };

  const checks = pkg ? policyChecks(pkg) : null;
  const eligible = atGate && !!checks && checks.every((c) => c.ok);
  const g = s.gate;
  const armed =
    eligible && g.pkgKey === gatePkgKey(s) && !g.held && onLiveFile(s) && s.tabVisible && !g.leaving && !signedThisRun(s);
  const countdown = armed ? fmtCountdown(g.autoDeadline ?? s.now + AUTO_COUNTDOWN_MS, s.now) : null;
  const holdLabel = eligible && g.held && g.holdReason ? HOLD_CAPTION[g.holdReason] : null;

  let line: string;
  if (armed) line = `Auto-countersign in ${countdown} · clean-approval policy`;
  else if (holdLabel) line = holdLabel;
  else if (eligible) line = 'Auto-countersign waits until this file is on screen · clean-approval policy';
  else if (atGate && checks) line = `Policy · not eligible · ${checks.filter((c) => !c.ok).length} of ${checks.length} checks fail`;
  else line = COPY.policyOnIdle;

  return { on, eligible, armed, line, checks: atGate ? checks : null, countdown, holdLabel };
}
