// ---------------------------------------------------------------------------
// Case file · Recommendation (spec §7.2 "Section bodies"). Written last, shown
// first: the basis, the agent's token (a struck rev-1 token first when
// restructured), the sentence and summary, the five key figures (each traces
// to its row and the tool call behind it) and the analysis aid, which is
// labelled as not part of the memo.
// ---------------------------------------------------------------------------

import { KeyFigure, KeyFigures, LinkButton, Token } from '../../../kit';
import type { RecommendationBody } from '../../../model';
import type { FileCtx } from '../FileScreen';

const KEY_FIGURES = 'Key figures';

export function Recommendation(props: { body: RecommendationBody; ctx: FileCtx }) {
  const { body: b, ctx } = props;
  const a = ctx.actions;
  return (
    <>
      <p className="file-rec__basis t-eyebrow">{b.basis}</p>
      <div className="file-rec__call">
        <span className="file-rec__tokens">
          {b.prior ? (
            <Token tone={b.prior.tone} variant="struck">
              {b.prior.word}
            </Token>
          ) : null}
          <Token tone={b.token.tone}>{b.token.word}</Token>
        </span>
        <p className="file-rec__sentence t-body">{b.sentence}</p>
      </div>
      <p className="file-rec__summary t-body">{b.summary}</p>
      {b.keyFigures.length > 0 ? (
        <KeyFigures ariaLabel={KEY_FIGURES}>
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
              onClick={() => a.trace(k.traceStepId, k.anchorId)}
            />
          ))}
        </KeyFigures>
      ) : null}
      <div className="file-rec__aid">
        <p className="file-rec__aidlabel t-meta">{b.aidLabel}</p>
        <p className="file-rec__flip t-small">
          <span>{b.nearestFlip} </span>
          {ctx.view.rows.stress ? (
            <LinkButton role="small" onClick={ctx.openStress}>
              {b.stressLinkLabel}
            </LinkButton>
          ) : null}
        </p>
      </div>
      {b.reworkLine ? <p className="file-rec__rework t-meta">{b.reworkLine}</p> : null}
    </>
  );
}
