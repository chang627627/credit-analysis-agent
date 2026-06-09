// ---------------------------------------------------------------------------
// The agent's "tools". Each one simulates latency and returns a typed observation
// plus a confidence score, reading from the deal currently under analysis
// (ctx.deal). This mirrors how a real agent calls functions / APIs — only the
// body is mocked.
// ---------------------------------------------------------------------------

import type { AgentContext, ToolName, ToolResult } from './types';
import { sleep } from './util';

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
      return { data: ctx.deal.financials, confidence: 0.94, durationMs: 1100 };
    },
  },

  compute_risk_score: {
    name: 'compute_risk_score',
    label: 'Risk Engine',
    defaultArgs: { model: 'internal-pd-v3', inputs: 'extracted_financials' },
    run: async (ctx) => {
      await sleep(800 / ctx.speed, ctx.signal);
      return { data: ctx.deal.risk, confidence: 0.88, durationMs: 800 };
    },
  },

  check_covenants: {
    name: 'check_covenants',
    label: 'Covenant Tester',
    defaultArgs: { package: 'proposed_term_sheet_v2' },
    run: async (ctx) => {
      await sleep(900 / ctx.speed, ctx.signal);
      return { data: ctx.deal.covenants, confidence: 0.97, durationMs: 900 };
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
        confidence: 0.91,
        durationMs: 700,
      };
    },
  },
};
