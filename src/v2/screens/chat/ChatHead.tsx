// ---------------------------------------------------------------------------
// Agent panel · the head (THREE-PANE.md R2.1). 44px on the shared header line
// (its bottom rule meets the doc bar's at y 92): "Credit Analyst · Project
// Cobalt" and nothing else. No collapse or close control: after the Desk a case
// file is always three panes (owner rule). The project is chosen on the Desk.
// ---------------------------------------------------------------------------

import type { ChatLayout } from '../../state/contracts';

export interface ChatHeadProps {
  heading: string;
  /** names the thread list (aria-labelledby) */
  headingId: string;
  layout: ChatLayout;
}

export function ChatHead({ heading, headingId }: ChatHeadProps) {
  return (
    <div className="chat-head">
      <h2 id={headingId} className="chat-head__heading t-label">
        {heading}
      </h2>
    </div>
  );
}
