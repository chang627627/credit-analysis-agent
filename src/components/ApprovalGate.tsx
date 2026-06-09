import type { ApprovalPackage, Recommendation } from '../agent/types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { FlagPill } from './FlagPill';

const REC_LABEL: Record<Recommendation, string> = {
  approve: 'Recommend · APPROVE',
  decline: 'Recommend · DECLINE',
  escalate: 'Recommend · ESCALATE',
};

/**
 * The human-in-the-loop gate. The agent loop is literally suspended (awaiting a
 * Promise) while this is on screen; nothing proceeds until a person clicks.
 */
export function ApprovalGate({
  pkg,
  onApprove,
  onReject,
}: {
  pkg: ApprovalPackage;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <section className="gate">
      <header className="gate__head">
        <span className="gate__badge">human-in-the-loop</span>
        <h3 className="gate__title">Approval required</h3>
        <p className="gate__sub">
          The agent reached a consequential action and paused. It will not sign off on its own.
        </p>
      </header>

      <div className="gate__rec">
        <span className={`rec rec--${pkg.recommendation}`}>{REC_LABEL[pkg.recommendation]}</span>
        <span className="gate__rating">Risk rating · {pkg.riskRating}</span>
      </div>

      <div className="gate__metrics">
        {pkg.keyMetrics.map((m) => (
          <div className="metric" key={m.label}>
            <span className="metric__label">{m.label}</span>
            <span className="metric__value">{m.value}</span>
            <ConfidenceBadge value={m.confidence} />
          </div>
        ))}
      </div>

      {pkg.flags.length > 0 && (
        <div className="gate__flags">
          {pkg.flags.map((f) => (
            <FlagPill key={f.id} flag={f} />
          ))}
        </div>
      )}

      <p className="gate__summary">{pkg.summary}</p>

      <div className="gate__actions">
        <button className="btn btn--reject" onClick={onReject}>
          Reject
        </button>
        <button className="btn btn--approve" onClick={onApprove}>
          Approve &amp; sign memo
        </button>
      </div>
    </section>
  );
}
