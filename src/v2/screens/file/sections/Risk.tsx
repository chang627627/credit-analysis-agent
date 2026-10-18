// ---------------------------------------------------------------------------
// Case file · §2 Risk score and rating (spec §7.2 "Section bodies"): the score
// on the single band table with the 75 decline line marked, and the drivers in
// the model's driver tone (never decided here).
// ---------------------------------------------------------------------------

import { Meter } from '../../../kit';
import type { RiskBody } from '../../../model';
import type { FileCtx } from '../FileScreen';
import { Evidence } from './Financials';

const DRIVERS = 'Risk drivers';

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
      <div className="file-risk__score">
        <span className="t-figure-lg">{b.scoreText}</span>
        <span className="file-risk__outof t-meta">{b.outOf}</span>
        <span className="file-risk__rating t-body">{b.rating}</span>
        <Evidence ev={b.evidence} subject={b.scoreText} ctx={ctx} />
      </div>
      <div className="file-risk__meter">
        <Meter kind="risk" value={b.value} tick={b.tick} tone={b.tone} ariaLabel={`${b.scoreText} ${b.outOf} · ${b.rating} · ${b.tickCaption}`} />
        <p className="file-risk__caption t-meta">{b.tickCaption}</p>
      </div>
      {b.drivers.length > 0 ? (
        <ul className="file-drivers" aria-label={DRIVERS}>
          {b.drivers.map((d) => (
            <li key={d.factor} className="file-drivers__row">
              <span className="t-body">{d.factor}</span>
              <span className={`t-small ${DRIVER_CLASS[d.tone]}`}>{d.impact}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
