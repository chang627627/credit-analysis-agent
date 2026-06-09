import type { ApprovalPackage } from '../agent/types';

export function OutcomeBanner({
  approved,
  pkg,
  onReset,
  onExport,
}: {
  approved: boolean;
  pkg: ApprovalPackage;
  onReset: () => void;
  onExport: () => void;
}) {
  return (
    <section className={`outcome outcome--${approved ? 'approved' : 'rejected'}`}>
      <div className="outcome__row">
        <span className="outcome__icon">{approved ? '✓' : '✕'}</span>
        <div className="outcome__text">
          <strong>{approved ? 'Approved by human reviewer' : 'Rejected by human reviewer'}</strong>
          <span>
            {pkg.borrower} · {pkg.facility} · memo {pkg.memoId} committed to the audit trail
          </span>
        </div>
      </div>

      {/* Suggested next steps — the follow-up-chips pattern from ChatGPT / Perplexity. */}
      <div className="suggest">
        <span className="suggest__label">Next</span>
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
