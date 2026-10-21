// ---------------------------------------------------------------------------
// Countersign V2 · Desk selector (spec §7.1). One calm list of every file,
// grouped by stage derived from real run state (the same file context the
// case file reads). The human's next obligation is the only possible primary.
// R4.7 (audit fix 6): removing a file is one click; during this visit its row
// is one undo line in its group, the summary offers Restore while any file is
// removed, and an empty Desk offers to bring the samples back.
// ---------------------------------------------------------------------------

import type { V2Store } from '../state/contracts';
import { covenantKind } from './flags';
import { dotJoin, fmtElapsed, fmtX, plural } from './format';
import { startConfirmCopy } from './select-commands';
import { fileContext, parsingReason, stageOf } from './select-file';
import { dealOf, isRunLive, selectLiveDealId } from './select-top';
import { parseThreshold } from './evidence';
import type { DeskRemovedLine, DeskRow, DeskStage, DeskView, StatusKey } from './types';
import { COPY, tokenOf } from './vocab';

const GROUP_ORDER: DeskStage[] = ['awaiting', 'plan-review', 'drafting', 'error', 'not-started', 'decided'];

const GROUP_STATUS: Record<DeskStage, StatusKey> = {
  awaiting: 'awaiting',
  'plan-review': 'awaiting',
  drafting: 'drafting',
  error: 'error',
  'not-started': 'pending',
  decided: 'signed',
};

/** The Desk group a file sits in now (read by state/files.ts when it is removed), or null when it is not on the Desk. */
export function deskStageOf(s: V2Store, dealId: string): DeskStage | null {
  const ctx = fileContext(s, dealId);
  return ctx ? stageOf(ctx).stage : null;
}

