// Agent panel · focus hand-off. When the control that held focus unmounts (the plan prompt after
// Start drafting, Cancel or the countdown; the "New activity" pill after a jump), focus would fall
// to the body. After the commit, if it did and the panel is still on the page, the panel's own
// composer takes it (the panel's foot, where the reviewer continues). Focus held anywhere else is
// left alone.
import { focusLost } from '../../state/reveal';

export function focusComposerIfLost(pane: Element | null): void {
  window.requestAnimationFrame(() => {
    if (!pane || !pane.isConnected || !focusLost()) return;
    const field = pane.querySelector<HTMLTextAreaElement>('[data-pattern="P-25"] textarea');
    if (field && !field.disabled) field.focus({ preventScroll: true });
  });
}
