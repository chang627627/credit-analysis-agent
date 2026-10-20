// ---------------------------------------------------------------------------
// Countersign V2 · decision blocks: signature, stress test, exhibits (spec
// §7.3, §8, §10; THREE-PANE.md R2.2). Every label, attestation, caption and
// policy line of the gate is composed here from the same file context the memo
// reads, so what the reviewer signs and what the memo says cannot disagree.
// One SignatureView feeds the memo's Decision card in full (R2: the agent
// panel holds no decision): signed over, note, amendment, the call directly
// above the verbs, the verbs, attestation, policy, the signature lines and,
// once decided, the sealed record. The open reviewer line is never a control.
// ---------------------------------------------------------------------------

import type { Deal } from '../../agent/mockData';
import type { Amendment, ApprovalPackage, Recommendation } from '../../agent/types';
import { baselineScenario, decisionForDeal, driversFor, evaluate, fmtHeadroom } from '../../agent/whatif';
import type { DriverKey, Scenario } from '../../agent/whatif';
import type { V2Store } from '../state/contracts';
import { covenantKind, flagClause, isRowAnchor, memoTargetOfAnchor } from './flags';
import { baseFidelity, changedDrivers, filedBase, fmtDriverDelta, fmtDriverValue, parseStressLabel, scenarioKey, stressRecord, stressZones } from './flip';
import { fmtHM, fmtM, fmtStamp, listJoin, plural } from './format';
import { policyChecks, selectPolicy, verbsDead } from './select-top';
import {
  amendedDecisionOf,
  amendedRecOf,
  amendmentName,
  amendmentsOf,
  awaitingAtOf,
  buildNotes,
  countedFlagsOf,
  covenantInputsNotInCim,
  covenantRow,
  cureOf,
  dataGated,
  exhibitEntries,
  fileContext,
  fileFigureRows,
  lowerFirst,
  packageDecision,
  returnedRecord,
  revisedScenario,
  reworkN,
  routesOnSign,
  sealHeadline,
  shortReason,
  signedVerdict,
} from './select-file';
import type { FileCtx } from './select-file';
import type { ExhibitView, PolicyView, SignatureState, SignatureView, StressView, TokenView } from './types';
import {
  AUTO_COUNTDOWN_MS,
  COPY,
  IMPERATIVE,
  INK_REPLAY_WINDOW_MS,
  NOTE_CHIP,
  PRIMARY_LABEL,
  REJECTED_WORD,
  STATUS_WORD,
  provenanceShort,
  provenanceText,
  tokenOf,
  tokenWord,
  VERB_WORD,
} from './vocab';

// =============================================================================
// Signature
// =============================================================================

/** The policy view for this file: the live gate's, or a static reading for a sealed record. */
function filePolicy(s: V2Store, ctx: FileCtx): PolicyView {
  if (ctx.live && ctx.mode === 'gate') return selectPolicy(s);
  const on = s.policy === 'auto';
  if (!on) return { on, eligible: false, armed: false, line: COPY.policyOff, checks: null, countdown: null, holdLabel: null };
  return { on, eligible: false, armed: false, line: COPY.policyOnIdle, checks: ctx.pkg ? policyChecks(ctx.pkg) : null, countdown: null, holdLabel: null };
}

/** ' and signs over 2 notes, including 1 covenant breach' (empty when nothing is counted). */
function signsOver(n: number, breaches: number): string {
  if (n === 0) return '';
  const incl = breaches > 0 ? `, including ${plural(breaches, 'covenant breach', 'covenant breaches')}` : '';
  return ` and signs over ${plural(n, 'note')}${incl}`;
}

