// ---------------------------------------------------------------------------
// A small rule-based responder for the composer's follow-up questions. It reads
// the current deal + run state and answers in natural language. Not an LLM — a
// scripted Q&A over the deal data, which is honest for a mocked backend and
// enough to demo the "ask the agent about its work" interaction.
//
// Every judgement it states comes from the ONE decision rule (whatif.ts) and
// the house policy: covenant answers read signed headroom against the policy
// cushion, "why" answers read the package's own decision reasons, and a waiver
// question is answered by re-running the rule on reset terms — so the composer
// can never contradict the gate or the memo.
// ---------------------------------------------------------------------------

import type { Deal } from './mockData';
import type { ApprovalPackage, Recommendation } from './types';
import { amendedOutcome, decisionForDeal, filedChecks, findCure, fmtHeadroom, headroomStatus } from './whatif';
import type { CovenantCheck, TermOverrides } from './whatif';
import { DECLINE_SCORE, LEVERAGE_OUTER_LIMIT, MIN_HEADROOM, REFER_SCORE } from './policy';
import { fmtM, fmtX } from './format';

const pct0 = (f: number) => `${Math.round(f * 100)}%`;
const word = (r: Recommendation) => r.toUpperCase();
const cushion = pct0(MIN_HEADROOM);

/** "Min Interest Coverage 2.10x vs ≥ 2.00x (4.8% headroom)" */
function covLine(c: CovenantCheck): string {
  return `${c.name} ${c.actual} vs ${c.threshold}${c.headroom !== null ? ` (${fmtHeadroom(c.headroom)} headroom)` : ''}`;
}

/** 'a', 'a and b', 'a, b and c' */
function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const ceil2 = (n: number) => Math.ceil(n * 100 - 1e-9) / 100;
const floor1 = (n: number) => Math.floor(n * 10 + 1e-9) / 10;

/**
 * The most the gate's amend-terms control can do for this deal: the leverage
 * ceiling and liquidity floor reset (only where they sit inside the cushion or
 * breach) to leave exactly the policy cushion. Null when neither needs it.
 */
function resetTerms(checks: CovenantCheck[]): { overrides: TermOverrides; terms: string[] } | null {
  const overrides: TermOverrides = {};
  const terms: string[] = [];
  const lev = checks.find((c) => c.kind === 'leverage' && c.dir === 'max' && Number.isFinite(c.value));
  if (lev && headroomStatus(lev.headroom) !== 'clear') {
    overrides.leverageMax = ceil2(lev.value / (1 - MIN_HEADROOM));
    terms.push(`a ${fmtX(overrides.leverageMax)} leverage ceiling`);
  }
  const liq = checks.find((c) => c.kind === 'liquidity' && c.dir === 'min' && Number.isFinite(c.value));
  if (liq && headroomStatus(liq.headroom) !== 'clear') {
    overrides.liquidityMin = floor1(liq.value * (1 - MIN_HEADROOM));
    terms.push(`a ${fmtM(overrides.liquidityMin)} liquidity floor`);
  }
  return terms.length > 0 ? { overrides, terms } : null;
}

