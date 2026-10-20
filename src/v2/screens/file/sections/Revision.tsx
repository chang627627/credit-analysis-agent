// ---------------------------------------------------------------------------
// Case file · Revision N (THREE-PANE.md §5.4). The revision stays inside the
// document as its own card, between step 4 and step 5: "Reviewer note" (the
// returned note quoted and attributed), then "Proposed revision" (the
// Structuring Engine's summary and its rev 1 → rev N redline) or "Outcome"
// (the honest no-cure line, or "no restructure is needed"). The card's
// takeaway states the revision's own outcome. The redline stacks under 480px
// of its own width; its cells are the one emphasis.
// ---------------------------------------------------------------------------

import { Redline, StatusLabel, Table } from '../../../kit';
import type { TableColumn, TableRow } from '../../../kit';
import { COPY } from '../../../model';
import type { RevisionBody } from '../../../model';
import type { FileCtx } from '../FileScreen';

export function Revision(props: { body: RevisionBody; heading: string; ctx: FileCtx }) {
  const { body: b, heading, ctx } = props;

  const columns: TableColumn[] = [
    { key: 'figure', label: 'Figure', width: '1fr' },
    { key: 'from', label: 'Rev 1', width: '112px', align: 'end' },
    { key: 'to', label: `Rev ${b.n}`, width: '200px', align: 'end' },
  ];
  const rows: TableRow[] = b.redline.map((r) => ({
    key: r.anchorId,
    anchorId: r.anchorId,
    height: 36,
    highlighted: ctx.isHighlighted(r.anchorId),
    flashKey: ctx.flashKeyOf(r.anchorId),
    cells: {
      figure: <span className="t-body">{r.label}</span>,
      from: r.from,
      to: r.unchanged ? <span className="file-rev__unchanged t-small">{COPY.unchanged}</span> : <Redline from={r.from} to={r.to} />,
    },
  }));

  const outcome = b.viable ? (
    <>
      {b.summary ? <p className="file-rev__summary t-body">{b.summary}</p> : null}
      {rows.length > 0 ? <Table columns={columns} rows={rows} caption={heading} stackBelow={480} /> : null}
    </>
  ) : b.noCure ? (
    <StatusLabel state="watch" role="small">
      {b.noCure}
    </StatusLabel>
  ) : null;

  return (
    <>
      {b.returned ? (
        <div className="file-block">
          <p className="file-block__label t-label">{b.noteLabel}</p>
          <div className="file-rev__returned">
            <p className="file-rev__quote t-small">{b.returned.quote}</p>
            <p className="file-rev__attr t-meta">{b.returned.attribution}</p>
          </div>
        </div>
      ) : null}
      {outcome ? (
        <div className="file-block">
          <p className="file-block__label t-label">{b.proposalLabel}</p>
          {outcome}
        </div>
      ) : null}
    </>
  );
}