/** §10 attestations: the consequence of the primary, stated before the reviewer commits. */
function attestationFor(ctx: FileCtx, pkg: ApprovalPackage, amendments: Amendment[], n: number, breaches: number): string {
  const memo = pkg.memoId;
  const agentRec = pkg.recommendation;
  if (amendments.length > 0) {
    const amendedRec = amendedRecOf(ctx.deal, amendments, pkg) ?? agentRec;
    const terms = listJoin(amendments.map((a) => `${amendmentName(a)} ${a.to}`));
    const recorded = amendments.length === 1 ? 'Your amended term is recorded with your signature.' : 'Your amended terms are recorded with your signature.';
    // agreement is claimed only when the amended outcome IS the agent's call
    const stance =
      amendedRec === agentRec
        ? `concurs with ${tokenWord(amendedRec)} on your amended terms (${terms})`
        : `records ${tokenWord(amendedRec)} on your amended terms (${terms}), against the agent's ${tokenWord(agentRec)}`;
    if (amendedRec === 'approve') {
      const tail = agentRec === 'escalate' ? 'Nothing routes onward: the amendment resolves the escalation.' : 'The memo is committed to the record.';
      return `Countersigning as amended approves ${memo} on your amended terms (${terms}). ${recorded} ${tail}`;
    }
    if (amendedRec === 'escalate') {
      // the consequence comes from the routing rule itself, never from the outcome word
      const tail = routesOnSign(pkg, ctx.deal, amendments, false)
        ? 'The memo then routes to the escalation queue for senior credit review.'
        : 'The memo is committed to the record. Nothing routes onward.';
      return `Countersigning as amended ${stance}. ${recorded} ${tail}`;
    }
    return `Countersigning as amended ${stance}. ${recorded} The facility is recorded as declined on your amended terms.`;
  }
  if (pkg.restructure) {
    const cure = cureOf(ctx, pkg.revision);
    const paydown = cure ? cure.debtPaydownM : pkg.restructure.contribution;
    const topUp = cure ? cure.liquidityTopUpM : 0;
    const split = `${fmtM(paydown)} debt paydown${topUp > 0 ? ` and ${fmtM(topUp)} to liquidity` : ''}`;
    const tail = n === 0 ? ' There are no notes to sign over.' : ` It signs over ${plural(n, 'note')}.`;
    const equity = `${fmtM(pkg.restructure.contribution)} sponsor equity: ${split}`;
    if (agentRec === 'approve') {
      return `Countersigning concurs with the revised structure on ${memo} (${equity}), subject to the sponsor commitment.${tail}`;
    }
    // a revised structure the rule still holds (the figures are unverified): the consequence is the routing rule's
    const route = routesOnSign(pkg, ctx.deal, null, false)
      ? ' The memo then routes to the escalation queue for senior credit review.'
      : agentRec === 'decline'
        ? ' The facility is recorded as declined.'
        : ' The memo is committed to the record.';
    return `Countersigning concurs with the agent's ${tokenWord(agentRec)} on the revised structure for ${memo} (${equity}).${tail}${route}`;
  }
  const word = tokenWord(pkg.recommendation);
  const lead = `Countersigning concurs with the agent's ${word} on ${memo}`;
  switch (pkg.recommendation) {
    case 'approve':
      return n === 0
        ? `${lead}. There are no notes to sign over. The memo is committed to the record.`
        : `${lead}${signsOver(n, breaches)}. The memo is committed to the record.`;
    case 'escalate':
      return `${lead}${signsOver(n, breaches)}.${n === 0 ? ' There are no notes to sign over.' : ''} The memo then routes to the escalation queue for senior credit review.`;
    case 'decline':
      return `${lead}${signsOver(n, breaches)}.${n === 0 ? ' There are no notes to sign over.' : ''} The facility is recorded as declined as structured.`;
  }
}

/** Reasons as the call states them: the engine's own sentences, a long one kept to its head clause. */
function reasonText(reasons: string[], max: number): string {
  return reasons
    .slice(0, max)
    .map((r) => shortReason(r))
    .join(' ');
}

/** On a data-gated memo: what the figures as extracted would give once verified (the rule without the gate). */
function asExtracted(rec: Recommendation): string {
  return `As extracted, the figures point to ${tokenWord(rec)}; verification comes first.`;
}

