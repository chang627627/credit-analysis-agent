// ---------------------------------------------------------------------------
// The agent panel's visibility (THREE-PANE.md §1.3, §1.5, §6.3).
//
//   chatOpen    column mode: the owner's choice, persisted as 'v2.chatOpen'
//               ('1' | '0', default '1'). Read and written ONLY here (C19);
//               every access is guarded, like state/nav.ts.
//   revealed    column mode: a transient reveal over a hidden panel. Never
//               persisted; cleared on every file change and any explicit hide.
//   drawerOpen  drawer mode (viewport below 1024px): the drawer is open.
//               Never persisted, starts false.
//
// Two kinds of caller: explicit (`]`, the doc bar toggle, the panel's own
// collapse or close button: setChatOpen / toggleChat) and transient (the plan
// auto-reveal, showChatIn). Only explicit callers ever write storage.
//
// R2: the panel is command and control only, so the only thing that ever
// reveals it on its own is the plan prompt: once per 'plan:<epoch>' when the
// live file enters plan review (the plan countdown arms only while the prompt
// is on screen, state/plan.ts), while the live file is the route and the tab is
// visible, never moving focus. The gate never reveals the panel: the decision
// is the memo's Decision card, and A / S / R and every "Decision" link step the
// drawer aside instead (state/gate.ts).
//
// Focus return (owned by the shell): when the panel or the drawer closes with
// focus inside it, focus goes to the first visible [data-chat-toggle] button
// once the commit has dropped it on the body.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { selectLiveDealId } from '../model';
import type { Box, ChatLayout, PaneState, V2Actions, V2Internals, V2Store } from './store';
import { focusLost, onFrames } from './reveal';

// ---- persistence (v2.chatOpen) ----------------------------------------------

const CHAT_OPEN_KEY = 'v2.chatOpen';

function readChatOpen(): boolean {
  try {
    return window.localStorage.getItem(CHAT_OPEN_KEY) !== '0';
  } catch {
    return true;
  }
}

function writeChatOpen(open: boolean): void {
  try {
    window.localStorage.setItem(CHAT_OPEN_KEY, open ? '1' : '0');
  } catch {
    /* storage unavailable: the choice lasts for this page only */
  }
}

export function initialPanes(): PaneState {
  return { chatOpen: readChatOpen(), revealed: false, drawerOpen: false };
}

// ---- layout (column at 1024px and up, drawer below) -------------------------

const COLUMN_QUERY = '(min-width: 1024px)';

function readChatLayout(): ChatLayout {
  try {
    if (typeof window.matchMedia !== 'function') return 'column';
    return window.matchMedia(COLUMN_QUERY).matches ? 'column' : 'drawer';
  } catch {
    return 'column';
  }
}

/** Live layout mode, with a ref that updates synchronously (actions read it through current()). */
export function useChatLayout(): [ChatLayout, Box<ChatLayout>] {
  const [layout, setLayout] = useState<ChatLayout>(readChatLayout);
  const ref = useRef<ChatLayout>(layout);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(COLUMN_QUERY);
    const on = () => {
      const next: ChatLayout = mql.matches ? 'column' : 'drawer';
      ref.current = next;
      setLayout(next);
    };
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);
  return [layout, ref];
}

// ---- focus helpers -------------------------------------------------------------

function visible(el: Element): el is HTMLElement {
  return el instanceof HTMLElement && el.isConnected && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
}

/** Focus currently sits inside the agent panel. */
function paneHasFocus(): boolean {
  try {
    const a = document.activeElement;
    return a instanceof Element && a.closest('[data-chat-pane]') !== null;
  } catch {
    return false;
  }
}

/** After the commit, hand focus to the first visible panel toggle, unless something else already took it. */
function focusChatToggle(): void {
  onFrames(() => {
    if (!focusLost()) return true;
    for (const el of Array.from(document.querySelectorAll('[data-chat-toggle] button'))) {
      if (visible(el)) {
        el.focus({ preventScroll: true });
        return true;
      }
    }
    return false;
  });
}

/** The composer field: the P-25 wrapper's textarea, else the panel's last textarea (the composer is the panel's foot). */
function composerField(): Element | null {
  const tagged = document.querySelector('[data-chat-pane] [data-pattern="P-25"] textarea');
  if (tagged) return tagged;
  const all = document.querySelectorAll('[data-chat-pane] textarea');
  return all.length > 0 ? all[all.length - 1] : null;
}

/** After the commit, focus the composer (an explicit open of the panel). */
function focusComposer(): void {
  onFrames(() => {
    const el = composerField();
    if (!el || !visible(el)) return false;
    el.focus({ preventScroll: true });
    return true;
  });
}

