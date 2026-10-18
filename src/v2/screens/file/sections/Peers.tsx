// ---------------------------------------------------------------------------
// Case file · §3 Peer benchmarks (spec §7.2 "Section bodies"): the deal against
// simulated sector comparables; "This deal" reads strong.
// ---------------------------------------------------------------------------

import type { ReactNode } from 'react';
import { Table } from '../../../kit';
import type { TableColumn, TableRow } from '../../../kit';
import type { PeersBody } from '../../../model';
import type { FileCtx } from '../FileScreen';

const COLUMNS: TableColumn[] = [
  { key: 'cohort', label: 'Cohort', width: '1fr' },
  { key: 'leverage', label: 'Leverage', width: '96px', align: 'end' },
  { key: 'interest', label: 'Interest coverage', width: '128px', align: 'end' },
  { key: 'margin', label: 'EBITDA margin', width: '112px', align: 'end' },
];

export function Peers(props: { body: PeersBody; heading: string; ctx: FileCtx }) {
  const { body: b, heading, ctx } = props;
  const cell = (text: string, strong: boolean): ReactNode => <span className={strong ? 't-strong' : undefined}>{text}</span>;
  const rows: TableRow[] = b.rows.map((r) => ({
    key: r.cohort,
    height: 36,
    cells: {
      cohort: <span className={r.isDeal ? 't-strong' : 't-body'}>{r.cohort}</span>,
      leverage: cell(r.leverage, r.isDeal),
      interest: cell(r.interest, r.isDeal),
      margin: cell(r.margin, r.isDeal),
    },
  }));
  return (
    <>
      <Table columns={COLUMNS} rows={rows} caption={heading} stackBelow={ctx.stackTables ? 760 : undefined} />
      <p className="file-peers__position t-small">{b.position}</p>
    </>
  );
}
