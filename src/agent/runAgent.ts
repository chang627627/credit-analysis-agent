// ---------------------------------------------------------------------------
// THE AGENT LOOP.
//
// A single async generator that, for the deal in ctx.deal:
//   1. announces a PLAN,
//   2. loops each step: stream reasoning -> call a tool -> observe -> DECIDE
//      (derive flags from the observation),
//   3. assembles an approval package whose recommendation depends on the data,
//   4. BLOCKS at a human-in-the-loop gate (await ctx.requestApproval()),
//   5. finishes.
//
// It yields a typed AgentEvent stream and never touches React. Different deals
// produce different observations -> different flags -> different recommendations
// (approve / escalate / decline), all from the same loop.
// ---------------------------------------------------------------------------

import type { AgentContext, AgentEvent, ApprovalPackage, Flag, KeyMetric, PlanStep, Recommendation, ToolCall, ToolName, ToolResult } from './types';
import type { Deal } from './mockData';
import { TOOLS } from './tools';
import { decide, findCure } from './whatif';
import type { Cure } from './whatif';
import { LOW_CONFIDENCE_FLOOR, sleep, uid } from './util';

/**
 * The decision rule, exported so the UI can preview a deal's computed outcome.
 * Delegates to `decide` in whatif.ts — the single source of truth shared with
 * the what-if stress panel, so the two can never drift apart.
 */
export function recommendationFor(deal: Deal): Recommendation {
  const breaches = deal.covenants.filter((c) => c.status === 'breach').length;
  return decide(breaches, deal.risk.score);
}

const PLAN: PlanStep[] = [
  { id: 'step_extract', title: 'Extract financials from the CIM', toolName: 'extract_financials' },
  { id: 'step_risk', title: 'Compute risk score & rating', toolName: 'compute_risk_score' },
  { id: 'step_peers', title: 'Benchmark against sector peers', toolName: 'benchmark_peers', optional: true },
  { id: 'step_covenants', title: 'Test covenant compliance', toolName: 'check_covenants' },
  { id: 'step_package', title: 'Assemble approval package', toolName: 'assemble_approval_package' },
];

export function getPlan(): PlanStep[] {
  return PLAN;
}

/** The agent's reasoning before each tool call — the assemble step adapts to the data. */
function thinkingFor(tool: ToolName, deal: Deal): string {
  switch (tool) {
    case 'extract_financials':
      return "I'll ground everything in the source document first — pulling revenue, EBITDA, leverage, coverage and liquidity straight from the memorandum rather than relying on priors.";
    case 'compute_risk_score':
      return 'With the financials extracted I can score the credit. Leverage and coverage dominate here, so I weight those most heavily and map the result onto the internal rating scale.';
    case 'benchmark_peers':
      return 'The reviewer kept peer benchmarking in the plan, so I\'ll place the credit in its sector context — leverage, coverage and margin against the comparable set — before testing covenants.';
    case 'check_covenants':
      return 'Now the part that actually gates the deal: testing each proposed covenant against the extracted figures. A single breach changes the recommendation.';
    case 'propose_restructure':
      // only reached via the rework cycle, which streams its own send-back text
      return 'Searching for the smallest sponsor equity contribution that clears the covenant package, within policy limits.';
    case 'assemble_approval_package': {
      const breaches = deal.covenants.filter((c) => c.status === 'breach').length;
      if (breaches === 0) {
        return 'I have what I need, and every covenant passes with headroom. I’ll assemble the memo with an approval recommendation — and still route it to a human officer to sign off.';
      }
      return `I have what I need — but ${breaches} covenant${breaches > 1 ? 's' : ''} ${breaches > 1 ? 'fail' : 'fails'}, so I will not auto-approve. I’ll assemble the memo and route it to a human credit officer.`;
    }
  }
}

/** Merge deal-specific values into the tool's args (shown in the inspector). */
function buildArgs(tool: ToolName, deal: Deal): Record<string, unknown> {
  const base = { ...TOOLS[tool].defaultArgs };
  if (tool === 'extract_financials') base.source = `${deal.name} CIM.pdf`;
  if (tool === 'check_covenants') base.tests = deal.covenants.map((c) => c.name);
  return base;
}

/**
 * The "decide" half of the loop: turn the covenant observation into flags.
 * Each breach becomes a critical, human-gating flag; curated warnings ride along.
 * This is exactly where uncertainty is handled rather than auto-passed.
 */
