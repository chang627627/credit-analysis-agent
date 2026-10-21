// ---------------------------------------------------------------------------
// Countersign V2 · fixture views (spec §9.4 stage 1, Appendix A). Fully
// populated view objects with the engine's golden values. The stage-1 stub
// selectors return these, and the kit page uses them for specimens. Engine
// strings (flag messages, summaries, reasoning) are reproduced as the engine
// writes them; their em dashes are interpolated from EM, never typed.
// THREE-PANE: memo sections are cards (eyebrow, title, takeaway, labelled
// blocks, a record footer, row-less flags as foot lines) whose takeaways equal
// the §5.5 strings; FX_PANEL_* are the agent panel (R2: one-line status lines
// with links, the plan prompt); FX_QUESTIONS_ATLAS is the memo's Questions block
// (R4.5); FX_SIG_* are the memo's Decision card; FX_NOTES are MarginNote
// specimens; the raw step record is FX_STUB_EXTRACT.
// ---------------------------------------------------------------------------

import { AUTO_NOTE, COPY, IMPERATIVE, NOT_IN_CIM, NOT_IN_CIM_SHORT, sectionLinkLabel, STATUS_WORD, tokenOf } from './vocab';
import { EM, MINUS } from './format';
import { policyRule } from './select-top';
import { qaAnchor } from './select-questions';
import type {
  Actor,
  AgentPanelView,
  BookAckView,
  BookItem,
  BookRow,
  BookView,
  CovenantEvidence,
  CovenantRow,
  DeskRemovedLine,
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
  QuestionsView,
  RecommendationBody,
  RevisionBody,
  RiskBody,
  SectionFlagLine,
  SectionFooter,
  SectionId,
  SectionView,
  SignatureView,
  SourceView,
  StressView,
  StubView,
  TakeawayView,
  ThreadLine,
  TopBarView,
  AppendixView,
  FileAt,
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

/** Atlas at the gate (the Desk's attention dot), policy off. */
export const FX_TOPBAR: TopBarView = {
  tabs: [
    { id: 'desk', label: 'Desk', attention: COPY.fileWaiting },
    { id: 'book', label: 'Book', attention: null },
    { id: 'ledger', label: 'Ledger', attention: null },
  ],
  active: 'desk',
  policyOn: false,
  policyLabel: COPY.policyLabel,
  policyShort: COPY.policyShort,
  policyRule: policyRule().short,
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
  remove: { label: COPY.removeFile('Project Atlas'), disabled: false },
  borrower: 'Atlas Industrial Holdings, LLC',
  facility: 'Senior Secured Term Loan B · $45.0M',
  leverage: { text: '4.26x', tone: 'bad' },
};
const DESK_MERIDIAN: DeskRow = {
  ...DESK_ROW_BASE,
  dealId: 'meridian',
  name: 'Project Meridian',
  remove: { label: COPY.removeFile('Project Meridian'), disabled: false },
  borrower: 'Meridian Cloud Systems, Inc.',
  facility: 'Senior Secured Term Loan A · $30.0M',
  leverage: { text: '2.80x', tone: 'ink' },
};
const DESK_COBALT: DeskRow = {
  ...DESK_ROW_BASE,
  dealId: 'cobalt',
  name: 'Project Cobalt',
  remove: { label: COPY.removeFile('Project Cobalt'), disabled: false },
  borrower: 'Cobalt Resources Holdings, LLC',
  facility: 'Senior Secured Term Loan B · $60.0M',
  leverage: { text: '5.66x', tone: 'bad' },
};

/** Fresh session: three sample files, nothing started. */
export const FX_DESK_INITIAL: DeskView = {
  title: COPY.deskTitle,
  summary: COPY.deskInitialSummary,
  groups: [
    { stage: 'not-started', label: COPY.groupLabel['not-started'], status: 'pending', count: '3', rows: [DESK_ATLAS, DESK_MERIDIAN, DESK_COBALT], removed: [] },
  ],
  parsing: null,
  drop: DROP_OPEN,
  removed: null,
  empty: null,
};

/** R4.7: one undo line of a file removed during this visit to the Desk. */
const deskRemovedLine = (dealId: string, name: string, before: string | null): DeskRemovedLine => ({
  dealId,
  text: COPY.removedLine(name),
  undo: { label: COPY.undo, ariaLabel: COPY.undoRemove(name) },
  before,
});

/** R4.7: Project Cobalt removed in one click from a fresh Desk; its row is one undo line where it was. */
export const FX_DESK_COBALT_REMOVED: DeskView = {
  title: COPY.deskTitle,
  summary: `2 files · ${COPY.extractionSimulated}`,
  groups: [
    {
      stage: 'not-started',
      label: COPY.groupLabel['not-started'],
      status: 'pending',
      count: '2',
      rows: [DESK_ATLAS, DESK_MERIDIAN],
      removed: [deskRemovedLine('cobalt', 'Project Cobalt', null)],
    },
  ],
  parsing: null,
  drop: DROP_OPEN,
  removed: { text: COPY.removedCount(1), restore: { label: COPY.restore, ariaLabel: COPY.restoreAll(1) } },
  empty: null,
};

/** R4.7: every sample removed during this visit: three undo lines, the EmptyNote with "Restore sample files" beside the drop zone. */
export const FX_DESK_EMPTY: DeskView = {
  title: COPY.deskTitle,
  summary: `${COPY.deskEmptySummary} · ${COPY.removedCount(3)}`,
  groups: [
    {
      stage: 'not-started',
      label: COPY.groupLabel['not-started'],
      status: 'pending',
      count: '0',
      rows: [],
      removed: [
        deskRemovedLine('atlas', 'Project Atlas', null),
        deskRemovedLine('meridian', 'Project Meridian', null),
        deskRemovedLine('cobalt', 'Project Cobalt', null),
      ],
    },
  ],
  parsing: null,
  drop: DROP_OPEN,
  removed: null,
  empty: { text: COPY.deskEmptyNote(true), restore: { label: COPY.restoreSamples, ariaLabel: COPY.restoreAll(3) } },
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
          stage: { state: 'awaiting', text: 'Awaiting you · rev 1' },
          // the live run's file cannot be removed (R4.7 keeps the rule)
          remove: { label: COPY.removeBlocked('Project Atlas'), disabled: true },
          action: { kind: 'review', label: COPY.reviewAndCountersign, variant: 'primary', disabled: false },
        },
      ],
      removed: [],
    },
    { stage: 'not-started', label: COPY.groupLabel['not-started'], status: 'pending', count: '2', rows: [DESK_MERIDIAN, DESK_COBALT], removed: [] },
  ],
  parsing: null,
  drop: { ...DROP_OPEN, disabledReason: 'Finish or stop the live run on Project Atlas to add a file.' },
  removed: null,
  empty: null,
};

// =============================================================================
// Shared file atoms: Project Atlas
// =============================================================================

const ATLAS_FLAG_BREACH = 'flag_24';
const ATLAS_FLAG_FCC = 'flag_25';
const ATLAS_FLAG_RESTRUCTURE = 'flag_42';

const ATLAS_BREACH_MSG = `Max Total Leverage 4.26x breaches the ≤ 4.00x covenant ${EM} cannot auto-approve.`;
const ATLAS_FCC_MSG = 'Fixed-charge coverage 1.18x leaves only thin headroom over the 1.10x floor.';
/** The rev 1 send-back note: Draft from notes, then edited by the reviewer. */
const ATLAS_RETURN_NOTE = 'Breaches on record: Max Total Leverage 4.26x breaches the ≤ 4.00x covenant. Bring back a structure that clears it.';
const ATLAS_SENDBACK_MSG = `Reviewer send-back (rev 1 · note agent-drafted, edited by reviewer): ${ATLAS_RETURN_NOTE}`;
const ATLAS_RESTRUCTURE_MSG = `Restructure proposed: $19.5M sponsor equity ($19.5M debt paydown) ${EM} every covenant clears with at least 15% headroom on the revised structure.`;
const ATLAS_SUMMARY =
  'Atlas offers an acceptable spread for the risk, but total leverage of 4.26x breaches the proposed 4.00x covenant, and interest and fixed-charge coverage sit inside the policy cushion. Recommend escalation to a credit officer: approval needs additional sponsor equity, or a reset of the leverage covenant together with both coverage tests (a leverage waiver alone leaves the coverage tests thin).';
const ATLAS_REV2_SUMMARY =
  `Revised structure: $19.5M sponsor equity ${EM} $19.5M debt paydown. Total debt falls to $76.8M (leverage 3.40x), ` +
  `every covenant clears with at least 15% headroom (tightest: total leverage at 15.1%), and the risk score recomputes to 47 (B2 / Speculative) ${EM} through the same ` +
  'decision rule as the original analysis. Recommend approval of the revised structure, subject to the sponsor commitment.';
/** The engine's decision reasons on the Atlas packages (the decide rule's own sentences). */
const ATLAS_REASON_BREACH =
  `Total leverage 4.26x breaches the ≤ 4.00x covenant (${M}6.5% headroom). Approve subject to $19.5M sponsor equity or a reset of the leverage, interest coverage and fixed-charge coverage covenants.`;
const ATLAS_REASON_THIN = 'Thin headroom: interest coverage 4.8%, fixed-charge coverage 6.8% (policy cushion 15%).';
const ATLAS_REASON_REV2 = 'Every covenant clears with at least 15% headroom; risk score 47 (B2).';

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
  `Now the part that actually gates the deal: testing each proposed covenant against the extracted figures and measuring its headroom. A breach ${EM} or a pass with less than the 15% policy cushion ${EM} changes the recommendation.`;
const REASON_PACKAGE_ATLAS = `I have what I need ${EM} but the deal carries 2 policy exceptions, so I will not recommend approval as filed. I’ll assemble the memo with the exceptions sized and escalate it to a human credit officer.`;
const REASON_REWORK_ATLAS =
  `The reviewer sent this back: “${ATLAS_RETURN_NOTE}” Restating the filed figures wouldn't change anything ${EM} so I'll treat the send-back as ` +
  'authorization to restructure within policy limits: search for the smallest sponsor equity contribution that leaves every covenant with the 15% policy cushion, ' +
  're-derive the recommendation through the same decide rule, and reassemble revision 2 for a fresh countersign.';
