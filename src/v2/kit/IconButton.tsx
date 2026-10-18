// IconButton: a ghost square button named by its label, always paired with a Tip of the same label.
import { Tip } from './Tip';
import type { ForceState, LucideIcon } from './types';

export interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  size?: 'sm' | 'xs';
  disabled?: boolean;
  pressed?: boolean;
  force?: ForceState;
}

export function IconButton({ icon: Icon, label, onClick, size = 'sm', disabled = false, pressed, force }: IconButtonProps) {
  const xs = size === 'xs';
  return (
    <Tip label={label}>
      <button
        type="button"
        className={xs ? 'k-iconbtn k-iconbtn--xs' : 'k-iconbtn'}
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
