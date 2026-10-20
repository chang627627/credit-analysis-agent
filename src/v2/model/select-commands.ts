// ---------------------------------------------------------------------------
// Countersign V2 · palette commands, confirm copy and live-region sentences.
// The palette never offers reject or return: a reason must be typed at the gate.
// It never signs either (THREE-PANE §6.5): signing happens only on the decision
// card; "Go to decision" brings the card into view and focuses its primary.
// ---------------------------------------------------------------------------

import type { AnnounceKind, V2Store } from '../state/contracts';
import { classifyFlag, isCounted } from './flags';
import { fmtHM, fmtSpeed, plural } from './format';
import { SPEED_STEPS, isRunLive, selectLiveDealId } from './select-top';
import type { CommandView, ConfirmView } from './types';
import { COPY, HOLD_CAPTION } from './vocab';

function dealName(s: V2Store, dealId: string | null): string {
  if (!dealId) return 'this file';
  return s.agent.dealsFull.find((d) => d.id === dealId)?.name ?? s.agent.runs.find((r) => r.dealId === dealId)?.dealName ?? dealId;
}

/** The palette's command list (the palette filters it by substring). */
export function selectCommands(s: V2Store): CommandView[] {
  const a = s.agent;
  const live = selectLiveDealId(s);
  const liveName = dealName(s, live);
  const out: CommandView[] = [];

  if (live && a.status === 'plan_review') {
    out.push({ id: 'approve-plan', label: COPY.startDrafting, section: 'Live file', hint: liveName, kbd: `${s.modKey}↵`, action: { kind: 'approve-plan' } });
    out.push({ id: 'cancel-plan', label: 'Cancel plan review', section: 'Live file', hint: liveName, action: { kind: 'cancel-plan' } });
  }
  const signed = s.gate.justSigned !== null && s.gate.justSigned.runId === a.runId;
  if (live && a.status === 'awaiting_approval' && a.approvalPackage && !s.gate.leaving && !signed) {
    const rev = a.approvalPackage.revision;
    out.push({ id: 'go-signature', label: COPY.goToDecision, section: 'Live file', hint: `${liveName} · rev ${rev}`, kbd: 'A', action: { kind: 'go-signature' } });
  }
  if (live && (a.status === 'running' || a.status === 'awaiting_approval')) {
    out.push({ id: 'stop', label: 'Stop the live run', section: 'Live file', hint: liveName, action: { kind: 'stop' } });
  }

  for (const d of a.dealsFull) {
    out.push({ id: `open:${d.id}`, label: `Open ${d.name}`, section: 'Files', hint: d.document.borrower, action: { kind: 'open-file', dealId: d.id } });
  }
  if (!a.parsing) {
    for (const d of a.dealsFull) {
      const decided = s.snapshots[d.id] !== undefined || a.runs.some((r) => r.dealId === d.id && r.decision !== null && r.decision !== 'cancelled');
      out.push({
        id: `start:${d.id}`,
        label: `${decided ? COPY.reRun : COPY.draftMemo} · ${d.name}`,
        section: 'Files',
        action: { kind: 'start-file', dealId: d.id },
      });
    }
  }

  out.push({ id: 'route:desk', label: 'Go to Desk', section: 'Go to', action: { kind: 'route', route: { name: 'desk' } } });
  out.push({ id: 'route:book', label: 'Go to Book', section: 'Go to', action: { kind: 'route', route: { name: 'book' } } });
  out.push({ id: 'route:ledger', label: 'Go to Ledger', section: 'Go to', action: { kind: 'route', route: { name: 'ledger', file: null } } });

  const sealedIds = new Set<string>(Object.keys(s.snapshots));
  if (live && (a.status === 'approved' || a.status === 'rejected')) sealedIds.add(live);
  for (const id of sealedIds) {
    out.push({ id: `export:${id}`, label: `${COPY.exportFile} · ${dealName(s, id)}`, section: 'Export', action: { kind: 'export-file', dealId: id } });
  }
  out.push({ id: 'export-session', label: COPY.exportSession, section: 'Export', action: { kind: 'export-session' } });

  if (!s.monitor.sweeping) out.push({ id: 'sweep', label: COPY.sweepNow, section: 'Book', hint: COPY.portfolioMonitor, action: { kind: 'sweep' } });

  for (const v of SPEED_STEPS) {
    if (v === a.speed) continue;
    out.push({ id: `speed:${v}`, label: `${COPY.paceLabel} · ${fmtSpeed(v)}`, section: 'Settings', action: { kind: 'speed', value: v } });
  }
  out.push(
    s.policy === 'auto'
      ? { id: 'policy:gate', label: 'Turn off auto-countersign', section: 'Settings', action: { kind: 'policy', value: 'gate' } }
      : { id: 'policy:auto', label: 'Turn on auto-countersign for clean approvals', section: 'Settings', action: { kind: 'policy', value: 'auto' } },
  );
  out.push({ id: 'href:v1', label: COPY.compareV1, section: 'Settings', action: { kind: 'href', href: '/?v=1' } });
  return out;
}