export function selectDesk(s: V2Store): DeskView {
  const a = s.agent;
  const byStage = new Map<DeskStage, DeskRow[]>();
  let anyUploaded = false;

  for (const deal of a.dealsFull) {
    const ctx = fileContext(s, deal.id);
    if (!ctx) continue;
    if (deal.uploaded) anyUploaded = true;
    const st = stageOf(ctx);
    const lev = deal.covenants.find((c) => covenantKind(c.name) === 'leverage');
    const ceiling = lev ? parseThreshold(lev.threshold).value : null;
    const showCall = !!ctx.pkg && (ctx.mode === 'gate' || ctx.mode === 'sealed');
    // a start confirm is about discarding a LIVE run; once that run is decided it never renders
    const confirm =
      s.ui.confirm && s.ui.confirm.kind === 'start' && s.ui.confirm.dealId === deal.id && isRunLive(s) ? startConfirmCopy(s, deal.id) : null;
    const row: DeskRow = {
      dealId: deal.id,
      name: deal.name,
      borrower: deal.document.borrower,
      facility: dotJoin(deal.document.facility),
      uploaded: !!deal.uploaded,
      leverage: {
        text: fmtX(deal.financials.leverageX),
        tone: ceiling !== null && deal.financials.leverageX > ceiling ? 'bad' : 'ink',
      },
      call: showCall && ctx.pkg ? tokenOf(ctx.pkg.recommendation) : null,
      stage: st.status,
      subMeta: st.subMeta,
      action: st.action,
      confirm,
      remove: (() => {
        const blocked = isRunLive(s) && selectLiveDealId(s) === deal.id;
        return { label: blocked ? COPY.removeBlocked(deal.name) : COPY.removeFile(deal.name), disabled: blocked };
      })(),
    };
    const list = byStage.get(st.stage);
    if (list) list.push(row);
    else byStage.set(st.stage, [row]);
  }

  // R4.7: this visit's removals, each one undo line in the group its row sat in, placed where the row
  // was (above the first live row that followed it in the engine's order), in that order
  const removedIds = s.ui.removedFiles ?? [];
  const rankOf = new Map(s.allFiles.map((f, i) => [f.dealId, i] as const));
  const rank = (id: string) => rankOf.get(id) ?? Number.MAX_SAFE_INTEGER;
  const linesByStage = new Map<DeskStage, DeskRemovedLine[]>();
  const undo = (s.ui.deskUndo ?? []).filter((r) => removedIds.includes(r.dealId)).sort((x, y) => rank(x.dealId) - rank(y.dealId));
  for (const r of undo) {
    const next = (byStage.get(r.stage) ?? []).find((row) => rank(row.dealId) > rank(r.dealId));
    const line: DeskRemovedLine = {
      dealId: r.dealId,
      text: COPY.removedLine(r.name),
      undo: { label: COPY.undo, ariaLabel: COPY.undoRemove(r.name) },
      before: next ? next.dealId : null,
    };
    const list = linesByStage.get(r.stage);
    if (list) list.push(line);
    else linesByStage.set(r.stage, [line]);
  }

  // the extraction row is a synthetic first row of Not started, so that group shows (and counts it) while parsing
  const parsingRow = a.parsing !== null;
  const groups: DeskView['groups'] = GROUP_ORDER.filter(
    (g) => (byStage.get(g) ?? []).length > 0 || (linesByStage.get(g) ?? []).length > 0 || (g === 'not-started' && parsingRow),
  ).map((g) => {
    const rows = byStage.get(g) ?? [];
    const count = rows.length + (g === 'not-started' && parsingRow ? 1 : 0);
    return { stage: g, label: COPY.groupLabel[g], status: GROUP_STATUS[g], count: String(count), rows, removed: linesByStage.get(g) ?? [] };
  });

  // the extraction row: the numeral ticks with s.now, nothing animates
  const parsing = a.parsing
    ? {
        state: 'drafting' as const,
        text: `Extracting financials from ${a.parsing.name} · simulated · ${fmtElapsed(s.now - (s.ui.parsingSince ?? s.now))}`,
      }
    : null;

  const fileCount = a.dealsFull.length;
  const awaiting = (byStage.get('awaiting') ?? []).length;
  const decided = (byStage.get('decided') ?? []).length;
  const removedN = removedIds.length;
  let summary: string;
  if (fileCount === 0) {
    summary = removedN > 0 ? `${COPY.deskEmptySummary} · ${COPY.removedCount(removedN)}` : COPY.deskEmptySummary;
  } else if (awaiting === 0 && decided === 0 && !anyUploaded && removedN === 0) {
    summary = COPY.deskInitialSummary;
  } else {
    const parts = [plural(fileCount, 'file')];
    if (awaiting > 0) parts.push(`${awaiting} awaiting your countersignature`);
    if (decided > 0) parts.push(`${decided} decided this session`);
    parts.push(COPY.extractionSimulated);
    summary = parts.join(' · ');
  }

  const parsingWhy = parsingReason(s);
  const live = selectLiveDealId(s);
  const liveName = dealOf(s, live)?.name ?? s.agent.runs.find((r) => r.dealId === live)?.dealName ?? 'the live file';
  const disabledReason = parsingWhy ?? (isRunLive(s) ? `Finish or stop the live run on ${liveName} to add a file.` : null);

  // R4.7: Restore brings back every removed file. With files on the Desk it closes the summary; an
  // empty Desk (nothing being extracted either) says so beside the drop zone and offers it there
  // instead, named for what it brings back (only the samples, or uploads too)
  const restoreAll = removedN > 0 ? { label: COPY.restore, ariaLabel: COPY.restoreAll(removedN) } : null;
  const samplesOnly = removedIds.every((id) => !s.allFiles.some((f) => f.dealId === id && f.uploaded));
  const empty: DeskView['empty'] =
    fileCount === 0 && !parsingRow
      ? {
          text: COPY.deskEmptyNote(removedN > 0 ? samplesOnly : null),
          restore: restoreAll ? { label: samplesOnly ? COPY.restoreSamples : COPY.restoreRemoved, ariaLabel: restoreAll.ariaLabel } : null,
        }
      : null;

  return {
    title: COPY.deskTitle,
    summary,
    groups,
    parsing,
    drop: { label: COPY.dropLabel, sub: COPY.dropSub, chooseLabel: COPY.dropChoose, disabledReason },
    removed: fileCount > 0 && restoreAll ? { text: COPY.removedCount(removedN), restore: restoreAll } : null,
    empty,
  };
}
