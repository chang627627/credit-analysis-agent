// Countersign V2 · the memo Decision card (THREE-PANE.md R2.2, R2.3): the ONE place to decide. It is
// FileScreen's signature slot, rendered inside MemoCard section="signature", right after step 5
// Recommendation and before the stress test. The agent panel holds no decision; its "Decision →"
// line and the composer's refusal link only scroll here.
//
// The owner-approved SignatureBlock arrangement, in the memo, top to bottom:
//   head          eyebrow "Your countersignature · CAM-… · rev n" and the title "Decision"
//                 (the record's eyebrow once sealed), then the returned history, if any;
//   1 Signed over the counted notes ("you opened n of N"), each with its own "Show row"; then, when
//                 covenant inputs are not stated in the CIM, ONE info item (R4.3, P-32) with "Show in
//                 memo": not a flag, never counted, it only takes the reviewer to the Covenants card;
//   2 note        the reviewer note with Draft from notes and the provenance chip (optional to
//                 countersign, required to return or reject); while Return or Reject is armed its
//                 label asks that verb's question, and a calm hint follows a second empty press;
//   3 amendment   the summary with Revert and Edit in memo (amending stays on the covenant row);
//   4 the call    an inset panel: "The agent recommends [TOKEN]" (always the agent's own call), the
//                 question and the one-sentence reason, directly above
//   5 the verbs   ONE horizontal row that may wrap sideways (never a vertical list), each verb with
//                 its one-line consequence under it; an armed Return or Reject reads its commit
//                 label (no wider than its resting label, so the row keeps its two lines), only the
//                 commit chord ⌘↵ stays as a chip, and a quiet Cancel link joins the same row;
//   6             the attestation (small, under the verbs) and the policy line with its checks;
//   7 lines       the agent's pre-signed line and the reviewer's line, which become the sealed
//                 record after the decision (ink / AUTO / REJECTED, quote and provenance, amendment
//                 redlines, the routed line). Sealed: no note field, no verbs.
//
// Renders selectSignature verbatim and calls only store actions. Every rule (two-press A, armed
// Return / Reject with its settle window and on-screen rule, A never signing over an armed refusal,
// the policy countdown and its holds, the leaving and justSigned guards, focus after a decision)
// lives in state/gate.ts; Esc in the card (disarm) and the armed verb's ⌘↵ live in
// state/shortcuts.ts. The one view-side rule: following the info item's "Show in memo" during a
// policy countdown holds it first (reviewManually), since the link scrolls the card away.
// Clicking the primary (or Enter, Space) is the deliberate act: it first brings the reviewer line
// into view (instant, least distance, the verbs kept in view when both fit), so the ink draws
// where the reviewer is looking, then signs (requestSign('card')). The A key signs only while the
// reviewer line is on screen and nothing is armed, which is why the root registers itself
// (registerDecision: state finds [data-sign-primary] button, the [data-verb] buttons and the reviewer
// line inside it) and the note field registers too (registerNoteField: arming Return or Reject
// focuses it, selecting its text after a click and leaving the caret at the end after a key, also
// when it mounts after the press).
// The open reviewer line is a record awaiting ink, never a control (no onActivate).
import { useCallback, useId, useRef, useState } from 'react';
import {
  Chip,
  Disclosure,
  LinkButton,
  Redline,
  SectionHead,
  SignatureLine,
  StatusGlyph,
  StatusLabel,
  TextArea,
  Token,
} from '../../kit';
import { COPY, STATUS_WORD, selectSignature } from '../../model';
import type { SignatureState, SignatureView } from '../../model';
import { revealInBand } from '../../state/reveal';
import { useV2 } from '../../state/store';
import type { DecisionBlockProps } from '../../state/screens';
import { useHeadCue } from './useHeadCue';
import { VerbRow } from './VerbRow';

const CLEARED_SUFFIX = ` · ${COPY.clearedByAmendment}`;

const SEALED_STATES: ReadonlySet<SignatureState> = new Set<SignatureState>(['signed', 'signed-auto', 'rejected']);