export function answerQuestion(
  deal: Deal,
  hasRun: boolean,
  pkg: ApprovalPackage | null,
  question: string,
): string {
  const q = question.toLowerCase();
  const checks = filedChecks(deal);
  const breaches = checks.filter((c) => c.breach);
  const thin = checks.filter((c) => !c.breach && headroomStatus(c.headroom) === 'thin');

  if (!hasRun && !/upload|file|pdf|attach|deal/.test(q)) {
    return `Load or upload a deal and press Run analysis — then I can answer questions about ${deal.name}: its leverage, risk score, covenant headroom, or my recommendation.`;
  }

  if (/leverage|levered/.test(q)) {
    const lev = deal.financials.leverageX;
    const outer =
      Number.isFinite(lev) && lev > LEVERAGE_OUTER_LIMIT
        ? ` It is also above the ${fmtX(LEVERAGE_OUTER_LIMIT)} house outer limit, which declines a deal on its own.`
        : '';
    const c = checks.find((k) => k.kind === 'leverage');
    if (!c || c.headroom === null) return `Total leverage is ${Number.isFinite(lev) ? fmtX(lev) : 'not measurable'}.${outer}`;
    const h = fmtHeadroom(c.headroom);
    switch (headroomStatus(c.headroom)) {
      case 'breach':
        return `Total leverage is ${c.actual} against the ${c.threshold} covenant: a breach (${h} headroom). That's why I flagged it and held the deal for a human.${outer}`;
      case 'thin':
        return `Total leverage is ${c.actual}: inside the ${c.threshold} covenant, but with thin headroom (${h}, policy cushion ${cushion}); that alone keeps the deal from a clean approval.${outer}`;
      default:
        return `Total leverage is ${c.actual}, inside the ${c.threshold} covenant with ${h} headroom (policy cushion ${cushion}).${outer}`;
    }
  }

  // Check covenant before risk so "covenant risks" resolves to the covenant answer.
  if (/covenant|headroom|cushion/.test(q)) {
    const parts: string[] = [];
    if (breaches.length > 0) {
      parts.push(`${breaches.length} of ${checks.length} covenant tests fail: ${breaches.map(covLine).join('; ')}.`);
    }
    if (thin.length > 0) {
      const lead = breaches.length > 0 ? 'Of the passing tests,' : `All ${checks.length} covenant tests pass, but`;
      parts.push(`${lead} ${listJoin(thin.map(covLine))} ${thin.length === 1 ? 'sits' : 'sit'} inside the ${cushion} policy cushion.`);
    }
    if (parts.length === 0) {
      const tight = checks.reduce<CovenantCheck | null>(
        (t, c) => (c.headroom !== null && (t === null || c.headroom < (t.headroom as number)) ? c : t),
        null,
      );
      parts.push(
        `All ${checks.length} covenant tests pass with at least the ${cushion} policy cushion` +
          (tight && tight.headroom !== null ? ` (tightest: ${tight.name}, ${fmtHeadroom(tight.headroom)} headroom).` : '.'),
      );
    }
    return parts.join(' ');
  }

  if (/risk|score|rating/.test(q)) {
    const s = deal.risk.score;
    const line =
      s >= DECLINE_SCORE
        ? `at or above the ${DECLINE_SCORE} decline line`
        : s >= REFER_SCORE
          ? `at or above the ${REFER_SCORE} referral line (below the ${DECLINE_SCORE} decline line)`
          : `under the ${REFER_SCORE} referral line`;
    return `Risk score is ${s}/100 (${deal.risk.rating}), ${line}. Top drivers: ${deal.risk.drivers
      .slice(0, 2)
      .map((d) => d.factor)
      .join('; ')}.`;
  }

  if (/what.?if|waiver|waive|step.?down|stress|scenario|reset|amend/.test(q)) {
    const tail = ' To test other figures, stress EBITDA, debt, rate and liquidity in the what-if sandbox: it runs the same decision rule.';
    if (breaches.length === 0 && thin.length === 0) {
      return `Every covenant already clears with at least the ${cushion} policy cushion, so there is nothing to waive.${tail}`;
    }
    const reset = resetTerms(checks);
    const cure = findCure(deal);
    const cureLine =
      cure && cure.contribution > 0
        ? ` The structure that does clear it: ${fmtM(cure.contribution)} of sponsor equity (${fmtM(cure.debtPaydown)} paydown${
            cure.liquidityTopUp > 0 ? `, ${fmtM(cure.liquidityTopUp)} to liquidity` : ''
          }).`
        : cure
          ? ''
          : ' No sponsor equity within policy clears it either.';
    // amending a term never verifies a figure: a verification hold stays a hold
    const held =
      pkg && pkg.decisionBasis === 'unverified-data' ? ' Whatever the terms, the memo stays held until the extracted figures are verified.' : '';
    if (!reset) {
      const holding = [...breaches, ...thin].map((c) => c.name);
      return `A waiver of the leverage ceiling or the liquidity floor would not change the call: ${
        holding.length === 1 ? `the test holding ${deal.name} back is ${holding[0]}` : `the tests holding ${deal.name} back are ${listJoin(holding)}`
      }, which the amend-terms control does not cover.${cureLine}${held}${tail}`;
    }
    const am = amendedOutcome(deal, reset.overrides);
    if (am.recommendation === 'approve') {
      return `Under the same decision rule, resetting the terms to ${listJoin(reset.terms)} would approve ${deal.name}: every covenant then clears with the ${cushion} cushion. Those terms can be amended before countersigning.${cureLine}${held}`;
    }
    return `A waiver alone won't get ${deal.name} to approve: with ${listJoin(reset.terms)} the same rule still gives ${word(am.recommendation)}. ${am.reasons[0] ?? ''}${cureLine}${held}${tail}`;
  }

  if (/why|recommend|decision|approve|decline|escalat/.test(q)) {
    if (pkg) {
      const head = pkg.restructure
        ? `On revision ${pkg.revision} I recommend ${word(pkg.recommendation)} on the revised structure.`
        : `I recommended ${word(pkg.recommendation)}.`;
      // the package's own reasons; a legacy package without them falls back to its summary, or
      // to the rule's reasons on the filed figures when those reach the same call
      let reasons = pkg.decisionReasons && pkg.decisionReasons.length > 0 ? pkg.decisionReasons.join(' ') : pkg.summary;
      if (!reasons) {
        const filed = decisionForDeal(deal, { sizeCure: true });
        reasons = filed.recommendation === pkg.recommendation ? filed.reasons.join(' ') : '';
      }
      // a verification hold is not a verdict on the figures: say what they would imply
      const implied =
        pkg.decisionBasis === 'unverified-data' && !pkg.restructure
          ? ` As extracted, the figures point to ${word(decisionForDeal(deal).recommendation)}; verification comes first.`
          : '';
      return `${head}${reasons ? ` ${reasons}` : ''}${implied}`;
    }
    const d = decisionForDeal(deal, { sizeCure: true });
    return `On the filed figures the decision rule gives ${word(d.recommendation)}. ${d.reasons.join(' ')}`;
  }

  if (/summar|overview|tl;?dr/.test(q)) {
    return (pkg && pkg.summary) || deal.memoSummary;
  }

  const thinPart = thin.length > 0 ? `, ${thin.length} inside the ${cushion} cushion` : '';
  return `For ${deal.name}: risk ${deal.risk.score}/100, ${breaches.length} covenant breach${
    breaches.length === 1 ? '' : 'es'
  }${thinPart}, recommendation ${pkg ? pkg.recommendation : 'pending — run the analysis'}. Ask me about leverage, covenants, the risk score, or the recommendation.`;
}
