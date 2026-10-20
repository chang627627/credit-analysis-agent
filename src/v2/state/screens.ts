// Screen props published by the shell (spec §9.1, THREE-PANE.md §7.4). Screen
// owners implement against these; the shell never writes inside src/v2/screens.
import type { ReactNode } from 'react';
import type { FileAt } from './route';
import type { ChatLayout } from './contracts';

/**
 * The memo pane. slots.signature = <DecisionCard dealId/>: the memo Decision card (THREE-PANE R2.2),
 * the ONE place to decide, rendered as its own card right after step 5 Recommendation and before
 * the stress test (data-section="signature"). It holds the whole decision at the gate and the
 * sealed record after it.
 */
export interface FileScreenProps {
  dealId: string;
  at: FileAt | null;
  navSeq: number;
  slots: { exhibits: ReactNode; stress: ReactNode; signature: ReactNode };
}
/** The agent panel (THREE-PANE R2.1): command and control only. It holds no decision. */
export interface ChatPaneProps {
  dealId: string;
  layout: ChatLayout;
}
/** DecisionCard (the memo Decision card), StressTest, Exhibits. */
export interface DecisionBlockProps {
  dealId: string;
}
export interface LedgerScreenProps {
  fileFilter: string | null;
}
// DeskScreen and BookScreen take no props.
