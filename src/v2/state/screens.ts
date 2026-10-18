// Screen props published by the shell (spec §9.1). Screen owners implement
// against these; the shell never writes inside src/v2/screens.
import type { ReactNode } from 'react';
import type { FileAt } from './route';

export interface FileScreenProps {
  dealId: string;
  at: FileAt | null;
  navSeq: number;
  slots: { exhibits: ReactNode; stress: ReactNode; signature: ReactNode };
}
export interface DecisionBlockProps {
  dealId: string;
}
export interface LedgerScreenProps {
  fileFilter: string | null;
}
// DeskScreen and BookScreen take no props.
