// ---------------------------------------------------------------------------
// Agent panel · the thread (THREE-PANE.md R2.1, §2.5). Lines only: each
// ThreadLine is ONE line (a steering reply may clip to 2) with an optional
// status glyph and an optional trailing link ("Covenants →", "Decision →",
// "Record →") that scrolls the memo to that card. No boxes, no cards, no
// records, no reasoning, no buttons: the detail and the decision are on the
// right, and a line only points at them. A real answer about the deal is in
// the memo's Questions block; its line here reads "Answered in the memo ·
// Questions →" and cues that entry (R4.5). Rendered verbatim. The conversation
// runs top-down; `children` (the plan prompt, the Start drafting button) follow
// the lines in the same scroller, as a message would.
//
// Links (go.ts, shared with the strip): every target is a memo card (cueMemo;
// the Decision card at the live gate comes into view like "Go to decision"),
// or a row in it when the link names one (the Questions entry, scrolled to and
// flashed once). The stress test opens if it was closed (openStress cues it).
// Each line renders through ChatLine (Line.tsx), the strip's too.
//
// Auto-follow (component-local, resets on remount by design):
//   - pinned = within 24px of the foot, recomputed on every scroll;
//   - a new line, or a resize of the list or the scroller (the plan prompt
//     appearing, the composer growing), keeps a pinned thread at its foot with
//     INSTANT jumps (a smooth follow reads its own frames as reader scroll and
//     unpins itself);
//   - scrolled up, new lines count into an in-place "New activity · n" pill;
//   - mount jumps to the foot and pins; a composer send always re-pins.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDown } from 'lucide-react';
import { Button } from '../../kit';
import { newActivityLabel } from '../../model';
import type { ThreadLine } from '../../model';
import { focusComposerIfLost, heldByKeyboard } from './focus';
import { useGoTo } from './go';
import { ChatLine } from './Line';

/** A thread within this many px of its foot is pinned (follows new lines). */
const PIN_SLACK = 24;

export interface ThreadProps {
  dealId: string;
  lines: ThreadLine[];
  /** the head's heading id: names the list */
  labelledBy: string;
  /** bumps on every composer send */
  sendSeq: number;
  /** after the lines, in the same flow: the plan prompt / the Start drafting button */
  children?: ReactNode;
}

function atFoot(el: HTMLElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= PIN_SLACK;
}

export function Thread({ dealId, lines, labelledBy, sendSeq, children }: ThreadProps) {
  const go = useGoTo(dealId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const [unseen, setUnseen] = useState(0);

  // ---- following
  const jump = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    pinnedRef.current = true;
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const pinned = atFoot(el);
    pinnedRef.current = pinned;
    if (pinned) setUnseen((u) => (u === 0 ? u : 0));
  };

  // mount (panel opened, file switched): jump to the foot and pin
  useLayoutEffect(() => {
    jump();
  }, [jump]);

  // a composer send always re-pins (declared before the line effect, so the new lines follow)
  const lastSend = useRef(sendSeq);
  useLayoutEffect(() => {
    if (lastSend.current === sendSeq) return;
    lastSend.current = sendSeq;
    setUnseen(0);
    jump();
  }, [sendSeq, jump]);

  // a new line: follow when pinned, else count it into the pill (lines updated in place are not new)
  const count = lines.length;
  const lastId = count > 0 ? lines[count - 1].id : '';
  const seen = useRef({ count, lastId });
  useLayoutEffect(() => {
    const prev = seen.current;
    if (prev.count === count && prev.lastId === lastId) return;
    seen.current = { count, lastId };
    if (pinnedRef.current) jump();
    else setUnseen((u) => u + Math.max(1, count - prev.count));
  }, [count, lastId, jump]);

  // a resize of the flow (an answer rewrapping, the plan prompt arriving) or the scroller (the composer growing)
  useEffect(() => {
    const sc = scrollRef.current;
    const flow = flowRef.current;
    if (!sc || !flow || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (pinnedRef.current) jump();
    });
    ro.observe(sc);
    ro.observe(flow);
    return () => ro.disconnect();
  }, [jump]);

  // the pill leaves once the thread is at its foot: focus it held goes to the composer
  const onPill = () => {
    const keyboard = heldByKeyboard(document.activeElement);
    setUnseen(0);
    jump();
    if (keyboard) focusComposerIfLost(scrollRef.current ? scrollRef.current.closest('[data-chat-pane]') : null);
  };

  return (
    <div className="chat-threadbox">
      <div className="chat-thread" ref={scrollRef} onScroll={onScroll}>
        <div className="chat-flow" ref={flowRef}>
          <ol className="chat-list" aria-labelledby={labelledBy}>
            {lines.map((line) => (
              <ChatLine key={line.id} line={line} onGo={go} />
            ))}
          </ol>
          {children}
        </div>
      </div>
      {unseen > 0 ? (
        <div className="chat-pill">
          <Button variant="secondary" size="sm" icon={ArrowDown} onClick={onPill}>
            {newActivityLabel(unseen)}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
