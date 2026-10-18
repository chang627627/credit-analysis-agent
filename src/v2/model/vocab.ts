// ---------------------------------------------------------------------------
// Countersign V2 · vocabulary (spec §5, §10). The closed word sets, the policy
// constants, and every fixed copy string. Screens never spell a status, verb or
// agent token themselves: they read it from here (through the selectors).
// ---------------------------------------------------------------------------

import type { NoteProvenance, Recommendation, ToolName } from '../../agent/types';
import type { HoldReason } from '../state/store';
import type { Actor, SectionId, StatusKey, TokenView, Verb } from './types';

// ---- policy and timing constants (policy, not motion)

/** The clean-approval policy's visible countdown. Stays 5 s under reduced motion. */
export const AUTO_COUNTDOWN_MS = 5000;
/** The ink animates only within this window after the signing click. */
export const INK_REPLAY_WINDOW_MS = 2000;
/** Reduced motion: a cue becomes a static highlight held this long. */
export const CUE_HOLD_MS = 1200;
/** Plan auto-start countdown in seconds: max(3, round(7 / speed)). */
export function PLAN_COUNTDOWN_S(speed: number): number {
  return Math.max(3, Math.round(7 / (speed > 0 ? speed : 1)));
}
/** The note a policy signature writes onto the record. */
export const AUTO_NOTE =
  'Auto-countersigned · clean-approval policy (recommendation APPROVE, zero flags, every key figure at 90% confidence or above)';
/** Key-figure confidence the clean-approval policy requires. */
export const POLICY_MIN_CONFIDENCE = 0.9;
/** Confidence at and above which a figure stays neutral (never green). */
export const CONF_NEUTRAL = 0.9;

// ---- §5 status words

export const STATUS_WORD: Record<StatusKey, string> = {
  pending: 'Not started',
  drafting: 'Drafting',
  awaiting: 'Awaiting your countersignature',
  done: 'Done',
  pass: 'Pass',
  watch: 'Watch',
  breach: 'Breach',
  info: 'Note',
  returned: 'Returned for revision',
  rejected: 'Rejected',
  signed: 'Countersigned',
  'signed-auto': 'Auto-countersigned',
  'signed-over': 'Signed over',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
  excluded: 'Excluded',
  cancelled: 'Run cancelled',
  error: 'Run error',
};

// ---- agent tokens (the ONLY place the four token words are spelled)

const TOKENS: Record<Recommendation | 'rejected', TokenView> = {
  approve: { word: 'APPROVE', tone: 'good' },
  escalate: { word: 'ESCALATE', tone: 'warn' },
  decline: { word: 'DECLINE', tone: 'bad' },
  rejected: { word: 'REJECTED', tone: 'bad' },
};

/** APPROVE/good · ESCALATE/warn · DECLINE/bad · REJECTED/bad. */
export function tokenOf(rec: Recommendation | 'rejected'): TokenView {
  return { ...TOKENS[rec] };
}

/** The word on the rejected signature line. */
export const REJECTED_WORD = TOKENS.rejected.word;

/** The engine token word as data ('APPROVE'), for sentences. */
export function tokenWord(rec: Recommendation): string {
  return TOKENS[rec].word;
}

// ---- human verbs

export const VERB_WORD: Record<Verb, string> = {
  countersigned: 'Countersigned',
  'countersigned-amended': 'Countersigned as amended',
  'auto-countersigned': 'Auto-countersigned',
  returned: 'Returned for revision',
  rejected: 'Rejected',
  cancelled: 'Run cancelled',
};

/** The imperatives (§5). */
export const IMPERATIVE = {
  returnLabel: 'Return for revision',
  rejectLabel: 'Reject memo',
} as const;

/** Primary labels by what is being concurred with (§10). */
export const PRIMARY_LABEL = {
  approve: 'Countersign approval',
  escalate: 'Countersign escalation',
  decline: 'Countersign decline',
  amended: 'Countersign as amended',
  revised: 'Countersign revised structure',
} as const;

// ---- actors

