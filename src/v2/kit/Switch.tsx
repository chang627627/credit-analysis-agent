// Switch: a 28×16 pill (P-10). Off = sunken track with an ink-3 edge; on = ink track (never teal).
import type { ForceState } from './types';

export interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
  force?: ForceState;
}

export function Switch({ checked, onChange, ariaLabel, disabled = false, force }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
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
