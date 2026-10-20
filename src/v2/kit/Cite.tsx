// Cite: an inline ¶ address. The active cite carries a 2px ink outline (never the accent).
import type { ForceState } from './types';

export interface CiteProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  ariaLabel: string;
  force?: ForceState;
}

export function Cite({ label, active = false, onClick, ariaLabel, force }: CiteProps) {
  return (
    <button
      type="button"
      className={active ? 'k-cite k-cite--active t-meta' : 'k-cite t-meta'}
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={() => onClick()}
      data-force={force}
    >
      {label}
    </button>
  );
}
