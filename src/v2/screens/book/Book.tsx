// ---------------------------------------------------------------------------
// Countersign V2 · Book (spec §7.4). The live covenant state of every file from
// the always-on Portfolio Monitor, with open items grouped under their file.
// It renders selectBook output verbatim: every fact, number and sentence comes
// from the model. The screen calls only navigate, sweepNow, acknowledge and
// markHandedOff. The Book has no primary.
// ---------------------------------------------------------------------------
import type { ReactNode } from 'react';
import { Button, EmptyNote, LinkButton, Meter, StatusLabel, Table } from '../../kit';
import type { TableColumn, TableRow } from '../../kit';
import { selectBook } from '../../model';
import type { BookItem, BookRow } from '../../model';
import { useV2 } from '../../state/store';
import type { V2Actions } from '../../state/store';

const CUSHION_LABEL = 'Cushion';

/** Spec §7.4 column set. Tests, Risk and Checked hide below 760. */
const COLUMNS: TableColumn[] = [
  { key: 'file', label: 'File', width: '1fr' },
  { key: 'status', label: 'Status', width: '104px' },
  { key: 'tightest', label: 'Tightest covenant', width: '240px' },
  { key: 'cushion', label: CUSHION_LABEL, width: '136px', align: 'end' },
  { key: 'tests', label: 'Tests', width: '128px', align: 'end', hideBelow: 760 },
  { key: 'risk', label: 'Risk', width: '56px', align: 'end', hideBelow: 760 },
  { key: 'checked', label: 'Checked', width: '64px', align: 'end', hideBelow: 760 },
];

const TABLE_CAPTION = 'Covenant state by file';
const SEP = ' · ';

const TONE_CLASS: Record<'ink' | 'neutral' | 'warn' | 'bad', string> = {
  ink: 'book-tone--ink',
  neutral: 'book-tone--ink',
  warn: 'book-tone--warn',
  bad: 'book-tone--bad',
};

const joinParts = (...parts: (string | null | undefined)[]): string =>
  parts.filter((p): p is string => typeof p === 'string' && p !== '').join(SEP);

function Dash() {
  return (
    <span className="book-dash" aria-hidden="true">
      –
    </span>
  );
}

function FileCell({ row }: { row: BookRow }) {
  return (
    <span className="book-file">
      <span className="book-file__name t-strong">{row.name}</span>
      <span className="book-file__sub">
        <span className="book-file__borrower t-small">{row.borrower}</span>
        {row.resolvedMeta ? <span className="book-file__meta t-meta">{row.resolvedMeta}</span> : null}
      </span>
    </span>
  );
}

function TightestCell({ row }: { row: BookRow }) {
  if (!row.tightest) return <Dash />;
  return (
    <span className="book-tight">
      <span className="book-tight__name">{row.tightest.name}</span>
      <span className="book-tight__reading t-small">{row.tightest.reading}</span>
    </span>
  );
}

function CushionCell({ row }: { row: BookRow }) {
  const c = row.cushion;
  if (!c) return <Dash />;
  return (
    <span className="book-cushion">
      <span className={TONE_CLASS[c.tone]}>{c.text}</span>
      <Meter kind="cushion" pct={c.pct} tone={c.tone} ariaLabel={joinParts(CUSHION_LABEL, row.tightest?.name, c.text)} />
    </span>
  );
}

function ItemActions({ item, row, actions }: { item: BookItem; row: BookRow; actions: V2Actions }) {
  const link = item.link;
  const act = item.action;
  if (!link && !act && !item.doneText) return <span className="book-subrow__actions" />;
  return (
    <span className="book-subrow__actions">
      {link ? (
        <LinkButton role="small" onClick={() => actions.navigate(link.route)} ariaLabel={joinParts(link.label, row.name)}>
          {link.label}
        </LinkButton>
      ) : null}
      {act ? (
        <Button
          variant={act.kind === 'mark-handed-off' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => (act.kind === 'mark-handed-off' ? actions.markHandedOff(item.id) : actions.acknowledge(item.id))}
          ariaLabel={joinParts(act.label, row.name, item.covenant)}
        >
          {act.label}
        </Button>
      ) : null}
      {item.doneText ? <span className="book-subrow__done t-small">{item.doneText}</span> : null}
    </span>
  );
}

