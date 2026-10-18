// Kbd: a keyboard hint chip. Decorative (aria-hidden); the action it hints is named elsewhere.
// A span, not <kbd>, so the UA monospace face never leaks into V2 (Inter only).
export interface KbdProps {
  children: string;
  onAccent?: boolean;
}

export function Kbd({ children, onAccent = false }: KbdProps) {
  return (
    <span className={onAccent ? 'k-kbd k-kbd--on-accent t-meta' : 'k-kbd t-meta'} aria-hidden="true">
      {children}
    </span>
  );
}
