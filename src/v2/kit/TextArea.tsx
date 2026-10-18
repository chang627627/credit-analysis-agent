// TextArea: paper field with an ink-3 edge; auto-grows from 64px to 160px (via a custom property,
// the only inline style a kit primitive may set). Focus = accent edge + halo; invalid = bad-ink + halo.
import { useCallback, useLayoutEffect, useRef } from 'react';
import type { Ref } from 'react';
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
}

const MIN_H = 64;
const MAX_H = 160;

export function TextArea({
  value, onChange, placeholder, ariaLabel, invalid = false, describedBy, inputRef, disabled = false, force,
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

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.setProperty('--k-ta-h', 'auto');
    const h = Math.min(MAX_H, Math.max(MIN_H, el.scrollHeight + el.offsetHeight - el.clientHeight));
    el.style.setProperty('--k-ta-h', `${h}px`);
  }, [value]);

  return (
    <textarea
      ref={setRef}
      className={invalid ? 'k-textarea k-textarea--invalid t-body' : 'k-textarea t-body'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy}
      disabled={disabled}
      data-force={force}
      rows={1}
    />
  );
}
