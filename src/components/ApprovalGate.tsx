import { useEffect, useRef } from 'react';
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
  // The agent just suspended on a consequential decision — bring the reviewer's
  // viewport AND keyboard focus to the gate so gate → A/R is a two-second flow.
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ref.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    // don't steal focus if the user is mid-sentence in the composer
    const tag = document.activeElement?.tagName;
    if (tag !== 'TEXTAREA' && tag !== 'INPUT') ref.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      className="gate"
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-label="Approval required — human decision needed"
    >
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
          Reject <span className="kbd">R</span>
        </button>
        <button className="btn btn--approve" onClick={onApprove}>
          Countersign &amp; approve <span className="kbd kbd--on-accent">A</span>
        </button>
      </div>
    </section>
  );
}