function Checks({ checks }: { checks: { ok: boolean; text: string }[] }) {
  return (
    <ul className="decision__checks">
      {checks.map((c) => (
        <li key={c.text}>
          <StatusLabel state={c.ok ? 'pass' : 'rejected'} role="small">
            {c.text}
          </StatusLabel>
        </li>
      ))}
    </ul>
  );
}

/**
 * 1 · Signed over: the label, then 28px rows on 1px rules, each with its own link. The info item
 * (R4.3) closes the list in quieter type: it is not a note, so it never counts toward "you opened".
 */
function SignedOver({
  v,
  disabled,
  onShow,
  onInfo,
}: {
  v: SignatureView;
  disabled: boolean;
  onShow: (o: SignatureView['signedOver'][number]) => void;
  onInfo: (info: NonNullable<SignatureView['inputsNotInCim']>) => void;
}) {
  const info = v.inputsNotInCim;
  return (
    <div className="decision__over">
      <p className="decision-ink3 t-label">{v.signedOverLabel}</p>
      {v.signedOver.length > 0 || info ? (
        <ul className="decision__overlist">
          {v.signedOver.map((o) => (
            <li key={o.flagId} className="decision__overrow">
              <StatusGlyph state={o.state} srLabel={STATUS_WORD[o.state]} />
              <span className="decision__overtext t-strong">
                <span className={o.cleared ? 'decision-struck' : undefined}>{o.text}</span>
                {o.cleared ? <span className="decision-ink3">{CLEARED_SUFFIX}</span> : null}
              </span>
              <LinkButton role="label" onClick={() => onShow(o)} disabled={disabled} ariaLabel={`${o.linkLabel} · ${o.text}`}>
                {o.linkLabel}
              </LinkButton>
            </li>
          ))}
          {info ? (
            <li className="decision__overrow" data-pattern="P-32">
              <StatusGlyph state="info" srLabel={STATUS_WORD.info} />
              <span className="decision__overtext decision-ink2 t-small">{info.text}</span>
              <LinkButton role="label" onClick={() => onInfo(info)} disabled={disabled} ariaLabel={`${info.linkLabel} · ${info.text}`}>
                {info.linkLabel}
              </LinkButton>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

/** 7, sealed · what the reviewer's line records beyond the ink: checks, quote, provenance, redlines, routing. */
function Sealed({ sealed, afterInk, onBook }: { sealed: NonNullable<SignatureView['sealed']>; afterInk: boolean; onBook: () => void }) {
  return (
    <div className={afterInk ? 'decision__sealed decision__sealed--after-ink' : 'decision__sealed'}>
      {sealed.checks ? <Checks checks={sealed.checks} /> : null}
      {sealed.quote ? (
        <blockquote className="decision__quote">
          <p className="decision-ink2 t-small">{sealed.quote}</p>
          {sealed.provenance ? <p className="decision-ink3 t-meta">{sealed.provenance}</p> : null}
        </blockquote>
      ) : sealed.provenance ? (
        <p className="decision-ink3 t-meta">{sealed.provenance}</p>
      ) : null}
      {sealed.amendments.length > 0 ? (
        <ul className="decision__amendments">
          {sealed.amendments.map((m) => (
            <li key={m.label} className="decision__amendrow">
              <span className="decision-ink2 t-small">{m.label}</span>
              <Redline from={m.from} to={m.to} role="small" />
            </li>
          ))}
        </ul>
      ) : null}
      {sealed.routed ? (
        <p className="decision-ink2 t-small">
          {sealed.routed}
          {sealed.routedLinkLabel ? (
            <>
              {' · '}
              <LinkButton role="small" onClick={onBook}>
                {sealed.routedLinkLabel}
              </LinkButton>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

export function DecisionCard({ dealId }: DecisionBlockProps) {
  const s = useV2();
  const v = selectSignature(s, dealId);
  const a = s.actions;
  const head = useHeadCue('signature');

  const callId = useId();
  const hintId = useId();
  const [checksOpen, setChecksOpen] = useState(false);

  // the root registers with the store: requestSign and "Decision →" find the primary and the
  // reviewer line inside it
  const registerDecision = a.registerDecision;
  const rootRef = useCallback((el: HTMLDivElement | null) => registerDecision(el), [registerDecision]);
  const primaryRef = useRef<HTMLSpanElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);

  // the note field registers too: arming Return or Reject focuses it and selects its text (state/gate.ts)
  const registerNoteField = a.registerNoteField;
  const noteRef = useCallback((el: HTMLTextAreaElement | null) => registerNoteField(el), [registerNoteField]);

  if (!v) return null;

  const r = v.reviewer;
  const pending = v.state === 'pending';
  const leaving = v.state === 'leaving';
  const sealedState = SEALED_STATES.has(v.state);
  const policy = v.policy;
  // verbs, the note and the links are dead while the card recedes and once this run is signed
  const dead = (v.verbs ? v.verbs.disabled : false) || leaving;
  // the model sets 'animate' only on the signing transition (INK_REPLAY_WINDOW_MS)
  const afterInk = r.ink === 'animate';

  // the primary: bring the reviewer line into view if it is not (instant, so the ink draws in
  // view; the verbs stay in view too when both fit), then sign at once
  const signFromPrimary = () => {
    const lines = linesRef.current;
    const line = lines ? lines.querySelector<HTMLElement>('[data-role="reviewer"]') ?? lines : null;
    revealInBand([primaryRef.current, line], 'nearest', 'auto');
    a.requestSign('card');
  };

  const editInMemo = (amendment: NonNullable<SignatureView['amendment']>) => {
    a.cueMemo(amendment.editTarget);
    a.focusAmend(amendment.editKind);
  };

  const rootCls = ['decision'];
  if (leaving) rootCls.push('decision--leaving');

  return (
    <>
      <SectionHead
        eyebrow={v.eyebrow}
        heading={v.heading}
        anchorId="sec:signature"
        flashKey={head.flashKey}
        highlighted={head.highlighted}
      />

      <div ref={rootRef} className={rootCls.join(' ')} data-decision="" data-state={v.state} data-pattern="P-23">
        {v.returned.length > 0 ? (
          <ul className="decision__returned">
            {v.returned.map((h) => (
              <li key={h.rev}>
                <StatusLabel state="returned" role="small">
                  {h.text}
                </StatusLabel>
              </li>
            ))}
          </ul>
        ) : null}

        {pending ? (
          v.pendingLine ? (
            // after a return for revision, focus that fell to the body lands here (state/gate.ts)
            <p className="decision-ink3 t-small" data-record-focus="" tabIndex={-1}>
              {v.pendingLine}
            </p>
          ) : null
        ) : (
          <>
            {/* the sealed record's headline: the agent's call and who decided */}
            {v.record ? (
              <StatusLabel state={v.record.state} role="strong">
                {v.record.headline}
              </StatusLabel>
            ) : null}

            {/* 1 · signed over: at the gate each link counts the note opened; once sealed it only shows the row */}
            <SignedOver
              v={v}
              disabled={dead}
              onShow={(o) => (sealedState ? a.cueMemo(o.target) : a.focusNoteById(o.noteId))}
              onInfo={(info) => {
                // following the caveat during a policy countdown is reviewing: hold it first, so the
                // policy never signs while the reviewer reads what the card just raised (off screen)
                if (policy.armed) a.reviewManually();
                a.cueMemo(info.target);
              }}
            />

            {/* 2 · the reviewer note, on the record */}
            {v.note ? (
              <div className="decision__note">
                <div className="decision__notehead">
                  <span className="t-label">{v.note.label}</span>
                  <span className="decision__notetools">
                    <LinkButton role="label" onClick={a.insertDraft} disabled={v.note.draftDisabled || dead}>
                      {v.note.draftLabel}
                    </LinkButton>
                    {v.note.chip ? <Chip>{v.note.chip}</Chip> : null}
                  </span>
                </div>
                <TextArea
                  size="note"
                  value={v.note.value}
                  onChange={a.setNote}
                  placeholder={v.note.placeholder}
                  ariaLabel={v.note.label}
                  describedBy={v.note.hint !== null ? hintId : undefined}
                  inputRef={noteRef}
                  disabled={dead}
                />
                {/* the calm hint after an armed verb is pressed again with an empty note (R4): a quiet
                    line, never an alert; the live region announces it (need-reason) */}
                {v.note.hint !== null ? (
                  <p id={hintId} className="decision-ink2 t-small">
                    {v.note.hint}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* 3 · the amendment summary (amending itself stays on the covenant row, P-05) */}
            {v.amendment ? (
              <p className="decision__amend t-small">
                <span>{v.amendment.text}</span>
                <Token tone={v.amendment.token.tone}>{v.amendment.token.word}</Token>
                <span className="decision__amendlinks">
                  <LinkButton role="small" onClick={a.revertAmendments} disabled={dead}>
                    {v.amendment.revertLabel}
                  </LinkButton>
                  <span className="decision-ink3" aria-hidden="true">
                    ·
                  </span>
                  <LinkButton role="small" onClick={() => v.amendment && editInMemo(v.amendment)} disabled={dead}>
                    {v.amendment.editLabel}
                  </LinkButton>
                </span>
              </p>
            ) : null}

            {/* 4 to 6 · the decision panel: the agent's call directly above the verbs, then the
                attestation and the policy line */}
            {v.verbs && v.call ? (
              <div className="decision__panel" role="group" aria-labelledby={callId}>
                <div className="decision__call">
                  <p className="decision__lead t-label">
                    <span className="decision-ink3">{v.call.lead}</span>
                    <Token tone={v.call.token.tone}>{v.call.token.word}</Token>
                  </p>
                  <p id={callId} className="t-heading">
                    {v.call.title}
                  </p>
                  <p className="decision__why decision-ink2 t-small">{v.call.why}</p>
                </div>

                {/* one horizontal row that may wrap sideways; each verb with its consequence under it.
                    An armed Return or Reject reads its commit label; Cancel joins the same row
                    (VerbRow, shared with the kit page's phone-width check, R4.10). */}
                <VerbRow
                  verbs={v.verbs}
                  dead={dead}
                  primaryRef={primaryRef}
                  onSign={signFromPrimary}
                  onRework={() => a.tryRework('click')}
                  onReject={() => a.tryReject('click')}
                  onCancel={a.disarm}
                />

                <div className="decision__foot">
                  {v.attestation ? <p className="decision-ink3 t-meta">{v.attestation}</p> : null}
                  <div className="decision__policy">
                    <p className="decision-ink3 t-meta">
                      {policy.line}
                      {policy.armed && r.reviewLabel ? (
                        <>
                          {' · '}
                          <LinkButton role="meta" onClick={a.reviewManually} disabled={dead}>
                            {r.reviewLabel}
                          </LinkButton>
                        </>
                      ) : null}
                    </p>
                    {policy.on && policy.checks ? (
                      <Disclosure label={COPY.showChecks} open={checksOpen} onToggle={() => setChecksOpen((o) => !o)}>
                        <Checks checks={policy.checks} />
                      </Disclosure>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {/* 7 · the signature lines: the agent pre-signed, the reviewer's open line (a record
                awaiting ink, not a control), which becomes the sealed record */}
            <div ref={linesRef} className="decision__lines" data-record-focus="" tabIndex={-1}>
              <SignatureLine role="agent" state="pre-signed" text={v.agent.text} caption={v.agent.caption} />
              <SignatureLine
                role="reviewer"
                state={r.sigState}
                text={r.autoText ?? undefined}
                caption={<span className={afterInk ? 'decision-caption decision-caption--after-ink' : 'decision-caption'}>{r.caption}</span>}
                ink={r.ink}
                rejectedWord={r.rejectedWord ?? undefined}
                fillMs={r.fillMs}
              />
            </div>

            {v.sealed ? <Sealed sealed={v.sealed} afterInk={afterInk} onBook={() => a.navigate({ name: 'book' })} /> : null}
          </>
        )}
      </div>
    </>
  );
}
