// ---------------------------------------------------------------------------
// Case file · Step 4 Covenant compliance (THREE-PANE.md §5.4, §5.6): one
// labelled block, "Tests on the filed figures" (or "Tests as amended"). Each
// test with its signed cushion on the shared ±50% meter; Threshold, Actual
// and Cushion are right-aligned. A breached row's Actual is in bad-ink (the
// model's actualTone) beside the Breach status. At the live gate on a
// filed-figure package the Max Total Leverage and Min Liquidity thresholds
// are amended in place (AmendField → setThreshold), re-tested by the same
// decide rule; an amended term prints as a redline. Rows carry cov:<name>
// anchors, the landing point of J / K, the Decision card's "Show row" and
// "Edit in memo", and the panel's "Covenants →". The table stacks under 640px
// of its own width. `CushionCell` and the columns are shared with the
// appendix.
//
// R4.3 (Mobbin audit fix 3): each Actual traces to its Financials row (the
// kit LinkButton in the row's own ink, P-32; cueMemo scrolls there and
// flashes it once, no connector lines), and an Actual the CIM does not state
// carries one t-meta line under it, "Not in CIM" (the model's short form of
// the evidence class, since the column is 88px). Such a row is top-aligned
// (kit TableRow align 'start'), so the Actual's value stays on the same line
// as its neighbours' figures instead of riding 8px above them.
// ---------------------------------------------------------------------------

import { AmendField, LinkButton, Meter, Redline, StatusLabel, Table } from '../../../kit';
import type { TableColumn, TableRow } from '../../../kit';
import type { CovenantRow } from '../../../model';
import type { FileCtx } from '../FileScreen';

export const COVENANT_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Covenant', width: '1fr' },
  { key: 'threshold', label: 'Threshold', width: '128px', align: 'end' },
  { key: 'actual', label: 'Actual', width: '88px', align: 'end' },
  { key: 'cushion', label: 'Cushion', width: '152px', align: 'end' },
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

export function Covenants(props: { rows: CovenantRow[]; label: string; ctx: FileCtx }) {
  const { rows, label, ctx } = props;
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

  // the Actual traces to its Financials row; a figure the CIM does not state says so under it
  const actual = (c: CovenantRow) => {
    const ev = c.evidence;
    return (
      <span className={c.actualTone === 'bad' ? 'file-tone-bad' : undefined}>
        {ev ? (
          <LinkButton role="figure" tone="inherit" ariaLabel={ev.ariaLabel} onClick={() => a.cueMemo(ev.target)}>
            {c.actual}
          </LinkButton>
        ) : (
          c.actual
        )}
        {ev && ev.line ? (
          <span className="file-actual__src t-meta" data-pattern="P-32">
            {ev.line}
          </span>
        ) : null}
      </span>
    );
  };

  const tableRows: TableRow[] = rows.map((c) => ({
    key: c.anchorId,
    anchorId: c.anchorId,
    height: 36,
    align: c.evidence && c.evidence.line ? 'start' : undefined,
    highlighted: ctx.isHighlighted(c.anchorId),
    flashKey: ctx.flashKeyOf(c.anchorId),
    cells: {
      name: <span className="t-body">{c.name}</span>,
      threshold: threshold(c),
      actual: actual(c),
      cushion: <CushionCell cushion={c.cushion} />,
      status: (
        <StatusLabel state={c.status} role="small">
          {c.statusText}
        </StatusLabel>
      ),
    },
  }));

  return (
    <div className="file-block">
      <p className="file-block__label t-label">{label}</p>
      <Table columns={COVENANT_COLUMNS} rows={tableRows} caption={label} stackBelow={640} />
    </div>
  );
}
