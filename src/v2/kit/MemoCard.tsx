// MemoCard: one memo section as its own paper card on the canvas (P-26). A 1px --line frame,
// --r-md corners, scroll-margin-top 60px (clears the 44px sticky doc bar) and its own inline-size
// container (k-memocard), so tables and the signature record stack by the section's real width.
// The body is a flex column with 24px between the head and each block (16px padding under 560px).
// Live drafting: `enter` rises the card in once (a section that starts while you watch); `reveal`
// plays its parts in order once its step returns (the takeaway, then each table row, one
// --dur-stagger apart; a block can start its rows later by setting --k-reveal-at). Both are off
// for the cards already on the page when a file opens, and both are instant under reduced motion.
import type { ReactNode } from 'react';

export interface MemoCardProps {
  section: string;
  ariaLabel: string;
  children: ReactNode;
  enter?: boolean;
  reveal?: boolean;
}

export function MemoCard({ section, ariaLabel, children, enter = false, reveal = false }: MemoCardProps) {
  return (
    <section
      className="k-memocard"
      data-section={section}
      data-pattern="P-26"
      aria-label={ariaLabel}
      data-enter={enter ? '' : undefined}
      data-reveal={reveal ? '' : undefined}
    >
      <div className="k-memocard__body">{children}</div>
    </section>
  );
}
