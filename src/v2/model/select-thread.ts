// ---------------------------------------------------------------------------
// Countersign V2 · the agent panel (THREE-PANE.md R2.1, R2.4). The middle pane
// is command and control only, like a coding agent's conversation: one-line
// status lines from the agent, the plan prompt that starts drafting, the
// reviewer's questions and instructions with short answers, the composer.
//
// It never DISPLAYS data and holds no decision. Every number, list, table,
// record, reason and the whole decision live in the memo pane; a panel line
// only POINTS at a memo card with a link ("Covenants →", "Decision →").
// Never a flag's sentence, never "raised by", never a confidence or a
// duration, and no agent token before the decision is sealed.
//
// `selectAgentPanel` is a pure reduction over the same file context the memo
// and the Decision card read: a structural list in plan order (run, steps and
// at most one action-worthy flag line per step, each send-back and revision,
// the current gate, the decided line), merged by time with the composer's
// exchanges for this file since its epoch.
// ---------------------------------------------------------------------------

import type { PlanStep } from '../../agent/types';
import { LOW_CONFIDENCE_FLOOR } from '../../agent/util';
import type { StepView } from '../../hooks/useCreditAgent';
import type { ThreadEntry, V2Store } from '../state/contracts';
import { memoTargetOfAnchor, sectionOfStep } from './flags';
import { fmtConf, fmtCountdown, fmtHM, fmtM, plural } from './format';
import {
  amendedRecOf,
  asCure,
  buildNotes,
  cureOf,
  fileContext,
  parsingReason,
  reworkN,
  reworkProposes,
} from './select-file';
import type { FileCtx, FlagNote } from './select-file';
import { selectPolicy } from './select-top';
import type { AgentPanelView, FileAt, PlanPromptView, SectionId, StatusKey, ThreadAction, ThreadLine } from './types';
import {
  COPY,
  OPTIONAL_SHORT,
  REWORK_DONE_LINE,
  sectionHeading,
  sectionLinkLabel,
  STEP_LINE,
  STEP_SECTION,
  tokenWord,
  TOOL_LABEL,
} from './vocab';

export { memoTargetOfAnchor } from './flags';

const PLAN_APPROVED = 'Plan approved by reviewer';
const PLAN_AUTO = 'Plan auto-started · unattended countdown';

/** 'New activity · 3': an in-place pill over a scrolled-up panel. */
export function newActivityLabel(n: number): string {
  return `New activity · ${n}`;
}

// ---- small derivations --------------------------------------------------------

function sectionOfPlanStep(p: PlanStep): SectionId {
  return reworkN(p.id) !== null ? sectionOfStep(p.id) : STEP_SECTION[p.id] ?? sectionOfStep(p.id);
}

function linkTo(at: FileAt): NonNullable<ThreadLine['link']> {
  return { label: sectionLinkLabel(at), target: at };
}

const DECISION_LINK: NonNullable<ThreadLine['link']> = linkTo('signature');

/** The time of the first entry with exactly this label, or null. */
function entryAt(ctx: FileCtx, label: string): number | null {
  for (const e of ctx.entries) if (e.label === label) return e.t;
  return null;
}

type StepPhase = 'running' | 'done' | 'stopped';

function phaseOf(ctx: FileCtx, st: StepView): StepPhase {
  if (st.status === 'done') return 'done';
  if (ctx.mode === 'running') return 'running';
  if (ctx.mode === 'error') return 'stopped';
  return st.result ? 'done' : 'stopped';
}

const PHASE_GLYPH: Record<StepPhase, StatusKey> = { running: 'drafting', done: 'done', stopped: 'error' };

/** The Structuring Engine's line, keyed on its result (it runs on every send-back, cure or not). */
function reworkLine(ctx: FileCtx, p: PlanStep, st: StepView, phase: StepPhase): { text: string; glyph: StatusKey } {
  const lines = STEP_LINE.propose_restructure;
  if (phase !== 'done') return { text: phase === 'running' ? lines.running : lines.stopped, glyph: PHASE_GLYPH[phase] };
  const cure = asCure(st.result?.data);
  if (cure && !cure.viable) return { text: REWORK_DONE_LINE.none, glyph: 'watch' };
  if (cure && cure.viable) {
    return cure.contributionM > 0 ? { text: REWORK_DONE_LINE.proposed(fmtM(cure.contributionM)), glyph: 'done' } : { text: REWORK_DONE_LINE.stands, glyph: 'done' };
  }
  // an unreadable result: the step's own title says whether it proposed a restructure
  const n = reworkN(p.id);
  const fallback = n !== null && reworkProposes(p.title) ? cureOf(ctx, n) : null;
  return fallback ? { text: REWORK_DONE_LINE.proposed(fmtM(fallback.contributionM)), glyph: 'done' } : { text: REWORK_DONE_LINE.stands, glyph: 'done' };
}

