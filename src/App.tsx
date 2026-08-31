import { useEffect, useRef, useState } from 'react';
import { useCreditAgent } from './hooks/useCreditAgent';
import type { ChatMessage } from './hooks/useCreditAgent';
import { useMonitor } from './hooks/useMonitor';
import type { Amendment, NoteProvenance, Recommendation, ToolName } from './agent/types';
import type { TraceTarget } from './components/StepCard';
import { getPlan } from './agent/runAgent';
import { PortfolioView } from './components/PortfolioView';
import { AuditView } from './components/AuditView';
import { AgentsView } from './components/AgentsView';
import { DealsView } from './components/DealsView';
import type { Cite } from './components/Artifact';
import { Header, MOD_KEY } from './components/Header';
import type { AutonomyMode } from './components/Header';
import { PlanReview } from './components/PlanReview';
import { NavSidebar } from './components/NavSidebar';
import { DocumentPanel } from './components/DocumentPanel';
import { PlanBar } from './components/PlanBar';
import { AgentStream } from './components/AgentStream';
import { ApprovalGate } from './components/ApprovalGate';
import { OutcomeBanner } from './components/OutcomeBanner';
import { WhatIfPanel } from './components/WhatIfPanel';
import { Composer } from './components/Composer';
import { CommandPalette } from './components/CommandPalette';
import type { Command } from './components/CommandPalette';
import { Toasts, useToasts } from './components/Toasts';

interface DealOption {
  id: string;
  name: string;
  uploaded?: boolean;
  outcome: Recommendation;
}

function EmptyState({
  onRun,
  deals,
  onPickAndRun,
}: {
  onRun: () => void;
  deals: DealOption[];
  onPickAndRun: (id: string) => void;
}) {
  const LOOP = ['Plan', 'Act', 'Observe', 'Decide'];
  return (
    <div className="empty">
      <div className="empty__icon">◧</div>
      <h2>Agentic credit analysis</h2>
      <p>
        Upload a CIM or pick a deal on the left, then run. The agent works through a visible loop —
        streaming its reasoning, showing each tool call with inputs, outputs and confidence,
        flagging covenant breaches, and pausing at a <strong>human approval gate</strong> before
        anything is signed.
      </p>
      <ol className="empty__loop" aria-label="The agent loop">
        {LOOP.map((s, i) => (
          <li key={s}>
            <span className="plan__num">{i + 1}</span>
            {s}
            {i < LOOP.length - 1 && <span className="empty__arrow">→</span>}
          </li>
        ))}
      </ol>
      <button className="btn btn--primary btn--lg" onClick={onRun}>
        Run analysis <span className="kbd kbd--on-accent">{MOD_KEY}↵</span>
      </button>
      <p className="empty__hint">or try a sample deal — each ends differently:</p>
      <div className="empty__chips">
        {deals
          .filter((d) => !d.uploaded)
          .slice(0, 3)
          .map((d) => (
            <button key={d.id} className="chip" onClick={() => onPickAndRun(d.id)}>
              {d.name}
              <em className={`empty__tag empty__tag--${d.outcome}`}>{d.outcome.toUpperCase()}</em>
            </button>
          ))}
      </div>
    </div>
  );
}

function MessageThread({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) return null;
  return (
    <div className="thread">
      {messages.map((m) => (
        <div key={m.id} className={`msg msg--${m.role}`}>
          {m.role === 'agent' && <span className="msg__avatar">◧</span>}
          <div className="msg__bubble">{m.text}</div>
        </div>
      ))}
    </div>
  );
}

type Theme = 'light' | 'dark';

