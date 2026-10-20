// TextArea: paper field with an ink-3 edge; auto-grows (via a custom property, the only inline
// style a kit primitive may set) from 64px (size "note") or 28px (size "composer") up to 160px.
// Focus = accent edge + halo; invalid = bad-ink + halo.
// Size "composer" is one framed field: the textarea sits borderless inside the frame, and
// `trailing` (the send button) sits inside it at the bottom right; the frame takes the focus.
// onSubmit (optional): Enter submits, Shift+Enter inserts a newline. Enter never submits during IME
// composition, with meta / ctrl / alt held (so the global Cmd/Ctrl+Enter is never doubled) or when
// something already handled the key (defaultPrevented).
import { useCallback, useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent, ReactNode, Ref } from 'react';
import type { ForceState } from './types';

export interface TextAreaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
  invalid?: boolean;
  describedBy?: string;
  inputRef?: Ref<HTMLTextAreaElement>;
  disabled?: boolean;
  force?: ForceState;
  size?: 'note' | 'composer';
  onSubmit?: () => void;
  /** size "composer" only: a control inside the frame, bottom right (the send button) */
  trailing?: ReactNode;
}

const MIN_H: Record<NonNullable<TextAreaProps['size']>, number> = { note: 64, composer: 28 };
const MAX_H = 160;

export function TextArea({
  value, onChange, placeholder, ariaLabel, invalid = false, describedBy, inputRef, disabled = false, force,
  size = 'note', onSubmit, trailing,
}: TextAreaProps) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const setRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      innerRef.current = el;
      if (typeof inputRef === 'function') inputRef(el);
      else if (inputRef) inputRef.current = el;
    },
    [inputRef],
  );

  const minH = MIN_H[size];
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.setProperty('--k-ta-h', 'auto');
    const h = Math.min(MAX_H, Math.max(minH, el.scrollHeight + el.offsetHeight - el.clientHeight));
    el.style.setProperty('--k-ta-h', `${h}px`);
  }, [value, minH]);

  const onKeyDown = onSubmit
    ? (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key !== 'Enter') return;
        // keyCode 229 covers the Safari keydown that commits an IME composition after compositionend.
        if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
        if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
        e.preventDefault();
        onSubmit();
      }
    : undefined;

  const cls = ['k-textarea', 't-body'];
  if (size === 'composer') cls.push('k-textarea--composer');
  if (invalid) cls.push('k-textarea--invalid');

  const field = (
    <textarea
      ref={setRef}
      className={cls.join(' ')}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy}
      disabled={disabled}
      data-force={size === 'composer' ? undefined : force}
      rows={1}
    />
  );
  if (size !== 'composer') return field;
  return (
    <div className="k-composer" data-force={force} data-disabled={disabled ? '' : undefined}>
      {field}
      {trailing ? <span className="k-composer__trail">{trailing}</span> : null}
    </div>
  );
}