const REWORK_OBJECTIVE = 'every covenant with ≥ 15% headroom (a clean approval under the decision rule)';

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
    objective: REWORK_OBJECTIVE,
    instrument: 'sponsor equity contribution',
    policyLimit: 'contribution ≤ 35% of total debt',
    revision: 2,
    reviewerNote: ATLAS_RETURN_NOTE,
  },
  resultLabel: COPY.resultLabel,
  resultCount: '7 fields',
  result: {
    viable: true,
    contributionM: 19.5,
    debtPaydownM: 19.5,
    liquidityTopUpM: 0,
    revised: { totalDebtM: 76.8, leverageX: 3.4, interestCoverageX: 2.63, liquidityM: 14.2, riskScore: 47, minHeadroomPct: 15 },
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
  target: { section: 'covenants', anchorId: 'cov:Max Total Leverage' },
  actions: [
    { kind: 'show', label: COPY.showRow },
    { kind: 'amend', label: COPY.amendTerm },
  ],
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
  target: { section: 'covenants', anchorId: 'cov:Min Fixed-Charge Coverage' },
  actions: [{ kind: 'show', label: COPY.showRow }],
  amendKind: null,
};
const NOTE_ATLAS_EVIDENCE: NoteView = {
  id: 'note:evidence-check',
  flagId: null,
  kind: 'evidence-check',
  tone: 'info',
  status: 'info',
  heading: COPY.evidenceCheck,
  text: '3 of 4 covenant tests use figures the CIM does not state (interest coverage, fixed-charge coverage and liquidity); they come from the extraction model.',
  meta: COPY.evidenceCheckMeta,
  anchorId: 'sec:financials',
  counted: false,
  opened: false,
  target: { section: 'financials', anchorId: 'sec:financials' },
  actions: [{ kind: 'memo', label: COPY.showInMemo }],
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
  target: { section: 'revision-2', anchorId: 'sec:revision-2' },
  actions: [{ kind: 'memo', label: COPY.showInMemo }],
  amendKind: null,
};

// ---- section bodies

const quoted = (para: number, offset: number, citeIndex: number) =>
  ({ cls: 'quoted', text: 'Quoted', para, paraLabel: `CIM para ${para}`, markId: `m${para}-${offset}`, citeIndex }) as const;
const UNQUOTED = { cls: 'unquoted', text: NOT_IN_CIM_SHORT, full: NOT_IN_CIM } as const;

const ATLAS_MARKS = ['m2-80', 'm2-111', 'm2-121', 'm2-190'];

const FIGURES_ATLAS: FigureRow[] = [
  { id: 'revenue', anchorId: 'fig:revenue', label: 'Revenue (TTM)', value: '$128.4M', evidence: quoted(2, 80, 0), group: 'size', valueTone: 'ink', mark: null },
  { id: 'ebitda', anchorId: 'fig:ebitda', label: 'Adj. EBITDA', value: '$22.6M', evidence: quoted(2, 111, 1), group: 'size', valueTone: 'ink', mark: null },
  { id: 'margin', anchorId: 'fig:margin', label: 'EBITDA margin', value: '17.6%', evidence: quoted(2, 121, 2), group: 'size', valueTone: 'ink', mark: null },
  { id: 'debt', anchorId: 'fig:debt', label: 'Total debt', value: '$96.3M', evidence: quoted(2, 190, 3), group: 'size', valueTone: 'ink', mark: null },
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
    group: 'tested',
    valueTone: 'bad',
    mark: 'breach',
  },
  { id: 'interest', anchorId: 'fig:interest', label: 'Interest coverage', value: '2.10x', evidence: UNQUOTED, group: 'tested', valueTone: 'ink', mark: null },
  { id: 'fixed', anchorId: 'fig:fixed', label: 'Fixed-charge coverage', value: '1.18x', evidence: UNQUOTED, group: 'tested', valueTone: 'ink', mark: null },
  { id: 'liquidity', anchorId: 'fig:liquidity', label: 'Liquidity', value: '$14.2M', evidence: UNQUOTED, group: 'tested', valueTone: 'ink', mark: null },
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
    anchorId: 'fig:revenue',
    ariaLabel: 'Revenue (TTM) $128.4M. Quoted · CIM para 2. Show in Financials.',
    target: { section: 'financials', anchorId: 'fig:revenue' },
  },
  {
    label: 'Adj. EBITDA',
    value: '$22.6M',
    sub: '17.6% margin',
    caption: null,
    tone: 'ink',
    dot: null,
    evidenceText: 'Quoted · CIM para 2',
    anchorId: 'fig:ebitda',
    ariaLabel: 'Adj. EBITDA $22.6M. Quoted · CIM para 2. Show in Financials.',
    target: { section: 'financials', anchorId: 'fig:ebitda' },
  },
  {
    label: 'Total leverage',
    value: '4.26x',
    sub: null,
    caption: '0.26x over ≤ 4.00x',
    tone: 'bad',
    dot: 'bad',
    evidenceText: 'Derived · 96.3 ÷ 22.6',
    anchorId: 'fig:leverage',
    ariaLabel: 'Total leverage 4.26x, 0.26x over ≤ 4.00x. Derived · 96.3 ÷ 22.6. Show in Financials.',
    target: { section: 'financials', anchorId: 'fig:leverage' },
  },
  {
    label: 'Interest coverage',
    value: '2.10x',
    sub: null,
    caption: '0.10x room · ≥ 2.00x',
    tone: 'warn',
    dot: 'warn',
    evidenceText: NOT_IN_CIM_SHORT,
    anchorId: 'fig:interest',
    ariaLabel: `Interest coverage 2.10x, 0.10x room · ≥ 2.00x. ${NOT_IN_CIM}. Show in Financials.`,
    target: { section: 'financials', anchorId: 'fig:interest' },
  },
  {
    label: 'Liquidity',
    value: '$14.2M',
    sub: null,
    caption: '$4.2M room · ≥ $10.0M',
    tone: 'ink',
    dot: null,
    evidenceText: NOT_IN_CIM_SHORT,
    anchorId: 'fig:liquidity',
    ariaLabel: `Liquidity $14.2M, $4.2M room · ≥ $10.0M. ${NOT_IN_CIM}. Show in Financials.`,
    target: { section: 'financials', anchorId: 'fig:liquidity' },
  },
];

const REC_ATLAS: RecommendationBody = {
  basis: COPY.basisFiled,
  prior: null,
  token: ESCALATE,
  sentence: `Escalate to a credit officer. ${ATLAS_REASON_BREACH}`,
  summary: ATLAS_SUMMARY,
  keyFigures: KEYFIGS_ATLAS,
  aidLabel: COPY.aidLabel,
  nearestFlip: `Nearest flip · Total debt ≤ $76.8M (${M}$19.5M) → APPROVE`,
  stressLinkLabel: COPY.stressLink,
  reworkLine: null,
  summaryLabel: COPY.summaryBlock,
  keyFiguresLabel: COPY.keyFiguresBlock,
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
  scoreLabel: COPY.riskScoreBlock,
  driversLabel: COPY.riskDriversBlock,
};

const PEERS_ATLAS: PeersBody = {
  label: COPY.peersBlock,
  rows: [
    { cohort: 'This deal', leverage: '4.26x', interest: '2.10x', margin: '17.6%', isDeal: true },
    { cohort: 'Top quartile', leverage: '3.07x', interest: '3.26x', margin: '22.9%', isDeal: false },
    { cohort: 'Sector median', leverage: '3.96x', interest: '2.35x', margin: '18.3%', isDeal: false },
    { cohort: 'Bottom quartile', leverage: '5.20x', interest: '1.64x', margin: '13.4%', isDeal: false },
  ],
};

const AMEND_LEVERAGE = { kind: 'leverage' as const, value: 4, step: 0.05, min: 1, max: 8, prefix: '≤ ', suffix: 'x' };
const AMEND_LIQUIDITY = { kind: 'liquidity' as const, value: 10, step: 0.5, min: 0, max: 50, prefix: '≥ $', suffix: 'M' };

/** A covenant Actual's evidence, read from its Financials row (R4.3); the line only for a figure the CIM does not state. */
const covEv = (name: string, actual: string, fig: string, text: string): CovenantEvidence => ({
  cls: text === NOT_IN_CIM ? 'unquoted' : text.startsWith('Derived') ? 'derived' : 'quoted',
  text,
  line: text === NOT_IN_CIM ? NOT_IN_CIM_SHORT : null,
  target: { section: 'financials', anchorId: `fig:${fig}` },
  ariaLabel: `${name} actual ${actual}. ${text}. Show in Financials.`,
});