export default function App() {
  const agent = useCreditAgent();
  const { status } = agent;
  const finished = status === 'approved' || status === 'rejected';
  const busy =
    status === 'plan_review' || status === 'running' || status === 'awaiting_approval' || agent.parsing !== null;

  // autonomy policy: what may resolve without a click (persisted; default gate-all)
  const [autonomy, setAutonomy] = useState<AutonomyMode>(() => {
    try {
      return localStorage.getItem('autonomy') === 'auto' ? 'auto' : 'gate';
    } catch {
      return 'gate';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('autonomy', autonomy);
    } catch {
      /* private mode */
    }
  }, [autonomy]);
  // The full deal behind the current package — what the what-if panel stresses.
  const currentDeal = agent.dealsFull.find((d) => d.id === agent.selectedDealId);
  const showWhatIf = status === 'awaiting_approval' || finished;

  const { toasts, notify } = useToasts();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // app-shell routing + the always-on monitoring agent
  const [view, setView] = useState<'analysis' | 'deals' | 'portfolio' | 'agents' | 'audit'>('analysis');
  const monitor = useMonitor(agent.dealsFull, agent.speed);
  const openEscalations = monitor.escalations.filter((e) => e.status === 'open').length;

  const handleNavigate = (id: string) => {
    if (id === 'analysis') setView('analysis');
    else if (id === 'deals') setView('deals');
    else if (id === 'portfolio') setView('portfolio');
    else if (id === 'agents') setView('agents');
    else if (id === 'audit') setView('audit');
  };

  const openDealFromPortfolio = (dealId: string) => {
    handleSelectDeal(dealId);
    setView('analysis');
  };

  // click-through provenance: artifact figures highlight their source sentence
  const [citedValues, setCitedValues] = useState<string[]>([]);
  // trace-to-source: a gate figure jumps to the tool observation behind it
  const [trace, setTrace] = useState<TraceTarget | null>(null);
  // send-back choreography: keep the gate mounted while it recedes upstream
  const [gateLeaving, setGateLeaving] = useState(false);
  // one chokepoint: ANY deal change (picker, palette, launchpad chip, upload)
  // invalidates citations — stale strings on a new document = false provenance
  useEffect(() => {
    setCitedValues([]);
    setTrace(null);
  }, [agent.selectedDealId]);
  // a stale trace target must not re-open inspectors on the NEXT run
  useEffect(() => {
    setTrace(null);
  }, [agent.runId]);

  const handleTrace = (tool: ToolName) => {
    setTrace((t) => ({ tool, tick: (t?.tick ?? 0) + 1 }));
  };

  const handleRework = (note: string, provenance?: NoteProvenance) => {
    if (gateLeaving) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      agent.requestRework(note, provenance);
      return;
    }
    setGateLeaving(true);
    window.setTimeout(() => {
      agent.requestRework(note, provenance);
      setGateLeaving(false);
    }, 320);
  };

  // Intent-gate draft state lives HERE, not in PlanReview: switching views and
  // returning must not re-check excluded steps or re-arm a held countdown.
  // Reset whenever the intent gate closes (run started / cancelled / new deal).
  const [planEnabledIds, setPlanEnabledIds] = useState<string[]>(() => getPlan().map((p) => p.id));
  const [planHeld, setPlanHeld] = useState(false);
  useEffect(() => {
    if (status !== 'plan_review') {
      setPlanEnabledIds(getPlan().map((p) => p.id));
      setPlanHeld(false);
    }
  }, [status]);
  const togglePlanStep = (id: string) => {
    setPlanEnabledIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Gate holds + drafts that must survive a view-switch remount of the gate
  const [gateHold, setGateHold] = useState(false);
  useEffect(() => {
    if (status !== 'awaiting_approval') setGateHold(false);
  }, [status]);
  const gateDraftRef = useRef<{ note?: string; noteProvenance?: NoteProvenance; amendments: Amendment[] }>({
    amendments: [],
  });

  // the autonomy policy may resolve ONLY a clean first-pass approval — and it
  // does so visibly, via the gate's cancellable countdown
  const autoEligible =
    autonomy === 'auto' &&
    !gateHold && // an explicit "review manually" survives view-switch remounts
    status === 'awaiting_approval' &&
    !!agent.approvalPackage &&
    agent.approvalPackage.recommendation === 'approve' &&
    agent.approvalPackage.flags.length === 0 &&
    agent.approvalPackage.revision === 1 &&
    agent.approvalPackage.keyMetrics.every((m) => m.confidence >= 0.9);

  // ambient status in the tab title — the between-tabs "is it still running?"
  const doneSteps = agent.steps.filter((s) => s.status === 'done').length;
  const runnableSteps = agent.plan.filter((p) => !p.skipped).length;
  useEffect(() => {
    if (status === 'running') {
      document.title = `● Step ${Math.min(doneSteps + 1, runnableSteps)}/${runnableSteps} · Countersign`;
    } else if (status === 'awaiting_approval') {
      document.title = '⏸ Awaiting countersign · Countersign';
    } else if (status === 'plan_review') {
      document.title = '☑ Plan review · Countersign';
    } else {
      document.title = 'Countersign — agentic credit analysis (demo)';
    }
  }, [status, doneSteps, runnableSteps]);

  const docHidden = () => window.matchMedia('(max-width: 1100px)').matches;
  const cite: Cite = {
    has: (v) => agent.document.body.includes(v),
    show: (v) => {
      if (docHidden()) {
        notify('The source document is hidden at this width — widen the window to see provenance');
        return;
      }
      setCitedValues([v]);
    },
    showAll: (vs) => {
      if (docHidden()) {
        notify('The source document is hidden at this width — widen the window to see provenance');
        return;
      }
      setCitedValues(vs);
    },
  };
  const handleSelectDeal = (id: string) => {
    agent.selectDeal(id);
  };
  const handleReset = () => {
    setCitedValues([]);
    setTrace(null);
    agent.reset();
  };

  // full session export: analysis trail + monitoring escalations, merged
  const exportFullAudit = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      analysisEvents: agent.auditHistory,
      monitoringEscalations: monitor.escalations,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'session-audit-log.json';
    a.click();
    URL.revokeObjectURL(url);
    notify('Session audit log exported · session-audit-log.json', 'good');
  };

  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem('theme') === 'dark' ? 'dark' : 'light',
  );
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const [navCollapsed, setNavCollapsed] = useState(() => localStorage.getItem('navCollapsed') === '1');
  useEffect(() => {
    localStorage.setItem('navCollapsed', navCollapsed ? '1' : '0');
  }, [navCollapsed]);

  // Action wrappers: side effects get acknowledged with a toast.
  const handleExport = () => {
    agent.exportAudit();
    notify('Audit trail exported · credit-analysis-audit.json', 'good');
  };
  const handleUpload = (f: File) => {
    setCitedValues([]);
    agent.uploadDeal(f);
    notify(`Extracting financials from ${f.name}… (simulated)`);
  };
  // Approve/Reject need no toast — the outcome banner already announces the decision.

  // Global keyboard shortcuts. ⌘K always works; the palette consumes its own
  // keys; ⌘↵ works everywhere (the composer ignores meta+Enter); single-key
  // shortcuts require NO modifiers (⌘A/⌘R/⌘[ stay select-all/reload/back) and
  // are excluded in typing contexts. A/R live inside ApprovalGate now — they
  // only exist while the gate is mounted, and R routes through the
  // note-required flow instead of rejecting blind.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (paletteOpen) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (status === 'plan_review') {
          // power path: approves the plan AS EDITED on screen, never the full
          // plan over a visibly excluded step
          e.preventDefault();
          agent.approvePlan(planEnabledIds);
        } else if (!busy) {
          e.preventDefault();
          agent.start();
        }
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '[') {
        e.preventDefault();
        setNavCollapsed((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, status, paletteOpen, agent.start, agent.approvePlan, planEnabledIds]);

  // A countersigned ESCALATE needs a destination, not an ending: route it into
  // the portfolio escalation queue (deduped per run) so senior review picks it up.
  useEffect(() => {
    if (status !== 'approved') return;
    const pkg = agent.approvalPackage;
    if (!pkg || pkg.recommendation !== 'escalate') return;
    // countersigned AS AMENDED: the amended terms resolved the escalation at
    // the gate (the amendment itself is the record) — routing the memo onward
    // as an escalation would contradict what the reviewer just signed
    if (agent.decisionAmendments && agent.decisionAmendments.length > 0) return;
    monitor.raise({
      key: `${agent.selectedDealId}:countersign-escalate:run${agent.runId}`,
      dealId: agent.selectedDealId,
      dealName: agent.deals.find((d) => d.id === agent.selectedDealId)?.name ?? pkg.borrower,
      severity: 'warning',
      reason: `Memo ${pkg.memoId} countersigned as ESCALATE — routed for senior credit review`,
      origin: 'countersign',
    });
    notify('Escalation routed to the Portfolio queue', 'good');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Context-aware command palette: only currently-possible actions appear.
  const commands: Command[] = [
    ...(status === 'awaiting_approval' && view === 'analysis' && !gateLeaving
      ? [
          // Approve only — reject/send-back require a reason typed at the gate,
          // so the palette doesn't offer a one-keystroke way around the record.
          // Signs the gate's LIVE draft (note + amendments), never a bare approve.
          {
            id: 'approve',
            label: 'Countersign & approve',
            section: 'Decision',
            kbd: 'A',
            run: () =>
              agent.approve(gateDraftRef.current.note, {
                amendments: gateDraftRef.current.amendments,
                provenance: gateDraftRef.current.noteProvenance,
              }),
          },
        ]
      : []),
    ...(status === 'plan_review'
      ? [
          {
            id: 'approve-plan',
            label: 'Approve plan & run',
            section: 'Decision',
            kbd: `${MOD_KEY}↵`,
            // approves the plan AS EDITED on screen
            run: () => agent.approvePlan(planEnabledIds),
          },
          { id: 'cancel-plan', label: 'Cancel plan review', section: 'Decision', run: agent.cancelPlan },
        ]
      : []),
    ...(!busy
      ? [
          {
            id: 'run',
            label: status === 'idle' ? 'Run analysis' : 'Re-run analysis',
            section: 'Run',
            kbd: `${MOD_KEY}↵`,
            run: () => agent.start(),
          },
        ]
      : []),
    ...(status !== 'idle' ? [{ id: 'reset', label: 'Reset run', section: 'Run', run: handleReset }] : []),
    ...(finished
      ? [{ id: 'export', label: 'Export audit trail (JSON)', section: 'Audit', run: handleExport }]
      : []),
    ...agent.deals.map((d) => ({
      id: `deal-${d.id}`,
      label: `Open deal · ${d.name}`,
      hint: d.outcome.toUpperCase(),
      section: 'Deals',
      run: () => agent.selectDeal(d.id),
    })),
    ...[1, 2, 4].map((s) => ({
      id: `speed-${s}`,
      label: `Set demo speed ${s}×`,
      section: 'Demo',
      run: () => agent.setSpeed(s),
    })),
    ...(view !== 'analysis'
      ? [{ id: 'view-analysis', label: 'Open Credit Analysis', section: 'View', run: () => setView('analysis') }]
      : []),
    ...(view !== 'deals'
      ? [{ id: 'view-deals', label: 'Open Deals pipeline', section: 'View', run: () => setView('deals') }]
      : []),
    ...(view !== 'portfolio'
      ? [{ id: 'view-portfolio', label: 'Open Portfolio monitor', section: 'View', run: () => setView('portfolio') }]
      : []),
    ...(view !== 'agents'
      ? [{ id: 'view-agents', label: 'Open Agents', section: 'View', run: () => setView('agents') }]
      : []),
    ...(view !== 'audit'
      ? [{ id: 'view-audit', label: 'Open Audit log', section: 'View', run: () => setView('audit') }]
      : []),
    { id: 'sweep', label: 'Sweep portfolio now', section: 'Demo', run: monitor.sweepNow },
    {
      id: 'theme',
      label: `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`,
      section: 'View',
      run: () => toggleTheme(),
    },
    {
      id: 'nav',
      label: navCollapsed ? 'Expand sidebar' : 'Collapse sidebar',
      section: 'View',
      kbd: '[',
      run: () => setNavCollapsed((v) => !v),
    },
  ];

  return (
    <div className="app">
      <Header
        status={status}
        speed={agent.speed}
        onSpeed={agent.setSpeed}
        onRun={() => agent.start()}
        onReset={handleReset}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenPalette={() => setPaletteOpen(true)}
        autonomy={autonomy}
        onAutonomy={setAutonomy}
      />

      <main className={`grid${navCollapsed ? ' grid--nav-collapsed' : ''}`}>
        <NavSidebar
          collapsed={navCollapsed}
          onToggle={() => setNavCollapsed((v) => !v)}
          active={view}
          onNavigate={handleNavigate}
          badges={{ deals: agent.deals.length, portfolio: openEscalations || undefined }}
        />

        {view === 'analysis' ? (
          <>
            <DocumentPanel
              document={agent.document}
              deals={agent.deals}
              selectedId={agent.selectedDealId}
              onSelect={handleSelectDeal}
              onUpload={handleUpload}
              parsing={agent.parsing}
              active={status === 'running'}
              disabled={busy}
              highlights={citedValues}
              onClearHighlights={() => setCitedValues([])}
            />

            <section className="workspace">
              <div className="workspace__scroll">
                <PlanBar key={`plan-${agent.runId}`} plan={agent.plan} steps={agent.steps} />

                {status === 'idle' ? (
                  <EmptyState
                    onRun={() => agent.start()}
                    deals={agent.deals}
                    onPickAndRun={(id) => agent.start(id)}
                  />
                ) : status === 'plan_review' ? (
                  <PlanReview
                    plan={agent.plan}
                    dealName={agent.deals.find((d) => d.id === agent.selectedDealId)?.name ?? 'this deal'}
                    speed={agent.speed}
                    enabledIds={planEnabledIds}
                    held={planHeld}
                    onToggle={togglePlanStep}
                    onHold={() => setPlanHeld(true)}
                    onApprove={agent.approvePlan}
                    onCancel={agent.cancelPlan}
                  />
                ) : (
                  <AgentStream steps={agent.steps} cite={cite} trace={trace} />
                )}

                {status === 'awaiting_approval' && agent.approvalPackage && (
                  <ApprovalGate
                    pkg={agent.approvalPackage}
                    deal={currentDeal}
                    onApprove={agent.approve}
                    onReject={agent.reject}
                    onRework={handleRework}
                    onTrace={handleTrace}
                    leaving={gateLeaving}
                    autoEligible={autoEligible}
                    onHold={() => setGateHold(true)}
                    draftRef={gateDraftRef}
                  />
                )}

                {finished && agent.approvalPackage && (
                  <OutcomeBanner
                    approved={status === 'approved'}
                    pkg={agent.approvalPackage}
                    note={agent.decisionNote}
                    noteProvenance={agent.decisionNoteProvenance}
                    amendments={agent.decisionAmendments}
                    auto={agent.decisionAuto}
                    onReset={handleReset}
                    onExport={handleExport}
                    onOpenQueue={() => setView('portfolio')}
                  />
                )}

                {showWhatIf && currentDeal && (
                  <WhatIfPanel
                    key={currentDeal.id}
                    deal={currentDeal}
                    onAttach={(label, detail) => {
                      agent.logWhatIf(label, detail);
                      notify('Scenario attached to the audit trail', 'good');
                    }}
                  />
                )}

                <MessageThread messages={agent.messages} />
              </div>

              <Composer onSend={agent.sendMessage} onAttach={handleUpload} attachDisabled={busy} />
            </section>
          </>
        ) : view === 'deals' ? (
          <DealsView
            deals={agent.dealsFull}
            selectedDealId={agent.selectedDealId}
            creditStatus={status}
            auditHistory={agent.auditHistory}
            onOpenDeal={openDealFromPortfolio}
          />
        ) : view === 'portfolio' ? (
          <PortfolioView
            rows={monitor.portfolio}
            escalations={monitor.escalations}
            sweeping={monitor.sweeping}
            lastSweepAt={monitor.lastSweepAt}
            nextSweepAt={monitor.nextSweepAt}
            sweepCount={monitor.sweepCount}
            onSweepNow={monitor.sweepNow}
            onAcknowledge={monitor.acknowledge}
            onOpenDeal={openDealFromPortfolio}
          />
        ) : view === 'agents' ? (
          <AgentsView
            creditStatus={status}
            selectedDealName={agent.deals.find((d) => d.id === agent.selectedDealId)?.name ?? '—'}
            parsing={agent.parsing !== null}
            docsIngested={agent.dealsFull.filter((d) => d.uploaded).length}
            auditHistory={agent.auditHistory}
            monitor={monitor}
            onOpenAnalysis={() => setView('analysis')}
            onOpenPortfolio={() => setView('portfolio')}
            onSweepNow={monitor.sweepNow}
          />
        ) : (
          <AuditView entries={agent.auditHistory} escalations={monitor.escalations} onExport={exportFullAudit} />
        )}
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <Toasts toasts={toasts} />
    </div>
  );
}
