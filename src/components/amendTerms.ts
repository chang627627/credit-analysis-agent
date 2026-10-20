// ---------------------------------------------------------------------------
// "Countersign as amended" — the one place V1 turns amended covenant terms into
// an outcome. The gate's live preview and the App's after-signing routing both
// call `signedOutcome`, so what the reviewer saw at the gate and what happens
// once they sign (routed to senior review or not) are the same computation.
//
// The amendment record ({ label, from, to }) is read back into the engine's
// TermOverrides here, next to the labels the gate writes it with.
// ---------------------------------------------------------------------------

import type { Amendment, ApprovalPackage, Recommendation } from '../agent/types';
import type { Deal } from '../agent/mockData';
import { amendedOutcome } from '../agent/whatif';
import type { AmendedOutcome, TermOverrides } from '../agent/whatif';

export const LEVERAGE_AMENDMENT = 'Max Total Leverage covenant';
export const LIQUIDITY_AMENDMENT = 'Min Liquidity covenant';

const num = (s: string): number | undefined => {
  const m = s.match(/[\d.]+/);
  const v = m ? parseFloat(m[0]) : NaN;
  return Number.isFinite(v) ? v : undefined;
};

/** The amended thresholds a recorded amendment list carries (null = terms as filed). */
export function overridesFromAmendments(list?: Amendment[] | null): TermOverrides | null {
  if (!list || list.length === 0) return null;
  const o: TermOverrides = {};
  for (const a of list) {
    if (a.label === LEVERAGE_AMENDMENT) o.leverageMax = num(a.to);
    else if (a.label === LIQUIDITY_AMENDMENT) o.liquidityMin = num(a.to);
  }
  return o.leverageMax === undefined && o.liquidityMin === undefined ? null : o;
}

export interface SignedOutcome {
  /** the recommendation the signature actually stands behind */
  recommendation: Recommendation;
  /** the same decide rule on the amended terms (null when nothing was amended) */
  amended: AmendedOutcome | null;
  /**
   * The package was escalated by the data gate (unverified extraction).
   * Amending a covenant does not verify the figures, so it stays ESCALATE.
   */
  heldForVerification: boolean;
}

/**
 * What a countersignature commits to: the package's own call, or — when the
 * reviewer amended terms — the same `decide` rule re-run on the filed actuals
 * against the amended thresholds (headroom included: a waiver that leaves 1%
 * of room is still an escalation). Not offered on a revised-structure gate.
 */
export function signedOutcome(
  pkg: ApprovalPackage,
  deal: Deal | undefined,
  overrides: TermOverrides | null,
): SignedOutcome {
  if (!overrides || !deal || pkg.restructure) {
    return { recommendation: pkg.recommendation, amended: null, heldForVerification: false };
  }
  const amended = amendedOutcome(deal, overrides);
  const held = pkg.decisionBasis === 'unverified-data';
  return { recommendation: held ? 'escalate' : amended.recommendation, amended, heldForVerification: held };
}