/** The memo card a flag points at (its anchor's card), else the emitting step's card. */
function flagCard(n: FlagNote, fallback: SectionId): FileAt {
  const sec = memoTargetOfAnchor(n.note.anchorId).section;
  return sec === 'header' ? fallback : sec;
}

/**
 * At most ONE action-worthy flag line per step (R2.1), a pointer and never the flag's sentence:
 * breaches first ("4 covenants breached"), then low confidence ("Risk Engine below 75%
 * confidence"), then watch items ("1 item to watch"). A revision step's send-back, proposal and
 * no-cure are already said by the revision lines, so only its low-confidence flag can show.
 */
function flagLine(st: StepView, notes: FlagNote[], sec: SectionId, rework: boolean): { line: ThreadLine; t: number | null } | null {
  const mine = notes.filter((n) => n.stepId === st.id);
  if (mine.length === 0) return null;
  const make = (xs: FlagNote[], glyph: StatusKey, text: string) => ({
    line: { id: `flag:${st.id}`, kind: 'flag' as const, glyph, text, link: linkTo(flagCard(xs[0], sec)) },
    t: xs.find((n) => n.t !== null)?.t ?? null,
  });
  const breaches = rework ? [] : mine.filter((n) => n.kind === 'breach');
  if (breaches.length > 0) return make(breaches, 'breach', `${plural(breaches.length, 'covenant')} breached`);
  const low = mine.filter((n) => n.kind === 'low-confidence');
  if (low.length > 0) {
    const tool = Object.values(TOOL_LABEL).find((t) => low[0].note.text.startsWith(t)) ?? TOOL_LABEL.extract_financials;
    return make(low, 'watch', `${tool} below ${fmtConf(LOW_CONFIDENCE_FLOOR)} confidence`);
  }
  const watch = rework ? [] : mine.filter((n) => n.kind === 'watch');
  if (watch.length > 0) return make(watch, 'watch', `${plural(watch.length, 'item')} to watch`);
  return null;
}

/** A composer reply's action as a panel link (memo cards only; the source and the Ledger carry none). */
function linkOfAction(a: ThreadAction | null): ThreadLine['link'] {
  if (!a) return null;
  switch (a.kind) {
    case 'memo':
      return a.target.section === 'header' ? null : linkTo(a.target.section);
    case 'decision':
      return DECISION_LINK;
    case 'stress':
      return linkTo('stress');
    default:
      return null;
  }
}

function entryLine(e: ThreadEntry): ThreadLine {
  if (e.role === 'you') return { id: e.id, kind: 'you', glyph: null, text: COPY.youLine(e.text), link: null };
  const glyph: StatusKey | null = e.tone === 'done' ? 'done' : e.tone === 'refusal' ? 'info' : null;
  return { id: e.id, kind: 'answer', glyph, text: e.text, link: linkOfAction(e.action) };
}

// ---- the plan prompt ------------------------------------------------------------

function planPrompt(s: V2Store, ctx: FileCtx): PlanPromptView {
  const runnable = ctx.plan.filter((p) => reworkN(p.id) === null);
  const enabled = s.plan.enabledIds;
  const isIn = (p: PlanStep) => !p.optional || enabled.includes(p.id);
  const optional = runnable.filter((p) => p.optional);
  const first = optional[0];
  const included = runnable.filter(isIn).length;
  const short = first ? OPTIONAL_SHORT[first.id] ?? sectionHeading(sectionOfPlanStep(first)).toLowerCase() : '';
  const p = s.plan;
  return {
    text: COPY.planPrompt(
      included,
      runnable.length,
      optional.map((x) => sectionHeading(sectionOfPlanStep(x))),
      optional.every(isIn),
    ),
    steps: runnable.map((st, i) => ({
      id: st.id,
      n: i + 1,
      title: sectionHeading(sectionOfPlanStep(st)),
      tool: TOOL_LABEL[st.toolName],
      optional: !!st.optional,
      included: isIn(st),
      toggleLabel: isIn(st) ? COPY.skipOptional(sectionHeading(sectionOfPlanStep(st))) : COPY.includeOptional(sectionHeading(sectionOfPlanStep(st))),
    })),
    start: { label: COPY.startDrafting, kbd: `${s.modKey}↵`, disabled: false },
    optional: first
      ? {
          stepId: first.id,
          label: isIn(first) ? COPY.skipOptional(short) : COPY.includeOptional(short),
          included: isIn(first),
        }
      : null,
    cancelLabel: COPY.cancel,
    // the countdown arms only with the panel on screen (state/plan): a plan that never armed shows none
    countdown: p.held
      ? { text: COPY.heldStartWhenReady, holdLabel: null }
      : p.deadline !== null
        ? { text: COPY.startsIn(fmtCountdown(p.deadline, s.now)), holdLabel: COPY.hold }
        : null,
  };
}

