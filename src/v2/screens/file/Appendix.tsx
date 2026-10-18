// ---------------------------------------------------------------------------
// Case file · Appendix (spec §7.2 "Appendix row", FileAt "monitoring"): the
// Portfolio Monitor's latest readings on this file's filed figures (simulated
// drift), or "First sweep pending."
// ---------------------------------------------------------------------------

import { EmptyNote, SectionHead, StatusLabel, Table } from '../../kit';
import type { TableRow } from '../../kit';
import { COPY, STATUS_WORD } from '../../model';
import type { AppendixView } from '../../model';
import type { FileCtx } from './FileScreen';
import { COVENANT_COLUMNS, CushionCell } from './sections/Covenants';

const ANCHOR = 'sec:monitoring';

export function Appendix(props: { appendix: AppendixView; ctx: FileCtx }) {
  const { appendix: v, ctx } = props;
  const status = v.rows ? 'done' : 'pending';
  const rows: TableRow[] = (v.rows ?? []).map((r) => ({
    key: r.name,
    height: 36,
    cells: {
      name: <span className="t-body">{r.name}</span>,
      threshold: <span className="t-figure">{r.threshold}</span>,
      actual: r.actual,
      cushion: <CushionCell cushion={r.cushion} />,
      status: (
        <StatusLabel state={r.status.state} role="small">
          {r.status.text}
        </StatusLabel>
      ),
    },
  }));
  return (
    <>
      <SectionHead
        ordinal=""
        heading={v.heading}
        status={status}
        statusLabel={STATUS_WORD[status]}
        anchorId={ANCHOR}
        flashKey={ctx.flashKeyOf(ANCHOR)}
        highlighted={ctx.isHighlighted(ANCHOR)}
      />
      <p className="file-appendix__meta t-meta">{v.meta}</p>
      {v.rows ? (
        <Table
          columns={COVENANT_COLUMNS}
          rows={rows}
          caption={v.heading}
          stackBelow={ctx.stackTables || ctx.stackWide ? 760 : undefined}
        />
      ) : (
        <EmptyNote>{v.empty ?? COPY.firstSweepPending}</EmptyNote>
      )}
    </>
  );
}
