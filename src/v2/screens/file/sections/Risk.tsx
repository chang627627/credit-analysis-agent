// ---------------------------------------------------------------------------
// Case file · Step 2 Risk score and rating (THREE-PANE.md §5.4, §5.6). Two
// labelled blocks: "Score" (one line, the score in t-figure, /100, the rating
// and its model evidence; then the risk meter with the 75 decline line
// marked) and "Drivers" (the factor list in the model's driver tones). The
// score stays in ink at the body's size: the 18px role belongs to section
// titles alone. The meter fill and the decline tick are the one emphasis.
// ---------------------------------------------------------------------------

import { Meter } from '../../../kit';
import type { RiskBody } from '../../../model';
import type { FileCtx } from '../FileScreen';
import { Evidence } from './Financials';

const DRIVER_CLASS: Record<RiskBody['drivers'][number]['tone'], string> = {
  good: 'file-tone-good',
  warn: 'file-tone-warn',
  bad: 'file-tone-bad',
  'ink-2': 'file-tone-ink2',
};

export function Risk(props: { body: RiskBody; ctx: FileCtx }) {
  const { body: b, ctx } = props;
  return (
    <>
      <div className="file-block">
        <p className="file-block__label t-label">{b.scoreLabel}</p>
        <div className="file-risk__score">
          <span className="file-risk__value t-figure">{b.scoreText}</span>
          <span className="file-risk__outof t-meta">{b.outOf}</span>
          <span className="file-risk__rating t-body">{b.rating}</span>
          <Evidence ev={b.evidence} subject={b.scoreText} ctx={ctx} />
        </div>
        <div className="file-risk__meter">
          <Meter kind="risk" value={b.value} tick={b.tick} tone={b.tone} ariaLabel={`${b.scoreText} ${b.outOf} · ${b.rating} · ${b.tickCaption}`} />
          <p className="file-risk__caption t-meta">{b.tickCaption}</p>
        </div>
      </div>
      {b.drivers.length > 0 ? (
        <div className="file-block">
          <p className="file-block__label t-label">{b.driversLabel}</p>
          <ul className="file-drivers" aria-label={b.driversLabel}>
            {b.drivers.map((d) => (
              <li key={d.factor} className="file-drivers__row">
                <span className="t-body">{d.factor}</span>
                <span className={`t-small ${DRIVER_CLASS[d.tone]}`}>{d.impact}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
