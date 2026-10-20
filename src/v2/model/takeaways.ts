// ---------------------------------------------------------------------------
// Countersign V2 · section takeaways (THREE-PANE.md §5.5). The one line under
// each set memo card's title. Pure over engine and view types, so the golden
// check can call them without a store. Steps 1 to 4 state facts only: never
// "deciding" language and never the call. Revision cards state their own
// outcome (they sit after step 4, right above step 5), and only the
// recommendation carries tokens.
// ---------------------------------------------------------------------------

import type { Deal, ExtractedFinancials } from '../../agent/mockData';
import { MIN_HEADROOM } from '../../agent/policy';
import { DECLINE_SCORE, REFER_SCORE, riskTone } from '../../agent/rating';
import type { Recommendation } from '../../agent/types';
import { cushionOf, FIGURES, financialValue, fmtFigure } from './evidence';
import { covenantForFigure } from './flags';
import { fmtM, fmtX, listJoin, plural } from './format';
import type { CovenantRow, CushionView, FigureId, RecommendationBody, StatusKey, TakeawayView } from './types';
import { COPY, policyPct, tokenWord } from './vocab';

/** The four figures the covenant package tests, in memo order. */
const TESTED: FigureId[] = ['leverage', 'interest', 'fixed', 'liquidity'];

function takeaway(state: StatusKey, text: string, basis: string | null = null): TakeawayView {
  return { state, text, token: null, prior: null, basis };
}

/** 'Total leverage' → 'total leverage' (a FIGURES label read mid-sentence). */
function midSentence(label: string): string {
  return label.length > 0 ? label[0].toLowerCase() + label.slice(1) : label;
}

/** The entry with the most negative (smallest) cushion; the first one on a tie. */
function tightest<T extends { cushion: CushionView }>(items: T[]): T {
  return items.reduce((best, x) => (x.cushion.pct < best.cushion.pct ? x : best), items[0]);
}

/**
 * Financials: each tested figure against its FILED covenant (amendments are tested in
 * Covenant compliance; the basis line says so when they are in force).
 */
export function financialsTakeaway(deal: Deal, f: ExtractedFinancials, amended: boolean): TakeawayView {
  const basis = amended ? COPY.amendedBasis : null;
  const tested = TESTED.flatMap((id) => {
    const cov = covenantForFigure(deal, id);
    if (!cov) return [];
    const label = FIGURES.find((x) => x.id === id)?.label ?? id;
    const value = fmtFigure(id, financialValue(f, id));
    return [{ label, value, threshold: cov.threshold, cushion: cushionOf(cov.threshold, value) }];
  });
  if (tested.length === 0) return takeaway('info', 'No tested figure carries a covenant.', basis);

  const breaches = tested.filter((t) => t.cushion.tone === 'bad');
  if (breaches.length === 1) {
    const b = breaches[0];
    const k = tested.length - 1;
    // thin = under the rule's 15% policy cushion (the same line the decision reads)
    const thin = tested.filter((t) => t.cushion.tone === 'warn').length;
    const rest =
      k === 0
        ? ''
        : k === 1
          ? `; the other tested figure clears its covenant${thin > 0 ? ', with thin headroom' : ''}`
          : `; the other ${k} tested figures clear theirs${thin > 0 ? `, ${thin} with thin headroom` : ''}`;
    return takeaway('breach', `${b.label} ${b.value} breaches the ${b.threshold} covenant${rest}.`, basis);
  }
  if (breaches.length >= 2) {
    const lead = tightest(breaches);
    return takeaway(
      'breach',
      `${breaches.length} of ${tested.length} tested figures breach their covenants, led by ${midSentence(lead.label)} ${lead.value} against ${lead.threshold}.`,
      basis,
    );
  }
  const t = tightest(tested);
  if (t.cushion.tone === 'warn') {
    return takeaway(
      'watch',
      `No tested figure breaches its covenant, but ${midSentence(t.label)} ${t.value} has thin headroom: ${t.cushion.text} against ${t.threshold}.`,
      basis,
    );
  }
  return takeaway(
    'pass',
    `Every tested figure clears its covenant; the tightest is ${midSentence(t.label)} ${t.value}, with ${t.cushion.text} cushion against ${t.threshold}.`,
    basis,
  );
}

/**
 * Risk: the score against the decision rule's two score lines (the 60 referral line and the 75
 * decline line), toned by the one rating band table. Facts only: where the score sits.
 */
