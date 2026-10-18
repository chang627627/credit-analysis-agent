// Checkbox: a native checkbox, visually replaced by a 16×16 box (ink-3 control edge, WCAG 1.4.11).
// `locked` shows a Lock glyph instead of the box and refuses changes (aria-disabled, still focusable).
import { Check, Lock } from 'lucide-react';
import type { ForceState } from './types';

export interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
  locked?: boolean;
  force?: ForceState;
}

export function Checkbox({ checked, onChange, ariaLabel, disabled = false, locked = false, force }: CheckboxProps) {
  return (
    <label className={locked ? 'k-check k-check--locked' : 'k-check'} data-force={force}>
      <input
        type="checkbox"
        className="k-check__input v2-sr"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-disabled={locked ? true : undefined}
        onChange={(e) => {
          if (!locked && !disabled) onChange(e.target.checked);
        }}
        onClick={locked ? (e) => e.preventDefault() : undefined}
      />
      <span className="k-check__box" aria-hidden="true">
        {locked ? <Lock size={12} /> : checked ? <Check size={12} /> : null}
      </span>
    </label>
  );
}
