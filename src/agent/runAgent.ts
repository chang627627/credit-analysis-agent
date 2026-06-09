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

import type { AgentContext, AgentEvent, ApprovalPackage, Flag, PlanStep, Recommendation, ToolCall, ToolName } from './types';
import type { Deal } from './mockData';
import { TOOLS } from './tools';
import { sleep, uid } from './util';

/** The decision rule, exported so the UI can preview a deal's computed outcome. */
export function recommendationFor(deal: Deal): Recommendation {
  const breaches = deal.covenants.filter((c) => c.status === 'breach').length;
  return breaches === 0 ? 'approve' : deal.risk.score >= 75 ? 'decline' : 'escalate';
}

const PLAN: PlanStep[] = [
  { id: 'step_extract', title: 'Extract financials from the CIM', toolName: 'extract_financials' },
  { id: 'step_risk', title: 'Compute risk score & rating', toolName: 'compute_risk_score' },
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
    case 'check_covenants':
      return 'Now the part that actually gates the deal: testing each proposed covenant against the extracted figures. A single breach changes the recommendation.';
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

function buildPackage(deal: Deal, flags: Flag[]): ApprovalPackage {
  const recommendation = recommendationFor(deal);
  const f = deal.financials;
  return {
    memoId: deal.memoId,
    borrower: deal.document.borrower,
    facility: deal.document.facility,
    recommendation,
    riskRating: deal.risk.rating,
    keyMetrics: [
      { label: 'Revenue (TTM)', value: `$${f.revenueTtm}M`, confidence: 0.94 },
      { label: 'Adj. EBITDA', value: `$${f.ebitdaTtm}M · ${f.ebitdaMarginPct}%`, confidence: 0.94 },
      { label: 'Total Leverage', value: `${f.leverageX}x`, confidence: 0.92 },
      { label: 'Interest Coverage', value: `${f.interestCoverageX}x`, confidence: 0.9 },
      { label: 'Liquidity', value: `$${f.liquidity}M`, confidence: 0.96 },
    ],
    flags,
    summary: deal.memoSummary,
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
  yield { type: 'run_started', plan: PLAN, documentTitle: deal.document.title };
  await sleep(300 / ctx.speed, ctx.signal);

  const collectedFlags: Flag[] = [];

  for (let i = 0; i < PLAN.length; i++) {
    const step = PLAN[i];
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
    yield { type: 'tool_result', stepId: step.id, call, result };

    // (d) decide: derive flags from the observation
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

  // (e) human-in-the-loop gate. Register the approval promise BEFORE yielding the
  // gate event so the resolver is ready when the UI renders the buttons.
  const pkg = buildPackage(deal, collectedFlags);
  const decisionPromise = ctx.requestApproval();
  yield { type: 'awaiting_approval', package: pkg };

  const decision = await decisionPromise; // blocks until the human acts
  yield { type: 'run_finished', outcome: decision, package: pkg };
}