/** One open or acknowledged item, laid out on the screen's own .book-subrow grid inside a span row. */
function SubRow({ item, row, actions }: { item: BookItem; row: BookRow; actions: V2Actions }) {
  const status = (
    <span className="book-subrow__status">
      <StatusLabel state={item.status.state} role="small">
        {item.status.text}
      </StatusLabel>
    </span>
  );
  if (item.origin === 'countersign') {
    const text = joinParts(item.covenant, item.reading, item.distance, item.raised);
    return (
      <div className="book-sub" data-item={item.id}>
        <div className="book-subrow book-subrow--routed">
          {status}
          <span className="book-subrow__text t-small">
            {text ? (
              <>
                <span className="book-sep" aria-hidden="true">
                  {SEP}
                </span>
                {text}
              </>
            ) : null}
          </span>
          <ItemActions item={item} row={row} actions={actions} />
        </div>
      </div>
    );
  }
  return (
    <div className="book-sub" data-item={item.id}>
      <div className="book-subrow">
        {status}
        <span className="book-subrow__covenant t-small">{item.covenant}</span>
        <span className="book-subrow__reading t-figure">{item.reading}</span>
        <span className="book-subrow__distance t-small">{item.distance}</span>
        <span className="book-subrow__raised t-meta">{item.raised}</span>
        <ItemActions item={item} row={row} actions={actions} />
      </div>
    </div>
  );
}

function rowsOf(rows: BookRow[], actions: V2Actions): TableRow[] {
  const out: TableRow[] = [];
  for (const row of rows) {
    const cells: Record<string, ReactNode> = {
      file: <FileCell row={row} />,
      status: <StatusLabel state={row.status.state}>{row.status.text}</StatusLabel>,
      tightest: <TightestCell row={row} />,
      cushion: <CushionCell row={row} />,
      tests: row.tests,
      risk: <span className={TONE_CLASS[row.risk.tone]}>{row.risk.text}</span>,
      checked: <span className="book-checked">{row.checked}</span>,
    };
    out.push({
      key: `deal:${row.dealId}`,
      cells,
      height: 48,
      onActivate: () => actions.navigate({ name: 'file', dealId: row.dealId, at: 'monitoring' }),
      ariaLabel: joinParts(row.name, row.status.text, row.tightest?.name, row.cushion?.text, row.tests),
    });
    for (const item of row.items) {
      out.push({
        key: `item:${item.id}`,
        span: <SubRow item={item} row={row} actions={actions} />,
        indent: true,
        height: 36,
        muted: item.muted,
      });
    }
  }
  return out;
}

export function BookScreen() {
  const s = useV2();
  const view = selectBook(s);
  const actions = s.actions;

  return (
    <div className="book">
      <div className="book__col">
        <header className="book__intro">
          <div className="book__head">
            <h1 className="book__title t-display">{view.title}</h1>
            <div className="book__cadence">
              <span className="book__cadence-text t-small">{view.cadence}</span>
              <Button variant="secondary" size="sm" onClick={() => actions.sweepNow()} disabled={view.sweepDisabled}>
                {view.sweepLabel}
              </Button>
            </div>
          </div>
          <div className="book__summary">
            {view.verdict ? (
              <div className="book__verdict">
                <StatusLabel state={view.verdict.state} role="strong">
                  {view.verdict.text}
                </StatusLabel>
              </div>
            ) : null}
            <p className="book__disclosure t-meta">{view.disclosure}</p>
          </div>
        </header>
        {view.empty ? (
          <div className="book__empty">
            <EmptyNote>{view.empty}</EmptyNote>
          </div>
        ) : (
          <Table columns={COLUMNS} rows={rowsOf(view.rows, actions)} caption={TABLE_CAPTION} stackBelow={760} />
        )}
      </div>
    </div>
  );
}
