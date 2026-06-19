// ---------------------------------------------------------------------------
// AgentsView — the "agentic workforce" roster. It surfaces the agents that
// actually run in this app (no invented ones): the on-demand Credit Analyst
// (useCreditAgent), the always-on Portfolio Monitor (useMonitor), and the
// on-upload Document Intake (synthesize). Each card shows live status derived
// from real state plus what the agent does and recent activity.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import { FileSearch, Activity, Upload } from 'lucide-react';
import type { AuditHistoryEntry, RunStatus } from '../hooks/useCreditAgent';
import type { MonitorApi } from '../hooks/useMonitor';

type Tone = 'idle' | 'live' | 'warn' | 'good' | 'bad';

function timeAgo(t: number, now: number): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  return s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
}

interface RunSummary {
  runId: number;
  dealName: string;
  rec?: string;
  decision?: 'approved' | 'rejected';
  t: number;
}

export function AgentsView({
  creditStatus,
  selectedDealName,
  parsing,
  docsIngested,
  auditHistory,
  monitor,
  onOpenAnalysis,
  onOpenPortfolio,
  onSweepNow,
}: {
  creditStatus: RunStatus;
  selectedDealName: string;
  parsing: boolean;
  docsIngested: number;
  auditHistory: AuditHistoryEntry[];
  monitor: MonitorApi;
  onOpenAnalysis: () => void;
  onOpenPortfolio: () => void;
  onSweepNow: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Reconstruct each analysis run from the session-wide trail.
  const runs = useMemo<RunSummary[]>(() => {
    const byRun = new Map<number, RunSummary>();
    for (const e of auditHistory) {
      let r = byRun.get(e.runId);
      if (!r) {
        r = { runId: e.runId, dealName: e.dealName, t: e.t };
        byRun.set(e.runId, r);
      }
      r.t = Math.max(r.t, e.t);
      if (e.kind === 'human' && e.detail?.startsWith('recommendation:')) r.rec = e.detail.split(':')[1].trim();
      if (e.kind === 'human' && /APPROVED/.test(e.label)) r.decision = 'approved';
      if (e.kind === 'human' && /REJECTED/.test(e.label)) r.decision = 'rejected';
    }
    return [...byRun.values()].sort((a, b) => b.runId - a.runId);
  }, [auditHistory]);

  const openEsc = monitor.escalations.filter((e) => e.status === 'open').length;
  const workingNow = (creditStatus === 'running' ? 1 : 0) + (monitor.sweeping ? 1 : 0) + (parsing ? 1 : 0);

  const analyst: { label: string; tone: Tone } =
    creditStatus === 'running'
      ? { label: `Analyzing ${selectedDealName}…`, tone: 'live' }
      : creditStatus === 'awaiting_approval'
        ? { label: 'Awaiting countersign', tone: 'warn' }
        : creditStatus === 'approved'
          ? { label: 'Decided · approved', tone: 'good' }
          : creditStatus === 'rejected'
            ? { label: 'Decided · rejected', tone: 'bad' }
            : creditStatus === 'error'
              ? { label: 'Error', tone: 'bad' }
              : { label: 'Idle · ready', tone: 'idle' };

  const monitorStatus: { label: string; tone: Tone } = monitor.sweeping
    ? { label: 'Sweeping the book…', tone: 'live' }
    : monitor.lastSweepAt
      ? { label: `Idle · swept ${timeAgo(monitor.lastSweepAt, now)}`, tone: openEsc ? 'warn' : 'good' }
      : { label: 'Starting…', tone: 'idle' };

  const intake: { label: string; tone: Tone } = parsing
    ? { label: 'Extracting…', tone: 'live' }
    : { label: 'Ready', tone: 'idle' };

  const stats = [
    { k: 'Agents', v: 3, tone: 'accent' },
    { k: 'Working now', v: workingNow, tone: workingNow ? 'accent' : '' },
    { k: 'Runs this session', v: runs.length, tone: '' },
    { k: 'Open escalations', v: openEsc, tone: openEsc ? 'warn' : '' },
  ];

  const cards = [
    {
      key: 'analyst',
      icon: FileSearch,
      name: 'Credit Analyst',
      type: 'on-demand · human-gated',
      status: analyst,
      desc: 'Runs the visible loop on a CIM — plan → act → observe → decide — flagging covenant breaches and pausing at a human countersign gate before anything is signed.',
      kpis: [
        { k: 'Runs', v: String(runs.length) },
        { k: 'Last deal', v: runs[0]?.dealName ?? '—' },
      ],
      runs: runs.slice(0, 3),
      action: { label: 'Open Credit Analysis →', onClick: onOpenAnalysis },
    },
    {
      key: 'monitor',
      icon: Activity,
      name: 'Portfolio Monitor',
      type: 'always-on',
      status: monitorStatus,
      desc: 'Sweeps the whole book on a cadence, re-tests every covenant against drifting figures, and escalates anything that breaches or thins out for a human to review.',
      kpis: [
        { k: 'Deals watched', v: String(monitor.portfolio.length) },
        { k: 'Open escalations', v: String(openEsc) },
        { k: 'Sweeps', v: String(monitor.sweepCount) },
      ],
      runs: [] as RunSummary[],
      action: { label: 'Open Portfolio →', onClick: onOpenPortfolio },
      secondary: { label: 'Sweep now', onClick: onSweepNow, disabled: monitor.sweeping },
    },
    {
      key: 'intake',
      icon: Upload,
      name: 'Document Intake',
      type: 'on upload',
      status: intake,
      desc: 'Turns an uploaded CIM into a structured deal — extracting financials, covenants and risk so the analyst can run. Extraction is simulated.',
      kpis: [{ k: 'Docs ingested', v: String(docsIngested) }],
      runs: [] as RunSummary[],
      action: { label: 'Open Credit Analysis →', onClick: onOpenAnalysis },
    },
  ];

  return (
    <section className="agentsview">
      <header className="portfolio__head">
        <div>
          <h2 className="portfolio__title">Agents</h2>
          <p className="portfolio__sub">
            The agentic workforce running this desk — what each agent does, its live status, and recent
            activity. These are the agents that actually run in the app; figures are simulated.
          </p>
        </div>
      </header>

      <div className="pstats">
        {stats.map((s) => (
          <div className={`pstat ${s.tone ? `pstat--${s.tone}` : ''}`} key={s.k}>
            <span className="pstat__k">{s.k}</span>
            <span className="pstat__v">{s.v}</span>
          </div>
        ))}
      </div>

      <div className="agents__grid">
        {cards.map((a) => (
          <article className="acard" key={a.key}>
            <div className="acard__head">
              <span className="acard__icon">
                <a.icon size={20} strokeWidth={1.75} />
              </span>
              <div className="acard__id">
                <h3 className="acard__name">{a.name}</h3>
                <span className="acard__type">{a.type}</span>
              </div>
              <span className={`acard__status acard__status--${a.status.tone}`}>
                <span className="acard__dot" />
                {a.status.label}
              </span>
            </div>

            <p className="acard__desc">{a.desc}</p>

            <div className="acard__kpis">
              {a.kpis.map((k) => (
                <div className="astat" key={k.k}>
                  <span className="astat__k">{k.k}</span>
                  <span className="astat__v">{k.v}</span>
                </div>
              ))}
            </div>

            {a.runs.length > 0 && (
              <div className="acard__runs">
                <span className="acard__runslabel">Recent runs</span>
                {a.runs.map((r) => (
                  <div className="arun" key={r.runId}>
                    <span className="arun__deal">{r.dealName}</span>
                    {r.rec && <span className={`arun__rec arun__rec--${r.rec}`}>{r.rec.toUpperCase()}</span>}
                    <span className="arun__sep">·</span>
                    <span className={`arun__decision${r.decision ? ` arun__decision--${r.decision}` : ''}`}>
                      {r.decision ?? 'in progress'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="acard__actions">
              {'secondary' in a && a.secondary && (
                <button className="btn btn--ghost btn--sm" onClick={a.secondary.onClick} disabled={a.secondary.disabled}>
                  {a.secondary.label}
                </button>
              )}
              <button className="btn btn--sm" onClick={a.action.onClick}>
                {a.action.label}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
