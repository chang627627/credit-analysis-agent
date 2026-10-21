// ---------------------------------------------------------------------------
// Files: run control (start with confirm, stop with confirm, upload), the
// sealed-file snapshots (spec §9.2 #6), countersigned-ESCALATE routing
// (§9.2 #5) and the JSON download helper used by both exports.
//
// The live file is always resolved from the current RunRecord through the
// model's selectLiveDealId; nothing here reads selectedDealId to decide
// liveness, and V2 never switches the engine's deal to browse.
//
// Each start sets that file's thread epoch (THREE-PANE.md §4.4): a re-run
// opens a fresh thread, and a start that replaces a live run on another file
// resets that file's epoch too, so no Q&A is left orphaned under "Last run
// cancelled". A confirmed stop does the same for the stopped file.
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';
import type { Deal } from '../../agent/mockData';
import { getPlan } from '../../agent/runAgent';
import type { Amendment, ApprovalPackage } from '../../agent/types';
import type { RunDecision, RunStatus } from '../../hooks/useCreditAgent';
import type { MonitorApi } from '../../hooks/useMonitor';
import { buildFileExport, buildSessionExport, COPY, deskStageOf, routesOnSign, selectLiveDealId } from '../model';
import type { CaseFileSnapshot, V2Actions, V2Internals, V2Store } from './store';
import { holdAuto } from './gate';
import { withToggle } from './plan';
import { cssEscape, focusLost, onFrames, rendered } from './reveal';

/** A run is live (and starting another would discard it). */
export function isLiveStatus(status: RunStatus): boolean {
  return status === 'plan_review' || status === 'running' || status === 'awaiting_approval';
}

// ---- download ---------------------------------------------------------------

