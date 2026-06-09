import type { RunStatus } from '../hooks/useCreditAgent';

const STATUS_LABEL: Record<RunStatus, string> = {
  idle: 'Idle',
  running: 'Running',
  awaiting_approval: 'Awaiting approval',
  approved: 'Approved',
  rejected: 'Rejected',
  error: 'Error',
};

export function Header({
  status,
  speed,
  onSpeed,
  onRun,
  onReset,
  theme,
  onToggleTheme,
}: {
  status: RunStatus;
  speed: number;
  onSpeed: (n: number) => void;
  onRun: () => void;
  onReset: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}) {
  const busy = status === 'running' || status === 'awaiting_approval';

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark">◧</span>
        <div className="brand__text">
          <strong>Credit Analysis Agent</strong>
          <span>agentic workflow · mocked backend</span>
        </div>
      </div>

      <div className="topbar__spacer" />

      <button
        className="btn btn--ghost btn--icon"
        onClick={onToggleTheme}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        aria-label="Toggle light or dark theme"
      >
        {theme === 'light' ? '☾' : '☀'}
      </button>

      <div className="speed" title="Demo speed — also affects in-flight delays">
        <label htmlFor="speed">speed</label>
        <input
          id="speed"
          type="range"
          min={0.5}
          max={4}
          step={0.5}
          value={speed}
          onChange={(e) => onSpeed(Number(e.target.value))}
        />
        <span className="speed__val">{speed}×</span>
      </div>

      <span className={`status status--${status}`}>
        <span className="status__dot" />
        {STATUS_LABEL[status]}
      </span>

      <button className="btn btn--primary" onClick={onRun} disabled={busy}>
        {status === 'idle' ? 'Run analysis' : busy ? 'Running…' : 'Re-run'}
      </button>
      <button className="btn btn--ghost" onClick={onReset} disabled={status === 'idle'}>
        Reset
      </button>
    </header>
  );
}
