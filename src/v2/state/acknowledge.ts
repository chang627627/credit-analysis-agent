// ---------------------------------------------------------------------------
// Acknowledging a covenant item on the Book (THREE-PANE.md R4.6, Mobbin audit
// fix 5). Acknowledge never acts at once: it opens the item's inline strip (a
// reason field, the consequence line, Acknowledge / Cancel). A breach needs a
// reason, a watch may go without. Confirming calls the engine's own
// monitor.acknowledge(id), unchanged, and keeps the reason here in V2 state
// (ui.ackNotes, keyed by escalation id), where the Book row, the Ledger's
// Reviewer row and the session export read it. Focus moves to the field on
// open (the kit strip does that on mount) and back to the item afterwards.
// ---------------------------------------------------------------------------

import { ackAnnouncement, ackNoteRequired, COPY } from '../model';
import type { V2Actions, V2Internals, V2Store } from './store';
import { cssEscape, focusLost, onFrames, rendered } from './reveal';

export type AckActions = Pick<V2Actions, 'requestAcknowledge' | 'setAckNote' | 'confirmAcknowledge' | 'cancelAcknowledge'>;

/** An open monitor item on a file the Book shows (a removed file's items are hidden, so never acted on). */
function openMonitorItem(s: V2Store, id: string) {
  const e = s.monitor.escalations.find((x) => x.id === id);
  if (!e || e.status !== 'open' || e.origin === 'countersign') return null;
  return s.agent.dealsFull.some((d) => d.id === e.dealId) ? e : null;
}

const q = (selector: string): HTMLElement | null => {
  try {
    const el = document.querySelector(selector);
    return el instanceof HTMLElement ? el : null;
  } catch {
    return null;
  }
};

/** The item's open strip (Book.tsx renders it in the row's detail as [data-ack="<id>"]). */
const stripOf = (id: string) => q(`[data-ack="${cssEscape(id)}"]`);
const fieldOf = (id: string) => q(`[data-ack="${cssEscape(id)}"] input`);
/** The item's Acknowledge button ([data-ack-trigger] in its sub-row). */
const triggerOf = (id: string) => q(`[data-item="${cssEscape(id)}"] [data-ack-trigger] button`);
/** The acknowledged item's line under its figures ([data-ack-record], tabIndex -1). */
const recordOf = (id: string) => q(`[data-item="${cssEscape(id)}"] [data-ack-record]`);

/**
 * Once the strip has closed, put focus that fell to the body on `target` (a reviewer who moved
 * focus elsewhere keeps it). Retries a few frames while the strip unmounts and the target mounts.
 */
function landFocus(id: string, target: () => HTMLElement | null): void {
  onFrames(() => {
    if (stripOf(id)) return false;
    if (!focusLost()) return true;
    const el = target();
    if (!rendered(el)) return false;
    el.focus();
    return true;
  }, 6);
}

/** Focus the strip's field, caret at the end (after a confirm with no reason on a breach). */
function focusField(id: string): void {
  onFrames(() => {
    const el = fieldOf(id);
    if (!(el instanceof HTMLInputElement) || !rendered(el)) return false;
    if (document.activeElement !== el) el.focus();
    const end = el.value.length;
    try {
      el.setSelectionRange(end, end);
    } catch {
      /* not a text field */
    }
    return true;
  });
}

export function createAckActions(x: V2Internals): AckActions {
  const close = () => x.setUi((u) => (u.ackConfirm === null ? u : { ...u, ackConfirm: null }));

  return {
    requestAcknowledge: (id) => {
      const s = x.current();
      if (!openMonitorItem(s, id)) return;
      if (x.uiRef.current.ackConfirm?.id === id) {
        focusField(id);
        return;
      }
      // one strip at a time (like the Desk's remove confirm); the kit strip focuses its field on mount
      x.setUi((u) => ({ ...u, ackConfirm: { id, note: '', hint: false } }));
    },

    setAckNote: (text) =>
      x.setUi((u) => {
        const c = u.ackConfirm;
        if (!c || c.note === text) return u;
        return { ...u, ackConfirm: { ...c, note: text, hint: text.trim() === '' ? c.hint : false } };
      }),

    confirmAcknowledge: () => {
      const c = x.uiRef.current.ackConfirm;
      if (!c) return;
      const s = x.current();
      const item = openMonitorItem(s, c.id);
      // acknowledged, resolved or hidden since the strip opened: nothing left to acknowledge
      if (!item) {
        close();
        return;
      }
      const note = c.note.trim();
      if (ackNoteRequired(item) && note === '') {
        x.setUi((u) => (u.ackConfirm ? { ...u, ackConfirm: { ...u.ackConfirm, hint: true }, announce: COPY.ackReasonFirst } : u));
        focusField(c.id);
        return;
      }
      // the engine's own acknowledge, unchanged; the reason lives in V2 state beside it
      s.monitor.acknowledge(c.id);
      x.setUi((u) => ({
        ...u,
        ackConfirm: null,
        ackNotes: { ...u.ackNotes, [c.id]: { note, at: Date.now() } },
        announce: ackAnnouncement(item),
      }));
      landFocus(c.id, () => recordOf(c.id));
    },

    cancelAcknowledge: () => {
      const c = x.uiRef.current.ackConfirm;
      if (!c) return;
      close();
      landFocus(c.id, () => triggerOf(c.id));
    },
  };
}
