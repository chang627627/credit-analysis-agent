// ---------------------------------------------------------------------------
// The "backend" — a small portfolio of deals the agent can analyze. Each deal
// carries its own document, extracted figures, risk score and covenant tests,
// so selecting a different deal produces a genuinely different run and outcome
// (approve / escalate / decline). In a real system these come from a document-
// extraction model and a risk engine; here they're canned for a deterministic demo.
// ---------------------------------------------------------------------------

export interface DealDocument {
  title: string;
  borrower: string;
  facility: string;
  body: string;
}

export interface ExtractedFinancials {
  revenueTtm: number;
  ebitdaTtm: number;
  ebitdaMarginPct: number;
  totalDebt: number;
  leverageX: number;
  interestCoverageX: number;
  fixedChargeCoverageX: number;
  liquidity: number;
}

export interface RiskScore {
  score: number;
  scale: string;
  rating: string;
  drivers: { factor: string; impact: string }[];
}

export interface CovenantTest {
  name: string;
  threshold: string;
  actual: string;
  status: 'pass' | 'breach';
}

export interface DealExtraFlag {
  severity: 'info' | 'warning' | 'critical';
  message: string;
  needsHuman: boolean;
}

export interface Deal {
  id: string;
  name: string;
  uploaded?: boolean;
  memoId: string;
  document: DealDocument;
  financials: ExtractedFinancials;
  risk: RiskScore;
  covenants: CovenantTest[];
  extraFlags: DealExtraFlag[];
  memoSummary: string;
}

// --- Deal 1: Project Atlas — industrials, breaches leverage → ESCALATE --------
const ATLAS: Deal = {
  id: 'atlas',
  name: 'Project Atlas',
  memoId: 'CAM-2026-0417',
  document: {
    title: 'Project Atlas — Confidential Information Memorandum',
    borrower: 'Atlas Industrial Holdings, LLC',
    facility: 'Senior Secured Term Loan B — $45.0M',
    body: `Atlas Industrial Holdings ("the Company") is a leading manufacturer of
precision-machined components for the aerospace and energy sectors, headquartered
in Cleveland, OH. The Company is seeking a $45.0M Senior Secured Term Loan B to
refinance existing indebtedness and fund a tuck-in acquisition.

For the trailing twelve months ended March 31, the Company generated revenue of
$128.4M and Adjusted EBITDA of $22.6M, a 17.6% margin. Pro forma for the financing,
total funded debt will be $96.3M.

The proposed facility carries a maintenance covenant package including a maximum
total leverage ratio, minimum interest and fixed-charge coverage tests, and a
minimum liquidity floor.`,
  },
  financials: {
    revenueTtm: 128.4,
    ebitdaTtm: 22.6,
    ebitdaMarginPct: 17.6,
    totalDebt: 96.3,
    leverageX: 4.26,
    interestCoverageX: 2.1,
    fixedChargeCoverageX: 1.18,
    liquidity: 14.2,
  },
  risk: {
    score: 58,
    scale: '0–100 (higher = riskier)',
    rating: 'B2 / Speculative',
    drivers: [
      { factor: 'Total leverage 4.26x', impact: 'adds risk · high' },
      { factor: 'Interest coverage 2.10x', impact: 'adds risk · moderate' },
      { factor: 'EBITDA margin 17.6%', impact: 'reduces risk · favorable' },
      { factor: 'Sector cyclicality (industrials)', impact: 'adds risk · moderate' },
    ],
  },
  covenants: [
    { name: 'Max Total Leverage', threshold: '≤ 4.00x', actual: '4.26x', status: 'breach' },
    { name: 'Min Interest Coverage', threshold: '≥ 2.00x', actual: '2.10x', status: 'pass' },
    { name: 'Min Fixed-Charge Coverage', threshold: '≥ 1.10x', actual: '1.18x', status: 'pass' },
    { name: 'Min Liquidity', threshold: '≥ $10.0M', actual: '$14.2M', status: 'pass' },
  ],
  extraFlags: [
    {
      severity: 'warning',
      message: 'Fixed-charge coverage 1.18x leaves only thin headroom over the 1.10x floor.',
      needsHuman: false,
    },
  ],
  memoSummary:
    'Atlas offers an acceptable spread for the risk, but total leverage of 4.26x breaches the proposed 4.00x covenant. Recommend escalation to a credit officer for a waiver or a structure adjustment (e.g. a step-down or additional equity) before approval.',
};

