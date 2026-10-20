// IconButton: a ghost square button named by its label, always paired with a Tip of the same label.
// Variant "send": the composer's round send button, accent-filled once there is something to send.
import { Tip } from './Tip';
import type { ForceState, LucideIcon } from './types';

export interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  size?: 'sm' | 'xs';
  variant?: 'ghost' | 'send';
  disabled?: boolean;
  pressed?: boolean;
  force?: ForceState;
}

export function IconButton({ icon: Icon, label, onClick, size = 'sm', variant = 'ghost', disabled = false, pressed, force }: IconButtonProps) {
  const xs = size === 'xs';
  const cls = ['k-iconbtn'];
  if (xs) cls.push('k-iconbtn--xs');
  if (variant === 'send') cls.push('k-iconbtn--send');
  return (
    <Tip label={label}>
      <button
        type="button"
        className={cls.join(' ')}
        aria-label={label}
        aria-pressed={pressed}
        onClick={onClick ? () => onClick() : undefined}
        disabled={disabled}
        data-force={force}
      >
        <Icon size={xs ? 14 : 16} aria-hidden="true" />
      </button>
    </Tip>
  );
}
