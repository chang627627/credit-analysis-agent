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
// writes them). The memo block and the panel read the ones since the file's
// epoch (a re-run starts fresh); the file export and the Ledger read them by
// the run whose package answered, so what the reviewer asked before
// countersigning stays on the record.
// ---------------------------------------------------------------------------

import type { ThreadEntry, V2Store } from '../state/contracts';
import { fmtHM, fmtIso } from './format';
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

/** This file's answered questions since its epoch, oldest first. */
export function answeredSinceEpoch(s: V2Store, dealId: string): (ThreadEntry & { qa: NonNullable<ThreadEntry['qa']> })[] {
  const epoch = (s.ui.threadEpoch ?? {})[dealId];
  return (s.ui.thread ?? [])
    .filter(isAnsweredQuestion)
    .filter((e) => e.dealId === dealId && (epoch === undefined || e.t >= epoch))
    .slice()
    .sort((a, b) => a.t - b.t);
}

/**
 * The memo's Questions block, or null while the file has no answered question since its epoch
 * (no empty placeholder: the block appears with the first answer).
 */
export function selectQuestions(s: V2Store, dealId: string): QuestionsView | null {
  const list = answeredSinceEpoch(s, dealId);
  if (list.length === 0) return null;
  return {
    eyebrow: COPY.questionsEyebrow,
    aid: COPY.aidLabel,
    entries: list.map((e) => ({
      id: e.id,
      anchorId: qaAnchor(e.id),
      question: e.qa.question,
      answer: e.text,
      meta: `${sourceOf(e)} · ${fmtHM(e.t)}`,
      link: linkOf(e.action),
    })),
  };
}

/** Every answered question asked under this run, oldest first (the Ledger and the file export). */
export function questionsOfRun(s: V2Store, runId: number): (ThreadEntry & { qa: NonNullable<ThreadEntry['qa']> })[] {
  return (s.ui.thread ?? [])
    .filter(isAnsweredQuestion)
    .filter((e) => e.qa.runId === runId)
    .slice()
    .sort((a, b) => a.t - b.t);
}

/** One answered question as the exports carry it. */
export function questionExport(e: ThreadEntry & { qa: NonNullable<ThreadEntry['qa']> }): QuestionExport {
  return { question: e.qa.question, answer: e.text, at: fmtIso(e.t), source: sourceOf(e) };
}
