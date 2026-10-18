// SignatureLine: the countersignature line, the one signature interaction (P-01), with the
// auto-countersign countdown fill (P-11). The interactive element (role=button) wraps ONLY the
// 40px pad and the rule; the caption renders as a sibling below it, so a LinkButton in the caption
// is never nested in a button.
//
// The ink is a FIXED-SIZE svg (200×40, viewBox 0 0 200 40) left-aligned in the pad, with no
// preserveAspectRatio="none" and no vector-effect, so pathLength normalisation is consistent:
// <path d={INK_PATH} pathLength={1} />; stroke styling and the v2-ink draw live in kit.css.
import type { CSSProperties, KeyboardEvent, ReactNode, Ref } from 'react';
import { Token } from './Token';

export type SigState = 'pre-signed' | 'open' | 'countdown' | 'held' | 'signed' | 'signed-auto' | 'rejected' | 'returned';

export interface SignatureLineProps {
  role: 'agent' | 'reviewer';
  state: SigState;
  text?: string;                 // agent '/s/ Credit Analyst' · auto '/auto/ clean-approval policy'
  caption: ReactNode;            // sibling of the hit area: t-meta ink-3, 8px below the rule
  ink?: 'none' | 'animate' | 'static';
  rejectedWord?: string;         // the rejected token word, from the model
  fillMs?: number;               // countdown fill duration (AUTO_COUNTDOWN_MS); sets --k-fill-ms inline
  lineRef?: Ref<HTMLDivElement>; // the hit area (pad + rule)
  onActivate?: () => void;       // click/Enter on an open reviewer line
}

export const INK_PATH = 'M4 30 C 24 6, 40 6, 48 22 S 70 40, 84 18 S 120 4, 132 24 S 168 36, 196 14';

const OPEN_STATES: ReadonlySet<SigState> = new Set<SigState>(['open', 'countdown', 'held']);

const MODIFIER: Record<SigState, string> = {
  'pre-signed': '',
  open: ' k-sig--open',
  countdown: ' k-sig--open',
  held: ' k-sig--open',
  signed: ' k-sig--signed',
  'signed-auto': ' k-sig--auto',
  rejected: ' k-sig--rejected',
  returned: '',
};

export function SignatureLine({
  role, state, text, caption, ink = 'none', rejectedWord, fillMs, lineRef, onActivate,
}: SignatureLineProps) {
  const interactive = role === 'reviewer' && OPEN_STATES.has(state) && onActivate !== undefined;
  const showInk = state === 'signed' && ink !== 'none';
  const showText = (state === 'pre-signed' || state === 'signed-auto') && text;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate?.();
    }
  };

  const fillStyle =
    fillMs !== undefined && Number.isFinite(fillMs) ? ({ '--k-fill-ms': `${Math.max(0, fillMs)}ms` } as CSSProperties) : undefined;

  return (
    <div className={`k-sig${MODIFIER[state]}`} data-role={role} data-state={state} data-ink={ink} data-pattern="P-01">
      <div
        ref={lineRef}
        className="k-sig__hit"
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? 'Countersignature line. The agent is suspended until you act.' : undefined}
        onClick={interactive ? () => onActivate?.() : undefined}
        onKeyDown={interactive ? onKeyDown : undefined}
      >
        <div className="k-sig__pad">
          {showText ? <span className="k-sig__text t-strong">{text}</span> : null}
          {showInk ? (
            <svg className="k-sig__ink" width="200" height="40" viewBox="0 0 200 40" aria-hidden="true" focusable="false">
              <path d={INK_PATH} pathLength={1} />
            </svg>
          ) : null}
        </div>
        <div className="k-sig__rule">
          {state === 'countdown' ? (
            <span className="k-sig__fill" style={fillStyle} data-pattern="P-11" aria-hidden="true" />
          ) : null}
          {state === 'rejected' && rejectedWord ? (
            <span className="k-sig__stamp">
              <Token tone="bad">{rejectedWord}</Token>
            </span>
          ) : null}
        </div>
      </div>
      <div className="k-sig__caption t-meta">{caption}</div>
    </div>
  );
}
