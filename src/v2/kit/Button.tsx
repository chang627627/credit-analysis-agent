// Button: primary / secondary / ghost / danger, sm 28 or md 34. Buttons are identified by their
// label text; the one primary is the only accent fill on a screen. The name comes from the content
// (the icon and the Kbd chip are aria-hidden), so it never omits visible text (WCAG 2.5.3); pass
// ariaLabel only to extend the visible label, e.g. "Select Project Atlas".
import { Kbd } from './Kbd';
import type { ForceState, LucideIcon } from './types';

export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  children: string;
  icon?: LucideIcon;
  kbd?: string;
  onClick?: () => void;
  disabled?: boolean;
  block?: boolean;
  ariaLabel?: string;
  force?: ForceState;
}

export function Button({
  variant, size = 'md', children, icon: Icon, kbd, onClick, disabled = false, block = false, ariaLabel, force,
}: ButtonProps) {
  const sm = size === 'sm';
  const cls = ['k-btn', `k-btn--${variant}`, sm ? 'k-btn--sm t-label' : 't-control'];
  if (block) cls.push('k-btn--block');
  return (
    <button
      type="button"
      className={cls.join(' ')}
      onClick={onClick ? () => onClick() : undefined}
      disabled={disabled}
      aria-label={ariaLabel}
      data-force={force}
    >
      {Icon ? <Icon size={sm ? 12 : 14} className="k-btn__icon" aria-hidden="true" /> : null}
      <span className="k-btn__label">{children}</span>
      {kbd ? <Kbd onAccent={variant === 'primary' && !disabled}>{kbd}</Kbd> : null}
    </button>
  );
}
