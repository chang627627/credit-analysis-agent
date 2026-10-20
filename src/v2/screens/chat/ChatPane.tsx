// ---------------------------------------------------------------------------
// Case file · the agent panel (THREE-PANE.md R2.1, §1.8). Command and control
// only, like a coding agent's conversation: the head, one-line status lines
// that point at the memo, the plan prompt that starts drafting, and the
// composer. It never displays data and holds no decision: every number, record
// and the whole decision (the Decision card) live in the memo pane on the right.
// Renders selectAgentPanel verbatim.
//
// Column mode: a grid column of the split. Drawer mode: an absolute overlay on
// the memo pane's left edge (chat.css). The shell mounts this only while the
// panel is shown, keyed by the deal, so the thread's follow state resets on a
// file switch or a fresh open by design.
//
// Escape from a field inside the drawer: the global handler ignores typing
// targets, so the panel closes the drawer itself. The global handler prevents
// the default whenever it acts, so the two never both act on one press.
// ---------------------------------------------------------------------------

import { useCallback, useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { COPY, selectAgentPanel } from '../../model';
import type { ChatPaneProps } from '../../state/screens';
import { useV2 } from '../../state/store';
import { ChatHead } from './ChatHead';
import { Composer } from './Composer';
import { Button } from '../../kit';
import { PlanPrompt } from './PlanPrompt';
import { Thread } from './Thread';
import './chat.css';

/** Popovers that own their keyboard: Escape there is theirs. */
const POPOVER = '[role="menu"],[role="dialog"],[role="listbox"]';

export function ChatPane({ dealId, layout }: ChatPaneProps) {
  const s = useV2();
  const a = s.actions;
  const headingId = useId();
  // a composer send re-pins the thread and jumps to its foot
  const [sendSeq, setSendSeq] = useState(0);
  const onSent = useCallback(() => setSendSeq((n) => n + 1), []);

  const view = selectAgentPanel(s, dealId);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Escape' || layout !== 'drawer') return;
    if (e.defaultPrevented || e.nativeEvent.isComposing) return;
    const t = e.target;
    if (t instanceof Element && t.closest(POPOVER) !== null) return;
    e.preventDefault();
    a.setChatOpen(false);
  };

  return (
    <aside
      className="chat-pane"
      data-chat-pane=""
      data-layout={layout}
      data-pattern="P-22"
      aria-label={COPY.agentPanel}
      onKeyDown={onKeyDown}
    >
      <ChatHead heading={view.title} headingId={headingId} layout={layout} />
      <Thread dealId={dealId} lines={view.lines} labelledBy={headingId} sendSeq={sendSeq} />
      <div className="chat-foot">
        {view.start ? (
          <div className="chat-plan">
            <div className="chat-plan__actions">
              <Button variant="primary" kbd={view.start.kbd} onClick={() => a.startFile(dealId)} disabled={view.start.disabled}>
                {view.start.label}
              </Button>
            </div>
          </div>
        ) : null}
        {view.plan ? <PlanPrompt plan={view.plan} /> : null}
        <Composer dealId={dealId} composer={view.composer} onSent={onSent} />
      </div>
    </aside>
  );
}