/** Filed figures, no amend fields (sealed, snapshot, restructured revision). */
const COVENANTS_ATLAS: CovenantRow[] = [
  {
    anchorId: 'cov:Max Total Leverage',
    name: 'Max Total Leverage',
    threshold: '≤ 4.00x',
    amended: null,
    actual: '4.26x',
    actualTone: 'bad',
    cushion: { pct: -6.5, text: `${M}6.5%`, tone: 'bad' },
    status: 'breach',
    statusText: 'Breach',
    amend: null,
    evidence: covEv('Max Total Leverage', '4.26x', 'leverage', 'Derived · 96.3 ÷ 22.6'),
  },
  {
    anchorId: 'cov:Min Interest Coverage',
    name: 'Min Interest Coverage',
    threshold: '≥ 2.00x',
    amended: null,
    actual: '2.10x',
    actualTone: 'ink',
    cushion: { pct: 4.8, text: '+4.8%', tone: 'warn' },
    status: 'pass',
    statusText: 'Pass',
    amend: null,
    evidence: covEv('Min Interest Coverage', '2.10x', 'interest', NOT_IN_CIM),
  },
  {
    anchorId: 'cov:Min Fixed-Charge Coverage',
    name: 'Min Fixed-Charge Coverage',
    threshold: '≥ 1.10x',
    amended: null,
    actual: '1.18x',
    actualTone: 'ink',
    cushion: { pct: 6.8, text: '+6.8%', tone: 'warn' },
    status: 'pass',
    statusText: 'Pass',
    amend: null,
    evidence: covEv('Min Fixed-Charge Coverage', '1.18x', 'fixed', NOT_IN_CIM),
  },
  {
    anchorId: 'cov:Min Liquidity',
    name: 'Min Liquidity',
    threshold: '≥ $10.0M',
    amended: null,
    actual: '$14.2M',
    actualTone: 'ink',
    cushion: { pct: 29.6, text: '+29.6%', tone: 'neutral' },
    status: 'pass',
    statusText: 'Pass',
    amend: null,
    evidence: covEv('Min Liquidity', '$14.2M', 'liquidity', NOT_IN_CIM),
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
    'The Structuring Engine proposes $19.5M sponsor equity as $19.5M debt paydown. Every covenant clears with at least 15% headroom on the revised structure (tightest: total leverage 15.1%), and risk recomputes to 47 (B2 / Speculative) through the same decide rule.',
  redline: [
    { label: 'Sponsor equity', from: '–', to: '$19.5M', unchanged: false, anchorId: 'rev2:equity' },
    { label: 'Total debt', from: '$96.3M', to: '$76.8M', unchanged: false, anchorId: 'rev2:debt' },
    { label: 'Total leverage', from: '4.26x', to: '3.40x', unchanged: false, anchorId: 'rev2:leverage' },
    { label: 'Interest coverage', from: '2.10x', to: '2.63x', unchanged: false, anchorId: 'rev2:interest' },
    { label: 'Liquidity', from: '$14.2M', to: '$14.2M', unchanged: true, anchorId: 'rev2:liquidity' },
    { label: 'Tightest headroom', from: `${M}6.5%`, to: '15.1%', unchanged: false, anchorId: 'rev2:headroom' },
    { label: 'Risk score', from: '58', to: '47', unchanged: false, anchorId: 'rev2:risk' },
    { label: 'Recommendation', from: 'ESCALATE', to: 'APPROVE', unchanged: false, anchorId: 'rev2:recommendation' },
  ],
  noCure: null,
  noteLabel: COPY.reviewerNoteBlock,
  proposalLabel: COPY.proposalBlock,
};

// ---- sections (one paper card each; takeaways equal the THREE-PANE §5.5 strings)

type SecOf<K extends SectionView['kind']> = Extract<SectionView, { kind: K }>;

/** The set card's footer from its step record: "Document Intelligence · 94% · 1.1 s" + the collapsed Record (R2.2). */
const footerOf = (record: StubView): SectionFooter => {
  const [duration, conf] = record.meta.split(' · ');
  return { tool: record.tool, conf, confTone: record.confTone, duration, text: `${record.tool} · ${conf} · ${duration}`, recordLabel: COPY.record, record };
};
/** A row-less flag, marked as one line at the foot of its card. */
const flagLine = (flagId: string, state: SectionFlagLine['state'], text: string): SectionFlagLine => ({ id: `note:${flagId}`, flagId, state, text, anchorId: `flag:${flagId}` });
const EVIDENCE_ATLAS: SectionFlagLine = {
  id: 'evidence-check',
  flagId: null,
  state: 'info',
  text: '3 of 4 covenant tests use figures the CIM does not state (interest coverage, fixed-charge coverage and liquidity); they come from the extraction model.',
  anchorId: 'flag:evidence-check',
};
const take = (state: TakeawayView['state'], text: string, basis: string | null = null): TakeawayView => ({ state, text, token: null, prior: null, basis });
const recTake = (body: RecommendationBody): TakeawayView => ({
  state: body.token.tone === 'good' ? 'pass' : body.token.tone === 'bad' ? 'breach' : 'watch',
  text: body.sentence,
  token: body.token,
  prior: body.prior,
  basis: body.basis,
});

const SET = { phase: 'set' as const, status: 'done' as const, statusLabel: 'Done', phaseLine: null, drafting: null, aside: null };
const BLOCKS = { size: COPY.figureGroupSize, tested: COPY.figureGroupTested };
const EYEBROW = {
  financials: 'Step 1 of 5 · Document Intelligence',
  risk: 'Step 2 of 5 · Risk Engine',
  peers: 'Step 3 of 5 · Peer Benchmarks',
  covenants: 'Step 4 of 5 · Covenant Tester',
  recommendation: 'Step 5 of 5 · Memo Builder',
  revision: 'Returned for revision · Structuring Engine',
} as const;

const TAKE_ATLAS = {
  financials: take('breach', 'Total leverage 4.26x breaches the ≤ 4.00x covenant; the other 3 tested figures clear theirs, 2 with thin headroom.'),
  risk: take('watch', 'Risk 58 (B2 / Speculative) is 2 points under the 60 referral line and 17 under the 75 decline line.'),
  peers: take('info', 'Total leverage 4.26x is above the sector median of 3.96x.', COPY.peersBasis),
  covenants: take('breach', '1 of 4 covenants breached: Max Total Leverage; 2 more pass with thin headroom.'),
  revision: take('pass', '$19.5M sponsor equity brings total leverage to 3.40x and every covenant to at least 15% headroom: ESCALATE becomes APPROVE.'),
};

const secFinancials = (body: FigureRow[] = FIGURES_ATLAS, record = STUB_EXTRACT, takeaway = TAKE_ATLAS.financials, flagLines: SectionFlagLine[] = [EVIDENCE_ATLAS]): SecOf<'financials'> => ({
  ...SET,
  kind: 'financials',
  id: 'financials',
  anchorId: 'sec:financials',
  eyebrow: EYEBROW.financials,
  heading: 'Financials',
  takeaway,
  footer: footerOf(record),
  flagLines,
  body,
  blockLabels: BLOCKS,
});
const secRisk = (body: RiskBody = RISK_ATLAS, record = STUB_RISK, takeaway = TAKE_ATLAS.risk, flagLines: SectionFlagLine[] = []): SecOf<'risk'> => ({
  ...SET,
  kind: 'risk',
  id: 'risk',
  anchorId: 'sec:risk',
  eyebrow: EYEBROW.risk,
  heading: 'Risk score and rating',
  takeaway,
  footer: footerOf(record),
  flagLines,
  body,
});
const secPeers = (body: PeersBody = PEERS_ATLAS, record = STUB_PEERS, takeaway = TAKE_ATLAS.peers, flagLines: SectionFlagLine[] = []): SecOf<'peers'> => ({
  ...SET,
  kind: 'peers',
  id: 'peers',
  anchorId: 'sec:peers',
  eyebrow: EYEBROW.peers,
  heading: 'Peer benchmarks',
  takeaway,
  footer: footerOf(record),
  flagLines,
  body,
});
const secCovenants = (body: CovenantRow[], record = STUB_COVENANTS, takeaway = TAKE_ATLAS.covenants, flagLines: SectionFlagLine[] = []): SecOf<'covenants'> => ({
  ...SET,
  kind: 'covenants',
  id: 'covenants',
  anchorId: 'sec:covenants',
  eyebrow: EYEBROW.covenants,
  heading: 'Covenant compliance',
  takeaway,
  footer: footerOf(record),
  flagLines,
  body,
  testsLabel: COPY.testsFiled,
});
const secRecommendation = (body: RecommendationBody, record = STUB_PACKAGE, flagLines: SectionFlagLine[] = []): SecOf<'recommendation'> => ({
  ...SET,
  kind: 'recommendation',
  id: 'recommendation',
  anchorId: 'sec:recommendation',
  eyebrow: EYEBROW.recommendation,
  heading: 'Recommendation',
  takeaway: recTake(body),
  footer: footerOf(record),
  flagLines,
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
  eyebrow: COPY.appendixEyebrow,
  heading: COPY.appendixTitle,
  meta: 'sweep #4 · 6 s ago',
  rows: [
    { name: 'Max Total Leverage', threshold: '≤ 4.00x', actual: '4.32x', cushion: { pct: -8, text: `${M}8.0%`, tone: 'bad' }, status: { state: 'breach', text: 'Breach' } },
    { name: 'Min Interest Coverage', threshold: '≥ 2.00x', actual: '2.06x', cushion: { pct: 3, text: '+3.0%', tone: 'warn' }, status: { state: 'watch', text: 'Watch' } },
    { name: 'Min Fixed-Charge Coverage', threshold: '≥ 1.10x', actual: '1.16x', cushion: { pct: 5.5, text: '+5.5%', tone: 'warn' }, status: { state: 'watch', text: 'Watch' } },
    { name: 'Min Liquidity', threshold: '≥ $10.0M', actual: '$13.8M', cushion: { pct: 38, text: '+38.0%', tone: 'neutral' }, status: { state: 'pass', text: 'Pass' } },
  ],
  empty: null,
};

const DOCBAR_BASE: Omit<DocBarView, 'status' | 'files'> = {
  fileName: 'Project Atlas',
  elapsed: null,
  extraction: null,
  policySuffix: null,
  countdown: null,
  goToDecision: false,
  goToDrafting: false,
  chatToggle: null,
  actions: [],
  confirm: null,
};
const ACTION_STOP = { kind: 'stop' as const, label: COPY.stop, variant: 'ghost' as const, disabled: false };
const SEALED_ACTIONS: DocBarView['actions'] = [
  { kind: 'export', label: COPY.exportFile, variant: 'secondary', disabled: false },
  { kind: 'rerun', label: COPY.reRun, variant: 'ghost', disabled: false },
  { kind: 'ledger', label: COPY.openInLedger, variant: 'ghost', disabled: false },
];


// =============================================================================
// Files
// =============================================================================

/** Atlas, never run: the memo header alone (live drafting, no skeleton cards); the panel shows the plan (⌘↵ or "draft the memo" starts it). */
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
  sections: [], // live drafting (THREE-PANE R3): before Start drafting the memo is its header alone
  toReview: [],
  sourceView: SOURCE_ATLAS,
  appendix: APPENDIX_ATLAS,
  rows: { exhibits: false, stress: false, signature: false, monitoring: false },
  primary: { label: COPY.draftMemo, kbd: '⌘↵', action: 'draft', disabled: false, disabledReason: null },
  flagsOnRecord: 0,
  countedNotes: 0,
};

/** Atlas in plan review on its file, the plan card shown: the countdown runs (6 s at 1×). */
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
  primary: { label: COPY.startDrafting, kbd: '⌘↵', action: 'start-drafting', disabled: false, disabledReason: null },
};

/** Atlas drafting step 4: the one drafting card carries the caret; the recommendation has no card until its step starts. */
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
  sections: [
    secFinancials(),
    secRisk(),
    secPeers(),
    {
      ...secCovenants([]),
      phase: 'drafting',
      status: 'drafting',
      statusLabel: 'Drafting',
      aside: { kind: 'status', state: 'drafting', text: 'Drafting' },
      takeaway: null,
      drafting: { line: 'Calling Covenant Tester…', caret: true },
      footer: null,
      flagLines: [],
      body: null,
    },
  ],
  toReview: [],
  sourceView: SOURCE_ATLAS,
  appendix: APPENDIX_ATLAS,
  rows: { exhibits: false, stress: false, signature: false, monitoring: false },
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
    files: filesWithAtlas('Awaiting you · rev 1'),
    status: { state: 'awaiting', text: 'Awaiting your countersignature · rev 1 · 2 notes to review' },
    goToDecision: true,
    actions: [ACTION_STOP],
  },
  header: HEADER_ATLAS,
  sections: [secFinancials(), secRisk(), secPeers(), secCovenants(COVENANTS_ATLAS_GATE), secRecommendation(REC_ATLAS)],
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
    value: '3.40x',
    sub: null,
    caption: '0.60x room · ≤ 4.00x',
    tone: 'ink',
    dot: null,
    evidenceText: 'Model output · Structuring Engine',
    anchorId: 'rev2:leverage',
    ariaLabel: 'Total leverage 3.40x, 0.60x room · ≤ 4.00x. Model output · Structuring Engine. Show in Revision 2.',
    target: { section: 'revision-2', anchorId: 'rev2:leverage' },
  },
  {
    label: 'Interest coverage',
    value: '2.63x',
    sub: null,
    caption: '0.63x room · ≥ 2.00x',
    tone: 'ink',
    dot: null,
    evidenceText: 'Model output · Structuring Engine',
    anchorId: 'rev2:interest',
    ariaLabel: 'Interest coverage 2.63x, 0.63x room · ≥ 2.00x. Model output · Structuring Engine. Show in Revision 2.',
    target: { section: 'revision-2', anchorId: 'rev2:interest' },
  },
  {
    label: 'Liquidity',
    value: '$14.2M',
    sub: null,
    caption: '$4.2M room · ≥ $10.0M',
    tone: 'ink',
    dot: null,
    evidenceText: 'Model output · Structuring Engine',
    anchorId: 'rev2:liquidity',
    ariaLabel: 'Liquidity $14.2M, $4.2M room · ≥ $10.0M. Model output · Structuring Engine. Show in Revision 2.',
    target: { section: 'revision-2', anchorId: 'rev2:liquidity' },
  },
];

