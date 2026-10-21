// ---------------------------------------------------------------------------
// The composer's execution (THREE-PANE.md §4.3, §4.4, §6.3 #6). The model
// parses (parseComposer) and words every reply (composerReply, answerFor);
// this file runs the intent through the existing guarded actions and writes
// the thread entries. It never signs, returns, rejects, amends or writes the
// reviewer note: those intents arrive as refusals from the model.
//
// Integrity rule (state/gate.ts): any composer use on the live file is
// engagement. A submit holds a running countdown BEFORE anything executes
// (the clean-approval countdown at the gate, the plan auto-start countdown in
// plan review), questions and refusals included, so no countdown can fire
// while a typed question or refusal sits in the thread. Typing a non-blank
// draft engages the same way, exactly like typing in the reviewer note.
//
// One echo: submitComposer writes the only `you` entry, and the reply is the
// only answer (no mirror of the engine's messages).
//
// R4.5: a real answer about the deal (ComposerReply.memo) is written with `qa`
// (the question as typed and the run that answered it). The memo's Questions
// block shows it in full and the panel only points at it; in column mode the
// memo brings the new entry into view and flashes it once (scroll only: focus
// stays in the composer, so a stray key can never sign).
// ---------------------------------------------------------------------------

import { answerFor, composerContext, composerReply, parseComposer, qaAnchor, selectLiveDealId } from '../model';
import type { ComposerOutcome, ComposerReply } from '../model';
import type { ThreadEntry, V2Actions, V2Internals } from './store';
import { holdAuto } from './gate';
import { closeDrawerIn, layoutOf } from './panes';

/** The thread keeps the last 300 entries (THREE-PANE.md §4.4). */
const THREAD_CAP = 300;
/** Answered questions are on the record (the Ledger, the file export): the cap drops them last, keeping up to 500 (R4.5). */
const QA_CAP = 500;

/** The thread after the cap: the oldest entries go first, answered questions only after every other entry (and past QA_CAP). */
function capThread(list: ThreadEntry[]): ThreadEntry[] {
  if (list.length <= THREAD_CAP) return list;
  const keep = new Set(list.filter((e) => e.qa !== null).slice(-QA_CAP).map((e) => e.id));
  let excess = list.length - THREAD_CAP;
  return list.filter((e) => {
    if (excess > 0 && !keep.has(e.id)) {
      excess -= 1;
      return false;
    }
    return true;
  });
}

let entrySeq = 0;

function entryId(role: 'you' | 'answer'): string {
  entrySeq += 1;
  return `${role}_${Date.now().toString(36)}_${entrySeq}`;
}

/**
 * Composer use on the live file is engagement: at the gate it holds the
 * clean-approval countdown ('engaged'); in plan review it holds the plan
 * auto-start countdown (the same write as holdPlan). Other files: nothing.
 */
export function engageIn(x: V2Internals, dealId: string): void {
  const s = x.current();
  if (dealId !== selectLiveDealId(s)) return;
  const st = s.agent.status;
  if (st === 'awaiting_approval' && s.agent.approvalPackage) {
    holdAuto(x, 'engaged');
    return;
  }
  if (st === 'plan_review') {
    x.setPlan((p) => (p.held && p.holdReason === 'manual' && p.deadline === null ? p : { ...p, held: true, holdReason: 'manual', deadline: null }));
  }
}

/** A confirm strip opened in the doc bar: in drawer mode the drawer closes so the strip is what the reviewer sees. */
function closeDrawerForStrip(x: V2Internals): void {
  if (layoutOf(x) === 'drawer') closeDrawerIn(x);
}

export type ComposerActions = Pick<V2Actions, 'submitComposer' | 'setComposerDraft'>;

