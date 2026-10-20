// ---------------------------------------------------------------------------
// Countersign V2 · Ledger (spec §7.5, §9.4 relabel tables). Every engine audit
// entry gets a closed-set actor, a display label and a filter chip; the raw
// engine label always stays in the row's `raw` grid and in the export.
// ---------------------------------------------------------------------------

import type { AuditHistoryEntry, RunRecord } from '../../hooks/useCreditAgent';
import type { CaseFileSnapshot, LedgerChip, MonitorLogEntry, V2Store } from '../state/contracts';
import { EM, fmtClock, fmtDuration, fmtElapsed, fmtHM, fmtIso, plural } from './format';
import { countedFlagsOf, runTiming, signedVerdict } from './select-file';
import type { Actor, LedgerRow, LedgerRun, LedgerView, StatusKey, StatusText } from './types';
import { COPY, provenanceText, STATUS_WORD, TOOL_LABEL, tokenWord, VERB_WORD } from './vocab';

const L_COUNTERSIGNED = `Human APPROVED ${EM} countersigned`;
const L_AMENDED = `Human APPROVED ${EM} countersigned as amended`;
const L_AUTO = 'AUTO-countersigned · clean-approval policy';

function toolLabel(name: string): string {
  return (TOOL_LABEL as Record<string, string>)[name] ?? name;
}

/** The closed actor set: Credit Analyst · Reviewer · Policy (Portfolio Monitor rows come from the log). */
export function actorOf(e: AuditHistoryEntry): Actor {
  const l = e.label;
  if (e.kind === 'whatif') return 'Reviewer';
  if (l === 'Plan approved by reviewer') return 'Reviewer';
  if (l === 'Plan extended · reviewer send-back') return 'Reviewer';
  if (l === L_COUNTERSIGNED || l === L_AMENDED || l.startsWith('Human REJECTED')) return 'Reviewer';
  if (l === L_AUTO) return 'Policy';
  if (l === 'Run cancelled') return 'Reviewer';
  return 'Credit Analyst';
}

/** The filter chip a row belongs to (All shows every row). */
export function chipOf(e: AuditHistoryEntry): LedgerChip {
  const actor = actorOf(e);
  if (e.kind === 'whatif') return 'exhibits';
  if (/^Flag · (critical|warning|info)/.test(e.label)) return 'flags';
  if (actor === 'Reviewer') return 'reviewer';
  if (actor === 'Policy') return 'policy';
  return 'all';
}

/**
 * Display label per the relabel table. `detail` is what the row shows beside
 * the event (null when it is folded into the event). The send-back row's
 * detail (the reviewer's note, from the following send-back flag) is filled by
 * the Ledger selector, which can see the neighbouring entries.
 */
export function relabel(e: AuditHistoryEntry): { event: string; detail: string | null } {
  const l = e.label;
  const d = e.detail ?? null;
  if (e.kind === 'whatif') return { event: l, detail: d };
  if (l === 'Run started') return { event: d ? `Run started · ${d}` : 'Run started', detail: null };
  if (l === 'Plan approved by reviewer') return { event: d ? `Plan approved · ${d}` : 'Plan approved', detail: null };
  if (l === 'Plan auto-started · unattended countdown') {
    return { event: `Plan auto-started · unattended countdown, no reviewer action${d ? ` · ${d}` : ''}`, detail: null };
  }
  const step = /^Step \d+ · (.+)/.exec(l);
  if (step) return { event: `Started · ${step[1]}`, detail: null };
  const call = /^Tool call · (\w+)/.exec(l);
  if (call) return { event: `Called ${toolLabel(call[1])}`, detail: d };
  const result = /^Tool result · (\w+)/.exec(l);
  if (result) return { event: `${toolLabel(result[1])} returned`, detail: d };
  const flag = /^Flag · (critical|warning|info)/.exec(l);
  if (flag) return { event: `Flag · ${flag[1] === 'critical' ? 'Breach' : flag[1] === 'warning' ? 'Watch' : 'Note'}`, detail: d };
  const awaiting = /^Awaiting human approval( · rev (\d+))?/.exec(l);
  if (awaiting) return { event: `Suspended at countersignature · rev ${awaiting[2] ?? '1'}`, detail: d };
  if (l === 'Plan extended · reviewer send-back') {
    const rev = d ? /rev (\d+)/.exec(d) : null;
    const prior = rev ? Math.max(1, Number(rev[1]) - 1) : 1;
    return { event: `Returned for revision · rev ${prior}`, detail: d };
  }
  if (l === L_AMENDED) return { event: 'Countersigned as amended', detail: d };
  if (l === L_COUNTERSIGNED) return { event: 'Countersigned', detail: d };
  if (l === L_AUTO) return { event: 'Auto-countersigned · clean-approval policy', detail: d };
  if (l.startsWith('Human REJECTED')) return { event: 'Rejected', detail: d };
  if (l === 'Run cancelled') return { event: d ? `Run cancelled · ${d}` : 'Run cancelled', detail: null };
  if (l === 'Run error') return { event: 'Run error', detail: d };
  return { event: l, detail: d };
}

