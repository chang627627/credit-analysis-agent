// ---------------------------------------------------------------------------
// Countersign V2 · Book selector (spec §7.4). The live covenant state of every
// file from the always-on Portfolio Monitor, with open items grouped under
// their file. Sub-row figures read the LIVE reading of the item's covenant
// (never the reason sentence); the tightest covenant is the minimum signed
// cushion; tests count watch as passing. Acknowledging an item asks why first
// (R4.6): the open strip, the one rule (a breach needs a reason) and the
// acknowledged line ("until it recovers · “…”") are worded here.
// ---------------------------------------------------------------------------

import type { EscalationItem, PortfolioDealState } from '../../agent/monitor';
import { DECLINE_SCORE } from '../../agent/rating';
import type { AckNote, V2Store } from '../state/contracts';
import { cushionOf, distanceOf } from './evidence';
import { fmtAgo, fmtCountdown, fmtHM, fmtSeconds, plural } from './format';
import { healthStatus } from './select-file';
import { dealOf } from './select-top';
import type { BookAckView, BookItem, BookRow, BookView, StatusText } from './types';
import { COPY, STATUS_WORD } from './vocab';

/** The monitor's sweep cadence (useMonitor: 25 s ÷ demo pace). */
const SWEEP_MS = 25000;

const HEALTH_RANK: Record<PortfolioDealState['health'], number> = { breach: 0, watch: 1, healthy: 2 };

// ---- acknowledging a covenant item (R4.6, audit fix 5) -------------------------

/** A breach needs a reason to be acknowledged; a watch may go without. The one rule the Book and state/acknowledge.ts read. */
export function ackNoteRequired(e: Pick<EscalationItem, 'severity'>): boolean {
  return e.severity === 'critical';
}

/**
 * What an acknowledgement holds the item back until, worded from what the engine does: an
 * acknowledged item is raised again only when a sweep finds it at a worse severity, and closes when
 * it passes two sweeps in a row. A breach has no worse severity, so it stays quiet until it recovers.
 */
export function ackUntil(e: Pick<EscalationItem, 'severity'>): string {
  return e.severity === 'critical' ? COPY.ackUntilBreach : COPY.ackUntilWatch;
}

/** The live-region sentence after an acknowledgement. */
export function ackAnnouncement(e: Pick<EscalationItem, 'severity' | 'covenant' | 'dealName'>): string {
  return COPY.ackDone(e.covenant ?? e.dealName, e.dealName, ackUntil(e));
}

/** The reason as the record shows it: quoted, or "no reason given" (a watch acknowledged without one). */
export function ackReasonText(rec: AckNote, sentence: boolean): string {
  return rec.note ? `“${rec.note}”` : sentence ? COPY.ackNoReasonDetail : COPY.ackNoReason;
}

function ackStrip(s: V2Store, e: EscalationItem, fileName: string): BookAckView | null {
  const c = s.ui.ackConfirm;
  if (!c || c.id !== e.id || e.status !== 'open') return null;
  const required = ackNoteRequired(e);
  return {
    label: COPY.ackStripLabel(e.covenant ?? fileName, fileName),
    text: COPY.ackConsequence(required, ackUntil(e)),
    placeholder: COPY.ackQuestion,
    value: c.note,
    required,
    hint: c.hint && required && c.note.trim() === '' ? COPY.ackReasonFirst : null,
    confirmLabel: COPY.acknowledge,
    cancelLabel: COPY.cancel,
  };
}

/**
 * An acknowledged item's line: what it waits for (or that it has since worsened), then the reason.
 * Worsened = a newer item for the same covenant that is not resolved, open OR acknowledged (R4.11):
 * the engine resolves every item of a covenant together, so a newer unresolved one can only be the
 * re-raise, and acknowledging that breach does not undo the fact that the watch worsened.
 */
function ackRecordOf(s: V2Store, e: EscalationItem, all: EscalationItem[]): string | null {
  if (e.status !== 'acknowledged') return null;
  const worsened = all.some((o) => o.id !== e.id && o.key === e.key && o.status !== 'resolved' && o.at > e.at);
  const rec = s.ui.ackNotes[e.id];
  return [worsened ? COPY.ackReraised : ackUntil(e), rec ? ackReasonText(rec, false) : null].filter((p): p is string => p !== null).join(' · ');
}