export function createComposerActions(x: V2Internals): ComposerActions {
  return {
    submitComposer: (dealId, raw) => {
      // 1. nothing to send
      const text = raw.trim();
      if (!text) return;
      // 2. read the store BEFORE any hold, so a reply can say "the countdown is held"
      const s = x.current();
      if (!s.agent.dealsFull.some((d) => d.id === dealId)) return;
      const c = composerContext(s, dealId);
      const intent = parseComposer(raw, c);
      // 3. engage first, for every intent
      engageIn(x, dealId);
      const a = x.rendered().actions;
      // 4 and 5. execute; the echo's time is now, or the fresh epoch when a start opened a new plan review
      let youAt = Date.now();
      let reply: ComposerReply | null = null;
      const replyFor = (outcome: ComposerOutcome) => composerReply(intent, c, outcome);
      switch (intent.kind) {
        case 'start': {
          const before = x.uiRef.current.threadEpoch[dealId];
          if (intent.toggle) {
            const off = (x.uiRef.current.planPreview[dealId] ?? []).includes(intent.toggle.stepId);
            if (off === intent.toggle.include) a.togglePreviewStep(dealId, intent.toggle.stepId);
          }
          a.draftFile(dealId);
          const conf = x.uiRef.current.confirm;
          if (conf && conf.kind === 'start' && conf.dealId === dealId) {
            closeDrawerForStrip(x);
            reply = replyFor('confirm-opened');
            break;
          }
          const after = x.uiRef.current.threadEpoch[dealId];
          if (after !== undefined && after !== before) youAt = after;
          reply = replyFor('done');
          break;
        }
        case 'start-plan': {
          const included = x.planRef.current.enabledIds.includes(intent.toggle.stepId);
          if (included !== intent.toggle.include) a.togglePlanStep(intent.toggle.stepId);
          a.approvePlan();
          reply = replyFor('done');
          break;
        }
        case 'approve-plan':
          a.approvePlan();
          reply = replyFor('done');
          break;
        case 'toggle-step': {
          const included = x.planRef.current.enabledIds.includes(intent.stepId);
          if (included === intent.include) {
            reply = replyFor('already');
            break;
          }
          a.togglePlanStep(intent.stepId);
          reply = replyFor('done');
          break;
        }
        case 'hold':
          if (intent.target === 'plan') a.holdPlan();
          else a.reviewManually();
          reply = replyFor('done');
          break;
        case 'stop': {
          a.requestStop();
          const conf = x.uiRef.current.confirm;
          const opened = conf !== null && conf.kind === 'stop';
          if (opened) closeDrawerForStrip(x);
          reply = replyFor(opened ? 'confirm-opened' : 'done');
          break;
        }
        case 'open-stress':
          a.openStress(dealId);
          reply = replyFor('done');
          break;
        case 'question':
          reply = answerFor(s, dealId, intent.text);
          break;
        case 'refuse':
          reply = replyFor('refused');
          break;
      }
      // 6 and 7. the echo and the reply (same time: the reply sorts right after its echo), then clear the draft
      const entries: ThreadEntry[] = [
        { id: entryId('you'), dealId, t: youAt, role: 'you', text, meta: null, tone: 'answer', action: null, qa: null },
      ];
      let answered: string | null = null;
      if (reply) {
        const id = entryId('answer');
        // a real answer about the deal goes to the memo's Questions block (R4.5); every other reply stays a panel line
        if (reply.memo) answered = id;
        entries.push({
          id,
          dealId,
          t: youAt,
          role: 'answer',
          text: reply.text,
          meta: reply.meta,
          tone: reply.tone,
          action: reply.action,
          qa: reply.memo ? { question: text, runId: reply.memo.runId } : null,
        });
      }
      x.setUi((u) => {
        const composerDraft = { ...u.composerDraft };
        delete composerDraft[dealId];
        return { ...u, thread: capThread([...u.thread, ...entries]), composerDraft };
      });
      // 8. the answer is displayed on the right: in column mode the memo brings its entry into view
      // and flashes it once (the block mounts in this batch; the memo cues it a frame later). In
      // drawer mode the drawer overlays the memo, so nothing moves until the reviewer follows the
      // panel's "Questions →" (which closes the drawer first).
      const r = x.routeRef.current;
      if (answered !== null && layoutOf(x) === 'column' && r.name === 'file' && r.dealId === dealId) {
        a.cueMemo({ section: 'questions', anchorId: qaAnchor(answered) }, { keepDrawer: true });
      }
    },

    // typing is engagement (like the reviewer note); the draft is kept per file, never persisted
    setComposerDraft: (dealId, text) => {
      if (text.trim() !== '') engageIn(x, dealId);
      x.setUi((u) => {
        if ((u.composerDraft[dealId] ?? '') === text) return u;
        const composerDraft = { ...u.composerDraft };
        if (text === '') delete composerDraft[dealId];
        else composerDraft[dealId] = text;
        return { ...u, composerDraft };
      });
    },
  };
}