/** Atlas at the rev 2 gate after a send-back: the Structuring Engine's cure. */
export const FX_FILE_ATLAS_REV2: FileView = {
  ...FX_FILE_ATLAS_GATE,
  revision: 2,
  restructured: true,
  docBar: {
    ...DOCBAR_BASE,
    files: filesWithAtlas('Awaiting you · rev 2'),
    status: { state: 'awaiting', text: 'Awaiting your countersignature · rev 2' },
    goToDecision: true,
    actions: [ACTION_STOP],
  },
  header: { ...HEADER_ATLAS, meta: 'Senior Secured Term Loan B · $45.0M · CAM-2026-0417 · rev 2' },
  sections: [
    secFinancials(),
    secRisk(),
    secPeers(),
    secCovenants(COVENANTS_ATLAS),
    {
      ...SET,
      kind: 'revision',
      id: 'revision-2',
      anchorId: 'sec:revision-2',
      eyebrow: EYEBROW.revision,
      heading: 'Revision 2',
      takeaway: TAKE_ATLAS.revision,
      footer: footerOf(STUB_REWORK_ATLAS),
      flagLines: [],
      body: REVISION_ATLAS,
    },
    secRecommendation({
      ...REC_ATLAS,
      basis: 'On the proposed revised structure · rev 2',
      prior: ESCALATE,
      token: APPROVE,
      sentence: 'Approve the revised structure. With $19.5M sponsor equity, every covenant clears with at least 15% headroom; risk score 47 (B2).',
      summary: ATLAS_REV2_SUMMARY,
      keyFigures: KEYFIGS_ATLAS_REV2,
      // read from the revised figures: how far the revised APPROVE is from being lost (the cure is minimal)
      nearestFlip: `${COPY.flipOnRevised} · Nearest flip · Total debt ≥ $76.9M (+$0.1M) → ESCALATE`,
    }),
  ],
  toReview: [],
  sourceView: SOURCE_ATLAS,
  flagsOnRecord: 2,
  countedNotes: 0,
};

