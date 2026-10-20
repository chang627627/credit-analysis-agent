// ---------------------------------------------------------------------------
// Countersign V2 · the composer (THREE-PANE.md §4, R2.1). "Upload to ingest,
// chat to steer": the case file's composer takes instructions (draft, start
// drafting, skip or include peer benchmarks, hold, stop, stress) and
// questions. Parsing is pure, deterministic and conservative; every input gets
// an answer or a reason. The composer never signs, returns, rejects, amends or
// writes the reviewer note: those words get a short refusal that points to the
// memo's Decision card ("Decide in the memo: Decision →") or the covenant row.
// Replies are short (the panel clips an answer to 2 lines) and link to the
// memo card they concern. state/composer.ts executes the intent through the
// existing guarded actions; these functions only read and compose.
// ---------------------------------------------------------------------------

import { answerQuestion } from '../../agent/responder';
import type { V2Store } from '../state/contracts';
import { fmtX } from './format';
import { askRoute, amendable, fileContext, parsingReason, reworkN } from './select-file';
import { isRunLive, selectLiveDealId, selectPolicy } from './select-top';
import { sectionOfStep } from './flags';
import type { ComposerContext, ComposerIntent, ComposerOutcome, ComposerReply, ComposerToggle, SectionId, ThreadAction } from './types';
import { COPY, sectionHeading, sectionLinkLabel, STEP_SECTION } from './vocab';

// ---- context ------------------------------------------------------------------

/** What the composer may do on this file right now (read before any hold, §4.3 step 2). */
export function composerContext(s: V2Store, dealId: string): ComposerContext {
  const ctx = fileContext(s, dealId);
  const liveId = selectLiveDealId(s);
  const otherLive = liveId !== null && liveId !== dealId && isRunLive(s) ? s.agent.dealsFull.find((d) => d.id === liveId) : undefined;
  const parsing = parsingReason(s);
  if (!ctx) {
    return {
      dealId,
      dealName: dealId,
      mode: 'not-started',
      live: false,
      otherLiveName: otherLive ? otherLive.name : null,
      parsing,
      askEnabled: false,
      askDisabledReason: COPY.askDisabledNotStarted,
      plan: [],
      planCountdown: false,
      policyCountdown: false,
      policyEligible: false,
      amendable: false,
      stressAvailable: false,
      atGate: false,
    };
  }
  const mode = ctx.mode;
  const askEnabled = ctx.pkg !== null && (mode === 'gate' || mode === 'sealed');
  const review = ctx.live && mode === 'plan-review';
  const atGate = ctx.live && mode === 'gate';
  const policy = atGate ? selectPolicy(s) : null;
  return {
    dealId,
    dealName: ctx.deal.name,
    mode,
    live: ctx.live,
    otherLiveName: otherLive ? otherLive.name : null,
    parsing,
    askEnabled,
    askDisabledReason: askEnabled ? null : mode === 'not-started' || mode === 'plan-review' ? COPY.askDisabledNotStarted : COPY.askDisabledRunning,
    plan: ctx.plan
      .filter((p) => reworkN(p.id) === null)
      .map((p) => ({
        stepId: p.id,
        heading: sectionHeading(STEP_SECTION[p.id] ?? sectionOfStep(p.id)),
        optional: !!p.optional,
        included: review ? !p.optional || s.plan.enabledIds.includes(p.id) : !p.skipped,
      })),
    planCountdown: review && !s.plan.held,
    policyCountdown: !!policy && policy.armed,
    policyEligible: !!policy && policy.eligible,
    amendable: amendable(ctx),
    stressAvailable: ctx.pkg !== null && (mode === 'gate' || mode === 'sealed' || mode === 'running'),
    atGate,
  };
}

// ---- parsing (§4.2, exact patterns) -------------------------------------------

