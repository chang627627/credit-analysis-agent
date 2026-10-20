// ---------------------------------------------------------------------------
// Case file · the foot of a memo section card (THREE-PANE.md R2.2).
//
//   CardFlags   the card's row-less flags (a flag with no figure or covenant
//               row of its own, e.g. "Earnings are highly sensitive to
//               commodity prices", or the Financials evidence check), one
//               marked line each, in emission order. Row flags are marked on
//               their row instead (the breach glyph, the bad-ink value). Each
//               line carries its own data-anchor, so J / K, Signed over and
//               the panel's links can land on it and flash it once.
//   CardFooter  ONE quiet record line under a 1px rule, "Document
//               Intelligence · 94% · 1.1 s" (the confidence in the model's
//               tone), with a "Record" disclosure, collapsed by default,
//               holding the tool's args in, data out and the reasoning. The
//               tool records live here now; the agent panel only points at
//               the card and the Ledger keeps the full trail.
//
// Both render the model's SectionView fields verbatim: no tone, word or number
// is chosen here.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Disclosure, JsonBlock, StatusLabel } from '../../kit';
import { COPY } from '../../model';
import type { SectionFlagLine, SectionFooter } from '../../model';
import type { FileCtx } from './FileScreen';

const CONF_CLASS: Record<SectionFooter['confTone'], string> = {
  'ink-3': 'file-tone-ink3',
  warn: 'file-tone-warn',
  bad: 'file-tone-bad',
};

/** `reveal`: the card's step just returned while you watched; these lines rise in after its blocks. */
export function CardFlags(props: { lines: SectionFlagLine[]; ctx: FileCtx; reveal?: boolean }) {
  const { lines, ctx, reveal = false } = props;
  return (
    <ul className="file-flags" data-reveal={reveal ? '' : undefined}>
      {lines.map((l) => {
        const flash = ctx.flashKeyOf(l.anchorId);
        const cls = ['file-flag'];
        if (flash !== undefined) cls.push('is-flash');
        if (ctx.isHighlighted(l.anchorId)) cls.push('is-highlighted');
        // a new flash key remounts the line, which replays the one-shot flash exactly once
        return (
          <li key={`${l.id}:${flash ?? 0}`} className={cls.join(' ')} data-anchor={l.anchorId}>
            <StatusLabel state={l.state} role="small">
              {l.text}
            </StatusLabel>
          </li>
        );
      })}
    </ul>
  );
}

export function CardFooter(props: { footer: SectionFooter; reveal?: boolean }) {
  const { footer: f, reveal = false } = props;
  const [open, setOpen] = useState(false);
  const r = f.record;
  // the quiet line rides the disclosure's own row (kit `lead`), before the Record trigger; the
  // record unfolds under the whole row. Assistive text reads the line whole.
  const lead = (
    <span className="file-foot__line t-meta">
      <span className="v2-sr">{f.text}</span>
      <span aria-hidden="true">
        {f.tool} · <span className={CONF_CLASS[f.confTone]}>{f.conf}</span> · {f.duration}
      </span>
    </span>
  );
  return (
    <div className="file-foot" data-reveal={reveal ? '' : undefined}>
      <Disclosure label={f.recordLabel} lead={lead} open={open} onToggle={() => setOpen((o) => !o)}>
        <div className="file-record">
          <JsonBlock label={r.argsLabel} count={r.argsCount} value={r.args} />
          <JsonBlock label={r.resultLabel} count={r.resultCount} value={r.result} />
          {r.reasoning ? (
            <div className="file-record__reasoning">
              <p className="file-record__label t-label">{COPY.reasoning}</p>
              <p className="file-record__text t-small">{r.reasoning}</p>
            </div>
          ) : null}
        </div>
      </Disclosure>
    </div>
  );
}
