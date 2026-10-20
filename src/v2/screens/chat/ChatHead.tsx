// ---------------------------------------------------------------------------
// Agent panel · the head (THREE-PANE.md R2.1). 44px on the shared header line
// (its bottom rule meets the doc bar's at y 92): "Credit Analyst · Project
// Cobalt" and the collapse control. The project is chosen on the Desk (step one
// of the flow), never in this panel. Nothing else: no note stepper, no outline,
// no run number. Hide (column) and close (drawer) are explicit: they write the
// owner's choice (setChatOpen).
// ---------------------------------------------------------------------------

import { ChevronsLeft, X } from 'lucide-react';
import { IconButton } from '../../kit';
import { COPY } from '../../model';
import type { ChatLayout } from '../../state/contracts';
import { useV2 } from '../../state/store';

export interface ChatHeadProps {
  heading: string;
  /** names the thread list (aria-labelledby) */
  headingId: string;
  layout: ChatLayout;
}

export function ChatHead({ heading, headingId, layout }: ChatHeadProps) {
  const a = useV2().actions;
  return (
    <div className="chat-head">
      <h2 id={headingId} className="chat-head__heading t-label">
        {heading}
      </h2>
      {layout === 'column' ? (
        <IconButton icon={ChevronsLeft} label={COPY.hideAgentPanel} onClick={() => a.setChatOpen(false)} />
      ) : (
        <IconButton icon={X} label={COPY.closeAgentPanel} onClick={() => a.setChatOpen(false)} />
      )}
    </div>
  );
}
