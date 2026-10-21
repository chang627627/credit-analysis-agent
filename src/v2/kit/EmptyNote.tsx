// EmptyNote: a quiet status line for empty or not-yet states.
// `action` (R4.7, P-39) is the way out of an empty state, one secondary small button after the text
// ("Restore sample files" on an empty Desk, "Open the Desk" on an empty Ledger). The text keeps the
// status role; the button sits beside it and wraps under it when the line is narrow.
import { Button } from './Button';
import { StatusGlyph } from './StatusGlyph';
import type { StatusKey } from './types';

export interface EmptyNoteAction {
  label: string;
  onClick: () => void;
  ariaLabel?: string;
}

export interface EmptyNoteProps {
  children: string;
  state?: StatusKey;
  action?: EmptyNoteAction;
}

export function EmptyNote({ children, state, action }: EmptyNoteProps) {
  if (!action) {
    return (
      <div className="k-empty t-small" role="status">
        {state ? <StatusGlyph state={state} /> : null}
        <span>{children}</span>
      </div>
    );
  }
  return (
    <div className="k-empty k-empty--action t-small" data-pattern="P-39">
      <span className="k-empty__text" role="status">
        {state ? <StatusGlyph state={state} /> : null}
        <span>{children}</span>
      </span>
      <Button variant="secondary" size="sm" ariaLabel={action.ariaLabel} onClick={action.onClick}>
        {action.label}
      </Button>
    </div>
  );
}
