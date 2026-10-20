// Sidebar collapse (P-21): the owner's choice persists across reloads. Browser storage lives
// only in src/v2/state/ (guardrail C19); storage can throw in private windows, so every read
// and write is guarded and the sidebar simply opens expanded. The shell's forced rail (narrow
// viewports, or beside an open agent panel) never writes this choice.
import { useCallback, useEffect, useState } from 'react';

const KEY = 'v2.navCollapsed';

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function useNavCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(read);
  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, collapsed ? '1' : '0');
    } catch {
      // storage unavailable: the choice lasts for this page only
    }
  }, [collapsed]);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);
  return [collapsed, toggle];
}

/**
 * True while the viewport is at most `px` wide (live matchMedia). The shell
 * uses it for the forced sidebar rail: always at 1099 and below, and at 1399
 * and below beside an open agent panel (THREE-PANE.md §1.4).
 */
export function useViewportAtMost(px: number): boolean {
  const query = `(max-width: ${px}px)`;
  const [match, setMatch] = useState(() => {
    try {
      return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}
