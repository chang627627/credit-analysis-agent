// Countersign V2 · the signature block (spec §7.3, §8): the gate at the foot of the memo.
//
// The agent's pre-signed line sits beside the open reviewer line (the suspended Promise made
// visible). Around it: the returned history, the Signed over list with its opened tally, the
// policy line and checks, the reviewer note with Draft from notes and its provenance chip, the
// amendment summary, the attestation and the three verbs. Once decided, the sealed record
// (quote and provenance, policy checks, amendment redlines, the routed line) replaces the note,
// attestation and verbs.
//
// This file renders selectSignature verbatim and calls only store actions. Every rule (two-press
// A, the policy countdown and its holds, need-note, the leaving and justSigned guards) lives in
// state/gate.ts. Two-press is for the A key: a click (or Enter) on the visible primary verb is
// deliberate and signs at once. requestSign('line') signs only while the reviewer line is in view,
// so the primary first brings the line, instantly and minimally, into the band requestSign checks
// (below the sticky doc bar); the ink then draws where the reviewer can see it.
// Motion is CSS only: the ink draw and the rule recolour are the kit's, and the
// sealed record and the swapped caption enter after the ink (delay --dur-3) only while the model
// says the ink animates. Reduced motion zeroes every token, so the whole sequence is instant.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Button,
  Chip,
  Disclosure,
  Kbd,
  LinkButton,
  Redline,
  SignatureLine,
  StatusGlyph,
  StatusLabel,
  TextArea,
  Token,
} from '../../kit';
import { COPY, STATUS_WORD, selectSignature } from '../../model';
import type { SignatureState, SignatureView } from '../../model';
import { useV2 } from '../../state/store';
import type { DecisionBlockProps } from '../../state/screens';

// The two signed-over labels come from the model's COPY, like every other word here.
const SHOW_NOTE = COPY.showNote;
const CLEARED_SUFFIX = ` · ${COPY.clearedByAmendment}`;

/** States in which the reviewer line is the live, open line (registered for two-press A). */
const OPEN_STATES: ReadonlySet<SignatureState> = new Set<SignatureState>(['gate', 'countdown', 'held', 'leaving']);

/** Clearance kept between the revealed line and the doc bar / the window's bottom edge. */
const REVEAL_PAD = 8;

/**
 * Scroll the reviewer line into the band state/gate.ts requestSign treats as visible (top at or
 * below the [data-docbar] wrapper's bottom, bottom inside the window). Instant, so requestSign
 * measures the new position in the same tick, and minimal, so the verbs usually stay in view too.
 */
function revealLine(el: HTMLElement): void {
  const bar = document.querySelector('[data-docbar]');
  const top = (bar ? bar.getBoundingClientRect().bottom : 0) + REVEAL_PAD;
  const bottom = window.innerHeight - REVEAL_PAD;
  const r = el.getBoundingClientRect();
  const dy = r.top < top ? r.top - top : r.bottom > bottom ? r.bottom - bottom : 0;
  if (dy === 0) return;
  let box = el.parentElement;
  while (box && !(box.scrollHeight > box.clientHeight && /(auto|scroll)/.test(getComputedStyle(box).overflowY))) {
    box = box.parentElement;
  }
  const scroller = box ?? document.scrollingElement;
  if (scroller) scroller.scrollTop += dy;
}