export const ACTORS: readonly Actor[] = ['Credit Analyst', 'Reviewer', 'Policy', 'Portfolio Monitor'];

/** The reviewer is never named on the record (§10 rule 1). */
export const REVIEWER: Actor = 'Reviewer';

// ---- note provenance

/**
 * Sealed / Ledger provenance (§10 "Sealed provenance"). NEVER defaults to
 * 'authored': no provenance and no policy signature means no claim at all.
 */
export function provenanceText(p: NoteProvenance | null, auto: boolean, hasNote: boolean): string | null {
  if (auto && hasNote) return 'written by the clean-approval policy';
  if (p === 'authored') return 'authored by the reviewer';
  if (p === 'drafted-edited') return 'agent-drafted, edited by the reviewer';
  if (p === 'drafted-verbatim') return 'agent-drafted, accepted verbatim';
  return null;
}

/** The short form used in returned-history lines (§1 pillar 3, §7.3). */
export function provenanceShort(p: NoteProvenance | null): string | null {
  if (p === 'authored') return 'authored';
  if (p === 'drafted-edited') return 'agent-drafted, edited';
  if (p === 'drafted-verbatim') return 'agent-drafted, verbatim';
  return null;
}

/** The live chip at the gate while the note holds an inserted draft (§10 "Note field"). */
export const NOTE_CHIP = {
  verbatim: 'agent-drafted · unedited',
  edited: 'agent-drafted · edited by you',
} as const;

// ---- risk driver tone table (§9.4)

export const DRIVER_TONE: { match: RegExp; tone: 'good' | 'warn' | 'bad' | 'ink-2' }[] = [
  { match: /severe|high/, tone: 'bad' },
  { match: /moderate/, tone: 'warn' },
  { match: /favorable|strong/, tone: 'good' },
];

/** First matching row of DRIVER_TONE; otherwise (for example 'low') ink-2. */
export function driverTone(impact: string): 'good' | 'warn' | 'bad' | 'ink-2' {
  for (const row of DRIVER_TONE) if (row.match.test(impact)) return row.tone;
  return 'ink-2';
}

// ---- tools and sections

export const TOOL_LABEL: Record<ToolName, string> = {
  extract_financials: 'Document Intelligence',
  compute_risk_score: 'Risk Engine',
  benchmark_peers: 'Peer Benchmarks',
  check_covenants: 'Covenant Tester',
  assemble_approval_package: 'Memo Builder',
  propose_restructure: 'Structuring Engine',
};

/** Plan step → the memo section it writes. */
export const STEP_SECTION: Record<string, SectionId> = {
  step_extract: 'financials',
  step_risk: 'risk',
  step_peers: 'peers',
  step_covenants: 'covenants',
  step_package: 'recommendation',
};

/** Section headings as printed in the memo, the doc bar and the Desk. */
export function sectionHeading(id: SectionId): string {
  switch (id) {
    case 'recommendation':
      return 'Recommendation';
    case 'financials':
      return 'Financials';
    case 'risk':
      return 'Risk score and rating';
    case 'peers':
      return 'Peer benchmarks';
    case 'covenants':
      return 'Covenant compliance';
    default:
      return `Revision ${id.slice('revision-'.length)}`;
  }
}

/** '' for Recommendation, '1'–'4' for §1–§4, 'R2' for revision 2. */
export function sectionOrdinal(id: SectionId): string {
  switch (id) {
    case 'recommendation':
      return '5';
    case 'financials':
      return '1';
    case 'risk':
      return '2';
    case 'peers':
      return '3';
    case 'covenants':
      return '4';
    default:
      return `R${id.slice('revision-'.length)}`;
  }
}

/** Contents describe lines (§10). */
export const STEP_DESCRIBE: Record<string, string> = {
  step_extract: 'Pulls revenue, EBITDA, debt, coverage and liquidity from the CIM.',
  step_risk: 'Scores the credit and maps it to a rating.',
  step_peers: 'Places the credit against simulated sector comparables.',
  step_covenants: 'Tests each proposed covenant against the extracted figures.',
  step_package: 'Writes the recommendation last, after every covenant is tested.',
};