// ---- the panel -------------------------------------------------------------------

interface Placed { line: ThreadLine; t: number | null }

/** The current gate's one line: needed, counting down, held, or returning (never a token). */
function gateLine(s: V2Store, rev: number): ThreadLine {
  const id = `gate:${rev}`;
  if (s.gate.leaving) return { id, kind: 'gate', glyph: 'returned', text: COPY.returningForRevision, link: null };
  const policy = selectPolicy(s);
  if (policy.armed && policy.countdown) return { id, kind: 'gate', glyph: 'awaiting', text: COPY.autoCountdownLine(policy.countdown), link: DECISION_LINK };
  if (policy.holdLabel) {
    return { id, kind: 'gate', glyph: 'awaiting', text: COPY.autoHeldLine(policy.holdLabel.replace(/^Held · /, '')), link: DECISION_LINK };
  }
  return { id, kind: 'gate', glyph: 'awaiting', text: COPY.gateLine, link: DECISION_LINK };
}

/** The sealed decision in one line: who signed what, when, and a link to the record. */
function decidedLine(ctx: FileCtx): ThreadLine | null {
  const seal = ctx.seal;
  const pkg = ctx.pkg;
  if (!seal || !pkg) return null;
  const at = fmtHM(seal.decidedAt);
  const word = tokenWord(pkg.recommendation);
  let glyph: StatusKey = 'signed';
  let text: string;
  if (seal.decision === 'auto-countersigned') {
    glyph = 'signed-auto';
    text = `The policy countersigned ${word} · ${at}`;
  } else if (seal.outcome === 'reject') {
    glyph = 'rejected';
    text = `You rejected the memo · ${at}`;
  } else if (seal.decision === 'countersigned-amended') {
    text = `You countersigned ${tokenWord(amendedRecOf(ctx.deal, seal.amendments) ?? pkg.recommendation)} as amended · ${at}`;
  } else {
    text = `You countersigned ${word} · ${at}`;
  }
  return { id: 'decided', kind: 'decided', glyph, text, link: { label: COPY.recordLink, target: 'signature' } };
}

const COMPOSER: AgentPanelView['composer'] = { placeholder: COPY.composerPlaceholder, disabled: false, disabledReason: null };

