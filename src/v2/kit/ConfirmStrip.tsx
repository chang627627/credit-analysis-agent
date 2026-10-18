// ConfirmStrip: an inline confirm for run-discarding actions (P-19), never a modal.
// On mount focus moves to the cancel button; Esc cancels.
import { useEffect, useRef } from 'react';
import { Button } from './Button';

export interface ConfirmStripProps {
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: 'neutral' | 'bad';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmStrip({ text, confirmLabel, cancelLabel, tone, onConfirm, onCancel }: ConfirmStripProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const buttons = rootRef.current?.querySelectorAll<HTMLButtonElement>('.k-confirm__actions button');
    if (buttons && buttons.length > 0) buttons[buttons.length - 1].focus();
  }, []);

  return (
    <div
      ref={rootRef}
      className="k-confirm"
      role="group"
      aria-label={text}
      data-pattern="P-19"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <p className="k-confirm__text t-small">{text}</p>
      <div className="k-confirm__actions">
        <Button variant={tone === 'bad' ? 'danger' : 'secondary'} size="sm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
