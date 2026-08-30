// ---------------------------------------------------------------------------
// PlanReview — the INTENT gate. Before the agent executes anything, its plan
// renders as an approvable checklist: optional steps can be toggled off, the
// approved composition is stamped into the audit trail, and a cancellable
// auto-start countdown keeps unattended demos flowing. Consent to intent up
// front; countersign the outcome at the end — the two-gate pattern.
//
// CONTROLLED by App: the enabled-set and the hold live upstream, so switching
// views and returning neither re-checks excluded steps nor re-arms a held
// countdown (adversarial-review finding). A countdown expiry approves with
// auto:true so the audit trail never records a timer as a human decision.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { Lock, Play, X } from 'lucide-react';
import type { PlanStep } from '../agent/types';

export function PlanReview({
  plan,
  dealName,
  speed,
  enabledIds,
  held,
  onToggle,
  onHold,
  onApprove,
  onCancel,
}: {
  plan: PlanStep[];
  dealName: string;
  /** demo speed — the auto-start countdown shortens with it (floor 3s) */
  speed: number;
  /** which step ids are currently included (owned by App) */
  enabledIds: string[];
  /** the reviewer held the auto-start (owned by App; survives remounts) */
  held: boolean;
  onToggle: (id: string) => void;
  onHold: () => void;
  onApprove: (enabledStepIds: string[], opts?: { auto?: boolean }) => void;
  onCancel: () => void;
}) {
  const totalSeconds = Math.max(3, Math.round(7 / speed));
  const [secondsLeft, setSecondsLeft] = useState<number | null>(held ? null : totalSeconds);
  const enabledRef = useRef(enabledIds);
  enabledRef.current = enabledIds;
  const onApproveRef = useRef(onApprove);
  onApproveRef.current = onApprove;

  // the reviewer held it (here or before a view switch) — never re-arm
  useEffect(() => {
    if (held) setSecondsLeft(null);
  }, [held]);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      // timer-driven start: recorded as unattended, NOT as a human decision
      onApproveRef.current([...enabledRef.current], { auto: true });
      return;
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [secondsLeft]);

  // bring keyboard focus to the intent gate, like the approval gate does
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const tag = document.activeElement?.tagName;
    if (tag !== 'TEXTAREA' && tag !== 'INPUT') ref.current?.focus({ preventScroll: true });
  }, []);

  const holdForReview = () => {
    setSecondsLeft(null);
    onHold();
  };

  return (
    <section
      className="planreview"
      ref={ref}
      tabIndex={-1}
      aria-label="Plan review — approve the agent's intent"
    >
      <span className="gate__badge">intent · plan review</span>
      <h2 className="planreview__title">Approve the plan</h2>
      <p className="planreview__sub">
        The agent proposes this plan for <strong>{dealName}</strong>. Nothing runs until you approve it —
        optional steps can be excluded, and the approved composition goes on the audit trail.
      </p>
      <span className="sr-only" role="status">
        {held ? 'Auto-start held for review.' : 'The plan auto-starts shortly unless held for review.'}
      </span>

      <ol className="planreview__list">
        {plan.map((p, i) => {
          const on = enabledIds.includes(p.id);
          return (
            <li key={p.id} className={`planreview__item${on ? '' : ' planreview__item--off'}`}>
              <label className="planreview__row">
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!p.optional}
                  onChange={() => {
                    holdForReview();
                    onToggle(p.id);
                  }}
                  aria-label={`${p.title}${p.optional ? '' : ' (required)'}`}
                />
                <span className="plan__num">{i + 1}</span>
                <span className="planreview__label">{p.title}</span>
                {p.optional ? (
                  <span className="planreview__tag">optional</span>
                ) : (
                  <span className="planreview__tag planreview__tag--req">
                    <Lock size={10} strokeWidth={2} aria-hidden="true" /> required
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ol>

      <div className="planreview__actions">
        <button className="btn" onClick={onCancel}>
          <X size={13} strokeWidth={1.75} aria-hidden="true" /> Cancel
        </button>
        {secondsLeft !== null ? (
          <button className="linkbtn planreview__hold" onClick={holdForReview}>
            auto-starts in {secondsLeft}s — hold to review
          </button>
        ) : (
          <span className="planreview__held">auto-start held</span>
        )}
        <button className="btn btn--primary" onClick={() => onApprove([...enabledIds])}>
          <Play size={13} strokeWidth={1.75} aria-hidden="true" /> Approve plan &amp; run
        </button>
      </div>
    </section>
  );
}