/**
 * The decision, stated where it is made: the agent's overall recommendation as a question to the
 * reviewer, with the decide rule's own reasons (the package's `decisionReasons`, with their sizes:
 * one on an APPROVE, the first two on an ESCALATE, every principal reason in full on a DECLINE,
 * the verification reason on a data-gated memo), and what each verb does. Lives beside the verbs (the
 * reviewer must never scroll back to the top of the memo to learn what they decide).
 *
 * "The agent recommends [TOKEN]" is ALWAYS the agent's own call (pkg.recommendation): an amendment
 * is the reviewer's, so on amended terms the title asks about the amended outcome and the reason
 * states it, but the token never moves. Every consequence caption reads the real routing rule.
 */
function callFor(ctx: FileCtx, pkg: ApprovalPackage, amendments: Amendment[], notesLeft: number): {
  call: NonNullable<SignatureView['call']>;
  notes: NonNullable<SignatureView['verbs']>['notes'];
} {
  const name = ctx.deal.name;
  const nextRev = pkg.revision + 1;
  const toReview = notesLeft > 0 ? ` ${plural(notesLeft, 'note')} above ${notesLeft === 1 ? 'is' : 'are'} yours to sign over.` : '';
  const rec = pkg.recommendation;
  // the engine's decision on this package: its call, the tier of the rule and the specific reasons
  const d = packageDecision(ctx, pkg);
  const gated = dataGated(pkg);
  let title: string;
  let why: string;
  let sign: string;
  if (amendments.length > 0) {
    const am = amendedDecisionOf(ctx.deal, amendments, pkg);
    const amendedRec = am?.recommendation ?? rec;
    const terms = listJoin(amendments.map((a) => `${amendmentName(a)} ${a.to}`));
    const routes = routesOnSign(pkg, ctx.deal, amendments, false);
    const because = am && am.reasons.length > 0 ? ` ${shortReason(am.reasons[0])}` : '';
    why =
      `On your amended terms (${terms}) the same decision rule ${amendedRec === rec ? 'still gives' : 'gives'} ${tokenWord(amendedRec)}.${because}` +
      (gated ? ' Amending a term does not verify a figure.' : '');
    if (amendedRec === 'approve') {
      title = `Approve ${name} on your amended terms?`;
      sign = rec === 'escalate' ? 'Approves on your amended terms. Nothing routes onward.' : 'Approves on your amended terms.';
    } else if (amendedRec === 'escalate' && routes) {
      title = `Send ${name} to senior credit review on your amended terms?`;
      sign = 'Routes the memo to senior credit review.';
    } else if (amendedRec === 'escalate') {
      title = `Countersign ${name} on your amended terms?`;
      sign = 'Records the memo on your amended terms. Nothing routes onward.';
    } else {
      title = `Decline ${name} on your amended terms?`;
      sign = 'Records the facility as declined on your amended terms.';
    }
  } else if (pkg.restructure && rec === 'approve') {
    title = `Approve ${name} on the revised structure?`;
    const because = d.reasons.length > 0 ? `: ${lowerFirst(shortReason(d.reasons[0]))}` : '.';
    why = `With ${fmtM(pkg.restructure.contribution)} of sponsor equity the same decision rule now approves${because}${toReview}`;
    sign = 'Approves the revised structure.';
  } else if (pkg.restructure) {
    // a revised structure the rule still holds: the data gate (unverified figures) escalates it
    const cure = cureOf(ctx, pkg.revision);
    const implied = gated && cure ? ` ${asExtracted(evaluate(ctx.deal, revisedScenario(ctx.deal, cure)).recommendation)}` : '';
    title = rec === 'decline' ? `Decline ${name} on the revised structure?` : `Send ${name} to senior credit review on the revised structure?`;
    why = `${reasonText(d.reasons, 2)}${implied}`;
    sign = rec === 'decline' ? 'You agree with the analysis: the facility is recorded as declined.' : 'Routes the memo to senior credit review.';
  } else if (rec === 'approve') {
    title = `Approve ${name} as filed?`;
    why = `${reasonText(d.reasons, 1)}${toReview}`;
    sign = 'Approves the facility as filed.';
  } else if (rec === 'escalate') {
    title = `Send ${name} to senior credit review?`;
    // the rule's first one or two reasons with their sizes; a data-gated memo says what to verify
    why = gated ? `${reasonText(d.reasons, 1)} ${asExtracted(decisionForDeal(ctx.deal).recommendation)}` : reasonText(d.reasons, 2);
    sign = 'Routes the memo to senior credit review.';
  } else {
    title = `Decline ${name}?`;
    // every principal reason (the rule caps them at four) IN FULL, each with its magnitude:
    // the breached covenants and their headroom, and why no cure fits the policy cap
    why = d.reasons.join(' ');
    sign = 'You agree with the analysis: the facility is recorded as declined.';
  }
  // On a DECLINE memo both verbs end the credit; what differs is whether you agree with the analysis.
  const rej = rec === 'decline' ? 'You disagree with the analysis: the memo is refused. Note required.' : 'The credit does not proceed. Note required.';
  return {
    call: { lead: COPY.agentRecommends, token: tokenOf(rec), title, why },
    notes: {
      sign,
      ret: `The agent revises and returns rev ${nextRev}. Note required.`,
      rej,
    },
  };
}

