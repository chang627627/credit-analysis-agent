// KeyFigure / KeyFigures: the key-figure strip at the top of the memo. Each figure is a single
// <button> with no interactive descendants (evidence is plain text). The strip is a grid of equal
// cells in a 1px frame with 1px rules, wrapping 3+2 below a 600px container (container query).
import type { ReactNode } from 'react';
import type { ForceState, MeaningTone } from './types';

export interface KeyFigureProps {
  label: string;
  value: string;
  sub?: string | null;
  caption?: string | null;
  tone: 'ink' | 'warn' | 'bad';
  dot?: MeaningTone | null;
  evidence: string;
  onClick: () => void;
  ariaLabel: string;
  force?: ForceState;
}

const TONE: Record<KeyFigureProps['tone'], string> = { ink: 'k-tone-ink', warn: 'k-tone-warn', bad: 'k-tone-bad' };

export function KeyFigure({ label, value, sub, caption, tone, dot, evidence, onClick, ariaLabel, force }: KeyFigureProps) {
  return (
    <button type="button" className="k-keyfig" aria-label={ariaLabel} onClick={() => onClick()} data-force={force}>
      <span className="k-keyfig__label t-label">
        {dot ? <span className="k-keyfig__dot" data-tone={dot} aria-hidden="true" /> : null}
        <span>{label}</span>
      </span>
      <span className={`k-keyfig__value t-figure-lg ${TONE[tone]}`}>{value}</span>
      {sub ? <span className="k-keyfig__sub t-small">{sub}</span> : null}
      {caption ? <span className={`k-keyfig__caption t-small ${TONE[tone]}`}>{caption}</span> : null}
      <span className="k-keyfig__evidence t-small">{evidence}</span>
    </button>
  );
}

export interface KeyFiguresProps {
  children: ReactNode;
  ariaLabel: string;
}

export function KeyFigures({ children, ariaLabel }: KeyFiguresProps) {
  return (
    <div className="k-keyfigs" role="group" aria-label={ariaLabel}>
      <div className="k-keyfigs__grid">{children}</div>
    </div>
  );
}