function monitorItem(s: V2Store, p: PortfolioDealState | undefined, e: EscalationItem, all: EscalationItem[], fileName: string): BookItem {
  const name = e.covenant ?? '';
  const live = p && e.covenant ? p.covenants.find((c) => c.name === e.covenant) : undefined;
  const actual = live ? live.actual : e.actual ?? '';
  const threshold = live ? live.threshold : e.threshold ?? '';
  const acked = e.status === 'acknowledged';
  const status: StatusText = acked
    ? { state: 'acknowledged', text: `${STATUS_WORD.acknowledged} ${fmtHM(e.acknowledgedAt ?? e.at)}` }
    : e.severity === 'critical'
      ? { state: 'breach', text: STATUS_WORD.breach }
      : { state: 'watch', text: STATUS_WORD.watch };
  const ack = acked ? null : ackStrip(s, e, fileName);
  return {
    id: e.id,
    origin: 'monitor',
    status,
    covenant: name,
    reading: actual && threshold ? `${actual} / ${threshold}` : actual || threshold,
    distance: actual && threshold ? distanceOf(name, threshold, actual) : '',
    raised: `raised ${fmtAgo(s.now - e.at)}`,
    muted: acked,
    // the strip's own Acknowledge is the only one while it is open
    action: acked || ack ? null : { kind: 'acknowledge', label: COPY.acknowledge },
    link: null,
    doneText: null,
    ack,
    ackRecord: ackRecordOf(s, e, all),
  };
}

function countersignItem(s: V2Store, e: EscalationItem): BookItem {
  const deal = dealOf(s, e.dealId);
  const memo = deal ? deal.memoId : e.dealName;
  const acked = e.status === 'acknowledged';
  return {
    id: e.id,
    origin: 'countersign',
    status: { state: 'signed', text: COPY.fromCountersignature },
    covenant: `${memo} routed for senior credit review`,
    reading: '',
    distance: '',
    raised: fmtHM(e.at),
    muted: acked,
    action: acked ? null : { kind: 'mark-handed-off', label: COPY.markHandedOff },
    link: { label: COPY.openRecord, route: { name: 'file', dealId: e.dealId, at: 'signature' } },
    doneText: acked ? `Marked handed off to senior review · ${fmtHM(e.acknowledgedAt ?? e.at)}` : null,
    ack: null,
    ackRecord: null,
  };
}

