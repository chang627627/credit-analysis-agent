// ConfirmStrip: an inline confirm for run-discarding actions (P-19), never a modal.
// On mount focus moves to the cancel button; Esc cancels.
// With `reason` (P-34, R4.6) the strip asks why first: one kit TextInput leads the strip with the
// actions beside it, the field takes the focus on mount instead of Cancel, Enter in it confirms (the
// caller decides whether an empty reason may pass), and `text` becomes the quiet consequence line
// under the field. `hint` is a calm line above it (never a red alert), shown after a confirm the
// caller refused; both lines describe the field. `label` names the group when `text` does not.
import { useEffect, useId, useRef } from 'react';
import { Button } from './Button';
import { TextInput } from './TextInput';

export interface ConfirmReason {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
  required?: boolean;
}

export interface ConfirmStripProps {
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: 'neutral' | 'bad';
  onConfirm: () => void;
  onCancel: () => void;
  reason?: ConfirmReason;
  hint?: string | null;
  label?: string;
}

export function ConfirmStrip({ text, confirmLabel, cancelLabel, tone, onConfirm, onCancel, reason, hint = null, label }: ConfirmStripProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const textId = `${id}-text`;
  const hintId = `${id}-hint`;
  const withReason = reason !== undefined;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const field = root.querySelector<HTMLInputElement>('.k-confirm__field input');
    if (field) {
      field.focus();
      return;
    }
    const buttons = root.querySelectorAll<HTMLButtonElement>('.k-confirm__actions button');
    if (buttons.length > 0) buttons[buttons.length - 1].focus();
  }, []);

  const actions = (
    <div className="k-confirm__actions">
      <Button variant={tone === 'bad' ? 'danger' : 'secondary'} size="sm" onClick={onConfirm}>
        {confirmLabel}
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        {cancelLabel}
      </Button>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={withReason ? 'k-confirm k-confirm--reason' : 'k-confirm'}
      role="group"
      aria-label={label ?? text}
      data-pattern={withReason ? 'P-34' : 'P-19'}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      {reason ? (
        <>
          <div className="k-confirm__field">
            <TextInput
              value={reason.value}
              onChange={reason.onChange}
              onSubmit={onConfirm}
              placeholder={reason.placeholder}
              ariaLabel={reason.ariaLabel}
              required={reason.required}
              describedBy={hint ? `${hintId} ${textId}` : textId}
            />
          </div>
          {actions}
          <div className="k-confirm__lines">
            {hint ? (
              <p id={hintId} className="k-confirm__hint t-small">
                {hint}
              </p>
            ) : null}
            <p id={textId} className="k-confirm__text t-small">
              {text}
            </p>
          </div>
        </>
      ) : (
        <>
          <p className="k-confirm__text t-small">{text}</p>
          {actions}
        </>
      )}
    </div>
  );
}
