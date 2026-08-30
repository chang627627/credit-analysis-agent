// ---------------------------------------------------------------------------
// The agent's "tools". Each one simulates latency and returns a typed observation
// plus a confidence score, reading from the deal currently under analysis
// (ctx.deal). This mirrors how a real agent calls functions / APIs — only the
// body is mocked.
// ---------------------------------------------------------------------------

import type { AgentContext, ToolName, ToolResult } from './types';
import { findCure } from './whatif';
import { sleep } from './util';

/**
 * Confidence per observation. Uploaded documents score lower than the curated
 * samples — simulated extraction is less certain on an unseen file — which is
 * what exercises the loop's low-confidence flag rule (see LOW_CONFIDENCE_FLOOR).
 */
const conf = (ctx: AgentContext, base: number): number =>
  ctx.deal.uploaded ? Math.round((base - 0.18) * 100) / 100 : base;

export interface ToolDef {
  name: ToolName;
  label: string;
  /** Static base args; deal-specific args are merged in by the loop. */
  defaultArgs: Record<string, unknown>;
  run: (ctx: AgentContext) => Promise<ToolResult>;
}

export const TOOLS: Record<ToolName, ToolDef> = {
  extract_financials: {
    name: 'extract_financials',
    label: 'Document Intelligence',
    defaultArgs: {
      pages: '12–28',
      fields: ['revenue', 'ebitda', 'leverage', 'coverage', 'liquidity'],
    },
    run: async (ctx) => {
      await sleep(1100 / ctx.speed, ctx.signal);
      return { data: ctx.deal.financials, confidence: conf(ctx, 0.94), durationMs: 1100 };
    },
  },

  compute_risk_score: {
    name: 'compute_risk_score',
    label: 'Risk Engine',
    defaultArgs: { model: 'internal-pd-v3', inputs: 'extracted_financials' },
    run: async (ctx) => {
      await sleep(800 / ctx.speed, ctx.signal);
      return { data: ctx.deal.risk, confidence: conf(ctx, 0.88), durationMs: 800 };
    },
  },

  check_covenants: {
    name: 'check_covenants',
    label: 'Covenant Tester',
    defaultArgs: { package: 'proposed_term_sheet_v2' },
    run: async (ctx) => {
      await sleep(900 / ctx.speed, ctx.signal);
      return { data: ctx.deal.covenants, confidence: conf(ctx, 0.97), durationMs: 900 };
    },
  },

  propose_restructure: {
    name: 'propose_restructure',
    label: 'Structuring Engine',
    defaultArgs: {
      objective: 'clear the covenant package',
      instrument: 'sponsor equity contribution',
      policyLimit: 'contribution ≤ 35% of total debt',
    },
    // Runs the same pure cure search the what-if model exposes: the smallest
    // equity contribution whose revised structure makes `decide` say approve.
    run: async (ctx) => {
      await sleep(950 / ctx.speed, ctx.signal);
      const cure = findCure(ctx.deal);
      if (!cure) {
        return {
          data: {
            viable: false,
            searched: 'equity contributions up to 35% of total debt (paydown and liquidity splits)',
            reason: 'no structure within policy limits clears the covenant package',
          },
          confidence: conf(ctx, 0.92),
          durationMs: 950,
        };
      }
      const o = cure.outcome;
      return {
        data: {
          viable: true,
          contributionM: cure.contribution,
          debtPaydownM: cure.debtPaydown,
          liquidityTopUpM: cure.liquidityTopUp,
          revised: {
            totalDebtM: cure.scenario.debt,
            leverageX: Math.round(o.ratios.leverageX * 100) / 100,
            interestCoverageX: Math.round(o.ratios.interestCoverageX * 100) / 100,
            liquidityM: cure.scenario.liquidity,
            riskScore: o.risk.score,
          },
          breachesRemaining: o.breaches,
          decidedBy: 'same decide() rule as the analysis and the what-if panel',
        },
        confidence: conf(ctx, 0.9),
        durationMs: 950,
      };
    },
  },

  assemble_approval_package: {
    name: 'assemble_approval_package',
    label: 'Memo Builder',
    defaultArgs: {
      template: 'credit-approval-memo',
      sections: ['summary', 'financials', 'risk', 'covenants', 'recommendation'],
    },
    run: async (ctx) => {
      await sleep(700 / ctx.speed, ctx.signal);
      return {
        data: { memoId: ctx.deal.memoId, sections: 5, attachments: ['audit_trail.json'] },
        confidence: conf(ctx, 0.91),
        durationMs: 700,
      };
    },
  },
};
