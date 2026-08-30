import { Info, AlertTriangle, OctagonAlert, type LucideIcon } from 'lucide-react';
import type { Flag } from '../agent/types';

const ICON: Record<Flag['severity'], LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  critical: OctagonAlert,
};

export function FlagPill({ flag }: { flag: Flag }) {
  const SeverityIcon = ICON[flag.severity];
  return (
    <div className={`flag flag--${flag.severity}`}>
      <span className="flag__icon">
        <SeverityIcon size={13} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="flag__msg">{flag.message}</span>
      {flag.needsHuman && <span className="flag__tag">needs human</span>}
    </div>
  );
}
