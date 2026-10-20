// ---------------------------------------------------------------------------
// The keyboard map (spec §7.6 as replaced by THREE-PANE.md §6.4 and R2.3),
// implemented once.
//
//   ⌘K / Ctrl K   toggle the palette (everywhere)
//   ⌘↵ / Ctrl ↵   on the live file in plan review: approve its plan as edited;
//                 on any other file: that file's own primary when it is Draft
//                 memo (never while extraction runs), which opens the confirm
//                 strip if a run is live. A plan is never approved from a route
//                 where it is not the live file. The composer never submits on it.
//                 Live file at the gate with Return or Reject armed and focus in the
//                 Decision card (its note, where arming puts it and where S and R
//                 type): presses the armed verb (commits with a note; R4). It is
//                 the only commit key the card advertises while armed.
//   A             live file at the gate: requestSign('key'), relative to the
//                 memo Decision card. Signs when the card's reviewer line is on
//                 screen; otherwise the first press brings the verbs and the line
//                 into view and focuses the primary, and the next press signs.
//                 While Return or Reject is armed, A never signs: it focuses the
//                 primary (Enter, Space or a click on it signs over the armed verb).
//   S / R         live file at the gate: Return / Reject, armed (R4, Mobbin audit
//                 fix 1). A first press never acts: it arms the verb and puts the
//                 reviewer in the card's note, caret at the end. From there letters
//                 type (the chips for A and the other verb drop while armed), so
//                 the commit is ⌘↵. Only with focus outside a field do S / R
//                 reach the card again: the same key commits when the note has
//                 text (empty: a calm hint) and the armed verb or the note is on
//                 screen (off screen it brings them back instead); the other key
//                 re-arms to the other verb.
//   J / K         file route: next / previous flagged row in the memo
//   [             file route: toggle the source pane
//   ]             file route: toggle the agent panel (opening focuses the composer)
//   Esc           palette, then open menus (kit), then an armed Return / Reject
//                 while focus is in the Decision card (its note included), then
//                 the confirm strip, then
//                 the drawer (drawer mode), then the source overlay, then the
//                 active cites. Whenever it closes something it prevents the
//                 default, so the agent panel's own Escape handler (for fields
//                 inside the drawer) never acts on the same press.
//
// Single-key guards: no meta / ctrl / alt, not typing in a field (the reviewer
// note and the composer are typing), the palette closed, no key repeat on the
// verbs, and the gate not receding. The listener sits in the capture phase so
// each press resolves to exactly one action before any component handler runs;
// kit popovers (menus, dialogs) keep their own keys.
// ---------------------------------------------------------------------------

import { useEffect } from 'react';
import { selectFile, selectLiveDealId } from '../model';
import type { V2Internals } from './store';
import { sourceIsOverlay } from './ui';

/** Focus is in a field that consumes letters (input, textarea, select, contenteditable). */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/** Inside the registered memo Decision card (its note field included). */
function inDecision(x: V2Internals, target: EventTarget | null): boolean {
  const card = x.decisionRef.current;
  return card !== null && card.isConnected && target instanceof Node && card.contains(target);
}

/** Inside a kit popover that owns its keyboard (menu, dialog). */
function inPopover(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[role="menu"],[role="dialog"],[role="listbox"]') !== null;
}

export function useShortcuts(x: V2Internals): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const s = x.current();
      const a = s.actions;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        a.setPaletteOpen(!s.ui.paletteOpen);
        return;
      }
      // the palette consumes its own keys (the kit closes it on Esc; this mirrors that)
      if (s.ui.paletteOpen) {
        if (e.key === 'Escape') a.setPaletteOpen(false);
        return;
      }

      // an armed Return / Reject disarms on Esc from inside the Decision card, before any other Esc
      // target: the note field is typing, so the single-key chain below never sees it
      if (e.key === 'Escape' && !e.defaultPrevented && s.gate.armed !== null && !inPopover(e.target) && inDecision(x, e.target)) {
        e.preventDefault();
        a.disarm();
        return;
      }

      if (mod && !e.altKey && e.key === 'Enter') {
        const r = s.route;
        // the plan the reviewer approves is the one on screen: the live file's route only
        if (s.agent.status === 'plan_review' && r.name === 'file' && r.dealId === selectLiveDealId(s)) {
          e.preventDefault();
          a.approvePlan();
          return;
        }
        // the armed verb's commit chord, from inside the Decision card only (arming focuses its note,
        // where S and R type): never from the composer, never a signature
        const armed = s.gate.armed;
        if (armed !== null && r.name === 'file' && r.dealId === selectLiveDealId(s) && s.agent.status === 'awaiting_approval' && inDecision(x, e.target)) {
          e.preventDefault();
          if (e.repeat || s.gate.leaving) return;
          if (armed === 'reject') a.tryReject('key');
          else a.tryRework('key');
          return;
        }
        if (r.name === 'file' && !s.agent.parsing) {
          const view = selectFile(s, r.dealId);
          if (view && view.primary && view.primary.action === 'draft' && !view.primary.disabled) {
            e.preventDefault();
            a.draftFile(r.dealId);
          }
        }
        return;
      }

      // ---- single-key shortcuts
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target) || inPopover(e.target)) return;
      if (s.gate.leaving) return;

      const r = s.route;
      const onFile = r.name === 'file';
      const onKnownFile = r.name === 'file' && s.agent.dealsFull.some((d) => d.id === r.dealId);
      const live = selectLiveDealId(s);
      const atLiveGate = r.name === 'file' && r.dealId === live && s.agent.status === 'awaiting_approval';

      switch (e.key) {
        case 'a':
        case 'A':
          if (!atLiveGate || e.repeat) return;
          e.preventDefault();
          a.requestSign('key');
          return;
        case 's':
        case 'S':
          if (!atLiveGate || e.repeat) return;
          e.preventDefault();
          a.tryRework('key');
          return;
        case 'r':
        case 'R':
          if (!atLiveGate || e.repeat) return;
          e.preventDefault();
          a.tryReject('key');
          return;
        case 'j':
        case 'J':
          if (!onFile) return;
          e.preventDefault();
          a.focusNote(1);
          return;
        case 'k':
        case 'K':
          if (!onFile) return;
          e.preventDefault();
          a.focusNote(-1);
          return;
        case '[':
          if (!onFile) return;
          e.preventDefault();
          a.toggleSource();
          return;
        case 'Escape': {
          if (e.defaultPrevented) return;
          if (s.ui.confirm) {
            e.preventDefault();
            a.cancelConfirm();
            return;
          }
          if (onFile && s.ui.sourceOpen && sourceIsOverlay()) {
            e.preventDefault();
            a.closeSource();
            return;
          }
          if (s.ui.cites) {
            e.preventDefault();
            a.clearCites();
          }
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [x]);
}