/** Monitor-log row (append-only source) → actor, event, chip. */
export function relabelMonitor(m: MonitorLogEntry): { actor: Actor; event: string; chip: LedgerChip } {
  const word = m.severity === 'critical' ? 'Breach' : 'Watch';
  const reading = m.covenant ? `${m.covenant}${m.actual ? ` ${m.actual}` : ''}${m.threshold ? ` / ${m.threshold}` : ''}` : '';
  switch (m.kind) {
    case 'raised':
      if (m.origin === 'countersign') return { actor: 'Reviewer', event: `Routed for senior credit review · ${m.dealName}`, chip: 'reviewer' };
      return {
        actor: 'Portfolio Monitor',
        event: `Raised · ${m.dealName} · ${word}${reading ? ` · ${reading}` : ''}${m.reraised ? ' · re-raised after acknowledgement' : ''}`,
        chip: 'monitor',
      };
    case 'upgraded':
      return { actor: 'Portfolio Monitor', event: `Worsened · ${m.dealName} · Watch → Breach${reading ? ` · ${reading}` : ''}`, chip: 'monitor' };
    case 'acknowledged':
      if (m.origin === 'countersign') return { actor: 'Reviewer', event: 'Marked handed off to senior review', chip: 'reviewer' };
      return { actor: 'Reviewer', event: `Acknowledged · ${m.covenant ?? m.dealName}`, chip: 'reviewer' };
    case 'resolved':
      return { actor: 'Portfolio Monitor', event: 'Resolved · passed 2 sweeps in a row', chip: 'monitor' };
  }
}

// ---- the Ledger view -----------------------------------------------------------

const ISO = (t: number) => fmtIso(t);

/** The reviewer note behind a send-back row: the following "Reviewer send-back" flag's text. */
function sendBackNote(runEntries: AuditHistoryEntry[], from: number): string | null {
  for (let i = from + 1; i < runEntries.length; i++) {
    const e = runEntries[i];
    if (e.label.startsWith('Flag · ') && e.detail && e.detail.startsWith('Reviewer send-back')) {
      const m = /^Reviewer send-back \(rev \d+[^)]*\): ([\s\S]*)$/.exec(e.detail);
      return m ? m[1] : e.detail;
    }
    if (e.label === 'Plan extended · reviewer send-back') break;
  }
  return null;
}

function auditRow(e: AuditHistoryEntry, runEntries: AuditHistoryEntry[], index: number, fileName: string): LedgerRow {
  const actor = actorOf(e);
  const shown = relabel(e);
  const detail = e.label === 'Plan extended · reviewer send-back' ? sendBackNote(runEntries, index) ?? shown.detail : shown.detail;
  return {
    id: e.id,
    time: fmtClock(e.t),
    actor,
    event: shown.event,
    detail,
    chip: chipOf(e),
    raw: {
      'Event id': e.id,
      'ISO time': ISO(e.t),
      Actor: actor,
      Kind: e.kind,
      File: fileName,
      Run: String(e.runId),
      'Raw label': e.label,
      Detail: e.detail ?? '',
    },
  };
}

function monitorRow(m: MonitorLogEntry): LedgerRow {
  const r = relabelMonitor(m);
  const detail = m.kind === 'raised' || m.kind === 'upgraded' ? m.reason : null;
  return {
    id: m.id,
    time: fmtClock(m.at),
    actor: r.actor,
    event: r.event,
    detail,
    chip: r.chip,
    raw: {
      'Event id': m.id,
      'ISO time': ISO(m.at),
      Actor: r.actor,
      Kind: m.kind,
      File: m.dealName,
      Run: COPY.noCall,
      'Raw label': m.kind,
      Detail: detail ?? '',
    },
  };
}

/** Counted flags on a sealed package (the "signed over" set), and how many an amendment cleared. */
function signedOverOf(snap: CaseFileSnapshot | undefined): { total: number; live: number } | null {
  if (!snap) return null;
  const all = countedFlagsOf(snap.deal, snap.pkg, snap.amendments ?? []);
  return { total: all.length, live: all.filter((c) => !c.cleared).length };
}

