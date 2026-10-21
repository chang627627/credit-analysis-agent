// Agent panel · where a status line's link goes (THREE-PANE.md §2.6, R4.13). Every target is a memo
// card (cueMemo scrolls the memo to it and flashes it; the Decision card at the live gate comes into
// view like "Go to decision"), or a row in it when the link names one (the Questions entry). The
// stress test opens if it was closed (openStress cues it). Shared by the column's thread and the
// narrow screens' strip, so a link behaves the same in both.
import { useCallback } from 'react';
import { useV2 } from '../../state/store';
import type { GoTo } from './Line';

export function useGoTo(dealId: string): GoTo {
  const a = useV2().actions;
  return useCallback<GoTo>(
    (target, anchorId) => {
      if (target === 'stress') {
        a.openStress(dealId);
        return;
      }
      a.cueMemo({ section: target, anchorId: anchorId ?? null });
    },
    [a, dealId],
  );
}
