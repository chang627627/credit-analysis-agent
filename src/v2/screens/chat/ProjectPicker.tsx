// ---------------------------------------------------------------------------
// Agent panel on the Desk: the first step of the flow, choosing the project.
// Command and control only: one line of prompt, one button per project with its
// stage under it, and a pointer to the Desk drop zone for new CIMs. Picking a
// project opens its case file; the memo then fills the right pane.
// ---------------------------------------------------------------------------

import { useId } from 'react';
import { Button } from '../../kit';
import { selectProjectPicker } from '../../model';
import type { ChatLayout } from '../../state/contracts';
import { useV2 } from '../../state/store';
import { ChatHead } from './ChatHead';
import './chat.css';

export function ProjectPicker({ layout }: { layout: ChatLayout }) {
  const s = useV2();
  const a = s.actions;
  const v = selectProjectPicker(s);
  const headingId = useId();
  return (
    <aside className="chat-pane" data-chat-pane="" data-layout={layout} aria-labelledby={headingId}>
      <ChatHead heading={v.title} headingId={headingId} layout={layout} />
      <div className="chat-pick">
        <p className="chat-pick__prompt t-body">{v.prompt}</p>
        <ul className="chat-pick__list">
          {v.projects.map((p) => (
            <li key={p.dealId} className="chat-pick__row">
              <Button variant="secondary" block onClick={() => a.navigate({ name: 'file', dealId: p.dealId, at: null })}>
                {p.label}
              </Button>
              <span className="chat-pick__meta t-meta">{p.meta}</span>
            </li>
          ))}
        </ul>
        <p className="chat-pick__hint t-meta">{v.uploadHint}</p>
      </div>
    </aside>
  );
}
