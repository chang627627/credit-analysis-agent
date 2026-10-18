// ---------------------------------------------------------------------------
// Case file · the page header row (spec §7.2 "Page header row"): eyebrow,
// borrower, meta and prepared lines, the cancelled note and the seal row; and
// its margin cell: "Show all reasoning", Ask about this file (live file only,
// one merged thread) and the deterministic evidence-check note.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Chip, LinkButton, StatusLabel, Switch, TextInput } from '../../kit';
import { COPY } from '../../model';
import type { AskView, FileView, HeaderView } from '../../model';
import type { FileCtx } from './FileScreen';
import { Notes } from './Margin';

const YOU = 'You';

export function PageHeader(props: { header: HeaderView; ctx: FileCtx }) {
  const { header: h, ctx } = props;
  return (
    <header className="file-header">
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

export function HeaderMargin(props: { view: FileView; ask: AskView; ctx: FileCtx }) {
  const { view, ask, ctx } = props;
  const a = ctx.actions;
  const m = view.headerMargin;
  const [question, setQuestion] = useState('');

  const submit = () => {
    const q = question.trim();
    if (!q || !ask.enabled) return;
    a.ask(ctx.dealId, q);
    setQuestion('');
  };

  return (
    <>
      <label className="file-reasoning">
        <Switch checked={m.showReasoning} onChange={(v) => a.setShowReasoning(v)} ariaLabel={m.reasoningLabel} />
        <span className="t-label" aria-hidden="true">
          {m.reasoningLabel}
        </span>
      </label>

      <div className="file-ask">
        <TextInput
          value={question}
          onChange={setQuestion}
          onSubmit={submit}
          placeholder={ask.placeholder}
          ariaLabel={ask.placeholder}
          icon={MessageSquare}
          disabled={!ask.enabled}
        />
        {!ask.enabled && ask.disabledReason ? <p className="file-ask__reason t-meta">{ask.disabledReason}</p> : null}
        {ask.thread.length > 0 ? (
          <ol className="file-thread" aria-label={ask.placeholder}>
            {ask.thread.map((entry) =>
              entry.role === 'you' ? (
                <li key={entry.id} className="file-thread__you t-small">
                  <span className="file-thread__who t-label">{YOU}</span> {entry.text}
                </li>
              ) : (
                <li key={entry.id} className="file-thread__answer">
                  <p className="t-small">{entry.text}</p>
                  {entry.meta ? <p className="file-thread__meta t-meta">{entry.meta}</p> : null}
                </li>
              ),
            )}
          </ol>
        ) : null}
      </div>

      {m.evidenceCheck ? <Notes notes={[m.evidenceCheck]} ctx={ctx} /> : null}
    </>
  );
}