// --- Deal 2: Project Meridian — SaaS, all covenants pass → APPROVE -----------
const MERIDIAN: Deal = {
  id: 'meridian',
  name: 'Project Meridian',
  memoId: 'CAM-2026-0418',
  document: {
    title: 'Project Meridian — Confidential Information Memorandum',
    borrower: 'Meridian Cloud Systems, Inc.',
    facility: 'Senior Secured Term Loan A — $30.0M',
    body: `Meridian Cloud Systems ("the Company") provides subscription workflow software
to mid-market healthcare providers, with ~92% recurring revenue and net revenue
retention of 114%. The Company is seeking a $30.0M Senior Secured Term Loan A to
fund go-to-market expansion.

For the trailing twelve months, the Company generated revenue of $84.0M and Adjusted
EBITDA of $25.2M, a 30.0% margin. Pro forma total funded debt will be $70.6M.

The covenant package mirrors the sponsor's other software credits: a maximum total
leverage ratio, minimum coverage tests, and a minimum liquidity floor.`,
  },
  financials: {
    revenueTtm: 84.0,
    ebitdaTtm: 25.2,
    ebitdaMarginPct: 30.0,
    totalDebt: 70.6,
    leverageX: 2.8,
    interestCoverageX: 4.8,
    fixedChargeCoverageX: 1.95,
    liquidity: 22.0,
  },
  risk: {
    score: 28,
    scale: '0–100 (higher = riskier)',
    rating: 'Ba2 / Non-investment grade',
    drivers: [
      { factor: 'Total leverage 2.80x', impact: 'reduces risk · favorable' },
      { factor: 'Interest coverage 4.80x', impact: 'reduces risk · strong' },
      { factor: 'Recurring revenue ~92%', impact: 'reduces risk · strong' },
      { factor: 'Customer concentration', impact: 'adds risk · low' },
    ],
  },
  covenants: [
    { name: 'Max Total Leverage', threshold: '≤ 4.00x', actual: '2.80x', status: 'pass' },
    { name: 'Min Interest Coverage', threshold: '≥ 2.00x', actual: '4.80x', status: 'pass' },
    { name: 'Min Fixed-Charge Coverage', threshold: '≥ 1.10x', actual: '1.95x', status: 'pass' },
    { name: 'Min Liquidity', threshold: '≥ $10.0M', actual: '$22.0M', status: 'pass' },
  ],
  extraFlags: [],
  memoSummary:
    'Meridian shows strong recurring-revenue economics, low leverage (2.80x) and ample coverage. All four covenant tests pass with comfortable headroom. Recommend approval, subject to standard reporting conditions.',
};

// --- Deal 3: Project Cobalt — distressed, 4 breaches → DECLINE ---------------
const COBALT: Deal = {
  id: 'cobalt',
  name: 'Project Cobalt',
  memoId: 'CAM-2026-0419',
  document: {
    title: 'Project Cobalt — Confidential Information Memorandum',
    borrower: 'Cobalt Resources Holdings, LLC',
    facility: 'Senior Secured Term Loan B — $60.0M',
    body: `Cobalt Resources Holdings ("the Company") operates battery-metals mining and
processing assets exposed to volatile commodity prices. The Company is seeking a
$60.0M Senior Secured Term Loan B to refinance near-term maturities amid a downturn.

For the trailing twelve months, the Company generated revenue of $142.0M and Adjusted
EBITDA of $19.8M, a 13.9% margin. Pro forma total funded debt will be $112.0M.

The proposed covenant package is the standard maintenance set, but recent results sit
close to or below several of the proposed thresholds.`,
  },
  financials: {
    revenueTtm: 142.0,
    ebitdaTtm: 19.8,
    ebitdaMarginPct: 13.9,
    totalDebt: 112.0,
    leverageX: 5.66,
    interestCoverageX: 1.4,
    fixedChargeCoverageX: 0.95,
    liquidity: 6.5,
  },
  risk: {
    score: 82,
    scale: '0–100 (higher = riskier)',
    rating: 'Caa1 / Substantial risk',
    drivers: [
      { factor: 'Total leverage 5.66x', impact: 'adds risk · severe' },
      { factor: 'Interest coverage 1.40x', impact: 'adds risk · high' },
      { factor: 'Fixed-charge coverage 0.95x', impact: 'adds risk · severe' },
      { factor: 'Commodity-price exposure', impact: 'adds risk · high' },
    ],
  },
  covenants: [
    { name: 'Max Total Leverage', threshold: '≤ 4.00x', actual: '5.66x', status: 'breach' },
    { name: 'Min Interest Coverage', threshold: '≥ 2.00x', actual: '1.40x', status: 'breach' },
    { name: 'Min Fixed-Charge Coverage', threshold: '≥ 1.10x', actual: '0.95x', status: 'breach' },
    { name: 'Min Liquidity', threshold: '≥ $10.0M', actual: '$6.5M', status: 'breach' },
  ],
  extraFlags: [
    {
      severity: 'warning',
      message: 'Earnings are highly sensitive to commodity prices — covenant headroom could erode further.',
      needsHuman: false,
    },
  ],
  memoSummary:
    'Cobalt is levered 5.66x with sub-1.0x fixed-charge coverage and liquidity below the floor — all four covenant tests fail and the risk score is 82 (Caa1). Recommend declining as structured; any path forward requires materially more equity and a covenant reset.',
};

export const DEALS: Deal[] = [ATLAS, MERIDIAN, COBALT];
