import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useCreditAgent } from './hooks/useCreditAgent';
import type { ChatMessage } from './hooks/useCreditAgent';
import type { Recommendation } from './agent/types';
import { Header, MOD_KEY } from './components/Header';
import { NavSidebar } from './components/NavSidebar';
import { DocumentPanel } from './components/DocumentPanel';
import { PlanBar } from './components/PlanBar';
import { AgentStream } from './components/AgentStream';
import { ApprovalGate } from './components/ApprovalGate';
import { OutcomeBanner } from './components/OutcomeBanner';
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
  const busy = status === 'running' || status === 'awaiting_approval' || agent.parsing !== null;

  const { toasts, notify } = useToasts();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem('theme') === 'dark' ? 'dark' : 'light',
  );
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Theme switch as a circular reveal from the click point (View Transitions API).
  // Falls back to an instant swap without the API or with reduced motion.
  const toggleTheme = (e?: React.MouseEvent<HTMLButtonElement>) => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };
    if (!doc.startViewTransition || reduce || !e) {
      setTheme(next);
      return;
    }
    const x = e.clientX;
    const y = e.clientY;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    doc
      .startViewTransition(() => {
        flushSync(() => setTheme(next));
      })
      .ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 420, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
        );
      })
      .catch(() => {});
  };

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
    agent.uploadDeal(f);
    notify(`Extracting financials from ${f.name}… (simulated)`);
  };
  const handleApprove = () => {
    agent.approve();
    notify('Approved — decision committed to the audit trail', 'good');
  };
  const handleReject = () => {
    agent.reject();
    notify('Rejected — decision committed to the audit trail');
  };

  // Global keyboard shortcuts. ⌘K always works; the palette consumes its own
  // keys; ⌘↵ works everywhere (the composer ignores meta+Enter); single-key
  // shortcuts require NO modifiers (⌘A/⌘R/⌘[ stay select-all/reload/back) and
  // are excluded in typing contexts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (paletteOpen) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (!busy) {
          e.preventDefault();
          agent.start();
        }
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (status === 'awaiting_approval') {
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          handleApprove();
          return;
        }
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          handleReject();
          return;
        }
      }
      if (e.key === '[') {
        e.preventDefault();
        setNavCollapsed((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, status, paletteOpen, agent.start, agent.approve, agent.reject, notify]);

  // Context-aware command palette: only currently-possible actions appear.
  const commands: Command[] = [
    ...(status === 'awaiting_approval'
      ? [
          { id: 'approve', label: 'Approve & sign memo', section: 'Decision', kbd: 'A', run: handleApprove },
          { id: 'reject', label: 'Reject package', section: 'Decision', kbd: 'R', run: handleReject },
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
    ...(status !== 'idle' ? [{ id: 'reset', label: 'Reset run', section: 'Run', run: agent.reset }] : []),
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
        onReset={agent.reset}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <main className={`grid${navCollapsed ? ' grid--nav-collapsed' : ''}`}>
        <NavSidebar collapsed={navCollapsed} onToggle={() => setNavCollapsed((v) => !v)} />

        <DocumentPanel
          document={agent.document}
          deals={agent.deals}
          selectedId={agent.selectedDealId}
          onSelect={agent.selectDeal}
          onUpload={handleUpload}
          parsing={agent.parsing}
          active={status === 'running'}
          disabled={busy}
        />

        <section className="workspace">
          <div className="workspace__scroll">
            <PlanBar plan={agent.plan} steps={agent.steps} />

            {status === 'idle' ? (
              <EmptyState
                onRun={() => agent.start()}
                deals={agent.deals}
                onPickAndRun={(id) => agent.start(id)}
              />
            ) : (
              <AgentStream steps={agent.steps} />
            )}

            {status === 'awaiting_approval' && agent.approvalPackage && (
              <ApprovalGate pkg={agent.approvalPackage} onApprove={handleApprove} onReject={handleReject} />
            )}

            {finished && agent.approvalPackage && (
              <OutcomeBanner
                approved={status === 'approved'}
                pkg={agent.approvalPackage}
                onReset={agent.reset}
                onExport={handleExport}
              />
            )}

            <MessageThread messages={agent.messages} />
          </div>

          <Composer onSend={agent.sendMessage} onAttach={handleUpload} attachDisabled={busy} />
        </section>
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <Toasts toasts={toasts} />
    </div>
  );
}
