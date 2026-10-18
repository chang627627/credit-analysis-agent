// ---------------------------------------------------------------------------
// Countersign V2 · Ledger (spec §7.5). Every event of the session, grouped by
// file and then run, with a closed-set actor column and the decision pinned
// first in each run. The Portfolio Monitor group reads the append-only monitor
// log. This screen renders selectLedger() verbatim: filtering by chip and by
// ?file=, run expansion, counts and every sentence come from the model.
// ---------------------------------------------------------------------------
import { Fragment, useState } from 'react';
import { Activity, FileSearch, ShieldCheck, User } from 'lucide-react';
import { Button, CopyButton, EmptyNote, FilterChips, LinkButton, Redline, Table } from '../../kit';
import type { LucideIcon, TableColumn, TableRow } from '../../kit';
import { COPY, REVIEWER, selectLedger } from '../../model';
import type { Actor, LedgerRow, LedgerRun } from '../../model';
import { useV2 } from '../../state/store';
import type { V2Actions } from '../../state/store';
import type { LedgerScreenProps } from '../../state/screens';

type LedgerDecision = NonNullable<LedgerRun['decision']>;

const ACTOR_ICON: Record<Actor, LucideIcon> = {
  'Credit Analyst': FileSearch,
  Reviewer: User,
  Policy: ShieldCheck,
  'Portfolio Monitor': Activity,
};

// rows 36: time 72 | actor 168 | event 1fr. No visible header (the run group row
// heads each table); actor and event need no stacked label below 760.
const COLUMNS: TableColumn[] = [
  { key: 'time', label: 'Time', width: '72px' },
  { key: 'actor', label: 'Actor', width: '168px', srOnlyLabel: true },
  { key: 'event', label: 'Event', width: '1fr', srOnlyLabel: true },
];

/** 14px actor icon + t-label name. The Reviewer is ink; agents are ink-2. */
function ActorMark({ actor }: { actor: Actor }) {
  const Icon = ACTOR_ICON[actor] ?? FileSearch;
  return (
    <span className={actor === REVIEWER ? 'ledger-actor ledger-actor--reviewer' : 'ledger-actor'}>
      <Icon size={14} aria-hidden="true" />
      <span className="ledger-actor__name t-label">{actor}</span>
    </span>
  );
}

/** Event as shown, then its detail on the same line (truncated; the full value is in the expansion). */
function EventCell({ row }: { row: LedgerRow }) {
  return (
    <span className="ledger-event">
      <span className="ledger-event__text t-body">{row.event}</span>
      {row.detail ? <span className="ledger-event__detail t-small">{row.detail}</span> : null}
    </span>
  );
}

/** The expansion: the raw key/value record (raw engine label included) + Copy JSON. */
function RawRecord({ row }: { row: LedgerRow }) {
  return (
    <div className="ledger-raw">
      <dl className="ledger-raw__grid">
        {Object.entries(row.raw).map(([k, val]) => (
          <Fragment key={k}>
            <dt className="ledger-raw__key t-label">{k}</dt>
            <dd className="ledger-raw__val t-small">{val === '' ? '–' : val}</dd>
          </Fragment>
        ))}
      </dl>
      <span className="ledger-raw__copy">
        <CopyButton text={JSON.stringify(row.raw, null, 2)} label={COPY.copyJson} />
      </span>
    </div>
  );
}

/** The pinned decision: time · actor · verb, the note with provenance, amendments as redlines, facts. */
function Decision({ d }: { d: LedgerDecision }) {
  return (
    <div className="ledger-decision">
      <p className="ledger-decision__head t-strong">
        <span className="ledger-dim">{`${d.time} · ${d.actor} · `}</span>
        {d.verb}
      </p>
      {d.note || d.provenance ? (
        <p className="ledger-decision__note">
          {d.note ? <span className="t-body">{d.note}</span> : null}
          {d.note && d.provenance ? <span className="ledger-dim t-small">{' · '}</span> : null}
          {d.provenance ? <span className="ledger-dim t-small">{d.provenance}</span> : null}
        </p>
      ) : null}
      {d.amendments.map((m) => (
        <p key={m.label} className="ledger-decision__amend">
          <span className="ledger-dim t-body">{m.label}</span>
          <Redline from={m.from} to={m.to} />
        </p>
      ))}
      {d.facts ? <p className="ledger-dim t-small">{d.facts}</p> : null}
    </div>
  );
}

