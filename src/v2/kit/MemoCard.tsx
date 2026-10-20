// MemoCard: one memo section as its own paper card on the canvas (P-26). A 1px --line frame,
// --r-md corners, scroll-margin-top 60px (clears the 44px sticky doc bar) and its own inline-size
// container (k-memocard), so tables and the signature record stack by the section's real width.
// The body is a flex column with 24px between the head and each block (16px padding under 560px).
import type { ReactNode } from 'react';

export interface MemoCardProps {
  section: string;
  ariaLabel: string;
  children: ReactNode;
}

export function MemoCard({ section, ariaLabel, children }: MemoCardProps) {
  return (
    <section className="k-memocard" data-section={section} data-pattern="P-26" aria-label={ariaLabel}>
      <div className="k-memocard__body">{children}</div>
    </section>
  );
}
