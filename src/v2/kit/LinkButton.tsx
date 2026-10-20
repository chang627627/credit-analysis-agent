// LinkButton: accent-ink text action. An <a> when it has an href, otherwise a <button>.
// `provisional` draws the provisional underline (var(--line-provisional)) used by amend triggers.
// `tone="inherit"` (P-32) is a figure that traces to its memo row: it keeps the surrounding ink (a
// breached Actual stays bad-ink), with a quiet --line underline that turns to the ink on hover;
// `role="figure"` sets it in t-figure like the table cell it sits in.
import type { ForceState, LucideIcon } from './types';

export interface LinkButtonProps {
  children: string;
  onClick?: () => void;
  href?: string;
  newTab?: boolean;
  role?: 'small' | 'label' | 'body' | 'strong' | 'meta' | 'figure';
  tone?: 'accent' | 'inherit';
  icon?: LucideIcon;
  iconAfter?: boolean;
  disabled?: boolean;
  provisional?: boolean;
  ariaLabel?: string;
  force?: ForceState;
}

export function LinkButton({
  children, onClick, href, newTab = false, role = 'body', tone = 'accent', icon: Icon, iconAfter = false,
  disabled = false, provisional = false, ariaLabel, force,
}: LinkButtonProps) {
  const cls = `k-link t-${role}${provisional ? ' k-link--provisional' : ''}${tone === 'inherit' ? ' k-link--inherit' : ''}`;
  const icon = Icon ? <Icon size={role === 'body' || role === 'strong' || role === 'figure' ? 14 : 12} className="k-link__icon" aria-hidden="true" /> : null;
  const content = (
    <>
      {icon && !iconAfter ? icon : null}
      <span className="k-link__text">{children}</span>
      {icon && iconAfter ? icon : null}
    </>
  );
  if (href !== undefined) {
    if (disabled) {
      return (
        <a className={cls} role="link" aria-disabled="true" aria-label={ariaLabel} data-force={force}>
          {content}
        </a>
      );
    }
    return (
      <a
        className={cls}
        href={href}
        target={newTab ? '_blank' : undefined}
        rel={newTab ? 'noopener' : undefined}
        aria-label={ariaLabel}
        data-force={force}
        onClick={onClick ? () => onClick() : undefined}
      >
        {content}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick ? () => onClick() : undefined}
      disabled={disabled}
      aria-label={ariaLabel}
      data-force={force}
    >
      {content}
    </button>
  );
}
