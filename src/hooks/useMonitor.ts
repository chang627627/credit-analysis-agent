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

export interface MonitorApi {
  portfolio: PortfolioDealState[];
  escalations: EscalationItem[];
  sweeping: boolean;
  lastSweepAt: number | null;
  sweepCount: number;
  sweepNow: () => void;
  acknowledge: (id: string) => void;
}

export function useMonitor(deals: Deal[], speed: number): MonitorApi {
  const [portfolio, setPortfolio] = useState<Map<string, PortfolioDealState>>(new Map());
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [sweeping, setSweeping] = useState(false);
  const [lastSweepAt, setLastSweepAt] = useState<number | null>(null);
  const [sweepCount, setSweepCount] = useState(0);

  const dealsRef = useRef(deals);
  dealsRef.current = deals;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const portfolioRef = useRef(portfolio);
  portfolioRef.current = portfolio;

  const runningRef = useRef(false);
  const sweepIdRef = useRef(0);
  const seenKeysRef = useRef(new Set<string>());

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
          if (!seenKeysRef.current.has(ev.item.key)) {
            seenKeysRef.current.add(ev.item.key);
            setEscalations((prev) => [ev.item, ...prev]);
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
      timer = window.setTimeout(loop, 25000 / speedRef.current);
    };
    timer = window.setTimeout(loop, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sweepNow]);

  const acknowledge = useCallback((id: string) => {
    setEscalations((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'acknowledged' } : e)));
  }, []);

  return {
    portfolio: [...portfolio.values()],
    escalations,
    sweeping,
    lastSweepAt,
    sweepCount,
    sweepNow,
    acknowledge,
  };
}
