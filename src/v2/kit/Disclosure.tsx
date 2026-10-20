// Disclosure: a label-sized link trigger with a rotating chevron; the panel unfolds by
// grid-template-rows 0fr → 1fr over --dur-2 and is inert while closed. The collapsed panel's
// padding lives inside the clipped row, so it collapses with it.
// `lead` (optional) sits on the trigger's own line, before it, and the panel still unfolds under
// the whole line: a memo card's footer is ONE quiet line, "Document Intelligence · 94% · 1.1 s",
// followed by its "Record" trigger (THREE-PANE R2.2).
import { useId } from 'react';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export interface DisclosureProps {
  label: string;
  meta?: string;
  lead?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function Disclosure({ label, meta, lead, open, onToggle, children }: DisclosureProps) {
  const panelId = useId();
  const trigger = (
    <button
      type="button"
      className="k-link k-disclosure__trigger t-label"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={() => onToggle()}
    >
      <ChevronRight size={12} className="k-disclosure__chevron" aria-hidden="true" />
      <span className="k-link__text">{label}</span>
      {meta ? <span className="k-disclosure__meta t-meta">{meta}</span> : null}
    </button>
  );
  const hasLead = lead !== undefined && lead !== null && lead !== false;
  return (
    <div className="k-disclosure" data-open={open ? '' : undefined}>
      {hasLead ? (
        <div className="k-disclosure__line">
          <span className="k-disclosure__lead">{lead}</span>
          {trigger}
        </div>
      ) : (
        trigger
      )}
      <div id={panelId} className="k-disclosure__panel" inert={!open}>
        <div className="k-disclosure__clip">
          <div className="k-disclosure__body">{children}</div>
        </div>
      </div>
    </div>
  );
}
