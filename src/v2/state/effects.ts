// ---------------------------------------------------------------------------
// Orchestration effects (spec §9.2 #5-#8, #11, #13): route hygiene, upload
// auto-open, the ambient tab title, the decision follow-through (snapshot
// seal + countersigned-ESCALATE routing, once per run), dev probes and
// live-region announcements.
//
// Every effect is idempotent under StrictMode: comparisons run against refs,
// per-run work is keyed by runId, timers are cleaned up, and nothing that
// records a human act (justSigned) is ever set here.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { announceFor, COPY, selectFile, selectTabTitle } from '../model';
import { toHash } from './route';
import type { V2Internals, V2Store } from './store';
import { buildSnapshot, isLiveStatus, routeEscalation, shouldRoute } from './files';
import { clearReading, fileKeyOf, placeKeyOf, routeHygiene } from './ui';

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/** Dev-only probes: one primary, one loop, key figures equal their rows. */
function runProbes(s: V2Store): void {
  const primaries = Array.from(document.querySelectorAll('.k-btn--primary')).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.getClientRects().length === 0) return false;
    return getComputedStyle(el).visibility !== 'hidden';
  });
  if (primaries.length > 1) {
    console.error(`[v2 probe] ${primaries.length} visible primary buttons; at most one is allowed`, primaries);
  }
  if (typeof document.getAnimations === 'function') {
    const loops = document.getAnimations().filter((a) => a.effect?.getTiming().iterations === Infinity);
    if (loops.length > 1) console.error(`[v2 probe] ${loops.length} looping animations; only the drafting caret may loop`, loops);
  }
  const r = s.route;
  if (r.name !== 'file') return;
  const view = safe(() => selectFile(s, r.dealId), null);
  if (!view) return;
  const rec = view.sections.find((sec) => sec.kind === 'recommendation');
  const fin = view.sections.find((sec) => sec.kind === 'financials');
  if (!rec || rec.kind !== 'recommendation' || !rec.body || !fin || fin.kind !== 'financials' || !fin.body) return;
  for (const kf of rec.body.keyFigures) {
    const row = fin.body.find((f) => f.anchorId === kf.anchorId);
    if (!row) continue;
    const shown = kf.value.split(' · ')[0];
    if (shown !== row.value) {
      console.error(`[v2 probe] key figure "${kf.label}" reads ${shown} but its row ${row.anchorId} reads ${row.value}`);
    }
  }
}

export function useV2Effects(s: V2Store, x: V2Internals): void {
  const { agent } = s;
  const status = agent.status;

  // ---- hygiene (§9.2 #7): a new run or a different file clears the reading session
  const prevRunId = useRef(agent.runId);
  useEffect(() => {
    if (prevRunId.current === agent.runId) return;
    prevRunId.current = agent.runId;
    clearReading(x);
  }, [agent.runId, x]);

  // a confirm strip only ever offers to discard or replace a LIVE run: once the
  // run is decided, cancelled or stopped by an error, the strip would promise a
  // cancellation that can no longer happen, so it closes (none can reopen there:
  // startFile and requestStop both require a live run)
  const live = isLiveStatus(status);
  useEffect(() => {
    if (live) return;
    x.setUi((u) => (u.confirm === null ? u : { ...u, confirm: null }));
  }, [live, x]);

  // route changes that bypass navigate() (back / forward / a typed hash)
  const fileKey = fileKeyOf(s.route, x.hygiene.current.file);
  const placeKey = placeKeyOf(s.route);
  useEffect(() => {
    routeHygiene(x, x.routeRef.current);
  }, [fileKey, placeKey, x]);

  // ---- upload auto-open (§9.2 #8): only if the user is still on the Desk, and not while the
  // remove Dialog is open (R4.14): the Dialog owns the screen until Cancel, Esc, the scrim or
  // Remove, so a background extraction never dismisses it (navigating would close it through
  // routeHygiene and drop focus on a different screen). The new file's row is on the Desk, and the
  // live region says it is ready.
  const parsing = agent.parsing;
  const prevParsing = useRef(parsing);
  useEffect(() => {
    const was = prevParsing.current;
    prevParsing.current = parsing;
    if (was === null || parsing !== null) return;
    const c = x.current();
    let announce: string | null = null;
    if (c.ui.pendingUploadOpen) {
      const uploads = c.agent.dealsFull.filter((d) => d.uploaded);
      const newest = uploads[uploads.length - 1];
      if (newest && c.route.name === 'desk') {
        if (c.ui.removeConfirm === null) x.navigate({ name: 'file', dealId: newest.id, at: null });
        else announce = COPY.uploadReadyAnnounce(newest.name);
      }
    }
    x.setUi((u) =>
      u.pendingUploadOpen || u.parsingSince !== null || announce !== null
        ? { ...u, pendingUploadOpen: false, parsingSince: null, announce: announce ?? u.announce }
        : u,
    );
  }, [parsing, x]);

  // ---- ambient tab title
  const title = safe(() => selectTabTitle(s), 'Countersign');
  useEffect(() => {
    document.title = title;
  }, [title]);

  // ---- decision follow-through (§9.2 #5, #6): seal + route, once per run
  const decided = status === 'approved' || status === 'rejected';
  useEffect(() => {
    if (!decided) return;
    const runId = agent.runId;
    if (x.decidedRuns.current.has(runId)) return;
    x.decidedRuns.current.add(runId);
    const c = x.current();
    const snap = buildSnapshot(c);
    if (snap) x.captureSnapshot(snap);
    const pkg = c.agent.approvalPackage;
    const run = c.agent.runs.find((r) => r.runId === runId);
    const deal = run ? c.agent.dealsFull.find((d) => d.id === run.dealId) : undefined;
    if (c.agent.status === 'approved' && pkg && deal && shouldRoute(pkg, deal, c.agent.decisionAmendments, c.agent.decisionAuto)) {
      routeEscalation(c.monitor, deal, pkg, runId);
    }
    x.announce(c.agent.status === 'rejected' ? 'rejected' : c.agent.decisionAuto ? 'auto' : 'signed');
  }, [decided, agent.runId, x]);

  // ---- dev probes (§9.2 #11): on route / status change, after the DOM settles
  const probeKey = `${toHash(s.route)}|${status}`;
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const id = window.setTimeout(() => runProbes(x.current()), 0);
    return () => window.clearTimeout(id);
  }, [probeKey, x]);

  // ---- announcements: drained after every commit, worded from the store as it now is
  useEffect(() => {
    const queue = x.announceQueue.current;
    if (queue.length === 0) return;
    x.announceQueue.current = [];
    const kind = queue[queue.length - 1];
    const message = safe(() => announceFor(kind, x.current()), null);
    if (message) x.setUi((u) => (u.announce === message ? u : { ...u, announce: message }));
  });
}
