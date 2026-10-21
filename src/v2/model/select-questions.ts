// ---------------------------------------------------------------------------
// Countersign V2 · the reviewer's questions (THREE-PANE.md R4.5, Mobbin audit
// fix 4). Owner rule: everything displayed goes on the right. A real answer
// about the deal (ComposerReply.memo: the engine's rule-based responder, or a
// deterministic answer composed from the package) is shown in full in the
// memo's Questions block, scratch in the provisional frame after the
// Decision card; the agent panel keeps the "You · …" line and ONE pointer line,
// "Answered in the memo · Questions →". Command acknowledgements, refusals, the
// help line and the stress-test pointer stay one-line panel replies.
//
// The pairs are ThreadEntry answer entries with `qa` set (state/composer.ts
// writes them). The memo block, the file export and the Ledger all read them
// by the run whose package answered (R4.11): the memo lists the questions of
// the run it shows (fileContext), so a re-run starts fresh, a cancelled re-run
// gives the sealed record its questions back, and the memo, the export and the
// Ledger cannot disagree. Only the panel's lines follow the file's epoch.
// Each pair also keeps the package revision that answered, so after a
// send-back an earlier answer says it described rev 1, not the card above it.
// ---------------------------------------------------------------------------

import type { ThreadEntry, V2Store } from '../state/contracts';
import { fmtHM, fmtIso } from './format';
import { fileContext } from './select-file';
import type { QuestionEntryView, QuestionExport, QuestionsView, ThreadAction } from './types';
import { COPY, sectionLinkLabel } from './vocab';

/** The memo anchor of an answered question's entry: the panel's pointer line cues it. */
export function qaAnchor(entryId: string): string {
  return `qa:${entryId}`;
}

/** An answer entry that is a real answer about the deal (the only entries the memo block shows). */
export function isAnsweredQuestion(e: ThreadEntry): e is ThreadEntry & { qa: NonNullable<ThreadEntry['qa']> } {
  return e.role === 'answer' && e.qa != null;
}

/** The source the meta line and the exports name: the engine responder, or Countersign's deterministic answer. */
function sourceOf(e: ThreadEntry): string {
  return e.meta ?? COPY.askMetaEngine;
}

/** The memo card an answer concerns, as a memo link (the same target the panel reply used to carry). */
function linkOf(a: ThreadAction | null): QuestionEntryView['link'] {
  if (!a) return null;
  switch (a.kind) {
    case 'memo':
      return a.target.section === 'header' ? null : { label: a.label, target: a.target };
    case 'decision':
      return { label: sectionLinkLabel('signature'), target: { section: 'signature', anchorId: null } };
    case 'stress':
      return { label: sectionLinkLabel('stress'), target: { section: 'stress', anchorId: null } };
    default:
      return null;
  }
}

type Answered = ThreadEntry & { qa: NonNullable<ThreadEntry['qa']> };

/**
 * The entry's meta line: its source, then (once the run has more than one revision) the revision
 * that answered, "superseded by rev N" when the memo now shows a later one, then the time.
 */
function metaOf(e: Answered, current: number | null, multi: boolean): string {
  const parts = [sourceOf(e)];
  const rev = e.qa.revision;
  if (multi && rev !== null) parts.push(COPY.qaRevision(rev, current !== null && rev < current ? current : null));
  parts.push(fmtHM(e.t));
  return parts.join(' · ');
}

/**
 * The memo's Questions block: the questions answered under the run the memo shows, or null while
 * there are none (no empty placeholder: the block appears with the first answer). Keyed by the run,
 * like the file export and the Ledger, never by the panel's epoch (R4.11).
 */
export function selectQuestions(s: V2Store, dealId: string): QuestionsView | null {
  const ctx = fileContext(s, dealId);
  if (!ctx || ctx.runId === null) return null;
  const list = questionsOfRun(s, ctx.runId).filter((e) => e.dealId === dealId);
  if (list.length === 0) return null;
  const current = ctx.pkg ? ctx.pkg.revision : null;
  const multi = (current ?? 1) > 1 || list.some((e) => (e.qa.revision ?? 1) > 1);
  return {
    eyebrow: COPY.questionsEyebrow,
    aid: COPY.aidLabel,
    entries: list.map((e) => ({
      id: e.id,
      anchorId: qaAnchor(e.id),
      question: e.qa.question,
      answer: e.text,
      meta: metaOf(e, current, multi),
      link: linkOf(e.action),
    })),
  };
}

/** Every answered question asked under this run, oldest first (the Ledger and the file export). */
export function questionsOfRun(s: V2Store, runId: number): Answered[] {
  return (s.ui.thread ?? [])
    .filter(isAnsweredQuestion)
    .filter((e) => e.qa.runId === runId)
    .slice()
    .sort((a, b) => a.t - b.t);
}

/** One answered question as the exports carry it (with the package revision that answered, R4.11). */
export function questionExport(e: Answered): QuestionExport {
  return { question: e.qa.question, answer: e.text, at: fmtIso(e.t), source: sourceOf(e), revision: e.qa.revision };
}
