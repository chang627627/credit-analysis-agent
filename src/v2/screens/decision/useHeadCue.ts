// Countersign V2 · the memo cue for a slot card's head (THREE-PANE.md §2.6, §5.9). FileScreen scrolls
// the card and cues the rows and heads it renders itself, but it cannot pass a flash key into a slot,
// so a slot card (the Decision card, the exhibits) listens to the same memoCue: a cue for its section
// (anchor null or its 'sec:' head) flashes the head once when the tick changes after mount, or at
// mount when the cue is under 1000 ms old (the card may mount in the same batch as the write). Under
// reduced motion the head holds the static highlight for CUE_HOLD_MS instead.
import { useEffect, useRef, useState } from 'react';
import { CUE_HOLD_MS } from '../../model';
import type { MemoSection } from '../../model';
import { useV2 } from '../../state/store';

/** A memo cue written this recently is honoured by a head that mounts in the same batch (§2.6). */
const MOUNT_CUE_MS = 1000;

export function useHeadCue(section: MemoSection): { flashKey: number; highlighted: boolean } {
  const s = useV2();
  const cue = s.ui.memoCue;
  const mine = cue !== null && cue.section === section && (cue.anchorId === null || cue.anchorId === `sec:${section}`);
  const tick = mine && cue ? cue.tick : 0;
  const at = mine && cue ? cue.at : 0;
  const reduced = s.reducedMotion;
  const seen = useRef<number | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  // a count, so an earlier cue's timer never ends a later cue's hold early
  const [held, setHeld] = useState(0);
  // a hold timer that fires after the card unmounted changes nothing (checked, not cancelled, so a
  // StrictMode remount keeps the hold it started)
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const first = seen.current === null;
    const prev = seen.current;
    seen.current = tick;
    if (tick === 0 || (first ? Date.now() - at >= MOUNT_CUE_MS : tick === prev)) return;
    if (reduced) {
      setHeld((n) => n + 1);
      window.setTimeout(() => {
        if (alive.current) setHeld((n) => Math.max(0, n - 1));
      }, CUE_HOLD_MS);
      return;
    }
    setFlashKey((k) => k + 1);
  }, [tick, at, reduced]);
  return { flashKey, highlighted: held > 0 };
}
