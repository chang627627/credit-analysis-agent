// ---------------------------------------------------------------------------
// Countersign V2 · vocabulary (spec §5, §10). The closed word sets, the policy
// constants, and every fixed copy string. Screens never spell a status, verb or
// agent token themselves: they read it from here (through the selectors).
// ---------------------------------------------------------------------------

import { CURE_CAP, DECLINE_SCORE, MIN_HEADROOM, REFER_SCORE } from '../../agent/policy';
import type { NoteProvenance, Recommendation, ToolName } from '../../agent/types';
import type { HoldReason } from '../state/contracts';
import type { Actor, FileAt, SectionId, StatusKey, TokenView, Verb } from './types';

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
/**
 * Key-figure confidence the clean-approval policy requires. policyChecks tests it (state/gate's
 * eligibility check is policyChecks) and policyRule states it, so the two never disagree.
 */
export const POLICY_MIN_CONFIDENCE = 0.9;
/** Confidence at and above which a figure stays neutral (never green). */
export const CONF_NEUTRAL = 0.9;

// ---- evidence words (THREE-PANE R4.3, Mobbin audit fix 3)

/**
 * The evidence class of a figure no CIM sentence states: the extraction model produced it. The full
 * wording is what assistive tech reads (the Financials Source cell's hidden text, the key figure's
 * and the covenant Actual's accessible names) and what the Financials foot line explains; on screen
 * the short form below stands in wherever the class sits in a table cell or under a figure (R4.8).
 * The no-break space keeps "extraction model" together wherever the full form does wrap.
 */
export const NOT_IN_CIM = 'Not in the CIM · extraction\u00a0model' as const;
/**
 * Its short form, on screen wherever space is tight (R4.8): the Financials Source column (200px),
 * the Recommendation key figures' evidence caption and the line under a covenant's Actual (88px), so
 * those rows stay one line as they were before R4.3.
 */
export const NOT_IN_CIM_SHORT = 'Not in CIM' as const;

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

// ---- the clean-approval rule's terms (THREE-PANE R4.2)

/**
 * The clean-approval policy's four terms in policyChecks' order, read from the same constants
 * (the APPROVE token, zero flags, the first pass, POLICY_MIN_CONFIDENCE). policyRule states them
 * in Settings and the top-bar Tip and AUTO_NOTE writes them onto the record, so the rule the
 * reviewer is shown and the rule the record quotes are one list.
 */
export const POLICY_TERMS: readonly string[] = [
  TOKENS.approve.word,
  'no flags',
  'first pass',
  `every key figure at ${policyPct(POLICY_MIN_CONFIDENCE)} or above`,
];
/** The note a policy signature writes onto the record: the rule's own terms, nothing restated by hand. */
export const AUTO_NOTE = `Auto-countersigned · clean-approval policy (${POLICY_TERMS.join(' · ')})`;

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
  /**
   * the armed verb's commit labels (R4, Mobbin audit fix 1): the second press decides. Each is no
   * wider than its resting label, so Return and Reject still share line 2 of the verb row under a
   * 360px card (R4.1 width table): armed, the row stays two lines, never three.
   */
  returnCommit: 'Return with note',
  rejectCommit: 'Reject now',
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

/**
 * The agent panel's step lines (THREE-PANE R2.1): one line per plan step, updated in place.
 * Running "Testing covenants" (a static working glyph; no ellipsis, no animation), done
 * "Covenants tested", stopped when the run errored mid-step. The Structuring Engine's done line
 * is chosen from REWORK_DONE_LINE by the model, keyed on its result (asCure), never its title.
 */
export const STEP_LINE: Record<ToolName, { running: string; done: string; stopped: string }> = {
  extract_financials: { running: 'Extracting financials', done: 'Financials extracted', stopped: 'Stopped while extracting financials' },
  compute_risk_score: { running: 'Scoring risk', done: 'Risk scored', stopped: 'Stopped while scoring risk' },
  benchmark_peers: { running: 'Benchmarking peers', done: 'Peers benchmarked', stopped: 'Stopped while benchmarking peers' },
  check_covenants: { running: 'Testing covenants', done: 'Covenants tested', stopped: 'Stopped while testing covenants' },
  assemble_approval_package: { running: 'Writing the recommendation', done: 'Recommendation written', stopped: 'Stopped while writing the recommendation' },
  propose_restructure: { running: 'Searching for a revised structure', done: 'Revision drafted', stopped: 'Stopped while searching for a revised structure' },
};