/** Atlas countersigned at rev 1 (ESCALATE, routed to the Book), one exhibit attached. The header seal is the who-clause only. */
export const FX_FILE_SEALED: FileView = {
  ...FX_FILE_ATLAS_GATE,
  mode: 'sealed',
  docBar: {
    ...DOCBAR_BASE,
    files: filesWithAtlas('Countersigned 14:03'),
    status: { state: 'signed', text: 'Countersigned 14:03 · rev 1' },
    actions: SEALED_ACTIONS,
  },
  header: {
    ...HEADER_ATLAS,
    seal: {
      state: 'signed',
      headline: 'You countersigned.',
      receipt: '5 steps · 5 tool calls · drafted in 6.1 s · suspended 1:12 · lowest confidence 86% · rev 1 · run 1',
    },
  },
  sections: [secFinancials(), secRisk(), secPeers(), secCovenants(COVENANTS_ATLAS), secRecommendation(REC_ATLAS)],
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

const lowConfNote = (flagId: string, tool: string, text: string, anchor: string, time: string): NoteView => ({
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
  // row-less: J / K and Signed over land on the flag's marked line at the foot of its card
  target: { section: anchor.slice(4) as SectionId, anchorId: `flag:${flagId}` },
  actions: [{ kind: 'memo', label: COPY.showInMemo }],
  amendKind: null,
});
const NOTE_UP_MEMO = lowConfNote('flag_118', 'Memo Builder', UP_MSG_MEMO, 'sec:recommendation', '14:31:09');
const NOTE_UP_RISK = lowConfNote('flag_109', 'Risk Engine', UP_MSG_RISK, 'sec:risk', '14:31:03');
const NOTE_UP_PEERS = lowConfNote('flag_112', 'Peer Benchmarks', UP_MSG_PEERS, 'sec:peers', '14:31:05');
const NOTE_UP_BREACH: NoteView = {
  ...NOTE_ATLAS_BREACH,
  id: 'note:flag_115',
  flagId: 'flag_115',
  text: UP_MSG_BREACH,
  meta: 'raised by Covenant Tester · 14:31:07',
};
const EVIDENCE_UP: SectionFlagLine = {
  ...EVIDENCE_ATLAS,
  text: `${EVIDENCE_ATLAS.text} Extraction ran at 76% confidence on an unseen document.`,
};

const UP_MARKS = ['m2-65', 'm2-96', 'm2-106', 'm2-151', 'm2-163'];
const FIGURES_UP: FigureRow[] = [
  { id: 'revenue', anchorId: 'fig:revenue', label: 'Revenue (TTM)', value: '$155.7M', evidence: quoted(2, 65, 0), group: 'size', valueTone: 'ink', mark: null },
  { id: 'ebitda', anchorId: 'fig:ebitda', label: 'Adj. EBITDA', value: '$23.4M', evidence: quoted(2, 96, 1), group: 'size', valueTone: 'ink', mark: null },
  { id: 'margin', anchorId: 'fig:margin', label: 'EBITDA margin', value: '15.0%', evidence: quoted(2, 106, 2), group: 'size', valueTone: 'ink', mark: null },
  { id: 'debt', anchorId: 'fig:debt', label: 'Total debt', value: '$116.8M', evidence: quoted(2, 151, 3), group: 'size', valueTone: 'ink', mark: null },
  { id: 'leverage', anchorId: 'fig:leverage', label: 'Total leverage', value: '4.99x', evidence: quoted(2, 163, 4), group: 'tested', valueTone: 'bad', mark: 'breach' },
  { id: 'interest', anchorId: 'fig:interest', label: 'Interest coverage', value: '4.25x', evidence: UNQUOTED, group: 'tested', valueTone: 'ink', mark: null },
  { id: 'fixed', anchorId: 'fig:fixed', label: 'Fixed-charge coverage', value: '1.45x', evidence: UNQUOTED, group: 'tested', valueTone: 'ink', mark: null },
  { id: 'liquidity', anchorId: 'fig:liquidity', label: 'Liquidity', value: '$25.7M', evidence: UNQUOTED, group: 'tested', valueTone: 'ink', mark: null },
];
// `evidenceText` is the class in full words (the accessible name); the caption shows the short form (R4.8)
const upKey = (label: string, value: string, evidenceText: string, anchorId: string, extra: Partial<KeyFigureView> = {}): KeyFigureView => ({
  target: { section: 'financials', anchorId },
  label,
  value,
  sub: null,
  caption: null,
  tone: 'ink',
  dot: null,
  evidenceText: evidenceText === NOT_IN_CIM ? NOT_IN_CIM_SHORT : evidenceText,
  anchorId,
  ariaLabel: `${label} ${value}${extra.caption ? `, ${extra.caption}` : ''}. ${evidenceText}. Show in Financials.`,
  ...extra,
});
const REC_UP: RecommendationBody = {
  basis: COPY.basisFiled,
  prior: null,
  token: ESCALATE,
  // the data gate: the Risk Engine read 70%, under the 75% floor, so the agent escalates for verification
  sentence: 'Escalate to a credit officer. Verify the extracted figures: Risk Engine read at 70% confidence (floor 75%).',
  summary:
    'Q3 Cim screens at 4.99x leverage with a 15.0% EBITDA margin and a risk score of 54 (B2 / Speculative). 1 of 4 covenant tests fail. On the figures as extracted, the decision rule points to escalation to a credit officer: the breach is curable with sponsor equity within policy. Held for verification: the figures were read below the 75% confidence floor, and neither an approval nor a decline rests on unverified extraction.',
  keyFigures: [
    upKey('Revenue (TTM)', '$155.7M', 'Quoted · CIM para 2', 'fig:revenue'),
    upKey('Adj. EBITDA', '$23.4M', 'Quoted · CIM para 2', 'fig:ebitda', { sub: '15.0% margin' }),
    upKey('Total leverage', '4.99x', 'Quoted · CIM para 2', 'fig:leverage', { caption: '0.99x over ≤ 4.00x', tone: 'bad', dot: 'bad' }),
    upKey('Interest coverage', '4.25x', NOT_IN_CIM, 'fig:interest', { caption: '2.25x room · ≥ 2.00x' }),
    upKey('Liquidity', '$25.7M', NOT_IN_CIM, 'fig:liquidity', { caption: '$15.7M room · ≥ $10.0M' }),
  ],
  aidLabel: COPY.aidLabel,
  nearestFlip: `${COPY.flipUnverified('ESCALATE')} · Nearest flip · Total debt ≤ $79.5M (${M}$37.3M) → APPROVE`,
  stressLinkLabel: COPY.stressLink,
  reworkLine: null,
  summaryLabel: COPY.summaryBlock,
  keyFiguresLabel: COPY.keyFiguresBlock,
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
  label: COPY.peersBlock,
  rows: [
    { cohort: 'This deal', leverage: '4.99x', interest: '4.25x', margin: '15.0%', isDeal: true },
    { cohort: 'Top quartile', leverage: '3.59x', interest: '6.59x', margin: '19.5%', isDeal: false },
    { cohort: 'Sector median', leverage: '4.64x', interest: '4.76x', margin: '15.6%', isDeal: false },
    { cohort: 'Bottom quartile', leverage: '6.09x', interest: '3.32x', margin: '11.4%', isDeal: false },
  ],
};
const COVENANTS_UP: CovenantRow[] = [
  {
    ...COVENANTS_ATLAS[0],
    actual: '4.99x',
    cushion: { pct: -24.8, text: `${M}24.8%`, tone: 'bad' },
    amend: AMEND_LEVERAGE,
    // the uploaded CIM states its leverage ("or 4.99x leverage"), so this Actual is Quoted
    evidence: covEv('Max Total Leverage', '4.99x', 'leverage', 'Quoted · CIM para 2'),
  },
  { ...COVENANTS_ATLAS[1], actual: '4.25x', cushion: { pct: 52.9, text: '+52.9%', tone: 'neutral' }, evidence: covEv('Min Interest Coverage', '4.25x', 'interest', NOT_IN_CIM) },
  { ...COVENANTS_ATLAS[2], actual: '1.45x', cushion: { pct: 24.1, text: '+24.1%', tone: 'neutral' }, evidence: covEv('Min Fixed-Charge Coverage', '1.45x', 'fixed', NOT_IN_CIM) },
  {
    ...COVENANTS_ATLAS[3],
    actual: '$25.7M',
    cushion: { pct: 61.1, text: '+61.1%', tone: 'neutral' },
    amend: AMEND_LIQUIDITY,
    evidence: covEv('Min Liquidity', '$25.7M', 'liquidity', NOT_IN_CIM),
  },
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
    files: [...FILES_INITIAL, { dealId: UP_ID, label: 'Q3 Cim', meta: 'Awaiting you · rev 1' }],
    status: { state: 'awaiting', text: 'Awaiting your countersignature · rev 1 · 4 notes to review' },
    extraction: { text: 'Extraction 76%', tone: 'warn' },
    policySuffix: 'Policy · not eligible',
    goToDecision: true,
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
  sections: [
    secFinancials(FIGURES_UP, upStub(STUB_EXTRACT, '1.1 s · 76%', 'warn'), take('breach', 'Total leverage 4.99x breaches the ≤ 4.00x covenant; the other 3 tested figures clear theirs.'), [EVIDENCE_UP]),
    secRisk(RISK_UP, upStub(STUB_RISK, '800 ms · 70%', 'bad'), take('watch', 'Risk 54 (B2 / Speculative) is 6 points under the 60 referral line and 21 under the 75 decline line.'), [flagLine('flag_109', 'watch', 'Risk Engine returned 70% confidence (floor 75%)')]),
    secPeers(PEERS_UP, upStub(STUB_PEERS, '850 ms · 68%', 'bad'), take('info', 'Total leverage 4.99x is above the sector median of 4.64x.', COPY.peersBasis), [flagLine('flag_112', 'watch', 'Peer Benchmarks returned 68% confidence (floor 75%)')]),
    secCovenants(COVENANTS_UP, upStub(STUB_COVENANTS, '900 ms · 79%', 'warn'), take('breach', '1 of 4 covenants breached: Max Total Leverage.')),
    secRecommendation(REC_UP, upStub(STUB_PACKAGE, '700 ms · 73%', 'bad'), [flagLine('flag_118', 'watch', 'Memo Builder returned 73% confidence (floor 75%)')]),
  ],
  // emission order: Risk Engine, Peer Benchmarks, Covenant Tester, then Memo Builder
  toReview: [NOTE_UP_RISK, NOTE_UP_PEERS, NOTE_UP_BREACH, NOTE_UP_MEMO],
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
  appendix: { eyebrow: COPY.appendixEyebrow, heading: COPY.appendixTitle, meta: 'sweep #6 · 3 s ago', rows: null, empty: COPY.firstSweepPending },
  rows: { exhibits: false, stress: true, signature: true, monitoring: true },
  primary: null,
  flagsOnRecord: 4,
  countedNotes: 4,
};

// =============================================================================
// Thread notes and the raw step record (kit specimens)
// =============================================================================

/** Thread flag messages: a breach with "Amend term", a watch, a low-confidence note, the evidence check, a restructure and a signed-over note. */
export const FX_NOTES: { breach: NoteView; watch: NoteView; low: NoteView; evidence: NoteView; restructure: NoteView; signedOver: NoteView } = {
  breach: NOTE_ATLAS_BREACH,
  watch: NOTE_ATLAS_FCC,
  low: NOTE_UP_RISK,
  evidence: NOTE_ATLAS_EVIDENCE,
  restructure: NOTE_ATLAS_RESTRUCTURE,
  signedOver: signedOver(NOTE_ATLAS_BREACH, true),
};

/** The Document Intelligence step record (args → / ← result) behind the Financials card's "Record" footer. */
export const FX_STUB_EXTRACT: StubView = STUB_EXTRACT;

// =============================================================================
// The agent panel (THREE-PANE R2.1): command and control only, one line each
// =============================================================================

/** One panel line; a link points at a memo card ("Covenants →", 'signature' = "Decision →"). */
const L = (id: string, kind: ThreadLine['kind'], glyph: ThreadLine['glyph'], text: string, to: FileAt | null = null): ThreadLine => ({
  id,
  kind,
  glyph,
  text,
  link: to ? { label: sectionLinkLabel(to), target: to } : null,
});
const PANEL_COMPOSER: AgentPanelView['composer'] = { placeholder: COPY.composerPlaceholder, disabled: false, disabledReason: null };
const ATLAS_RUN: ThreadLine[] = [
  L('run', 'run', null, 'Drafting the memo for Project Atlas.'),
  L('step:step_extract', 'step', 'done', 'Financials extracted', 'financials'),
  L('step:step_risk', 'step', 'done', 'Risk scored', 'risk'),
  L('step:step_peers', 'step', 'done', 'Peers benchmarked', 'peers'),
  L('step:step_covenants', 'step', 'done', 'Covenants tested', 'covenants'),
  L('flag:step_covenants', 'flag', 'breach', '1 covenant breached', 'covenants'),
  L('step:step_package', 'step', 'done', 'Recommendation written', 'recommendation'),
];

/** Atlas, never run: one ready line; the composer takes "draft the memo" (⌘↵ also starts). */
export const FX_PANEL_NOT_STARTED: AgentPanelView = {
  title: 'Credit Analyst · Project Atlas',
  lines: [L('ready', 'system', 'pending', 'Ready to draft Project Atlas.')],
  plan: null,
  start: { label: 'Draft memo', kbd: '⌘↵', disabled: false },
  composer: PANEL_COMPOSER,
};

/** Atlas in plan review after typing "draft the memo": the plan prompt above the composer, the countdown running. */
export const FX_PANEL_PLAN_REVIEW: AgentPanelView = {
  ...FX_PANEL_NOT_STARTED,
  start: null,
  lines: [L('e1', 'you', null, 'You · draft the memo')],
  plan: {
    text: 'My plan: 5 steps. Peer benchmarks is optional; untick it to skip.',
    steps: [
      { id: 'step_extract', n: 1, title: 'Financials', tool: 'Document Intelligence', optional: false, included: true, toggleLabel: 'Skip Financials' },
      { id: 'step_risk', n: 2, title: 'Risk score and rating', tool: 'Risk Engine', optional: false, included: true, toggleLabel: 'Skip Risk score and rating' },
      { id: 'step_peers', n: 3, title: 'Peer benchmarks', tool: 'Peer Benchmarks', optional: true, included: true, toggleLabel: 'Skip Peer benchmarks' },
      { id: 'step_covenants', n: 4, title: 'Covenant compliance', tool: 'Covenant Tester', optional: false, included: true, toggleLabel: 'Skip Covenant compliance' },
      { id: 'step_package', n: 5, title: 'Recommendation', tool: 'Memo Builder', optional: false, included: true, toggleLabel: 'Skip Recommendation' },
    ],
    start: { label: COPY.startDrafting, kbd: '⌘↵', disabled: false },
    optional: { stepId: 'step_peers', label: 'Skip peers', included: true },
    cancelLabel: COPY.cancel,
    preview: false,
    countdown: { text: 'Starts in 6 s', holdLabel: COPY.hold },
  },
};

/** Atlas drafting step 4: the running step line carries the static working glyph. */
export const FX_PANEL_RUNNING: AgentPanelView = {
  ...FX_PANEL_NOT_STARTED,
  start: null,
  lines: [...ATLAS_RUN.slice(0, 4), L('step:step_covenants', 'step', 'drafting', 'Testing covenants', 'covenants')],
};

/** Atlas at the rev 1 gate: one gate line pointing at the memo's Decision card (no token in the panel). */
export const FX_PANEL_ATLAS_GATE: AgentPanelView = {
  ...FX_PANEL_NOT_STARTED,
  start: null,
  lines: [...ATLAS_RUN, L('gate:1', 'gate', 'awaiting', COPY.gateLine, 'signature')],
};

/** A real answer's ONE panel line (R4.5): the answer itself is in the memo's Questions block, where the link cues its entry. */
const ANSWERED = (id: string): ThreadLine => ({
  id,
  kind: 'answered',
  glyph: null,
  text: COPY.answeredInMemo,
  link: { label: sectionLinkLabel('questions'), target: 'questions', anchorId: qaAnchor(id) },
});

/**
 * Atlas at the rev 2 gate after Q&A at rev 1: a typed "countersign" refused with a pointer to the
 * Decision card, two real answers that each leave one "Answered in the memo" line (the answers are
 * FX_QUESTIONS_ATLAS), a what-if question that gets the one-line stress-test pointer, then the
 * return and the cure.
 */
export const FX_PANEL_ATLAS_REV2: AgentPanelView = {
  ...FX_PANEL_NOT_STARTED,
  start: null,
  lines: [
    ...ATLAS_RUN,
    L('e2', 'you', null, 'You · countersign'),
    L('e3', 'answer', 'info', COPY.reply.decisionGate, 'signature'),
    L('e4', 'you', null, 'You · why escalate?'),
    ANSWERED('e5'),
    L('e6', 'you', null, 'You · which covenants are tight?'),
    ANSWERED('e7'),
    L('e8', 'you', null, 'You · what if EBITDA falls 10%?'),
    L('e9', 'answer', null, COPY.askStressPointer, 'stress'),
    L('returned:2', 'revision', 'returned', 'Returned for revision · rev 2', 'revision-2'),
    L('step:step_rework_2', 'revision', 'done', 'Proposed a $19.5M sponsor equity cure', 'revision-2'),
    L('gate:2', 'gate', 'awaiting', COPY.gateLine, 'signature'),
  ],
};

/**
 * The memo's Questions block for Atlas after the rev 1 Q&A above (R4.5, P-33): each answer in full
 * under its question, the source and the time, and the memo card it concerns. "why escalate?" is
 * Countersign's deterministic answer from the decision rule's own reasons; "which covenants are
 * tight?" is the engine's rule-based responder over the filed figures.
 */
export const FX_QUESTIONS_ATLAS: QuestionsView = {
  eyebrow: COPY.questionsEyebrow,
  aid: COPY.aidLabel,
  entries: [
    {
      id: 'e5',
      anchorId: qaAnchor('e5'),
      question: 'why escalate?',
      answer: `The agent recommends ESCALATE. ${ATLAS_REASON_BREACH} ${ATLAS_REASON_THIN}`,
      meta: `${COPY.askMetaLocal} · 14:02`,
      link: { label: sectionLinkLabel('recommendation'), target: { section: 'recommendation', anchorId: 'sec:recommendation' } },
    },
    {
      id: 'e7',
      anchorId: qaAnchor('e7'),
      question: 'which covenants are tight?',
      answer: `1 of 4 covenant tests fail: Max Total Leverage 4.26x vs ≤ 4.00x (${M}6.5% headroom). Of the passing tests, Min Interest Coverage 2.10x vs ≥ 2.00x (4.8% headroom) and Min Fixed-Charge Coverage 1.18x vs ≥ 1.10x (6.8% headroom) sit inside the 15% policy cushion.`,
      meta: `${COPY.askMetaEngine} · 14:03`,
      link: { label: sectionLinkLabel('covenants'), target: { section: 'covenants', anchorId: 'sec:covenants' } },
    },
  ],
};

/** An answered question as its Ledger row (R4.5): a Reviewer event of its run, the answer as the detail. */
export const FX_LEDGER_QUESTION_ROW: LedgerRow = {
  id: 'e7',
  time: '14:03:08',
  actor: 'Reviewer',
  event: COPY.askedEvent('which covenants are tight?'),
  detail: FX_QUESTIONS_ATLAS.entries[1].answer,
  chip: 'reviewer',
  raw: {
    'Event id': 'e7',
    'ISO time': '2026-10-20T14:03:08.000Z',
    Actor: 'Reviewer',
    Kind: 'question',
    File: 'Project Atlas',
    Run: '1',
    'Raw label': COPY.askedRawLabel,
    Detail: FX_QUESTIONS_ATLAS.entries[1].answer,
    [COPY.answeredBy]: COPY.askMetaEngine,
  },
};

/** Meridian at its clean gate with the policy armed: the countdown is one line. */
export const FX_PANEL_MERIDIAN_COUNTDOWN: AgentPanelView = {
  title: 'Credit Analyst · Project Meridian',
  lines: [
    L('run', 'run', null, 'Drafting the memo for Project Meridian.'),
    L('step:step_extract', 'step', 'done', 'Financials extracted', 'financials'),
    L('step:step_risk', 'step', 'done', 'Risk scored', 'risk'),
    L('step:step_peers', 'step', 'done', 'Peers benchmarked', 'peers'),
    L('step:step_covenants', 'step', 'done', 'Covenants tested', 'covenants'),
    L('step:step_package', 'step', 'done', 'Recommendation written', 'recommendation'),
    L('gate:1', 'gate', 'awaiting', 'Auto-countersigning in 4 s', 'signature'),
  ],
  plan: null,
  start: null,
  composer: PANEL_COMPOSER,
};

/** Atlas countersigned at rev 1 (ESCALATE): the decided line links to the record on the Decision card. */
export const FX_PANEL_SEALED: AgentPanelView = {
  ...FX_PANEL_NOT_STARTED,
  start: null,
  lines: [...ATLAS_RUN, { id: 'decided', kind: 'decided', glyph: 'signed', text: 'You countersigned ESCALATE · 14:03', link: { label: COPY.recordLink, target: 'signature' } }],
};

/** Cobalt rejected at rev 2 after a send-back found no cure. */
export const FX_PANEL_COBALT_REJECTED: AgentPanelView = {
  title: 'Credit Analyst · Project Cobalt',
  lines: [
    L('run', 'run', null, 'Drafting the memo for Project Cobalt.'),
    L('step:step_extract', 'step', 'done', 'Financials extracted', 'financials'),
    L('step:step_risk', 'step', 'done', 'Risk scored', 'risk'),
    L('step:step_peers', 'step', 'done', 'Peers benchmarked', 'peers'),
    L('step:step_covenants', 'step', 'done', 'Covenants tested', 'covenants'),
    L('flag:step_covenants', 'flag', 'breach', '4 covenants breached', 'covenants'),
    L('step:step_package', 'step', 'done', 'Recommendation written', 'recommendation'),
    L('returned:2', 'revision', 'returned', 'Returned for revision · rev 2', 'revision-2'),
    L('step:step_rework_2', 'revision', 'watch', 'No restructure within policy', 'revision-2'),
    { id: 'decided', kind: 'decided', glyph: 'rejected', text: 'You rejected the memo · 14:22', link: { label: COPY.recordLink, target: 'signature' } },
  ],
  plan: null,
  start: null,
  composer: PANEL_COMPOSER,
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
const VERB_NOTES = (sign: string, _cure: boolean, nextRev = 2, rej = 'The credit does not proceed. Note required.'): NonNullable<SignatureView['verbs']>['notes'] => ({
  sign,
  ret: `The agent revises and returns rev ${nextRev}. Note required.`,
  rej,
});
const VERBS = (primary: string, notes: NonNullable<SignatureView['verbs']>['notes'] = VERB_NOTES('Routes the memo to senior credit review.', true)): NonNullable<SignatureView['verbs']> => ({
  primary,
  returnLabel: IMPERATIVE.returnLabel,
  rejectLabel: IMPERATIVE.rejectLabel,
  disabled: false,
  armed: null,
  cancelLabel: null,
  kbd: { sign: 'A', ret: 'S', rej: 'R' },
  notes,
});
/** The Decision card's open reviewer line at the gate: a record awaiting ink, never a control. */
const REVIEWER_OPEN: SignatureView['reviewer'] = {
  sigState: 'open',
  caption: STATUS_WORD.awaiting,
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
    target: { section: 'covenants', anchorId: 'cov:Max Total Leverage' },
    linkLabel: COPY.showRow,
  },
  {
    flagId: ATLAS_FLAG_FCC,
    noteId: `note:${ATLAS_FLAG_FCC}`,
    state: 'watch',
    text: 'Fixed-charge coverage 1.18x leaves only thin headroom over the 1.10x floor',
    cleared: false,
    opened: false,
    target: { section: 'covenants', anchorId: 'cov:Min Fixed-Charge Coverage' },
    linkLabel: COPY.showRow,
  },
];

/**
 * R4.3 (Mobbin audit fix 3): interest coverage, fixed-charge coverage and liquidity are not stated in
 * any sample CIM, so each Decision card carries the one info item after Signed over (never counted).
 */
const INPUTS_NOT_IN_CIM: SignatureView['inputsNotInCim'] = {
  text: COPY.inputsNotInCim(3),
  linkLabel: COPY.showInMemo,
  target: { section: 'covenants', anchorId: 'sec:covenants' },
};
/** The clause the sealed caption adds (R4.3). */
const SIGNED_NOT_IN_CIM = ` · ${COPY.sealedNotInCim(3, 'signed')}`;

/** Atlas rev 1 gate, policy off. */
export const FX_SIG_ATLAS_GATE: SignatureView = {
  state: 'gate',
  eyebrow: 'Your countersignature · CAM-2026-0417 · rev 1',
  heading: COPY.decision,
  pendingLine: null,
  record: null,
  returned: [],
  signedOver: SIGNED_OVER_ATLAS,
  signedOverLabel: 'Signed over · you opened 0 of 2',
  inputsNotInCim: INPUTS_NOT_IN_CIM,
  agent: { text: COPY.agentSignature, caption: 'Credit Analyst (agent) · rev 1 · 14:02' },
  reviewer: REVIEWER_OPEN,
  policy: POLICY_OFF,
  note: NOTE_EMPTY,
  amendment: null,
  attestation:
    "Countersigning concurs with the agent's ESCALATE on CAM-2026-0417 and signs over 2 notes, including 1 covenant breach. The memo then routes to the escalation queue for senior credit review.",
  // the reason is the decide rule's own (first two reasons, with their sizes)
  call: { lead: COPY.agentRecommends, token: ESCALATE, title: 'Send Project Atlas to senior credit review?', why: `${ATLAS_REASON_BREACH} ${ATLAS_REASON_THIN}` },
  verbs: VERBS('Countersign escalation'),
  sealed: null,
};

/**
 * Atlas rev 1 gate with Max Total Leverage amended in place to ≤ 4.30x. The breach clears, but the
 * same rule re-tests headroom: 0.9% on leverage (and the coverages' thin cushions) still escalates.
 */
export const FX_SIG_ATLAS_AMENDED: SignatureView = {
  ...FX_SIG_ATLAS_GATE,
  signedOver: [{ ...SIGNED_OVER_ATLAS[0], cleared: true }, SIGNED_OVER_ATLAS[1]],
  amendment: {
    text: 'Amended terms · Max Total Leverage ≤ 4.00x → ≤ 4.30x · as amended',
    token: ESCALATE,
    revertLabel: COPY.revert,
    editLabel: COPY.editInMemo,
    editKind: 'leverage',
    editTarget: { section: 'covenants', anchorId: 'cov:Max Total Leverage' },
  },
  attestation:
    'Countersigning as amended concurs with ESCALATE on your amended terms (Max Total Leverage ≤ 4.30x). Your amended term is recorded with your signature. The memo then routes to the escalation queue for senior credit review.',
  // the token stays the AGENT's call (ESCALATE); the amended outcome is the reviewer's, stated in the reason
  call: {
    lead: COPY.agentRecommends,
    token: ESCALATE,
    title: 'Send Project Atlas to senior credit review on your amended terms?',
    why: 'On your amended terms (Max Total Leverage ≤ 4.30x) the same decision rule still gives ESCALATE. Thin headroom: total leverage 0.9%, interest coverage 4.8%, fixed-charge coverage 6.8% (policy cushion 15%).',
  },
  verbs: VERBS('Countersign as amended', VERB_NOTES('Routes the memo to senior credit review.', false)),
};

/** Atlas rev 2 gate on the revised structure; policy on and correctly not eligible. */
export const FX_SIG_ATLAS_REV2: SignatureView = {
  ...FX_SIG_ATLAS_GATE,
  eyebrow: 'Your countersignature · CAM-2026-0417 · rev 2',
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
    'Countersigning concurs with the revised structure on CAM-2026-0417 ($19.5M sponsor equity: $19.5M debt paydown), subject to the sponsor commitment. There are no notes to sign over.',
  call: {
    lead: COPY.agentRecommends,
    token: APPROVE,
    title: 'Approve Project Atlas on the revised structure?',
    why: `With $19.5M of sponsor equity the same decision rule now approves: ${ATLAS_REASON_REV2.charAt(0).toLowerCase()}${ATLAS_REASON_REV2.slice(1)}`,
  },
  verbs: VERBS('Countersign revised structure', VERB_NOTES('Approves the revised structure.', false, 3)),
};

/** Meridian at its clean rev 1 gate with the policy armed: the line fills over 5 s. */
export const FX_SIG_MERIDIAN_COUNTDOWN: SignatureView = {
  state: 'countdown',
  eyebrow: 'Your countersignature · CAM-2026-0418 · rev 1',
  heading: COPY.decision,
  pendingLine: null,
  record: null,
  returned: [],
  signedOver: [],
  signedOverLabel: 'Signed over · no notes',
  inputsNotInCim: INPUTS_NOT_IN_CIM,
  agent: { text: COPY.agentSignature, caption: 'Credit Analyst (agent) · rev 1 · 14:12' },
  reviewer: {
    sigState: 'countdown',
    caption: 'Auto-countersign in 4 s · clean-approval policy',
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
  call: { lead: COPY.agentRecommends, token: APPROVE, title: 'Approve Project Meridian as filed?', why: 'Every covenant clears with at least 15% headroom; risk score 28 (Ba2).' },
  verbs: VERBS('Countersign approval', VERB_NOTES('Approves the facility as filed.', false)),
  sealed: null,
};

const covRow = (name: string) => ({ target: { section: 'covenants' as const, anchorId: `cov:${name}` }, linkLabel: COPY.showRow });
const SIGNED_OVER_COBALT: SignatureView['signedOver'] = [
  { flagId: 'flag_61', noteId: 'note:flag_61', state: 'breach', text: 'Max Total Leverage 5.66x breaches the ≤ 4.00x covenant', cleared: false, opened: false, ...covRow('Max Total Leverage') },
  { flagId: 'flag_62', noteId: 'note:flag_62', state: 'breach', text: 'Min Interest Coverage 1.40x breaches the ≥ 2.00x covenant', cleared: false, opened: false, ...covRow('Min Interest Coverage') },
  { flagId: 'flag_63', noteId: 'note:flag_63', state: 'breach', text: 'Min Fixed-Charge Coverage 0.95x breaches the ≥ 1.10x covenant', cleared: false, opened: false, ...covRow('Min Fixed-Charge Coverage') },
  { flagId: 'flag_64', noteId: 'note:flag_64', state: 'breach', text: 'Min Liquidity $6.5M breaches the ≥ $10.0M covenant', cleared: false, opened: false, ...covRow('Min Liquidity') },
  // no ratio keyword: no row of its own, so its link reads "Show in memo" and lands on its marked
  // line at the foot of the Covenants card
  {
    flagId: 'flag_65',
    noteId: 'note:flag_65',
    state: 'watch',
    text: 'Earnings are highly sensitive to commodity prices',
    cleared: false,
    opened: false,
    target: { section: 'covenants', anchorId: 'flag:flag_65' },
    linkLabel: COPY.showInMemo,
  },
];

/** Cobalt rev 1 gate: DECLINE, 5 counted notes. */
export const FX_SIG_COBALT_GATE: SignatureView = {
  state: 'gate',
  eyebrow: 'Your countersignature · CAM-2026-0419 · rev 1',
  heading: COPY.decision,
  pendingLine: null,
  record: null,
  returned: [],
  signedOver: SIGNED_OVER_COBALT,
  signedOverLabel: 'Signed over · you opened 0 of 5',
  inputsNotInCim: INPUTS_NOT_IN_CIM,
  agent: { text: COPY.agentSignature, caption: 'Credit Analyst (agent) · rev 1 · 14:20' },
  reviewer: REVIEWER_OPEN,
  policy: POLICY_OFF,
  note: NOTE_EMPTY,
  amendment: null,
  attestation:
    "Countersigning concurs with the agent's DECLINE on CAM-2026-0419 and signs over 5 notes, including 4 covenant breaches. The facility is recorded as declined as structured.",
  // every principal reason (the long breach list keeps its head clause; the rows are signed over above)
  call: {
    lead: COPY.agentRecommends,
    token: DECLINE,
    title: 'Decline Project Cobalt?',
    why: `Risk score 82 is at or above the 75 decline line (Caa1). Fixed-charge coverage 0.95x is below the 1.00x floor: cash flow does not cover fixed charges. 4 covenants breach: liquidity $6.5M vs ≥ $10.0M (${M}53.8% headroom), interest coverage 1.40x vs ≥ 2.00x (${M}42.9%), total leverage 5.66x vs ≤ 4.00x (${M}41.5%), fixed-charge coverage 0.95x vs ≥ 1.10x (${M}15.8%). No cure within policy: even $39.2M of debt paydown (the 35% cap) leaves total leverage, interest coverage and fixed-charge coverage short of the 15% cushion.`,
  },
  verbs: VERBS(
    'Countersign decline',
    VERB_NOTES('You agree with the analysis: the facility is recorded as declined.', true, 2, 'You disagree with the analysis: the memo is refused. Note required.'),
  ),
  sealed: null,
};

/**
 * R4 (Mobbin audit fix 1) · Atlas rev 1 with Return armed: the first press only armed it. The note
 * typed before the press is in focus for review (selected after a click), the label asks the verb's
 * question with the real next revision, the armed button reads its commit label with the commit
 * chord (the only chip left: A and R cannot act from the note), and a quiet Cancel shares the row.
 * Nothing is decided until Return is pressed again.
 */
export const FX_SIG_ATLAS_ARMED_RETURN: SignatureView = {
  ...FX_SIG_ATLAS_GATE,
  note: { ...NOTE_EMPTY, value: ATLAS_RETURN_NOTE, label: COPY.armedReworkLabel(2) },
  verbs: { ...VERBS('Countersign escalation'), returnLabel: IMPERATIVE.returnCommit, armed: 'rework', cancelLabel: COPY.cancelArmed, kbd: { sign: null, ret: '⌘↵', rej: null } },
};

/**
 * R4 · Cobalt rev 1 with Reject armed and pressed again on an empty note: it stays armed, the note
 * keeps focus and the calm hint asks for the reason (a quiet line, never an alert).
 */
export const FX_SIG_COBALT_ARMED_REJECT: SignatureView = {
  ...FX_SIG_COBALT_GATE,
  note: { ...NOTE_EMPTY, label: COPY.armedRejectLabel, hint: COPY.reasonFirstReject },
  verbs: FX_SIG_COBALT_GATE.verbs
    ? { ...FX_SIG_COBALT_GATE.verbs, rejectLabel: IMPERATIVE.rejectCommit, armed: 'reject', cancelLabel: COPY.cancelArmed, kbd: { sign: null, ret: null, rej: '⌘↵' } }
    : null,
};

/** Atlas countersigned at rev 1 (ESCALATE), routed to the Book. */
export const FX_SIG_SEALED: SignatureView = {
  ...FX_SIG_ATLAS_GATE,
  state: 'signed',
  eyebrow: 'Countersignature record · CAM-2026-0417 · rev 1',
  record: { state: 'signed', headline: 'The agent recommended ESCALATE. You countersigned.' },
  call: null,
  signedOver: [
    { ...SIGNED_OVER_ATLAS[0], state: 'signed-over', opened: true },
    { ...SIGNED_OVER_ATLAS[1], state: 'signed-over' },
  ],
  signedOverLabel: 'Signed over · you opened 1 of 2',
  reviewer: {
    sigState: 'signed',
    caption: `Countersigned · concurs ESCALATE · Reviewer · 17 Oct 2026, 14:03${SIGNED_NOT_IN_CIM}`,
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
    caption: `Countersigned · concurs ESCALATE · Reviewer · 17 Oct 2026, 14:03${SIGNED_NOT_IN_CIM}`,
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
  eyebrow: 'Countersignature record · CAM-2026-0418 · rev 1',
  record: { state: 'signed-auto', headline: 'The agent recommended APPROVE. The policy countersigned.' },
  call: null,
  reviewer: {
    sigState: 'signed-auto',
    caption: `Auto-countersigned · clean-approval policy · 17 Oct 2026, 14:12${SIGNED_NOT_IN_CIM}`,
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
    caption: `Auto-countersigned · clean-approval policy · 17 Oct 2026, 14:12${SIGNED_NOT_IN_CIM}`,
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
  eyebrow: 'Countersignature record · CAM-2026-0419 · rev 2',
  record: { state: 'rejected', headline: 'The agent recommended DECLINE. You rejected the memo.' },
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
      target: { section: 'revision-2', anchorId: 'sec:revision-2' },
      linkLabel: COPY.showInMemo,
    },
  ],
  signedOverLabel: 'Notes on the record · you opened 1 of 6',
  agent: { text: COPY.agentSignature, caption: 'Credit Analyst (agent) · rev 2 · 14:21' },
  reviewer: {
    sigState: 'rejected',
    caption: `Rejected · Reviewer · 14:22 · ${COPY.sealedNotInCim(3, 'decided')}`,
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
    caption: `Rejected · Reviewer · 14:22 · ${COPY.sealedNotInCim(3, 'decided')}`,
    quote: '“No structure within policy clears four breaches. Not a credit we can restructure.”',
    provenance: 'authored by the reviewer',
    amendments: [],
    routed: null,
    routedLinkLabel: null,
    checks: null,
  },
};

/**
 * R4.3 · Meridian rejected at its clean rev 1 gate: no notes, and a refusal signs nothing over, so
 * the list reads "Notes on the record · none" above the info item, never "Signed over".
 */
export const FX_SIG_MERIDIAN_REJECTED: SignatureView = {
  ...FX_SIG_MERIDIAN_COUNTDOWN,
  state: 'rejected',
  eyebrow: 'Countersignature record · CAM-2026-0418 · rev 1',
  record: { state: 'rejected', headline: 'The agent recommended APPROVE. You rejected the memo.' },
  signedOverLabel: 'Notes on the record · none',
  reviewer: {
    sigState: 'rejected',
    caption: `Rejected · Reviewer · 14:13 · ${COPY.sealedNotInCim(3, 'decided')}`,
    ink: 'none',
    autoText: null,
    rejectedWord: 'REJECTED',
    fillMs: 5000,
    reviewLabel: null,
  },
  policy: POLICY_OFF,
  note: null,
  attestation: null,
  call: null,
  verbs: null,
  sealed: {
    caption: `Rejected · Reviewer · 14:13 · ${COPY.sealedNotInCim(3, 'decided')}`,
    quote: '“Liquidity has no source in the CIM. I will not approve on extracted figures.”',
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

/**
 * Atlas stress test, open, Total debt stressed to $76.8M (the minimal cure's debt): flips to APPROVE.
 * Every covenant then clears with at least the 15% policy cushion (total leverage lands on 15.1%),
 * so the debt track's APPROVE boundary sits one step above the current value.
 */
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
        { tone: 'bad', fromPct: 0, toPct: 28.39 },
        { tone: 'warn', fromPct: 28.39, toPct: 42.59 },
        { tone: 'good', fromPct: 42.59, toPct: 100 },
      ],
      boundaries: [
        { pct: 28.39, text: '$18.0M', tone: 'bad' },
        { pct: 42.59, text: '$22.5M', tone: 'warn' },
      ],
    },
    {
      key: 'debt',
      label: 'Total debt',
      value: 76.8,
      min: 48.2,
      max: 154.1,
      step: 0.1,
      valueText: '$76.8M',
      deltaText: `${M}$19.5M`,
      deltaTone: 'good',
      zones: [
        { tone: 'good', fromPct: 0, toPct: 27.1 },
        { tone: 'warn', fromPct: 27.1, toPct: 66.1 },
        { tone: 'bad', fromPct: 66.1, toPct: 100 },
      ],
      boundaries: [
        { pct: 27.1, text: '$76.9M', tone: 'warn' },
        { pct: 66.1, text: '$118.2M', tone: 'bad' },
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
        { tone: 'good', fromPct: 0, toPct: 52.06 },
        { tone: 'warn', fromPct: 52.06, toPct: 89.12 },
        { tone: 'bad', fromPct: 89.12, toPct: 100 },
      ],
      boundaries: [
        { pct: 52.06, text: '11.85%', tone: 'warn' },
        { pct: 89.12, text: '18.15%', tone: 'bad' },
      ],
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
        { tone: 'warn', fromPct: 0, toPct: 37.5 },
        { tone: 'good', fromPct: 37.5, toPct: 100 },
      ],
      boundaries: [{ pct: 37.5, text: '$11.7M', tone: 'warn' }],
    },
  ],
  outcome: {
    base: ESCALATE,
    live: APPROVE,
    text: `flips · risk 58 → 47 · headroom ${M}6.5% → 15.1% · breaches 1 → 0`,
    key: 'ebitda=22.60|debt=76.80|rate=11.18|liquidity=14.20',
  },
  // the stress test's actuals are scenario values, so they carry no evidence (R4.3)
  covenants: [
    { ...COVENANTS_ATLAS[0], actual: '3.40x', actualTone: 'ink', cushion: { pct: 15, text: '+15.0%', tone: 'neutral' }, status: 'pass', statusText: 'Pass', evidence: null },
    { ...COVENANTS_ATLAS[1], actual: '2.63x', cushion: { pct: 24, text: '+24.0%', tone: 'neutral' }, evidence: null },
    { ...COVENANTS_ATLAS[2], actual: '1.33x', cushion: { pct: 17.3, text: '+17.3%', tone: 'neutral' }, evidence: null },
    { ...COVENANTS_ATLAS[3], evidence: null },
  ],
  attach: { label: COPY.attachAsExhibit, disabled: false, reason: null },
  readonlyNote: null,
  resetLabel: COPY.resetToBase,
  closeLabel: COPY.stressClose,
  resetDisabled: false,
};

