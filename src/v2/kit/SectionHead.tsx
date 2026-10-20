// SectionHead: the head of a memo card (P-26). Three rows:
//   1. top row: a t-eyebrow ink-3 step line (one line, ellipsized) and an optional aside on the right;
//   2. the section title, h2 in t-figure-lg ink (the only 18px role inside a memo card);
//   3. the takeaway: a StatusGlyph (or, for the recommendation, a struck prior Token and the Token),
//      then the one-line t-strong ink sentence, then an optional t-meta ink-3 basis line under it.
// Every word arrives from the model. The root carries data-anchor and the same flash / highlight
// cues as Table rows (useFlash).
import type { ReactNode } from 'react';
import { StatusGlyph } from './StatusGlyph';
import { useFlash } from './Table';
import { Token } from './Token';
import type { MeaningTone, StatusKey } from './types';

export interface SectionTakeaway {
  state: StatusKey;
  text: string;
  token?: { word: string; tone: MeaningTone } | null;
  prior?: { word: string; tone: MeaningTone } | null;
  basis?: string | null;
}

export interface SectionHeadProps {
  eyebrow: string;
  heading: string;
  takeaway?: SectionTakeaway | null;
  aside?: ReactNode;
  anchorId: string;
  flashKey?: number;
  highlighted?: boolean;
}

export function SectionHead({ eyebrow, heading, takeaway, aside, anchorId, flashKey, highlighted = false }: SectionHeadProps) {
  const flash = useFlash(flashKey);
  const cls = ['k-sechead'];
  if (flash.on) cls.push('is-flash');
  if (highlighted) cls.push('is-highlighted');
  const hasAside = aside !== undefined && aside !== null && aside !== false;
  return (
    <div ref={flash.ref} className={cls.join(' ')} data-anchor={anchorId} onAnimationEnd={flash.onAnimationEnd}>
      <div className="k-sechead__top">
        <p className="k-sechead__eyebrow t-eyebrow">{eyebrow}</p>
        {hasAside ? <div className="k-sechead__aside">{aside}</div> : null}
      </div>
      <h2 className="k-sechead__heading t-figure-lg">{heading}</h2>
      {takeaway ? (
        <div className="k-sechead__takeaway" data-state={takeaway.state}>
          {takeaway.token ? (
            <span className="k-sechead__tokens">
              {takeaway.prior ? (
                <Token tone={takeaway.prior.tone} variant="struck">
                  {takeaway.prior.word}
                </Token>
              ) : null}
              <Token tone={takeaway.token.tone}>{takeaway.token.word}</Token>
            </span>
          ) : (
            <StatusGlyph state={takeaway.state} />
          )}
          <div className="k-sechead__lines">
            <p className="k-sechead__text t-strong">{takeaway.text}</p>
            {takeaway.basis ? <p className="k-sechead__basis t-meta">{takeaway.basis}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
