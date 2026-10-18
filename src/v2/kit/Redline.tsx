// Redline: an amended or revised value, old struck through, then the new value.
// The visible parts are hidden from assistive tech; a .v2-sr sentence carries the change instead
// (an aria-label on a generic span is not exposed by screen readers).
import type { Role } from './types';

export interface RedlineProps {
  from: string;
  to: string;
  role?: Role;
}

export function Redline({ from, to, role = 'figure' }: RedlineProps) {
  return (
    <span className={`k-redline t-${role}`}>
      <span className="k-redline__from" aria-hidden="true">{from}</span>
      <span className="k-redline__arrow" aria-hidden="true">→</span>
      <span className="k-redline__to" aria-hidden="true">{to}</span>
      <span className="v2-sr">{`${from} changed to ${to}`}</span>
    </span>
  );
}