// ---- shared mutations ------------------------------------------------------------

/** The layout mode right now (live, through the store's synchronous ref). */
export function layoutOf(x: V2Internals): ChatLayout {
  return x.current().chatLayout;
}

function closeSourceForDrawer(x: V2Internals): void {
  x.setUi((u) => (u.sourceOpen ? { ...u, sourceOpen: false } : u));
}

/**
 * Close the drawer (no-op when it is closed). With focus inside it, focus
 * returns to the visible panel toggle, unless `returnFocus` is false: the
 * caller moves focus itself (the Decision card's primary or note field, or
 * the card's record after a signature).
 */
export function closeDrawerIn(x: V2Internals, opts?: { returnFocus?: boolean }): void {
  const p = x.panesRef.current;
  if (!p.drawerOpen) return;
  const inside = opts?.returnFocus !== false && paneHasFocus();
  x.setPanes({ ...p, drawerOpen: false });
  if (inside) focusChatToggle();
}

/** A file change: the transient reveal ends and the drawer closes. */
export function resetPanesForFile(x: V2Internals): void {
  const p = x.panesRef.current;
  if (!p.revealed && !p.drawerOpen) return;
  const inside = paneHasFocus();
  x.setPanes({ ...p, revealed: false, drawerOpen: false });
  if (inside) focusChatToggle();
}

/**
 * Transient reveal: column mode reveals a hidden panel without touching
 * storage; drawer mode opens the drawer (which closes the source overlay).
 * Off a case file there is no panel to reveal. Never moves focus.
 */
export function showChatIn(x: V2Internals): void {
  if (x.routeRef.current.name !== 'file') return;
  const p = x.panesRef.current;
  if (layoutOf(x) === 'drawer') {
    if (p.drawerOpen) return;
    x.setPanes({ ...p, drawerOpen: true });
    closeSourceForDrawer(x);
    return;
  }
  if (p.chatOpen || p.revealed) return;
  x.setPanes({ ...p, revealed: true });
}

// ---- actions -------------------------------------------------------------------

export type PaneActions = Pick<V2Actions, 'setChatOpen' | 'toggleChat'>;

export function createPaneActions(x: V2Internals): PaneActions {
  // explicit: column mode writes the owner's choice and ends any reveal; drawer mode opens or closes the drawer
  const setChatOpen = (open: boolean) => {
    const p = x.panesRef.current;
    if (layoutOf(x) === 'drawer') {
      if (open === p.drawerOpen) return;
      if (!open) {
        closeDrawerIn(x);
        return;
      }
      x.setPanes({ ...p, drawerOpen: true });
      closeSourceForDrawer(x);
      focusComposer();
      return;
    }
    const wasShown = p.chatOpen || p.revealed;
    const inside = !open && wasShown && paneHasFocus();
    writeChatOpen(open);
    x.setPanes(p.chatOpen === open && !p.revealed ? p : { ...p, chatOpen: open, revealed: false });
    if (open && !wasShown) focusComposer();
    if (inside) focusChatToggle();
  };

  return {
    setChatOpen,
    toggleChat: () => {
      const p = x.panesRef.current;
      const shown = layoutOf(x) === 'drawer' ? p.drawerOpen : p.chatOpen || p.revealed;
      setChatOpen(!shown);
    },
  };
}

// ---- effects -------------------------------------------------------------------

/** The plan auto-reveal key while the live file is on screen in plan review (null otherwise). */
function revealKeyOf(s: V2Store): string | null {
  const live = selectLiveDealId(s);
  if (live === null || s.route.name !== 'file' || s.route.dealId !== live) return null;
  return s.agent.status === 'plan_review' ? `plan:${s.ui.threadEpoch[live] ?? 0}` : null;
}

/**
 * Call after useV2Effects: its hash-change route hygiene clears a reveal, so a
 * live file opened in plan review is revealed after that hygiene, in the same
 * commit.
 */
export function usePaneEffects(s: V2Store, x: V2Internals): void {
  // a layout switch starts the drawer closed (the column panel follows chatOpen)
  const layout = s.chatLayout;
  const prevLayout = useRef(layout);
  useEffect(() => {
    if (prevLayout.current === layout) return;
    prevLayout.current = layout;
    closeDrawerIn(x);
  }, [layout, x]);

  // the plan prompt auto-reveals once per plan review, while the live file is on screen and the tab visible
  const key = revealKeyOf(s);
  const tabVisible = s.tabVisible;
  useEffect(() => {
    if (key === null || !tabVisible) return;
    if (x.autoRevealed.current.has(key)) return;
    x.autoRevealed.current.add(key);
    showChatIn(x);
  }, [key, tabVisible, x]);
}
