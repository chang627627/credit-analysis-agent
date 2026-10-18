// ---------------------------------------------------------------------------
// Countersign V2 · exports (spec §9.4 "Exports"). The file export is the
// sealed record as presented (snapshot + what the reviewer saw at signing);
// the session export is everything, with a closed-set actor on every event.
// Events and exhibits always come from auditHistory filtered by runId, so the
// export, the memo and the Ledger cannot disagree.
// ---------------------------------------------------------------------------

import type { V2Store } from '../state/store';
import { fileFilename, fmtIso, sessionFilename } from './format';
import { selectExhibits } from './select-decision';
import { fileContext, runTiming, snapshotContext } from './select-file';
import { actorOf, relabel } from './select-ledger';
import { provenanceText, VERB_WORD } from './vocab';

export function buildFileExport(s: V2Store, dealId: string): { filename: string; payload: unknown } {
  // a sealed file exports its sealed record: when the deal has been re-run since (plan review,
  // drafting, gate or cancelled), the file shows the new run but the export reads the snapshot
  const shown = fileContext(s, dealId);
  const ctx = shown && shown.mode === 'sealed' ? shown : (snapshotContext(s, dealId) ?? shown);
  const deal = ctx?.deal ?? s.agent.dealsFull.find((d) => d.id === dealId);
  const memoId = ctx?.pkg?.memoId ?? deal?.memoId ?? dealId;
  const file = {
    dealId,
    memoId,
    borrower: deal?.document.borrower ?? null,
    facility: deal?.document.facility ?? null,
  };
  if (!ctx) {
    return { filename: fileFilename(memoId), payload: { exportedAt: fmtIso(s.now), app: 'Countersign V2', file, runId: null } };
  }

  const seal = ctx.seal;
  const startedAt = ctx.run?.startedAt ?? ctx.snapshot?.startedAt ?? null;
  const timing = seal && startedAt !== null ? runTiming(ctx.entries, startedAt, seal.decidedAt) : null;
  const decision = seal
    ? {
        verb: VERB_WORD[seal.decision],
        at: fmtIso(seal.decidedAt),
        note: seal.note,
        noteProvenance: seal.note ? seal.provenance : null,
        noteProvenanceText: provenanceText(seal.provenance, seal.auto, !!seal.note),
        amendments: seal.amendments,
        auto: seal.auto,
        suspendedMs: timing ? timing.finalWaitMs : null,
      }
    : null;

  return {
    filename: fileFilename(memoId),
    payload: {
      exportedAt: fmtIso(s.now),
      app: 'Countersign V2',
      file,
      runId: ctx.runId,
      decision,
      asPresented: seal ? seal.presented : null,
      package: ctx.pkg,
      steps: ctx.steps.map((st) => ({ title: st.title, call: st.call ?? null, result: st.result ?? null, flags: st.flags, thinking: st.thinking })),
      events: ctx.runId === null ? [] : s.agent.auditHistory.filter((e) => e.runId === ctx.runId),
      exhibits: selectExhibits(s, dealId, ctx),
    },
  };
}

export function buildSessionExport(s: V2Store): { filename: string; payload: unknown } {
  const a = s.agent;
  return {
    filename: sessionFilename(s.now),
    payload: {
      exportedAt: fmtIso(s.now),
      app: 'Countersign V2',
      analysisEvents: a.auditHistory.map((e) => ({ ...e, actor: actorOf(e), display: relabel(e).event })),
      runs: a.runs,
      monitorLog: s.monitorLog,
      escalations: s.monitor.escalations,
      snapshots: s.snapshotList,
    },
  };
}