function Checks({ checks }: { checks: { ok: boolean; text: string }[] }) {
  return (
    <ul className="decision-sig__checks">
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

function ReviewerCaption({ v, afterInk, onReview }: { v: SignatureView; afterInk: boolean; onReview: () => void }) {
  const r = v.reviewer;
  return (
    <span className={afterInk ? 'decision-caption decision-caption--after-ink' : 'decision-caption'}>
      {r.caption}
      {r.kbd ? (
        <>
          {' '}
          <Kbd>{r.kbd}</Kbd>
        </>
      ) : null}
      {r.reviewLabel ? (
        <>
          {' · '}
          <LinkButton role="meta" onClick={onReview}>
            {r.reviewLabel}
          </LinkButton>
        </>
      ) : null}
    </span>
  );
}

export function SignatureBlock({ dealId }: DecisionBlockProps) {
  const s = useV2();
  const v = selectSignature(s, dealId);
  const a = s.actions;

  const headingId = useId();
  const hintId = useId();
  const callId = useId();
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [checksOpen, setChecksOpen] = useState(false);

  // the open reviewer line: registered with the store (two-press A) and kept here for the primary
  const lineEl = useRef<HTMLDivElement | null>(null);
  const register = a.registerSignatureLine;
  const lineRef = useCallback(
    (el: HTMLDivElement | null) => {
      lineEl.current = el;
      register(el);
    },
    [register],
  );
  const signFromPrimary = () => {
    const el = lineEl.current;
    if (el && el.isConnected) revealLine(el);
    a.requestSign('line');
  };

  // R or S with an empty note bumps focusTick: focus the note field (never on mount, never
  // when the tick resets for a new package).
  const focusTick = s.gate.focusTick;
  const seenTick = useRef(focusTick);
  useEffect(() => {
    const prev = seenTick.current;
    seenTick.current = focusTick;
    if (focusTick > prev) noteRef.current?.focus();
  }, [focusTick]);

  if (!v) return null;

  const r = v.reviewer;
  const pending = v.state === 'pending';
  const leaving = v.state === 'leaving';
  const open = OPEN_STATES.has(v.state);
  const live = open && !leaving;
  // the model sets 'animate' only on the signing transition (INK_REPLAY_WINDOW_MS)
  const afterInk = r.ink === 'animate';

  return (
    <section
      className={leaving ? 'decision-sig decision-sig--leaving' : 'decision-sig'}
      aria-labelledby={headingId}
      data-state={v.state}
    >
      <div className="decision-sig__head">
        <h2 id={headingId} className="t-heading">
          {v.heading}
        </h2>
        {v.returned.length > 0 ? (
          <ul className="decision-sig__returned">
            {v.returned.map((h) => (
              <li key={h.rev}>
                <StatusLabel state="returned" role="small">
                  {h.text}
                </StatusLabel>
              </li>
            ))}
          </ul>
        ) : null}
        {pending && v.pendingLine ? <p className="decision-ink3 t-small">{v.pendingLine}</p> : null}
      </div>

      {pending ? null : (
        <>
          <div className="decision-sig__over">
            <p className="decision-ink3 t-label">{v.signedOverLabel}</p>
            {v.signedOver.length > 0 ? (
              <ul className="decision-sig__overlist">
                {v.signedOver.map((o) => (
                  <li key={o.flagId} className="decision-sig__overrow">
                    <StatusGlyph state={o.state} srLabel={STATUS_WORD[o.state]} />
                    <span className="decision-sig__overtext t-strong">
                      <span className={o.cleared ? 'decision-struck' : undefined}>{o.text}</span>
                      {o.cleared ? <span className="decision-ink3">{CLEARED_SUFFIX}</span> : null}
                    </span>
                    <LinkButton role="label" onClick={() => a.focusNoteById(o.noteId)} ariaLabel={`${SHOW_NOTE} · ${o.text}`}>
                      {SHOW_NOTE}
                    </LinkButton>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="decision-sig__lines">
            <SignatureLine role="agent" state="pre-signed" text={v.agent.text} caption={v.agent.caption} />
            <SignatureLine
              role="reviewer"
              state={r.sigState}
              text={r.autoText ?? undefined}
              caption={<ReviewerCaption v={v} afterInk={afterInk} onReview={a.reviewManually} />}
              ink={r.ink}
              rejectedWord={r.rejectedWord ?? undefined}
              fillMs={r.fillMs}
              lineRef={open ? lineRef : undefined}
              onActivate={live ? () => a.requestSign('line') : undefined}
            />
          </div>

          {v.sealed === null ? (
            <div className="decision-sig__policy">
              <p className="decision-ink3 t-meta">{v.policy.line}</p>
              {v.policy.on && v.policy.checks ? (
                <Disclosure label={COPY.showChecks} open={checksOpen} onToggle={() => setChecksOpen((o) => !o)}>
                  <Checks checks={v.policy.checks} />
                </Disclosure>
              ) : null}
            </div>
          ) : null}

          {v.note ? (
            <div className="decision-sig__note">
              <div className="decision-sig__notehead">
                <span className="t-label">{v.note.label}</span>
                <span className="decision-sig__notetools">
                  <LinkButton role="label" onClick={a.insertDraft} disabled={v.note.draftDisabled || leaving}>
                    {v.note.draftLabel}
                  </LinkButton>
                  {v.note.chip ? <Chip>{v.note.chip}</Chip> : null}
                </span>
              </div>
              <TextArea
                value={v.note.value}
                onChange={a.setNote}
                placeholder={v.note.placeholder}
                ariaLabel={v.note.label}
                invalid={v.note.hint !== null}
                describedBy={v.note.hint !== null ? hintId : undefined}
                inputRef={noteRef}
                disabled={leaving}
              />
              {v.note.hint !== null ? (
                <p id={hintId} role="alert" className="decision-sig__hint t-small">
                  {v.note.hint}
                </p>
              ) : null}
            </div>
          ) : null}

          {v.amendment ? (
            <p className="decision-sig__amend t-small">
              <span>{v.amendment.text}</span>
              <Token tone={v.amendment.token.tone}>{v.amendment.token.word}</Token>
              <span className="decision-ink3" aria-hidden="true">
                ·
              </span>
              <LinkButton role="small" onClick={a.revertAmendments} disabled={leaving}>
                {v.amendment.revertLabel}
              </LinkButton>
            </p>
          ) : null}

          {v.verbs ? (
            <div className="decision-sig__decide" role="group" aria-labelledby={v.call ? callId : undefined}>
              {v.call ? (
                <div className="decision-sig__call">
                  <p className="decision-sig__calllead t-label">
                    <span className="decision-ink3">{v.call.lead}</span>
                    <Token tone={v.call.token.tone}>{v.call.token.word}</Token>
                  </p>
                  <p id={callId} className="t-heading">
                    {v.call.title}
                  </p>
                  <p className="decision-sig__why decision-ink2 t-small">{v.call.why}</p>
                </div>
              ) : null}
              <ul className="decision-sig__choices">
                <li className="decision-sig__choice">
                  <Button variant="primary" kbd={v.verbs.kbd.sign} onClick={signFromPrimary} disabled={v.verbs.disabled}>
                    {v.verbs.primary}
                  </Button>
                  <span className="decision-ink3 t-meta">{v.verbs.notes.sign}</span>
                </li>
                <li className="decision-sig__choice">
                  <Button variant="secondary" kbd={v.verbs.kbd.ret} onClick={a.tryRework} disabled={v.verbs.disabled}>
                    {v.verbs.returnLabel}
                  </Button>
                  <span className="decision-ink3 t-meta">{v.verbs.notes.ret}</span>
                </li>
                <li className="decision-sig__choice">
                  <Button variant="danger" kbd={v.verbs.kbd.rej} onClick={a.tryReject} disabled={v.verbs.disabled}>
                    {v.verbs.rejectLabel}
                  </Button>
                  <span className="decision-ink3 t-meta">{v.verbs.notes.rej}</span>
                </li>
              </ul>
              {v.attestation ? <p className="decision-sig__attest decision-ink3 t-meta">{v.attestation}</p> : null}
            </div>
          ) : v.attestation ? (
            <p className="decision-sig__attest t-small">{v.attestation}</p>
          ) : null}

          {v.sealed ? (
            <div className={afterInk ? 'decision-sig__sealed decision-sig__sealed--after-ink' : 'decision-sig__sealed'}>
              {v.sealed.checks ? <Checks checks={v.sealed.checks} /> : null}
              {v.sealed.quote ? (
                <blockquote className="decision-sig__quote">
                  <p className="decision-ink2 t-small">{v.sealed.quote}</p>
                  {v.sealed.provenance ? <p className="decision-ink3 t-meta">{v.sealed.provenance}</p> : null}
                </blockquote>
              ) : v.sealed.provenance ? (
                <p className="decision-ink3 t-meta">{v.sealed.provenance}</p>
              ) : null}
              {v.sealed.amendments.length > 0 ? (
                <ul className="decision-sig__amendments">
                  {v.sealed.amendments.map((m) => (
                    <li key={m.label} className="decision-sig__amendrow">
                      <span className="decision-ink2 t-small">{m.label}</span>
                      <Redline from={m.from} to={m.to} role="small" />
                    </li>
                  ))}
                </ul>
              ) : null}
              {v.sealed.routed ? (
                <p className="decision-ink2 t-small">
                  {v.sealed.routed}
                  {v.sealed.routedLinkLabel ? (
                    <>
                      {' · '}
                      <LinkButton role="small" onClick={() => a.navigate({ name: 'book' })}>
                        {v.sealed.routedLinkLabel}
                      </LinkButton>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
