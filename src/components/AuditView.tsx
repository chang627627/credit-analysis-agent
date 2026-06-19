import { useState } from 'react';
import { Info, Wrench, CornerDownLeft, AlertTriangle, CheckCircle2, Activity, type LucideIcon } from 'lucide-react';
import type { AuditHistoryEntry, AuditKind } from '../hooks/useCreditAgent';
import type { EscalationItem } from '../agent/monitor';

// The traceability surface: every event from every analysis run, merged with the
// monitoring agent's escalations, in one chronological, filterable, exportable log.

type RowKind = AuditKind | 'monitor';

interface Row {
  id: string;
  t: number;
  kind: RowKind;
  label: string;
  detail?: string;
  source: string;
}

const ICON: Record<RowKind, LucideIcon> = {
  info: Info,
  tool: Wrench,
  result: CornerDownLeft,
  flag: AlertTriangle,
  human: CheckCircle2,
  monitor: Activity,
};

const FILTERS: { id: 'all' | RowKind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'tool', label: 'Tool calls' },
  { id: 'result', label: 'Results' },
  { id: 'flag', label: 'Flags' },
  { id: 'human', label: 'Human' },
  { id: 'monitor', label: 'Monitor' },
];

function fmt(t: number): string {
  const d = new Date(t);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function AuditView({
  entries,
  escalations,
  onExport,
}: {
  entries: AuditHistoryEntry[];
  escalations: EscalationItem[];
  onExport: () => void;
}) {
  const [filter, setFilter] = useState<'all' | RowKind>('all');

  // newest first; uid()'s shared counter ('audit_N' / 'esc_N') breaks same-ms ties
  const seq = (id: string) => Number(id.slice(id.lastIndexOf('_') + 1)) || 0;
  const rows: Row[] = [
    ...entries.map((e) => ({
      id: e.id,
      t: e.t,
      kind: e.kind as RowKind,
      label: e.label,
      detail: e.detail,
      source: `${e.dealName} · run #${e.runId}`,
    })),
    ...escalations.map((e) => ({
      id: e.id,
      t: e.at,
      kind: 'monitor' as RowKind,
      label: `Escalation · ${e.severity}${e.status === 'acknowledged' ? ' · acknowledged' : ''}`,
      detail: e.reason,
      source: `${e.dealName} · monitor`,
    })),
  ].sort((a, b) => b.t - a.t || seq(b.id) - seq(a.id));

  const visible = rows.filter((r) => (filter === 'all' ? true : r.kind === filter));

  return (
    <section className="auditview">
      <header className="portfolio__head">
        <div>
          <h2 className="portfolio__title">Audit log</h2>
          <p className="portfolio__sub">
            Every action this session — analysis runs and monitoring escalations — timestamped and
            exportable. Traceability is the product.
          </p>
        </div>
        <div className="portfolio__controls">
          <button className="btn" onClick={onExport} disabled={rows.length === 0}>
            ↓ Export JSON
          </button>
        </div>
      </header>

      <div className="auditview__filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip fchip ${filter === f.id ? 'fchip--active' : ''}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <em className="auditview__count">
              {f.id === 'all' ? rows.length : rows.filter((r) => r.kind === f.id).length}
            </em>
          </button>
        ))}
      </div>

      <div className="auditview__list">
        {visible.length === 0 && (
          <p className="queue__empty">
            {rows.length === 0
              ? 'Nothing here yet — run an analysis or let the monitoring agent sweep, and every event lands in this log.'
              : `No ${FILTERS.find((f) => f.id === filter)?.label.toLowerCase()} events yet — try another filter.`}
          </p>
        )}
        {visible.map((r) => {
          const RowIcon = ICON[r.kind];
          return (
          <div key={r.id} className={`arow arow--${r.kind}`}>
            <span className="arow__time">{fmt(r.t)}</span>
            <span className="arow__icon">
              <RowIcon size={13} strokeWidth={1.75} />
            </span>
            <div className="arow__body">
              <span className="arow__label">{r.label}</span>
              {r.detail && <span className="arow__detail">{r.detail}</span>}
            </div>
            <span className="arow__source" title={r.source}>
              {r.source}
            </span>
          </div>
          );
        })}
      </div>
    </section>
  );
}