export function selectAgentPanel(s: V2Store, dealId: string): AgentPanelView {
  const ctx = fileContext(s, dealId);
  if (!ctx) return { title: COPY.agentName, lines: [], plan: null, start: null, composer: COMPOSER };
  const deal = ctx.deal;
  const NEG = Number.NEGATIVE_INFINITY;
  const S: Placed[] = [];
  let start: AgentPanelView['start'] = null;
  const epoch = (s.ui.threadEpoch ?? {})[dealId];

  if (ctx.mode === 'not-started') {
    if (ctx.cancelled) {
      S.push({ t: NEG, line: { id: 'cancelled', kind: 'system', glyph: 'cancelled', text: `${COPY.runCancelled} · ${fmtHM(ctx.cancelled.at)}`, link: null } });
    }
    const parsing = parsingReason(s);
    start = { label: COPY.draftMemo, kbd: `${s.modKey}↵`, disabled: parsing !== null };
    S.push({
      t: NEG,
      line: parsing
        ? { id: 'ready', kind: 'system', glyph: 'drafting', text: parsing, link: null }
        : { id: 'ready', kind: 'system', glyph: 'pending', text: COPY.readyLine(deal.name), link: null },
    });
  } else if (ctx.runId !== null) {
    // the run: approved by the reviewer, or auto-started by the unattended countdown (never "approved")
    const approved = ctx.entries.find((e) => e.label === PLAN_APPROVED || e.label === PLAN_AUTO);
    S.push({
      t: approved?.t ?? ctx.run?.startedAt ?? NEG,
      line: { id: 'run', kind: 'run', glyph: null, text: approved?.label === PLAN_AUTO ? COPY.runLineAuto(deal.name) : COPY.runLine(deal.name), link: null },
    });

    const notes = buildNotes(ctx).notes;
    const pushStep = (st: StepView, p: PlanStep) => {
      const sec = sectionOfPlanStep(p);
      const phase = phaseOf(ctx, st);
      const rework = reworkN(p.id) !== null;
      const said = rework
        ? reworkLine(ctx, p, st, phase)
        : { text: STEP_LINE[p.toolName][phase], glyph: PHASE_GLYPH[phase] };
      S.push({
        t: entryAt(ctx, `Step ${st.index + 1} · ${st.title}`),
        line: { id: `step:${st.id}`, kind: rework ? 'revision' : 'step', glyph: said.glyph, text: said.text, link: linkTo(sec) },
      });
      const f = flagLine(st, notes, sec, rework);
      if (f) S.push({ t: f.t, line: f.line });
    };
    const liveGateRev = ctx.live && ctx.mode === 'gate' && ctx.pkg ? ctx.pkg.revision : null;
    const pushGate = (rev: number) => {
      if (liveGateRev !== rev) return; // a past gate is said by the send-back or the decision that followed it
      const label = rev === 1 ? 'Awaiting human approval' : `Awaiting human approval · rev ${rev}`;
      S.push({ t: entryAt(ctx, label), line: gateLine(s, rev) });
    };

    // non-rework steps in plan order, until the first that has not started
    for (const p of ctx.plan) {
      if (reworkN(p.id) !== null) continue;
      const sec = sectionOfPlanStep(p);
      if (p.skipped) {
        S.push({ t: null, line: { id: `skip:${p.id}`, kind: 'step', glyph: 'excluded', text: COPY.skippedLine(sectionHeading(sec)), link: linkTo(sec) } });
        continue;
      }
      const st = ctx.steps.find((x) => x.id === p.id);
      if (!st) break;
      pushStep(st, p);
    }
    pushGate(1);
    // each send-back: the return, the revision step, the next gate
    for (const p of ctx.plan) {
      const n = reworkN(p.id);
      if (n === null) continue;
      let returnedAt: number | null = null;
      for (const e of ctx.entries) if (e.label === 'Plan extended · reviewer send-back' && e.detail === p.title) returnedAt = e.t;
      S.push({ t: returnedAt, line: { id: `returned:${n}`, kind: 'revision', glyph: 'returned', text: COPY.returnedLine(n), link: linkTo(`revision-${n}`) } });
      const st = ctx.steps.find((x) => x.id === p.id);
      if (st) pushStep(st, p);
      pushGate(n);
    }

    if (ctx.mode === 'sealed') {
      const d = decidedLine(ctx);
      if (d) S.push({ t: ctx.seal?.decidedAt ?? null, line: d });
    } else if (ctx.mode === 'error') {
      const last = ctx.steps.length > 0 ? ctx.steps[ctx.steps.length - 1] : undefined;
      const lastPlan = last ? ctx.plan.find((p) => p.id === last.id) : undefined;
      const sec: SectionId = lastPlan ? sectionOfPlanStep(lastPlan) : 'financials';
      S.push({ t: entryAt(ctx, 'Run error'), line: { id: 'error', kind: 'system', glyph: 'error', text: COPY.stoppedAtLine(sectionHeading(sec)), link: linkTo(sec) } });
    }
  }

  // a missing time inherits the previous line's; times never decrease down the list
  let prev = NEG;
  const timed = S.map((x) => {
    const t = Math.max(x.t ?? prev, prev);
    prev = t;
    return { line: x.line, t };
  });

  // the composer's exchanges on this file since its epoch, each before the first structural line at or after it
  const extras = (s.ui.thread ?? [])
    .filter((e) => e.dealId === dealId && (epoch === undefined || e.t >= epoch))
    .slice()
    .sort((a, b) => a.t - b.t);
  const before = new Map<number, ThreadLine[]>();
  const tail: ThreadLine[] = [];
  for (const e of extras) {
    const at = timed.findIndex((x) => x.t >= e.t && x.t !== NEG);
    if (at < 0) tail.push(entryLine(e));
    else before.set(at, [...(before.get(at) ?? []), entryLine(e)]);
  }
  const lines: ThreadLine[] = [];
  timed.forEach((x, i) => {
    for (const l of before.get(i) ?? []) lines.push(l);
    lines.push(x.line);
  });
  lines.push(...tail);

  return {
    title: `${COPY.agentName} · ${deal.name}`,
    lines,
    plan: ctx.live && ctx.mode === 'plan-review' ? planPrompt(s, ctx) : null,
    start,
    composer: COMPOSER,
  };
}
