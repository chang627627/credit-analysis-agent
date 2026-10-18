// EmptyNote: a quiet status line for empty or not-yet states.
import { StatusGlyph } from './StatusGlyph';
import type { StatusKey } from './types';

export interface EmptyNoteProps {
  children: string;
  state?: StatusKey;
}

export function EmptyNote({ children, state }: EmptyNoteProps) {
  return (
    <div className="k-empty t-small" role="status">
      {state ? <StatusGlyph state={state} /> : null}
      <span>{children}</span>
    </div>
  );
}