export function selectBook(s: V2Store): BookView {
  // files removed from the Desk drop out of the Book too (the monitor keeps their last reading)
  const visible = new Set(s.agent.dealsFull.map((d) => d.id));
  const m = {
    ...s.monitor,
    portfolio: s.monitor.portfolio.filter((p) => visible.has(p.dealId)),
    escalations: s.monitor.escalations.filter((e) => visible.has(e.dealId)),
  };
  const interval = fmtSeconds(SWEEP_MS / (s.agent.speed > 0 ? s.agent.speed : 1));
  let cadence: string;
  if (m.sweeping) cadence = `Portfolio Monitor · re-testing · sweep #${m.sweepCount + 1}`;
  else if (m.sweepCount === 0 || m.lastSweepAt === null) cadence = `Portfolio Monitor · every ${interval} · first sweep pending`;
  else {
    const next = m.nextSweepAt !== null && m.nextSweepAt > s.now ? `next in ${fmtCountdown(m.nextSweepAt, s.now)}` : 'next due';
    cadence = `Portfolio Monitor · every ${interval} · sweep #${m.sweepCount} · ${fmtAgo(s.now - m.lastSweepAt)} · ${next}`;
  }

  const base = {
    title: COPY.bookTitle,
    disclosure: COPY.bookDisclosure,
    cadence,
    sweepLabel: COPY.sweepNow,
    sweepDisabled: m.sweeping,
  };
  if (m.portfolio.length === 0) return { ...base, verdict: null, empty: COPY.bookEmpty, rows: [] };

  const rows: (BookRow & { oldestOpen: number })[] = m.portfolio.map((p) => {
    const mine = m.escalations.filter((e) => e.dealId === p.dealId);
    // open before acknowledged, then oldest first; the hook keeps items newest-first, so reverse
    // before the (stable) sort to keep emission order among items raised in the same sweep
    const visible = [...mine]
      .reverse()
      .filter((e) => e.status === 'open' || e.status === 'acknowledged')
      .sort((a, b) => (a.status === b.status ? a.at - b.at : a.status === 'open' ? -1 : 1));
    const resolved = mine.filter((e) => e.status === 'resolved').length;
    let tightest: BookRow['tightest'] = null;
    let cushion: BookRow['cushion'] = null;
    for (const c of p.covenants) {
      const cu = cushionOf(c.threshold, c.actual);
      if (!cushion || cu.pct < cushion.pct) {
        cushion = cu;
        tightest = { name: c.name, reading: `${c.actual} / ${c.threshold}` };
      }
    }
    const passing = p.covenants.filter((c) => c.status !== 'breach').length;
    const watching = p.covenants.filter((c) => c.status === 'watch').length;
    const open = mine.filter((e) => e.status === 'open');
    return {
      dealId: p.dealId,
      name: p.name,
      borrower: p.borrower,
      resolvedMeta: resolved > 0 ? `${resolved} resolved` : null,
      status: healthStatus(p.health),
      tightest,
      cushion,
      tests: `${passing} of ${p.covenants.length} pass${watching > 0 ? ` · ${watching} on watch` : ''}`,
      risk: { text: String(p.riskScore), tone: p.riskScore >= DECLINE_SCORE ? 'bad' : 'ink' },
      checked: `#${p.lastSweepId}`,
      items: visible.map((e) => (e.origin === 'countersign' ? countersignItem(s, e) : monitorItem(s, p, e, mine, p.name))),
      oldestOpen: open.length > 0 ? Math.min(...open.map((e) => e.at)) : Number.MAX_SAFE_INTEGER,
    };
  });
  const byHealth = (a: BookRow & { oldestOpen: number }, b: BookRow & { oldestOpen: number }) =>
    HEALTH_RANK[m.portfolio.find((p) => p.dealId === a.dealId)?.health ?? 'healthy'] -
      HEALTH_RANK[m.portfolio.find((p) => p.dealId === b.dealId)?.health ?? 'healthy'] ||
    a.oldestOpen - b.oldestOpen ||
    a.name.localeCompare(b.name);
  // R4.11: while an Acknowledge strip is open the order holds as it was when the strip opened, so a
  // sweep that re-ranks the files never moves the row whose reason field the reviewer is typing in
  // (a moved node loses focus mid-reason); files that joined since go after, in the usual order.
  // The Book re-sorts when the strip closes.
  const frozen = s.ui.ackConfirm ? s.ui.ackConfirm.order : null;
  if (frozen && frozen.length > 0) {
    const at = (id: string) => {
      const i = frozen.indexOf(id);
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    rows.sort((a, b) => at(a.dealId) - at(b.dealId) || byHealth(a, b));
  } else {
    rows.sort(byHealth);
  }

  // A file the monitor has not swept yet (an upload joins the book on the next sweep) can
  // already carry a routed countersignature. Its item shows at once, under a row that says
  // the readings are still to come, so the verdict's hand-off count always has a row behind it.
  const swept = new Set(m.portfolio.map((p) => p.dealId));
  const pendingIds: string[] = [];
  for (const e of [...m.escalations].reverse()) {
    if (swept.has(e.dealId) || pendingIds.includes(e.dealId)) continue;
    if (e.status === 'open' || e.status === 'acknowledged') pendingIds.push(e.dealId);
  }
  for (const dealId of pendingIds) {
    const deal = dealOf(s, dealId);
    const mine = [...m.escalations]
      .reverse()
      .filter((e) => e.dealId === dealId && (e.status === 'open' || e.status === 'acknowledged'))
      .sort((a, b) => (a.status === b.status ? a.at - b.at : a.status === 'open' ? -1 : 1));
    rows.push({
      dealId,
      name: deal ? deal.name : mine[0]?.dealName ?? dealId,
      borrower: deal ? deal.document.borrower : '',
      resolvedMeta: null,
      status: { state: 'pending', text: COPY.awaitingFirstReading },
      tightest: null,
      cushion: null,
      tests: COPY.noCall,
      risk: { text: COPY.noCall, tone: 'ink' },
      checked: COPY.noCall,
      items: mine.map((e) => (e.origin === 'countersign' ? countersignItem(s, e) : monitorItem(s, undefined, e, mine, deal ? deal.name : e.dealName))),
      oldestOpen: Number.MAX_SAFE_INTEGER,
    });
  }

  // verdict: one sentence for the whole book
  const n = m.portfolio.length;
  const inBreach = m.portfolio.filter((p) => p.health === 'breach').length;
  const onWatch = m.portfolio.filter((p) => p.health === 'watch').length;
  const openMonitor = m.escalations.filter((e) => e.status === 'open' && e.origin !== 'countersign').length;
  const handOff = m.escalations.filter((e) => e.status === 'open' && e.origin === 'countersign').length;
  const handOffText = handOff > 0 ? `${plural(handOff, 'memo')} awaiting senior hand-off` : null;
  let verdict: StatusText;
  if (inBreach > 0) {
    const parts = [`${inBreach} of ${plural(n, 'file')} in breach`];
    if (openMonitor > 0) parts.push(`${plural(openMonitor, 'covenant')} ${openMonitor === 1 ? 'needs' : 'need'} review`);
    if (handOffText) parts.push(handOffText);
    verdict = { state: 'breach', text: parts.join(' · ') };
  } else if (onWatch > 0) {
    const thin = m.portfolio.reduce((sum, p) => sum + p.covenants.filter((c) => c.status === 'watch').length, 0);
    const parts = [`${plural(onWatch, 'file')} on watch`, `thin headroom on ${plural(thin, 'covenant')}`];
    if (handOffText) parts.push(handOffText);
    verdict = { state: 'watch', text: parts.join(' · ') };
  } else {
    const ago = m.lastSweepAt !== null ? `, ${fmtAgo(s.now - m.lastSweepAt)}` : '';
    const parts = [`All ${plural(n, 'file')} within covenants · last checked sweep #${m.sweepCount}${ago}`];
    if (handOffText) parts.push(handOffText);
    verdict = { state: 'pass', text: parts.join(' · ') };
  }

  return { ...base, verdict, empty: null, rows: rows.map(({ oldestOpen: _o, ...r }) => r) };
}
