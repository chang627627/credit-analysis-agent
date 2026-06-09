// ---------------------------------------------------------------------------
// Domain & event types for the credit-analysis agent.
//
// The whole "agent" is an async generator that emits a stream of AgentEvents.
// The UI never talks to a model or a server — it just renders this event stream.
// Swapping the mock for a real LLM later means producing the same events from a
// streamed API response. That boundary is the point of this prototype.
// ---------------------------------------------------------------------------

import type { Deal } from './mockData';

export type Confidence = number; // 0..1

export type ToolName =
  | 'extract_financials'
  | 'compute_risk_score'
  | 'check_covenants'
  | 'assemble_approval_package';

export interface PlanStep {
  id: string;
  title: string;
  toolName: ToolName;
}

/** A decision by the agent to invoke a tool, with the arguments it chose. */
export interface ToolCall {
  id: string;
  name: ToolName;
  label: string;
  args: Record<string, unknown>;
}

/** The observation returned from a tool — data plus how much to trust it. */
export interface ToolResult {
  data: unknown;
  confidence: Confidence;
  durationMs: number;
}

export type FlagSeverity = 'info' | 'warning' | 'critical';

/** Something the agent surfaced for attention. `needsHuman` gates auto-approval. */
export interface Flag {
  id: string;
  severity: FlagSeverity;
  message: string;
  needsHuman: boolean;
}

export interface KeyMetric {
  label: string;
  value: string;
  confidence: Confidence;
}

export type Recommendation = 'approve' | 'decline' | 'escalate';

/** The artifact the human reviews at the approval gate. */
export interface ApprovalPackage {
  memoId: string;
  borrower: string;
  facility: string;
  recommendation: Recommendation;
  riskRating: string;
  keyMetrics: KeyMetric[];
  flags: Flag[];
  summary: string;
}

export type ApprovalDecision = 'approve' | 'reject';

/** The event stream. The UI is a pure function of the reduction of these. */
export type AgentEvent =
  | { type: 'run_started'; plan: PlanStep[]; documentTitle: string }
  | { type: 'step_started'; stepId: string; index: number; title: string }
  | { type: 'thinking_delta'; stepId: string; text: string }
  | { type: 'tool_call'; stepId: string; call: ToolCall }
  | { type: 'tool_result'; stepId: string; call: ToolCall; result: ToolResult }
  | { type: 'flag'; stepId: string; flag: Flag }
  | { type: 'step_completed'; stepId: string }
  | { type: 'awaiting_approval'; package: ApprovalPackage }
  | { type: 'run_finished'; outcome: ApprovalDecision; package: ApprovalPackage };

/**
 * Everything the loop needs from the outside world. `requestApproval` is the
 * human-in-the-loop hook: the generator awaits it and blocks until the UI
 * resolves a decision. `speed` is read live (via a getter) so the demo speed
 * slider affects in-flight delays.
 */
export interface AgentContext {
  /** The deal being analyzed this run — snapshotted at start. */
  deal: Deal;
  requestApproval: () => Promise<ApprovalDecision>;
  readonly speed: number;
  signal?: AbortSignal;
}