/** The Structuring Engine's done line by its result: a viable cure, an exhausted search, or nothing to cure. */
export const REWORK_DONE_LINE = {
  proposed: (amount: string): string => `Proposed a ${amount} sponsor equity cure`,
  none: 'No restructure within policy',
  stands: 'No restructure needed',
} as const;

/** The link label of a panel line, by the memo card it scrolls to ("Covenants →", "Decision →"). */
export function sectionLinkLabel(at: FileAt): string {
  switch (at) {
    case 'financials':
      return 'Financials →';
    case 'risk':
      return 'Risk →';
    case 'peers':
      return 'Peers →';
    case 'covenants':
      return 'Covenants →';
    case 'recommendation':
      return 'Recommendation →';
    case 'exhibits':
      return 'Exhibits →';
    case 'stress':
      return 'Stress test →';
    case 'signature':
      return 'Decision →';
    case 'monitoring':
      return 'Appendix →';
    case 'questions':
      return 'Questions →';
    default:
      return `Revision ${at.slice('revision-'.length)} →`;
  }
}

/** The short word for an optional step in the plan prompt's toggle ("Skip peers"). */
export const OPTIONAL_SHORT: Record<string, string> = { step_peers: 'peers' };

// ---- hold captions (§8)

export const HOLD_CAPTION: Record<HoldReason, string> = {
  engaged: 'Held · you started reviewing',
  manual: 'Held · review manually',
  left: 'Held · you left the file',
  hidden: 'Held · the tab was hidden',
  'policy-off': 'Held · auto-countersign switched off',
};

/** A policy fraction as printed: 0.15 → '15%'. */
export function policyPct(f: number): string {
  return `${Math.round(f * 100)}%`;
}

/**
 * §10 "No cure": the cap is 35% of the deal's total debt ($39.2M for Cobalt); the target is the
 * decision rule's clean approval. `why` is the engine's binding constraint (describeCureBlock:
 * "even $39.2M of debt paydown (the 35% cap) leaves total leverage … short of the 15% cushion",
 * or the risk score staying above the referral line), so the copy never blames the cushion when
 * the score is what blocks the cure.
 */
