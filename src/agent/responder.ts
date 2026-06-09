// ---------------------------------------------------------------------------
// A small rule-based responder for the composer's follow-up questions. It reads
// the current deal + run state and answers in natural language. Not an LLM — a
// scripted Q&A over the deal data, which is honest for a mocked backend and
// enough to demo the "ask the agent about its work" interaction.
// ---------------------------------------------------------------------------

import type { Deal } from './mockData';
import type { ApprovalPackage } from './types';

export function answerQuestion(
  deal: Deal,
  hasRun: boolean,
  pkg: ApprovalPackage | null,
  question: string,
): string {
  const q = question.toLowerCase();
  const breaches = deal.covenants.filter((c) => c.status === 'breach');

  if (!hasRun && !/upload|file|pdf|attach|deal/.test(q)) {
    return `Load or upload a deal and press Run analysis — then I can answer questions about ${deal.name}: its leverage, risk score, covenant breaches, or my recommendation.`;
  }

  if (/leverage|levered/.test(q)) {
    const lev = deal.financials.leverageX;
    return lev > 4
      ? `Total leverage is ${lev}x against the ≤ 4.00x covenant — a breach of ${(lev - 4).toFixed(2)}x. That's why I flagged it and held the deal for a human.`
      : `Total leverage is ${lev}x, comfortably inside the ≤ 4.00x covenant.`;
  }

  // Check covenant before risk so "covenant risks" resolves to the covenant answer.
  if (/covenant/.test(q)) {
    return breaches.length
      ? `${breaches.length} of ${deal.covenants.length} covenant tests fail: ${breaches
          .map((c) => `${c.name} (${c.actual} vs ${c.threshold})`)
          .join('; ')}.`
      : `All ${deal.covenants.length} covenant tests pass with headroom.`;
  }

  if (/risk|score|rating/.test(q)) {
    return `Risk score is ${deal.risk.score}/100 (${deal.risk.rating}). Top drivers: ${deal.risk.drivers
      .slice(0, 2)
      .map((d) => d.factor)
      .join('; ')}.`;
  }

  if (/what.?if|waiver|step.?down|stress|scenario/.test(q)) {
    return `The lever is the covenant package: a waiver or a leverage step-down that clears the ${
      breaches.length || 'breached'
    } failing test(s) would move the recommendation toward approve. I can't re-run a hypothetical in this prototype, but that's where I'd point the structuring conversation.`;
  }

  if (/why|recommend|decision|approve|decline|escalat/.test(q)) {
    return pkg ? `I recommended ${pkg.recommendation.toUpperCase()}. ${deal.memoSummary}` : deal.memoSummary;
  }

  if (/summar|overview|tl;?dr/.test(q)) {
    return deal.memoSummary;
  }

  return `For ${deal.name}: risk ${deal.risk.score}/100, ${breaches.length} covenant breach${
    breaches.length === 1 ? '' : 'es'
  }, recommendation ${pkg ? pkg.recommendation : 'pending — run the analysis'}. Ask me about leverage, covenants, the risk score, or the recommendation.`;
}
