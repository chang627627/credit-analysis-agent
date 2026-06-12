// ---------------------------------------------------------------------------
// useCreditAgent — the bridge between the agent's event stream and React state.
//
// It consumes runCreditAgent()'s AsyncGenerator with `for await`, reduces each
// event into view state, and exposes the human-in-the-loop controls (approve /
// reject) plus run controls (start / reset). All the orchestration lives here;
// components below stay dumb and declarative.
// ---------------------------------------------------------------------------

import { useCallback, useRef, useState } from 'react';
import type {
  AgentContext,
  AgentEvent,
  ApprovalDecision,
  ApprovalPackage,
  Flag,
  PlanStep,
  Recommendation,
  ToolCall,
  ToolResult,
} from '../agent/types';
import { getPlan, recommendationFor, runCreditAgent } from '../agent/runAgent';
import type { Deal } from '../agent/mockData';
import { DEALS } from '../agent/mockData';
import { synthesizeDealFromFile } from '../agent/synthesize';
import { answerQuestion } from '../agent/responder';
import { uid } from '../agent/util';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
}

export interface ParsingState {
  name: string;
}

export type RunStatus = 'idle' | 'running' | 'awaiting_approval' | 'approved' | 'rejected' | 'error';

export interface StepView {
  id: string;
  index: number;
  title: string;
  thinking: string;
  call?: ToolCall;
  result?: ToolResult;
  flags: Flag[];
  status: 'running' | 'done';
}

export type AuditKind = 'info' | 'tool' | 'result' | 'flag' | 'human';

export interface AuditEntry {
  id: string;
  t: number;
  kind: AuditKind;
  label: string;
  detail?: string;
}

/** Audit entry enriched with run context — the session-wide trail. */
export interface AuditHistoryEntry extends AuditEntry {
  dealName: string;
  runId: number;
}

export interface CreditAgentApi {
  status: RunStatus;
  plan: PlanStep[];
  steps: StepView[];
  approvalPackage: ApprovalPackage | null;
  audit: AuditEntry[];
  /** session-wide trail: every entry from every run, never cleared (capped) */
  auditHistory: AuditHistoryEntry[];
  speed: number;
  document: Deal['document'];
  deals: { id: string; name: string; uploaded?: boolean; outcome: Recommendation }[];
  /** full deal objects — the portfolio monitor reads financials/covenants */
  dealsFull: Deal[];
  selectedDealId: string;
  parsing: ParsingState | null;
  messages: ChatMessage[];
  setSpeed: (n: number) => void;
  selectDeal: (id: string) => void;
  uploadDeal: (file: File) => void;
  sendMessage: (text: string) => void;
  /** Optionally pass a deal id to select-and-run in one action (launchpad chips). */
  start: (dealId?: string) => void;
  approve: () => void;
  reject: () => void;
  reset: () => void;
  exportAudit: () => void;
}

