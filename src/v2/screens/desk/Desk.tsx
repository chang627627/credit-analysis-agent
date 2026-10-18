// ---------------------------------------------------------------------------
// Countersign V2 · Desk (spec §7.1). One calm list of every case file, grouped
// by the stage the engine reports, plus the CIM drop zone. A pure reduction of
// `selectDesk(s)`: every word, number and tone arrives composed by the model;
// this file only lays it out and maps clicks onto `s.actions`.
// ---------------------------------------------------------------------------
import { Button, Chip, ConfirmStrip, DropZone, LinkButton, StatusLabel, Table, Token } from '../../kit';
import type { TableColumn, TableRow } from '../../kit';
import { COPY, selectDesk } from '../../model';
import type { DeskRow, DeskView, Route } from '../../model';
import { useV2 } from '../../state/store';
import type { V2Actions } from '../../state/store';

/**
 * Column template from §7.1. Facility reappears under the borrower whenever its column hides:
 * below a 1120 viewport (kit) and whenever the TABLE is narrower than 1036 (desk.css container
 * query), since the sidebar takes 216 (or the 64 rail) out of the viewport.
 * Action is 208: the md primary "Review and countersign" measures about 175 to 178 with its
 * 1px border and 12 + 12 padding, and the cell pads 12 + 12, so 192 left it 168 and ellipsized
 * the screen's one primary. File keeps its 1fr share, 222 at the 1040 column, above the 220
 * floor; desk.css hides Facility below a 1036 table (where File would drop under 220). File's
 * own floor is 144 so that, once Facility hides, the row (144 + 88 + 120 + 200 + 208 = 760)
 * fits every table width down to the 760 stack point instead of clipping the Action column.
 */
const COLUMNS: TableColumn[] = [
  { key: 'file', label: 'File', width: 'minmax(144px, 1fr)' },
  { key: 'facility', label: 'Facility', width: '200px', hideBelow: 1120 },
  { key: 'leverage', label: 'Leverage', width: '88px', align: 'end' },
  { key: 'call', label: "Agent's call", width: '120px' },
  { key: 'stage', label: 'Stage', width: '200px' },
  { key: 'action', label: 'Action', width: '208px', align: 'end' },
];

type DeskAction = NonNullable<DeskRow['action']>;

/** Where each row action leads. Starts go through the store so the confirm and parsing guards apply. */
function runAction(actions: V2Actions, dealId: string, kind: DeskAction['kind']) {
  const go = (to: Route) => actions.navigate(to);
  switch (kind) {
    case 'review':
      // review starts at step 1; the recommendation sits at the foot, above the signature
      go({ name: 'file', dealId, at: 'financials' });
      return;
    case 'open-record':
      go({ name: 'file', dealId, at: 'signature' });
      return;
    case 'open-plan':
    case 'open':
      go({ name: 'file', dealId, at: null });
      return;
    case 'draft':
    case 're-run':
      actions.startFile(dealId);
      return;
  }
}

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
  const action = row.action;
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
      action: action ? (
        <span className="desk-action">
          <Button
            variant={action.variant}
            size={action.variant === 'primary' ? 'md' : 'sm'}
            disabled={action.disabled}
            onClick={() => runAction(actions, row.dealId, action.kind)}
          >
            {action.label}
          </Button>
        </span>
      ) : null,
    },
    detail: row.confirm ? (
      <ConfirmStrip
        text={row.confirm.text}
        confirmLabel={row.confirm.confirmLabel}
        cancelLabel={row.confirm.cancelLabel}
        tone={row.confirm.tone}
        onConfirm={() => actions.confirmStart()}
        onCancel={() => actions.cancelConfirm()}
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