/** Palette footer: '14 actions'. */
export function paletteFooter(count: number): string {
  return plural(count, 'action');
}

function liveLead(s: V2Store, liveName: string): string {
  const st = s.agent.status;
  if (st === 'awaiting_approval') return `${liveName} is awaiting your countersignature.`;
  if (st === 'plan_review') return `${liveName} is in plan review.`;
  return `${liveName} is drafting.`;
}

/**
 * Plan review has not started a run: the engine opens a RunRecord only when the
 * plan is approved, so discarding a plan review leaves nothing on the record.
 * The confirm says so instead of promising a "cancelled" Ledger row that would
 * never appear (§10 rule 3: copy says exactly what happens).
 */
const NOTHING_RECORDED = 'Nothing has run yet, so the Ledger has nothing to record.';

/** §10 start confirm: discarding a live run is always confirmed inline, never silent. */
export function startConfirmCopy(s: V2Store, dealId: string): ConfirmView {
  const live = selectLiveDealId(s);
  const liveName = dealName(s, live);
  const target = dealName(s, dealId);
  const inPlanReview = s.agent.status === 'plan_review';
  if (live && live === dealId) {
    const text =
      s.agent.status === 'awaiting_approval'
        ? `${liveName} is awaiting your countersignature. Re-running discards the suspended memo, and the Ledger records it as cancelled.`
        : inPlanReview
          ? `${liveLead(s, liveName)} Re-running opens a fresh plan review. ${NOTHING_RECORDED}`
          : `${liveLead(s, liveName)} Re-running discards this run, and the Ledger records it as cancelled.`;
    return { kind: 'start', text, confirmLabel: COPY.reRunAnyway, cancelLabel: COPY.keepThisRun, tone: 'neutral' };
  }
  const lead = live && isRunLive(s) ? `${liveLead(s, liveName)} ` : '';
  const tail = inPlanReview
    ? `starting ${target} closes that plan review. ${NOTHING_RECORDED}`
    : `starting ${target} discards that run, and the Ledger records it as cancelled.`;
  return {
    kind: 'start',
    text: `${lead}The agent handles one file at a time: ${tail}`,
    confirmLabel: COPY.startAnyway,
    cancelLabel: `Keep ${liveName}`,
    tone: 'neutral',
  };
}

/** §10 stop confirm (danger). */
export function stopConfirmCopy(s: V2Store): ConfirmView {
  const pkg = s.agent.approvalPackage;
  const text =
    s.agent.status === 'awaiting_approval' && pkg
      ? `Stop discards the suspended rev ${pkg.revision} memo. The Ledger records the run as cancelled.`
      : 'Stop discards this run. The Ledger records it as cancelled.';
  return { kind: 'stop', text, confirmLabel: COPY.stopRun, cancelLabel: COPY.keep, tone: 'bad' };
}

/** The live region's sentence for a moment (§7.2, §8). */
export function announceFor(kind: AnnounceKind, s: V2Store): string {
  const a = s.agent;
  const at = fmtHM(a.decidedAt ?? s.now);
  switch (kind) {
    case 'gate': {
      const n = a.approvalPackage ? a.approvalPackage.flags.filter((f) => isCounted(classifyFlag(f))).length : 0;
      const tail = n === 0 ? 'No notes to review.' : `${plural(n, 'note')} to review.`;
      return `The agent is suspended at the countersignature. ${tail}`;
    }
    case 'signed':
      return `Countersigned by the reviewer at ${at}.`;
    case 'auto':
      return `Auto-countersigned by the clean-approval policy at ${at}.`;
    case 'rejected':
      return `Rejected by the reviewer at ${at}.`;
    case 'returned':
      return `Returned for revision. The agent is drafting revision ${(a.approvalPackage?.revision ?? 1) + 1}.`;
    case 'attached': {
      const n = a.auditHistory.filter((e) => e.kind === 'whatif' && e.runId === a.runId).length;
      return `Stress test attached as Exhibit ${String.fromCharCode(64 + Math.max(1, n))}.`;
    }
    case 'held': {
      const r = s.gate.holdReason;
      return r ? `Auto-countersign ${HOLD_CAPTION[r].replace(/^Held/, 'held')}.` : 'Auto-countersign held.';
    }
    case 'sign-ready':
      return COPY.signReady;
    case 'need-reason':
      return s.gate.armed === 'rework' ? COPY.reasonFirstRework : COPY.reasonFirstReject;
  }
}