/** Save a JSON payload through a programmatic anchor click (the browser download is the receipt). */
export function download(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ---- routing of a countersigned ESCALATE --------------------------------------

/**
 * A countersigned ESCALATE routes to the senior-review queue, unless the
 * recorded amendments resolve it: the amended terms, re-tested by the same
 * decide rule, return APPROVE. Overrides are read from the RECORD (the
 * amendments on run_finished), never from gate state after the seal. A policy
 * signature never routes (it only ever signs a clean APPROVE).
 *
 * The rule itself lives in the model (`routesOnSign`), which every consequence
 * line reads (decision panel caption, attestation, seal, Ledger); routing
 * delegates to it so what the reviewer is told and what happens cannot diverge.
 */
export function shouldRoute(pkg: ApprovalPackage, deal: Deal, amendments: Amendment[] | null, auto: boolean): boolean {
  return routesOnSign(pkg, deal, amendments, auto);
}

/** Raise the routed memo into the monitor queue (the hook dedupes by key forever). */
export function routeEscalation(monitor: MonitorApi, deal: Deal, pkg: ApprovalPackage, runId: number): void {
  monitor.raise({
    key: `${deal.id}:countersign-escalate:run${runId}`,
    dealId: deal.id,
    dealName: deal.name,
    severity: 'warning',
    reason: `Memo ${pkg.memoId} countersigned as ESCALATE · routed for senior credit review`,
    origin: 'countersign',
  });
}

// ---- snapshots ----------------------------------------------------------------

/** Seal the decided live run (call only when status is approved or rejected). */
export function buildSnapshot(s: V2Store): CaseFileSnapshot | null {
  const a = s.agent;
  if (a.status !== 'approved' && a.status !== 'rejected') return null;
  const pkg = a.approvalPackage;
  const run = a.runs.find((r) => r.runId === a.runId);
  if (!pkg || !run) return null;
  const deal = a.dealsFull.find((d) => d.id === run.dealId);
  if (!deal) return null;
  const outcome: 'approve' | 'reject' = a.status === 'approved' ? 'approve' : 'reject';
  const amendments = a.decisionAmendments && a.decisionAmendments.length > 0 ? a.decisionAmendments : null;
  const decision: RunDecision =
    run.decision ??
    (a.decisionAuto
      ? 'auto-countersigned'
      : outcome === 'approve'
        ? amendments
          ? 'countersigned-amended'
          : 'countersigned'
        : 'rejected');
  let awaitingAt: number | null = null;
  for (const e of a.auditHistory) {
    if (e.runId === a.runId && e.label.startsWith('Awaiting human approval')) awaitingAt = e.t;
  }
  const js = s.gate.justSigned;
  return {
    dealId: deal.id,
    runId: a.runId,
    deal,
    plan: a.plan,
    steps: a.steps,
    pkg,
    outcome,
    decision,
    note: a.decisionNote,
    noteProvenance: a.decisionNoteProvenance,
    amendments,
    auto: a.decisionAuto,
    startedAt: run.startedAt,
    awaitingAt,
    decidedAt: a.decidedAt ?? run.decidedAt ?? Date.now(),
    routed: outcome === 'approve' && shouldRoute(pkg, deal, amendments, a.decisionAuto),
    presented: js && js.runId === a.runId ? js.presented : null,
  };
}

interface SnapshotState {
  byDeal: Record<string, CaseFileSnapshot>;
  list: CaseFileSnapshot[];
}

/** Sealed runs for the session: the latest per dealId, and every one for export. Captured once per runId. */
export function useSnapshots(): {
  snapshots: Record<string, CaseFileSnapshot>;
  snapshotList: CaseFileSnapshot[];
  capture: (snap: CaseFileSnapshot) => void;
} {
  const [state, setState] = useState<SnapshotState>({ byDeal: {}, list: [] });
  const capture = useCallback((snap: CaseFileSnapshot) => {
    setState((cur) =>
      cur.list.some((x) => x.runId === snap.runId)
        ? cur
        : { byDeal: { ...cur.byDeal, [snap.dealId]: snap }, list: [...cur.list, snap] },
    );
  }, []);
  return { snapshots: state.byDeal, snapshotList: state.list, capture };
}

// ---- Desk removal focus (R4.7) ---------------------------------------------------

const q = (selector: string): HTMLElement | null => {
  try {
    const el = document.querySelector(selector);
    return el instanceof HTMLElement ? el : null;
  } catch {
    return null;
  }
};
/** A Desk row's remove button (Desk.tsx wraps it in [data-remove="<dealId>"]). */
const removeButtonOf = (dealId: string) => q(`[data-remove="${cssEscape(dealId)}"] button`);
/** A removed file's undo line ([data-removed="<dealId>"]) and its Undo link. */
const undoLineOf = (dealId: string) => q(`[data-removed="${cssEscape(dealId)}"]`);
const undoLinkOf = (dealId: string) => q(`[data-removed="${cssEscape(dealId)}"] button`);
/** The Desk summary's Restore link and the empty Desk's restore button ([data-desk-restore]). */
const restoreControls = () => q('[data-desk-restore]');

/**
 * Once `gone` reports the control that was pressed has unmounted, put focus that fell to the body
 * on `target` (a reviewer who moved focus elsewhere keeps it). Retries a few frames while the old
 * control unmounts and the target mounts; off the Desk (Settings) nothing moves.
 */
function landFocus(gone: () => boolean, target: () => HTMLElement | null): void {
  onFrames(() => {
    if (!gone()) return false;
    if (!focusLost()) return true;
    const el = target();
    if (!rendered(el)) return false;
    el.focus();
    return true;
  }, 6);
}

// ---- actions ------------------------------------------------------------------

export type FileActions = Pick<
  V2Actions,
  'startFile' | 'draftFile' | 'togglePreviewStep' | 'removeFile' | 'undoRemove' | 'restoreRemoved' | 'confirmStart' | 'requestStop' | 'confirmStop' | 'upload' | 'exportFile' | 'exportSession'
>;

export function createFileActions(x: V2Internals): FileActions {
  /**
   * Asking to discard the live run (Stop, or a start that would replace it) is
   * engagement: a running clean-approval countdown, or a running plan
   * auto-start countdown, holds before the confirm strip opens, so neither can
   * fire while the reviewer is deciding whether to throw the run away. A
   * countdown that never armed (reached off screen) is held by the gate and
   * plan effects instead, which refuse to arm under an open strip.
   */
  const holdRunningCountdown = () => {
    if (x.gateRef.current.autoDeadline !== null) holdAuto(x, 'engaged');
    if (x.planRef.current.deadline !== null) {
      x.setPlan((p) => ({ ...p, held: true, holdReason: 'manual', deadline: null }));
    }
  };

  /** Hide every thread entry of these files written before now (a fresh thread). */
  const resetEpochs = (dealIds: string[]) => {
    if (dealIds.length === 0) return;
    const now = Date.now();
    x.setUi((u) => {
      const threadEpoch = { ...u.threadEpoch };
      for (const id of dealIds) threadEpoch[id] = now;
      return { ...u, threadEpoch };
    });
  };

  const doStart = (dealId: string) => {
    const s = x.current();
    if (s.agent.parsing) return;
    if (!s.agent.dealsFull.some((d) => d.id === dealId)) return;
    const prevStatus = s.agent.status;
    const replaced = isLiveStatus(prevStatus) ? selectLiveDealId(s) : null;
    // a new run never inherits a strip written about the previous one (effects.ts also
    // closes any strip once a run stops being live; this covers a start in the same tick)
    x.setUi((u) => (u.confirm === null ? u : { ...u, confirm: null }));
    s.agent.start(dealId);
    resetEpochs(replaced && replaced !== dealId ? [dealId, replaced] : [dealId]);
    // a fresh plan review even when one was already open (plan_review to plan_review). A
    // compound start's toggle is applied here, held; when the status will change, the
    // plan-review entry effect (state/plan.ts) applies it again and clears it.
    const plan = getPlan();
    const ids = plan.map((p) => p.id);
    const pending = x.pendingPlanToggle.current;
    if (pending && pending.dealId === dealId) {
      x.setPlan({ enabledIds: withToggle(plan, ids, pending), held: true, holdReason: 'manual', deadline: null });
      if (prevStatus === 'plan_review') x.pendingPlanToggle.current = null;
    } else {
      x.pendingPlanToggle.current = null;
      x.setPlan({ enabledIds: ids, held: false, holdReason: null, deadline: null });
    }
    x.navigate({ name: 'file', dealId, at: null });
  };

  return {
    // no start of any kind while extraction runs; never discard a live run silently.
    // The latest start request defines the plan toggle (none for a plain start).
    startFile: (dealId, opts) => {
      const s = x.current();
      if (s.agent.parsing) return;
      if (!s.agent.dealsFull.some((d) => d.id === dealId)) return;
      const toggle = opts && opts.toggle ? opts.toggle : null;
      x.pendingPlanToggle.current = toggle ? { dealId, stepId: toggle.stepId, include: toggle.include } : null;
      if (isLiveStatus(s.agent.status)) {
        holdRunningCountdown();
        x.setUi((u) => ({ ...u, confirm: { kind: 'start', dealId } }));
        return;
      }
      doStart(dealId);
    },
    // a not-started file shows its plan at once; unticking an optional step there is remembered here
    togglePreviewStep: (dealId, stepId) => {
      const step = getPlan().find((p) => p.id === stepId);
      if (!step || !step.optional) return; // required steps are locked
      x.setUi((u) => {
        const cur = u.planPreview[dealId] ?? [];
        const next = cur.includes(stepId) ? cur.filter((id) => id !== stepId) : [...cur, stepId];
        return { ...u, planPreview: { ...u.planPreview, [dealId]: next } };
      });
    },
    // Start drafting on a not-started file: start AND approve the plan as shown in one click (the
    // click is the reviewer's approval; the engine records "Plan approved by reviewer"). Replacing a
    // live run still goes through the confirm strip (and then the plan review it opens).
    draftFile: (dealId) => {
      const s = x.current();
      if (s.agent.parsing) return;
      if (!s.agent.dealsFull.some((d) => d.id === dealId)) return;
      const excluded = x.uiRef.current.planPreview[dealId] ?? [];
      if (isLiveStatus(s.agent.status)) {
        const skip = excluded[0];
        x.pendingPlanToggle.current = skip ? { dealId, stepId: skip, include: false } : null;
        holdRunningCountdown();
        x.setUi((u) => ({ ...u, confirm: { kind: 'start', dealId } }));
        return;
      }
      x.pendingPlanToggle.current = null;
      doStart(dealId);
      const ids = getPlan()
        .filter((p) => !excluded.includes(p.id))
        .map((p) => p.id);
      x.setPlan({ enabledIds: ids, held: false, holdReason: null, deadline: null });
      x.current().agent.approvePlan(ids);
    },
    // R4.7 (audit fix 6): removing a file is one click with an in-place undo, never the file a run
    // is live on. The row collapses to its undo line in the same group (read before it leaves
    // agent.dealsFull); the line lasts until the reviewer leaves the Desk.
    removeFile: (dealId) => {
      const s = x.current();
      if (isLiveStatus(s.agent.status) && selectLiveDealId(s) === dealId) return;
      const deal = s.agent.dealsFull.find((d) => d.id === dealId);
      if (!deal) return;
      const stage = deskStageOf(s, dealId) ?? 'not-started';
      // leave a case file of it first (route hygiene ends undo lines on a place change)
      if (s.route.name === 'file' && s.route.dealId === dealId) x.navigate({ name: 'desk' });
      x.setUi((u) => ({
        ...u,
        removedFiles: u.removedFiles.includes(dealId) ? u.removedFiles : [...u.removedFiles, dealId],
        deskUndo: [...u.deskUndo.filter((r) => r.dealId !== dealId), { dealId, name: deal.name, stage }],
        announce: COPY.removedAnnounce(deal.name),
      }));
      landFocus(() => removeButtonOf(dealId) === null, () => undoLinkOf(dealId));
    },
    undoRemove: (dealId) => {
      const u0 = x.uiRef.current;
      if (!u0.removedFiles.includes(dealId)) return;
      const name = u0.deskUndo.find((r) => r.dealId === dealId)?.name ?? x.current().allFiles.find((f) => f.dealId === dealId)?.name ?? null;
      x.setUi((u) => ({
        ...u,
        removedFiles: u.removedFiles.filter((id) => id !== dealId),
        deskUndo: u.deskUndo.filter((r) => r.dealId !== dealId),
        announce: name ? COPY.restoredAnnounce(name) : u.announce,
      }));
      landFocus(() => undoLineOf(dealId) === null, () => removeButtonOf(dealId));
    },
    restoreRemoved: () => {
      const ids = x.uiRef.current.removedFiles;
      if (ids.length === 0) return;
      // focus lands on the first restored row, in Desk order
      const first = x.current().allFiles.find((f) => ids.includes(f.dealId))?.dealId ?? ids[0];
      x.setUi((u) => ({ ...u, removedFiles: [], deskUndo: [], announce: COPY.restoredAllAnnounce(ids.length) }));
      landFocus(() => restoreControls() === null, () => removeButtonOf(first));
    },
    confirmStart: () => {
      const conf = x.uiRef.current.confirm;
      if (!conf || conf.kind !== 'start') return;
      x.setUi((u) => ({ ...u, confirm: null }));
      doStart(conf.dealId);
    },
    requestStop: () => {
      if (!isLiveStatus(x.current().agent.status)) return;
      holdRunningCountdown();
      x.setUi((u) => ({ ...u, confirm: { kind: 'stop' } }));
    },
    // the engine records "Run cancelled · reset before a decision"; the stopped file's thread starts over
    confirmStop: () => {
      const conf = x.uiRef.current.confirm;
      if (!conf || conf.kind !== 'stop') return;
      x.setUi((u) => ({ ...u, confirm: null }));
      const s = x.current();
      if (!isLiveStatus(s.agent.status)) return;
      const live = selectLiveDealId(s);
      s.agent.reset();
      if (live) resetEpochs([live]);
    },
    upload: (file) => {
      const s = x.current();
      if (s.agent.parsing || isLiveStatus(s.agent.status)) return;
      s.agent.uploadDeal(file);
      x.setUi((u) => ({ ...u, parsingSince: Date.now(), pendingUploadOpen: true }));
    },
    exportFile: (dealId) => {
      const { filename, payload } = buildFileExport(x.current(), dealId);
      download(filename, payload);
    },
    exportSession: () => {
      const { filename, payload } = buildSessionExport(x.current());
      download(filename, payload);
    },
  };
}
