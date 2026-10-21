// ---------------------------------------------------------------------------
// Agent panel · one status line (THREE-PANE.md R2.1), shared by the column's
// thread (every line, as list items) and the narrow screens' strip (the latest
// line only, R4.13). Pure: [16px glyph][ONE line of text][trailing link]. The
// link only points at the memo (onGo); the line never shows data.
// ---------------------------------------------------------------------------

import { LinkButton, StatusGlyph } from '../../kit';
import type { FileAt, StatusKey, ThreadLine } from '../../model';

/** Glyph states whose line recedes to ink-3 (the kit's quiet status states). */
const QUIET: ReadonlySet<StatusKey> = new Set<StatusKey>(['pending', 'excluded', 'cancelled']);

export type GoTo = (target: FileAt, anchorId: string | undefined) => void;

function textClass(line: ThreadLine): string {
  const cls = ['chat-line__text', 't-body'];
  if (line.kind === 'answer') cls.push('chat-line__text--answer');
  else if (line.kind === 'answered') cls.push('chat-line__text--answered');
  else if (line.glyph !== null && QUIET.has(line.glyph)) cls.push('chat-line__text--quiet');
  return cls.join(' ');
}

export interface ChatLineProps {
  line: ThreadLine;
  onGo: GoTo;
  /** 'li' in the thread's list; 'div' for the strip's one line */
  as?: 'li' | 'div';
}

export function ChatLine({ line, onGo, as = 'li' }: ChatLineProps) {
  const link = line.link;
  const Tag = as;
  return (
    <Tag className={`chat-line chat-line--${line.kind}${link ? ' chat-line--linked' : ''}`} data-thread-item={line.id}>
      <span className="chat-line__glyph">{line.glyph !== null ? <StatusGlyph state={line.glyph} /> : null}</span>
      <span className={textClass(line)}>{line.text}</span>
      {link ? (
        <span className="chat-line__link">
          <LinkButton role="small" onClick={() => onGo(link.target, link.anchorId)}>
            {link.label}
          </LinkButton>
        </span>
      ) : null}
    </Tag>
  );
}