function primaryLabel(pkg: ApprovalPackage, amendments: Amendment[]): string {
  if (amendments.length > 0) return PRIMARY_LABEL.amended;
  if (pkg.restructure) return PRIMARY_LABEL.revised;
  return PRIMARY_LABEL[pkg.recommendation];
}

export function selectSignature(s: V2Store, dealId: string): SignatureView | null {
  const ctx = fileContext(s, dealId);
  return ctx ? signatureOf(ctx) : null;
}

/** The signature view of one resolved file context (the memo's Decision card). */
export function signatureOf(ctx: FileCtx): SignatureView | null {
  const s = ctx.s;
  if (ctx.mode !== 'running' && ctx.mode !== 'gate' && ctx.mode !== 'sealed') return null;
  const pkg = ctx.pkg;
  const g = s.gate;

  // the returned history: one record per send-back that opened a revision (while a revision
  // drafts, its send-back is already on the record even before the rework step starts)
  const drafting = ctx.mode === 'running';
  let lastRev = pkg ? pkg.revision + (drafting ? 1 : 0) : 1;
  for (const p of ctx.plan) {
    const n = reworkN(p.id);
    if (n !== null) lastRev = Math.max(lastRev, n);
  }
  const nextRev = lastRev;
  const returned: SignatureView['returned'] = [];
  for (let n = 2; n <= lastRev; n++) {
    const rec = returnedRecord(ctx, n);
    const parts = [`Rev ${n - 1} returned for revision`, 'Reviewer'];
    if (rec.at !== null) parts.push(fmtHM(rec.at));
    if (rec.note) parts.push(`“${rec.note}”`);
    const prov = provenanceShort(rec.provenance);
    if (prov) parts.push(prov);
    returned.push({ rev: n - 1, text: parts.join(' · ') });
  }

  const policy = filePolicy(s, ctx);
  const sealed = ctx.mode === 'sealed' && ctx.seal ? ctx.seal : null;
  const pending = ctx.mode === 'running' || !pkg;
  const leaving = ctx.mode === 'gate' && g.leaving;
  let state: SignatureState;
  if (pending) state = 'pending';
  else if (sealed) state = sealed.decision === 'auto-countersigned' ? 'signed-auto' : sealed.outcome === 'reject' ? 'rejected' : 'signed';
  else if (leaving) state = 'leaving';
  else if (policy.armed) state = 'countdown';
  else if (policy.holdLabel) state = 'held';
  else state = 'gate';
  const atGate = state === 'gate' || state === 'countdown' || state === 'held' || state === 'leaving';

  // signed over: the current package's counted notes, in page order
  const amendments = amendmentsOf(ctx);
  const notes = buildNotes(ctx);
  const counted = pkg && !pending ? countedFlagsOf(ctx.deal, pkg, amendments) : [];
  const clearedIds = new Set(counted.filter((c) => c.cleared).map((c) => c.flag.id));
  const pkgIds = new Set(counted.map((c) => c.flag.id));
  const signedOver: SignatureView['signedOver'] = notes.toReview
    .filter((nt) => nt.flagId !== null && pkgIds.has(nt.flagId))
    .map((nt) => ({
      flagId: nt.flagId ?? '',
      noteId: nt.id,
      state: nt.status,
      text: flagClause(nt.text),
      cleared: nt.flagId !== null && clearedIds.has(nt.flagId),
      opened: nt.opened,
      target: nt.target,
      linkLabel: isRowAnchor(nt.anchorId) ? COPY.showRow : COPY.showInMemo,
    }));
  const total = signedOver.length;
  const openedCount =
    sealed && sealed.presented && sealed.presented.notesOpened.total === total
      ? sealed.presented.notesOpened.opened
      : signedOver.filter((o) => o.opened).length;
  const signedOverLabel =
    total === 0
      ? 'Signed over · no notes'
      : sealed && sealed.outcome === 'reject'
        ? `Notes on the record · you opened ${openedCount} of ${total}`
        : `Signed over · you opened ${openedCount} of ${total}`;

  // R4.3 (Mobbin audit fix 3): the covenant inputs the CIM does not state, as ONE info item after the
  // Signed over rows. Not a flag: never in signedOver, never counted above, never read by the policy
  // or the call; it only takes the reviewer to the Covenants card, where each such Actual is marked.
  const notInCim = !pending ? covenantInputsNotInCim(ctx.deal, fileFigureRows(ctx)).length : 0;
  const inputsNotInCim: SignatureView['inputsNotInCim'] =
    notInCim > 0 ? { text: COPY.inputsNotInCim(notInCim), linkLabel: COPY.showInMemo, target: memoTargetOfAnchor('sec:covenants') } : null;

  // the agent's pre-signed line
  const rev = pkg?.revision ?? 1;
  const awaitingAt = awaitingAtOf(ctx);
  const agentCaption = pending
    ? `Credit Analyst (agent) · drafting rev ${pkg ? nextRev : 1}`
    : ['Credit Analyst (agent)', `rev ${rev}`, pkg?.restructure ? 'Structuring Engine proposal' : null, awaitingAt !== null ? fmtHM(awaitingAt) : null]
        .filter((x): x is string => !!x)
        .join(' · ');

  // the reviewer's line
  const recWord = pkg ? tokenWord(pkg.recommendation) : '';
  let sealedCaption = '';
  if (sealed) {
    const stamp = fmtStamp(sealed.decidedAt);
    if (sealed.decision === 'auto-countersigned') sealedCaption = `${VERB_WORD['auto-countersigned']} · clean-approval policy · ${stamp}`;
    else if (sealed.outcome === 'reject') sealedCaption = `${VERB_WORD.rejected} · Reviewer · ${fmtHM(sealed.decidedAt)}`;
    else if (sealed.decision === 'countersigned-amended' && pkg) {
      // what was actually signed: the amended outcome re-tested on the recorded terms
      sealedCaption = `${VERB_WORD['countersigned-amended']} · ${signedVerdict(ctx.deal, pkg.recommendation, sealed.amendments, 'your amended terms', pkg)} · Reviewer · ${stamp}`;
    } else sealedCaption = `${VERB_WORD.countersigned} · concurs ${recWord} · Reviewer · ${stamp}`;
    // R4.3: the record says what it was decided over
    if (notInCim > 0) sealedCaption += ` · ${COPY.sealedNotInCim(notInCim, sealed.outcome === 'reject' ? 'decided' : 'signed')}`;
  }
  const js = g.justSigned;
  const animate =
    !!sealed && sealed.outcome === 'approve' && !sealed.auto && !!js && js.runId === ctx.runId && js.verb === 'approve' && !js.auto && s.now - js.at < INK_REPLAY_WINDOW_MS;
  const reviewerBase = { ink: 'none' as const, autoText: null, rejectedWord: null, fillMs: AUTO_COUNTDOWN_MS, reviewLabel: null };
  let reviewer: SignatureView['reviewer'];
  switch (state) {
    case 'countdown':
      reviewer = { ...reviewerBase, sigState: 'countdown', caption: policy.line, reviewLabel: COPY.reviewManually };
      break;
    case 'held':
      reviewer = { ...reviewerBase, sigState: 'held', caption: policy.holdLabel ?? COPY.countersignHere };
      break;
    case 'leaving':
      reviewer = { ...reviewerBase, sigState: 'open', caption: COPY.returningForRevision };
      break;
    case 'signed':
      reviewer = { ...reviewerBase, sigState: 'signed', caption: sealedCaption, ink: animate ? 'animate' : 'static' };
      break;
    case 'signed-auto':
      reviewer = { ...reviewerBase, sigState: 'signed-auto', caption: sealedCaption, autoText: COPY.autoSignature };
      break;
    case 'rejected':
      reviewer = { ...reviewerBase, sigState: 'rejected', caption: sealedCaption, rejectedWord: REJECTED_WORD };
      break;
    case 'pending':
      reviewer = { ...reviewerBase, sigState: 'open', caption: COPY.signaturePending };
      break;
    default:
      reviewer = { ...reviewerBase, sigState: 'open', caption: STATUS_WORD.awaiting };
  }

  // the reviewer's draft (gate only). An armed Return / Reject (R4) turns the label into the verb's
  // question; the hint is the calm line after a second press with an empty note.
  const dead = verbsDead(s);
  const armed = atGate && !dead ? g.armed : null;
  let note: SignatureView['note'] = null;
  if (atGate) {
    const trimmed = g.note.trim();
    const chip =
      g.insertedDraft !== null && trimmed ? (trimmed === g.insertedDraft.trim() ? NOTE_CHIP.verbatim : NOTE_CHIP.edited) : null;
    note = {
      value: g.note,
      label: armed === 'reject' ? COPY.armedRejectLabel : armed === 'rework' ? COPY.armedReworkLabel(rev + 1) : COPY.noteLabel,
      placeholder: COPY.notePlaceholder,
      draftLabel: COPY.draftFromNotes,
      draftDisabled: dead,
      chip,
      hint: armed !== null && g.reasonHint && !trimmed ? (armed === 'reject' ? COPY.reasonFirstReject : COPY.reasonFirstRework) : null,
    };
  }

  let amendment: SignatureView['amendment'] = null;
  if (atGate && amendments.length > 0) {
    const terms = amendments.map((a) => `${amendmentName(a)} ${a.from} → ${a.to}`).join(' · ');
    // "Edit in memo" returns to the first amended covenant row (amending stays on the row, P-05)
    const editKind: 'leverage' | 'liquidity' = covenantKind(amendments[0].label) === 'liquidity' ? 'liquidity' : 'leverage';
    const amended = ctx.deal.covenants.find((c) => `${c.name} covenant` === amendments[0].label);
    amendment = {
      text: `Amended terms · ${terms} · as amended`,
      token: tokenOf(amendedRecOf(ctx.deal, amendments, pkg) ?? (pkg ? pkg.recommendation : 'escalate')),
      revertLabel: COPY.revert,
      editLabel: COPY.editInMemo,
      editKind,
      editTarget: memoTargetOfAnchor(amended ? `cov:${amended.name}` : 'sec:covenants'),
    };
  }

  const live = counted.filter((c) => !c.cleared);
  const attestation =
    atGate && pkg ? attestationFor(ctx, pkg, amendments, live.length, live.filter((c) => c.kind === 'breach').length) : null;

  const decided = atGate && pkg ? callFor(ctx, pkg, amendments, live.length) : null;
  const verbs: SignatureView['verbs'] =
    atGate && pkg && decided
      ? {
          primary: primaryLabel(pkg, amendments),
          returnLabel: armed === 'rework' ? IMPERATIVE.returnCommit : IMPERATIVE.returnLabel,
          rejectLabel: armed === 'reject' ? IMPERATIVE.rejectCommit : IMPERATIVE.rejectLabel,
          disabled: dead,
          armed,
          cancelLabel: armed !== null ? COPY.cancelArmed : null,
          // the armed verb commits from its note (where S and R type) with the commit chord
          kbd: { sign: 'A', ret: armed === 'rework' ? `${s.modKey}↵` : 'S', rej: armed === 'reject' ? `${s.modKey}↵` : 'R' },
          notes: decided.notes,
        }
      : null;

  let sealedView: SignatureView['sealed'] = null;
  if (sealed && pkg) {
    sealedView = {
      caption: sealedCaption,
      quote: sealed.note ? `“${sealed.note}”` : null,
      provenance: provenanceText(sealed.provenance, sealed.auto, !!sealed.note),
      amendments: (sealed.amendments ?? []).map((a) => ({ label: a.label, from: a.from, to: a.to })),
      routed: sealed.routed ? COPY.routedLine : null,
      routedLinkLabel: sealed.routed ? COPY.openInBook : null,
      checks: sealed.auto ? policyChecks(pkg) : null,
    };
  }

  const pendingLine = pending ? (pkg ? `The signature opens when revision ${nextRev} is assembled.` : COPY.signaturePending) : null;

  const headline = sealHeadline(ctx);
  const record: SignatureView['record'] =
    headline && (state === 'signed' || state === 'signed-auto' || state === 'rejected') ? { state, headline: headline.full } : null;

  const sealedState = state === 'signed' || state === 'signed-auto' || state === 'rejected';
  return {
    state,
    eyebrow: `${sealedState ? COPY.recordEyebrow : COPY.decisionEyebrow} · ${pkg?.memoId ?? ctx.deal.memoId} · rev ${pending ? nextRev : rev}`,
    heading: COPY.decision,
    pendingLine,
    record,
    returned,
    signedOver,
    signedOverLabel,
    inputsNotInCim,
    agent: { text: COPY.agentSignature, caption: agentCaption },
    reviewer,
    policy,
    note,
    amendment,
    attestation,
    call: decided ? decided.call : null,
    verbs,
    sealed: sealedView,
  };
}

