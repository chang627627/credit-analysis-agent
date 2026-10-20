// ---------------------------------------------------------------------------
// HOUSE CREDIT POLICY — the thresholds the one decision rule (`decide` in
// whatif.ts) reads. "Severity-gated triage":
//
//   1. data gate   a load-bearing reading below CONF_FLOOR → ESCALATE (verify)
//   2. knock-outs  score ≥ DECLINE_SCORE · FCC < FCC_FLOOR · leverage above
//                  LEVERAGE_OUTER_LIMIT · a breach no cure can fix → DECLINE
//   3. exceptions  a curable breach · headroom under MIN_HEADROOM · score ≥
//                  REFER_SCORE → ESCALATE
//   4. otherwise   APPROVE (a human still countersigns)
//
// These are configurable HOUSE settings, not regulatory figures: a bank sets
// its own. MIN_HEADROOM sits inside the 10–35% cushion range seen in practice;
// 6.00x is the ECB's "exceptional leverage" marker, used here as an outer limit.
// The breach COUNT is deliberately absent: breadth enters through the size of
// the cure (more or deeper breaches need more equity, eventually past the cap).
// ---------------------------------------------------------------------------

import type { ToolName } from './types';
import { LOW_CONFIDENCE_FLOOR } from './util';

/** Below this a load-bearing observation is unverified: the data gate escalates. */
export const CONF_FLOOR = LOW_CONFIDENCE_FLOOR; // 0.75

/** Risk score at or above which a deal is declined (Caa1, non-pass at inception). */
export const DECLINE_SCORE = 75;

/** Risk score at or above which a deal is referred to a credit officer (B3). */
export const REFER_SCORE = 60;

/** Fixed-charge coverage floor: below it cash flow does not cover fixed charges. */
export const FCC_FLOOR = 1.0;

/** House outer limit on total leverage (x EBITDA); above it the deal is declined. */
export const LEVERAGE_OUTER_LIMIT = 6.0;

/** Minimum covenant headroom (fraction) for a clean approval: a 15% cushion. */
export const MIN_HEADROOM = 0.15;

/** Largest sponsor equity a cure may ask for, as a fraction of total debt. */
export const CURE_CAP = 0.35;

/**
 * The observations whose confidence the data gate reads (their minimum).
 * Peer benchmarks are context, not load-bearing, so they never gate; the
 * Structuring Engine only re-arranges figures these tools already read.
 */
export const GATING_TOOLS: readonly ToolName[] = ['extract_financials', 'compute_risk_score', 'check_covenants'];
