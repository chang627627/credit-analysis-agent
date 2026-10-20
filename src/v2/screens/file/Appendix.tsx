// ---------------------------------------------------------------------------
// Case file · Appendix (THREE-PANE.md §5.4, FileAt "monitoring"), inside its
// own memo card: the Portfolio Monitor's latest readings on this file's filed
// figures (simulated drift), or "First sweep pending." The sweep line sits
// right of the eyebrow once there are readings (before that the empty note
// says it); the table stacks under 640px of its own width.
// ---------------------------------------------------------------------------

import { EmptyNote, SectionHead, StatusLabel, Table } from '../../kit';
import type { TableRow } from '../../kit';
import { COPY } from '../../model';
import type { AppendixView } from '../../model';
import type { FileCtx } from './FileScreen';
import { COVENANT_COLUMNS, CushionCell } from './sections/Covenants';

const ANCHOR = 'sec:monitoring';

export function Appendix(props: { appendix: AppendixView; ctx: FileCtx }) {
  const { appendix: v, ctx } = props;
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
        eyebrow={v.eyebrow}
        heading={v.heading}
        aside={v.rows ? <span className="file-aside t-meta">{v.meta}</span> : null}
        anchorId={ANCHOR}
        flashKey={ctx.flashKeyOf(ANCHOR)}
        highlighted={ctx.isHighlighted(ANCHOR)}
      />
      {v.rows ? (
        <Table columns={COVENANT_COLUMNS} rows={rows} caption={v.heading} stackBelow={640} />
      ) : (
        <EmptyNote>{v.empty ?? COPY.firstSweepPending}</EmptyNote>
      )}
    </>
  );
}
