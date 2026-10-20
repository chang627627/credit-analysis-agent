// ---------------------------------------------------------------------------
// Agent panel · the head (THREE-PANE.md R2.1). 44px on the shared header line
// (its bottom rule meets the doc bar's at y 92): "Credit Analyst", the selected
// project as a switch menu (the first step of the flow is choosing the project),
// and the collapse control. Nothing else: no note stepper, no outline,
// no run number. Hide (column) and close (drawer) are explicit: they write the
// owner's choice (setChatOpen).
// ---------------------------------------------------------------------------

import { ChevronsLeft, X } from 'lucide-react';
import { IconButton, Menu } from '../../kit';
import { COPY } from '../../model';
import type { ChatLayout } from '../../state/contracts';
import { useV2 } from '../../state/store';

export interface ChatHeadProps {
  heading: string;
  /** the selected project with its switch menu (case files); omitted on the Desk picker */
  project?: { label: string; menuLabel: string; options: { dealId: string; label: string; meta: string }[]; current: string };
  /** names the thread list (aria-labelledby) */
  headingId: string;
  layout: ChatLayout;
}

export function ChatHead({ heading, headingId, layout, project }: ChatHeadProps) {
  const a = useV2().actions;
  return (
    <div className="chat-head">
      <h2 id={headingId} className="chat-head__heading t-label">
        {heading}
      </h2>
      {project ? (
        <Menu
          label={project.menuLabel}
          trigger={{ text: project.label, variant: 'ghost' }}
          items={project.options.map((o) => ({
            id: o.dealId,
            label: o.label,
            meta: o.meta,
            checked: o.dealId === project.current,
            onSelect: () => a.navigate({ name: 'file', dealId: o.dealId, at: null }),
          }))}
        />
      ) : null}
      {layout === 'column' ? (
        <IconButton icon={ChevronsLeft} label={COPY.hideAgentPanel} onClick={() => a.setChatOpen(false)} />
      ) : (
        <IconButton icon={X} label={COPY.closeAgentPanel} onClick={() => a.setChatOpen(false)} />
      )}
    </div>
  );
}
