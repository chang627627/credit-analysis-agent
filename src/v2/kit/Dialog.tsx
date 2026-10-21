// Dialog: a modal confirmation for a destructive action (R4.12, P-38): the Desk asks it before
// removing a file (run-discarding confirms stay the inline ConfirmStrip). role="alertdialog",
// aria-modal, named by its title and described by its body. A flat --scrim covers the viewport;
// the paper panel (--r-md, --shadow-pop, 400px wide at most) holds the title (t-heading), the body
// (t-body, ink-2) and the actions right-aligned: Cancel (kit Button secondary) then the confirm
// (kit Button danger). Focus moves to Cancel on open (the safe default), Tab and Shift+Tab stay
// inside, Esc and a press on the scrim cancel, and on close focus returns to the element that
// opened it when nothing else took it. The panel enters with v2-enter
// (instant under reduced motion: the duration token is 0 there). It portals to document.body, which
// keeps the tokens because .v2 is on <html>, so no container or transform above it can trap the
// fixed scrim. The app's global shortcuts stand down while focus is inside (state/shortcuts.ts).
// `preview` (kit page only) renders the panel in normal flow: no portal, no scrim, no fixed
// position, no focus move or trap, no document listeners.
//
// Settle window (R4.14, the idea of the gate's ARM_SETTLE_MS): for SETTLE_MS after it opens, a
// pointer press on the scrim and a click on Cancel or the confirm do nothing, so the second press
// of a double-click on the opener (which lands wherever the scrim or the panel now sits) neither
// closes the dialog at once (it would look as if the opener did nothing) nor confirms the
// destructive action without a look. Esc stays instant, and keyboard activation (Enter or Space on
// the focused button, a click with detail 0) is never held.
import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

export interface DialogProps {
  open: boolean;
  /** the dialog's title (t-heading), which names it; a prop called `title` would read as the native attribute */
  heading: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  preview?: boolean;
}

/** A pointer press this soon after opening is the opener's double-click, not an answer. */
const SETTLE_MS = 500;

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The focusable controls inside the panel that are actually on screen, in DOM order. */
function focusables(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
}

export function Dialog({ open, heading, body, cancelLabel, confirmLabel, onCancel, onConfirm, preview = false }: DialogProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const bodyId = `${id}-body`;
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLSpanElement>(null);
  const openedAt = useRef(0);
  const shown = preview || open;

  // the settle window starts with the commit that shows the dialog, before any later press can land
  useLayoutEffect(() => {
    if (open && !preview) openedAt.current = performance.now();
  }, [open, preview]);

  // Opening: remember the opener and put focus on Cancel; keep focus inside while open. Closing:
  // hand focus back to the opener only when it fell with the panel (a confirm may move it on purpose,
  // and an opener that left the page with the confirm gets nothing).
  useEffect(() => {
    if (!open || preview) return;
    const panel = panelRef.current;
    const ae = document.activeElement;
    const opener = ae instanceof HTMLElement && ae !== document.body && !(panel?.contains(ae) ?? false) ? ae : null;
    const cancelButton = () => cancelRef.current?.querySelector('button') ?? null;
    (cancelButton() ?? panel)?.focus();
    const keepInside = (e: FocusEvent) => {
      const p = panelRef.current;
      if (!p || !(e.target instanceof Node) || p.contains(e.target)) return;
      (cancelButton() ?? p).focus();
    };
    document.addEventListener('focusin', keepInside);
    return () => {
      document.removeEventListener('focusin', keepInside);
      const now = document.activeElement;
      if ((!now || now === document.body || !now.isConnected) && opener && opener.isConnected) opener.focus();
    };
  }, [open, preview]);

  if (!shown) return null;

  /** a pointer press inside the settle window (keyboard clicks carry detail 0 and always pass) */
  const settling = (e: ReactMouseEvent) => !preview && e.detail > 0 && performance.now() - openedAt.current < SETTLE_MS;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (preview) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const els = focusables(panel);
    if (els.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }
    const first = els[0];
    const last = els[els.length - 1];
    const at = document.activeElement;
    const inside = at instanceof Node && panel.contains(at) && at !== panel;
    if (e.shiftKey && (!inside || at === first)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (!inside || at === last)) {
      e.preventDefault();
      first.focus();
    }
  };

  const panel = (
    <div
      ref={panelRef}
      className="k-dialog__panel"
      role="alertdialog"
      aria-modal={preview ? undefined : true}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      tabIndex={-1}
      data-pattern="P-38"
      data-preview={preview ? '' : undefined}
      onKeyDown={onKeyDown}
    >
      <h2 id={titleId} className="k-dialog__title t-heading">
        {heading}
      </h2>
      <p id={bodyId} className="k-dialog__body t-body">
        {body}
      </p>
      <div
        className="k-dialog__actions"
        onClickCapture={(e) => {
          // the settle window: a click this soon after opening never reaches Cancel or the confirm
          if (settling(e)) e.stopPropagation();
        }}
      >
        <span ref={cancelRef} className="k-dialog__cancel">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </span>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );

  if (preview) {
    return (
      <div className="k-dialog" data-preview="">
        {panel}
      </div>
    );
  }

  return createPortal(
    <div
      className="k-dialog"
      onMouseDown={(e) => {
        // a press on the scrim itself (never one that starts inside the panel) cancels; preventing the
        // default keeps the press from moving focus, so it returns to the opener on close
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        if (!settling(e)) onCancel();
      }}
    >
      {panel}
    </div>,
    document.body,
  );
}
