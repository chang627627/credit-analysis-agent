// ---------------------------------------------------------------------------
// Case file · the page header (THREE-PANE.md §5.2, §5.11, R2.2), on the canvas
// with no card: eyebrow, borrower (the page's one display line), the meta line
// (facility and amount, CAM id, revision), the prepared line (prepared by,
// when, the CIM and its paragraphs), the cancelled note and the seal row. The
// file's details live here, not in the agent panel. Never a recommendation:
// the seal states only who signed ("You countersigned.") and the receipt; the
// agent's call is stated at the foot, in step 5 and the Decision card.
// ---------------------------------------------------------------------------

import { Chip, LinkButton, StatusLabel } from '../../kit';
import { COPY } from '../../model';
import type { HeaderView } from '../../model';
import type { FileCtx } from './FileScreen';

export function PageHeader(props: { header: HeaderView; ctx: FileCtx }) {
  const { header: h, ctx } = props;
  return (
    <header className="file-header" data-section="header">
      <p className="file-header__eyebrow t-eyebrow">{h.eyebrow}</p>
      <h1 className="file-header__borrower t-display">{h.borrower}</h1>
      <p className="file-header__meta t-small">
        <span>{h.meta}</span>
        {h.uploaded ? <Chip>{COPY.uploadedChip}</Chip> : null}
      </p>
      <p className="file-header__prepared t-meta">{h.prepared}</p>
      {h.cancelled ? (
        <p className="file-header__cancelled t-small">
          <span>{h.cancelled.text} </span>
          <LinkButton role="small" onClick={() => ctx.actions.navigate({ name: 'ledger', file: ctx.dealId })}>
            {h.cancelled.linkLabel}
          </LinkButton>
        </p>
      ) : null}
      {h.seal ? (
        <div className="file-seal">
          <StatusLabel state={h.seal.state} role="strong">
            {h.seal.headline}
          </StatusLabel>
          <p className="file-seal__receipt t-meta">{h.seal.receipt}</p>
        </div>
      ) : null}
    </header>
  );
}