const POLITE = /^(please |can you |could you |would you |will you )+/;
const ASK_LEAD = /^(why|what|how|which|who|when|where|is|are|was|were|does|do|did|should|explain|tell me|summari[sz]e|walk me through)\b/;
const START = /^(draft|start|run|begin|re-?run|kick off|go ahead)( (it|this|memo|the memo|a memo|the analysis|the file|this file|drafting|the draft|the run|a run))?( now)?$/;
const START_LEAD = /^(draft|start|run|begin|re-?run|kick off|go ahead)\b/;
const PLAN_OK = /^(approve|accept|confirm)( the)? plan$/;
const DECIDE = /\b(countersign\w*|sign( it| off| this)?|approve\w*|accept\w*|lgtm|reject\w*|refuse|decline\w*|send (it |this )?back|return( it| this)?( for revision)?|rework|revise it)\b/;
const AMEND = /\b(amend\w*|waive\w*|waiver|step.?down|loosen|tighten|raise|lower|change|set)\b.*\b(leverage|liquidity|covenant\w*|threshold\w*|terms?)\b/;
const NOTE_LEAD = /^(note|my note|reason)\s*[:,-]/;
const NOTE_ADD = /\b(add|write|put|leave)( a| my)? note\b/;
const STEPS: [string, RegExp][] = [
  ['step_peers', /\b(peers?|benchmarks?|comparables|comps)\b/],
  ['step_extract', /\b(financials|extraction|extract)\b/],
  ['step_risk', /\b(risk|rating|score)\b/],
  ['step_covenants', /\bcovenants?\b/],
  ['step_package', /\b(recommendation|memo builder)\b/],
];
const EXCL = /\b(skip|exclude|drop|remove|without|no|leave out|turn off|disable)\b/;
const INCL = /\b(include|add|keep|with|turn on|enable|restore|bring back)\b/;
const NEG = /\b(don't|do not|never|not)\b/;
const HOLD = /^(hold|wait|pause|hold on|not yet|review manually|stop the countdown|hold the countdown)$/;
const STOP = /^(stop|cancel|abort|stop (the )?(run|drafting)|cancel (the )?(run|plan|plan review))$/;
const STRESS = /\b(stress|what.?if|scenario|sensitivit\w*)\b/;

/** The step words in `core`, the toggle they make (if exactly one step and one verb, no negation), or an ambiguity. */
function readToggle(core: string): { toggle: ComposerToggle | null; ambiguous: boolean; stepId: string | null } {
  const hits = STEPS.filter(([, re]) => re.test(core)).map(([id]) => id);
  const excl = EXCL.test(core);
  const incl = INCL.test(core);
  const neg = NEG.test(core);
  if (hits.length === 0) return { toggle: null, ambiguous: false, stepId: null };
  const stepId = hits.length === 1 ? hits[0] : null;
  if (excl && incl) return { toggle: null, ambiguous: true, stepId };
  if (neg && (excl || incl)) return { toggle: null, ambiguous: true, stepId };
  if (stepId && excl !== incl) return { toggle: { stepId, include: incl }, ambiguous: false, stepId };
  return { toggle: null, ambiguous: false, stepId };
}

function isRequired(c: ComposerContext, stepId: string): boolean {
  const p = c.plan.find((x) => x.stepId === stepId);
  return p ? !p.optional : true;
}

/**
 * Raw text → one intent, first rule wins (§4.2 R1 to R12). Polite instructions are
 * instructions ("can you draft the memo"), so a polite decision is still refused; a
 * question goes to the responder only once the memo is assembled.
 */
export function parseComposer(raw: string, c: ComposerContext): ComposerIntent {
  const n = raw
    .normalize('NFKC')
    .replace(/[‘’]/g, "'")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!]+$/, '');
  const q = n.endsWith('?');
  const bare = n.replace(/\?+$/, '').trim();
  const polite = POLITE.test(bare);
  const core = bare.replace(POLITE, '').replace(/ please$/, '').trim();
  const asks = !polite && (q || ASK_LEAD.test(core));
  const review = c.live && c.mode === 'plan-review';
  const busy = c.live && (c.mode === 'running' || c.mode === 'gate');
  const question = (): ComposerIntent => ({ kind: 'question', text: raw.trim(), stress: STRESS.test(core) });

  // R1: approve the plan
  if (PLAN_OK.test(core)) {
    if (review) return { kind: 'approve-plan' };
    return { kind: 'refuse', reason: c.mode === 'not-started' ? 'no-plan' : 'plan-fixed' };
  }

  if (!asks) {
    const t = readToggle(core);
    // R2: compound start ("draft the memo without peer benchmarks")
    if (START_LEAD.test(core) && (t.toggle || t.ambiguous)) {
      if (t.ambiguous || !t.toggle) return { kind: 'refuse', reason: 'ambiguous', ...(t.stepId ? { stepId: t.stepId } : {}) };
      if (!t.toggle.include && isRequired(c, t.toggle.stepId)) return { kind: 'refuse', reason: 'required-step', stepId: t.toggle.stepId };
      if (review) return { kind: 'start-plan', toggle: t.toggle };
      if (busy) return { kind: 'refuse', reason: 'already-live' };
      if (c.parsing) return { kind: 'refuse', reason: 'parsing' };
      return { kind: 'start', toggle: t.toggle };
    }
    // R3 to R5: decisions, amendments and the note belong to the card and the covenant row
    if (DECIDE.test(core)) return { kind: 'refuse', reason: 'decision' };
    if (AMEND.test(core)) return { kind: 'refuse', reason: 'amend' };
    if (NOTE_LEAD.test(core) || NOTE_ADD.test(core)) return { kind: 'refuse', reason: 'note' };
    // R6: a toggle without a start verb
    if (t.toggle || t.ambiguous) {
      if (!review) return { kind: 'refuse', reason: c.mode === 'not-started' ? 'no-plan' : 'plan-fixed' };
      if (t.ambiguous || !t.toggle) return { kind: 'refuse', reason: 'ambiguous', ...(t.stepId ? { stepId: t.stepId } : {}) };
      if (!t.toggle.include && isRequired(c, t.toggle.stepId)) return { kind: 'refuse', reason: 'required-step', stepId: t.toggle.stepId };
      return { kind: 'toggle-step', stepId: t.toggle.stepId, include: t.toggle.include };
    }
    // R7: start
    if (START.test(core)) {
      if (review) return { kind: 'approve-plan' };
      if (busy) return { kind: 'refuse', reason: 'already-live' };
      if (c.parsing) return { kind: 'refuse', reason: 'parsing' };
      return { kind: 'start', toggle: null };
    }
    // R8: hold a countdown
    if (HOLD.test(core)) {
      if (c.planCountdown) return { kind: 'hold', target: 'plan' };
      if (c.policyCountdown || c.policyEligible) return { kind: 'hold', target: 'policy' };
      return { kind: 'refuse', reason: 'nothing-to-hold' };
    }
    // R9: stop (opens the strip, never stops directly)
    if (STOP.test(core)) {
      if (review || busy) return { kind: 'stop' };
      return { kind: 'refuse', reason: 'nothing-running' };
    }
    // R10: the stress test
    if (STRESS.test(core)) return c.stressAvailable ? { kind: 'open-stress' } : { kind: 'refuse', reason: 'no-stress' };
  } else {
    // R11: a question
    return c.askEnabled ? question() : { kind: 'refuse', reason: 'question-closed' };
  }
  // R12: fallback
  return c.askEnabled ? question() : { kind: 'refuse', reason: 'unknown' };
}