export function riskTakeaway(risk: { score: number; rating: string }): TakeawayView {
  const tone = riskTone(risk.score);
  const state: StatusKey = tone === 'good' ? 'pass' : tone === 'warn' ? 'watch' : 'breach';
  const s = risk.score;
  if (s >= DECLINE_SCORE) return takeaway(state, `Risk ${s} (${risk.rating}) is at or over the ${DECLINE_SCORE} decline line.`);
  if (s >= REFER_SCORE) {
    return takeaway(state, `Risk ${s} (${risk.rating}) is at or over the ${REFER_SCORE} referral line, ${plural(DECLINE_SCORE - s, 'point')} under the ${DECLINE_SCORE} decline line.`);
  }
  return takeaway(
    state,
    `Risk ${s} (${risk.rating}) is ${plural(REFER_SCORE - s, 'point')} under the ${REFER_SCORE} referral line and ${DECLINE_SCORE - s} under the ${DECLINE_SCORE} decline line.`,
  );
}

/** Peers: the deal's leverage against the simulated sector median. Always informational. */
export function peersTakeaway(dealLeverageX: number, medianLeverageX: number): TakeawayView {
  const d = fmtX(dealLeverageX);
  const m = fmtX(medianLeverageX);
  const where = d === m ? 'level with' : dealLeverageX > medianLeverageX ? 'above' : 'below';
  return takeaway('info', `Total leverage ${d} is ${where} the sector median of ${m}.`, COPY.peersBasis);
}

/** Covenants: the rows under the amendments in force (their status and cushion are already re-tested). */
export function covenantsTakeaway(rows: CovenantRow[], amended: boolean): TakeawayView {
  const n = rows.length;
  if (n === 0) return takeaway('info', 'No covenants were tested.');
  const as = amended ? ' as amended' : '';
  const breached = rows.filter((r) => r.status === 'breach');
  const b = breached.length;
  // thin = a pass under the rule's 15% policy cushion (the same line the decision reads)
  const thin = rows.filter((r) => r.status === 'pass' && r.cushion.tone === 'warn').length;
  if (b === 1 || b === 2) {
    const more = thin > 0 ? `; ${thin} more ${thin === 1 ? 'passes' : 'pass'} with thin headroom` : '';
    return takeaway('breach', `${b} of ${n} covenants breached${as}: ${listJoin(breached.map((r) => r.name))}${more}.`);
  }
  if (b >= 3) {
    const lead = tightest(breached);
    return takeaway('breach', `${b} of ${n} covenants breached${as}, led by ${lead.name} (${lead.cushion.text}).`);
  }
  const t = tightest(rows);
  const all = n === 1 ? 'The covenant passes' : `All ${n} covenants pass`;
  if (thin >= 2) return takeaway('watch', `${all}${as}; ${thin} have thin headroom, led by ${t.name} (${t.cushion.text}).`);
  if (t.cushion.tone === 'warn') return takeaway('watch', `${all}${as}; ${t.name} has thin headroom (${t.cushion.text}).`);
  return takeaway('pass', `${all}${as}; the tightest is ${t.name} (${t.cushion.text}).`);
}

/**
 * Revision n: the revision's own outcome, read where the revision sits. The Structuring Engine
 * targets the rule's clean approval (every covenant with the 15% policy cushion); `gated` says
 * the figures rest on unverified extraction, so the data gate holds the call for verification.
 */
export function revisionTakeaway(
  r:
    | { kind: 'cure'; contributionM: number; revisedLeverageX: number; from: Recommendation; to: Recommendation; gated?: boolean }
    | { kind: 'none-needed'; rec: Recommendation; gated?: boolean }
    | { kind: 'no-cure'; rec: Recommendation },
): TakeawayView {
  const cushion = policyPct(MIN_HEADROOM);
  switch (r.kind) {
    case 'cure': {
      const what = `${fmtM(r.contributionM)} sponsor equity brings total leverage to ${fmtX(r.revisedLeverageX)} and every covenant to at least ${cushion} headroom`;
      if (r.from !== r.to) return takeaway('pass', `${what}: ${tokenWord(r.from)} becomes ${tokenWord(r.to)}.`);
      return takeaway('watch', `${what}, but ${r.gated ? 'the figures are unverified, so ' : ''}${tokenWord(r.to)} stands.`);
    }
    case 'none-needed':
      return takeaway(
        'info',
        `The filed structure already clears every covenant with at least ${cushion} headroom: ${r.gated ? `the figures are unverified, so ${tokenWord(r.rec)} stands.` : `${tokenWord(r.rec)} stands.`}`,
      );
    case 'no-cure':
      return takeaway('watch', `No structure within policy gives every covenant ${cushion} headroom: ${tokenWord(r.rec)} stands.`);
  }
}

/** Recommendation: the token (and the struck rev 1 token when restructured), the sentence and its basis. */
export function recommendationTakeaway(body: RecommendationBody): TakeawayView {
  const state: StatusKey = body.token.tone === 'good' ? 'pass' : body.token.tone === 'bad' ? 'breach' : 'watch';
  return { state, text: body.sentence, token: body.token, prior: body.prior, basis: body.basis };
}
