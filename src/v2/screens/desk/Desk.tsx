// ---------------------------------------------------------------------------
// Countersign V2 · Desk (spec §7.1). One calm list of every case file, grouped
// by the stage the engine reports, plus the CIM drop zone. A pure reduction of
// `selectDesk(s)`: every word, number and tone arrives composed by the model.
// Step one of the flow: each row has one Select button (and the row itself is
// clickable) that opens the case file. No other row actions: starting, steering
// and deciding live in the case file (agent panel + the memo's Decision card).
// ---------------------------------------------------------------------------
import { Trash2 } from 'lucide-react';
import { Button, Chip, ConfirmStrip, DropZone, IconButton, LinkButton, StatusLabel, Table, Token } from '../../kit';
import type { TableColumn, TableRow } from '../../kit';
import { COPY, selectDesk } from '../../model';
import type { DeskRow, DeskView } from '../../model';
import { useV2 } from '../../state/store';
import type { V2Actions } from '../../state/store';

/**
 * Column template from §7.1 with a trailing Select column (step one: pick the project). Facility
 * reappears under the borrower whenever its column hides: below a 1120 viewport (kit) and whenever
 * the TABLE is narrower than the full template (desk.css container query), since the sidebar and
 * the agent panel take their share of the viewport.
 */
const COLUMNS: TableColumn[] = [
  { key: 'file', label: 'File', width: 'minmax(144px, 1fr)' },
  { key: 'facility', label: 'Facility', width: '200px', hideBelow: 1120 },
  { key: 'leverage', label: 'Leverage', width: '88px', align: 'end' },
  { key: 'call', label: "Agent's call", width: '120px' },
  { key: 'stage', label: 'Stage', width: '200px' },
  { key: 'select', label: '', width: '144px', align: 'end' },
];

function FileCell({ row, onOpen }: { row: DeskRow; onOpen: () => void }) {
  return (
    <span className="desk-file">
      <span className="desk-file__line">
        <LinkButton role="strong" onClick={onOpen}>
          {row.name}
        </LinkButton>
        {row.uploaded ? <Chip>{COPY.uploadedChip}</Chip> : null}
      </span>
      <span className="desk-file__sub t-small">{row.borrower}</span>
      <span className="desk-file__facility t-small">{row.facility}</span>
    </span>
  );
}

function StageCell({ row }: { row: DeskRow }) {
  return (
    <span className="desk-stage">
      <StatusLabel state={row.stage.state} role="small">
        {row.stage.text}
      </StatusLabel>
      {row.subMeta ? <span className="desk-stage__meta t-meta">{row.subMeta}</span> : null}
    </span>
  );
}

function fileRow(row: DeskRow, actions: V2Actions): TableRow {
  const open = () => actions.navigate({ name: 'file', dealId: row.dealId, at: null });
  return {
    key: `file:${row.dealId}`,
    height: 56,
    onActivate: open,
    ariaLabel: row.name,
    cells: {
      file: <FileCell row={row} onOpen={open} />,
      facility: <span className="desk-facility t-small">{row.facility}</span>,
      leverage: (
        <span className={row.leverage.tone === 'bad' ? 'desk-lev desk-lev--bad t-figure' : 'desk-lev t-figure'}>
          {row.leverage.text}
        </span>
      ),
      call: row.call ? (
        <Token tone={row.call.tone}>{row.call.word}</Token>
      ) : (
        <span className="desk-nocall t-body">{COPY.noCall}</span>
      ),
      stage: <StageCell row={row} />,
      // step one of the flow: selecting the project opens its case file (it never starts anything)
      select: (
        <span className="desk-select">
          <Button variant="secondary" size="sm" onClick={open} ariaLabel={`${COPY.selectRow} ${row.name}`}>
            {COPY.selectRow}
          </Button>
          {row.remove ? (
            <IconButton icon={Trash2} label={row.remove.label} disabled={row.remove.disabled} onClick={() => actions.requestRemove(row.dealId)} />
          ) : null}
        </span>
      ),
    },
    detail: row.removeConfirm ? (
      <ConfirmStrip
        text={row.removeConfirm.text}
        confirmLabel={row.removeConfirm.confirmLabel}
        cancelLabel={row.removeConfirm.cancelLabel}
        tone="bad"
        onConfirm={() => actions.confirmRemove()}
        onCancel={() => actions.cancelRemove()}
      />
    ) : undefined,
  };
}

/** The upload's synthetic first row in Not started: one full-width status line, no action. */
function parsingRow(parsing: NonNullable<DeskView['parsing']>): TableRow {
  return {
    key: 'parsing',
    height: 36,
    span: (
      <span className="desk-parsing">
        <StatusLabel state={parsing.state} role="small">
          {parsing.text}
        </StatusLabel>
      </span>
    ),
  };
}

/** Groups in the model's order, empty ones hidden; the parsing row leads Not started. */
function rowsOf(view: DeskView, actions: V2Actions): TableRow[] {
  const rows: TableRow[] = [];
  let parsingPlaced = view.parsing === null;
  const placeParsing = () => {
    if (parsingPlaced || view.parsing === null) return;
    rows.push(parsingRow(view.parsing));
    parsingPlaced = true;
  };
  for (const g of view.groups) {
    const leadsParsing = g.stage === 'not-started' && !parsingPlaced;
    // the Decided group always follows Not started, so a parsing row with no Not started group lands here
    if (g.stage === 'decided' && !parsingPlaced) {
      rows.push({ key: 'group:not-started', group: { label: COPY.groupLabel['not-started'], status: 'pending', height: 32 } });
      placeParsing();
    }
    if (g.rows.length === 0 && !leadsParsing) continue;
    rows.push({ key: `group:${g.stage}`, group: { label: g.label, status: g.status, count: g.count, height: 32 } });
    if (leadsParsing) placeParsing();
    for (const r of g.rows) rows.push(fileRow(r, actions));
  }
  if (!parsingPlaced) {
    rows.push({ key: 'group:not-started', group: { label: COPY.groupLabel['not-started'], status: 'pending', height: 32 } });
    placeParsing();
  }
  return rows;
}

export function DeskScreen() {
  const s = useV2();
  const view = selectDesk(s);
  const { actions } = s;
  return (
    <div className="desk">
      <div className="desk__col">
        <header className="desk__head">
          <h1 className="t-display">{view.title}</h1>
          <p className="desk__summary t-small">{view.summary}</p>
        </header>
        <Table columns={COLUMNS} rows={rowsOf(view, actions)} caption={view.title} stackBelow={760} />
        <DropZone
          label={view.drop.label}
          sub={view.drop.sub}
          chooseLabel={view.drop.chooseLabel}
          disabledReason={view.drop.disabledReason}
          onFile={(f) => actions.upload(f)}
        />
      </div>
    </div>
  );
}
