// EvidenceTag: the one evidence class of a memo figure (P-04). Plain text plus optional Cite
// buttons or formula text as children. Never placed inside a button. `srText` (R4.8) is the class
// in full words for assistive tech when the visible text is a short form ("Not in CIM" on screen,
// "Not in the CIM · extraction model" read aloud), so a narrow Source column stays one line.
import type { ReactNode } from 'react';

export interface EvidenceTagProps {
  cls: 'quoted' | 'derived' | 'unquoted' | 'model';
  text: string;
  srText?: string;
  children?: ReactNode;
}

export function EvidenceTag({ cls, text, srText, children }: EvidenceTagProps) {
  return (
    <span
      className={cls === 'unquoted' ? 'k-evidence k-evidence--unquoted t-small' : 'k-evidence t-small'}
      data-cls={cls}
      data-pattern="P-04"
    >
      {srText && srText !== text ? (
        <>
          <span aria-hidden="true">{text}</span>
          <span className="v2-sr">{srText}</span>
        </>
      ) : (
        <span>{text}</span>
      )}
      {children}
    </span>
  );
}
