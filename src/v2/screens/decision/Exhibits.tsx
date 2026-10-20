// Countersign V2 · exhibits (spec §7.3; THREE-PANE.md §5.4): attached stress tests, solid and part
// of the memo. FileScreen's exhibits slot, rendered inside its MemoCard section="exhibits": the
// card head (eyebrow "Attached by the reviewer", title "Exhibits") and the table, which the card
// body spaces 24px apart. Derived by the model from this run's auditHistory entries of kind whatif
// (selectExhibits), so the memo, the thread and the Ledger cannot disagree. Rendered only when at
// least one exists; rows enter on mount. The head answers the memo cue itself (useHeadCue), since
// FileScreen cannot pass a flash key into a slot.
import { SectionHead, Table, Token } from '../../kit';
import type { TableColumn, TableRow } from '../../kit';
import { COPY, selectExhibits } from '../../model';
import type { ExhibitView } from '../../model';
import { useV2 } from '../../state/store';
import type { DecisionBlockProps } from '../../state/screens';
import { useHeadCue } from './useHeadCue';

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
  const head = useHeadCue('exhibits');
  if (list.length === 0) return null;

  return (
    <>
      <SectionHead
        eyebrow={COPY.exhibitsEyebrow}
        heading={COPY.exhibits}
        anchorId="sec:exhibits"
        flashKey={head.flashKey}
        highlighted={head.highlighted}
      />
      <Table columns={EXHIBIT_COLUMNS} rows={list.map(exhibitRow)} caption={COPY.exhibits} header={false} />
    </>
  );
}
