// NavItem: one row of the sidebar navigation. Icon + label + optional count; the active row is
// ink on --sunken with a 2px ink rule on its left edge (never teal, like the old tab underline).
// Below 1100px the sidebar folds to an icon rail: the label hides visually but stays the
// accessible name, and the count rides the icon's corner.
import type { ComponentType } from 'react';
import type { ForceState } from './types';

export interface NavItemProps {
  icon: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  label: string;
  count?: string | null;
  countTone?: 'accent' | 'warn' | 'ink-3';
  active?: boolean;
  /** icon-rail mode: the label hides visually (still the accessible name) */
  compact?: boolean;
  onClick: () => void;
  /** kit page only */
  force?: ForceState;
}

const COUNT_TONE: Record<NonNullable<NavItemProps['countTone']>, string> = {
  accent: 'k-tone-accent',
  warn: 'k-tone-warn',
  'ink-3': 'k-tone-ink3',
};

export function NavItem({ icon: Icon, label, count = null, countTone = 'ink-3', active = false, compact = false, onClick, force }: NavItemProps) {
  return (
    <button
      type="button"
      className={compact ? 'k-nav k-nav--compact t-control' : 'k-nav t-control'}
      aria-current={active ? 'page' : undefined}
      aria-label={count ? `${label}, ${count}` : label}
      onClick={() => onClick()}
      data-force={force}
      data-pattern="P-21"
    >
      <Icon size={16} className="k-nav__icon" aria-hidden="true" />
      <span className="k-nav__label">{label}</span>
      {count ? <span className={`k-nav__count t-label ${COUNT_TONE[countTone]}`}>{count}</span> : null}
    </button>
  );
}