/** One attached stress test on the Atlas memo. */
export const FX_EXHIBITS: ExhibitView[] = [
  {
    id: 'audit_88',
    letter: 'A',
    heading: COPY.stressTest,
    meta: 'attached 14:04 · Reviewer',
    detail: `Total debt $96.3M→$76.8M ⇒ risk 58→47, headroom ${M}6.5%→15.1%, breaches 1→0`,
    from: ESCALATE,
    to: APPROVE,
    result: 'flips',
  },
];

// =============================================================================
// Book
// =============================================================================

const ACK = { kind: 'acknowledge' as const, label: COPY.acknowledge };
/** R4.6 reasons on the record (the Book's acknowledged lines and the Ledger's Reviewer rows agree) */
const ACK_WAIVER = 'Waiver in negotiation with sponsor';
const ACK_WAIVER_FCC = 'Same waiver request covers the fixed-charge test';
const ACK_SEASONAL = 'Thin headroom expected through Q3 seasonality';
const ackLine = (breach: boolean, note: string | null): string =>
  `${breach ? COPY.ackUntilBreach : COPY.ackUntilWatch} · ${note ? `“${note}”` : COPY.ackNoReason}`;
const monitorItem = (id: string, covenant: string, reading: string, distance: string, breach: boolean, ackAt: string | null, ackNote: string | null = null): BookItem => ({
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
  ack: null,
  ackRecord: ackAt ? ackLine(breach, ackNote) : null,
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
    monitorItem('esc_5', 'Min Interest Coverage', '1.36x / ≥ 2.00x', '0.64x short', true, '14:05', ACK_WAIVER),
    monitorItem('esc_6', 'Min Fixed-Charge Coverage', '0.93x / ≥ 1.10x', '0.17x short', true, '14:05', ACK_WAIVER_FCC),
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
      ack: null,
      ackRecord: null,
    },
    monitorItem('esc_2', 'Min Interest Coverage', '2.06x / ≥ 2.00x', '0.06x room', false, '14:04', ACK_SEASONAL),
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

/** R4.6: the Acknowledge strip under Cobalt's Max Total Leverage breach, just opened (a reason is required). */
export const FX_BOOK_ACK_BREACH: BookAckView = {
  label: COPY.ackStripLabel('Max Total Leverage', 'Project Cobalt'),
  text: COPY.ackConsequence(true, COPY.ackUntilBreach),
  placeholder: COPY.ackQuestion,
  value: '',
  required: true,
  hint: null,
  confirmLabel: COPY.acknowledge,
  cancelLabel: COPY.cancel,
};
/** The same strip after Acknowledge with no reason: the calm hint, focus back in the field. */
export const FX_BOOK_ACK_HINT: BookAckView = { ...FX_BOOK_ACK_BREACH, hint: COPY.ackReasonFirst };
/** A watch item's strip with a reason typed (a reason is optional there). */
export const FX_BOOK_ACK_WATCH: BookAckView = {
  ...FX_BOOK_ACK_BREACH,
  label: COPY.ackStripLabel('Min Interest Coverage', 'Project Atlas'),
  text: COPY.ackConsequence(false, COPY.ackUntilWatch),
  value: ACK_SEASONAL,
  required: false,
};
/** Cobalt's acknowledged Min Interest Coverage item: its line under the figures. */
export const FX_BOOK_ACKED_ITEM: BookItem = monitorItem('esc_5', 'Min Interest Coverage', '1.36x / ≥ 2.00x', '0.64x short', true, '14:05', ACK_WAIVER);

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
    `{"objective":"${REWORK_OBJECTIVE}","instrument":"sponsor equity contribution","policyLimit":"contribution ≤ 35% of total debt","revision":2,"reviewerNote":"${ATLAS_RETURN_NOTE}"}`,
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
  mrow('14:00:59', PM, 'Raised · Project Atlas · Breach · Max Total Leverage 4.29x / ≤ 4.00x', 'monitor', 'raised', 'Project Atlas', `Max Total Leverage 4.29x breaches the ≤ 4.00x covenant (${M}7.3% headroom)`),
  mrow('14:00:59', PM, 'Raised · Project Atlas · Watch · Min Interest Coverage 2.12x / ≥ 2.00x', 'monitor', 'raised', 'Project Atlas', `Min Interest Coverage 2.12x is inside the 15% policy cushion of its ≥ 2.00x limit (5.7% headroom) ${EM} thin headroom`),
  mrow('14:00:59', PM, 'Raised · Project Atlas · Watch · Min Fixed-Charge Coverage 1.17x / ≥ 1.10x', 'monitor', 'raised', 'Project Atlas', `Min Fixed-Charge Coverage 1.17x is inside the 15% policy cushion of its ≥ 1.10x limit (6.0% headroom) ${EM} thin headroom`),
  mrow('14:01:00', PM, 'Raised · Project Cobalt · Breach · Max Total Leverage 5.70x / ≤ 4.00x', 'monitor', 'raised', 'Project Cobalt', `Max Total Leverage 5.70x breaches the ≤ 4.00x covenant (${M}42.5% headroom)`),
  mrow('14:01:00', PM, 'Raised · Project Cobalt · Breach · Min Interest Coverage 1.38x / ≥ 2.00x', 'monitor', 'raised', 'Project Cobalt', `Min Interest Coverage 1.38x breaches the ≥ 2.00x covenant (${M}44.9% headroom)`),
  mrow('14:01:00', PM, 'Raised · Project Cobalt · Breach · Min Fixed-Charge Coverage 0.94x / ≥ 1.10x', 'monitor', 'raised', 'Project Cobalt', `Min Fixed-Charge Coverage 0.94x breaches the ≥ 1.10x covenant (${M}17.0% headroom)`),
  mrow('14:01:00', PM, 'Raised · Project Cobalt · Breach · Min Liquidity $6.3M / ≥ $10.0M', 'monitor', 'raised', 'Project Cobalt', `Min Liquidity $6.3M breaches the ≥ $10.0M covenant (${M}58.7% headroom)`),
  mrow('14:04:31', RV, 'Acknowledged · Min Interest Coverage', 'reviewer', 'acknowledged', 'Project Atlas', `“${ACK_SEASONAL}”`),
  mrow('14:04:33', RV, 'Acknowledged · Min Fixed-Charge Coverage', 'reviewer', 'acknowledged', 'Project Atlas', COPY.ackNoReasonDetail),
  mrow('14:05:02', RV, 'Acknowledged · Min Interest Coverage', 'reviewer', 'acknowledged', 'Project Cobalt', `“${ACK_WAIVER}”`),
  mrow('14:05:04', RV, 'Acknowledged · Min Fixed-Charge Coverage', 'reviewer', 'acknowledged', 'Project Cobalt', `“${ACK_WAIVER_FCC}”`),
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
  emptyAction: null,
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
  emptyAction: { label: COPY.ledgerOpenDesk },
  files: [],
  monitor: null,
};

