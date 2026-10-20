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
//   A             live file at the gate: requestSign('key'), relative to the
//                 memo Decision card. Signs when the card's reviewer line is on
//                 screen; otherwise the first press brings the verbs and the line
//                 into view and focuses the primary, and the next press signs.
//   S / R         live file at the gate: return / reject through the
//                 note-required flow (an empty note focuses the card's note field)
//   J / K         file route: next / previous flagged row in the memo
//   [             file route: toggle the source pane
//   ]             file route: toggle the agent panel (opening focuses the composer)
//   Esc           palette, then open menus (kit), then the confirm strip, then
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

      if (mod && !e.altKey && e.key === 'Enter') {
        const r = s.route;
        // the plan the reviewer approves is the one on screen: the live file's route only
        if (s.agent.status === 'plan_review' && r.name === 'file' && r.dealId === selectLiveDealId(s)) {
          e.preventDefault();
          a.approvePlan();
          return;
        }
        if (r.name === 'file' && !s.agent.parsing) {
          const view = selectFile(s, r.dealId);
          if (view && view.primary && view.primary.action === 'draft' && !view.primary.disabled) {
            e.preventDefault();
            a.startFile(r.dealId);
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
          a.tryRework();
          return;
        case 'r':
        case 'R':
          if (!atLiveGate || e.repeat) return;
          e.preventDefault();
          a.tryReject();
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
