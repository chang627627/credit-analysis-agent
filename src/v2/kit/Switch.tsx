// Switch: a 28×16 pill (P-10). Off = sunken track with an ink-3 edge; on = ink track (never the accent).
// aria-describedby is forwarded so a wrapping Tip's text reaches the switch (the top bar's policy rule).
import type { ForceState } from './types';

export interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
  force?: ForceState;
  /** set by a wrapping Tip (cloneElement) while its bubble is shown */
  'aria-describedby'?: string;
}

export function Switch({ checked, onChange, ariaLabel, disabled = false, force, 'aria-describedby': describedBy }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      className={checked ? 'k-switch k-switch--on' : 'k-switch'}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      data-force={force}
      data-pattern="P-10"
    >
      <span className="k-switch__knob" aria-hidden="true" />
    </button>
  );
}
