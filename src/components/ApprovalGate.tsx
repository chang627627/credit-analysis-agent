import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerUpLeft, PenLine, ShieldCheck } from 'lucide-react';
import type { Amendment, ApprovalPackage, Recommendation, ToolName } from '../agent/types';
import type { Deal } from '../agent/mockData';
import { amendedOutcome } from '../agent/whatif';
import { LOW_CONFIDENCE_FLOOR } from '../agent/util';
import { ConfidenceBadge } from './ConfidenceBadge';
import { FlagPill } from './FlagPill';

/** Pull the numeric threshold of the first covenant whose name matches. */
function thresholdOf(deal: Deal | undefined, match: string): { base: number; text: string } | null {
  const c = deal?.covenants.find((x) => x.name.toLowerCase().includes(match));
  if (!c) return null;
  const m = c.threshold.match(/[\d.]+/);
  return m ? { base: parseFloat(m[0]), text: c.threshold } : null;
}

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
  deal,
  onApprove,
  onReject,
  onRework,
  onTrace,
  leaving = false,
  autoEligible = false,
  onHold,
  draftRef,
}: {
  pkg: ApprovalPackage;
  /** The deal behind the package — powers the amend-terms live re-decide. */
  deal?: Deal;
  onApprove: (note?: string, opts?: { amendments?: Amendment[]; auto?: boolean }) => void;
  onReject: (note: string) => void;
  onRework: (note: string) => void;
  /** Trace a gate figure back to the tool observation that produced it. */
  onTrace?: (source: ToolName) => void;
  /** Send-back choreography: the gate recedes upstream before the loop resumes. */
  leaving?: boolean;
  /** Autonomy policy says this package qualifies for auto-countersign. */
  autoEligible?: boolean;
  /** Report a hold upstream so it survives view-switch remounts (App owns it). */
  onHold?: () => void;
  /** App-owned mirror of the current note+amendments, so the command palette's
      approve signs what the gate is actually showing. */
  draftRef?: React.MutableRefObject<{ note?: string; amendments: Amendment[] }>;
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

  // --- edit-before-approve: "countersign as amended" ------------------------
  // The reviewer can amend the two decision-relevant terms (leverage ceiling,
  // liquidity floor); the SAME decide rule re-runs live on the filed actuals.
  // Not offered on a revised-structure gate (its terms are the proposal).
  const levBase = useMemo(() => thresholdOf(deal, 'leverage'), [deal]);
  const liqBase = useMemo(() => thresholdOf(deal, 'liquid'), [deal]);
  const canAmend = !pkg.restructure && !!deal && (levBase !== null || liqBase !== null);
  const [amending, setAmending] = useState(false);
  const [levMax, setLevMax] = useState<number | null>(null);
  const [liqMin, setLiqMin] = useState<number | null>(null);
  const lev = levMax ?? levBase?.base ?? 0;
  const liq = liqMin ?? liqBase?.base ?? 0;
  const amendDirty = (levBase !== null && lev !== levBase.base) || (liqBase !== null && liq !== liqBase.base);
  const amended = useMemo(
    () =>
      deal && amendDirty
        ? amendedOutcome(deal, {
            leverageMax: levBase !== null && lev !== levBase.base ? lev : undefined,
            liquidityMin: liqBase !== null && liq !== liqBase.base ? liq : undefined,
          })
        : null,
    [deal, amendDirty, lev, liq, levBase, liqBase],
  );
  const amendments: Amendment[] = useMemo(() => {
    const list: Amendment[] = [];
    if (levBase !== null && lev !== levBase.base)
      list.push({ label: 'Max Total Leverage covenant', from: `≤ ${levBase.base.toFixed(2)}x`, to: `≤ ${lev.toFixed(2)}x` });
    if (liqBase !== null && liq !== liqBase.base)
      list.push({ label: 'Min Liquidity covenant', from: `≥ $${liqBase.base.toFixed(1)}M`, to: `≥ $${liq.toFixed(1)}M` });
    return list;
  }, [lev, liq, levBase, liqBase]);
  const amendRef = useRef(amendments);
  amendRef.current = amendments;

  // mirror the live draft upstream so the palette signs what the gate shows
  useEffect(() => {
    if (draftRef) draftRef.current = { note: note.trim() || undefined, amendments };
  }, [note, amendments, draftRef]);

  // --- autonomy policy: auto-countersign clean approvals --------------------
  // Visible cancellable countdown; ANY reviewer engagement holds it (typing,
  // amending, reject/rework attempts). The hold is reported upstream so a
  // view-switch remount can't re-arm it, and the countdown tracks the LIVE
  // policy — flipping the header control to "gate all" disarms it instantly.
  const [autoLeft, setAutoLeft] = useState<number | null>(autoEligible ? 5 : null);
  useEffect(() => {
    if (!autoEligible) setAutoLeft(null);
  }, [autoEligible]);
  useEffect(() => {
    if (autoLeft === null) return;
    if (leavingRef.current) return;
    if (autoLeft <= 0) {
      onApprove('Auto-countersigned · clean-approval policy (recommendation APPROVE, zero flags, confidence ≥90%)', {
        auto: true,
      });
      return;
    }
    const t = window.setTimeout(() => setAutoLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLeft]);
  const holdAuto = () => {
    setAutoLeft(null);
    onHold?.();
  };

  const demandNote = () => {
    holdAuto(); // a refusal attempt must NEVER let the countdown auto-approve
    setNeedNote(true);
    noteRef.current?.focus();
  };
  const tryReject = () => {
    holdAuto();
    const n = noteValRef.current.trim();
    if (!n) return demandNote();
    onReject(n);
  };
  const tryRework = () => {
    holdAuto();
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
        onApprove(noteValRef.current.trim() || undefined, { amendments: amendRef.current });
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

      {/* autonomy policy: a clean approval may auto-countersign — visibly,
          with the policy trace shown and a one-click hold */}
      {autoLeft !== null && (
        <div className="gate__auto" role="status">
          <span className="gate__autoicon">
            <ShieldCheck size={14} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="gate__autotext">
            <strong>Auto-countersign in {autoLeft}s</strong> · clean-approval policy — recommendation APPROVE ✓
            · zero flags ✓ · confidence ≥90% ✓ (breaches always hard-gate)
          </span>
          <button className="btn gate__autohold" onClick={holdAuto}>
            Review manually
          </button>
        </div>
      )}

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

      {/* edit-before-approve: amend the decision-relevant terms; the SAME
          decide rule re-runs live and the approval records the amendments */}
      {canAmend && (
        <div className="gate__amend">
          <button
            className="linkbtn gate__amendtoggle"
            onClick={() => {
              holdAuto();
              setAmending((v) => {
                // closing the editor DISCARDS the overrides — hidden amendments
                // must never ride along silently on a later approve
                if (v) {
                  setLevMax(null);
                  setLiqMin(null);
                }
                return !v;
              });
            }}
            aria-expanded={amending}
          >
            <PenLine size={11} strokeWidth={1.75} aria-hidden="true" />{' '}
            {amending ? 'Hide & discard amendments' : 'Amend terms before signing'}
          </button>
          {amending && (
            <div className="gate__amendbody">
              {levBase !== null && (
                <label className="gate__amendrow">
                  <span className="gate__amendlabel">Max Total Leverage covenant</span>
                  <span className="gate__amendctl">
                    ≤{' '}
                    <input
                      type="number"
                      step={0.05}
                      min={1}
                      max={8}
                      value={lev}
                      onChange={(e) => {
                        holdAuto();
                        const v = parseFloat(e.target.value);
                        setLevMax(Number.isFinite(v) ? v : null); // cleared → terms as filed
                      }}
                    />
                    x <em>(filed {levBase.text})</em>
                  </span>
                </label>
              )}
              {liqBase !== null && (
                <label className="gate__amendrow">
                  <span className="gate__amendlabel">Min Liquidity covenant</span>
                  <span className="gate__amendctl">
                    ≥ ${' '}
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      max={60}
                      value={liq}
                      onChange={(e) => {
                        holdAuto();
                        const v = parseFloat(e.target.value);
                        setLiqMin(Number.isFinite(v) ? v : null); // cleared → terms as filed
                      }}
                    />
                    M <em>(filed {liqBase.text})</em>
                  </span>
                </label>
              )}
              <div className="gate__amendout" aria-live="polite">
                {amendDirty && amended ? (
                  <>
                    Under the amended terms · {amended.breaches} breach{amended.breaches === 1 ? '' : 'es'} →{' '}
                    <span className={`rec rec--${amended.recommendation}`}>{amended.recommendation.toUpperCase()}</span>
                    {amended.recommendation !== pkg.recommendation ? ' · changes the recommendation' : ' · unchanged'}
                    {amended.changed.length > 0 && <em> — re-tested: {amended.changed.join(', ')}</em>}
                  </>
                ) : (
                  <>Terms as filed — edit a threshold to preview the amended decision (same decide rule).</>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
            holdAuto();
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
          onClick={() => onApprove(note.trim() || undefined, { amendments })}
          disabled={leaving}
        >
          {amendDirty ? 'Countersign as amended' : 'Countersign & approve'}{' '}
          <span className="kbd kbd--on-accent">A</span>
        </button>
      </div>
    </section>
  );
}
