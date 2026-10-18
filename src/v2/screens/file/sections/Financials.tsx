// ---------------------------------------------------------------------------
// Case file · §1 Financials (spec §7.2 "Section bodies", §1 pillar 1). Eight
// figures, each with exactly one evidence class: Quoted ¶NN (a cite that opens
// the source on that span), Derived (the formula, every operand its own cite),
// Unquoted · extracted, or Model output. `Evidence` is shared with §2 Risk.
// ---------------------------------------------------------------------------

import type { ReactNode } from 'react';
import { Cite, EvidenceTag, Table } from '../../../kit';
import type { TableColumn, TableRow } from '../../../kit';
import type { EvidenceView, FigureRow } from '../../../model';
import type { FileCtx } from '../FileScreen';

const COLUMNS: TableColumn[] = [
  { key: 'figure', label: 'Figure', width: '1fr' },
  { key: 'value', label: 'Value', width: '120px', align: 'end' },
  { key: 'evidence', label: 'Evidence', width: '240px' },
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

export function Financials(props: { rows: FigureRow[]; heading: string; ctx: FileCtx }) {
  const { rows, heading, ctx } = props;
  const tableRows: TableRow[] = rows.map((r) => ({
    key: r.id,
    anchorId: r.anchorId,
    height: 36,
    highlighted: ctx.isHighlighted(r.anchorId),
    flashKey: ctx.flashKeyOf(r.anchorId),
    cells: {
      figure: <span className="t-body">{r.label}</span>,
      value: r.value,
      evidence: <Evidence ev={r.evidence} subject={`${r.label} ${r.value}`} ctx={ctx} />,
    },
  }));
  return <Table columns={COLUMNS} rows={tableRows} caption={heading} stackBelow={ctx.stackTables ? 760 : undefined} />;
}