// ---- replies (§4.3, exact copy) -----------------------------------------------

function headingOf(c: ComposerContext, stepId: string | undefined): string {
  const p = stepId ? c.plan.find((x) => x.stepId === stepId) : undefined;
  return p ? p.heading : sectionHeading('peers');
}

/** The optional steps read mid-sentence: 'peer benchmarks'. */
function optionalNames(c: ComposerContext): string {
  const names = c.plan.filter((p) => p.optional).map((p) => p.heading.toLowerCase());
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function done(text: string, action: ThreadAction | null = null): ComposerReply {
  return { tone: 'done', text, meta: null, action };
}
function refusal(text: string, action: ThreadAction | null = null): ComposerReply {
  return { tone: 'refusal', text, meta: null, action };
}

const GO_TO_DECISION: ThreadAction = { kind: 'decision', label: sectionLinkLabel('signature') };

/**
 * The panel's short answer to an executed intent, or null when the plan prompt, the run line or
 * the responder answers instead (start without a toggle, start-plan, approve-plan, question).
 */
export function composerReply(intent: ComposerIntent, c: ComposerContext, outcome: ComposerOutcome): ComposerReply | null {
  const R = COPY.reply;
  switch (intent.kind) {
    case 'start':
      if (outcome === 'confirm-opened') return refusal(c.otherLiveName ? R.startStrip(c.otherLiveName, c.dealName) : R.startStripGeneric);
      if (outcome === 'refused') return c.parsing ? refusal(c.parsing) : null;
      return intent.toggle ? done(R.toggledInStart(headingOf(c, intent.toggle.stepId), intent.toggle.include)) : null;
    case 'start-plan':
    case 'approve-plan':
    case 'question':
      return null;
    case 'toggle-step': {
      const heading = headingOf(c, intent.stepId);
      if (outcome === 'already') return done(R.toggledAlready(heading, intent.include));
      if (outcome === 'refused') return refusal(R.planFixed);
      return done((intent.include ? R.toggledOn(heading) : R.toggledOff(heading)) + (c.planCountdown ? R.countdownHeld : ''));
    }
    case 'hold':
      return done(intent.target === 'plan' ? R.holdPlan : R.holdPolicy);
    case 'stop':
      return done(R.stop);
    case 'open-stress':
      return done(R.openStress, { kind: 'memo', label: sectionLinkLabel('stress'), target: { section: 'stress', anchorId: null } });
    case 'refuse':
      switch (intent.reason) {
        case 'decision':
          return c.atGate ? refusal(R.decisionGate, GO_TO_DECISION) : refusal(R.decisionIdle);
        case 'amend':
          return c.amendable
            ? refusal(R.amendGate, { kind: 'memo', label: sectionLinkLabel('covenants'), target: { section: 'covenants', anchorId: 'sec:covenants' } })
            : refusal(R.amendIdle);
        case 'note':
          return c.atGate ? refusal(R.noteGate, GO_TO_DECISION) : refusal(R.noteIdle);
        case 'required-step':
          return refusal(R.requiredStep(headingOf(c, intent.stepId), optionalNames(c)));
        case 'ambiguous': {
          const id = intent.stepId && c.plan.find((p) => p.stepId === intent.stepId && p.optional) ? intent.stepId : c.plan.find((p) => p.optional)?.stepId;
          return refusal(R.ambiguous(headingOf(c, id).toLowerCase()));
        }
        case 'no-plan':
          return refusal(R.noPlan);
        case 'plan-fixed':
          return refusal(R.planFixed);
        case 'already-live':
          return refusal(c.mode === 'gate' ? R.alreadyAtGate(c.dealName) : R.alreadyDrafting(c.dealName));
        case 'parsing':
          return refusal(c.parsing ?? COPY.askDisabledRunning);
        case 'question-closed':
          return refusal(c.askDisabledReason ?? COPY.askDisabledRunning);
        case 'nothing-to-hold':
          return refusal(R.nothingToHold);
        case 'nothing-running':
          return refusal(R.nothingRunning);
        case 'no-stress':
          return refusal(R.noStress);
        case 'unknown':
          return refusal(R.unknown);
      }
  }
}

/**
 * A question about this file: a local intercept when the engine responder would answer
 * wrongly (what-if points at the stress test; a restructured revision answers from the
 * revision), else the engine's pure rule-based responder over the deal and the package.
 */
export function answerFor(s: V2Store, dealId: string, text: string): ComposerReply {
  const q = text.trim();
  const ctx = fileContext(s, dealId);
  if (!ctx) return refusal(COPY.askDisabledNotStarted);
  const pkg = ctx.pkg;
  const restructured = !!(pkg && pkg.restructure);
  const revisedLeverage = restructured && pkg ? pkg.keyMetrics.find((m) => /leverage/i.test(m.label))?.value ?? null : null;
  const route = askRoute(q, {
    restructured,
    revision: pkg ? pkg.revision : 1,
    rec: pkg ? pkg.recommendation : null,
    summary: pkg ? pkg.summary : null,
    filedLeverage: fmtX(ctx.deal.financials.leverageX),
    revisedLeverage,
  });
  if (route.kind === 'local') {
    const stressOk = pkg !== null && (ctx.mode === 'gate' || ctx.mode === 'sealed' || ctx.mode === 'running');
    if (route.stress) return { tone: 'answer', text: route.text, meta: COPY.askMetaLocal, action: stressOk ? { kind: 'stress', label: sectionLinkLabel('stress') } : null };
    return { tone: 'answer', text: route.text, meta: COPY.askMetaLocal, action: memoAction(restructured && pkg ? `revision-${pkg.revision}` : 'recommendation') };
  }
  const sec = sectionOfQuestion(q, ctx.plan.some((p) => p.id === 'step_peers' && !p.skipped));
  return { tone: 'answer', text: answerQuestion(ctx.deal, true, pkg, q), meta: COPY.askMetaEngine, action: sec ? memoAction(sec) : null };
}

function memoAction(section: SectionId): ThreadAction {
  return { kind: 'memo', label: sectionLinkLabel(section), target: { section, anchorId: `sec:${section}` } };
}

/**
 * The memo card a question concerns, so the panel's short answer can point at it (R2.1):
 * covenant words → Covenants, risk words → Risk, peer words → Peers (when benchmarked),
 * figure words → Financials, decision words → Recommendation; null when nothing matches.
 */
export function sectionOfQuestion(q: string, peersRan: boolean): SectionId | null {
  const t = q.toLowerCase();
  if (/covenant|breach|headroom|cushion|threshold|leverage|coverage|liquidity/.test(t)) return 'covenants';
  if (/\b(risk|rating|score|default)\b/.test(t)) return 'risk';
  if (peersRan && /peer|benchmark|median|comparab|sector/.test(t)) return 'peers';
  if (/revenue|ebitda|margin|debt|financial|figure/.test(t)) return 'financials';
  if (/recommend|why|decision|approve|decline|escalat|summary/.test(t)) return 'recommendation';
  return null;
}