function deriveFlags(deal: Deal): Flag[] {
  const flags: Flag[] = [];
  for (const c of deal.covenants) {
    if (c.status === 'breach') {
      flags.push({
        id: uid('flag'),
        severity: 'critical',
        message: `${c.name} ${c.actual} breaches the ${c.threshold} covenant — cannot auto-approve.`,
        needsHuman: true,
      });
    }
  }
  for (const ex of deal.extraFlags) {
    flags.push({ id: uid('flag'), ...ex });
  }
  return flags;
}

/**
 * The "decide" rule for uncertainty itself: an observation below the confidence
 * floor becomes a needs-human flag. Uncertainty is routed, never auto-passed.
 */
function lowConfidenceFlag(label: string, result: ToolResult): Flag | null {
  if (result.confidence >= LOW_CONFIDENCE_FLOOR) return null;
  return {
    id: uid('flag'),
    severity: 'warning',
    message: `${label} returned ${Math.round(result.confidence * 100)}% confidence (floor ${Math.round(LOW_CONFIDENCE_FLOOR * 100)}%) — figures need human verification against the source.`,
    needsHuman: true,
  };
}

function buildPackage(
  deal: Deal,
  flags: Flag[],
  confByTool: Partial<Record<ToolName, number>>,
  revision = 1,
  reviewerNotes: string[] = [],
): ApprovalPackage {
  const recommendation = recommendationFor(deal);
  const f = deal.financials;
  // Every gate metric came from the extraction observation, so it carries that
  // observation's REAL confidence — the badge is read from the run, not styled.
  // (An uploaded CIM genuinely shows lower confidence; see conf() in tools.ts.)
  const extractConf = confByTool.extract_financials ?? 0.94;
  const metric = (label: string, value: string): ApprovalPackage['keyMetrics'][number] => ({
    label,
    value,
    confidence: extractConf,
    source: 'extract_financials',
  });
  return {
    memoId: deal.memoId,
    borrower: deal.document.borrower,
    facility: deal.document.facility,
    recommendation,
    riskRating: deal.risk.rating,
    revision,
    reviewerNotes,
    keyMetrics: [
      metric('Revenue (TTM)', `$${f.revenueTtm}M`),
      metric('Adj. EBITDA', `$${f.ebitdaTtm}M · ${f.ebitdaMarginPct}%`),
      metric('Total Leverage', `${f.leverageX}x`),
      metric('Interest Coverage', `${f.interestCoverageX}x`),
      metric('Liquidity', `$${f.liquidity}M`),
    ],
    flags,
    summary: deal.memoSummary,
  };
}

/**
 * A revision proposing a restructure: the package's figures ARE the revised
 * structure (from the cure search), its recommendation re-derived through the
 * same `decide` rule. Revised metrics trace to the Structuring Engine
 * observation, not the extraction — provenance stays honest.
 */
function buildRevisedPackage(
  deal: Deal,
  cure: Cure,
  flags: Flag[],
  confByTool: Partial<Record<ToolName, number>>,
  revision: number,
  reviewerNotes: string[],
): ApprovalPackage {
  const o = cure.outcome;
  const s = cure.scenario;
  const f = deal.financials;
  const extractConf = confByTool.extract_financials ?? 0.94;
  const structConf = confByTool.propose_restructure ?? 0.9;
  const r2 = (n: number) => n.toFixed(2); // "4.00x", never a bare "4x"
  const m = (label: string, value: string, source: ToolName, confidence: number): KeyMetric => ({
    label,
    value,
    confidence,
    source,
  });
  const summary =
    `$${cure.contribution}M sponsor equity — $${cure.debtPaydown}M debt paydown` +
    (cure.liquidityTopUp > 0 ? ` and $${cure.liquidityTopUp}M to balance-sheet liquidity` : '');
  return {
    memoId: deal.memoId,
    borrower: deal.document.borrower,
    facility: deal.document.facility,
    recommendation: o.recommendation,
    riskRating: o.risk.rating,
    revision,
    reviewerNotes,
    restructure: { contribution: cure.contribution, summary },
    keyMetrics: [
      m('Revenue (TTM)', `$${f.revenueTtm}M`, 'extract_financials', extractConf),
      m('Adj. EBITDA', `$${f.ebitdaTtm}M · ${f.ebitdaMarginPct}%`, 'extract_financials', extractConf),
      m('Total Leverage', `${r2(o.ratios.leverageX)}x`, 'propose_restructure', structConf),
      m('Interest Coverage', `${r2(o.ratios.interestCoverageX)}x`, 'propose_restructure', structConf),
      m('Liquidity', `$${s.liquidity}M`, 'propose_restructure', structConf),
    ],
    flags,
    summary:
      `Revised structure: ${summary}. Total debt falls to $${s.debt}M (leverage ${r2(o.ratios.leverageX)}x), ` +
      `every covenant passes, and the risk score recomputes to ${o.risk.score} (${o.risk.rating}) — through the same ` +
      `decision rule as the original analysis. Recommend approval of the revised structure, subject to the sponsor commitment.`,
  };
}

