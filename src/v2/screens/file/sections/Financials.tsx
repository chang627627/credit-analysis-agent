// ---------------------------------------------------------------------------
// Case file · Step 1 Financials (THREE-PANE.md §5.4, §5.6). Two labelled
// blocks on one column template: "Size" (revenue, Adj. EBITDA, margin, total
// debt) and "Tested by covenants" (leverage, interest and fixed-charge
// coverage, liquidity; no header band of its own). Each figure carries
// exactly one evidence class in the Source column: Quoted (a cite that opens
// the source on that span), Derived (the formula, every operand its own
// cite), Not in the CIM · extraction model (class unquoted, THREE-PANE
// R4.3), or Model output. A tested figure that breaches its filed covenant
// is the section's one emphasis: the breach glyph before its label and the
// value in bad-ink, both decided by the model. The table stacks under 480px
// of its own width. `Evidence` is shared with Risk.
// ---------------------------------------------------------------------------

import type { ReactNode } from 'react';
import { Cite, EvidenceTag, StatusGlyph, Table } from '../../../kit';
import type { TableColumn, TableRow } from '../../../kit';
import { STATUS_WORD } from '../../../model';
import type { EvidenceView, FigureRow } from '../../../model';
import type { FileCtx } from '../FileScreen';

const COLUMNS: TableColumn[] = [
  { key: 'figure', label: 'Figure', width: '1fr' },
  { key: 'value', label: 'Value', width: '120px', align: 'end' },
  { key: 'evidence', label: 'Source', width: '200px' },
];

/** One evidence class, rendered with its cites (never inside a button). */
export function Evidence(props: { ev: EvidenceView; subject: string; ctx: FileCtx }) {
  const { ev, subject, ctx } = props;
  switch (ev.cls) {
    case 'quoted':
      return (
        <EvidenceTag cls="quoted" text={ev.text}>
          <Cite
            label={ev.paraLabel}
            active={ctx.activeMarkId === ev.markId}
            ariaLabel={`Show ${subject} in the source, ${ev.paraLabel}`}
            onClick={() => ctx.cite(ev.citeIndex)}
          />
        </EvidenceTag>
      );
    case 'derived': {
      // print the formula inline; each operand found in it becomes a cite
      const parts: ReactNode[] = [];
      let rest = ev.formula;
      ev.operands.forEach((op, i) => {
        const at = op.text ? rest.indexOf(op.text) : -1;
        if (at < 0) return;
        if (at > 0) parts.push(<span key={`t${i}`}>{rest.slice(0, at)}</span>);
        const citeIndex = op.citeIndex;
        parts.push(
          op.markId !== null && citeIndex !== null ? (
            <Cite
              key={`c${i}`}
              label={op.text}
              active={ctx.activeMarkId === op.markId}
              ariaLabel={`Show ${op.text} in the source`}
              onClick={() => ctx.cite(citeIndex)}
            />
          ) : (
            <span key={`c${i}`}>{op.text}</span>
          ),
        );
        rest = rest.slice(at + op.text.length);
      });
      if (rest) parts.push(<span key="tail">{rest}</span>);
      return (
        <EvidenceTag cls="derived" text={ev.text}>
          <span className="file-formula">{parts}</span>
        </EvidenceTag>
      );
    }
    case 'unquoted':
      return <EvidenceTag cls="unquoted" text={ev.text} />;
    case 'model':
    default:
      return <EvidenceTag cls="model" text={ev.text} />;
  }
}

function figureRow(r: FigureRow, ctx: FileCtx): TableRow {
  return {
    key: r.id,
    anchorId: r.anchorId,
    height: 36,
    highlighted: ctx.isHighlighted(r.anchorId),
    flashKey: ctx.flashKeyOf(r.anchorId),
    cells: {
      figure: (
        <span className="file-figure">
          {r.mark ? <StatusGlyph state={r.mark} srLabel={STATUS_WORD[r.mark]} /> : null}
          <span className="t-body">{r.label}</span>
        </span>
      ),
      value: <span className={r.valueTone === 'bad' ? 'file-tone-bad' : undefined}>{r.value}</span>,
      evidence: <Evidence ev={r.evidence} subject={`${r.label} ${r.value}`} ctx={ctx} />,
    },
  };
}

export function Financials(props: { rows: FigureRow[]; labels: { size: string; tested: string }; ctx: FileCtx }) {
  const { rows, labels, ctx } = props;
  const size = rows.filter((r) => r.group === 'size');
  const tested = rows.filter((r) => r.group === 'tested');
  return (
    <>
      {size.length > 0 ? (
        <div className="file-block">
          <p className="file-block__label t-label">{labels.size}</p>
          <Table columns={COLUMNS} rows={size.map((r) => figureRow(r, ctx))} caption={labels.size} stackBelow={480} />
        </div>
      ) : null}
      {tested.length > 0 ? (
        <div className="file-block">
          <p className="file-block__label t-label">{labels.tested}</p>
          <Table
            columns={COLUMNS}
            rows={tested.map((r) => figureRow(r, ctx))}
            caption={labels.tested}
            header={false}
            stackBelow={480}
          />
        </div>
      ) : null}
    </>
  );
}
