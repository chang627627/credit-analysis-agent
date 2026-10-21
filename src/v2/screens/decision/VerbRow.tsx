// ---------------------------------------------------------------------------
// Countersign V2 · the Decision card's verb row (spec §8; THREE-PANE.md §3.1,
// R4.1, R4.10). ONE horizontal row that may wrap sideways, never a vertical
// list: each verb a unit, its button with the consequence under it; an armed
// Return or Reject reads its commit label and the quiet Cancel link joins the
// same row. Pure: it renders the model's verbs and calls the handlers it is
// given, so the memo's Decision card and the kit page's phone-width check
// (#board-phoneverbs, P-37) render the same markup with the same decision.css.
// ---------------------------------------------------------------------------

import type { Ref } from 'react';
import { Button, LinkButton } from '../../kit';
import type { SignatureView } from '../../model';
// after the kit, so kit.css precedes the screen rules wherever this module is bundled
import './decision.css';

export interface VerbRowProps {
  verbs: NonNullable<SignatureView['verbs']>;
  /** verbs and the Cancel link are dead while the card recedes and once the run is signed */
  dead: boolean;
  /** the primary's wrapper ([data-sign-primary]): state/gate.ts finds and focuses the primary through it */
  primaryRef?: Ref<HTMLSpanElement>;
  onSign: () => void;
  onRework: () => void;
  onReject: () => void;
  onCancel: () => void;
}

export function VerbRow({ verbs, dead, primaryRef, onSign, onRework, onReject, onCancel }: VerbRowProps) {
  return (
    <ul className="decision__choices">
      <li className="decision__choice" data-verb="sign">
        <span ref={primaryRef} className="decision__primary" data-sign-primary="">
          <Button variant="primary" kbd={verbs.kbd.sign ?? undefined} onClick={onSign} disabled={dead}>
            {verbs.primary}
          </Button>
        </span>
        <span className="decision__caption decision-ink3 t-meta">{verbs.notes.sign}</span>
      </li>
      <li className="decision__choice" data-verb="rework">
        <Button variant="secondary" kbd={verbs.kbd.ret ?? undefined} onClick={onRework} disabled={dead}>
          {verbs.returnLabel}
        </Button>
        <span className="decision__caption decision-ink3 t-meta">{verbs.notes.ret}</span>
      </li>
      <li className="decision__choice" data-verb="reject">
        <Button variant="danger" kbd={verbs.kbd.rej ?? undefined} onClick={onReject} disabled={dead}>
          {verbs.rejectLabel}
        </Button>
        <span className="decision__caption decision-ink3 t-meta">{verbs.notes.rej}</span>
      </li>
      {verbs.cancelLabel ? (
        <li className="decision__cancel" data-pattern="P-30">
          <LinkButton role="label" onClick={onCancel} disabled={dead}>
            {verbs.cancelLabel}
          </LinkButton>
        </li>
      ) : null}
    </ul>
  );
}
