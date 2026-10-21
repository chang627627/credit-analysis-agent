// ---------------------------------------------------------------------------
// Countersign V2 · the model barrel (spec §9.4). The single source of every
// derived fact, label, number and sentence. Screens import from '../../model'.
// Stage 2: every selector derives from the engine hooks and the V2 store.
// THREE-PANE R2: the agent panel (selectAgentPanel: one-line status lines with
// links, the plan prompt, the composer), the composer intents, the section
// takeaways and footers, and chatShown. Fixtures stay for the kit page.
// ---------------------------------------------------------------------------

export type * from './types';

// ---- vocabulary and constants
export {
  AUTO_COUNTDOWN_MS,
  INK_REPLAY_WINDOW_MS,
  CUE_HOLD_MS,
  PLAN_COUNTDOWN_S,
  AUTO_NOTE,
  POLICY_MIN_CONFIDENCE,
  CONF_NEUTRAL,
  NOT_IN_CIM,
  NOT_IN_CIM_SHORT,
  STATUS_WORD,
  tokenOf,
  tokenWord,
  REJECTED_WORD,
  VERB_WORD,
  IMPERATIVE,
  PRIMARY_LABEL,
  ACTORS,
  REVIEWER,
  provenanceText,
  provenanceShort,
  NOTE_CHIP,
  DRIVER_TONE,
  driverTone,
  TOOL_LABEL,
  STEP_SECTION,
  sectionHeading,
  STEP_LINE,
  REWORK_DONE_LINE,
  sectionLinkLabel,
  OPTIONAL_SHORT,
  HOLD_CAPTION,
  noCureText,
  COPY,
} from './vocab';

// ---- formatters
export {
  fmtX,
  fmtM,
  fmtPct,
  fmtDuration,
  MINUS,
  EM,
  fmtSigned,
  fmtClock,
  fmtHM,
  fmtStamp,
  fmtIso,
  fmtElapsed,
  fmtAgo,
  fmtConf,
  fmtSeconds,
  fmtCountdown,
  fmtRatio,
  fmtSpeed,
  fmtRate,
  contrastRatio,
  sessionFilename,
  fileFilename,
  dotJoin,
  listJoin,
  plural,
} from './format';

// ---- flags, anchors and amendments
export {
  classifyFlag,
  isCounted,
  flagClause,
  covenantKind,
  anchorFor,
  sectionOfStep,
  overridesFromAmendments,
  amendmentsFor,
  overridesFor,
  covenantForFigure,
  isRowAnchor,
} from './flags';

// ---- evidence
export {
  paragraphsOf,
  paraLabel,
  FIGURES,
  figureValue,
  financialValue,
  fmtFigure,
  markIdFor,
  quotedSpans,
  segmentsOf,
  evidenceFor,
  modelEvidence,
  evidenceText,
  parseThreshold,
  cushionOf,
  distanceOf,
} from './evidence';
export type { QuotedSpan } from './evidence';

// ---- flip analysis
export {
  recTone,
  fmtDriverValue,
  fmtDriverDelta,
  nearestFlip,
  stressZones,
  scenarioKey,
  changedDrivers,
  stressRecord,
  parseStressLabel,
} from './flip';

// ---- selectors
export { selectLiveDealId, isRunLive, onLiveFile, chatShown, SPEED_STEPS, selectTopBar, selectTabTitle, policyChecks, policyRule, selectPolicy } from './select-top';
export { selectDesk } from './select-desk';
export { selectFile, askRoute, routesOnSign, covenantEvidence, covenantInputsNotInCim } from './select-file';
export { selectAgentPanel, memoTargetOfAnchor, newActivityLabel } from './select-thread';
export { composerContext, parseComposer, composerReply, answerFor, sectionOfQuestion } from './composer';
export { selectQuestions, qaAnchor } from './select-questions';
export {
  financialsTakeaway,
  riskTakeaway,
  peersTakeaway,
  covenantsTakeaway,
  revisionTakeaway,
  recommendationTakeaway,
} from './takeaways';
export { selectSignature, selectStress, selectExhibits } from './select-decision';
export { selectBook, ackNoteRequired, ackUntil, ackAnnouncement, ackReasonText } from './select-book';
export { actorOf, chipOf, relabel, relabelMonitor, selectLedger } from './select-ledger';
export { selectCommands, paletteFooter, startConfirmCopy, stopConfirmCopy, announceFor } from './select-commands';

// ---- exports
export { buildFileExport, buildSessionExport } from './exports';

// ---- fixtures (kit specimens; Appendix A golden values)
export {
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
  FIXTURES,
  FX_TOKENS,
} from './fixtures';
export { selectSettings } from './select-settings';