/** Stream a reasoning string out as word-ish deltas, like a token stream. */
async function* streamThinking(stepId: string, text: string, ctx: AgentContext): AsyncGenerator<AgentEvent> {
  const chunks = text.match(/\S+\s*/g) ?? [text];
  for (const chunk of chunks) {
    yield { type: 'thinking_delta', stepId, text: chunk };
    await sleep((16 + chunk.length * 2) / ctx.speed, ctx.signal);
  }
}

export async function* runCreditAgent(ctx: AgentContext): AsyncGenerator<AgentEvent> {
  const { deal } = ctx;
  // local copy: reviewer send-backs append revision steps to THIS run's plan.
  // The intent gate may have excluded optional steps — they stay in the plan
  // (ghosted in the UI) but the loop skips them; only `optional` can be skipped.
  const plan: PlanStep[] = PLAN.map((p) => ({
    ...p,
    skipped: p.optional === true && ctx.enabledStepIds !== undefined && !ctx.enabledStepIds.includes(p.id),
  }));
  yield { type: 'run_started', plan, documentTitle: deal.document.title };
  await sleep(300 / ctx.speed, ctx.signal);

  const collectedFlags: Flag[] = [];
  // kept separately so a restructured revision can carry forward what still
  // applies (extraction uncertainty, the reviewer thread) while dropping the
  // filed-figure breach flags its revised structure just cured
  const lowConfFlags: Flag[] = [];
  const noteFlags: Flag[] = [];
  // real per-tool confidences from this run's observations (feeds the gate metrics)
  const confByTool: Partial<Record<ToolName, number>> = {};

  for (let i = 0; i < plan.length; i++) {
    const step = plan[i];
    if (step.skipped) continue; // excluded at the intent gate
    yield { type: 'step_started', stepId: step.id, index: i, title: step.title };

    // (a) stream reasoning
    yield* streamThinking(step.id, thinkingFor(step.toolName, deal), ctx);

    // (b) act: choose and invoke a tool
    const tool = TOOLS[step.toolName];
    const call: ToolCall = {
      id: uid('call'),
      name: tool.name,
      label: tool.label,
      args: buildArgs(step.toolName, deal),
    };
    yield { type: 'tool_call', stepId: step.id, call };

    // (c) observe
    const result = await tool.run(ctx);
    confByTool[step.toolName] = result.confidence;
    yield { type: 'tool_result', stepId: step.id, call, result };

    // (d) decide: derive flags from the observation — including from its
    // confidence: a low-certainty reading is itself a reason to involve a human
    const lowConf = lowConfidenceFlag(tool.label, result);
    if (lowConf) {
      collectedFlags.push(lowConf);
      lowConfFlags.push(lowConf);
      yield { type: 'flag', stepId: step.id, flag: lowConf };
      await sleep(220 / ctx.speed, ctx.signal);
    }
    if (step.toolName === 'check_covenants') {
      for (const flag of deriveFlags(deal)) {
        collectedFlags.push(flag);
        yield { type: 'flag', stepId: step.id, flag };
        await sleep(220 / ctx.speed, ctx.signal);
      }
    }

    yield { type: 'step_completed', stepId: step.id };
    await sleep(260 / ctx.speed, ctx.signal);
  }

  // (e) human-in-the-loop gate — a LOOP, not a one-shot. Approve/reject finish
  // the run; "send back for rework" re-enters it: the reviewer's note becomes a
  // tracked flag, a revision step appends to the plan, the memo is reassembled,
  // and the agent suspends at the gate again. Register the approval promise
  // BEFORE yielding the gate event so the resolver is ready when the UI renders.
  const reviewerNotes: string[] = [];
  let revision = 1;
  let pkg = buildPackage(deal, collectedFlags, confByTool);

  for (;;) {
    const decisionPromise = ctx.requestApproval();
    yield { type: 'awaiting_approval', package: pkg };

    const gate = await decisionPromise; // blocks until the human acts
    if (gate.verb !== 'rework') {
      yield {
        type: 'run_finished',
        outcome: gate.verb,
        package: pkg,
        note: gate.note,
        noteProvenance: gate.noteProvenance,
        amendments: gate.amendments,
        auto: gate.auto,
      };
      return;
    }

    // --- send-back: the loop resumes with the reviewer's instruction. Rather
    // than restating the filed figures, the agent treats a send-back as
    // authorization to RESTRUCTURE within policy: the cure search looks for
    // the smallest sponsor-equity contribution that clears every covenant
    // (same decide rule), and the next revision is built on that structure.
    revision += 1;
    const note = gate.note?.trim() || 'Reviewer requested rework (no note given).';
    reviewerNotes.push(note);

    const cure = findCure(deal);
    const revising = cure !== null && cure.contribution > 0;

    const stepId = `step_rework_${revision}`;
    const reworkStep: PlanStep = {
      id: stepId,
      title: revising ? `Propose revised structure · rev ${revision}` : `Revise per reviewer note · rev ${revision}`,
      toolName: 'propose_restructure',
    };
    plan.push(reworkStep);
    yield { type: 'plan_updated', plan: [...plan] };
    yield { type: 'step_started', stepId, index: plan.length - 1, title: reworkStep.title };

    yield* streamThinking(
      stepId,
      `The reviewer sent this back: “${note}” Restating the filed figures wouldn't change anything — so I'll treat the send-back as authorization to restructure within policy limits: search for the smallest sponsor equity contribution that clears the whole covenant package, re-derive the recommendation through the same decide rule, and reassemble revision ${revision} for a fresh countersign.`,
      ctx,
    );

    const tool = TOOLS.propose_restructure;
    const call: ToolCall = {
      id: uid('call'),
      name: tool.name,
      label: tool.label,
      args: { ...tool.defaultArgs, revision, reviewerNote: note },
    };
    yield { type: 'tool_call', stepId, call };
    const result = await tool.run(ctx);
    confByTool.propose_restructure = result.confidence;
    yield { type: 'tool_result', stepId, call, result };

    const lowConf = lowConfidenceFlag(tool.label, result);
    if (lowConf) {
      collectedFlags.push(lowConf);
      lowConfFlags.push(lowConf);
      yield { type: 'flag', stepId, flag: lowConf };
    }

    // a send-back note that was itself agent-drafted must say so on the record
    const provTag =
      gate.noteProvenance === 'drafted-verbatim'
        ? ' · note agent-drafted, accepted verbatim'
        : gate.noteProvenance === 'drafted-edited'
          ? ' · note agent-drafted, edited by reviewer'
          : '';
    const noteFlag: Flag = {
      id: uid('flag'),
      severity: 'warning',
      message: `Reviewer send-back (rev ${revision - 1}${provTag}): ${note}`,
      needsHuman: true,
    };
    collectedFlags.push(noteFlag);
    noteFlags.push(noteFlag);
    yield { type: 'flag', stepId, flag: noteFlag };

    if (revising && cure) {
      const cureFlag: Flag = {
        id: uid('flag'),
        severity: 'info',
        message:
          `Restructure proposed: $${cure.contribution}M sponsor equity ($${cure.debtPaydown}M debt paydown` +
          (cure.liquidityTopUp > 0 ? `, $${cure.liquidityTopUp}M to liquidity` : '') +
          `) — every covenant passes on the revised structure.`,
        needsHuman: false,
      };
      yield { type: 'flag', stepId, flag: cureFlag };
      // revised gate: the cure + what still applies (uncertainty, the thread);
      // the filed-figure breach flags are what the restructure just cured
      pkg = buildRevisedPackage(deal, cure, [cureFlag, ...lowConfFlags, ...noteFlags], confByTool, revision, [
        ...reviewerNotes,
      ]);
    } else {
      if (cure === null) {
        const noCure: Flag = {
          id: uid('flag'),
          severity: 'warning',
          message:
            'Structuring search exhausted policy limits (contribution ≤ 35% of debt) — no revised structure clears the covenants; the recommendation stands.',
          needsHuman: true,
        };
        collectedFlags.push(noCure);
        yield { type: 'flag', stepId, flag: noCure };
      }
      pkg = buildPackage(deal, collectedFlags, confByTool, revision, [...reviewerNotes]);
    }

    yield { type: 'step_completed', stepId };
    await sleep(260 / ctx.speed, ctx.signal);
  }
}
