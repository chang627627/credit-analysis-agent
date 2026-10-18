// ---------------------------------------------------------------------------
// useMonitor — reduces the monitoring agent's event stream into portfolio state.
//
// Mirrors useCreditAgent: sweepPortfolio() yields typed events; this hook
// consumes them, maintains the book + escalation queue, and owns the always-on
// sweep cadence (initial sweep on mount, then every ~25s ÷ demo speed).
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Deal } from '../agent/mockData';
import type { EscalationItem, PortfolioDealState } from '../agent/monitor';
import { sweepPortfolio } from '../agent/monitor';
import { uid } from '../agent/util';

const SEVERITY_RANK = { warning: 1, critical: 2 } as const;
/** consecutive passing sweeps before an escalation counts as recovered */
export const RESOLVE_AFTER_PASSES = 2;

export interface MonitorApi {
  portfolio: PortfolioDealState[];
  escalations: EscalationItem[];
  sweeping: boolean;
  lastSweepAt: number | null;
  /** when the cadence chain will fire next (null before the first sweep) */
  nextSweepAt: number | null;
  sweepCount: number;
  sweepNow: () => void;
  /** Acknowledge an open item. It stays quiet until its covenant recovers, unless it worsens. */
  acknowledge: (id: string) => void;
  /** Raise an escalation from outside the sweep (e.g. a countersigned ESCALATE memo). Deduped by key. */
  raise: (item: Omit<EscalationItem, 'id' | 'at' | 'status'>) => void;
}

export function useMonitor(deals: Deal[], speed: number): MonitorApi {
  const [portfolio, setPortfolio] = useState<Map<string, PortfolioDealState>>(new Map());
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [sweeping, setSweeping] = useState(false);
  const [lastSweepAt, setLastSweepAt] = useState<number | null>(null);
  const [nextSweepAt, setNextSweepAt] = useState<number | null>(null);
  const [sweepCount, setSweepCount] = useState(0);

  const dealsRef = useRef(deals);
  dealsRef.current = deals;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const portfolioRef = useRef(portfolio);
  portfolioRef.current = portfolio;

  const runningRef = useRef(false);
  const sweepIdRef = useRef(0);
  /** keys raised from OUTSIDE the sweep (countersign routing) — deduped forever */
  const raisedKeysRef = useRef(new Set<string>());
  /** consecutive passing sweeps per monitor key — 2 in a row resolves the item */
  const passStreakRef = useRef(new Map<string, number>());

  const sweepNow = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setSweeping(true);
    const sweepId = ++sweepIdRef.current;
    try {
      const ctx = {
        get speed() {
          return speedRef.current;
        },
      };
      for await (const ev of sweepPortfolio(dealsRef.current, portfolioRef.current, sweepId, ctx)) {
        if (ev.type === 'deal_reviewed') {
          setPortfolio((prev) => {
            const next = new Map(prev);
            next.set(ev.state.dealId, ev.state);
            return next;
          });
        } else if (ev.type === 'escalation') {
          const item = ev.item;
          passStreakRef.current.set(item.key, 0);
          setEscalations((prev) => {
            // an OPEN item for this covenant: refresh its figures and severity in place
            const openIdx = prev.findIndex((e) => e.key === item.key && e.status === 'open');
            if (openIdx >= 0) {
              const cur = prev[openIdx];
              const next = [...prev];
              next[openIdx] = {
                ...cur,
                severity: item.severity,
                reason: item.reason,
                actual: item.actual,
                threshold: item.threshold,
                updatedAt: item.updatedAt,
              };
              return next;
            }
            // already acknowledged and not yet recovered: stay quiet unless it WORSENED
            const acked = prev.find((e) => e.key === item.key && e.status === 'acknowledged');
            if (acked && SEVERITY_RANK[item.severity] <= SEVERITY_RANK[acked.severity]) return prev;
            return [item, ...prev];
          });
        } else if (ev.type === 'covenants_tested') {
          const resolve: string[] = [];
          for (const r of ev.readings) {
            if (r.status !== 'pass') {
              passStreakRef.current.set(r.key, 0);
              continue;
            }
            const streak = (passStreakRef.current.get(r.key) ?? 0) + 1;
            passStreakRef.current.set(r.key, streak);
            // two passing sweeps in a row = recovered (one isn't enough: a credit
            // drifting around its limit would flap open/resolved every sweep)
            if (streak >= RESOLVE_AFTER_PASSES) resolve.push(r.key);
          }
          if (resolve.length) {
            const at = Date.now();
            setEscalations((prev) =>
              prev.some((e) => resolve.includes(e.key) && e.status !== 'resolved')
                ? prev.map((e) =>
                    resolve.includes(e.key) && e.status !== 'resolved' ? { ...e, status: 'resolved', resolvedAt: at } : e,
                  )
                : prev,
            );
          }
        }
      }
      setSweepCount(sweepId);
      setLastSweepAt(Date.now());
    } finally {
      runningRef.current = false;
      setSweeping(false);
    }
  }, []);

  // always-on cadence: first sweep shortly after mount, then a timeout chain
  // (re-read speed each cycle so the demo slider shortens the wait live)
  useEffect(() => {
    let cancelled = false;
    let timer: number;
    const loop = async () => {
      if (cancelled) return;
      await sweepNow();
      if (cancelled) return;
      const delay = 25000 / speedRef.current;
      setNextSweepAt(Date.now() + delay); // the chip's countdown mirrors the REAL timer
      timer = window.setTimeout(loop, delay);
    };
    timer = window.setTimeout(loop, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sweepNow]);

  const acknowledge = useCallback((id: string) => {
    const at = Date.now();
    setEscalations((prev) =>
      prev.map((e) => (e.id === id && e.status === 'open' ? { ...e, status: 'acknowledged', acknowledgedAt: at } : e)),
    );
  }, []);

  // The queue is the escalation destination for the WHOLE workforce, not just
  // the sweep — a countersigned ESCALATE memo lands here instead of evaporating.
  const raise = useCallback((item: Omit<EscalationItem, 'id' | 'at' | 'status'>) => {
    if (raisedKeysRef.current.has(item.key)) return;
    raisedKeysRef.current.add(item.key);
    setEscalations((prev) => [{ ...item, id: uid('esc'), at: Date.now(), status: 'open' }, ...prev]);
  }, []);

  return {
    portfolio: [...portfolio.values()],
    escalations,
    sweeping,
    lastSweepAt,
    nextSweepAt,
    sweepCount,
    sweepNow,
    acknowledge,
    raise,
  };
}
