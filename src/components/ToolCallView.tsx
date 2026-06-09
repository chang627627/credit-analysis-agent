import { useEffect, useRef, useState } from 'react';
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
 * DNA that a regulated-finance product like obin.ai cares about.
 */
export function ToolCallView({ call, result }: { call: ToolCall; result?: ToolResult }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<'args' | 'result' | null>(null);
  const copyTimer = useRef<number | undefined>(undefined);
  const running = !result;

  const copyJson = (which: 'args' | 'result', obj: unknown) => {
    void navigator.clipboard?.writeText(JSON.stringify(obj, null, 2));
    setCopied(which);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className={`tool ${running ? 'tool--running' : 'tool--done'}`}>
      <button className="tool__head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="tool__chevron">{open ? '▾' : '▸'}</span>
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

      {open && (
        <div className="tool__body">
          <div className="kv">
            <span className="kv__k">args →</span>
            <button className="kv__copy" onClick={() => copyJson('args', call.args)} aria-label="Copy args as JSON">
              {copied === 'args' ? '✓ copied' : '⧉ copy'}
            </button>
            <pre className="kv__v">{JSON.stringify(call.args, null, 2)}</pre>
          </div>
          {result && (
            <div className="kv">
              <span className="kv__k">← result</span>
              <button
                className="kv__copy"
                onClick={() => copyJson('result', result.data)}
                aria-label="Copy result as JSON"
              >
                {copied === 'result' ? '✓ copied' : '⧉ copy'}
              </button>
              <pre className="kv__v">{JSON.stringify(result.data, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