function runHeader(s: V2Store, run: RunRecord, entries: AuditHistoryEntry[]): StatusText & { meta: string } {
  const a = s.agent;
  const current = run.runId === a.runId;
  const endAt = run.decidedAt ?? (entries.length > 0 ? entries[entries.length - 1].t : run.startedAt);
  const timing = runTiming(entries, run.startedAt, run.decision ? endAt : s.now);
  const meta = [plural(entries.length, 'event'), fmtDuration(timing.draftedMs), fmtHM(run.decision ? endAt : s.now)].join(' · ');
  const rev = run.revision > 1 ? ` · rev ${run.revision}` : '';
  const word = run.recommendation ? tokenWord(run.recommendation) : null;
  if (run.decision === 'cancelled') {
    let detail = 'reset before a decision';
    for (const e of entries) if (e.label === 'Run cancelled' && e.detail) detail = e.detail;
    return { state: 'cancelled', text: `Run ${run.runId} · ${VERB_WORD.cancelled} · ${detail}`, meta };
  }
  if (run.decision === 'rejected') {
    return { state: 'rejected', text: `Run ${run.runId} · ${VERB_WORD.rejected}${word ? ` · agent recommended ${word}` : ''}${rev}`, meta };
  }
  if (run.decision) {
    const state: StatusKey = run.decision === 'auto-countersigned' ? 'signed-auto' : 'signed';
    // name what was signed: on amended terms that is the amended outcome, not the agent's call
    const deal = s.snapshotList.find((x) => x.runId === run.runId)?.deal ?? a.dealsFull.find((d) => d.id === run.dealId);
    const verdict =
      run.recommendation && deal ? signedVerdict(deal, run.recommendation, run.amendments ?? null, 'amended terms') : word ? `concurs ${word}` : null;
    return { state, text: `Run ${run.runId} · ${VERB_WORD[run.decision]}${verdict ? ` · ${verdict}` : ''}${rev}`, meta };
  }
  if (current && a.status === 'awaiting_approval') {
    return { state: 'awaiting', text: `Run ${run.runId} · ${STATUS_WORD.awaiting}${rev}`, meta };
  }
  if (current && a.status === 'error') return { state: 'error', text: `Run ${run.runId} · ${STATUS_WORD.error}`, meta };
  return { state: 'drafting', text: `Run ${run.runId} · In progress`, meta };
}

function runDecision(s: V2Store, run: RunRecord, entries: AuditHistoryEntry[]): LedgerRun['decision'] {
  if (!run.decision || run.decision === 'cancelled' || run.decidedAt === null) return null;
  const auto = run.decision === 'auto-countersigned';
  const snap = s.snapshotList.find((x) => x.runId === run.runId);
  const note = run.note ?? null;
  const wait = runTiming(entries, run.startedAt, run.decidedAt).finalWaitMs;
  const presented = snap?.presented ?? (s.gate.justSigned && s.gate.justSigned.runId === run.runId ? s.gate.justSigned.presented : null);
  const over = signedOverOf(snap);
  const facts: string[] = [];
  if (wait !== null) facts.push(`suspended ${fmtElapsed(wait)} before ${run.decision === 'rejected' ? 'rejection' : 'countersignature'}`);
  const total = over ? over.total : presented ? presented.notesOpened.total : 0;
  if (presented && total > 0) facts.push(`notes opened ${presented.notesOpened.opened} of ${total}`);
  if (run.decision === 'rejected') {
    if (total > 0) facts.push(`${plural(total, 'note')} on the record`);
  } else {
    const live = over ? over.live : total;
    facts.push(live > 0 ? `signed over ${plural(live, 'note')}` : 'no notes to sign over');
  }
  return {
    time: fmtClock(run.decidedAt),
    actor: auto ? 'Policy' : 'Reviewer',
    verb: VERB_WORD[run.decision],
    note: note ? `“${note}”` : null,
    provenance: provenanceText(run.noteProvenance ?? null, auto, !!note),
    amendments: (run.amendments ?? []).map((am) => ({ label: am.label, from: am.from, to: am.to })),
    facts: facts.join(' · '),
  };
}