export function useCreditAgent(): CreditAgentApi {
  const [status, setStatus] = useState<RunStatus>('idle');
  const [plan, setPlan] = useState<PlanStep[]>(() => getPlan());
  const [steps, setSteps] = useState<StepView[]>([]);
  const [approvalPackage, setApprovalPackage] = useState<ApprovalPackage | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditHistory, setAuditHistory] = useState<AuditHistoryEntry[]>([]);
  const [speed, setSpeed] = useState(1);
  const [extraDeals, setExtraDeals] = useState<Deal[]>([]);
  const [dealId, setDealId] = useState(DEALS[0].id);
  const [parsing, setParsing] = useState<ParsingState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const allDeals = [...DEALS, ...extraDeals];
  const deal = allDeals.find((d) => d.id === dealId) ?? DEALS[0];
  const allDealsRef = useRef(allDeals);
  allDealsRef.current = allDeals;

  // Mutable handles the loop reads/writes without re-rendering.
  const approvalResolver = useRef<((d: ApprovalDecision) => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  const runDealNameRef = useRef(DEALS[0].name); // the deal of the CURRENT run (set in start)
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const dealRef = useRef(deal);
  dealRef.current = deal;

  const pushAudit = useCallback((entry: Omit<AuditEntry, 'id' | 't'>) => {
    const full: AuditEntry = { ...entry, id: uid('audit'), t: Date.now() };
    setAudit((prev) => [...prev, full]);
    // session-wide trail: survives reset/deal switches, capped at 500 entries
    setAuditHistory((prev) => [
      ...prev.slice(-499),
      { ...full, dealName: runDealNameRef.current, runId: runIdRef.current },
    ]);
  }, []);

  const apply = useCallback(
    (ev: AgentEvent) => {
      switch (ev.type) {
        case 'run_started':
          setPlan(ev.plan);
          pushAudit({ kind: 'info', label: 'Run started', detail: ev.documentTitle });
          break;
        case 'step_started':
          setSteps((prev) => [
            ...prev,
            { id: ev.stepId, index: ev.index, title: ev.title, thinking: '', flags: [], status: 'running' },
          ]);
          pushAudit({ kind: 'info', label: `Step ${ev.index + 1} · ${ev.title}` });
          break;
        case 'thinking_delta':
          setSteps((prev) => prev.map((s) => (s.id === ev.stepId ? { ...s, thinking: s.thinking + ev.text } : s)));
          break;
        case 'tool_call':
          setSteps((prev) => prev.map((s) => (s.id === ev.stepId ? { ...s, call: ev.call } : s)));
          pushAudit({ kind: 'tool', label: `Tool call · ${ev.call.name}`, detail: JSON.stringify(ev.call.args) });
          break;
        case 'tool_result':
          setSteps((prev) => prev.map((s) => (s.id === ev.stepId ? { ...s, result: ev.result } : s)));
          pushAudit({
            kind: 'result',
            label: `Tool result · ${ev.call.name}`,
            detail: `confidence ${(ev.result.confidence * 100).toFixed(0)}% · ${ev.result.durationMs}ms`,
          });
          break;
        case 'flag':
          setSteps((prev) => prev.map((s) => (s.id === ev.stepId ? { ...s, flags: [...s.flags, ev.flag] } : s)));
          pushAudit({ kind: 'flag', label: `Flag · ${ev.flag.severity}`, detail: ev.flag.message });
          break;
        case 'step_completed':
          setSteps((prev) => prev.map((s) => (s.id === ev.stepId ? { ...s, status: 'done' } : s)));
          break;
        case 'awaiting_approval':
          setApprovalPackage(ev.package);
          setStatus('awaiting_approval');
          pushAudit({ kind: 'human', label: 'Awaiting human approval', detail: `recommendation: ${ev.package.recommendation}` });
          break;
        case 'run_finished':
          setStatus(ev.outcome === 'approve' ? 'approved' : 'rejected');
          pushAudit({ kind: 'human', label: ev.outcome === 'approve' ? 'Human APPROVED' : 'Human REJECTED' });
          break;
      }
    },
    [pushAudit],
  );

  const start = useCallback((dealId?: string) => {
    // reset transient state for a fresh run
    abortRef.current?.abort();
    approvalResolver.current = null;
    setSteps([]);
    setApprovalPackage(null);
    setAudit([]);
    setMessages([]);
    setStatus('running');

    // resolve the deal directly so select-and-run is race-free
    const runDeal = dealId
      ? allDealsRef.current.find((d) => d.id === dealId) ?? dealRef.current
      : dealRef.current;
    if (dealId) setDealId(dealId);
    runIdRef.current += 1;
    runDealNameRef.current = runDeal.name;

    const ac = new AbortController();
    abortRef.current = ac;

    const ctx: AgentContext = {
      deal: runDeal, // snapshot the deal for this run
      get speed() {
        return speedRef.current;
      },
      requestApproval: () =>
        new Promise<ApprovalDecision>((resolve) => {
          approvalResolver.current = resolve;
        }),
      signal: ac.signal,
    };

    void (async () => {
      try {
        for await (const ev of runCreditAgent(ctx)) {
          if (ac.signal.aborted) return;
          apply(ev);
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setStatus('error');
        pushAudit({ kind: 'info', label: 'Run error', detail: String(err) });
      }
    })();
  }, [apply, pushAudit]);

  const approve = useCallback(() => {
    approvalResolver.current?.('approve');
    approvalResolver.current = null;
  }, []);

  const reject = useCallback(() => {
    approvalResolver.current?.('reject');
    approvalResolver.current = null;
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    approvalResolver.current = null;
    setStatus('idle');
    setSteps([]);
    setApprovalPackage(null);
    setAudit([]);
    setMessages([]);
  }, []);

  // Switching deals clears the current transcript and returns to idle.
  const selectDeal = useCallback((id: string) => {
    abortRef.current?.abort();
    approvalResolver.current = null;
    setDealId(id);
    setStatus('idle');
    setSteps([]);
    setApprovalPackage(null);
    setAudit([]);
    setMessages([]);
  }, []);

  // Simulated document ingestion: derive a deal from the file name, then load it.
  const uploadDeal = useCallback((file: File) => {
    abortRef.current?.abort();
    approvalResolver.current = null;
    setParsing({ name: file.name });
    setStatus('idle');
    setSteps([]);
    setApprovalPackage(null);
    setAudit([]);
    setMessages([]);
    window.setTimeout(() => {
      const synthesized = synthesizeDealFromFile(file.name);
      setExtraDeals((prev) => [...prev, synthesized]);
      setDealId(synthesized.id);
      setParsing(null);
    }, 1500);
  }, []);

  // Composer follow-ups: a rule-based answer over the current deal + run state.
  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const hasRun = status === 'awaiting_approval' || status === 'approved' || status === 'rejected';
      const reply = answerQuestion(deal, hasRun, approvalPackage, trimmed);
      setMessages((prev) => [
        ...prev,
        { id: uid('msg'), role: 'user', text: trimmed },
        { id: uid('msg'), role: 'agent', text: reply },
      ]);
    },
    [deal, status, approvalPackage],
  );

  // Download the full run as a signed-off JSON record — the exportable audit
  // trail a regulated workflow would archive.
  const exportAudit = useCallback(() => {
    const payload = {
      document: deal.document.title,
      borrower: deal.document.borrower,
      facility: deal.document.facility,
      status,
      recommendation: approvalPackage?.recommendation ?? null,
      events: audit,
      package: approvalPackage,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'credit-analysis-audit.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [status, approvalPackage, audit, deal]);

  return {
    status,
    plan,
    steps,
    approvalPackage,
    audit,
    auditHistory,
    speed,
    document: deal.document,
    deals: allDeals.map((d) => ({ id: d.id, name: d.name, uploaded: d.uploaded, outcome: recommendationFor(d) })),
    dealsFull: allDeals,
    selectedDealId: dealId,
    parsing,
    messages,
    setSpeed,
    selectDeal,
    uploadDeal,
    sendMessage,
    start,
    approve,
    reject,
    reset,
    exportAudit,
  };
}
