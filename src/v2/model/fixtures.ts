// ---------------------------------------------------------------------------
// Countersign V2 · fixture views (spec §9.4 stage 1, Appendix A). Fully
// populated view objects with the engine's golden values. The stage-1 stub
// selectors return these, and the kit page uses them for specimens. Engine
// strings (flag messages, summaries, reasoning) are reproduced as the engine
// writes them; their em dashes are interpolated from EM, never typed.
// ---------------------------------------------------------------------------

import { AUTO_NOTE, COPY, tokenOf } from './vocab';
import { EM, MINUS } from './format';
import type {
  Actor,
  AskView,
  BookItem,
  BookRow,
  BookView,
  ContentsView,
  CovenantRow,
  DeskRow,
  DeskView,
  DocBarView,
  ExhibitView,
  FigureRow,
  FileView,
  HeaderView,
  KeyFigureView,
  LedgerChip,
  LedgerRow,
  LedgerRun,
  LedgerView,
  NoteView,
  PeersBody,
  PolicyView,
  RecommendationBody,
  RevisionBody,
  RiskBody,
  SectionView,
  SignatureView,
  SourceView,
  StressView,
  StubView,
  TopBarView,
  AppendixView,
} from './types';

const M = MINUS;
const APPROVE = tokenOf('approve');
const ESCALATE = tokenOf('escalate');
const DECLINE = tokenOf('decline');

// =============================================================================
// Top bar
// =============================================================================

const SPEEDS_1X = [
  { value: 0.5, label: '0.5×', checked: false },
  { value: 1, label: '1×', checked: true },
  { value: 2, label: '2×', checked: false },
  { value: 4, label: '4×', checked: false },
];

/** Atlas at the gate, three open monitor items, policy off. */
export const FX_TOPBAR: TopBarView = {
  tabs: [
    { id: 'desk', label: 'Desk', count: '1', countTone: 'accent' },
    { id: 'book', label: 'Book', count: '3', countTone: 'warn' },
    { id: 'ledger', label: 'Ledger', count: null, countTone: 'ink-3' },
  ],
  active: 'desk',
  policyOn: false,
  policyLabel: COPY.policyLabel,
  policyShort: COPY.policyShort,
  speedLabel: '1×',
  speeds: SPEEDS_1X,
  searchKbd: '⌘K',
  sectionTitle: 'Desk',
};

// =============================================================================
// Desk
// =============================================================================

const DROP_OPEN = { label: COPY.dropLabel, sub: COPY.dropSub, chooseLabel: COPY.dropChoose, disabledReason: null };

const DESK_ROW_BASE = {
  uploaded: false,
  call: null,
  stage: { state: 'pending' as const, text: 'Not started' },
  subMeta: null,
  action: { kind: 'draft' as const, label: COPY.draftMemo, variant: 'secondary' as const, disabled: false },
  confirm: null,
};

const DESK_ATLAS: DeskRow = {
  ...DESK_ROW_BASE,
  dealId: 'atlas',
  name: 'Project Atlas',
  borrower: 'Atlas Industrial Holdings, LLC',
  facility: 'Senior Secured Term Loan B · $45.0M',
  leverage: { text: '4.26x', tone: 'bad' },
};
const DESK_MERIDIAN: DeskRow = {
  ...DESK_ROW_BASE,
  dealId: 'meridian',
  name: 'Project Meridian',
  borrower: 'Meridian Cloud Systems, Inc.',
  facility: 'Senior Secured Term Loan A · $30.0M',
  leverage: { text: '2.80x', tone: 'ink' },
};
const DESK_COBALT: DeskRow = {
  ...DESK_ROW_BASE,
  dealId: 'cobalt',
  name: 'Project Cobalt',
  borrower: 'Cobalt Resources Holdings, LLC',
  facility: 'Senior Secured Term Loan B · $60.0M',
  leverage: { text: '5.66x', tone: 'bad' },
};

/** Fresh session: three sample files, nothing started. */
export const FX_DESK_INITIAL: DeskView = {
  title: COPY.deskTitle,
  summary: COPY.deskInitialSummary,
  groups: [
    { stage: 'not-started', label: COPY.groupLabel['not-started'], status: 'pending', count: '3', rows: [DESK_ATLAS, DESK_MERIDIAN, DESK_COBALT] },
  ],
  parsing: null,
  drop: DROP_OPEN,
};

/** Atlas suspended at the rev 1 gate for 1:12: the Desk's only primary. */
export const FX_DESK_ATLAS_GATE: DeskView = {
  title: COPY.deskTitle,
  summary: '3 files · 1 awaiting your countersignature · extraction is simulated',
  groups: [
    {
      stage: 'awaiting',
      label: COPY.groupLabel.awaiting,
      status: 'awaiting',
      count: '1',
      rows: [
        {
          ...DESK_ATLAS,
          call: ESCALATE,
          stage: { state: 'awaiting', text: 'Awaiting you · rev 1 · waiting 1:12' },
          action: { kind: 'review', label: COPY.reviewAndCountersign, variant: 'primary', disabled: false },
        },
      ],
    },
    { stage: 'not-started', label: COPY.groupLabel['not-started'], status: 'pending', count: '2', rows: [DESK_MERIDIAN, DESK_COBALT] },
  ],
  parsing: null,
  drop: { ...DROP_OPEN, disabledReason: 'Finish or stop the live run on Project Atlas to add a file.' },
};

// =============================================================================
// Shared file atoms: Project Atlas
// =============================================================================

const ATLAS_FLAG_BREACH = 'flag_24';
const ATLAS_FLAG_FCC = 'flag_25';
const ATLAS_FLAG_SENDBACK = 'flag_41';
const ATLAS_FLAG_RESTRUCTURE = 'flag_42';

const ATLAS_BREACH_MSG = `Max Total Leverage 4.26x breaches the ≤ 4.00x covenant ${EM} cannot auto-approve.`;
const ATLAS_FCC_MSG = 'Fixed-charge coverage 1.18x leaves only thin headroom over the 1.10x floor.';
/** The rev 1 send-back note: Draft from notes, then edited by the reviewer. */
const ATLAS_RETURN_NOTE = 'Breaches on record: Max Total Leverage 4.26x breaches the ≤ 4.00x covenant. Bring back a structure that clears it.';
const ATLAS_SENDBACK_MSG = `Reviewer send-back (rev 1 · note agent-drafted, edited by reviewer): ${ATLAS_RETURN_NOTE}`;
const ATLAS_RESTRUCTURE_MSG = `Restructure proposed: $6M sponsor equity ($6M debt paydown) ${EM} every covenant passes on the revised structure.`;
const ATLAS_SUMMARY =
  'Atlas offers an acceptable spread for the risk, but total leverage of 4.26x breaches the proposed 4.00x covenant. Recommend escalation to a credit officer for a waiver or a structure adjustment (e.g. a step-down or additional equity) before approval.';
const ATLAS_REV2_SUMMARY =
  `Revised structure: $6M sponsor equity ${EM} $6M debt paydown. Total debt falls to $90.3M (leverage 4.00x), ` +
  `every covenant passes, and the risk score recomputes to 55 (B2 / Speculative) ${EM} through the same ` +
  'decision rule as the original analysis. Recommend approval of the revised structure, subject to the sponsor commitment.';

const FILES_INITIAL: DocBarView['files'] = [
  { dealId: 'atlas', label: 'Project Atlas', meta: 'Not started' },
  { dealId: 'meridian', label: 'Project Meridian', meta: 'Not started' },
  { dealId: 'cobalt', label: 'Project Cobalt', meta: 'Not started' },
];
const filesWithAtlas = (meta: string): DocBarView['files'] => [{ dealId: 'atlas', label: 'Project Atlas', meta }, FILES_INITIAL[1], FILES_INITIAL[2]];

// ---- stubs (the margin's raw tool records)

const REASON_EXTRACT = `I'll ground everything in the source document first ${EM} pulling revenue, EBITDA, leverage, coverage and liquidity straight from the memorandum rather than relying on priors.`;
const REASON_RISK =
  'With the financials extracted I can score the credit. Leverage and coverage dominate here, so I weight those most heavily and map the result onto the internal rating scale.';
const REASON_PEERS = `The reviewer kept peer benchmarking in the plan, so I'll place the credit in its sector context ${EM} leverage, coverage and margin against the comparable set ${EM} before testing covenants.`;
const REASON_COVENANTS =
  'Now the part that actually gates the deal: testing each proposed covenant against the extracted figures. A single breach changes the recommendation.';
const REASON_PACKAGE_ATLAS = `I have what I need ${EM} but 1 covenant fails, so I will not auto-approve. I’ll assemble the memo and route it to a human credit officer.`;
const REASON_REWORK_ATLAS =
  `The reviewer sent this back: “${ATLAS_RETURN_NOTE}” Restating the filed figures wouldn't change anything ${EM} so I'll treat the send-back as ` +
  'authorization to restructure within policy limits: search for the smallest sponsor equity contribution that clears the whole covenant package, ' +
  're-derive the recommendation through the same decide rule, and reassemble revision 2 for a fresh countersign.';

const ATLAS_FINANCIALS = {
  revenueTtm: 128.4,
  ebitdaTtm: 22.6,
  ebitdaMarginPct: 17.6,
  totalDebt: 96.3,
  leverageX: 4.26,
  interestCoverageX: 2.1,
  fixedChargeCoverageX: 1.18,
  liquidity: 14.2,
};
const ATLAS_COVENANT_TESTS = [
  { name: 'Max Total Leverage', threshold: '≤ 4.00x', actual: '4.26x', status: 'breach' },
  { name: 'Min Interest Coverage', threshold: '≥ 2.00x', actual: '2.10x', status: 'pass' },
  { name: 'Min Fixed-Charge Coverage', threshold: '≥ 1.10x', actual: '1.18x', status: 'pass' },
  { name: 'Min Liquidity', threshold: '≥ $10.0M', actual: '$14.2M', status: 'pass' },
];

