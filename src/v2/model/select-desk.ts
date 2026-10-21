// ---------------------------------------------------------------------------
// Countersign V2 · Desk selector (spec §7.1). One calm list of every file,
// grouped by stage derived from real run state (the same file context the
// case file reads). The human's next obligation is the only possible primary.
// R4.12 (supersedes R4.7's in-place undo): removing a file asks first, in a
// confirm dialog, then the row simply leaves; an empty Desk offers to bring
// the samples back (R4.7), and Settings restores removed files.
// ---------------------------------------------------------------------------

import type { V2Store } from '../state/contracts';
import { covenantKind } from './flags';
import { dotJoin, fmtElapsed, fmtX, plural } from './format';
import { startConfirmCopy } from './select-commands';
import { fileContext, parsingReason, stageOf } from './select-file';
import { dealOf, isRunLive, selectLiveDealId } from './select-top';
import { parseThreshold } from './evidence';
import type { DeskRemoveDialog, DeskRow, DeskStage, DeskView, StatusKey } from './types';
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

  // the extraction row is a synthetic first row of Not started, so that group shows (and counts it) while parsing
  const parsingRow = a.parsing !== null;
  const groups: DeskView['groups'] = GROUP_ORDER.filter((g) => (byStage.get(g) ?? []).length > 0 || (g === 'not-started' && parsingRow)).map((g) => {
    const rows = byStage.get(g) ?? [];
    const count = rows.length + (g === 'not-started' && parsingRow ? 1 : 0);
    return { stage: g, label: COPY.groupLabel[g], status: GROUP_STATUS[g], count: String(count), rows };
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
  const removedIds = s.ui.removedFiles ?? [];
  const removedN = removedIds.length;
  let summary: string;
  if (fileCount === 0) {
    summary = COPY.deskEmptySummary;
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

  // R4.7: an empty Desk (nothing being extracted either) says so beside the drop zone and, when
  // files were removed, offers to bring them all back there, named for what it brings back (only
  // the samples, or uploads too). Otherwise Settings' "Restore removed files" is the way back (R4.12:
  // no undo line, no Restore in the summary).
  const samplesOnly = removedIds.every((id) => !s.allFiles.some((f) => f.dealId === id && f.uploaded));
  const empty: DeskView['empty'] =
    fileCount === 0 && !parsingRow
      ? {
          text: COPY.deskEmptyNote(removedN > 0 ? samplesOnly : null),
          restore: removedN > 0 ? { label: samplesOnly ? COPY.restoreSamples : COPY.restoreRemoved } : null,
        }
      : null;

  // R4.12: the remove confirm, while it is open on a file that is still on the Desk and removable
  const askId = s.ui.removeConfirm;
  const askDeal = askId ? a.dealsFull.find((d) => d.id === askId) : undefined;
  const removeDialog: DeskRemoveDialog | null =
    askDeal && !(isRunLive(s) && selectLiveDealId(s) === askDeal.id)
      ? {
          dealId: askDeal.id,
          title: COPY.removeDialogTitle(askDeal.name),
          body: COPY.removeDialogBody(a.runs.some((r) => r.dealId === askDeal.id)),
          cancelLabel: COPY.cancel,
          confirmLabel: COPY.removeDialogConfirm,
        }
      : null;

  return {
    title: COPY.deskTitle,
    summary,
    groups,
    parsing,
    drop: { label: COPY.dropLabel, sub: COPY.dropSub, chooseLabel: COPY.dropChoose, disabledReason },
    empty,
    removeDialog,
  };
}
