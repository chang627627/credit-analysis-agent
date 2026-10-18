// SectionHead: a memo section heading row, grid [24px ordinal][1fr heading][16px status glyph].
// Carries data-anchor and the same flash / highlight cues as Table rows.
import { StatusGlyph } from './StatusGlyph';
import { useFlash } from './Table';
import type { StatusKey } from './types';

export interface SectionHeadProps {
  ordinal: string;
  heading: string;
  suffix?: string | null;
  status: StatusKey;
  statusLabel: string;
  anchorId: string;
  flashKey?: number;
  highlighted?: boolean;
}

export function SectionHead({ ordinal, heading, suffix, status, statusLabel, anchorId, flashKey, highlighted = false }: SectionHeadProps) {
  const flash = useFlash(flashKey);
  const cls = ['k-sechead'];
  if (flash.on) cls.push('is-flash');
  if (highlighted) cls.push('is-highlighted');
  return (
    <div ref={flash.ref} className={cls.join(' ')} data-anchor={anchorId} onAnimationEnd={flash.onAnimationEnd}>
      <span className="k-sechead__ordinal t-figure">{ordinal}</span>
      <h2 className="k-sechead__heading t-heading">
        {heading}
        {suffix ? <span className="k-sechead__suffix t-small"> {suffix}</span> : null}
      </h2>
      <StatusGlyph state={status} srLabel={statusLabel} />
    </div>
  );
}
