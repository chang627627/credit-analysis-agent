// ---------------------------------------------------------------------------
// Simulated document extraction.
//
// We can't really parse a PDF without a backend, so "uploading" a file derives a
// plausible, internally-consistent deal from the FILE NAME. Different files →
// different figures → different covenant outcomes → different recommendations,
// so the upload feels real even though the parsing is mocked. In production this
// whole function is replaced by the document-extraction model.
// ---------------------------------------------------------------------------

import type { CovenantTest, Deal, RiskScore } from './mockData';
import { ratingFor } from './rating';
import { uid } from './util';
import { decisionForDeal, filedChecks, fmtHeadroom } from './whatif';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic pseudo-random in [0,1) from a seed and a salt. */
function rand(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function prettyName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return base.replace(/\b\w/g, (c) => c.toUpperCase()) || 'Untitled Deal';
}


export function synthesizeDealFromFile(fileName: string): Deal {
  const seed = hash(fileName);
  const name = prettyName(fileName);

  const leverageX = r2(2.0 + rand(seed, 1) * 4.5); // 2.0 – 6.5x
  const marginPct = r1(8 + rand(seed, 2) * 28); // 8 – 36%
  const revenueTtm = r1(50 + rand(seed, 3) * 200); // $50 – 250M
  const ebitdaTtm = r1((revenueTtm * marginPct) / 100);
  const totalDebt = r1(ebitdaTtm * leverageX);
  const interestCoverageX = r2(1.0 + rand(seed, 4) * 4.0); // 1.0 – 5.0x
  const fixedChargeCoverageX = r2(0.8 + rand(seed, 5) * 1.6); // 0.8 – 2.4x
  const liquidity = r1(4 + rand(seed, 6) * 30); // $4 – 34M

  const covenants: CovenantTest[] = [
    {
      name: 'Max Total Leverage',
      threshold: '≤ 4.00x',
      actual: `${leverageX.toFixed(2)}x`,
      status: leverageX > 4.0 ? 'breach' : 'pass',
    },
    {
      name: 'Min Interest Coverage',
      threshold: '≥ 2.00x',
      actual: `${interestCoverageX.toFixed(2)}x`,
      status: interestCoverageX < 2.0 ? 'breach' : 'pass',
    },
    {
      name: 'Min Fixed-Charge Coverage',
      threshold: '≥ 1.10x',
      actual: `${fixedChargeCoverageX.toFixed(2)}x`,
      status: fixedChargeCoverageX < 1.1 ? 'breach' : 'pass',
    },
    {
      name: 'Min Liquidity',
      threshold: '≥ $10.0M',
      actual: `$${liquidity.toFixed(1)}M`,
      status: liquidity < 10 ? 'breach' : 'pass',
    },
  ];

  const score = Math.round(
    clamp(
      18 +
        (leverageX - 2) * 12 +
        Math.max(0, 2.5 - interestCoverageX) * 8 +
        Math.max(0, 1.3 - fixedChargeCoverageX) * 22 +
        Math.max(0, 12 - liquidity) * 1.2,
      10,
      95,
    ),
  );

  const risk: RiskScore = {
    score,
    scale: '0–100 (higher = riskier)',
    rating: ratingFor(score),
    drivers: [
      { factor: `Total leverage ${leverageX.toFixed(2)}x`, impact: leverageX > 4 ? 'adds risk · high' : 'reduces risk · favorable' },
      { factor: `Interest coverage ${interestCoverageX.toFixed(2)}x`, impact: interestCoverageX < 2 ? 'adds risk · high' : 'reduces risk · strong' },
      { factor: `EBITDA margin ${marginPct.toFixed(1)}%`, impact: marginPct > 20 ? 'reduces risk · favorable' : 'adds risk · moderate' },
      { factor: `Fixed-charge coverage ${fixedChargeCoverageX.toFixed(2)}x`, impact: fixedChargeCoverageX < 1.1 ? 'adds risk · severe' : 'reduces risk · favorable' },
    ],
  };

  const breaches = covenants.filter((c) => c.status === 'breach');
  const facilitySize = r1(totalDebt * 0.45);

  const deal: Deal = {
    id: uid('deal'),
    name,
    uploaded: true,
    memoId: `CAM-2026-${(seed % 9000) + 1000}`,
    document: {
      title: `${name} — Confidential Information Memorandum`,
      borrower: `${name} Holdings, LLC`,
      facility: `Senior Secured Term Loan — $${facilitySize.toFixed(1)}M`,
      body: `${name} ("the Company") is seeking a senior secured facility to refinance
existing indebtedness. Figures below were extracted from the uploaded memorandum.

For the trailing twelve months, the Company generated revenue of $${revenueTtm.toFixed(1)}M
and Adjusted EBITDA of $${ebitdaTtm.toFixed(1)}M, a ${marginPct.toFixed(1)}% margin. Pro forma
total funded debt is $${totalDebt.toFixed(1)}M, or ${leverageX.toFixed(2)}x leverage.

The proposed maintenance covenant package includes a maximum total leverage ratio,
minimum interest and fixed-charge coverage tests, and a minimum liquidity floor.`,
    },
    financials: {
      revenueTtm,
      ebitdaTtm,
      ebitdaMarginPct: marginPct,
      totalDebt,
      leverageX,
      interestCoverageX,
      fixedChargeCoverageX,
      liquidity,
    },
    risk,
    covenants,
    extraFlags:
      fixedChargeCoverageX >= 1.1 && fixedChargeCoverageX < 1.25
        ? [{ severity: 'warning', message: `Fixed-charge coverage ${fixedChargeCoverageX.toFixed(2)}x leaves thin headroom over the 1.10x floor.`, needsHuman: false }]
        : [],
    memoSummary: '',
  };

  // The summary states what the ONE decision rule says on the figures as
  // extracted. (An upload's readings sit under the confidence floor, so the
  // run's data gate will still hold the memo for verification.)
  const d = decisionForDeal(deal);
  const tightest = filedChecks(deal).find((c) => c.name === d.tightest);
  const testsLine = breaches.length
    ? `${breaches.length} of ${covenants.length} covenant tests fail.`
    : tightest && tightest.headroom !== null
      ? `All covenant tests pass; the tightest, ${tightest.metric.toLowerCase()}, has ${fmtHeadroom(tightest.headroom)} headroom.`
      : 'All covenant tests pass.';
  const ruleLine =
    d.recommendation === 'approve'
      ? 'approval, subject to standard conditions'
      : d.recommendation === 'decline'
        ? 'declining the deal as structured'
        : d.triggers.includes('breach-curable')
          ? 'escalation to a credit officer: the breach is curable with sponsor equity within policy'
          : 'escalation to a credit officer for the policy exceptions';
  deal.memoSummary = `${name} screens at ${leverageX.toFixed(2)}x leverage with a ${marginPct.toFixed(1)}% EBITDA margin and a risk score of ${score} (${ratingFor(score)}). ${testsLine} On the figures as extracted, the decision rule points to ${ruleLine}.`;
  return deal;
}
