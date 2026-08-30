import { useEffect, useRef, useState } from 'react';
import { CornerUpLeft } from 'lucide-react';
import type { ApprovalPackage, Recommendation, ToolName } from '../agent/types';
import { LOW_CONFIDENCE_FLOOR } from '../agent/util';
import { ConfidenceBadge } from './ConfidenceBadge';
import { FlagPill } from './FlagPill';

const REC_LABEL: Record<Recommendation, string> = {
  approve: "Agent's decision · APPROVE",
  decline: "Agent's decision · DECLINE",
  escalate: "Agent's decision · ESCALATE",
};

/**
 * The human-in-the-loop gate. The agent loop is literally suspended (awaiting a
 * Promise) while this is on screen; nothing proceeds until a person acts.
 *
 * Three verbs, one note. Approve countersigns the package (note optional);
 * Reject refuses it and Send back re-enters the loop — both REQUIRE a note,
 * because a human decision without a reason is the one hole a regulated audit
 * trail can't have. The note rides the gate resolution into the event stream.
 */
export function ApprovalGate({
  pkg,
  onApprove,
  onReject,
  onRework,
  onTrace,
  leaving = false,
}: {
  pkg: ApprovalPackage;
  onApprove: (note?: string) => void;
  onReject: (note: string) => void;
  onRework: (note: string) => void;
  /** Trace a gate figure back to the tool observation that produced it. */
  onTrace?: (source: ToolName) => void;
  /** Send-back choreography: the gate recedes upstream before the loop resumes. */
  leaving?: boolean;
}) {
  const [note, setNote] = useState('');
  const [needNote, setNeedNote] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const noteValRef = useRef(note);
  noteValRef.current = note;
  // once the send-back is committed (gate receding), NO other verb may fire —
  // an A keypress in that window would silently convert the rework into an
  // approval and record the rework note as the countersign note
  const leavingRef = useRef(leaving);
  leavingRef.current = leaving;

  const demandNote = () => {
    setNeedNote(true);
    noteRef.current?.focus();
  };
  const tryReject = () => {
    const n = noteValRef.current.trim();
    if (!n) return demandNote();
    onReject(n);
  };
  const tryRework = () => {
    const n = noteValRef.current.trim();
    if (!n) return demandNote();
    onRework(n);
  };

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

  // A/R shortcuts live WITH the gate (they only exist while it's mounted).
  // Guards: no modifiers (⌘A stays select-all, ⌘R stays reload) and never
  // while typing. R with an empty note doesn't reject blind — it asks for the
  // reason, same as the button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (leavingRef.current) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        onApprove(noteValRef.current.trim() || undefined);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        tryReject();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onApprove, onReject]);

  return (
    <section
      className={`gate${leaving ? ' gate--leaving' : ''}`}
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-label="Approval required — human decision needed"
    >
      <header className="gate__head">
        <span className="gate__badge">
          human-in-the-loop{pkg.revision > 1 ? ` · revision ${pkg.revision}` : ''}
        </span>
        <h3 className="gate__title">Approval required</h3>
        <p className="gate__sub">
          The agent reached a consequential action and paused. It will not sign off on its own.
        </p>
      </header>

      <div className="gate__rec">
        <span className="gate__receyebrow">
          {pkg.restructure ? `On the proposed revised structure · rev ${pkg.revision}` : 'On the filed figures · final'}
        </span>
        <div className="gate__recrow">
          <span className={`rec rec--${pkg.recommendation}`}>{REC_LABEL[pkg.recommendation]}</span>
          <span className="gate__rating">Risk rating · {pkg.riskRating}</span>
        </div>
        {pkg.restructure && (
          <p className="gate__structure">Structure change · {pkg.restructure.summary}</p>
        )}
      </div>

      <div className="gate__metrics">
        {pkg.keyMetrics.map((m) => {
          const inner = (
            <>
              <span className="metric__label">{m.label}</span>
              <span className="metric__value">{m.value}</span>
              <ConfidenceBadge value={m.confidence} />
            </>
          );
          // every figure the human signs is one click from the observation
          // that produced it — same provenance grammar as the document cites
          return onTrace && m.source ? (
            <button
              className="metric metric--trace"
              key={m.label}
              onClick={() => onTrace(m.source!)}
              title="Trace to the tool observation that produced this figure"
              aria-label={`${m.label} ${m.value} — trace to source observation`}
            >
              {inner}
            </button>
          ) : (
            <div className="metric" key={m.label}>
              {inner}
            </div>
          );
        })}
      </div>
      <p className="gate__confnote">
        Confidence = simulated extraction certainty per observation · ≥90% high · 75–90% medium ·
        &lt;{Math.round(LOW_CONFIDENCE_FLOOR * 100)}% is flagged for human verification.
      </p>

      {/* revision diff: what the record GAINED since rev 1 — the send-back
          thread rendered like a code diff, so a returning gate never looks
          identical to the one that was sent back */}
      {pkg.reviewerNotes.length > 0 && (
        <div className="gate__diff">
          <span className="gate__diffeyebrow">Changed since rev 1 · reviewer thread</span>
          {pkg.reviewerNotes.map((n, i) => (
            <div className="gate__diffrow" key={i}>
              <span className="gate__diffgut" aria-hidden="true">+</span>
              <span className="gate__difftext">
                <em>Send-back · rev {i + 1}</em> — “{n}”
              </span>
            </div>
          ))}
        </div>
      )}

      {pkg.flags.length > 0 && (
        <div className="gate__flags">
          {pkg.flags.map((f) => (
            <FlagPill key={f.id} flag={f} />
          ))}
        </div>
      )}

      <p className="gate__summary">{pkg.summary}</p>

      <label className="gate__notewrap">
        <span className="gate__notelabel">
          Reviewer note · goes on the record
          <em> — optional to approve, required to reject or send back</em>
        </span>
        <textarea
          ref={noteRef}
          className={`gate__note${needNote ? ' gate__note--need' : ''}`}
          rows={2}
          value={note}
          placeholder="e.g. EBITDA add-backs look aggressive — re-check the adjustments before I sign."
          onChange={(e) => {
            setNote(e.target.value);
            if (needNote && e.target.value.trim()) setNeedNote(false);
          }}
        />
        {needNote && (
          <span className="gate__notehint" role="alert">
            A reason is required for the record — add a note, then reject or send back.
          </span>
        )}
      </label>

      <div className="gate__actions">
        <button className="btn btn--reject" onClick={tryReject} disabled={leaving}>
          Reject <span className="kbd">R</span>
        </button>
        <button className="btn btn--rework" onClick={tryRework} disabled={leaving}>
          <CornerUpLeft size={13} strokeWidth={1.75} aria-hidden="true" /> Send back for rework
        </button>
        <button
          className="btn btn--approve"
          onClick={() => onApprove(note.trim() || undefined)}
          disabled={leaving}
        >
          Countersign &amp; approve <span className="kbd kbd--on-accent">A</span>
        </button>
      </div>
    </section>
  );
}
