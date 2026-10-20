// Agent panel · focus hand-off. When the control that held focus unmounts (the plan prompt after
// Start drafting, Cancel or the countdown; the "New activity" pill after a jump), focus would fall
// to the body. After the commit, if it did and the panel is still on the page, the panel's own
// composer takes it (the panel's foot, where the reviewer continues). Focus held anywhere else is
// left alone. Keyboard only: callers hand off only when the control that held focus was focused
// from the keyboard (:focus-visible). A mouse click (Start drafting) leaves focus where it falls, so
// the composer is not lit up while the analysis runs.
import { focusLost } from '../../state/reveal';

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