// =============================================================================
// Stress test (scratch; never the record until attached)
// =============================================================================

type Zones = ReturnType<typeof stressZones>;
const ZONE_CACHE = new WeakMap<Deal, Map<string, Zones>>();

/** stressZones is a pure scan; cache it per deal and scenario so a re-render never re-scans. */
function zonesFor(deal: Deal, scenario: Scenario, key: DriverKey): Zones {
  let byKey = ZONE_CACHE.get(deal);
  if (!byKey) {
    byKey = new Map();
    ZONE_CACHE.set(deal, byKey);
  }
  const k = `${scenarioKey(deal, scenario)}#${key}`;
  const hit = byKey.get(k);
  if (hit) return hit;
  const z = stressZones(deal, scenario, key);
  if (byKey.size > 400) byKey.clear();
  byKey.set(k, z);
  return z;
}

/** The tightest headroom as the rule prints it ('−6.5%'), a dash when no covenant is readable. */
function headroomText(h: number | null): string {
  return h === null ? COPY.noCall : fmtHeadroom(h);
}

function isBase(deal: Deal, scenario: Scenario): boolean {
  const base = baselineScenario(deal);
  return (Object.keys(base) as DriverKey[]).every((k) => Math.abs(base[k] - scenario[k]) < 1e-9);
}

