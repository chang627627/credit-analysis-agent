// ---------------------------------------------------------------------------
// Case file · the reviewer's questions (THREE-PANE.md R4.5, P-33). Owner rule:
// everything displayed goes on the right. A real answer about the deal is
// shown here in full; the agent panel keeps the "You · …" line and one pointer
// line, "Answered in the memo · Questions →", that scrolls here and flashes the
// entry once (cueMemo, anchor 'qa:<entryId>').
//
// Scratch, not the record of the memo: the provisional frame like the
// stress test, never a MemoCard, after the Decision card and before the stress
// test (the Decision card stays right after step 5). It exists only while the
// run the memo shows has an answered question (no empty placeholder; R4.11).
// Each entry: the question as its head, the full answer, one quiet meta line
// (the source, the revision once there is more than one, and the time) and,
// when the answer concerns a memo card, that card's
// link. Renders selectQuestions verbatim and calls only store actions.
// ---------------------------------------------------------------------------

import { useId } from 'react';
import { LinkButton } from '../../kit';
import type { QuestionsView } from '../../model';
import type { FileCtx } from './FileScreen';

export function Questions(props: { view: QuestionsView; ctx: FileCtx }) {
  const { view, ctx } = props;
  const headingId = useId();
  return (
    <section className="file-qa" aria-labelledby={headingId} data-pattern="P-33">
      <div className="file-qa__head">
        <h2 id={headingId} className="file-tone-ink3 t-eyebrow">
          {view.eyebrow}
        </h2>
        <p className="file-tone-ink2 t-small">{view.aid}</p>
      </div>
      <ol className="file-qa__list">
        {view.entries.map((e) => {
          const flash = ctx.flashKeyOf(e.anchorId);
          const cls = ['file-qa__entry'];
          if (flash !== undefined) cls.push('is-flash');
          if (ctx.isHighlighted(e.anchorId)) cls.push('is-highlighted');
          const link = e.link;
          // a new flash key remounts the entry, which replays the one-shot flash exactly once
          return (
            <li key={`${e.id}:${flash ?? 0}`} className={cls.join(' ')} data-anchor={e.anchorId}>
              <p className="file-qa__question t-strong">{e.question}</p>
              <p className="file-qa__answer t-body">{e.answer}</p>
              <p className="file-qa__meta t-meta">
                <span className="file-tone-ink3">{e.meta}</span>
                {link ? (
                  <LinkButton role="meta" onClick={() => ctx.actions.cueMemo(link.target)}>
                    {link.label}
                  </LinkButton>
                ) : null}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
