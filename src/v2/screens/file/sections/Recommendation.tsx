// ---------------------------------------------------------------------------
// Case file · Step 5 Recommendation (THREE-PANE.md §5.4, §5.5, R2.2), at the
// foot of the memo, directly above the Decision card. The card's takeaway
// carries the agent's token (a struck rev-1 token first when restructured),
// the sentence and the basis. Labelled blocks: "Summary", "Key figures" (each
// figure takes the reader to the memo row or card it came from and flashes
// it; the tool record behind it is that card's footer Record) and "Analysis
// aid · not part of the memo" (the nearest flip and the stress link). The
// rework line stays under them when present.
// ---------------------------------------------------------------------------

import { KeyFigure, KeyFigures, LinkButton } from '../../../kit';
import type { KeyFigureView, RecommendationBody } from '../../../model';
import type { FileCtx } from '../FileScreen';

export function Recommendation(props: { body: RecommendationBody; ctx: FileCtx }) {
  const { body: b, ctx } = props;
  const a = ctx.actions;

  // memo → memo: the figure's own row (or card head), scrolled to and flashed once
  const trace = (k: KeyFigureView) => a.cueMemo(k.target);

  return (
    <>
      <div className="file-block">
        <p className="file-block__label t-label">{b.summaryLabel}</p>
        <p className="file-rec__summary t-body">{b.summary}</p>
      </div>
      {b.keyFigures.length > 0 ? (
        <div className="file-block">
          <p className="file-block__label t-label">{b.keyFiguresLabel}</p>
          <KeyFigures ariaLabel={b.keyFiguresLabel}>
            {b.keyFigures.map((k) => (
              <KeyFigure
                key={k.anchorId}
                label={k.label}
                value={k.value}
                sub={k.sub}
                caption={k.caption}
                tone={k.tone}
                dot={k.dot}
                evidence={k.evidenceText}
                ariaLabel={k.ariaLabel}
                onClick={() => trace(k)}
              />
            ))}
          </KeyFigures>
        </div>
      ) : null}
      <div className="file-block">
        <p className="file-block__label t-label">{b.aidLabel}</p>
        <p className="file-rec__flip t-small">
          <span>{b.nearestFlip} </span>
          {ctx.view.rows.stress ? (
            <LinkButton role="small" onClick={() => a.openStress(ctx.dealId)}>
              {b.stressLinkLabel}
            </LinkButton>
          ) : null}
        </p>
      </div>
      {b.reworkLine ? <p className="file-rec__rework t-meta">{b.reworkLine}</p> : null}
    </>
  );
}
