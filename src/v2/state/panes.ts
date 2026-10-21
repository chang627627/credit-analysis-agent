// ---------------------------------------------------------------------------
// The agent panel's layout and visibility (THREE-PANE.md §1.3, §1.5, §6.3, R4.13).
//
// Layout (R4.13, live matchMedia): 'column' at a viewport of 900px and up (the
// panel is the case file's middle pane), 'stacked' below (the memo full width,
// the panel docked under it as a strip). Since 11fc179 the panel is always
// shown on a case file (chatShown), in either layout; there is no drawer.
//
//   chatOpen    the owner's old column-mode choice, persisted as 'v2.chatOpen'
//               ('1' | '0', default '1'). Read and written ONLY here (C19);
//               every access is guarded, like state/nav.ts.
//   revealed    a transient reveal over a hidden panel. Never persisted;
//               cleared on every file change and any explicit hide.
//   drawerOpen  the old drawer's flag (below 1024px before R4.13). Nothing
//               opens it any more, so it stays false and closeDrawerIn is a
//               no-op for its callers (gate, ui, composer).
//
// Two kinds of caller: explicit (setChatOpen / toggleChat; their old callers,
// `]`, the doc bar toggle and the panel's collapse button, went with 11fc179)
// and transient (the plan auto-reveal, showChatIn). Only explicit callers ever
// write storage.
//
// R2: the panel is command and control only, so the only thing that ever
// reveals it on its own is the plan prompt: once per 'plan:<epoch>' when the
// live file enters plan review (the plan countdown arms only while the prompt
// is on screen, state/plan.ts), while the live file is the route and the tab is
// visible, never moving focus. The gate never reveals the panel: the decision
// is the memo's Decision card, and A / S / R and every "Decision" link bring it
// into view (state/gate.ts). In the stacked layout the strip never covers the
// memo (it sits under it), so nothing steps aside.
//
// Focus return: if the panel ever hid with focus inside it, focus would go to
// the first visible [data-chat-toggle] button once the commit dropped it on
// the body (no such toggle exists since 11fc179; the panel never hides).
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

// ---- layout (column at 900px and up, stacked below; R4.13) ---------------------

/** The widest viewport that stacks the case file (memo over the docked strip). */
export const STACK_MAX_PX = 899;
const COLUMN_QUERY = `(min-width: ${STACK_MAX_PX + 1}px)`;

function readChatLayout(): ChatLayout {
  try {
    if (typeof window.matchMedia !== 'function') return 'column';
    return window.matchMedia(COLUMN_QUERY).matches ? 'column' : 'stacked';
  } catch {
    return 'column';
  }
}

// ---- before a layout swap (R4.14) ---------------------------------------------------
// Crossing 900px re-renders the panel in the other layout: the shell moves it to the other side of
// the memo pane and its contents change (head and thread, or the strip), so the control that held
// focus is removed and focus would fall to the body. A listener here runs while the old layout's
// DOM is still on the page (in the matchMedia change, before the store re-renders), so the panel
// can note what held focus and give it back after the commit (screens/chat/focus.ts).

type SwapListener = (from: ChatLayout, to: ChatLayout) => void;
const beforeSwap = new Set<SwapListener>();

/** Run `fn` when the layout is about to change, before the re-render. Returns the unsubscribe. */
export function onBeforeLayoutSwap(fn: SwapListener): () => void {
  beforeSwap.add(fn);
  return () => {
    beforeSwap.delete(fn);
  };
}

/** Live layout mode, with a ref that updates synchronously (actions read it through current()). */
export function useChatLayout(): [ChatLayout, Box<ChatLayout>] {
  const [layout, setLayout] = useState<ChatLayout>(readChatLayout);
  const ref = useRef<ChatLayout>(layout);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(COLUMN_QUERY);
    const on = () => {
      const next: ChatLayout = mql.matches ? 'column' : 'stacked';
      const prev = ref.current;
      if (prev !== next) {
        for (const fn of Array.from(beforeSwap)) {
          try {
            fn(prev, next);
          } catch {
            /* a listener never blocks the swap */
          }
        }
      }
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
 * Transient reveal of a hidden panel, without touching storage. Off a case
 * file there is no panel to reveal. Never moves focus. (The panel is always
 * shown since 11fc179, so this only keeps the flags consistent; R4.13 removed
 * the drawer it used to open, which also closed an overlaid source.)
 */
export function showChatIn(x: V2Internals): void {
  if (x.routeRef.current.name !== 'file') return;
  const p = x.panesRef.current;
  if (p.chatOpen || p.revealed) return;
  x.setPanes({ ...p, revealed: true });
}

// ---- actions -------------------------------------------------------------------

export type PaneActions = Pick<V2Actions, 'setChatOpen' | 'toggleChat'>;

export function createPaneActions(x: V2Internals): PaneActions {
  // explicit: writes the owner's choice and ends any reveal (no caller since the panel became
  // always shown, 11fc179; kept for the contract)
  const setChatOpen = (open: boolean) => {
    const p = x.panesRef.current;
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
      setChatOpen(!(p.chatOpen || p.revealed));
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
