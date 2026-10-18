// AmendField: inline amend of a covenant term on its row (P-05).
// View: a provisional link showing the term, or a Redline when amended, plus a PenLine on
// hover/focus. Edit: a 28px number input with prefix/suffix. Enter or blur commits (empty or NaN
// commits null = terms as filed); Esc reverts. A change of `focusTick` enters edit and focuses.
import { useEffect, useRef, useState } from 'react';
import { PenLine } from 'lucide-react';
import { Redline } from './Redline';
import type { ForceState } from './types';

export interface AmendFieldProps {
  display: string;
  amended: { from: string; to: string } | null;
  value: number;
  step: number;
  min: number;
  max: number;
  prefix: string;
  suffix: string;
  onCommit: (v: number | null) => void;
  ariaLabel: string;
  disabled?: boolean;
  focusTick?: number;
  /** Kit page only: 'hover' shows the pen, 'focus' renders the editing state without focusing. */
  force?: ForceState;
}

export function AmendField({
  display, amended, value, step, min, max, prefix, suffix, onCommit, ariaLabel, disabled = false, focusTick, force,
}: AmendFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const viewRef = useRef<HTMLButtonElement>(null);
  const settledRef = useRef(false); // set once Enter/Esc has resolved the edit, so blur does not commit twice
  const focusInputRef = useRef(false);
  const restoreViewRef = useRef(false);
  const lastTick = useRef(focusTick);

  const begin = (focus: boolean) => {
    if (disabled) return;
    setDraft(String(value));
    settledRef.current = false;
    focusInputRef.current = focus;
    setEditing(true);
  };

  // focusTick changes (from "Amend term" on a margin note) enter edit and focus the input.
  useEffect(() => {
    if (lastTick.current === focusTick) return;
    lastTick.current = focusTick;
    if (focusTick === undefined) return;
    begin(true);
  }, [focusTick]);

  useEffect(() => {
    if (editing && focusInputRef.current) {
      focusInputRef.current = false;
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    if (!editing && restoreViewRef.current) {
      restoreViewRef.current = false;
      viewRef.current?.focus();
    }
  }, [editing]);

  const commit = () => {
    const raw = draft.trim();
    const n = raw === '' ? Number.NaN : Number(raw);
    onCommit(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null);
  };

  const finish = (mode: 'commit' | 'revert', refocus: boolean) => {
    if (settledRef.current) return;
    settledRef.current = true;
    if (mode === 'commit') commit();
    restoreViewRef.current = refocus;
    setEditing(false);
  };

  const showEdit = editing || force === 'focus';

  if (showEdit) {
    return (
      <span className="k-amend t-figure" data-pattern="P-05">
        {prefix ? <span className="k-amend__affix">{prefix}</span> : null}
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          className="k-amend__input t-figure"
          value={editing ? draft : String(value)}
          step={step}
          min={min}
          max={max}
          aria-label={ariaLabel}
          disabled={disabled}
          data-force={force === 'focus' ? 'focus' : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              finish('commit', true);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              finish('revert', true);
            }
          }}
          onBlur={() => {
            if (editing) finish('commit', false);
          }}
        />
        {suffix ? <span className="k-amend__affix">{suffix}</span> : null}
      </span>
    );
  }

  return (
    <span className="k-amend" data-pattern="P-05">
      <button
        ref={viewRef}
        type="button"
        className="k-link k-link--provisional k-amend__view t-figure"
        aria-label={`Amend ${ariaLabel}`}
        disabled={disabled}
        data-force={force}
        onClick={() => begin(true)}
      >
        {amended ? <Redline from={amended.from} to={amended.to} /> : <span className="k-link__text">{display}</span>}
        <PenLine size={12} className="k-amend__pen" aria-hidden="true" />
      </button>
    </span>
  );
}
