import { useEffect, useState } from 'react';
import { useCreditAgent } from './hooks/useCreditAgent';
import type { ChatMessage } from './hooks/useCreditAgent';
import { Header } from './components/Header';
import { NavSidebar } from './components/NavSidebar';
import { DocumentPanel } from './components/DocumentPanel';
import { PlanBar } from './components/PlanBar';
import { AgentStream } from './components/AgentStream';
import { ApprovalGate } from './components/ApprovalGate';
import { OutcomeBanner } from './components/OutcomeBanner';
import { Composer } from './components/Composer';

function EmptyState({ onRun }: { onRun: () => void }) {
  return (
    <div className="empty">
      <div className="empty__icon">◧</div>
      <h2>Agentic credit analysis</h2>
      <p>
        Upload a CIM or pick a deal on the left, then press <strong>Run analysis</strong>. The agent
        works through a visible loop — <em>plan → call a tool → observe → decide</em> — streaming its
        reasoning, showing each tool call with its inputs, outputs and confidence, flagging covenant
        breaches, and pausing at a human approval gate before anything is signed.
      </p>
      <button className="btn btn--primary btn--lg" onClick={onRun}>
        Run analysis
      </button>
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

  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem('theme') === 'dark' ? 'dark' : 'light',
  );
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const [navCollapsed, setNavCollapsed] = useState(() => localStorage.getItem('navCollapsed') === '1');
  useEffect(() => {
    localStorage.setItem('navCollapsed', navCollapsed ? '1' : '0');
  }, [navCollapsed]);

  return (
    <div className="app">
      <Header
        status={status}
        speed={agent.speed}
        onSpeed={agent.setSpeed}
        onRun={agent.start}
        onReset={agent.reset}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      />

      <main className={`grid${navCollapsed ? ' grid--nav-collapsed' : ''}`}>
        <NavSidebar collapsed={navCollapsed} onToggle={() => setNavCollapsed((v) => !v)} />

        <DocumentPanel
          document={agent.document}
          deals={agent.deals}
          selectedId={agent.selectedDealId}
          onSelect={agent.selectDeal}
          onUpload={agent.uploadDeal}
          parsing={agent.parsing}
          active={status === 'running'}
          disabled={busy}
        />

        <section className="workspace">
          <div className="workspace__scroll">
            <PlanBar plan={agent.plan} steps={agent.steps} />

            {status === 'idle' ? <EmptyState onRun={agent.start} /> : <AgentStream steps={agent.steps} />}

            {status === 'awaiting_approval' && agent.approvalPackage && (
              <ApprovalGate pkg={agent.approvalPackage} onApprove={agent.approve} onReject={agent.reject} />
            )}

            {finished && agent.approvalPackage && (
              <OutcomeBanner
                approved={status === 'approved'}
                pkg={agent.approvalPackage}
                onReset={agent.reset}
                onExport={agent.exportAudit}
              />
            )}

            <MessageThread messages={agent.messages} />
          </div>

          <Composer onSend={agent.sendMessage} onAttach={agent.uploadDeal} attachDisabled={busy} />
        </section>
      </main>
    </div>
  );
}
