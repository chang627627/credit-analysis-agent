// Slider: a fully custom range (native <input type=range>, cross-engine chrome in kit.css).
// A 4px track of flat, gapless zone segments in tone mark, 2px ink-3 notches at the boundaries,
// boundary labels above (hidden when closer than 48px to each other or 24px to either end),
// and a 14px paper thumb with a 2px ink ring. The zone layer is inset by half the thumb so marks
// line up with the thumb centre.
import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { MeaningTone } from './types';

export interface SliderZone {
  tone: MeaningTone;
  fromPct: number;
  toPct: number;
}
export interface SliderBoundary {
  pct: number;
  text: string;
  tone: MeaningTone;
}
export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  valueText: string;
  zones: SliderZone[];
  boundaries: SliderBoundary[];
}

const THUMB = 14;
const LABEL_GAP = 48;
const LABEL_EDGE = 24;
const ZONE_OVERLAP = 0.01; // fraction of the track painted under the next zone

const clamp01 = (pct: number): number => (Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) / 100 : 0);
const at = (pct: number) => ({ '--k-at': clamp01(pct) }) as CSSProperties;

export function Slider({ value, min, max, step, onChange, ariaLabel, valueText, zones, boundaries }: SliderProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Which boundary labels fit: none within 24px of an end, none closer than 48px to the last shown.
  const track = Math.max(0, width - THUMB);
  const visible = new Set<number>();
  if (track > 0) {
    let last = -Infinity;
    boundaries
      .map((b, i) => ({ i, x: clamp01(b.pct) * track }))
      .sort((a, b) => a.x - b.x)
      .forEach(({ i, x }) => {
        if (x < LABEL_EDGE || track - x < LABEL_EDGE) return;
        if (x - last < LABEL_GAP) return;
        visible.add(i);
        last = x;
      });
  }

  // Gapless flat zones: sorted, each painted slightly past the next zone's start; the next zone is
  // drawn on top, so no track colour shows through at sub-pixel boundaries (no gradient anywhere).
  const sorted = [...zones].sort((a, b) => a.fromPct - b.fromPct);
  const painted = sorted.map((z, i) => {
    const from = clamp01(z.fromPct);
    const own = clamp01(z.toPct);
    const next = sorted[i + 1];
    const to = next ? Math.min(1, Math.max(own, clamp01(next.fromPct)) + ZONE_OVERLAP) : own;
    return { tone: z.tone, from, to };
  });

  return (
    <div className="k-slider" ref={rootRef}>
      <div className="k-slider__labels" aria-hidden="true">
        {boundaries.map((b, i) =>
          visible.has(i) ? (
            <span key={`l${i}`} className="k-slider__label t-meta" data-tone={b.tone} style={at(b.pct)}>
              {b.text}
            </span>
          ) : null,
        )}
      </div>
      <div className="k-slider__track">
        <div className="k-slider__zones" aria-hidden="true">
          {painted.map((z, i) => (
            <span
              key={`z${i}`}
              className="k-slider__zone"
              data-tone={z.tone}
              style={{ '--k-from': z.from, '--k-to': z.to } as CSSProperties}
            />
          ))}
          {boundaries.map((b, i) => (
            <span key={`n${i}`} className="k-slider__notch" style={at(b.pct)} />
          ))}
        </div>
        <input
          type="range"
          className="k-slider__input"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={ariaLabel}
          aria-valuetext={valueText}
          aria-describedby={boundaries.length > 0 ? listId : undefined}
        />
      </div>
      {boundaries.length > 0 ? (
        <ul id={listId} className="v2-sr">
          {boundaries.map((b, i) => (
            <li key={`s${i}`}>{b.text}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
