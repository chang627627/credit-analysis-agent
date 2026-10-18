// ---------------------------------------------------------------------------
// The append-only monitor log (spec §9.2 #12). useMonitor mutates escalation
// items in place (figures refresh, severity upgrades, acknowledged, resolved),
// so the Ledger never renders those live objects. Instead every change is
// diffed into a new entry that copies the reading at that moment. Entries are
// deduped by id inside a functional setState, so StrictMode's double effects
// append nothing twice and no Ledger row ever changes after it is written.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import type { EscalationItem } from '../../agent/monitor';
import type { MonitorLogEntry } from './store';

const SEVERITY_RANK = { warning: 1, critical: 2 } as const;

function entryOf(item: EscalationItem, kind: MonitorLogEntry['kind'], at: number, reraised: boolean): MonitorLogEntry {
  return {
    id: `${item.id}:${kind}:${item.severity}`,
    escalationId: item.id,
    kind,
    reraised,
    at,
    dealId: item.dealId,
    dealName: item.dealName,
    origin: item.origin ?? 'monitor',
    covenant: item.covenant ?? null,
    severity: item.severity,
    reason: item.reason,
    actual: item.actual ?? null,
    threshold: item.threshold ?? null,
  };
}

/** New log entries for the change from `prev` to `next` (both newest-first, as the hook keeps them). */
export function diffEscalations(prev: EscalationItem[], next: EscalationItem[]): MonitorLogEntry[] {
  const before = new Map(prev.map((e) => [e.id, e]));
  const now = Date.now();
  const out: MonitorLogEntry[] = [];
  for (const item of [...next].reverse()) {
    const was = before.get(item.id);
    if (!was) {
      const reraised = next.some((o) => o.id !== item.id && o.key === item.key && o.status === 'acknowledged');
      out.push(entryOf(item, 'raised', item.at, reraised));
      // raised and closed between two renders: keep both facts
      if (item.status === 'acknowledged') out.push(entryOf(item, 'acknowledged', item.acknowledgedAt ?? now, false));
      if (item.status === 'resolved') out.push(entryOf(item, 'resolved', item.resolvedAt ?? now, false));
      continue;
    }
    if (SEVERITY_RANK[item.severity] > SEVERITY_RANK[was.severity]) {
      out.push(entryOf(item, 'upgraded', item.updatedAt ?? now, false));
    }
    if (item.status !== was.status) {
      if (item.status === 'acknowledged') out.push(entryOf(item, 'acknowledged', item.acknowledgedAt ?? now, false));
      else if (item.status === 'resolved') out.push(entryOf(item, 'resolved', item.resolvedAt ?? now, false));
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

export function useMonitorLog(escalations: EscalationItem[]): MonitorLogEntry[] {
  const [log, setLog] = useState<MonitorLogEntry[]>([]);
  const prevRef = useRef<EscalationItem[]>([]);
  useEffect(() => {
    const prev = prevRef.current;
    if (prev === escalations) return;
    prevRef.current = escalations;
    const fresh = diffEscalations(prev, escalations);
    if (fresh.length === 0) return;
    setLog((cur) => {
      const have = new Set(cur.map((e) => e.id));
      const add = fresh.filter((e) => !have.has(e.id));
      return add.length > 0 ? [...cur, ...add] : cur;
    });
  }, [escalations]);
  return log;
}
