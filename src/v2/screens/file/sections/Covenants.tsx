// ---------------------------------------------------------------------------
// Case file · §4 Covenant compliance (spec §7.2 "Section bodies"): each test
// with its signed cushion on the shared ±50% meter. At the live gate on a
// filed-figure package the Max Total Leverage and Min Liquidity thresholds are
// amended in place (AmendField → setThreshold), re-tested by the same decide
// rule; an amended term prints as a redline. Rows carry cov:<name> anchors and
// highlight while a linked note is hovered. `CushionCell` is shared with the
// monitoring appendix.
// ---------------------------------------------------------------------------

import { AmendField, Meter, Redline, StatusLabel, Table } from '../../../kit';
import type { TableColumn, TableRow } from '../../../kit';
import type { CovenantRow } from '../../../model';
import type { FileCtx } from '../FileScreen';

export const COVENANT_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Covenant', width: '1fr' },
  { key: 'threshold', label: 'Threshold', width: '128px' },
  { key: 'actual', label: 'Actual', width: '88px', align: 'end' },
  { key: 'cushion', label: 'Cushion', width: '152px' },
  { key: 'status', label: 'Status', width: '104px' },
];

const CUSHION = 'Cushion';

export function CushionCell(props: { cushion: CovenantRow['cushion'] }) {
  const c = props.cushion;
  return (
    <span className="file-cushion">
      <span className="file-cushion__text t-figure">{c.text}</span>
      <Meter kind="cushion" pct={c.pct} tone={c.tone} ariaLabel={`${CUSHION} ${c.text}`} />
    </span>
  );
}

export function Covenants(props: { rows: CovenantRow[]; heading: string; ctx: FileCtx }) {
  const { rows, heading, ctx } = props;
  const a = ctx.actions;
  const focus = ctx.amendFocus;

  const threshold = (c: CovenantRow) => {
    const amend = c.amend;
    if (amend) {
      return (
        <AmendField
          display={c.threshold}
          amended={c.amended}
          value={amend.value}
          step={amend.step}
          min={amend.min}
          max={amend.max}
          prefix={amend.prefix}
          suffix={amend.suffix}
          ariaLabel={`${c.name} threshold`}
          focusTick={focus && focus.kind === amend.kind ? focus.tick : undefined}
          onCommit={(v) => a.setThreshold(amend.kind, v)}
        />
      );
    }
    if (c.amended) return <Redline from={c.amended.from} to={c.amended.to} />;
    return <span className="t-figure">{c.threshold}</span>;
  };

  const tableRows: TableRow[] = rows.map((c) => ({
    key: c.anchorId,
    anchorId: c.anchorId,
    height: 36,
    highlighted: ctx.isHighlighted(c.anchorId),
    flashKey: ctx.flashKeyOf(c.anchorId),
    cells: {
      name: <span className="t-body">{c.name}</span>,
      threshold: threshold(c),
      actual: c.actual,
      cushion: <CushionCell cushion={c.cushion} />,
      status: (
        <StatusLabel state={c.status} role="small">
          {c.statusText}
        </StatusLabel>
      ),
    },
  }));

  return (
    <Table
      columns={COVENANT_COLUMNS}
      rows={tableRows}
      caption={heading}
      stackBelow={ctx.stackTables || ctx.stackWide ? 760 : undefined}
    />
  );
}
