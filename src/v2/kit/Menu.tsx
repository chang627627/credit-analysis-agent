// Menu: a small-button trigger (+ ChevronDown) opening a popover of rows.
// Hover row = sunken; the keyboard-active row = accent-wash + accent-ink label + a 2px accent inset
// outline. ↑↓ Home End move, Enter/Space select, Esc or Tab close, and focus returns to the trigger.
// `specimen` (kit page only) renders the popover open in normal flow, with a keyboard-active row,
// no portal, no fixed positioning, no autofocus and no document listeners.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import type { LucideIcon } from './types';

export interface MenuItem {
  id: string;
  label: string;
  meta?: string;
  checked?: boolean;
  onSelect: () => void;
}

export interface MenuProps {
  label: string;
  trigger: { text: string; icon?: LucideIcon; variant?: 'ghost' | 'secondary' };
  items: MenuItem[];
  specimen?: boolean;
}

const GAP = 4;
const EDGE = 8;

export function Menu({ label, trigger, items, specimen = false }: MenuProps) {
  const baseId = useId();
  const listId = `${baseId}-menu`;
  const itemId = (i: number) => `${baseId}-item-${i}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const checkedIndex = items.findIndex((it) => it.checked === true);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(specimen ? Math.max(0, checkedIndex) : -1);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const shown = specimen || open;
  const hasChecks = items.some((it) => it.checked !== undefined);
  const activeIndex = active >= items.length ? items.length - 1 : active;

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setPos(null);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const openAt = (index: number) => {
    setActive(index);
    setOpen(true);
  };

  // Place the popover under the trigger (flip above / align right when it would overflow), then
  // move focus into it. Runs before paint, so nothing flashes at the origin.
  useLayoutEffect(() => {
    if (!open || specimen) return;
    const t = triggerRef.current;
    const l = listRef.current;
    if (!t || !l) return;
    const r = t.getBoundingClientRect();
    const lw = l.offsetWidth;
    const lh = l.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    let x = r.left;
    if (x + lw > vw - EDGE) x = Math.max(EDGE, r.right - lw);
    let y = r.bottom + GAP;
    if (y + lh > vh - EDGE && r.top - GAP - lh >= EDGE) y = r.top - GAP - lh;
    setPos({ x, y });
    l.focus({ preventScroll: true });
  }, [open, specimen]);

  // Outside press, resize or an outside scroll closes without stealing focus back.
  useEffect(() => {
    if (!open || specimen) return;
    const inside = (n: EventTarget | null) =>
      n instanceof Node && ((listRef.current?.contains(n) ?? false) || (triggerRef.current?.contains(n) ?? false));
    const onDown = (e: PointerEvent) => {
      if (!inside(e.target)) close(false);
    };
    const onScroll = (e: Event) => {
      if (!inside(e.target)) close(false);
    };
    const onResize = () => close(false);
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, specimen, close]);

  const select = (i: number) => {
    const it = items[i];
    if (!it) return;
    if (!specimen) close(true);
    it.onSelect();
  };

  const onTriggerClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (specimen) return;
    if (open) close(false);
    else openAt(e.detail === 0 ? Math.max(0, checkedIndex) : -1); // detail 0 = keyboard Enter/Space
  };
  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (specimen || items.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openAt(e.key === 'ArrowDown' ? Math.max(0, checkedIndex) : items.length - 1);
    }
  };
  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = items.length;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (n) setActive((activeIndex + 1) % n);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (n) setActive(activeIndex <= 0 ? n - 1 : activeIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        if (n) setActive(0);
        break;
      case 'End':
        e.preventDefault();
        if (n) setActive(n - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeIndex >= 0) select(activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        if (!specimen) close(true);
        break;
      case 'Tab':
        if (!specimen) {
          e.preventDefault();
          close(true);
        }
        break;
      default:
        break;
    }
  };

  const variant = trigger.variant ?? 'ghost';
  const TriggerIcon = trigger.icon;
  const style =
    !specimen && pos ? ({ '--k-menu-x': `${pos.x}px`, '--k-menu-y': `${pos.y}px` } as CSSProperties) : undefined;

  const list = shown ? (
    <div
      ref={listRef}
      id={listId}
      role="menu"
      aria-label={label}
      tabIndex={-1}
      className="k-menu__list"
      data-specimen={specimen ? '' : undefined}
      data-placed={specimen || pos ? '' : undefined}
      style={style}
      aria-activedescendant={activeIndex >= 0 ? itemId(activeIndex) : undefined}
      onKeyDown={onListKey}
    >
      {items.map((it, i) => (
        <div
          key={it.id}
          id={itemId(i)}
          role={it.checked !== undefined ? 'menuitemradio' : 'menuitem'}
          aria-checked={it.checked !== undefined ? it.checked : undefined}
          className={i === activeIndex ? 'k-menu__item is-active' : 'k-menu__item'}
          onClick={() => select(i)}
        >
          {hasChecks ? (
            <span className="k-menu__check" aria-hidden="true">
              {it.checked ? <Check size={14} /> : null}
            </span>
          ) : null}
          <span className="k-menu__label t-body">{it.label}</span>
          {it.meta ? <span className="k-menu__meta t-meta">{it.meta}</span> : null}
        </div>
      ))}
    </div>
  ) : null;

  // a specimen holds its list in normal flow (a block), so its root is a div; live menus stay
  // inline (the list is portalled), so they may sit inside phrasing content
  const Root = specimen ? 'div' : 'span';
  return (
    <Root className="k-menu" data-specimen={specimen ? '' : undefined}>
      <button
        ref={triggerRef}
        type="button"
        className={`k-btn k-btn--sm k-btn--${variant} k-menu__trigger t-label`}
        aria-haspopup="menu"
        aria-expanded={shown}
        aria-controls={shown ? listId : undefined}
        aria-label={label === trigger.text ? undefined : `${label}: ${trigger.text}`}
        onClick={onTriggerClick}
        onKeyDown={onTriggerKey}
      >
        {TriggerIcon ? <TriggerIcon size={12} className="k-btn__icon" aria-hidden="true" /> : null}
        <span className="k-btn__label">{trigger.text}</span>
        <ChevronDown size={12} className="k-menu__chevron" aria-hidden="true" />
      </button>
      {specimen ? list : list ? createPortal(list, document.body) : null}
    </Root>
  );
}
