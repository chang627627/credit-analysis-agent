// Disclosure: a label-sized link trigger with a rotating chevron; the panel unfolds by
// grid-template-rows 0fr → 1fr over --dur-2 and is inert while closed. The collapsed panel's
// padding lives inside the clipped row, so it collapses with it.
import { useId } from 'react';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export interface DisclosureProps {
  label: string;
  meta?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function Disclosure({ label, meta, open, onToggle, children }: DisclosureProps) {
  const panelId = useId();
  return (
    <div className="k-disclosure">
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
      <div id={panelId} className="k-disclosure__panel" inert={!open}>
        <div className="k-disclosure__clip">
          <div className="k-disclosure__body">{children}</div>
        </div>
      </div>
    </div>
  );
}
