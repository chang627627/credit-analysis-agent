// NavItem: one row of the sidebar navigation. Icon + label + an optional attention dot; the active
// row is ink on --sunken with a 2px ink rule on its left edge (never the accent, like the old tab
// underline). Below 1100px the sidebar folds to an icon rail: the label hides visually but stays the
// accessible name, and the dot rides the icon square's corner. No counts: a badge only means that
// something waits on the reviewer (`attention` is its words, appended to the accessible name).
import type { ComponentType } from 'react';
import type { ForceState } from './types';

export interface NavItemProps {
  icon: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  label: string;
  /** set only while something waits on the reviewer: shows the dot and joins the accessible name */
  attention?: string | null;
  active?: boolean;
  /** icon-rail mode: the label hides visually (still the accessible name) */
  compact?: boolean;
  onClick: () => void;
  /** kit page only */
  force?: ForceState;
}

export function NavItem({ icon: Icon, label, attention = null, active = false, compact = false, onClick, force }: NavItemProps) {
  return (
    <button
      type="button"
      className={compact ? 'k-nav k-nav--compact t-control' : 'k-nav t-control'}
      aria-current={active ? 'page' : undefined}
      aria-label={attention ? `${label}, ${attention}` : label}
      onClick={() => onClick()}
      data-force={force}
      data-pattern="P-21"
    >
      <Icon size={16} className="k-nav__icon" aria-hidden="true" />
      <span className="k-nav__label">{label}</span>
      {attention ? <span className="k-nav__dot" aria-hidden="true" /> : null}
    </button>
  );
}
