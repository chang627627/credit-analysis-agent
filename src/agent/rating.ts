// ---------------------------------------------------------------------------
// ONE risk-rating scale and ONE tone band table for the whole app.
//
// Before this module the extraction (synthesize.ts) and the what-if model each
// carried their own score→rating cuts, so an uploaded deck could read 'Caa1' in
// the memo and 'B3' in the sensitivity panel. The curated deals were authored
// against this scale (28 → Ba2, 58 → B2, 82 → Caa1), so it is the canonical one.
// The policy lines in `decide` sit on its edges: the referral line (score ≥ 60)
// is where B3 starts, the decline line (score ≥ 75) is Caa1 and the 'bad' band.
// ---------------------------------------------------------------------------

import { DECLINE_SCORE, REFER_SCORE } from './policy';

export type RiskTone = 'good' | 'warn' | 'bad';

/** Score at or above which a deal is declined (re-exported from the house policy). */
export { DECLINE_SCORE, REFER_SCORE };

export function ratingFor(score: number): string {
  if (score < 30) return 'Ba2 / Non-investment grade';
  if (score < 45) return 'Ba3 / Speculative';
  if (score < REFER_SCORE) return 'B2 / Speculative';
  if (score < DECLINE_SCORE) return 'B3 / Highly speculative';
  return 'Caa1 / Substantial risk';
}

/** The rating grade alone: 'Caa1 / Substantial risk' → 'Caa1'. */
export function ratingGrade(score: number): string {
  return ratingFor(score).split(' / ')[0];
}

/** <45 good · 45–74 watch · ≥75 bad (the decline line). */
export function riskTone(score: number): RiskTone {
  return score < 45 ? 'good' : score < DECLINE_SCORE ? 'warn' : 'bad';
}
