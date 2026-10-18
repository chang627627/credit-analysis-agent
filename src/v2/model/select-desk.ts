// ---------------------------------------------------------------------------
// Countersign V2 · Desk selector (spec §7.1). One calm list of every file,
// grouped by stage derived from real run state (the same file context the
// case file reads). The human's next obligation is the only possible primary.
// ---------------------------------------------------------------------------

import type { V2Store } from '../state/store';
import { covenantKind } from './flags';
import { dotJoin, fmtElapsed, fmtX, plural } from './format';
import { startConfirmCopy } from './select-commands';
import { fileContext, parsingReason, stageOf } from './select-file';
import { dealOf, isRunLive, selectLiveDealId } from './select-top';
import { parseThreshold } from './evidence';
import type { DeskRow, DeskStage, DeskView, StatusKey } from './types';
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
    const confirm = s.ui.confirm && s.ui.confirm.kind === 'start' && s.ui.confirm.dealId === deal.id ? startConfirmCopy(s, deal.id) : null;
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
    };
    const list = byStage.get(st.stage);
    if (list) list.push(row);
    else byStage.set(st.stage, [row]);
  }

  // the extraction row is a synthetic first row of Not started, so that group shows (and counts it) while parsing
  const parsingRow = a.parsing !== null;
  const groups: DeskView['groups'] = GROUP_ORDER.filter(
    (g) => (byStage.get(g) ?? []).length > 0 || (g === 'not-started' && parsingRow),
  ).map((g) => {
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
  let summary: string;
  if (awaiting === 0 && decided === 0 && !anyUploaded) {
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

  return {
    title: COPY.deskTitle,
    summary,
    groups,
    parsing,
    drop: { label: COPY.dropLabel, sub: COPY.dropSub, chooseLabel: COPY.dropChoose, disabledReason },
  };
}