function eventRow(row: LedgerRow, open: boolean, toggle: (id: string) => void): TableRow {
  return {
    key: row.id,
    height: 36,
    cells: {
      time: <span className="ledger-time t-meta">{row.time}</span>,
      actor: <ActorMark actor={row.actor} />,
      event: <EventCell row={row} />,
    },
    onActivate: () => toggle(row.id),
    ariaLabel: `${row.time} · ${row.actor} · ${row.event}`,
    highlighted: open,
    detail: open ? <RawRecord row={row} /> : undefined,
  };
}

function runRows(
  run: LedgerRun,
  fileHeading: string,
  a: V2Actions,
  open: Record<string, boolean>,
  toggle: (id: string) => void,
): TableRow[] {
  const to = run.openFile;
  const out: TableRow[] = [
    {
      key: run.key,
      group: {
        label: run.header.text,
        status: run.header.state,
        meta: run.header.meta,
        height: 40,
        expanded: run.expanded,
        onToggle: () => a.toggleLedgerGroup(run.key),
        trailing: to ? (
          <Button variant="ghost" size="sm" onClick={() => a.navigate(to)} ariaLabel={`${run.openFileLabel} · ${fileHeading}`}>
            {run.openFileLabel}
          </Button>
        ) : undefined,
      },
    },
  ];
  if (!run.expanded) return out;
  if (run.decision) out.push({ key: `${run.key}:decision`, span: <Decision d={run.decision} /> });
  for (const r of run.rows) out.push(eventRow(r, open[r.id] === true, toggle));
  return out;
}

export function LedgerScreen({ fileFilter }: LedgerScreenProps) {
  const s = useV2();
  const a = s.actions;
  const v = selectLedger(s, fileFilter);
  // which event rows show their raw record (presentational disclosure only)
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: o[id] !== true }));
  const selectChip = (id: string) => {
    const chip = v.chips.find((c) => c.id === id);
    if (chip) a.setLedgerChip(chip.id);
  };

  return (
    <div className="ledger">
      <div className="ledger-col">
        <header className="ledger-head">
          <div className="ledger-head__top">
            <h1 className="ledger-title t-display">{v.title}</h1>
            <Button variant="primary" onClick={() => a.exportSession()}>
              {v.exportLabel}
            </Button>
          </div>
          <p className="ledger-summary t-small">{v.summary}</p>
          <p className="ledger-note t-meta">{v.note}</p>
        </header>

        {v.fileFilter ? (
          <p className="ledger-filter t-small">
            <span>{v.fileFilter.label}</span>
            <LinkButton role="small" onClick={() => a.navigate({ name: 'ledger', file: null })}>
              {v.fileFilter.clearLabel}
            </LinkButton>
          </p>
        ) : null}

        <FilterChips items={v.chips} active={v.activeChip} onSelect={selectChip} ariaLabel="Filter by actor and kind" />

        {v.empty ? <EmptyNote>{v.empty}</EmptyNote> : null}

        {v.files.length > 0 ? (
          <div className="ledger-files">
            {v.files.map((f) => (
              <section key={f.key} className="ledger-group">
                <h2 className="ledger-group__heading t-heading">{f.heading}</h2>
                <Table
                  columns={COLUMNS}
                  rows={f.runs.flatMap((run) => runRows(run, f.heading, a, open, toggle))}
                  caption={f.heading}
                  header={false}
                  stackBelow={760}
                />
              </section>
            ))}
          </div>
        ) : null}

        {v.monitor ? (
          <section className="ledger-group">
            <h2 className="ledger-group__heading t-heading">{v.monitor.heading}</h2>
            <Table
              columns={COLUMNS}
              rows={v.monitor.rows.map((r) => eventRow(r, open[r.id] === true, toggle))}
              caption={v.monitor.heading}
              header={false}
              stackBelow={760}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