/** Every event of the session, grouped by file and run, with the human decision pinned first. */
export function selectLedger(s: V2Store, fileFilter: string | null): LedgerView {
  const a = s.agent;
  const chip = s.ui.ledgerChip;
  const runs = a.runs.filter((r) => fileFilter === null || r.dealId === fileFilter);
  const byRun = new Map<number, AuditHistoryEntry[]>();
  for (const e of a.auditHistory) {
    const list = byRun.get(e.runId);
    if (list) list.push(e);
    else byRun.set(e.runId, [e]);
  }

  // every row (unfiltered by chip) feeds the counts; the chip filters what shows
  const allRows: LedgerRow[] = [];
  const fileOrder: string[] = [];
  const runsByFile = new Map<string, { run: RunRecord; entries: AuditHistoryEntry[]; rows: LedgerRow[] }[]>();
  for (const run of runs) {
    const entries = byRun.get(run.runId) ?? [];
    const fileName = a.dealsFull.find((d) => d.id === run.dealId)?.name ?? run.dealName;
    const rows = entries.map((e, i) => auditRow(e, entries, i, fileName));
    allRows.push(...rows);
    if (!runsByFile.has(run.dealId)) {
      fileOrder.push(run.dealId);
      runsByFile.set(run.dealId, []);
    }
    runsByFile.get(run.dealId)?.push({ run, entries, rows });
  }
  const monitorAll = s.monitorLog.filter((m) => fileFilter === null || m.dealId === fileFilter).map(monitorRow);
  allRows.push(...monitorAll);

  const count = (c: LedgerChip) => allRows.filter((r) => c === 'all' || r.chip === c).length;
  const chips: LedgerView['chips'] = [
    { id: 'all', label: 'All', count: String(count('all')) },
    { id: 'reviewer', label: 'Reviewer', count: String(count('reviewer')) },
    { id: 'policy', label: 'Policy', count: String(count('policy')) },
    { id: 'flags', label: 'Flags', count: String(count('flags')) },
    { id: 'exhibits', label: 'Exhibits', count: String(count('exhibits')) },
    { id: 'monitor', label: COPY.portfolioMonitor, count: String(count('monitor')) },
  ];
  const keep = (r: LedgerRow) => chip === 'all' || r.chip === chip;

  const files: LedgerView['files'] = [];
  for (const dealId of fileOrder) {
    const group = runsByFile.get(dealId) ?? [];
    const deal = a.dealsFull.find((d) => d.id === dealId);
    const latestId = group.reduce((m, g) => Math.max(m, g.run.runId), 0);
    const shown: LedgerRun[] = [];
    for (const g of [...group].sort((x, y) => y.run.runId - x.run.runId)) {
      const rows = g.rows.filter(keep);
      if (chip !== 'all' && rows.length === 0) continue;
      const key = `run:${g.run.runId}`;
      shown.push({
        key,
        runId: g.run.runId,
        dealId,
        expanded: s.ui.ledgerOpen[key] ?? g.run.runId === latestId,
        header: runHeader(s, g.run, g.entries),
        decision: runDecision(s, g.run, g.entries),
        rows,
        openFile: deal ? { name: 'file', dealId, at: null } : null,
        openFileLabel: COPY.openFile,
      });
    }
    if (shown.length === 0) continue;
    const name = deal?.name ?? group[0]?.run.dealName ?? dealId;
    files.push({ key: dealId, heading: deal ? `${name} · ${deal.memoId}` : name, runs: shown });
  }
  const monitorRows = monitorAll.filter(keep);
  const monitor = monitorRows.length > 0 ? { heading: COPY.portfolioMonitor, rows: monitorRows } : null;

  // summary
  const events = allRows.length;
  const reviewerDecisions =
    runs.filter((r) => r.decision === 'countersigned' || r.decision === 'countersigned-amended' || r.decision === 'rejected').length +
    runs.reduce((n, r) => n + (byRun.get(r.runId) ?? []).filter((e) => e.label === 'Plan extended · reviewer send-back').length, 0);
  const policyDecisions = runs.filter((r) => r.decision === 'auto-countersigned').length;
  const parts = [`Every event this session, by file and run`, plural(events, 'event')];
  if (runs.length > 0) parts.push(plural(runs.length, 'run'));
  if (reviewerDecisions > 0) parts.push(plural(reviewerDecisions, 'reviewer decision'));
  if (policyDecisions > 0) parts.push(plural(policyDecisions, 'policy decision'));

  const filterDeal = fileFilter ? a.dealsFull.find((d) => d.id === fileFilter)?.name ?? a.runs.find((r) => r.dealId === fileFilter)?.dealName ?? fileFilter : null;
  const empty = events === 0 ? COPY.ledgerEmpty : files.length === 0 && monitor === null ? COPY.ledgerFilterEmpty : null;

  return {
    title: COPY.ledgerTitle,
    summary: parts.join(' · '),
    note: COPY.ledgerNote,
    exportLabel: COPY.exportSession,
    chips,
    activeChip: chip,
    fileFilter: filterDeal ? { label: `${filterDeal} only`, clearLabel: COPY.showAllFiles } : null,
    empty,
    files,
    monitor,
  };
}