// ---- hold captions (§8)

export const HOLD_CAPTION: Record<HoldReason, string> = {
  engaged: 'Held · you started reviewing',
  manual: 'Held · review manually',
  left: 'Held · you left the file',
  hidden: 'Held · the tab was hidden',
  'policy-off': 'Held · auto-countersign switched off',
};

/** §10 "No cure": the cap is 35% of the deal's total debt ($39.2M for Cobalt). */
export function noCureText(capText: string): string {
  return `Search exhausted policy limits: sponsor equity up to 35% of total debt (${capText}), as paydown and liquidity splits. The recommendation stands.`;
}

// ---- fixed copy (§10 "Exact copy for key moments" plus screen labels)

export const COPY = {
  // top bar
  brand: 'Countersign',
  tabDesk: 'Desk',
  tabBook: 'Book',
  tabLedger: 'Ledger',
  policyLabel: 'Auto-countersign clean approvals',
  policyShort: 'Auto-countersign',
  paceLabel: 'Demo pace',
  search: 'Search',
  compareV1: 'Compare V1 ↗',
  more: 'More',

  // desk
  deskTitle: 'Case files',
  deskInitialSummary: '3 sample files, chosen to end differently · none decided this session · extraction is simulated',
  extractionSimulated: 'extraction is simulated',
  dropLabel: 'Drop a CIM (PDF) to open a new file, or',
  dropChoose: 'choose a file',
  dropSub: 'Extraction is simulated from the file name',
  uploadedChip: 'uploaded',
  noCall: '–',
  draftMemo: 'Draft memo',
  openPlan: 'Open plan',
  open: 'Open',
  reviewAndCountersign: 'Review and countersign',
  reRun: 'Re-run',
  openRecord: 'Open record',
  lastRunCancelled: 'Last run cancelled · reset before a decision',
  groupLabel: {
    awaiting: 'Awaiting your countersignature',
    'plan-review': 'Plan review',
    drafting: 'Drafting',
    error: 'Run error',
    'not-started': 'Not started',
    decided: 'Decided',
  },

  // confirms
  startAnyway: 'Start anyway',
  reRunAnyway: 'Re-run anyway',
  keepThisRun: 'Keep this run',
  stopRun: 'Stop run',
  keep: 'Keep',

  // file
  eyebrow: 'Credit approval memorandum',
  preparedBy: 'Prepared by Credit Analyst (agent)',
  notDraftedYet: 'not drafted yet',
  cimReady: 'CIM ready',
  contents: 'Contents',
  required: 'required',
  optionalTag: 'optional · simulated comparables',
  startDrafting: 'Start drafting',
  cancel: 'Cancel',
  hold: 'Hold',
  heldStartWhenReady: 'Held · start when ready',
  unattendedNote: "An unattended start is recorded as 'Plan auto-started', never as your approval.",
  contentsEmptyMargin: 'Notes, evidence checks and the run log appear here as the memo is drafted.',
  pendingRecommendation: 'Written last, after every covenant is tested.',
  pendingSection: 'Not drafted yet.',
  excludedLine: 'Excluded at plan review by the reviewer.',
  stopped: 'Stopped',
  showAllReasoning: 'Show all reasoning',
  askPlaceholder: 'Ask about this file',
  askDisabledNotStarted: 'Draft the memo first. Questions answer about the file being drafted.',
  askDisabledRunning: 'Questions open when the memo is assembled.',
  askDisabledSnapshot: 'Questions answer about the live file only. Re-run this file to ask about it.',
  askMetaEngine: 'rule-based responder · simulated',
  askMetaLocal: 'Countersign',
  evidenceCheck: 'Evidence check',
  evidenceCheckMeta: 'Countersign · deterministic check',
  basisFiled: 'On the filed figures',
  flipOnRevised: 'On the revised structure',
  flipSeeStress: 'Nearest flip · see the stress test',
  noRestructureNeeded: 'The filed structure already clears every covenant, so no restructure is needed and the recommendation stands.',
  aidLabel: 'Analysis aid · not part of the memo',
  stressLink: 'Stress test ↓',
  riskOutOf: '/100',
  riskTickCaption: 'Decline line · 75 (with a breach)',
  unchanged: 'unchanged',
  showRow: 'Show row',
  trace: 'Trace',
  amendTerm: 'Amend term',
  record: 'Record',
  reasoning: 'Reasoning',
  argsLabel: 'args →',
  resultLabel: '← result',
  goToSignature: 'Go to signature',
  goToDrafting: 'Go to drafting',
  reviewManually: 'Review manually',
  stop: 'Stop',
  exportFile: 'Export file',
  openInLedger: 'Open in Ledger',
  sealedInSession: 'sealed in this session',
  notFound: 'This file is not in this session. Uploaded files do not survive a reload.',
  backToDesk: 'Back to the Desk',
  sourceSpine: 'Source CIM',
  agentRecommends: 'The agent recommends',
  sectionsLabel: 'Sections',
  collapseSidebar: 'Collapse sidebar',
  expandSidebar: 'Expand sidebar',
  caseFile: 'Case file',
  sourceToggle: 'Source CIM',
  hideSource: 'Hide source',
  simulatedExtraction: 'simulated extraction',
  appendixHeading: 'Appendix · Portfolio Monitor readings',
  firstSweepPending: 'First sweep pending.',

  // decision
  countersignature: 'Countersignature',
  signaturePending: 'The signature opens when the memo is assembled.',
  agentSignature: '/s/ Credit Analyst',
  autoSignature: '/auto/ clean-approval policy',
  countersignHere: 'Countersign here',
  noteLabel: 'Reviewer note · on the record',
  notePlaceholder: 'Optional to countersign. Required to return or reject.',
  draftFromNotes: 'Draft from notes',
  needNoteReject: 'A reason is required to reject. It goes on the record.',
  needNoteRework: 'A reason is required to return for revision. It goes on the record.',
  revert: 'Revert',
  clearedByAmendment: 'cleared by amendment',
  showNote: 'Show note',
  awaitingFirstReading: 'Not swept yet',
  routedLine: 'Routed to the Book for senior credit review',
  openInBook: 'Open in Book',
  policyOff: 'Auto-countersign is off. Every file waits for you.',
  policyOnIdle: 'Auto-countersign is on · clean-approval policy',
  showChecks: 'Show checks',

  // stress
  stressCollapsed: 'Stress test · scratch. Nothing here is on the record until you attach it.',
  stressEyebrow: 'Stress test · scratch',
  stressOpen: 'Open',
  attachAsExhibit: 'Attach as exhibit',
  attachChangeFirst: 'Change a driver first',
  attachAlready: 'This scenario is already attached',
  attachLiveOnly: 'Attach is available on the live file.',
  resetToBase: 'Reset to base',
  exhibits: 'Exhibits',
  stressTest: 'Stress test',

  // book
  bookTitle: 'Book',
  bookDisclosure: "Figures are simulated drift on each file's filed figures.",
  sweepNow: 'Sweep now',
  bookEmpty: 'The Portfolio Monitor runs its first sweep in a moment.',
  acknowledge: 'Acknowledge',
  markHandedOff: 'Mark handed off',
  fromCountersignature: 'From your countersignature',

  // ledger
  ledgerTitle: 'Ledger',
  ledgerNote: 'Earlier runs keep their event trail; the drafted memo is kept for the latest decided run of each file.',
  exportSession: 'Export session (JSON)',
  ledgerEmpty: 'Nothing on the record yet. Draft a memo to start the trail.',
  ledgerFilterEmpty: 'No events match this filter.',
  showAllFiles: 'Show all files',
  openFile: 'Open file',
  copyJson: 'Copy JSON',
  portfolioMonitor: 'Portfolio Monitor',

  // palette
  palettePlaceholder: 'Search files and actions',
} as const;
