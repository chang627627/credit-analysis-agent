// Sidebar collapse (P-21): the owner's choice persists across reloads. Browser storage lives
// only in src/v2/state/ (guardrail C19); storage can throw in private windows, so every read
// and write is guarded and the sidebar simply opens expanded.
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
