// TextInput: a 32px single-line field with an optional leading icon. Enter submits.
import type { ForceState, LucideIcon } from './types';

export interface TextInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
  icon?: LucideIcon;
  force?: ForceState;
}

export function TextInput({ value, onChange, onSubmit, placeholder, ariaLabel, disabled = false, icon: Icon, force }: TextInputProps) {
  return (
    <label className="k-input" data-disabled={disabled ? '' : undefined} data-force={force}>
      {Icon ? <Icon size={14} className="k-input__icon" aria-hidden="true" /> : null}
      <input
        type="text"
        className="k-input__field t-body"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
      />
    </label>
  );
}
