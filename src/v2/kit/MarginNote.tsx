// MarginNote: a flag as a note in the margin beside the section it concerns (P-03).
// Counted notes are washed in their meaning colour; info and signed-over notes sit on paper.
// `active` (its anchored row is hovered) draws a 2px ink outline.
import { LinkButton } from './LinkButton';
import { StatusGlyph } from './StatusGlyph';
import type { StatusKey } from './types';

export interface MarginNoteAction {
  label: string;
  onClick: () => void;
}

export interface MarginNoteProps {
  id: string;
  tone: 'breach' | 'watch' | 'info' | 'returned' | 'signed-over';
  status: StatusKey;
  heading: string;
  children: string;
  meta?: string;
  actions?: MarginNoteAction[];
  active?: boolean;
  onHover?: (on: boolean) => void;
}

export function MarginNote({ id, tone, status, heading, children, meta, actions, active = false, onHover }: MarginNoteProps) {
  return (
    <aside
      className={`k-note k-note--${tone}${active ? ' is-active' : ''}`}
      aria-label={heading}
      data-note={id}
      data-pattern="P-03"
      onPointerEnter={onHover ? () => onHover(true) : undefined}
      onPointerLeave={onHover ? () => onHover(false) : undefined}
      onFocus={onHover ? () => onHover(true) : undefined}
      onBlur={
        onHover
          ? (e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onHover(false);
            }
          : undefined
      }
    >
      <div className="k-note__head">
        <StatusGlyph state={status} />
        <span className="k-note__heading t-label">{heading}</span>
      </div>
      <p className="k-note__body t-small">{children}</p>
      {meta ? <p className="k-note__meta t-meta">{meta}</p> : null}
      {actions && actions.length > 0 ? (
        <div className="k-note__actions">
          {actions.map((a) => (
            <LinkButton key={a.label} role="label" onClick={a.onClick}>
              {a.label}
            </LinkButton>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
