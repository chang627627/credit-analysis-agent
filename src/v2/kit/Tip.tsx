// Tip: the tooltip primitive that replaces native title (P-15).
// Wraps its child in an inline-flex anchor span and clones the child only to add
// aria-describedby. Positions against the anchor span; never reads the child's ref.
// Shows after 400ms of hover, immediately on keyboard focus-visible; hides on leave, blur, Esc.
// `specimen` (kit page only) renders the bubble open, in normal flow, with no listeners.
import { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, HTMLAttributes, PointerEvent, ReactElement } from 'react';
import { createPortal } from 'react-dom';

export interface TipProps {
  label: string;
  children: ReactElement<HTMLAttributes<HTMLElement>>;
  placement?: 'top' | 'bottom';
  specimen?: boolean;
}

const SHOW_DELAY_MS = 400; // hover intent, not a visual duration
const GAP = 8;
const EDGE = 8;

const isFocusVisible = (el: EventTarget): boolean => {
  if (!(el instanceof Element)) return false;
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
};

export function Tip({ label, children, placement = 'top', specimen = false }: TipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  const hide = useCallback(() => {
    clearTimer();
    setOpen(false);
    setPos(null);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  // Measure and place the bubble before paint (fixed position, clamped to the viewport).
  useLayoutEffect(() => {
    if (!open || specimen) return;
    const a = anchorRef.current;
    const b = bubbleRef.current;
    if (!a || !b) return;
    const r = a.getBoundingClientRect();
    const bw = b.offsetWidth;
    const bh = b.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    let top = placement === 'top' ? r.top - GAP - bh : r.bottom + GAP;
    if (placement === 'top' && top < EDGE) top = r.bottom + GAP;
    else if (placement === 'bottom' && top + bh > vh - EDGE) top = r.top - GAP - bh;
    const left = Math.min(Math.max(r.left + r.width / 2 - bw / 2, EDGE), Math.max(EDGE, vw - EDGE - bw));
    setPos({ x: left, y: top });
  }, [open, specimen, placement, label]);

  // While open: Esc dismisses (WCAG 1.4.13); scrolling or resizing hides.
  useEffect(() => {
    if (!open || specimen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [open, specimen, hide]);

  const shown = specimen || open;
  // An IconButton already carries the same words as its aria-label: describing it again would
  // make screen readers say them twice, so the description is added only when it adds something.
  const own = children.props['aria-describedby'];
  const describes = shown && children.props['aria-label'] !== label;
  const describedBy = describes ? [own, id].filter(Boolean).join(' ') : own;
  const child = cloneElement(children, { 'aria-describedby': describedBy });

  if (specimen) {
    const bubble = (
      <span id={id} role="tooltip" className="k-tip t-label" data-specimen="">
        {label}
      </span>
    );
    return (
      <span className="k-tip-anchor" data-specimen="" data-placement={placement} data-pattern="P-15">
        {placement === 'top' ? bubble : null}
        {child}
        {placement === 'bottom' ? bubble : null}
      </span>
    );
  }

  const onPointerEnter = (e: PointerEvent<HTMLSpanElement>) => {
    if (e.pointerType === 'touch') return;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setOpen(true);
    }, SHOW_DELAY_MS);
  };
  const onFocus = (e: FocusEvent<HTMLSpanElement>) => {
    if (!isFocusVisible(e.target)) return;
    clearTimer();
    setOpen(true);
  };
  const style = pos ? ({ '--k-tip-x': `${pos.x}px`, '--k-tip-y': `${pos.y}px` } as CSSProperties) : undefined;

  return (
    <>
      <span
        ref={anchorRef}
        className="k-tip-anchor"
        data-pattern="P-15"
        onPointerEnter={onPointerEnter}
        onPointerLeave={hide}
        onPointerDown={hide}
        onFocus={onFocus}
        onBlur={hide}
      >
        {child}
      </span>
      {open
        ? createPortal(
            <span
              ref={bubbleRef}
              id={id}
              role="tooltip"
              className="k-tip t-label"
              data-placed={pos ? '' : undefined}
              style={style}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