export function selectStress(s: V2Store, dealId: string): StressView | null {
  const ctx = fileContext(s, dealId);
  if (!ctx || !ctx.pkg) return null;
  if (ctx.mode !== 'gate' && ctx.mode !== 'sealed' && ctx.mode !== 'running') return null;
  const deal = ctx.deal;
  const pkg = ctx.pkg;
  const entry = s.ui.stress[dealId];
  const scenario = entry ? entry.scenario : baselineScenario(deal);
  const base = baselineScenario(deal);
  const available: StressView['available'] = ctx.live ? 'live' : 'readonly';
  const atBase = isBase(deal, scenario);
  const changed = new Set(changedDrivers(deal, scenario).map((d) => d.key));

  const drivers: StressView['drivers'] = driversFor(deal).map((d) => {
    const value = scenario[d.key];
    const delta = value - base[d.key];
    const moved = changed.has(d.key);
    const favorable = d.higherBetter ? delta > 0 : delta < 0;
    const z = zonesFor(deal, scenario, d.key);
    return {
      key: d.key,
      label: d.label,
      value,
      min: d.min,
      max: d.max,
      step: d.step,
      valueText: fmtDriverValue(d, value),
      deltaText: moved ? fmtDriverDelta(d, delta) : null,
      deltaTone: moved ? (favorable ? 'good' : 'bad') : 'ink-3',
      zones: z.zones,
      boundaries: z.boundaries,
    };
  });

  // The base is the FILED memo: its call, tests, risk and breaches. The engine's model is
  // calibrated to reproduce them, but on an uploaded file it can drift, so "matches the
  // filed figures" is claimed only when the model really reproduces them at base.
  const filed = filedBase(deal);
  const reproduces = baseFidelity(deal) === 'exact';
  const l = evaluate(deal, scenario);
  const result = filed.rec !== l.recommendation ? 'flips' : 'holds';
  const outcome = {
    base: tokenOf(filed.rec),
    live: tokenOf(atBase ? filed.rec : l.recommendation),
    text: atBase
      ? reproduces
        ? 'matches the filed figures'
        : 'the model approximates this file and differs from the filed figures'
      : `${result} · risk ${filed.score} → ${l.risk.score} · headroom ${headroomText(filed.minHeadroom)} → ${headroomText(l.minHeadroom)} · breaches ${filed.breaches} → ${l.breaches}`,
    key: scenarioKey(deal, scenario),
  };

  let attach: StressView['attach'] = null;
  if (available === 'live') {
    const runId = s.agent.runId;
    const already = !atBase && (s.ui.attached[runId] ?? []).includes(stressRecord(deal, scenario).key);
    attach = {
      label: COPY.attachAsExhibit,
      disabled: atBase || already,
      reason: atBase ? COPY.attachChangeFirst : already ? COPY.attachAlready : null,
    };
  }

  const rev = pkg.revision;
  return {
    open: entry ? entry.open : false,
    available,
    collapsedLine: COPY.stressCollapsed,
    openLabel: COPY.stressOpen,
    eyebrow: COPY.stressEyebrow,
    baseLabel:
      (pkg.restructure
        ? `Base = filed figures · rev ${rev} proposes a restructure (see Revision ${rev})`
        : `Base = filed figures (rev ${rev})`) +
      (dataGated(pkg) ? ` · ${COPY.stressUnverified}` : '') +
      (reproduces ? '' : ' · the sensitivity model approximates this file'),
    drivers,
    outcome,
    covenants: (atBase ? deal.covenants : l.covenants).map((c) => covenantRow(c, [], [], null)),
    attach,
    readonlyNote: available === 'readonly' ? COPY.attachLiveOnly : null,
    resetLabel: COPY.resetToBase,
    closeLabel: COPY.stressClose,
    resetDisabled: atBase,
  };
}

// =============================================================================
// Exhibits (solid, part of the memo; always read from auditHistory by runId)
// =============================================================================

/** Exhibits of the run the file shows, or of an explicit context (the export passes the sealed one). */
export function selectExhibits(s: V2Store, dealId: string, from?: FileCtx | null): ExhibitView[] {
  const ctx = from ?? fileContext(s, dealId);
  if (!ctx) return [];
  const decidedAt = ctx.seal ? ctx.seal.decidedAt : null;
  const fallback: TokenView = tokenOf(ctx.pkg ? ctx.pkg.recommendation : 'escalate');
  return exhibitEntries(ctx).map((e, i) => {
    const parsed = parseStressLabel(e.label);
    const after = decidedAt !== null && e.t > decidedAt ? ' · attached after countersignature' : '';
    return {
      id: e.id,
      letter: String.fromCharCode(65 + (i % 26)),
      heading: COPY.stressTest,
      meta: `attached ${fmtHM(e.t)} · Reviewer${after}`,
      detail: e.detail ?? '',
      from: parsed ? parsed.from : fallback,
      to: parsed ? parsed.to : fallback,
      result: parsed ? parsed.result : 'holds',
    };
  });
}
