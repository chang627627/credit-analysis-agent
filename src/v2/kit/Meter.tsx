// Meter: risk (full width, 6px, tone fill to value%, ink tick at the decline line) or cushion
// (64×4, centred ink-2 tick, fill grows from the centre on one shared ±50% scale; P-07).
// Geometry travels as inline custom properties; colours come from kit.css.
import type { CSSProperties } from 'react';
import type { MeaningTone } from './types';

export type MeterProps =
  | { kind: 'risk'; value: number; tick: number; tone: MeaningTone; ariaLabel: string }
  | { kind: 'cushion'; pct: number; tone: 'neutral' | 'warn' | 'bad'; ariaLabel: string };

const clampPct = (n: number): number => (Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0);

export function Meter(props: MeterProps) {
  if (props.kind === 'risk') {
    const style = { '--k-fill': `${clampPct(props.value)}%`, '--k-tick': `${clampPct(props.tick)}%` } as CSSProperties;
    return (
      <span className="k-meter k-meter--risk" role="img" aria-label={props.ariaLabel} style={style}>
        <span className="k-meter__fill" data-tone={props.tone} />
        <span className="k-meter__tick" />
      </span>
    );
  }
  const pct = Number.isFinite(props.pct) ? props.pct : 0;
  // min(|pct|, 50) / 50 × 50% of the track: 1% of cushion = 1% of the track, capped at the half.
  const style = { '--k-fill': `${Math.min(Math.abs(pct), 50)}%` } as CSSProperties;
  return (
    <span
      className="k-meter k-meter--cushion"
      role="img"
      aria-label={props.ariaLabel}
      style={style}
      data-pattern="P-07"
    >
      <span className="k-meter__fill" data-tone={props.tone} data-dir={pct < 0 ? 'neg' : 'pos'} />
      <span className="k-meter__tick" />
    </span>
  );
}
