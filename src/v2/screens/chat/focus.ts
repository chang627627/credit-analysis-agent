// Agent panel · focus hand-off. When the control that held focus unmounts (the plan prompt after
// Start drafting, Cancel or the countdown; the "New activity" pill after a jump), focus would fall
// to the body. After the commit, if it did and the panel is still on the page, the panel's own
// composer takes it (the panel's foot, where the reviewer continues). Focus held anywhere else is
// left alone. Keyboard only: callers hand off only when the control that held focus was focused
// from the keyboard (:focus-visible). A mouse click (Start drafting) leaves focus where it falls, so
// the composer is not lit up while the analysis runs.
import { cssEscape, focusLost } from '../../state/reveal';

/** Whether the element holding focus got it from the keyboard (so a hand-off should follow it). */
export function heldByKeyboard(el: Element | null): boolean {
  if (!el) return false;
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
}

export function focusComposerIfLost(pane: Element | null): void {
  window.requestAnimationFrame(() => {
    if (!pane || !pane.isConnected || !focusLost()) return;
    const field = pane.querySelector<HTMLTextAreaElement>('[data-pattern="P-25"] textarea');
    if (field && !field.disabled) field.focus({ preventScroll: true });
  });
}

// ---- carrying focus across the 900px swap (R4.14) ----------------------------------------------
// Crossing 900px re-renders the panel in the other layout (the shell moves it to the other side of
// the memo pane, and its contents change: head and thread, or the strip), so the control that held
// focus is removed and focus would fall to the body (a tablet rotated while typing). Just before
// the swap (state/panes.ts onBeforeLayoutSwap, while the old layout's DOM is on the page) the pane
// notes which of its controls held focus; after the commit it focuses the matching control in the
// new layout (the composer when there is none: a thread line the strip does not show, a locked
// plan step), with the composer's caret where it was. An IME composition in progress cannot
// survive the swap. The note is used once, only by a pane of the same file in the other layout,
// and only within a second, so it never moves focus later.

type Finder = (pane: Element) => HTMLElement | null;

interface Carried {
  dealId: string;
  from: string;
  at: number;
  find: Finder;
  selection: [number, number] | null;
}

let carried: Carried | null = null;

const CARRY_MS = 1000;
const FIELD = '[data-pattern="P-25"] textarea';

/** How to find, in the other layout's pane, the control that matches the one holding focus. */
function finderFor(el: HTMLElement): Finder | null {
  if (el.matches(FIELD)) return (p) => p.querySelector<HTMLElement>(FIELD);
  if (el.closest('[data-pattern="P-25"]')) return (p) => p.querySelector<HTMLElement>('[data-pattern="P-25"] button:not([disabled])');
  const line = el.closest('[data-thread-item]');
  if (line) {
    const id = cssEscape(line.getAttribute('data-thread-item') ?? '');
    return (p) => p.querySelector<HTMLElement>(`[data-thread-item="${id}"] button`);
  }
  if (el instanceof HTMLInputElement && el.type === 'checkbox') {
    const name = cssEscape(el.getAttribute('aria-label') ?? '');
    return (p) => p.querySelector<HTMLElement>(`.chat-plan input[type="checkbox"][aria-label="${name}"]:not([aria-disabled])`);
  }
  if (el.closest('.chat-plan__countdown')) return (p) => p.querySelector<HTMLElement>('.chat-plan__countdown button');
  const actions = el.closest('.chat-plan__actions');
  if (actions) {
    const i = Array.from(actions.querySelectorAll('button')).indexOf(el as HTMLButtonElement);
    return (p) => (i < 0 ? null : (p.querySelectorAll<HTMLElement>('.chat-plan .chat-plan__actions button')[i] ?? null));
  }
  return null;
}

/** Before the swap (the old layout's DOM still on the page): note what holds focus inside the pane. */
export function carryFocusFrom(pane: Element | null, dealId: string, layout: string): void {
  const held = document.activeElement;
  if (!pane || !(held instanceof HTMLElement) || !pane.contains(held)) return;
  carried = {
    dealId,
    from: layout,
    at: performance.now(),
    find: finderFor(held) ?? ((p) => p.querySelector<HTMLElement>(FIELD)),
    selection: held instanceof HTMLTextAreaElement ? [held.selectionStart, held.selectionEnd] : null,
  };
}

/** After the commit in the new layout: give focus back if it fell with the old layout's controls. */
export function restoreCarriedFocus(pane: Element | null, dealId: string, layout: string): void {
  const c = carried;
  if (!c || c.from === layout) return;
  carried = null;
  if (!pane || c.dealId !== dealId || performance.now() - c.at > CARRY_MS || !focusLost()) return;
  const el = c.find(pane) ?? pane.querySelector<HTMLElement>(FIELD);
  if (!el || el.matches(':disabled')) return;
  el.focus({ preventScroll: true });
  if (c.selection && el instanceof HTMLTextAreaElement) {
    try {
      el.setSelectionRange(c.selection[0], c.selection[1]);
    } catch {
      /* the caret stays where focus put it */
    }
  }
}
