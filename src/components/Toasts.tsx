import { useCallback, useRef, useState } from 'react';

// Quiet bottom-corner confirmations for side-effectful actions (export, upload,
// decision). aria-live so screen readers hear them too.

export interface Toast {
  id: number;
  msg: string;
  tone: 'info' | 'good';
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const notify = useCallback((msg: string, tone: 'info' | 'good' = 'info') => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, msg, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return { toasts, notify };
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
