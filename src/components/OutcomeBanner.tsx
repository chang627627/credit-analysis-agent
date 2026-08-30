import { CheckCircle2, XCircle } from 'lucide-react';
import type { ApprovalPackage } from '../agent/types';

export function OutcomeBanner({
  approved,
  pkg,
  note,
  onReset,
  onExport,
  onOpenQueue,
}: {
  approved: boolean;
  pkg: ApprovalPackage;
  /** The reviewer's note recorded with the decision (null if none was given). */
  note: string | null;
  onReset: () => void;
  onExport: () => void;
  /** Present when a countersigned ESCALATE was routed to the escalation queue. */
  onOpenQueue?: () => void;
}) {
  const routed = approved && pkg.recommendation === 'escalate';
  return (
    <section className={`outcome outcome--${approved ? 'approved' : 'rejected'}`}>
      <div className="outcome__row">
        <span className="outcome__icon">
          {approved ? <CheckCircle2 size={20} strokeWidth={1.75} /> : <XCircle size={20} strokeWidth={1.75} />}
        </span>
        <div className="outcome__text">
          <strong>{approved ? 'Approved by human reviewer' : 'Rejected by human reviewer'}</strong>
          <span>
            {pkg.borrower} · {pkg.facility} · memo {pkg.memoId}
            {pkg.revision > 1 ? ` · rev ${pkg.revision}` : ''} committed to the audit trail
          </span>
          {note && <span className="outcome__note">Reviewer note · “{note}”</span>}
          {routed && (
            <span className="outcome__routed">
              ESCALATE countersigned → routed to the portfolio escalation queue for senior review
            </span>
          )}
        </div>
      </div>

      {/* Suggested next steps — the follow-up-chips pattern from ChatGPT / Perplexity. */}
      <div className="suggest">
        <span className="suggest__label">Next</span>
        {routed && onOpenQueue && (
          <button className="chip" onClick={onOpenQueue}>
            → View escalation queue
          </button>
        )}
        <button className="chip" onClick={onExport}>
          ↓ Export audit trail
        </button>
        <button className="chip" onClick={onReset}>
          ↻ Run another deal
        </button>
      </div>
    </section>
  );
}