export function noCureText(capText: string, why?: string): string {
  if (why) {
    return `Search exhausted policy limits: no sponsor equity up to ${policyPct(CURE_CAP)} of total debt (${capText}), as paydown and liquidity splits, makes the structure signable: ${why}. The recommendation stands.`;
  }
  return `Search exhausted policy limits: no sponsor equity up to ${policyPct(CURE_CAP)} of total debt (${capText}), as paydown and liquidity splits, gives every covenant ${policyPct(MIN_HEADROOM)} headroom. The recommendation stands.`;
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
  deskTitle: 'Select a project to analyze',
  selectRow: 'Select',
  removeFile: (name: string): string => `Remove ${name}`,
  removeBlocked: (name: string): string => `Stop the run on ${name} before removing it`,
  // R4.7 (audit fix 6): removing is one click; the row collapses to an undo line until the reviewer
  // leaves the Desk, and the summary offers Restore while any file is removed
  removedLine: (name: string): string => `${name} removed from the Desk`,
  undo: 'Undo',
  undoRemove: (name: string): string => `Undo removing ${name}`,
  removedCount: (n: number): string => `${n} removed`,
  restore: 'Restore',
  restoreAll: (n: number): string => (n === 1 ? 'Restore the removed file' : `Restore the ${n} removed files`),
  removedAnnounce: (name: string): string => `${name} removed from the Desk. Undo is where its row was.`,
  restoredAnnounce: (name: string): string => `${name} is back on the Desk.`,
  restoredAllAnnounce: (n: number): string => (n === 1 ? '1 file is back on the Desk.' : `${n} files are back on the Desk.`),
  /** the empty Desk's note beside the drop zone; `samplesOnly` null when nothing was removed */
  deskEmptyNote: (samplesOnly: boolean | null): string =>
    samplesOnly === null
      ? 'Drop a CIM below to open a file.'
      : samplesOnly
        ? 'Drop a CIM below to open a new file, or bring the samples back.'
        : 'Drop a CIM below to open a new file, or bring back the files you removed.',
  restoreSamples: 'Restore sample files',
  settings: 'Settings',
  settingsIntro: 'Session settings. They last until you refresh, like everything in this demo.',
  paceTitle: 'Demo pace',
  paceHelp: 'How fast the simulated agent and the Portfolio Monitor run. 1× is a 10 to 13 second memo.',
  removedText: (n: number): string => (n === 1 ? '1 file removed from the Desk this session.' : `${n} files removed from the Desk this session.`),
  restoreRemoved: 'Restore removed files',
  deskEmptySummary: 'No files on the Desk',
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
  required: 'required',
  startDrafting: 'Start drafting',
  cancel: 'Cancel',
  hold: 'Hold',
  heldStartWhenReady: 'Held · start when ready',
  pendingRecommendation: 'Written last, after every covenant is tested.',
  stopped: 'Stopped',
  askPlaceholder: 'Ask about this file',
  askDisabledNotStarted: 'Draft the memo first. Questions answer about the file being drafted.',
  askDisabledRunning: 'Questions open when the memo is assembled.',
  askMetaEngine: 'rule-based responder · simulated',
  askMetaLocal: 'Countersign · deterministic',
  // the memo's Questions block (THREE-PANE R4.5): answers about the deal live in the memo, the panel points at them
  questionsEyebrow: 'Questions',
  answeredInMemo: 'Answered in the memo',
  /** the stress-test pointer a what-if question gets: a steering reply, so it stays one panel line */
  askStressPointer: 'Try it in the stress test, below the Decision card.',
  /** the Ledger row of an answered question (actor Reviewer); its detail is the answer */
  askedEvent: (question: string): string => `Asked · “${question}”`,
  askedRawLabel: 'Reviewer question',
  answeredBy: 'Answered by',
  evidenceCheck: 'Evidence check',
  evidenceCheckMeta: 'Countersign · deterministic check',
  /** R4.3: the Decision card's one info item under Signed over (not a flag, never counted in "you opened n of N") */
  inputsNotInCim: (n: number): string => (n === 1 ? '1 covenant input is not stated in the CIM' : `${n} covenant inputs are not stated in the CIM`),
  /** R4.3: the clause the sealed record's caption adds ('signed with 3 inputs not stated in the CIM') */
  sealedNotInCim: (n: number, verb: 'signed' | 'decided'): string => `${verb} with ${n} ${n === 1 ? 'input' : 'inputs'} not stated in the CIM`,
  basisFiled: 'On the filed figures',
  flipOnRevised: 'On the revised structure',
  flipSeeStress: 'Nearest flip · see the stress test',
  noRestructureNeeded: `The filed structure already clears every covenant with at least ${policyPct(MIN_HEADROOM)} headroom, so no restructure is needed and the recommendation stands.`,
  /** the nearest flip on a data-gated memo is read on the figures as extracted (not yet verified) */
  flipUnverified: (word: string): string => `Figures unverified · as extracted they give ${word}`,
  /** the stress test's base on a data-gated memo: the figures as extracted */
  stressUnverified: 'figures as extracted, not yet verified',
  aidLabel: 'Analysis aid · not part of the memo',
  stressLink: 'Stress test ↓',
  riskOutOf: '/100',
  riskTickCaption: `Decline line · ${DECLINE_SCORE} · referral at ${REFER_SCORE}`,
  unchanged: 'unchanged',
  showRow: 'Show row',
  amendTerm: 'Amend term',
  record: 'Record',
  reasoning: 'Reasoning',
  argsLabel: 'args →',
  resultLabel: '← result',
  goToDecision: 'Go to decision',
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
  firstSweepPending: 'First sweep pending.',

  // three-pane case file (THREE-PANE §5, R2)
  agentName: 'Credit Analyst',
  fileWaiting: 'a file is waiting for you',
  selectProject: 'Select a project to analyze.',
  agentPanel: 'Agent panel',
  hideAgentPanel: 'Hide agent panel (])',
  closeAgentPanel: 'Close agent panel (])',
  showInMemo: 'Show in memo',
  editInMemo: 'Edit in memo',
  signReady: 'Countersign is focused. Press A again to sign.',
  /** A while Return or Reject is armed (R4.1): A never signs over an armed refusal */
  signReadyArmed: (verb: string): string => `Countersign is focused. ${verb} is armed, so press Enter to countersign or Esc to cancel it.`,
  composerLabel: 'Message the Credit Analyst',
  send: 'Send',
  returningForRevision: 'Returning for revision',
  recordEyebrow: 'Countersignature record',
  figureGroupSize: 'Earnings and debt',
  figureGroupTested: 'Tested by covenants',
  riskScoreBlock: 'Score',
  riskDriversBlock: 'Drivers',
  peersBlock: 'Against simulated comparables',
  testsFiled: 'Tests on the filed figures',
  testsAmended: 'Tests as amended',
  reviewerNoteBlock: 'Reviewer note',
  proposalBlock: 'Proposed revision',
  outcomeBlock: 'Outcome',
  summaryBlock: 'Summary',
  keyFiguresBlock: 'Key figures',
  draftingLine: 'Writing this section…',
  draftingRevision: (n: number): string => `Writing revision ${n}…`,
  exhibitsEyebrow: 'Attached by the reviewer',
  appendixEyebrow: 'Appendix · simulated drift',
  appendixTitle: 'Portfolio Monitor readings',
  planReviewInPanel: 'Plan review · review the plan in the agent panel',
  amendedBasis: 'Tested against the covenants as filed; amended terms are tested in Covenant compliance.',
  peersBasis: 'Comparables are simulated.',
  // the agent panel (THREE-PANE R2.1): command and control only, one line each
  composerPlaceholder: 'Ask or instruct',
  decision: 'Decision',
  decisionEyebrow: 'Your countersignature',
  gateLine: 'Your countersignature is needed',
  recordLink: 'Record →',
  runCancelled: 'Run cancelled',
  runLine: (name: string): string => `Drafting the memo for ${name}.`,
  runLineAuto: (name: string): string => `Plan auto-started. Drafting the memo for ${name}.`,
  readyLine: (name: string): string => `Ready to draft ${name}.`,
  autoCountdownLine: (t: string): string => `Auto-countersigning in ${t}`,
  autoHeldLine: (reason: string): string => `Auto-countersign held · ${reason}`,
  returnedLine: (n: number): string => `Returned for revision · rev ${n}`,
  stoppedAtLine: (heading: string): string => `Drafting stopped at ${heading}`,
  skippedLine: (heading: string): string => `${heading} skipped`,
  youLine: (text: string): string => `You · ${text}`,
  planPrompt: (included: number, total: number, optional: string[], allIn: boolean): string => {
    const lead = included === total ? `My plan: ${total} steps.` : `My plan: ${included} of ${total} steps.`;
    if (optional.length === 0) return `${lead} Start drafting when it looks right.`;
    const names = optional.length === 1 ? optional[0] : `${optional.slice(0, -1).join(', ')} and ${optional[optional.length - 1]}`;
    return allIn ? `${lead} ${names} is optional; untick it to skip.` : `${lead} ${names} is skipped.`;
  },
  skipOptional: (short: string): string => `Skip ${short}`,
  includeOptional: (short: string): string => `Include ${short}`,
  startsIn: (t: string): string => `Starts in ${t}`,

  // composer replies (THREE-PANE §4.3); parameterised lines are functions
  reply: {
    startStrip: (liveName: string, target: string): string =>
      `${liveName} is live. Confirm in the bar above the memo to start ${target}, or keep ${liveName}.`,
    startStripGeneric: 'Another file is live. Confirm in the bar above the memo to start this one, or keep the live run.',
    toggledInStart: (heading: string, include: boolean): string =>
      `${heading} is ${include ? 'in' : 'off in'} the plan. The countdown is held: choose Start drafting when ready.`,
    toggledOff: (heading: string): string => `${heading} is off. Drafting skips it and the memo marks it excluded.`,
    toggledOn: (heading: string): string => `${heading} is back in the plan.`,
    toggledAlready: (heading: string, include: boolean): string => `${heading} is already ${include ? 'in' : 'off in'} the plan.`,
    countdownHeld: ' The auto-start countdown is held.',
    holdPlan: 'Held. Drafting starts when you choose Start drafting.',
    holdPolicy: 'Auto-countersign held. The memo waits for your decision.',
    stop: 'Stopping discards this run. Confirm in the bar above the memo.',
    openStress: 'The stress test is open in the memo. Nothing there is on the record until you attach it.',
    decisionGate: 'Decide in the memo:',
    decisionIdle: 'Nothing awaits your decision yet. The Decision card opens in the memo when the agent stops for your countersignature.',
    amendGate: 'Amend terms on the covenant row; they take effect only with your countersignature.',
    amendIdle: 'Terms can be amended only at the countersignature, on a memo built on the filed figures.',
    noteGate: 'Your note goes on the Decision card:',
    noteIdle: 'Notes are written at the countersignature, on the Decision card in the memo.',
    requiredStep: (heading: string, optional: string): string =>
      `${heading} is required and cannot be skipped. ${optional ? `Only ${optional} is optional.` : 'No step is optional.'}`,
    ambiguous: (step: string): string => `Say “skip ${step}” or “include ${step}”.`,
    noPlan: 'No plan is open yet. Type “draft the memo” to open one; optional steps are chosen there.',
    planFixed: 'The plan is fixed once drafting starts. Optional steps are chosen at plan review.',
    alreadyDrafting: (name: string): string => `${name} is already drafting. Type “stop” to discard the run.`,
    alreadyAtGate: (name: string): string => `${name} is awaiting your countersignature. Decide in the memo, or type “stop” to discard the run.`,
    nothingToHold: 'Nothing is counting down.',
    nothingRunning: 'Nothing is running on this file.',
    noStress: 'The stress test opens once the memo is assembled.',
    unknown: 'Try “draft the memo”, “skip peer benchmarks”, “hold” or “stop”. Questions open once the memo is assembled.',
  },

  // decision
  countersignature: 'Countersignature',
  signaturePending: 'The signature opens when the memo is assembled.',
  agentSignature: '/s/ Credit Analyst',
  autoSignature: '/auto/ clean-approval policy',
  countersignHere: 'Countersign here',
  noteLabel: 'Reviewer note · on the record',
  notePlaceholder: 'Optional to countersign. Required to return or reject.',
  draftFromNotes: 'Draft from notes',
  // an armed Return / Reject (R4, Mobbin audit fix 1): the note label asks the verb's question, a
  // second press with an empty note gets a calm hint (never an alert), Cancel disarms
  armedRejectLabel: 'Why reject it? · on the record',
  armedReworkLabel: (rev: number): string => `What should the agent revise? · quoted in Revision ${rev}`,
  reasonFirstReject: 'Write a reason first.',
  reasonFirstRework: 'Write what the agent should revise first.',
  cancelArmed: 'Cancel',
  revert: 'Revert',
  clearedByAmendment: 'cleared by amendment',
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
  stressClose: 'Close',
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
  // R4.6 (audit fix 5): acknowledging a covenant item asks why. The engine keeps an acknowledged item
  // quiet until a sweep finds it worse (a watch that becomes a breach is raised again) or it passes
  // two sweeps in a row (resolved); a breach cannot get worse, so it stays quiet until it recovers.
  ackQuestion: 'Why is this acceptable for now?',
  ackStripLabel: (covenant: string, file: string): string => `Acknowledge ${covenant} on ${file}`,
  ackUntilBreach: 'until it recovers',
  ackUntilWatch: 'until it worsens or recovers',
  ackConsequence: (required: boolean, until: string): string =>
    `${required ? 'Required for a breach' : 'Optional for a watch'}. Stays quiet ${until}.`,
  ackReasonFirst: 'Write why it is acceptable first.',
  ackNoReason: 'no reason given',
  ackNoReasonDetail: 'No reason given',
  ackReraised: 'worsened since and raised again',
  ackDone: (covenant: string, file: string, until: string): string => `Acknowledged ${covenant} on ${file}. It stays quiet ${until}.`,
  markHandedOff: 'Mark handed off',
  fromCountersignature: 'From your countersignature',

  // ledger
  ledgerTitle: 'Ledger',
  ledgerNote: 'Earlier runs keep their event trail; the drafted memo is kept for the latest decided run of each file.',
  exportSession: 'Export session (JSON)',
  ledgerEmpty: 'Nothing on the record yet. Draft a memo to start the trail.',
  /** the empty Ledger's way out (R4.7): the Desk is where a memo is started */
  ledgerOpenDesk: 'Open the Desk',
  ledgerFilterEmpty: 'No events match this filter.',
  showAllFiles: 'Show all files',
  openFile: 'Open file',
  copyJson: 'Copy JSON',
  portfolioMonitor: 'Portfolio Monitor',

  // palette
  palettePlaceholder: 'Search files and actions',
} as const;
