import type { Flag } from '../agent/types';

const ICON: Record<Flag['severity'], string> = {
  info: 'ℹ',
  warning: '▲',
  critical: '■',
};

export function FlagPill({ flag }: { flag: Flag }) {
  return (
    <div className={`flag flag--${flag.severity}`}>
      <span className="flag__icon">{ICON[flag.severity]}</span>
      <span className="flag__msg">{flag.message}</span>
      {flag.needsHuman && <span className="flag__tag">needs human</span>}
    </div>
  );
}
