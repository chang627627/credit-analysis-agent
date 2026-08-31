import { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Copy } from 'lucide-react';
import type { ToolCall, ToolResult } from '../agent/types';
import { ConfidenceBadge } from './ConfidenceBadge';

/** Ticking elapsed-time readout while a tool is in flight (Cursor / Devin style). */
function Elapsed() {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setMs(Date.now() - t0), 100);
    return () => clearInterval(id);
  }, []);
  return <span className="tool__elapsed">{(ms / 1000).toFixed(1)}s</span>;
}

/**
 * An inspectable tool call: name, label, timing, confidence, and (when expanded)
 * the exact args in and data out. This "show your work" surface is the audit-trail
 * DNA that a regulated-finance product depends on.
 */
export function ToolCallView({
  call,
  result,
  traceTick,
}: {
  call: ToolCall;
  result?: ToolResult;
  /** Bumped when a gate figure traces here: snap open + flash the inspector. */
  traceTick?: number;
}) {
  const [open, setOpen] = useState(false);
  const [traced, setTraced] = useState(false);
  const [copied, setCopied] = useState<'args' | 'result' | null>(null);
  const copyTimer = useRef<number | undefined>(undefined);
  const running = !result;

  useEffect(() => {
    if (!traceTick) return;
    setOpen(true);
    setTraced(true);
    const t = window.setTimeout(() => setTraced(false), 1400);
    return () => window.clearTimeout(t);
  }, [traceTick]);

  const copyJson = (which: 'args' | 'result', obj: unknown) => {
    void navigator.clipboard?.writeText(JSON.stringify(obj, null, 2));
    setCopied(which);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(null), 1200);
  };

  const copyBtn = (which: 'args' | 'result', obj: unknown, label: string) => (
    <button className="kv__copy" onClick={() => copyJson(which, obj)} aria-label={label}>
      {copied === which ? (
        <>
          <Check size={10} strokeWidth={2} aria-hidden="true" /> copied
        </>
      ) : (
        <>
          <Copy size={10} strokeWidth={1.75} aria-hidden="true" /> copy
        </>
      )}
    </button>
  );

  return (
    <div className={`tool ${running ? 'tool--running' : 'tool--done'}${traced ? ' tool--traced' : ''}`}>
      <button className="tool__head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="tool__chevron">
          <ChevronRight size={12} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <code className="tool__name">{call.name}</code>
        <span className="tool__label">{call.label}</span>
        <span className="tool__spacer" />
        {running ? (
          <span className="tool__running">
            <span className="spinner" /> working <Elapsed />
          </span>
        ) : (
          <>
            <span className="tool__time">{result.durationMs}ms</span>
            <ConfidenceBadge value={result.confidence} />
          </>
        )}
      </button>

      {/* always-mounted reveal wrapper so the drawer unfolds instead of snapping;
          inert while closed keeps the hidden copy buttons out of the tab order */}
      <div
        className="tool__reveal"
        data-open={open || undefined}
        ref={(el) => {
          if (el) el.inert = !open;
        }}
      >
        <div className="tool__body">
          <div className="kv">
            <span className="kv__k">args →</span>
            {copyBtn('args', call.args, 'Copy args as JSON')}
            <pre className="kv__v">{JSON.stringify(call.args, null, 2)}</pre>
          </div>
          {result && (
            <div className="kv">
              <span className="kv__k">← result</span>
              {copyBtn('result', result.data, 'Copy result as JSON')}
              <pre className="kv__v">{JSON.stringify(result.data, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
