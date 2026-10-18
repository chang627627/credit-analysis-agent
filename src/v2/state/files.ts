// ---------------------------------------------------------------------------
// Files: run control (start with confirm, stop with confirm, upload), the
// sealed-file snapshots (spec §9.2 #6), countersigned-ESCALATE routing
// (§9.2 #5) and the JSON download helper used by both exports.
//
// The live file is always resolved from the current RunRecord through the
// model's selectLiveDealId; nothing here reads selectedDealId to decide
// liveness, and V2 never switches the engine's deal to browse.
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';
import type { Deal } from '../../agent/mockData';
import { getPlan } from '../../agent/runAgent';
import type { Amendment, ApprovalPackage } from '../../agent/types';
import { amendedOutcome } from '../../agent/whatif';
import type { RunDecision, RunStatus } from '../../hooks/useCreditAgent';
import type { MonitorApi } from '../../hooks/useMonitor';
import { buildFileExport, buildSessionExport, overridesFromAmendments } from '../model';
import type { CaseFileSnapshot, V2Actions, V2Internals, V2Store } from './store';
import { holdAuto } from './gate';

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
 */
export function shouldRoute(pkg: ApprovalPackage, deal: Deal, amendments: Amendment[] | null, auto: boolean): boolean {
  if (pkg.recommendation !== 'escalate' || auto) return false;
  if (amendments && amendments.length > 0) {
    if (amendedOutcome(deal, overridesFromAmendments(amendments)).recommendation === 'approve') return false;
  }
  return true;
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

// ---- actions ------------------------------------------------------------------

export type FileActions = Pick<
  V2Actions,
  'startFile' | 'confirmStart' | 'requestStop' | 'confirmStop' | 'upload' | 'exportFile' | 'exportSession'
>;

export function createFileActions(x: V2Internals): FileActions {
  /**
   * Asking to discard the live run (Stop, or a start that would replace it) is
   * engagement: a running clean-approval countdown holds before the confirm
   * strip opens, so the policy can never sign the memo while the reviewer is
   * deciding whether to throw it away. Only a running countdown is held; a gate
   * that never armed (reached off screen) keeps its own state.
   */
  const holdRunningCountdown = () => {
    if (x.gateRef.current.autoDeadline !== null) holdAuto(x, 'engaged');
  };

  const doStart = (dealId: string) => {
    const s = x.current();
    if (s.agent.parsing) return;
    if (!s.agent.dealsFull.some((d) => d.id === dealId)) return;
    s.agent.start(dealId);
    // a fresh plan review even when one was already open (plan_review to plan_review)
    x.setPlan({ enabledIds: getPlan().map((p) => p.id), held: false, holdReason: null, deadline: null });
    x.navigate({ name: 'file', dealId, at: null });
  };

  return {
    // no start of any kind while extraction runs; never discard a live run silently
    startFile: (dealId) => {
      const s = x.current();
      if (s.agent.parsing) return;
      if (!s.agent.dealsFull.some((d) => d.id === dealId)) return;
      if (isLiveStatus(s.agent.status)) {
        holdRunningCountdown();
        x.setUi((u) => ({ ...u, confirm: { kind: 'start', dealId } }));
        return;
      }
      doStart(dealId);
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
    // the engine records "Run cancelled · reset before a decision"
    confirmStop: () => {
      const conf = x.uiRef.current.confirm;
      if (!conf || conf.kind !== 'stop') return;
      x.setUi((u) => ({ ...u, confirm: null }));
      const s = x.current();
      if (isLiveStatus(s.agent.status)) s.agent.reset();
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
