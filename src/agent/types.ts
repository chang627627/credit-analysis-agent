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
  | 'assemble_approval_package'
  | 'propose_restructure';

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
  /** Which tool observation produced this figure — the trace-to-source target. */
  source?: ToolName;
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
  /** 1 = first pass; bumped each time the reviewer sends the memo back. */
  revision: number;
  /** Send-back notes from prior rework cycles, oldest first. */
  reviewerNotes: string[];
  /**
   * Present when this revision proposes a restructure (found by the cure
   * search on a send-back) — the package's figures are then the REVISED
   * structure, not the filed figures, and the gate labels them as such.
   */
  restructure?: { contribution: number; summary: string };
}

export type ApprovalDecision = 'approve' | 'reject';

/**
 * How the human resolves the gate. `rework` re-enters the loop instead of
 * finishing it. The note is the reviewer's rationale — optional to approve,
 * required (enforced by the gate UI) to reject or send back, because a human
 * decision without a reason is the one thing a regulated trail can't carry.
 */
export type GateVerb = ApprovalDecision | 'rework';
export interface GateDecision {
  verb: GateVerb;
  note?: string;
}

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
  /** The plan grew mid-run (a reviewer send-back appended a revision step). */
  | { type: 'plan_updated'; plan: PlanStep[] }
  | { type: 'run_finished'; outcome: ApprovalDecision; package: ApprovalPackage; note?: string };

/**
 * Everything the loop needs from the outside world. `requestApproval` is the
 * human-in-the-loop hook: the generator awaits it and blocks until the UI
 * resolves a decision. `speed` is read live (via a getter) so the demo speed
 * slider affects in-flight delays.
 */
export interface AgentContext {
  /** The deal being analyzed this run — snapshotted at start. */
  deal: Deal;
  requestApproval: () => Promise<GateDecision>;
  readonly speed: number;
  signal?: AbortSignal;
}
