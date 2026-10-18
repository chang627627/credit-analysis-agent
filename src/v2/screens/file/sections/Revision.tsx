// ---------------------------------------------------------------------------
// Case file · Revision N (spec §7.2 "Section bodies", §1 pillar 4). The
// revision stays inside the document: the returned note quoted and attributed,
// then either the Structuring Engine's proposal as a rev 1 → rev N redline or
// the honest no-cure line (the recommendation stands).
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

  return (
    <>
      {b.returned ? (
        <div className="file-rev__returned">
          <p className="file-rev__quote t-small">{b.returned.quote}</p>
          <p className="file-rev__attr t-meta">{b.returned.attribution}</p>
        </div>
      ) : null}
      {b.viable ? (
        <>
          {b.summary ? <p className="t-body">{b.summary}</p> : null}
          {rows.length > 0 ? (
            <Table columns={columns} rows={rows} caption={heading} stackBelow={ctx.stackTables ? 760 : undefined} />
          ) : null}
        </>
      ) : null}
      {!b.viable && b.noCure ? (
        <StatusLabel state="watch" role="small">
          {b.noCure}
        </StatusLabel>
      ) : null}
    </>
  );
}
