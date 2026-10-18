// Countersign V2 · exhibits (spec §7.3): attached stress tests, solid and part of the memo.
// Derived by the model from this run's auditHistory entries of kind whatif (selectExhibits), so the
// memo and the Ledger cannot disagree. Rendered only when at least one exists; rows enter on mount.
import { SectionHead, Table, Token } from '../../kit';
import type { TableColumn, TableRow } from '../../kit';
import { COPY, STATUS_WORD, selectExhibits } from '../../model';
import type { ExhibitView } from '../../model';
import { useV2 } from '../../state/store';
import type { DecisionBlockProps } from '../../state/screens';

// No header: the labels name the cells for assistive tech only. Two columns fit every width, so
// the table never needs to stack.
const EXHIBIT_COLUMNS: TableColumn[] = [
  { key: 'letter', label: 'Exhibit', width: '40px', srOnlyLabel: true },
  { key: 'record', label: 'Attached stress test', width: '1fr', srOnlyLabel: true },
];

function exhibitRow(e: ExhibitView): TableRow {
  return {
    key: e.id,
    height: 48,
    cells: {
      letter: <span className="decision-enter decision-exhibit__letter decision-ink3 t-figure">{e.letter}</span>,
      record: (
        <span className="decision-enter decision-exhibit">
          <span className="decision-exhibit__line">
            <span className="t-strong">{e.heading}</span>
            <span className="decision-ink3 t-meta">{e.meta}</span>
          </span>
          <span className="decision-exhibit__line">
            <span className="decision-ink2 t-small">{e.detail}</span>
            <span className="decision-exhibit__result">
              <Token tone={e.from.tone} variant="muted">
                {e.from.word}
              </Token>
              <span className="decision-ink3 t-small" aria-hidden="true">
                →
              </span>
              <Token tone={e.to.tone}>{e.to.word}</Token>
              <span className="decision-ink2 t-small">{e.result}</span>
            </span>
          </span>
        </span>
      ),
    },
  };
}

export function Exhibits({ dealId }: DecisionBlockProps) {
  const s = useV2();
  const list = selectExhibits(s, dealId);
  if (list.length === 0) return null;

  return (
    <div className="decision-exhibits">
      <SectionHead ordinal="" heading={COPY.exhibits} status="done" statusLabel={STATUS_WORD.done} anchorId="sec:exhibits" />
      <Table columns={EXHIBIT_COLUMNS} rows={list.map(exhibitRow)} caption={COPY.exhibits} header={false} />
    </div>
  );
}
