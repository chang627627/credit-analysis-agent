import { useRef, useState } from 'react';

/**
 * ChatGPT-style composer for steering / follow-ups. The 📎 attaches a CIM (the
 * same ingestion path as the drop zone); the text box asks the agent about the
 * current deal. Input drives output, so it never feels inert.
 */
export function Composer({
  onSend,
  onAttach,
  attachDisabled,
}: {
  onSend: (text: string) => void;
  onAttach: (file: File) => void;
  attachDisabled: boolean;
}) {
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };

  return (
    <div className="composer">
      <div className="composer__row">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onAttach(f);
            e.target.value = '';
          }}
        />
        <button
          className="composer__attach"
          title="Attach a CIM (PDF)"
          onClick={() => fileRef.current?.click()}
          disabled={attachDisabled}
        >
          ⎘
        </button>
        <textarea
          className="composer__input"
          placeholder="Ask about the deal — leverage, covenants, risk, the recommendation…"
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // plain Enter sends; ⌘/Ctrl+Enter is the global "run analysis"
            if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button className="composer__send" onClick={submit} disabled={!text.trim()} aria-label="Send">
          ↑
        </button>
      </div>
      <div className="composer__hint">
        <span>
          <span className="kbd">↵</span> send
        </span>
        <span>
          <span className="kbd">⇧↵</span> newline
        </span>
      </div>
    </div>
  );
}