/** Every fixture by name (kit page index, quick lookup). */
export const FIXTURES = {
  FX_TOPBAR,
  FX_DESK_INITIAL,
  FX_DESK_ATLAS_GATE,
  FX_DESK_COBALT_REMOVED,
  FX_DESK_EMPTY,
  FX_FILE_NOT_STARTED,
  FX_FILE_PLAN_REVIEW,
  FX_FILE_RUNNING,
  FX_FILE_ATLAS_GATE,
  FX_FILE_ATLAS_REV2,
  FX_FILE_SEALED,
  FX_FILE_UPLOAD_GATE,
  FX_NOTES,
  FX_STUB_EXTRACT,
  FX_PANEL_NOT_STARTED,
  FX_PANEL_PLAN_REVIEW,
  FX_PANEL_RUNNING,
  FX_PANEL_ATLAS_GATE,
  FX_PANEL_ATLAS_REV2,
  FX_PANEL_MERIDIAN_COUNTDOWN,
  FX_PANEL_SEALED,
  FX_PANEL_COBALT_REJECTED,
  FX_QUESTIONS_ATLAS,
  FX_LEDGER_QUESTION_ROW,
  FX_SIG_ATLAS_GATE,
  FX_SIG_ATLAS_AMENDED,
  FX_SIG_ATLAS_REV2,
  FX_SIG_MERIDIAN_COUNTDOWN,
  FX_SIG_COBALT_GATE,
  FX_SIG_ATLAS_ARMED_RETURN,
  FX_SIG_COBALT_ARMED_REJECT,
  FX_SIG_SEALED,
  FX_SIG_AUTO_SEALED,
  FX_SIG_REJECTED,
  FX_SIG_MERIDIAN_REJECTED,
  FX_STRESS_ATLAS,
  FX_EXHIBITS,
  FX_BOOK_BREACH,
  FX_BOOK_EMPTY,
  FX_BOOK_ACK_BREACH,
  FX_BOOK_ACK_HINT,
  FX_BOOK_ACK_WATCH,
  FX_BOOK_ACKED_ITEM,
  FX_LEDGER_AFTER_ATLAS,
  FX_LEDGER_EMPTY,
} as const;

/** The four agent tokens, for kit specimens (Token board). */
export const FX_TOKENS = { approve: APPROVE, escalate: ESCALATE, decline: DECLINE, rejected: tokenOf('rejected') } as const;
