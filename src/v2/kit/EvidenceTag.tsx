// EvidenceTag: the one evidence class of a memo figure (P-04). Plain text plus optional Cite
// buttons or formula text as children. Never placed inside a button.
import type { ReactNode } from 'react';

export interface EvidenceTagProps {
  cls: 'quoted' | 'derived' | 'unquoted' | 'model';
  text: string;
  children?: ReactNode;
}

export function EvidenceTag({ cls, text, children }: EvidenceTagProps) {
  return (
    <span
      className={cls === 'unquoted' ? 'k-evidence k-evidence--unquoted t-small' : 'k-evidence t-small'}
      data-cls={cls}
      data-pattern="P-04"
    >
      <span>{text}</span>
      {children}
    </span>
  );
}
