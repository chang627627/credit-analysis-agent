// MarginNote: a flag as a boxed note. Counted notes are washed in their meaning colour; info and
// signed-over notes sit on paper. Under THREE-PANE R2 no app screen renders it: a flag is marked on
// its memo row or as one line at the foot of its card (P-03), and the agent panel only points at
// it. It stays in the kit (shown on the kit page) until the owner retires it.
// `active` (its anchored row is hovered) draws a 2px ink outline.
// The note is a programmatic focus target (tabIndex -1, outside the tab order): the J / K
// stepper and "Show note" hand focus to it, and its body is its description, so a screen
// reader speaks the note's text on focus, not only its heading.
import { useId } from 'react';
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
  // unique per rendered note (the kit page shows one note in several states at once)
  const bodyId = useId();
  return (
    <aside
      className={`k-note k-note--${tone}${active ? ' is-active' : ''}`}
      aria-label={heading}
      aria-describedby={bodyId}
      tabIndex={-1}
      data-note={id}
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
      <p id={bodyId} className="k-note__body t-small">{children}</p>
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
