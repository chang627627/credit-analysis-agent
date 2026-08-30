import { useMemo } from 'react';
import { ArrowRight, CheckCircle2, Download, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import type { Amendment, ApprovalPackage } from '../agent/types';

/**
 * The second signature drawing itself onto the memo — the product's name as a
 * moment. An abstract flourish (deliberately not a legible name); the text
 * lines beneath remain the accessible record.
 */
function SignatureStroke() {
  return (
    <svg className="sig__stroke" viewBox="0 0 132 34" aria-hidden="true" focusable="false">
      <path
        d="M6 24 C 16 4, 24 30, 34 15 S 50 5, 58 20 S 74 30, 88 12 c 6 -8, 10 -1, 14 4 s 14 4, 24 -4"
        pathLength={1}
      />
    </svg>
  );
}

export function OutcomeBanner({
  approved,
  pkg,
  note,
  amendments,
  auto = false,
  onReset,
  onExport,
  onOpenQueue,
}: {
  approved: boolean;
  pkg: ApprovalPackage;
  /** The reviewer's note recorded with the decision (null if none was given). */
  note: string | null;
  /** Terms the reviewer amended before signing ("countersigned as amended"). */
  amendments?: Amendment[] | null;
  /** The autonomy policy resolved this approval (clean-approval auto-countersign). */
  auto?: boolean;
  onReset: () => void;
  onExport: () => void;
  /** Present when a countersigned ESCALATE was routed to the escalation queue. */
  onOpenQueue?: () => void;
}) {
  const routed = approved && pkg.recommendation === 'escalate';
  const amendedTitle = amendments && amendments.length > 0;
  // decision time, fixed at mount — the moment the human acted
  const signedAt = useMemo(
    () => new Date().toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', year: 'numeric' }),
    [],
  );
  return (
    <section className={`outcome outcome--${approved ? 'approved' : 'rejected'}`}>
      <div className="outcome__row">
        <span className="outcome__icon">
          {approved ? <CheckCircle2 size={20} strokeWidth={1.75} /> : <XCircle size={20} strokeWidth={1.75} />}
        </span>
        <div className="outcome__text">
          <strong>
            {auto
              ? 'Auto-countersigned under policy'
              : approved
                ? amendedTitle
                  ? 'Approved — countersigned as amended'
                  : 'Approved by human reviewer'
                : 'Rejected by human reviewer'}
            {auto && (
              <span className="outcome__autobadge">
                <ShieldCheck size={11} strokeWidth={2} aria-hidden="true" /> AUTO · POLICY
              </span>
            )}
          </strong>
          <span>
            {pkg.borrower} · {pkg.facility} · memo {pkg.memoId}
            {pkg.revision > 1 ? ` · rev ${pkg.revision}` : ''} committed to the audit trail
          </span>
          {auto && (
            <span className="outcome__structure">
              Why this auto-approved · recommendation APPROVE ✓ · zero flags ✓ · confidence ≥90% ✓
            </span>
          )}
          {amendments?.map((a) => (
            <span className="outcome__structure" key={a.label}>
              Amended · {a.label} {a.from} → {a.to}
            </span>
          ))}
          {pkg.restructure && (
            <span className="outcome__structure">Revised structure · {pkg.restructure.summary}</span>
          )}
          {note && <span className="outcome__note">Reviewer note · “{note}”</span>}
          {routed && (
            <span className="outcome__routed">
              ESCALATE countersigned → routed to the portfolio escalation queue for senior review
            </span>
          )}
        </div>
      </div>

      {/* the signature block: agent pre-signed, the human's line completes now */}
      <div className="sigblock">
        <div className="sig">
          <span className="sig__pad">
            <span className="sig__ink">/s/ Countersign · memo {pkg.memoId}</span>
          </span>
          <span className="sig__label">Prepared by · Countersign credit analyst</span>
        </div>
        <div className="sig">
          <span className="sig__pad">
            {auto ? (
              <span className="sig__ink">/auto/ clean-approval policy</span>
            ) : approved ? (
              <SignatureStroke />
            ) : (
              <span className="sig__declined">Declined</span>
            )}
          </span>
          <span className="sig__label">
            {auto
              ? `Auto-countersigned under policy · supervised · ${signedAt}`
              : `${approved ? (amendedTitle ? 'Countersigned as amended by' : 'Countersigned by') : 'Refused by'} · Human reviewer · ${signedAt}`}
          </span>
        </div>
      </div>

      {/* Suggested next steps — the follow-up-chips pattern from ChatGPT / Perplexity. */}
      <div className="suggest">
        <span className="suggest__label">Next</span>
        {routed && onOpenQueue && (
          <button className="chip" onClick={onOpenQueue}>
            <ArrowRight size={12} strokeWidth={1.75} aria-hidden="true" /> View escalation queue
          </button>
        )}
        <button className="chip" onClick={onExport}>
          <Download size={12} strokeWidth={1.75} aria-hidden="true" /> Export audit trail
        </button>
        <button className="chip" onClick={onReset}>
          <RotateCcw size={12} strokeWidth={1.75} aria-hidden="true" /> Run another deal
        </button>
      </div>
    </section>
  );
}
