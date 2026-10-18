// ---------------------------------------------------------------------------
// Case file · the margin (spec §7.2 "Stub anatomy", "Margin notes", §3 floor).
// One margin cell per memo row. At 1000px and up it is the 280px column beside
// the page; below 1000px the same cell renders inside the paper, directly under
// its section, as a "Notes" block (file.css). A margin cell with nothing in it
// is marked data-empty so the narrow layout drops it.
// ---------------------------------------------------------------------------

import type { ReactNode } from 'react';
import { Disclosure, JsonBlock, MarginNote } from '../../kit';
import { COPY } from '../../model';
import type { NoteView, StubView } from '../../model';
import type { FileCtx } from './FileScreen';

/** Visible only when the margin folds into the paper (below 1000px). */
const NOTES_LABEL = 'Notes';

const CONF_CLASS: Record<StubView['confTone'], string> = {
  'ink-3': 'file-tone-ink3',
  warn: 'file-tone-warn',
  bad: 'file-tone-bad',
};

export function MarginCell(props: { children?: ReactNode; empty: boolean }) {
  return (
    <div className="file-margincell" data-empty={props.empty ? '' : undefined}>
      {props.empty ? null : <p className="file-margincell__label t-label">{NOTES_LABEL}</p>}
      {props.empty ? null : props.children}
    </div>
  );
}

/**
 * The raw tool record behind a section: tool, measured duration and
 * confidence, the args/result JSON (persistent Copy) and the reasoning.
 */
export function Stub(props: { stub: StubView; ctx: FileCtx }) {
  const { stub, ctx } = props;
  // the model writes "1.1 s · 94%": the duration stays ink-3, the confidence takes confTone
  const cut = stub.meta.lastIndexOf(' · ');
  const lead = cut >= 0 ? stub.meta.slice(0, cut + 3) : '';
  const conf = cut >= 0 ? stub.meta.slice(cut + 3) : stub.meta;
  const recordOpen = ctx.isRecordOpen(stub.stepId);
  const reasoningOpen = ctx.isReasoningOpen(stub.stepId);
  return (
    <div className="file-stub" data-stub={stub.stepId}>
      <p className="file-stub__tool t-label">{stub.tool}</p>
      <p className="file-stub__meta t-meta">
        {lead ? <span className="file-tone-ink3">{lead}</span> : null}
        <span className={CONF_CLASS[stub.confTone]}>{conf}</span>
      </p>
      <Disclosure
        label={COPY.record}
        meta={stub.recordMeta}
        open={recordOpen}
        onToggle={() => ctx.setRecordOpen(stub.stepId, !recordOpen)}
      >
        <div className="file-stub__json">
          <JsonBlock label={stub.argsLabel} count={stub.argsCount} value={stub.args} />
          <JsonBlock label={stub.resultLabel} count={stub.resultCount} value={stub.result} />
        </div>
      </Disclosure>
      {stub.reasoning ? (
        <Disclosure
          label={COPY.reasoning}
          open={reasoningOpen}
          onToggle={() => ctx.setReasoningOpen(stub.stepId, !reasoningOpen)}
        >
          <p className="file-stub__reasoning t-small">{stub.reasoning}</p>
        </Disclosure>
      ) : null}
    </div>
  );
}

/** One MarginNote per NoteView, wired to Show row / Trace / Amend term. */
export function Notes(props: { notes: NoteView[]; ctx: FileCtx }) {
  const { notes, ctx } = props;
  return (
    <>
      {notes.map((n) => (
        <MarginNote
          key={n.id}
          id={n.id}
          tone={n.tone}
          status={n.status}
          heading={n.heading}
          meta={n.meta || undefined}
          active={ctx.isNoteActive(n)}
          onHover={(on) => ctx.hoverNote(on ? n.anchorId : null)}
          actions={n.actions.map((act) => ({ label: act.label, onClick: () => ctx.noteAction(n, act.kind) }))}
        >
          {n.text}
        </MarginNote>
      ))}
    </>
  );
}