const STUB_EXTRACT: StubView = {
  stepId: 'step_extract',
  tool: 'Document Intelligence',
  meta: '1.1 s · 94%',
  confTone: 'ink-3',
  recordMeta: 'args 3 fields · result 8 fields',
  argsLabel: COPY.argsLabel,
  argsCount: '3 fields',
  args: { pages: '12–28', fields: ['revenue', 'ebitda', 'leverage', 'coverage', 'liquidity'], source: 'Project Atlas CIM.pdf' },
  resultLabel: COPY.resultLabel,
  resultCount: '8 fields',
  result: ATLAS_FINANCIALS,
  reasoning: REASON_EXTRACT,
};
const STUB_RISK: StubView = {
  stepId: 'step_risk',
  tool: 'Risk Engine',
  meta: '800 ms · 88%',
  confTone: 'warn',
  recordMeta: 'args 2 fields · result 4 fields',
  argsLabel: COPY.argsLabel,
  argsCount: '2 fields',
  args: { model: 'internal-pd-v3', inputs: 'extracted_financials' },
  resultLabel: COPY.resultLabel,
  resultCount: '4 fields',
  result: {
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
  reasoning: REASON_RISK,
};
const STUB_PEERS: StubView = {
  stepId: 'step_peers',
  tool: 'Peer Benchmarks',
  meta: '850 ms · 86%',
  confTone: 'warn',
  recordMeta: 'args 2 fields · result 3 fields',
  argsLabel: COPY.argsLabel,
  argsCount: '2 fields',
  args: { universe: 'sector comparables (n=14)', metrics: ['leverage', 'coverage', 'margin'] },
  resultLabel: COPY.resultLabel,
  resultCount: '3 fields',
  result: {
    deal: { leverageX: 4.26, interestCoverageX: 2.1, ebitdaMarginPct: 17.6 },
    peers: [
      { cohort: 'Top quartile', leverageX: 3.07, interestCoverageX: 3.26, ebitdaMarginPct: 22.9 },
      { cohort: 'Sector median', leverageX: 3.96, interestCoverageX: 2.35, ebitdaMarginPct: 18.3 },
      { cohort: 'Bottom quartile', leverageX: 5.2, interestCoverageX: 1.64, ebitdaMarginPct: 13.4 },
    ],
    position: 'more levered than the sector median',
  },
  reasoning: REASON_PEERS,
};
const STUB_COVENANTS: StubView = {
  stepId: 'step_covenants',
  tool: 'Covenant Tester',
  meta: '900 ms · 97%',
  confTone: 'ink-3',
  recordMeta: 'args 2 fields · result 4 items',
  argsLabel: COPY.argsLabel,
  argsCount: '2 fields',
  args: { package: 'proposed_term_sheet_v2', tests: ['Max Total Leverage', 'Min Interest Coverage', 'Min Fixed-Charge Coverage', 'Min Liquidity'] },
  resultLabel: COPY.resultLabel,
  resultCount: '4 items',
  result: ATLAS_COVENANT_TESTS,
  reasoning: REASON_COVENANTS,
};
const STUB_PACKAGE: StubView = {
  stepId: 'step_package',
  tool: 'Memo Builder',
  meta: '700 ms · 91%',
  confTone: 'ink-3',
  recordMeta: 'args 2 fields · result 3 fields',
  argsLabel: COPY.argsLabel,
  argsCount: '2 fields',
  args: { template: 'credit-approval-memo', sections: ['summary', 'financials', 'risk', 'covenants', 'recommendation'] },
  resultLabel: COPY.resultLabel,
  resultCount: '3 fields',
  result: { memoId: 'CAM-2026-0417', sections: 5, attachments: ['audit_trail.json'] },
  reasoning: REASON_PACKAGE_ATLAS,
};
const STUB_REWORK_ATLAS: StubView = {
  stepId: 'step_rework_2',
  tool: 'Structuring Engine',
  meta: '950 ms · 90%',
  confTone: 'ink-3',
  recordMeta: 'args 5 fields · result 7 fields',
  argsLabel: COPY.argsLabel,
  argsCount: '5 fields',
  args: {
    objective: 'clear the covenant package',
    instrument: 'sponsor equity contribution',
    policyLimit: 'contribution ≤ 35% of total debt',
    revision: 2,
    reviewerNote: ATLAS_RETURN_NOTE,
  },
  resultLabel: COPY.resultLabel,
  resultCount: '7 fields',
  result: {
    viable: true,
    contributionM: 6,
    debtPaydownM: 6,
    liquidityTopUpM: 0,
    revised: { totalDebtM: 90.3, leverageX: 4, interestCoverageX: 2.24, liquidityM: 14.2, riskScore: 55 },
    breachesRemaining: 0,
    decidedBy: 'same decide() rule as the analysis and the what-if panel',
  },
  reasoning: REASON_REWORK_ATLAS,
};

// ---- notes (margin)

const NOTE_ATLAS_BREACH: NoteView = {
  id: `note:${ATLAS_FLAG_BREACH}`,
  flagId: ATLAS_FLAG_BREACH,
  kind: 'breach',
  tone: 'breach',
  status: 'breach',
  heading: 'Breach · Max Total Leverage',
  text: ATLAS_BREACH_MSG,
  meta: 'raised by Covenant Tester · 14:01:58',
  anchorId: 'cov:Max Total Leverage',
  counted: true,
  opened: false,
  actions: [
    { kind: 'show', label: COPY.showRow },
    { kind: 'trace', label: COPY.trace },
    { kind: 'amend', label: COPY.amendTerm },
  ],
  traceStepId: 'step_covenants',
  amendKind: 'leverage',
};
const NOTE_ATLAS_FCC: NoteView = {
  id: `note:${ATLAS_FLAG_FCC}`,
  flagId: ATLAS_FLAG_FCC,
  kind: 'watch',
  tone: 'watch',
  status: 'watch',
  heading: 'Watch · Min Fixed-Charge Coverage',
  text: ATLAS_FCC_MSG,
  meta: 'raised by Covenant Tester · 14:01:58',
  anchorId: 'cov:Min Fixed-Charge Coverage',
  counted: true,
  opened: false,
  actions: [
    { kind: 'show', label: COPY.showRow },
    { kind: 'trace', label: COPY.trace },
  ],
  traceStepId: 'step_covenants',
  amendKind: null,
};
const NOTE_ATLAS_EVIDENCE: NoteView = {
  id: 'note:evidence-check',
  flagId: null,
  kind: 'evidence-check',
  tone: 'info',
  status: 'info',
  heading: COPY.evidenceCheck,
  text: '3 of 8 figures are not quoted in the CIM: interest coverage, fixed-charge coverage and liquidity. They come from the extraction model; verify against the source.',
  meta: COPY.evidenceCheckMeta,
  anchorId: 'sec:financials',
  counted: false,
  opened: false,
  actions: [{ kind: 'trace', label: COPY.trace }],
  traceStepId: 'step_extract',
  amendKind: null,
};
/** After the seal (approve), counted notes read as signed over. */
const signedOver = (n: NoteView, opened: boolean): NoteView => ({
  ...n,
  tone: 'signed-over',
  status: 'signed-over',
  opened,
  actions: n.actions.filter((a) => a.kind !== 'amend'),
  amendKind: null,
});
/** At a restructured revision, rev 1's filed-figure notes are superseded (not counted). */
const superseded = (n: NoteView): NoteView => ({
  ...n,
  tone: 'info',
  counted: false,
  meta: `${n.meta} · superseded by rev 2`,
  actions: n.actions.filter((a) => a.kind !== 'amend'),
  amendKind: null,
});
const NOTE_ATLAS_SENDBACK: NoteView = {
  id: `note:${ATLAS_FLAG_SENDBACK}`,
  flagId: ATLAS_FLAG_SENDBACK,
  kind: 'send-back',
  tone: 'returned',
  status: 'returned',
  heading: 'Returned for revision · rev 1',
  text: ATLAS_SENDBACK_MSG,
  meta: 'Reviewer · rev 1 · 14:05:48',
  anchorId: 'sec:revision-2',
  counted: false,
  opened: false,
  actions: [{ kind: 'trace', label: COPY.trace }],
  traceStepId: 'step_rework_2',
  amendKind: null,
};
const NOTE_ATLAS_RESTRUCTURE: NoteView = {
  id: `note:${ATLAS_FLAG_RESTRUCTURE}`,
  flagId: ATLAS_FLAG_RESTRUCTURE,
  kind: 'restructure',
  tone: 'info',
  status: 'info',
  heading: 'Restructure proposed',
  text: ATLAS_RESTRUCTURE_MSG,
  meta: 'raised by Structuring Engine · 14:05:58',
  anchorId: 'sec:revision-2',
  counted: false,
  opened: false,
  actions: [{ kind: 'trace', label: COPY.trace }],
  traceStepId: 'step_rework_2',
  amendKind: null,
};

// ---- section bodies

const quoted = (para: number, offset: number, citeIndex: number) =>
  ({ cls: 'quoted', text: 'Quoted', para, paraLabel: `CIM para ${para}`, markId: `m${para}-${offset}`, citeIndex }) as const;
const UNQUOTED = { cls: 'unquoted', text: 'Unquoted · extracted' } as const;

const ATLAS_MARKS = ['m2-80', 'm2-111', 'm2-121', 'm2-190'];

const FIGURES_ATLAS: FigureRow[] = [
  { id: 'revenue', anchorId: 'fig:revenue', label: 'Revenue (TTM)', value: '$128.4M', evidence: quoted(2, 80, 0) },
  { id: 'ebitda', anchorId: 'fig:ebitda', label: 'Adj. EBITDA', value: '$22.6M', evidence: quoted(2, 111, 1) },
  { id: 'margin', anchorId: 'fig:margin', label: 'EBITDA margin', value: '17.6%', evidence: quoted(2, 121, 2) },
  { id: 'debt', anchorId: 'fig:debt', label: 'Total debt', value: '$96.3M', evidence: quoted(2, 190, 3) },
  {
    id: 'leverage',
    anchorId: 'fig:leverage',
    label: 'Total leverage',
    value: '4.26x',
    evidence: {
      cls: 'derived',
      text: 'Derived',
      formula: '96.3 ÷ 22.6',
      operands: [
        { text: '96.3', markId: 'm2-190', citeIndex: 3 },
        { text: '22.6', markId: 'm2-111', citeIndex: 1 },
      ],
    },
  },
  { id: 'interest', anchorId: 'fig:interest', label: 'Interest coverage', value: '2.10x', evidence: UNQUOTED },
  { id: 'fixed', anchorId: 'fig:fixed', label: 'Fixed-charge coverage', value: '1.18x', evidence: UNQUOTED },
  { id: 'liquidity', anchorId: 'fig:liquidity', label: 'Liquidity', value: '$14.2M', evidence: UNQUOTED },
];

const KEYFIGS_ATLAS: KeyFigureView[] = [
  {
    label: 'Revenue (TTM)',
    value: '$128.4M',
    sub: null,
    caption: null,
    tone: 'ink',
    dot: null,
    evidenceText: 'Quoted · CIM para 2',
    traceStepId: 'step_extract',
    anchorId: 'fig:revenue',
    ariaLabel: 'Revenue (TTM) $128.4M. Quoted · CIM para 2. Trace to Document Intelligence.',
  },
  {
    label: 'Adj. EBITDA',
    value: '$22.6M',
    sub: '17.6% margin',
    caption: null,
    tone: 'ink',
    dot: null,
    evidenceText: 'Quoted · CIM para 2',
    traceStepId: 'step_extract',
    anchorId: 'fig:ebitda',
    ariaLabel: 'Adj. EBITDA $22.6M. Quoted · CIM para 2. Trace to Document Intelligence.',
  },
  {
    label: 'Total leverage',
    value: '4.26x',
    sub: null,
    caption: '0.26x over ≤ 4.00x',
    tone: 'bad',
    dot: 'bad',
    evidenceText: 'Derived · 96.3 ÷ 22.6',
    traceStepId: 'step_extract',
    anchorId: 'fig:leverage',
    ariaLabel: 'Total leverage 4.26x, 0.26x over ≤ 4.00x. Derived · 96.3 ÷ 22.6. Trace to Document Intelligence.',
  },
  {
    label: 'Interest coverage',
    value: '2.10x',
    sub: null,
    caption: '0.10x room · ≥ 2.00x',
    tone: 'warn',
    dot: 'warn',
    evidenceText: 'Unquoted · extracted',
    traceStepId: 'step_extract',
    anchorId: 'fig:interest',
    ariaLabel: 'Interest coverage 2.10x, 0.10x room · ≥ 2.00x. Unquoted · extracted. Trace to Document Intelligence.',
  },
  {
    label: 'Liquidity',
    value: '$14.2M',
    sub: null,
    caption: '$4.2M room · ≥ $10.0M',
    tone: 'ink',
    dot: null,
    evidenceText: 'Unquoted · extracted',
    traceStepId: 'step_extract',
    anchorId: 'fig:liquidity',
    ariaLabel: 'Liquidity $14.2M, $4.2M room · ≥ $10.0M. Unquoted · extracted. Trace to Document Intelligence.',
  },
];

const REC_ATLAS: RecommendationBody = {
  basis: COPY.basisFiled,
  prior: null,
  token: ESCALATE,
  sentence: 'Escalate to a credit officer. 1 covenant breach rules out approval; risk 58 sits below the 75 decline line.',
  summary: ATLAS_SUMMARY,
  keyFigures: KEYFIGS_ATLAS,
  aidLabel: COPY.aidLabel,
  nearestFlip: `Nearest flip · Total debt ≤ $90.4M (${M}$5.9M) → APPROVE`,
  stressLinkLabel: COPY.stressLink,
  reworkLine: null,
};

const RISK_ATLAS: RiskBody = {
  scoreText: '58',
  outOf: COPY.riskOutOf,
  rating: 'B2 / Speculative',
  tone: 'warn',
  value: 58,
  tick: 75,
  tickCaption: COPY.riskTickCaption,
  evidence: { cls: 'model', text: 'Model output · Risk Engine (internal-pd-v3)' },
  drivers: [
    { factor: 'Total leverage 4.26x', impact: 'adds risk · high', tone: 'bad' },
    { factor: 'Interest coverage 2.10x', impact: 'adds risk · moderate', tone: 'warn' },
    { factor: 'EBITDA margin 17.6%', impact: 'reduces risk · favorable', tone: 'good' },
    { factor: 'Sector cyclicality (industrials)', impact: 'adds risk · moderate', tone: 'warn' },
  ],
};

const PEERS_ATLAS: PeersBody = {
  rows: [
    { cohort: 'This deal', leverage: '4.26x', interest: '2.10x', margin: '17.6%', isDeal: true },
    { cohort: 'Top quartile', leverage: '3.07x', interest: '3.26x', margin: '22.9%', isDeal: false },
    { cohort: 'Sector median', leverage: '3.96x', interest: '2.35x', margin: '18.3%', isDeal: false },
    { cohort: 'Bottom quartile', leverage: '5.20x', interest: '1.64x', margin: '13.4%', isDeal: false },
  ],
  position: 'Project Atlas is more levered than the sector median (3.96x). Comparables are simulated.',
};

const AMEND_LEVERAGE = { kind: 'leverage' as const, value: 4, step: 0.05, min: 1, max: 8, prefix: '≤ ', suffix: 'x' };
const AMEND_LIQUIDITY = { kind: 'liquidity' as const, value: 10, step: 0.5, min: 0, max: 50, prefix: '≥ $', suffix: 'M' };

/** Filed figures, no amend fields (sealed, snapshot, restructured revision). */
const COVENANTS_ATLAS: CovenantRow[] = [
  {
    anchorId: 'cov:Max Total Leverage',
    name: 'Max Total Leverage',
    threshold: '≤ 4.00x',
    amended: null,
    actual: '4.26x',
    cushion: { pct: -6.5, text: `${M}6.5%`, tone: 'bad' },
    status: 'breach',
    statusText: 'Breach',
    amend: null,
  },
  {
    anchorId: 'cov:Min Interest Coverage',
    name: 'Min Interest Coverage',
    threshold: '≥ 2.00x',
    amended: null,
    actual: '2.10x',
    cushion: { pct: 5, text: '+5.0%', tone: 'warn' },
    status: 'pass',
    statusText: 'Pass',
    amend: null,
  },
  {
    anchorId: 'cov:Min Fixed-Charge Coverage',
    name: 'Min Fixed-Charge Coverage',
    threshold: '≥ 1.10x',
    amended: null,
    actual: '1.18x',
    cushion: { pct: 7.3, text: '+7.3%', tone: 'warn' },
    status: 'pass',
    statusText: 'Pass',
    amend: null,
  },
  {
    anchorId: 'cov:Min Liquidity',
    name: 'Min Liquidity',
    threshold: '≥ $10.0M',
    amended: null,
    actual: '$14.2M',
    cushion: { pct: 42, text: '+42.0%', tone: 'neutral' },
    status: 'pass',
    statusText: 'Pass',
    amend: null,
  },
];
/** The live rev 1 gate: leverage and liquidity thresholds are AmendFields. */
const COVENANTS_ATLAS_GATE: CovenantRow[] = COVENANTS_ATLAS.map((c) =>
  c.name === 'Max Total Leverage' ? { ...c, amend: AMEND_LEVERAGE } : c.name === 'Min Liquidity' ? { ...c, amend: AMEND_LIQUIDITY } : c,
);

const REVISION_ATLAS: RevisionBody = {
  n: 2,
  returned: { quote: `“${ATLAS_RETURN_NOTE}”`, attribution: 'Reviewer · rev 1 · 14:05 · agent-drafted, edited by the reviewer' },
  viable: true,
  summary:
    'The Structuring Engine proposes $6.0M sponsor equity as $6.0M debt paydown. Every covenant passes on the revised structure, and risk recomputes to 55 (B2 / Speculative) through the same decide rule.',
  redline: [
    { label: 'Sponsor equity', from: '–', to: '$6.0M', unchanged: false, anchorId: 'rev2:equity' },
    { label: 'Total debt', from: '$96.3M', to: '$90.3M', unchanged: false, anchorId: 'rev2:debt' },
    { label: 'Total leverage', from: '4.26x', to: '4.00x', unchanged: false, anchorId: 'rev2:leverage' },
    { label: 'Interest coverage', from: '2.10x', to: '2.24x', unchanged: false, anchorId: 'rev2:interest' },
    { label: 'Liquidity', from: '$14.2M', to: '$14.2M', unchanged: true, anchorId: 'rev2:liquidity' },
    { label: 'Risk score', from: '58', to: '55', unchanged: false, anchorId: 'rev2:risk' },
    { label: 'Recommendation', from: 'ESCALATE', to: 'APPROVE', unchanged: false, anchorId: 'rev2:recommendation' },
  ],
  noCure: null,
};

// ---- sections

type SecOf<K extends SectionView['kind']> = Extract<SectionView, { kind: K }>;

const SECTION_BASE = { suffix: null, phase: 'set' as const, status: 'done' as const, statusLabel: 'Done', pendingLine: COPY.pendingSection, drafting: null };

const secRecommendation = (body: RecommendationBody | null, notes: NoteView[] = []): SecOf<'recommendation'> => ({
  ...SECTION_BASE,
  kind: 'recommendation',
  id: 'recommendation',
  anchorId: 'sec:recommendation',
  ordinal: '',
  heading: 'Recommendation',
  pendingLine: COPY.pendingRecommendation,
  stub: STUB_PACKAGE,
  notes,
  body,
});
const secFinancials = (body: FigureRow[] = FIGURES_ATLAS, stub: StubView = STUB_EXTRACT, notes: NoteView[] = []): SecOf<'financials'> => ({
  ...SECTION_BASE,
  kind: 'financials',
  id: 'financials',
  anchorId: 'sec:financials',
  ordinal: '1',
  heading: 'Financials',
  stub,
  notes,
  body,
});
const secRisk = (body: RiskBody = RISK_ATLAS, stub: StubView = STUB_RISK, notes: NoteView[] = []): SecOf<'risk'> => ({
  ...SECTION_BASE,
  kind: 'risk',
  id: 'risk',
  anchorId: 'sec:risk',
  ordinal: '2',
  heading: 'Risk score and rating',
  stub,
  notes,
  body,
});
const secPeers = (body: PeersBody = PEERS_ATLAS, stub: StubView = STUB_PEERS, notes: NoteView[] = []): SecOf<'peers'> => ({
  ...SECTION_BASE,
  kind: 'peers',
  id: 'peers',
  anchorId: 'sec:peers',
  ordinal: '3',
  heading: 'Peer benchmarks',
  stub,
  notes,
  body,
});
const secCovenants = (body: CovenantRow[], notes: NoteView[], suffix = '· 1 of 4 breached', stub: StubView = STUB_COVENANTS): SecOf<'covenants'> => ({
  ...SECTION_BASE,
  kind: 'covenants',
  id: 'covenants',
  anchorId: 'sec:covenants',
  ordinal: '4',
  heading: 'Covenant compliance',
  suffix,
  stub,
  notes,
  body,
});

// ---- header, source, appendix

const HEADER_ATLAS: HeaderView = {
  eyebrow: COPY.eyebrow,
  borrower: 'Atlas Industrial Holdings, LLC',
  meta: 'Senior Secured Term Loan B · $45.0M · CAM-2026-0417 · rev 1',
  prepared: 'Prepared by Credit Analyst (agent) · 17 Oct 2026, 14:02 · source: Project Atlas CIM, paras 1 to 3',
  uploaded: false,
  cancelled: null,
  seal: null,
};
const HEADER_ATLAS_NOT_DRAFTED: HeaderView = {
  ...HEADER_ATLAS,
  meta: 'Senior Secured Term Loan B · $45.0M · CAM-2026-0417',
  prepared: 'Prepared by Credit Analyst (agent) · not drafted yet · source: Project Atlas CIM, paras 1 to 3',
};

const ATLAS_P1 =
  'Atlas Industrial Holdings ("the Company") is a leading manufacturer of precision-machined components for the aerospace and energy sectors, headquartered in Cleveland, OH. The Company is seeking a $45.0M Senior Secured Term Loan B to refinance existing indebtedness and fund a tuck-in acquisition.';
const ATLAS_P3 =
  'The proposed facility carries a maintenance covenant package including a maximum total leverage ratio, minimum interest and fixed-charge coverage tests, and a minimum liquidity floor.';

const atlasParagraphs = (active: string | null): SourceView['paragraphs'] => [
  { n: 1, label: '1', segments: [{ text: ATLAS_P1, markId: null, active: false }] },
  {
    n: 2,
    label: '2',
    segments: [
      { text: 'For the trailing twelve months ended March 31, the Company generated revenue of ', markId: null, active: false },
      { text: '$128.4M', markId: 'm2-80', active: active === 'm2-80' },
      { text: ' and Adjusted EBITDA of ', markId: null, active: false },
      { text: '$22.6M', markId: 'm2-111', active: active === 'm2-111' },
      { text: ', a ', markId: null, active: false },
      { text: '17.6%', markId: 'm2-121', active: active === 'm2-121' },
      { text: ' margin. Pro forma for the financing, total funded debt will be ', markId: null, active: false },
      { text: '$96.3M', markId: 'm2-190', active: active === 'm2-190' },
      { text: '.', markId: null, active: false },
    ],
  },
  { n: 3, label: '3', segments: [{ text: ATLAS_P3, markId: null, active: false }] },
];

const SOURCE_ATLAS: SourceView = {
  open: false,
  heading: 'Source · Project Atlas CIM.pdf',
  title: 'Project Atlas · Confidential Information Memorandum',
  borrower: 'Atlas Industrial Holdings, LLC',
  facility: 'Senior Secured Term Loan B · $45.0M',
  simulated: false,
  paragraphs: atlasParagraphs(null),
  stepper: null,
  quoted: { count: 4, markIds: ATLAS_MARKS, showAllLabel: 'Show all quoted (4)' },
  spineLabel: COPY.sourceSpine,
  spineCount: '4',
  toggleLabel: 'Source CIM · 4 quoted',
};
/** The source pushed open on the CIM para 2 revenue cite ("1 of 4"). */
const SOURCE_ATLAS_CITED: SourceView = {
  ...SOURCE_ATLAS,
  open: true,
  paragraphs: atlasParagraphs('m2-80'),
  stepper: { label: '1 of 4', hasPrev: false, hasNext: true },
};

const APPENDIX_ATLAS: AppendixView = {
  heading: COPY.appendixHeading,
  meta: 'Simulated drift on the filed figures · sweep #4 · 6 s ago',
  rows: [
    { name: 'Max Total Leverage', threshold: '≤ 4.00x', actual: '4.32x', cushion: { pct: -8, text: `${M}8.0%`, tone: 'bad' }, status: { state: 'breach', text: 'Breach' } },
    { name: 'Min Interest Coverage', threshold: '≥ 2.00x', actual: '2.06x', cushion: { pct: 3, text: '+3.0%', tone: 'warn' }, status: { state: 'watch', text: 'Watch' } },
    { name: 'Min Fixed-Charge Coverage', threshold: '≥ 1.10x', actual: '1.16x', cushion: { pct: 5.5, text: '+5.5%', tone: 'warn' }, status: { state: 'watch', text: 'Watch' } },
    { name: 'Min Liquidity', threshold: '≥ $10.0M', actual: '$13.8M', cushion: { pct: 38, text: '+38.0%', tone: 'neutral' }, status: { state: 'pass', text: 'Pass' } },
  ],
  empty: null,
};

const CONTENTS_ROWS: ContentsView['rows'] = [
  { stepId: 'step_extract', ordinal: '1', title: 'Financials', describe: 'Pulls revenue, EBITDA, debt, coverage and liquidity from the CIM.', tool: 'Document Intelligence', required: true, included: true, tag: COPY.required },
  { stepId: 'step_risk', ordinal: '2', title: 'Risk score and rating', describe: 'Scores the credit and maps it to a rating.', tool: 'Risk Engine', required: true, included: true, tag: COPY.required },
  { stepId: 'step_peers', ordinal: '3', title: 'Peer benchmarks', describe: 'Places the credit against simulated sector comparables.', tool: 'Peer Benchmarks', required: false, included: true, tag: COPY.optionalTag },
  { stepId: 'step_covenants', ordinal: '4', title: 'Covenant compliance', describe: 'Tests each proposed covenant against the extracted figures.', tool: 'Covenant Tester', required: true, included: true, tag: COPY.required },
  { stepId: 'step_package', ordinal: '', title: 'Recommendation', describe: 'Writes the recommendation last, after every covenant is tested.', tool: 'Memo Builder', required: true, included: true, tag: COPY.required },
];

const DOCBAR_BASE: Omit<DocBarView, 'status' | 'files'> = {
  fileName: 'Project Atlas',
  elapsed: null,
  extraction: null,
  policySuffix: null,
  countdown: null,
  stepper: null,
  goToSignature: false,
  goToDrafting: false,
  actions: [],
  confirm: null,
};
const ACTION_STOP = { kind: 'stop' as const, label: COPY.stop, variant: 'ghost' as const, disabled: false };
const SEALED_ACTIONS: DocBarView['actions'] = [
  { kind: 'export', label: COPY.exportFile, variant: 'secondary', disabled: false },
  { kind: 'rerun', label: COPY.reRun, variant: 'ghost', disabled: false },
  { kind: 'ledger', label: COPY.openInLedger, variant: 'ghost', disabled: false },
];

const HEADER_MARGIN_EMPTY = { showReasoning: false, reasoningLabel: COPY.showAllReasoning, evidenceCheck: null };
const HEADER_MARGIN_ATLAS = { showReasoning: false, reasoningLabel: COPY.showAllReasoning, evidenceCheck: NOTE_ATLAS_EVIDENCE };

// =============================================================================
// Files
// =============================================================================

/** Atlas, never run: header + Contents + "Draft memo". */
export const FX_FILE_NOT_STARTED: FileView = {
  dealId: 'atlas',
  mode: 'not-started',
  live: false,
  source: 'deal',
  runId: null,
  revision: 1,
  restructured: false,
  docBar: { ...DOCBAR_BASE, files: FILES_INITIAL, status: { state: 'pending', text: 'Not started · CIM ready · 3 paragraphs' } },
  header: HEADER_ATLAS_NOT_DRAFTED,
  contents: {
    mode: 'not-started',
    rows: CONTENTS_ROWS,
    sourceLine: 'Source · Project Atlas CIM · 3 paragraphs',
    countdown: null,
    held: false,
    holdLabel: COPY.hold,
    unattendedNote: null,
  },
  sections: [],
  headerMargin: HEADER_MARGIN_EMPTY,
  toReview: [],
  sourceView: SOURCE_ATLAS,
  appendix: APPENDIX_ATLAS,
  rows: { exhibits: false, stress: false, signature: false, monitoring: true },
  primary: { label: COPY.draftMemo, kbd: '⌘↵', action: 'draft', disabled: false, disabledReason: null },
  flagsOnRecord: 0,
  countedNotes: 0,
};

/** Atlas in plan review on its file: the countdown runs (6 s at 1×). */
export const FX_FILE_PLAN_REVIEW: FileView = {
  ...FX_FILE_NOT_STARTED,
  mode: 'plan-review',
  live: true,
  source: 'live',
  docBar: {
    ...DOCBAR_BASE,
    files: filesWithAtlas('Plan review · starts in 6 s'),
    status: { state: 'awaiting', text: 'Plan review · drafting starts in 6 s' },
  },
  contents: {
    mode: 'plan-review',
    rows: CONTENTS_ROWS,
    sourceLine: 'Source · Project Atlas CIM · 3 paragraphs',
    countdown: 'Drafting starts in 6 s',
    held: false,
    holdLabel: COPY.hold,
    unattendedNote: COPY.unattendedNote,
  },
  primary: { label: COPY.startDrafting, kbd: '⌘↵', action: 'start-drafting', disabled: false, disabledReason: null },
};

/** Atlas drafting §4: one caret at the write point, Recommendation still pending. */
export const FX_FILE_RUNNING: FileView = {
  dealId: 'atlas',
  mode: 'running',
  live: true,
  source: 'live',
  runId: 1,
  revision: 1,
  restructured: false,
  docBar: {
    ...DOCBAR_BASE,
    files: filesWithAtlas('Drafting · Covenant compliance · 0:06'),
    status: { state: 'drafting', text: 'Drafting · Covenant compliance · step 4 of 5' },
    elapsed: '0:06',
    goToDrafting: true,
    actions: [ACTION_STOP],
  },
  header: HEADER_ATLAS,
  contents: null,
  sections: [
    { ...secRecommendation(null), phase: 'pending', status: 'pending', statusLabel: 'Not started', stub: null },
    secFinancials(),
    secRisk(),
    secPeers(),
    {
      ...secCovenants([], []),
      suffix: null,
      phase: 'drafting',
      status: 'drafting',
      statusLabel: 'Drafting',
      drafting: { text: REASON_COVENANTS, callLine: 'Calling Covenant Tester…', caret: true },
      stub: null,
      body: null,
    },
  ],
  headerMargin: HEADER_MARGIN_ATLAS,
  toReview: [],
  sourceView: SOURCE_ATLAS,
  appendix: APPENDIX_ATLAS,
  rows: { exhibits: false, stress: false, signature: true, monitoring: true },
  primary: null,
  flagsOnRecord: 0,
  countedNotes: 0,
};

/** Atlas suspended at the rev 1 gate (policy off): 2 notes to review. */
export const FX_FILE_ATLAS_GATE: FileView = {
  dealId: 'atlas',
  mode: 'gate',
  live: true,
  source: 'live',
  runId: 1,
  revision: 1,
  restructured: false,
  docBar: {
    ...DOCBAR_BASE,
    files: filesWithAtlas('Awaiting you · rev 1 · waiting 1:12'),
    status: { state: 'awaiting', text: 'Awaiting your countersignature · rev 1 · 2 notes to review · waiting 1:12' },
    stepper: { label: '– of 2', count: 2 },
    goToSignature: true,
    actions: [ACTION_STOP],
  },
  header: HEADER_ATLAS,
  contents: null,
  sections: [
    secRecommendation(REC_ATLAS),
    secFinancials(),
    secRisk(),
    secPeers(),
    secCovenants(COVENANTS_ATLAS_GATE, [NOTE_ATLAS_BREACH, NOTE_ATLAS_FCC]),
  ],
  headerMargin: HEADER_MARGIN_ATLAS,
  toReview: [NOTE_ATLAS_BREACH, NOTE_ATLAS_FCC],
  sourceView: SOURCE_ATLAS_CITED,
  appendix: APPENDIX_ATLAS,
  rows: { exhibits: false, stress: true, signature: true, monitoring: true },
  primary: null,
  flagsOnRecord: 2,
  countedNotes: 2,
};

const KEYFIGS_ATLAS_REV2: KeyFigureView[] = [
  KEYFIGS_ATLAS[0],
  KEYFIGS_ATLAS[1],
  {
    label: 'Total leverage',
    value: '4.00x',
    sub: null,
    caption: '0.00x room · ≤ 4.00x',
    tone: 'warn',
    dot: 'warn',
    evidenceText: 'Model output · Structuring Engine',
    traceStepId: 'step_rework_2',
    anchorId: 'rev2:leverage',
    ariaLabel: 'Total leverage 4.00x, 0.00x room · ≤ 4.00x. Model output · Structuring Engine. Trace to Structuring Engine.',
  },
  {
    label: 'Interest coverage',
    value: '2.24x',
    sub: null,
    caption: '0.24x room · ≥ 2.00x',
    tone: 'ink',
    dot: null,
    evidenceText: 'Model output · Structuring Engine',
    traceStepId: 'step_rework_2',
    anchorId: 'rev2:interest',
    ariaLabel: 'Interest coverage 2.24x, 0.24x room · ≥ 2.00x. Model output · Structuring Engine. Trace to Structuring Engine.',
  },
  {
    label: 'Liquidity',
    value: '$14.2M',
    sub: null,
    caption: '$4.2M room · ≥ $10.0M',
    tone: 'ink',
    dot: null,
    evidenceText: 'Model output · Structuring Engine',
    traceStepId: 'step_rework_2',
    anchorId: 'rev2:liquidity',
    ariaLabel: 'Liquidity $14.2M, $4.2M room · ≥ $10.0M. Model output · Structuring Engine. Trace to Structuring Engine.',
  },
];

/** Atlas at the rev 2 gate after a send-back: the Structuring Engine's cure. */
export const FX_FILE_ATLAS_REV2: FileView = {
  ...FX_FILE_ATLAS_GATE,
  revision: 2,
  restructured: true,
  docBar: {
    ...DOCBAR_BASE,
    files: filesWithAtlas('Awaiting you · rev 2 · waiting 0:08'),
    status: { state: 'awaiting', text: 'Awaiting your countersignature · rev 2 · waiting 0:08' },
    goToSignature: true,
    actions: [ACTION_STOP],
  },
  header: { ...HEADER_ATLAS, meta: 'Senior Secured Term Loan B · $45.0M · CAM-2026-0417 · rev 2' },
  sections: [
    secRecommendation({
      ...REC_ATLAS,
      basis: 'On the proposed revised structure · rev 2',
      prior: ESCALATE,
      token: APPROVE,
      sentence: 'Approve the revised structure. $6.0M sponsor equity clears every covenant; risk 55 (B2 / Speculative).',
      summary: ATLAS_REV2_SUMMARY,
      keyFigures: KEYFIGS_ATLAS_REV2,
    }),
    secFinancials(),
    secRisk(),
    secPeers(),
    secCovenants(COVENANTS_ATLAS, [superseded(NOTE_ATLAS_BREACH), superseded(NOTE_ATLAS_FCC)]),
    {
      ...SECTION_BASE,
      kind: 'revision',
      id: 'revision-2',
      anchorId: 'sec:revision-2',
      ordinal: 'R2',
      heading: 'Revision 2',
      suffix: '· proposed restructure',
      stub: STUB_REWORK_ATLAS,
      notes: [NOTE_ATLAS_SENDBACK, NOTE_ATLAS_RESTRUCTURE],
      body: REVISION_ATLAS,
    },
  ],
  toReview: [],
  sourceView: SOURCE_ATLAS,
  flagsOnRecord: 2,
  countedNotes: 0,
};

/** Atlas countersigned at rev 1 (ESCALATE, routed to the Book), one exhibit attached. */
export const FX_FILE_SEALED: FileView = {
  ...FX_FILE_ATLAS_GATE,
  mode: 'sealed',
  docBar: {
    ...DOCBAR_BASE,
    files: filesWithAtlas('Countersigned 14:03'),
    status: { state: 'signed', text: 'Countersigned 14:03 · rev 1' },
    stepper: { label: '– of 2', count: 2 },
    actions: SEALED_ACTIONS,
  },
  header: {
    ...HEADER_ATLAS,
    seal: {
      state: 'signed',
      headline: 'The agent recommended ESCALATE. You countersigned.',
      receipt: '5 steps · 5 tool calls · drafted in 6.1 s · suspended 1:12 · lowest confidence 86% · rev 1 · run 1',
    },
  },
  sections: [
    secRecommendation(REC_ATLAS),
    secFinancials(),
    secRisk(),
    secPeers(),
    secCovenants(COVENANTS_ATLAS, [signedOver(NOTE_ATLAS_BREACH, true), signedOver(NOTE_ATLAS_FCC, false)]),
  ],
  toReview: [signedOver(NOTE_ATLAS_BREACH, true), signedOver(NOTE_ATLAS_FCC, false)],
  sourceView: SOURCE_ATLAS,
  rows: { exhibits: true, stress: true, signature: true, monitoring: true },
};

// ---- uploaded file (q3_cim.pdf → 'Q3 Cim', simulated extraction at 76%)

const UP_ID = 'deal_7';
const UP_MSG_RISK = `Risk Engine returned 70% confidence (floor 75%) ${EM} figures need human verification against the source.`;
const UP_MSG_PEERS = `Peer Benchmarks returned 68% confidence (floor 75%) ${EM} figures need human verification against the source.`;
const UP_MSG_MEMO = `Memo Builder returned 73% confidence (floor 75%) ${EM} figures need human verification against the source.`;
const UP_MSG_BREACH = `Max Total Leverage 4.99x breaches the ≤ 4.00x covenant ${EM} cannot auto-approve.`;

const lowConfNote = (flagId: string, tool: string, text: string, anchor: string, stepId: string, time: string): NoteView => ({
  id: `note:${flagId}`,
  flagId,
  kind: 'low-confidence',
  tone: 'watch',
  status: 'watch',
  heading: `Low confidence · ${tool}`,
  text,
  meta: `raised by ${tool} · ${time}`,
  anchorId: anchor,
  counted: true,
  opened: false,
  actions: [{ kind: 'trace', label: COPY.trace }],
  traceStepId: stepId,
  amendKind: null,
});
const NOTE_UP_MEMO = lowConfNote('flag_118', 'Memo Builder', UP_MSG_MEMO, 'sec:recommendation', 'step_package', '14:31:09');
const NOTE_UP_RISK = lowConfNote('flag_109', 'Risk Engine', UP_MSG_RISK, 'sec:risk', 'step_risk', '14:31:03');
const NOTE_UP_PEERS = lowConfNote('flag_112', 'Peer Benchmarks', UP_MSG_PEERS, 'sec:peers', 'step_peers', '14:31:05');
const NOTE_UP_BREACH: NoteView = {
  ...NOTE_ATLAS_BREACH,
  id: 'note:flag_115',
  flagId: 'flag_115',
  text: UP_MSG_BREACH,
  meta: 'raised by Covenant Tester · 14:31:07',
};
const NOTE_UP_EVIDENCE: NoteView = {
  ...NOTE_ATLAS_EVIDENCE,
  text:
    '3 of 8 figures are not quoted in the CIM: interest coverage, fixed-charge coverage and liquidity. They come from the extraction model; verify against the source. Extraction ran at 76% confidence on an unseen document.',
};

const UP_MARKS = ['m2-65', 'm2-96', 'm2-106', 'm2-151', 'm2-163'];
const FIGURES_UP: FigureRow[] = [
  { id: 'revenue', anchorId: 'fig:revenue', label: 'Revenue (TTM)', value: '$155.7M', evidence: quoted(2, 65, 0) },
  { id: 'ebitda', anchorId: 'fig:ebitda', label: 'Adj. EBITDA', value: '$23.4M', evidence: quoted(2, 96, 1) },
  { id: 'margin', anchorId: 'fig:margin', label: 'EBITDA margin', value: '15.0%', evidence: quoted(2, 106, 2) },
  { id: 'debt', anchorId: 'fig:debt', label: 'Total debt', value: '$116.8M', evidence: quoted(2, 151, 3) },
  { id: 'leverage', anchorId: 'fig:leverage', label: 'Total leverage', value: '4.99x', evidence: quoted(2, 163, 4) },
  { id: 'interest', anchorId: 'fig:interest', label: 'Interest coverage', value: '4.25x', evidence: UNQUOTED },
  { id: 'fixed', anchorId: 'fig:fixed', label: 'Fixed-charge coverage', value: '1.45x', evidence: UNQUOTED },
  { id: 'liquidity', anchorId: 'fig:liquidity', label: 'Liquidity', value: '$25.7M', evidence: UNQUOTED },
];
const upKey = (label: string, value: string, evidenceText: string, anchorId: string, extra: Partial<KeyFigureView> = {}): KeyFigureView => ({
  label,
  value,
  sub: null,
  caption: null,
  tone: 'ink',
  dot: null,
  evidenceText,
  traceStepId: 'step_extract',
  anchorId,
  ariaLabel: `${label} ${value}${extra.caption ? `, ${extra.caption}` : ''}. ${evidenceText}. Trace to Document Intelligence.`,
  ...extra,
});
const REC_UP: RecommendationBody = {
  basis: COPY.basisFiled,
  prior: null,
  token: ESCALATE,
  sentence: 'Escalate to a credit officer. 1 covenant breach rules out approval; risk 54 sits below the 75 decline line.',
  summary:
    'Q3 Cim screens at 4.99x leverage with a 15.0% EBITDA margin and a risk score of 54 (B2 / Speculative). 1 of 4 covenant tests fail. Recommend escalation to a credit officer for a waiver or structure adjustment.',
  keyFigures: [
    upKey('Revenue (TTM)', '$155.7M', 'Quoted · CIM para 2', 'fig:revenue'),
    upKey('Adj. EBITDA', '$23.4M', 'Quoted · CIM para 2', 'fig:ebitda', { sub: '15.0% margin' }),
    upKey('Total leverage', '4.99x', 'Quoted · CIM para 2', 'fig:leverage', { caption: '0.99x over ≤ 4.00x', tone: 'bad', dot: 'bad' }),
    upKey('Interest coverage', '4.25x', 'Unquoted · extracted', 'fig:interest', { caption: '2.25x room · ≥ 2.00x' }),
    upKey('Liquidity', '$25.7M', 'Unquoted · extracted', 'fig:liquidity', { caption: '$15.7M room · ≥ $10.0M' }),
  ],
  aidLabel: COPY.aidLabel,
  nearestFlip: `Nearest flip · Total debt ≤ $93.6M (${M}$23.2M) → APPROVE`,
  stressLinkLabel: COPY.stressLink,
  reworkLine: null,
};
const RISK_UP: RiskBody = {
  ...RISK_ATLAS,
  scoreText: '54',
  value: 54,
  drivers: [
    { factor: 'Total leverage 4.99x', impact: 'adds risk · high', tone: 'bad' },
    { factor: 'Interest coverage 4.25x', impact: 'reduces risk · strong', tone: 'good' },
    { factor: 'EBITDA margin 15.0%', impact: 'adds risk · moderate', tone: 'warn' },
    { factor: 'Fixed-charge coverage 1.45x', impact: 'reduces risk · favorable', tone: 'good' },
  ],
};
const PEERS_UP: PeersBody = {
  rows: [
    { cohort: 'This deal', leverage: '4.99x', interest: '4.25x', margin: '15.0%', isDeal: true },
    { cohort: 'Top quartile', leverage: '3.59x', interest: '6.59x', margin: '19.5%', isDeal: false },
    { cohort: 'Sector median', leverage: '4.64x', interest: '4.76x', margin: '15.6%', isDeal: false },
    { cohort: 'Bottom quartile', leverage: '6.09x', interest: '3.32x', margin: '11.4%', isDeal: false },
  ],
  position: 'Q3 Cim is more levered than the sector median (4.64x). Comparables are simulated.',
};
const COVENANTS_UP: CovenantRow[] = [
  {
    ...COVENANTS_ATLAS[0],
    actual: '4.99x',
    cushion: { pct: -24.8, text: `${M}24.8%`, tone: 'bad' },
    amend: AMEND_LEVERAGE,
  },
  { ...COVENANTS_ATLAS[1], actual: '4.25x', cushion: { pct: 112.5, text: '+112.5%', tone: 'neutral' } },
  { ...COVENANTS_ATLAS[2], actual: '1.45x', cushion: { pct: 31.8, text: '+31.8%', tone: 'neutral' } },
  { ...COVENANTS_ATLAS[3], actual: '$25.7M', cushion: { pct: 157, text: '+157.0%', tone: 'neutral' }, amend: AMEND_LIQUIDITY },
];
const upStub = (s: StubView, meta: string, confTone: StubView['confTone'], result?: unknown): StubView => ({
  ...s,
  meta,
  confTone,
  ...(result !== undefined ? { result } : {}),
});
const UP_P1 = 'Q3 Cim ("the Company") is seeking a senior secured facility to refinance existing indebtedness. Figures below were extracted from the uploaded memorandum.';
const UP_P3 =
  'The proposed maintenance covenant package includes a maximum total leverage ratio, minimum interest and fixed-charge coverage tests, and a minimum liquidity floor.';

/** An uploaded CIM at its rev 1 gate: leverage Quoted, extraction 76%, policy on but not eligible. */
export const FX_FILE_UPLOAD_GATE: FileView = {
  dealId: UP_ID,
  mode: 'gate',
  live: true,
  source: 'live',
  runId: 3,
  revision: 1,
  restructured: false,
  docBar: {
    ...DOCBAR_BASE,
    fileName: 'Q3 Cim',
    files: [...FILES_INITIAL, { dealId: UP_ID, label: 'Q3 Cim', meta: 'Awaiting you · rev 1 · waiting 0:21' }],
    status: { state: 'awaiting', text: 'Awaiting your countersignature · rev 1 · 4 notes to review · waiting 0:21' },
    extraction: { text: 'Extraction 76%', tone: 'warn' },
    policySuffix: 'Policy · not eligible',
    stepper: { label: '– of 4', count: 4 },
    goToSignature: true,
    actions: [ACTION_STOP],
  },
  header: {
    eyebrow: COPY.eyebrow,
    borrower: 'Q3 Cim Holdings, LLC',
    meta: 'Senior Secured Term Loan · $52.6M · CAM-2026-6761 · rev 1',
    prepared: 'Prepared by Credit Analyst (agent) · 17 Oct 2026, 14:31 · source: Q3 Cim CIM, paras 1 to 3',
    uploaded: true,
    cancelled: null,
    seal: null,
  },
  contents: null,
  sections: [
    { ...secRecommendation(REC_UP, [NOTE_UP_MEMO]), stub: upStub(STUB_PACKAGE, '700 ms · 73%', 'bad', { memoId: 'CAM-2026-6761', sections: 5, attachments: ['audit_trail.json'] }) },
    secFinancials(FIGURES_UP, upStub(STUB_EXTRACT, '1.1 s · 76%', 'warn')),
    secRisk(RISK_UP, upStub(STUB_RISK, '800 ms · 70%', 'bad'), [NOTE_UP_RISK]),
    secPeers(PEERS_UP, upStub(STUB_PEERS, '850 ms · 68%', 'bad'), [NOTE_UP_PEERS]),
    secCovenants(COVENANTS_UP, [NOTE_UP_BREACH], '· 1 of 4 breached', upStub(STUB_COVENANTS, '900 ms · 79%', 'warn')),
  ],
  headerMargin: { showReasoning: false, reasoningLabel: COPY.showAllReasoning, evidenceCheck: NOTE_UP_EVIDENCE },
  toReview: [NOTE_UP_MEMO, NOTE_UP_RISK, NOTE_UP_PEERS, NOTE_UP_BREACH],
  sourceView: {
    open: false,
    heading: 'Source · Q3 Cim CIM.pdf',
    title: 'Q3 Cim · Confidential Information Memorandum',
    borrower: 'Q3 Cim Holdings, LLC',
    facility: 'Senior Secured Term Loan · $52.6M',
    simulated: true,
    paragraphs: [
      { n: 1, label: '1', segments: [{ text: UP_P1, markId: null, active: false }] },
      {
        n: 2,
        label: '2',
        segments: [
          { text: 'For the trailing twelve months, the Company generated revenue of ', markId: null, active: false },
          { text: '$155.7M', markId: 'm2-65', active: false },
          { text: ' and Adjusted EBITDA of ', markId: null, active: false },
          { text: '$23.4M', markId: 'm2-96', active: false },
          { text: ', a ', markId: null, active: false },
          { text: '15.0%', markId: 'm2-106', active: false },
          { text: ' margin. Pro forma total funded debt is ', markId: null, active: false },
          { text: '$116.8M', markId: 'm2-151', active: false },
          { text: ', or ', markId: null, active: false },
          { text: '4.99x', markId: 'm2-163', active: false },
          { text: ' leverage.', markId: null, active: false },
        ],
      },
      { n: 3, label: '3', segments: [{ text: UP_P3, markId: null, active: false }] },
    ],
    stepper: null,
    quoted: { count: 5, markIds: UP_MARKS, showAllLabel: 'Show all quoted (5)' },
    spineLabel: COPY.sourceSpine,
    spineCount: '5',
    toggleLabel: 'Hide source',
  },
  appendix: { heading: COPY.appendixHeading, meta: 'Simulated drift on the filed figures · sweep #6 · 3 s ago', rows: null, empty: COPY.firstSweepPending },
  rows: { exhibits: false, stress: true, signature: true, monitoring: true },
  primary: null,
  flagsOnRecord: 4,
  countedNotes: 4,
};

// =============================================================================
// Ask
// =============================================================================

/** The live Atlas gate: one local intercept, one engine answer. */
export const FX_ASK: AskView = {
  enabled: true,
  placeholder: COPY.askPlaceholder,
  disabledReason: null,
  thread: [
    { id: 'local_1', role: 'you', text: 'What if leverage was lower?', meta: null },
    {
      id: 'local_2',
      role: 'answer',
      text: 'Use the stress test in this file, below the exhibits. It re-runs the same decide rule the agent uses, and you can attach a scenario as an exhibit.',
      meta: COPY.askMetaLocal,
    },
    { id: 'msg_31', role: 'you', text: 'Why escalate?', meta: null },
    { id: 'msg_32', role: 'answer', text: `I recommended ESCALATE. ${ATLAS_SUMMARY}`, meta: COPY.askMetaEngine },
  ],
};

// =============================================================================
// Signature blocks
// =============================================================================

const POLICY_OFF: PolicyView = { on: false, eligible: false, armed: false, line: COPY.policyOff, checks: null, countdown: null, holdLabel: null };
const CHECKS_CLEAN = [
  { ok: true, text: 'Recommendation is APPROVE' },
  { ok: true, text: 'No flags on record' },
  { ok: true, text: 'First pass' },
  { ok: true, text: 'Every key figure at 90% confidence or above' },
];
const NOTE_EMPTY: NonNullable<SignatureView['note']> = {
  value: '',
  label: COPY.noteLabel,
  placeholder: COPY.notePlaceholder,
  draftLabel: COPY.draftFromNotes,
  draftDisabled: false,
  chip: null,
  hint: null,
};
const VERB_NOTES = (sign: string, _cure: boolean, nextRev = 2): NonNullable<SignatureView['verbs']>['notes'] => ({
  sign,
  ret: `The agent revises and returns rev ${nextRev}. Note required.`,
  rej: 'The credit does not proceed. Note required.',
});
const VERBS = (primary: string, notes: NonNullable<SignatureView['verbs']>['notes'] = VERB_NOTES('Routes the memo to senior credit review.', true)): NonNullable<SignatureView['verbs']> => ({
  primary,
  returnLabel: 'Return for revision',
  rejectLabel: 'Reject memo',
  disabled: false,
  kbd: { sign: 'A', ret: 'S', rej: 'R' },
  notes,
});
const REVIEWER_OPEN: SignatureView['reviewer'] = {
  sigState: 'open',
  caption: COPY.countersignHere,
  kbd: 'A',
  ink: 'none',
  autoText: null,
  rejectedWord: null,
  fillMs: 5000,
  reviewLabel: null,
};
const SIGNED_OVER_ATLAS: SignatureView['signedOver'] = [
  {
    flagId: ATLAS_FLAG_BREACH,
    noteId: `note:${ATLAS_FLAG_BREACH}`,
    state: 'breach',
    text: 'Max Total Leverage 4.26x breaches the ≤ 4.00x covenant',
    cleared: false,
    opened: false,
  },
  {
    flagId: ATLAS_FLAG_FCC,
    noteId: `note:${ATLAS_FLAG_FCC}`,
    state: 'watch',
    text: 'Fixed-charge coverage 1.18x leaves only thin headroom over the 1.10x floor',
    cleared: false,
    opened: false,
  },
];

/** Atlas rev 1 gate, policy off. */
export const FX_SIG_ATLAS_GATE: SignatureView = {
  state: 'gate',
  heading: COPY.countersignature,
  pendingLine: null,
  returned: [],
  signedOver: SIGNED_OVER_ATLAS,
  signedOverLabel: 'Signed over · you opened 0 of 2',
  agent: { text: COPY.agentSignature, caption: 'Credit Analyst (agent) · rev 1 · 14:02' },
  reviewer: REVIEWER_OPEN,
  policy: POLICY_OFF,
  note: NOTE_EMPTY,
  amendment: null,
  attestation:
    "Countersigning concurs with the agent's ESCALATE on CAM-2026-0417 and signs over 2 notes, including 1 covenant breach. The memo then routes to the escalation queue for senior credit review.",
  call: { lead: COPY.agentRecommends, token: ESCALATE, title: 'Send Project Atlas to senior credit review?', why: 'Max Total Leverage 4.26x breaches the ≤ 4.00x covenant. With a risk score of 58, under the 75 decline line, the agent may neither approve nor decline it: a person decides.' },
  verbs: VERBS('Countersign escalation'),
  sealed: null,
};

/** Atlas rev 1 gate with Max Total Leverage amended in place to ≤ 4.30x (resolves to APPROVE). */
export const FX_SIG_ATLAS_AMENDED: SignatureView = {
  ...FX_SIG_ATLAS_GATE,
  signedOver: [{ ...SIGNED_OVER_ATLAS[0], cleared: true }, SIGNED_OVER_ATLAS[1]],
  amendment: { text: 'Amended terms · Max Total Leverage ≤ 4.00x → ≤ 4.30x · as amended', token: APPROVE, revertLabel: COPY.revert },
  attestation:
    'Countersigning as amended approves CAM-2026-0417 on your amended terms (Max Total Leverage ≤ 4.30x). Your amended term is recorded with your signature. Nothing routes onward: the amendment resolves the escalation.',
  call: { lead: COPY.agentRecommends, token: APPROVE, title: 'Approve Project Atlas on your amended terms?', why: 'Re-tested on your amended terms (Max Total Leverage ≤ 4.30x) with the same decision rule the agent uses.' },
  verbs: VERBS('Countersign as amended', VERB_NOTES('Approves on your amended terms.', false)),
};

/** Atlas rev 2 gate on the revised structure; policy on and correctly not eligible. */
export const FX_SIG_ATLAS_REV2: SignatureView = {
  ...FX_SIG_ATLAS_GATE,
  returned: [
    {
      rev: 1,
      text: `Rev 1 returned for revision · Reviewer · 14:05 · “${ATLAS_RETURN_NOTE}” · agent-drafted, edited`,
    },
  ],
  signedOver: [],
  signedOverLabel: 'Signed over · no notes',
  agent: { text: COPY.agentSignature, caption: 'Credit Analyst (agent) · rev 2 · Structuring Engine proposal · 14:06' },
  policy: {
    on: true,
    eligible: false,
    armed: false,
    line: 'Policy · not eligible · 2 of 4 checks fail',
    checks: [
      { ok: true, text: 'Recommendation is APPROVE' },
      { ok: false, text: '2 flags on record' },
      { ok: false, text: 'Revision 2' },
      { ok: true, text: 'Every key figure at 90% confidence or above' },
    ],
    countdown: null,
    holdLabel: null,
  },
  attestation:
    'Countersigning concurs with the revised structure on CAM-2026-0417 ($6.0M sponsor equity: $6.0M debt paydown), subject to the sponsor commitment. There are no notes to sign over.',
  call: { lead: COPY.agentRecommends, token: APPROVE, title: 'Approve Project Atlas on the revised structure?', why: 'With $6.0M of sponsor equity every covenant passes, so the same decision rule now approves.' },
  verbs: VERBS('Countersign revised structure', VERB_NOTES('Approves the revised structure.', false, 3)),
};

/** Meridian at its clean rev 1 gate with the policy armed: the line fills over 5 s. */
export const FX_SIG_MERIDIAN_COUNTDOWN: SignatureView = {
  state: 'countdown',
  heading: COPY.countersignature,
  pendingLine: null,
  returned: [],
  signedOver: [],
  signedOverLabel: 'Signed over · no notes',
  agent: { text: COPY.agentSignature, caption: 'Credit Analyst (agent) · rev 1 · 14:12' },
  reviewer: {
    sigState: 'countdown',
    caption: 'Auto-countersign in 4 s · clean-approval policy',
    kbd: null,
    ink: 'none',
    autoText: null,
    rejectedWord: null,
    fillMs: 5000,
    reviewLabel: COPY.reviewManually,
  },
  policy: { on: true, eligible: true, armed: true, line: 'Auto-countersign in 4 s · clean-approval policy', checks: CHECKS_CLEAN, countdown: '4 s', holdLabel: null },
  note: NOTE_EMPTY,
  amendment: null,
  attestation: "Countersigning concurs with the agent's APPROVE on CAM-2026-0418. There are no notes to sign over. The memo is committed to the record.",
  call: { lead: COPY.agentRecommends, token: APPROVE, title: 'Approve Project Meridian as filed?', why: 'Every covenant passes on the filed figures.' },
  verbs: VERBS('Countersign approval', VERB_NOTES('Approves the facility as filed.', false)),
  sealed: null,
};

const SIGNED_OVER_COBALT: SignatureView['signedOver'] = [
  { flagId: 'flag_61', noteId: 'note:flag_61', state: 'breach', text: 'Max Total Leverage 5.66x breaches the ≤ 4.00x covenant', cleared: false, opened: false },
  { flagId: 'flag_62', noteId: 'note:flag_62', state: 'breach', text: 'Min Interest Coverage 1.40x breaches the ≥ 2.00x covenant', cleared: false, opened: false },
  { flagId: 'flag_63', noteId: 'note:flag_63', state: 'breach', text: 'Min Fixed-Charge Coverage 0.95x breaches the ≥ 1.10x covenant', cleared: false, opened: false },
  { flagId: 'flag_64', noteId: 'note:flag_64', state: 'breach', text: 'Min Liquidity $6.5M breaches the ≥ $10.0M covenant', cleared: false, opened: false },
  { flagId: 'flag_65', noteId: 'note:flag_65', state: 'watch', text: 'Earnings are highly sensitive to commodity prices', cleared: false, opened: false },
];

/** Cobalt rev 1 gate: DECLINE, 5 counted notes. */
export const FX_SIG_COBALT_GATE: SignatureView = {
  state: 'gate',
  heading: COPY.countersignature,
  pendingLine: null,
  returned: [],
  signedOver: SIGNED_OVER_COBALT,
  signedOverLabel: 'Signed over · you opened 0 of 5',
  agent: { text: COPY.agentSignature, caption: 'Credit Analyst (agent) · rev 1 · 14:20' },
  reviewer: REVIEWER_OPEN,
  policy: POLICY_OFF,
  note: NOTE_EMPTY,
  amendment: null,
  attestation:
    "Countersigning concurs with the agent's DECLINE on CAM-2026-0419 and signs over 5 notes, including 4 covenant breaches. The facility is recorded as declined as structured.",
  call: { lead: COPY.agentRecommends, token: DECLINE, title: 'Decline Project Cobalt?', why: 'All 4 covenants breach, led by Max Total Leverage 5.66x against ≤ 4.00x. The risk score of 82 is at or over the 75 decline line.' },
  verbs: VERBS('Countersign decline', VERB_NOTES('Records the facility as declined.', true)),
  sealed: null,
};

/** Atlas countersigned at rev 1 (ESCALATE), routed to the Book. */
export const FX_SIG_SEALED: SignatureView = {
  ...FX_SIG_ATLAS_GATE,
  state: 'signed',
  call: null,
  signedOver: [
    { ...SIGNED_OVER_ATLAS[0], state: 'signed-over', opened: true },
    { ...SIGNED_OVER_ATLAS[1], state: 'signed-over' },
  ],
  signedOverLabel: 'Signed over · you opened 1 of 2',
  reviewer: {
    sigState: 'signed',
    caption: 'Countersigned · concurs ESCALATE · Reviewer · 17 Oct 2026, 14:03',
    kbd: null,
    ink: 'static',
    autoText: null,
    rejectedWord: null,
    fillMs: 5000,
    reviewLabel: null,
  },
  note: null,
  attestation: null,
  verbs: null,
  sealed: {
    caption: 'Countersigned · concurs ESCALATE · Reviewer · 17 Oct 2026, 14:03',
    quote: '“Leverage is 0.26x over the covenant; the sponsor has a waiver track record. Senior credit to confirm.”',
    provenance: 'authored by the reviewer',
    amendments: [],
    routed: COPY.routedLine,
    routedLinkLabel: COPY.openInBook,
    checks: null,
  },
};

/** Meridian countersigned by the clean-approval policy: /auto/, never ink. */
export const FX_SIG_AUTO_SEALED: SignatureView = {
  ...FX_SIG_MERIDIAN_COUNTDOWN,
  state: 'signed-auto',
  call: null,
  reviewer: {
    sigState: 'signed-auto',
    caption: 'Auto-countersigned · clean-approval policy · 17 Oct 2026, 14:12',
    kbd: null,
    ink: 'none',
    autoText: COPY.autoSignature,
    rejectedWord: null,
    fillMs: 5000,
    reviewLabel: null,
  },
  policy: { on: true, eligible: false, armed: false, line: COPY.policyOnIdle, checks: CHECKS_CLEAN, countdown: null, holdLabel: null },
  note: null,
  attestation: null,
  verbs: null,
  sealed: {
    caption: 'Auto-countersigned · clean-approval policy · 17 Oct 2026, 14:12',
    quote: `“${AUTO_NOTE}”`,
    provenance: 'written by the clean-approval policy',
    amendments: [],
    routed: null,
    routedLinkLabel: null,
    checks: CHECKS_CLEAN,
  },
};

/** Cobalt rejected at rev 2 after a send-back found no cure: notes keep their open styling. */
export const FX_SIG_REJECTED: SignatureView = {
  ...FX_SIG_COBALT_GATE,
  state: 'rejected',
  call: null,
  returned: [
    {
      rev: 1,
      text: 'Rev 1 returned for revision · Reviewer · 14:21 · “Four breaches at once. Show me whether any structure clears them.” · authored',
    },
  ],
  signedOver: [
    ...SIGNED_OVER_COBALT,
    {
      flagId: 'flag_73',
      noteId: 'note:flag_73',
      state: 'watch',
      text: 'Structuring search exhausted policy limits (contribution ≤ 35% of debt)',
      cleared: false,
      opened: true,
    },
  ],
  signedOverLabel: 'Notes on the record · you opened 1 of 6',
  agent: { text: COPY.agentSignature, caption: 'Credit Analyst (agent) · rev 2 · 14:21' },
  reviewer: {
    sigState: 'rejected',
    caption: 'Rejected · Reviewer · 14:22',
    kbd: null,
    ink: 'none',
    autoText: null,
    rejectedWord: 'REJECTED',
    fillMs: 5000,
    reviewLabel: null,
  },
  note: null,
  attestation: null,
  verbs: null,
  sealed: {
    caption: 'Rejected · Reviewer · 14:22',
    quote: '“No structure within policy clears four breaches. Not a credit we can restructure.”',
    provenance: 'authored by the reviewer',
    amendments: [],
    routed: null,
    routedLinkLabel: null,
    checks: null,
  },
};

// =============================================================================
// Stress test and exhibits
// =============================================================================

/** Atlas stress test, open, Total debt stressed to $90.4M: flips to APPROVE. */
export const FX_STRESS_ATLAS: StressView = {
  open: true,
  available: 'live',
  collapsedLine: COPY.stressCollapsed,
  openLabel: COPY.stressOpen,
  eyebrow: COPY.stressEyebrow,
  baseLabel: 'Base = filed figures (rev 1)',
  drivers: [
    {
      key: 'ebitda',
      label: 'Adj. EBITDA',
      value: 22.6,
      min: 9,
      max: 40.7,
      step: 0.1,
      valueText: '$22.6M',
      deltaText: null,
      deltaTone: 'ink-3',
      zones: [
        { tone: 'bad', fromPct: 0, toPct: 21.77 },
        { tone: 'warn', fromPct: 21.77, toPct: 42.59 },
        { tone: 'good', fromPct: 42.59, toPct: 100 },
      ],
      boundaries: [
        { pct: 21.77, text: '$15.9M', tone: 'bad' },
        { pct: 42.59, text: '$22.5M', tone: 'warn' },
      ],
    },
    {
      key: 'debt',
      label: 'Total debt',
      value: 90.4,
      min: 48.2,
      max: 154.1,
      step: 0.1,
      valueText: '$90.4M',
      deltaText: `${M}$5.9M`,
      deltaTone: 'good',
      zones: [
        { tone: 'good', fromPct: 0, toPct: 39.94 },
        { tone: 'warn', fromPct: 39.94, toPct: 76.49 },
        { tone: 'bad', fromPct: 76.49, toPct: 100 },
      ],
      boundaries: [
        { pct: 39.94, text: '$90.5M', tone: 'warn' },
        { pct: 76.49, text: '$129.2M', tone: 'bad' },
      ],
    },
    {
      key: 'rate',
      label: 'Interest rate',
      value: 11.18,
      min: 3,
      max: 20,
      step: 0.25,
      valueText: '11.18%',
      deltaText: null,
      deltaTone: 'ink-3',
      zones: [
        { tone: 'good', fromPct: 0, toPct: 56.18 },
        { tone: 'warn', fromPct: 56.18, toPct: 100 },
      ],
      boundaries: [{ pct: 56.18, text: '12.55%', tone: 'warn' }],
    },
    {
      key: 'liquidity',
      label: 'Liquidity',
      value: 14.2,
      min: 0,
      max: 31.2,
      step: 0.5,
      valueText: '$14.2M',
      deltaText: null,
      deltaTone: 'ink-3',
      zones: [
        { tone: 'warn', fromPct: 0, toPct: 31.73 },
        { tone: 'good', fromPct: 31.73, toPct: 100 },
      ],
      boundaries: [{ pct: 31.73, text: '$9.9M', tone: 'warn' }],
    },
  ],
  outcome: {
    base: ESCALATE,
    live: APPROVE,
    text: 'flips · risk 58 → 55 · breaches 1 → 0',
    key: 'ebitda=22.60|debt=90.40|rate=11.18|liquidity=14.20',
  },
  covenants: [
    { ...COVENANTS_ATLAS[0], actual: '4.00x', cushion: { pct: 0, text: '+0.0%', tone: 'warn' }, status: 'pass', statusText: 'Pass' },
    { ...COVENANTS_ATLAS[1], actual: '2.24x', cushion: { pct: 12, text: '+12.0%', tone: 'neutral' } },
    { ...COVENANTS_ATLAS[2], actual: '1.22x', cushion: { pct: 10.9, text: '+10.9%', tone: 'neutral' } },
    COVENANTS_ATLAS[3],
  ],
  attach: { label: COPY.attachAsExhibit, disabled: false, reason: null },
  readonlyNote: null,
  resetLabel: COPY.resetToBase,
  resetDisabled: false,
};

/** One attached stress test on the Atlas memo. */
export const FX_EXHIBITS: ExhibitView[] = [
  {
    id: 'audit_88',
    letter: 'A',
    heading: COPY.stressTest,
    meta: 'attached 14:04 · Reviewer',
    detail: 'Total debt $96.3M→$90.4M ⇒ risk 58→55, breaches 1→0',
    from: ESCALATE,
    to: APPROVE,
    result: 'flips',
  },
];

// =============================================================================
// Book
// =============================================================================

const ACK = { kind: 'acknowledge' as const, label: COPY.acknowledge };
const monitorItem = (id: string, covenant: string, reading: string, distance: string, breach: boolean, ackAt: string | null): BookItem => ({
  id,
  origin: 'monitor',
  status: ackAt ? { state: 'acknowledged', text: `Acknowledged ${ackAt}` } : breach ? { state: 'breach', text: 'Breach' } : { state: 'watch', text: 'Watch' },
  covenant,
  reading,
  distance,
  raised: 'raised 2 m ago',
  muted: ackAt !== null,
  action: ackAt ? null : ACK,
  link: null,
  doneText: null,
});

const BOOK_COBALT: BookRow = {
  dealId: 'cobalt',
  name: 'Project Cobalt',
  borrower: 'Cobalt Resources Holdings, LLC',
  resolvedMeta: null,
  status: { state: 'breach', text: 'Breach' },
  tightest: { name: 'Max Total Leverage', reading: '5.71x / ≤ 4.00x' },
  cushion: { pct: -42.8, text: `${M}42.8%`, tone: 'bad' },
  tests: '0 of 4 pass',
  risk: { text: '84', tone: 'bad' },
  checked: '#4',
  items: [
    monitorItem('esc_4', 'Max Total Leverage', '5.71x / ≤ 4.00x', '1.71x over', true, null),
    monitorItem('esc_7', 'Min Liquidity', '$5.9M / ≥ $10.0M', '$4.1M short', true, null),
    monitorItem('esc_5', 'Min Interest Coverage', '1.36x / ≥ 2.00x', '0.64x short', true, '14:05'),
    monitorItem('esc_6', 'Min Fixed-Charge Coverage', '0.93x / ≥ 1.10x', '0.17x short', true, '14:05'),
  ],
};
const BOOK_ATLAS: BookRow = {
  dealId: 'atlas',
  name: 'Project Atlas',
  borrower: 'Atlas Industrial Holdings, LLC',
  resolvedMeta: null,
  status: { state: 'breach', text: 'Breach' },
  tightest: { name: 'Max Total Leverage', reading: '4.32x / ≤ 4.00x' },
  cushion: { pct: -8, text: `${M}8.0%`, tone: 'bad' },
  tests: '3 of 4 pass · 2 on watch',
  risk: { text: '59', tone: 'ink' },
  checked: '#4',
  items: [
    monitorItem('esc_1', 'Max Total Leverage', '4.32x / ≤ 4.00x', '0.32x over', true, null),
    {
      id: 'esc_9',
      origin: 'countersign',
      status: { state: 'signed', text: COPY.fromCountersignature },
      covenant: 'CAM-2026-0417 routed for senior credit review',
      reading: '',
      distance: '',
      raised: '14:03',
      muted: false,
      action: { kind: 'mark-handed-off', label: COPY.markHandedOff },
      link: { label: COPY.openRecord, route: { name: 'file', dealId: 'atlas', at: 'signature' } },
      doneText: null,
    },
    monitorItem('esc_2', 'Min Interest Coverage', '2.06x / ≥ 2.00x', '0.06x room', false, '14:04'),
    monitorItem('esc_3', 'Min Fixed-Charge Coverage', '1.16x / ≥ 1.10x', '0.06x room', false, '14:04'),
  ],
};
const BOOK_MERIDIAN: BookRow = {
  dealId: 'meridian',
  name: 'Project Meridian',
  borrower: 'Meridian Cloud Systems, Inc.',
  resolvedMeta: null,
  status: { state: 'pass', text: 'Pass' },
  tightest: { name: 'Max Total Leverage', reading: '2.75x / ≤ 4.00x' },
  cushion: { pct: 31.3, text: '+31.3%', tone: 'neutral' },
  tests: '4 of 4 pass',
  risk: { text: '27', tone: 'ink' },
  checked: '#4',
  items: [],
};

/** Sweep #4: Cobalt and Atlas in breach, Atlas's countersigned ESCALATE awaiting hand-off. */
export const FX_BOOK_BREACH: BookView = {
  title: COPY.bookTitle,
  verdict: { state: 'breach', text: '2 of 3 files in breach · 3 covenants need review · 1 memo awaiting senior hand-off' },
  disclosure: COPY.bookDisclosure,
  cadence: 'Portfolio Monitor · every 25 s · sweep #4 · 6 s ago · next in 19 s',
  sweepLabel: COPY.sweepNow,
  sweepDisabled: false,
  empty: null,
  rows: [BOOK_COBALT, BOOK_ATLAS, BOOK_MERIDIAN],
};

/** Before the first sweep. */
export const FX_BOOK_EMPTY: BookView = {
  title: COPY.bookTitle,
  verdict: null,
  disclosure: COPY.bookDisclosure,
  cadence: 'Portfolio Monitor · every 25 s · first sweep pending',
  sweepLabel: COPY.sweepNow,
  sweepDisabled: false,
  empty: COPY.bookEmpty,
  rows: [],
};

// =============================================================================
// Ledger
// =============================================================================

let ledgerSeq = 200;
const lrow = (
  time: string,
  actor: Actor,
  event: string,
  detail: string | null,
  chip: LedgerChip,
  kind: string,
  file: string,
  run: string,
  rawLabel: string,
): LedgerRow => {
  ledgerSeq += 1;
  const id = `audit_${ledgerSeq}`;
  return {
    id,
    time,
    actor,
    event,
    detail,
    chip,
    raw: {
      'Event id': id,
      'ISO time': `2026-10-17T${time}.000Z`,
      Actor: actor,
      Kind: kind,
      File: file,
      Run: run,
      'Raw label': rawLabel,
      Detail: detail ?? '',
    },
  };
};

const CA: Actor = 'Credit Analyst';
const RV: Actor = 'Reviewer';
const PM: Actor = 'Portfolio Monitor';

const stepRows = (file: string, run: string, t: string[], conf: string[]): LedgerRow[] => {
  const steps: [string, string, string, string, string][] = [
    ['Extract financials from the CIM', 'extract_financials', 'Document Intelligence', `{"pages":"12–28","fields":["revenue","ebitda","leverage","coverage","liquidity"],"source":"${file} CIM.pdf"}`, `confidence ${conf[0]} · 1101ms`],
    ['Compute risk score & rating', 'compute_risk_score', 'Risk Engine', '{"model":"internal-pd-v3","inputs":"extracted_financials"}', `confidence ${conf[1]} · 802ms`],
    ['Benchmark against sector peers', 'benchmark_peers', 'Peer Benchmarks', '{"universe":"sector comparables (n=14)","metrics":["leverage","coverage","margin"]}', `confidence ${conf[2]} · 851ms`],
    ['Test covenant compliance', 'check_covenants', 'Covenant Tester', '{"package":"proposed_term_sheet_v2","tests":["Max Total Leverage","Min Interest Coverage","Min Fixed-Charge Coverage","Min Liquidity"]}', `confidence ${conf[3]} · 901ms`],
  ];
  const out: LedgerRow[] = [];
  steps.forEach(([title, tool, label, args, result], i) => {
    out.push(lrow(t[i * 3], CA, `Started · ${title}`, null, 'all', 'info', file, run, `Step ${i + 1} · ${title}`));
    out.push(lrow(t[i * 3 + 1], CA, `Called ${label}`, args, 'all', 'tool', file, run, `Tool call · ${tool}`));
    out.push(lrow(t[i * 3 + 2], CA, `${label} returned`, result, 'all', 'result', file, run, `Tool result · ${tool}`));
  });
  return out;
};
const packageRows = (file: string, run: string, t: [string, string, string], conf: string): LedgerRow[] => [
  lrow(t[0], CA, 'Started · Assemble approval package', null, 'all', 'info', file, run, 'Step 5 · Assemble approval package'),
  lrow(t[1], CA, 'Called Memo Builder', '{"template":"credit-approval-memo","sections":["summary","financials","risk","covenants","recommendation"]}', 'all', 'tool', file, run, 'Tool call · assemble_approval_package'),
  lrow(t[2], CA, 'Memo Builder returned', `confidence ${conf} · 701ms`, 'all', 'result', file, run, 'Tool result · assemble_approval_package'),
];

const ATLAS_COUNTERSIGN_NOTE = 'Approve on the revised structure; the sponsor commitment letter follows.';

const ATLAS_RUN_ROWS: LedgerRow[] = [
  lrow('14:01:52', RV, 'Plan approved · 5/5 steps', null, 'reviewer', 'human', 'Project Atlas', '1', 'Plan approved by reviewer'),
  lrow('14:01:52', CA, `Run started · Project Atlas ${EM} Confidential Information Memorandum`, null, 'all', 'info', 'Project Atlas', '1', 'Run started'),
  ...stepRows('Project Atlas', '1', ['14:01:53', '14:01:53', '14:01:54', '14:01:55', '14:01:55', '14:01:56', '14:01:56', '14:01:56', '14:01:57', '14:01:57', '14:01:57', '14:01:58'], ['94%', '88%', '86%', '97%']),
  lrow('14:01:58', CA, 'Flag · Breach', ATLAS_BREACH_MSG, 'flags', 'flag', 'Project Atlas', '1', 'Flag · critical'),
  lrow('14:01:58', CA, 'Flag · Watch', ATLAS_FCC_MSG, 'flags', 'flag', 'Project Atlas', '1', 'Flag · warning'),
  ...packageRows('Project Atlas', '1', ['14:01:59', '14:01:59', '14:02:00'], '91%'),
  lrow('14:02:00', CA, 'Suspended at countersignature · rev 1', 'recommendation: escalate', 'all', 'human', 'Project Atlas', '1', 'Awaiting human approval'),
  lrow('14:05:48', RV, 'Returned for revision · rev 1', ATLAS_RETURN_NOTE, 'reviewer', 'info', 'Project Atlas', '1', 'Plan extended · reviewer send-back'),
  lrow('14:05:48', CA, 'Started · Propose revised structure · rev 2', null, 'all', 'info', 'Project Atlas', '1', 'Step 6 · Propose revised structure · rev 2'),
  lrow(
    '14:05:57',
    CA,
    'Called Structuring Engine',
    `{"objective":"clear the covenant package","instrument":"sponsor equity contribution","policyLimit":"contribution ≤ 35% of total debt","revision":2,"reviewerNote":"${ATLAS_RETURN_NOTE}"}`,
    'all',
    'tool',
    'Project Atlas',
    '1',
    'Tool call · propose_restructure',
  ),
  lrow('14:05:58', CA, 'Structuring Engine returned', 'confidence 90% · 951ms', 'all', 'result', 'Project Atlas', '1', 'Tool result · propose_restructure'),
  lrow('14:05:58', CA, 'Flag · Watch', ATLAS_SENDBACK_MSG, 'flags', 'flag', 'Project Atlas', '1', 'Flag · warning'),
  lrow('14:05:58', CA, 'Flag · Note', ATLAS_RESTRUCTURE_MSG, 'flags', 'flag', 'Project Atlas', '1', 'Flag · info'),
  lrow('14:06:00', CA, 'Suspended at countersignature · rev 2', 'recommendation: approve', 'all', 'human', 'Project Atlas', '1', 'Awaiting human approval · rev 2'),
  lrow('14:07:31', RV, 'Countersigned', `note: ${ATLAS_COUNTERSIGN_NOTE}`, 'reviewer', 'human', 'Project Atlas', '1', `Human APPROVED ${EM} countersigned`),
];

const MERIDIAN_RUN_ROWS: LedgerRow[] = [
  lrow('14:11:54', CA, 'Plan auto-started · unattended countdown, no reviewer action · 5/5 steps', null, 'all', 'info', 'Project Meridian', '2', 'Plan auto-started · unattended countdown'),
  lrow('14:11:54', CA, `Run started · Project Meridian ${EM} Confidential Information Memorandum`, null, 'all', 'info', 'Project Meridian', '2', 'Run started'),
  ...stepRows('Project Meridian', '2', ['14:11:55', '14:11:55', '14:11:56', '14:11:57', '14:11:57', '14:11:58', '14:11:58', '14:11:58', '14:11:59', '14:11:59', '14:11:59', '14:12:00'], ['94%', '88%', '86%', '97%']),
  ...packageRows('Project Meridian', '2', ['14:12:00', '14:12:00', '14:12:00'], '91%'),
  lrow('14:12:00', CA, 'Suspended at countersignature · rev 1', 'recommendation: approve', 'all', 'human', 'Project Meridian', '2', 'Awaiting human approval'),
  lrow('14:12:05', 'Policy', 'Auto-countersigned · clean-approval policy', `note: ${AUTO_NOTE}`, 'policy', 'human', 'Project Meridian', '2', 'AUTO-countersigned · clean-approval policy'),
];

const mrow = (time: string, actor: Actor, event: string, chip: LedgerChip, kind: string, file: string, detail: string | null): LedgerRow =>
  lrow(time, actor, event, detail, chip, kind, file, '–', kind);

const MONITOR_ROWS: LedgerRow[] = [
  mrow('14:00:59', PM, 'Raised · Project Atlas · Breach · Max Total Leverage 4.29x / ≤ 4.00x', 'monitor', 'raised', 'Project Atlas', 'Max Total Leverage 4.29x breaches the ≤ 4.00x covenant'),
  mrow('14:00:59', PM, 'Raised · Project Atlas · Watch · Min Interest Coverage 2.12x / ≥ 2.00x', 'monitor', 'raised', 'Project Atlas', `Min Interest Coverage 2.12x is approaching its ≥ 2.00x limit ${EM} thin headroom`),
  mrow('14:00:59', PM, 'Raised · Project Atlas · Watch · Min Fixed-Charge Coverage 1.17x / ≥ 1.10x', 'monitor', 'raised', 'Project Atlas', `Min Fixed-Charge Coverage 1.17x is approaching its ≥ 1.10x limit ${EM} thin headroom`),
  mrow('14:01:00', PM, 'Raised · Project Cobalt · Breach · Max Total Leverage 5.70x / ≤ 4.00x', 'monitor', 'raised', 'Project Cobalt', 'Max Total Leverage 5.70x breaches the ≤ 4.00x covenant'),
  mrow('14:01:00', PM, 'Raised · Project Cobalt · Breach · Min Interest Coverage 1.38x / ≥ 2.00x', 'monitor', 'raised', 'Project Cobalt', 'Min Interest Coverage 1.38x breaches the ≥ 2.00x covenant'),
  mrow('14:01:00', PM, 'Raised · Project Cobalt · Breach · Min Fixed-Charge Coverage 0.94x / ≥ 1.10x', 'monitor', 'raised', 'Project Cobalt', 'Min Fixed-Charge Coverage 0.94x breaches the ≥ 1.10x covenant'),
  mrow('14:01:00', PM, 'Raised · Project Cobalt · Breach · Min Liquidity $6.3M / ≥ $10.0M', 'monitor', 'raised', 'Project Cobalt', 'Min Liquidity $6.3M breaches the ≥ $10.0M covenant'),
  mrow('14:04:31', RV, 'Acknowledged · Min Interest Coverage', 'reviewer', 'acknowledged', 'Project Atlas', null),
  mrow('14:04:33', RV, 'Acknowledged · Min Fixed-Charge Coverage', 'reviewer', 'acknowledged', 'Project Atlas', null),
  mrow('14:05:02', RV, 'Acknowledged · Min Interest Coverage', 'reviewer', 'acknowledged', 'Project Cobalt', null),
  mrow('14:05:04', RV, 'Acknowledged · Min Fixed-Charge Coverage', 'reviewer', 'acknowledged', 'Project Cobalt', null),
];

const ATLAS_LEDGER_RUN: LedgerRun = {
  key: 'run:1',
  runId: 1,
  dealId: 'atlas',
  expanded: true,
  header: { state: 'signed', text: 'Run 1 · Countersigned · concurs APPROVE · rev 2', meta: '28 events · 6.1 s · 14:07' },
  decision: {
    time: '14:07:31',
    actor: 'Reviewer',
    verb: 'Countersigned',
    note: `“${ATLAS_COUNTERSIGN_NOTE}”`,
    provenance: 'authored by the reviewer',
    amendments: [],
    facts: 'suspended 1:31 before countersignature · no notes to sign over',
  },
  rows: ATLAS_RUN_ROWS,
  openFile: { name: 'file', dealId: 'atlas', at: null },
  openFileLabel: COPY.openFile,
};
const MERIDIAN_LEDGER_RUN: LedgerRun = {
  key: 'run:2',
  runId: 2,
  dealId: 'meridian',
  expanded: true,
  header: { state: 'signed-auto', text: 'Run 2 · Auto-countersigned · concurs APPROVE', meta: '19 events · 6.0 s · 14:12' },
  decision: {
    time: '14:12:05',
    actor: 'Policy',
    verb: 'Auto-countersigned',
    note: `“${AUTO_NOTE}”`,
    provenance: 'written by the clean-approval policy',
    amendments: [],
    facts: 'suspended 0:05 before countersignature · no notes to sign over',
  },
  rows: MERIDIAN_RUN_ROWS,
  openFile: { name: 'file', dealId: 'meridian', at: null },
  openFileLabel: COPY.openFile,
};

/** After Atlas (returned at rev 1, countersigned at rev 2) and a Meridian policy signature. */
export const FX_LEDGER_AFTER_ATLAS: LedgerView = {
  title: COPY.ledgerTitle,
  summary: 'Every event this session, by file and run · 58 events · 2 runs · 2 reviewer decisions · 1 policy decision',
  note: COPY.ledgerNote,
  exportLabel: COPY.exportSession,
  chips: [
    { id: 'all', label: 'All', count: '58' },
    { id: 'reviewer', label: 'Reviewer', count: '7' },
    { id: 'policy', label: 'Policy', count: '1' },
    { id: 'flags', label: 'Flags', count: '4' },
    { id: 'exhibits', label: 'Exhibits', count: '0' },
    { id: 'monitor', label: 'Portfolio Monitor', count: '7' },
  ],
  activeChip: 'all',
  fileFilter: null,
  empty: null,
  files: [
    { key: 'atlas', heading: 'Project Atlas · CAM-2026-0417', runs: [ATLAS_LEDGER_RUN] },
    { key: 'meridian', heading: 'Project Meridian · CAM-2026-0418', runs: [MERIDIAN_LEDGER_RUN] },
  ],
  monitor: { heading: COPY.portfolioMonitor, rows: MONITOR_ROWS },
};

/** Nothing on the record yet. */
export const FX_LEDGER_EMPTY: LedgerView = {
  title: COPY.ledgerTitle,
  summary: 'Every event this session, by file and run · 0 events',
  note: COPY.ledgerNote,
  exportLabel: COPY.exportSession,
  chips: [
    { id: 'all', label: 'All', count: '0' },
    { id: 'reviewer', label: 'Reviewer', count: '0' },
    { id: 'policy', label: 'Policy', count: '0' },
    { id: 'flags', label: 'Flags', count: '0' },
    { id: 'exhibits', label: 'Exhibits', count: '0' },
    { id: 'monitor', label: 'Portfolio Monitor', count: '0' },
  ],
  activeChip: 'all',
  fileFilter: null,
  empty: COPY.ledgerEmpty,
  files: [],
  monitor: null,
};

/** Every fixture by name (kit page index, quick lookup). */
export const FIXTURES = {
  FX_TOPBAR,
  FX_DESK_INITIAL,
  FX_DESK_ATLAS_GATE,
  FX_FILE_NOT_STARTED,
  FX_FILE_PLAN_REVIEW,
  FX_FILE_RUNNING,
  FX_FILE_ATLAS_GATE,
  FX_FILE_ATLAS_REV2,
  FX_FILE_SEALED,
  FX_FILE_UPLOAD_GATE,
  FX_ASK,
  FX_SIG_ATLAS_GATE,
  FX_SIG_ATLAS_AMENDED,
  FX_SIG_ATLAS_REV2,
  FX_SIG_MERIDIAN_COUNTDOWN,
  FX_SIG_COBALT_GATE,
  FX_SIG_SEALED,
  FX_SIG_AUTO_SEALED,
  FX_SIG_REJECTED,
  FX_STRESS_ATLAS,
  FX_EXHIBITS,
  FX_BOOK_BREACH,
  FX_BOOK_EMPTY,
  FX_LEDGER_AFTER_ATLAS,
  FX_LEDGER_EMPTY,
} as const;

/** The four agent tokens, for kit specimens (Token board). */
export const FX_TOKENS = { approve: APPROVE, escalate: ESCALATE, decline: DECLINE, rejected: tokenOf('rejected') } as const;
