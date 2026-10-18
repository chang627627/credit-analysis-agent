// Countersign V2 · the stress test (spec §7.3): scratch, in a provisional frame, never the record
// until attached. Collapsed it is one 48px line with "Open"; open it shows the four drivers on
// flip-zone sliders, the base → stressed outcome (re-keyed so every recompute enters), a mini
// covenant table with the §4 columns (no amend fields, no anchors: the §4 rows own those), and
// Reset / Attach as exhibit. Renders selectStress verbatim and calls only store actions.
import { useEffect, useId, useState } from 'react';
import { Button, Meter, Redline, Slider, StatusLabel, Table, Token } from '../../kit';
import type { TableColumn, TableRow } from '../../kit';
import { selectStress } from '../../model';
import type { StressView } from '../../model';
import { useV2 } from '../../state/store';
import type { DecisionBlockProps } from '../../state/screens';

// Structural labels the view does not carry (listed for the model's COPY under needs).
const BASE_LABEL = 'Base';
const STRESSED_LABEL = 'Stressed';
const COVENANT_CAPTION = 'Covenants on the stressed figures';
const CUSHION_WORD = 'cushion';

// §4 columns: Covenant 1fr | Threshold 128 | Actual 88 end | Cushion 152 | Status 104
const COVENANT_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Covenant', width: '1fr' },
  { key: 'threshold', label: 'Threshold', width: '128px' },
  { key: 'actual', label: 'Actual', width: '88px', align: 'end' },
  { key: 'cushion', label: 'Cushion', width: '152px' },
  { key: 'status', label: 'Status', width: '104px' },
];

const DELTA_TONE: Record<StressView['drivers'][number]['deltaTone'], string> = {
  good: 'decision-good',
  bad: 'decision-bad',
  'ink-3': 'decision-ink3',
};

// Spec §3: tables stack below a 760px viewport. The kit's stackBelow stacks whenever the table
// itself is under 760px, and memo content is at most 624px, so the screen decides by viewport.
// This is the §4 five-column covenant table, so it follows the case file's own §4 table: it
// also stacks below 1120px, where the 472px of fixed columns leave the covenant name 40 to
// 140px wide (screens/file Covenants and Appendix use the same breakpoint).
const NARROW_QUERY = '(max-width: 1119px)';

function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(() => {
    try {
      return window.matchMedia(NARROW_QUERY).matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia(NARROW_QUERY);
    } catch {
      return;
    }
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return narrow;
}

function covenantRows(v: StressView): TableRow[] {
  return v.covenants.map((c) => ({
    key: c.name,
    height: 36,
    cells: {
      name: c.name,
      threshold: c.amended ? (
        <Redline from={c.amended.from} to={c.amended.to} />
      ) : (
        <span className="t-figure">{c.threshold}</span>
      ),
      actual: c.actual,
      cushion: (
        <span className="decision-cushion">
          <span className="t-figure">{c.cushion.text}</span>
          <Meter kind="cushion" pct={c.cushion.pct} tone={c.cushion.tone} ariaLabel={`${c.name} ${CUSHION_WORD} ${c.cushion.text}`} />
        </span>
      ),
      status: <StatusLabel state={c.status}>{c.statusText}</StatusLabel>,
    },
  }));
}

export function StressTest({ dealId }: DecisionBlockProps) {
  const s = useV2();
  const v = selectStress(s, dealId);
  const a = s.actions;
  const headingId = useId();
  const narrow = useNarrowViewport();

  if (!v) return null;

  if (!v.open) {
    return (
      <div className="decision-stress decision-stress--collapsed">
        <p className="t-small">{v.collapsedLine}</p>
        <Button variant="secondary" size="sm" onClick={() => a.openStress(dealId)}>
          {v.openLabel}
        </Button>
      </div>
    );
  }

  return (
    <section className="decision-stress decision-stress--open" aria-labelledby={headingId}>
      <div className="decision-stress__head">
        <div className="decision-stress__title">
          <h2 id={headingId} className="decision-ink3 t-eyebrow">
            {v.eyebrow}
          </h2>
          <p className="decision-ink2 t-small">{v.baseLabel}</p>
        </div>
        <div className="decision-stress__tools">
          <Button variant="ghost" size="sm" onClick={() => a.resetStress(dealId)} disabled={v.resetDisabled}>
            {v.resetLabel}
          </Button>
          {v.attach ? (
            <>
              {v.attach.disabled && v.attach.reason ? <span className="decision-ink3 t-meta">{v.attach.reason}</span> : null}
              <Button variant="secondary" size="sm" onClick={() => a.attachStress(dealId)} disabled={v.attach.disabled}>
                {v.attach.label}
              </Button>
            </>
          ) : v.readonlyNote ? (
            <span className="decision-ink3 t-meta">{v.readonlyNote}</span>
          ) : null}
        </div>
      </div>

      <div className="decision-stress__drivers">
        {v.drivers.map((d) => (
          <div key={d.key} className="decision-stress__driver">
            <span className="decision-stress__label t-label">{d.label}</span>
            <Slider
              value={d.value}
              min={d.min}
              max={d.max}
              step={d.step}
              onChange={(n) => a.setDriver(dealId, d.key, n)}
              ariaLabel={d.label}
              valueText={d.valueText}
              zones={d.zones}
              boundaries={d.boundaries}
            />
            <span className="decision-stress__value">
              <span className="t-figure">{d.valueText}</span>
              {d.deltaText ? <span className={`${DELTA_TONE[d.deltaTone]} t-small`}>{d.deltaText}</span> : null}
            </span>
          </div>
        ))}
      </div>

      <div key={v.outcome.key} className="decision-stress__outcome">
        <span className="decision-ink2 t-label">{BASE_LABEL}</span>
        <Token tone={v.outcome.base.tone} variant="muted">
          {v.outcome.base.word}
        </Token>
        <span className="decision-ink3 t-label" aria-hidden="true">
          →
        </span>
        <span className="decision-ink2 t-label">{STRESSED_LABEL}</span>
        <Token tone={v.outcome.live.tone}>{v.outcome.live.word}</Token>
        <span className="decision-ink2 t-small">{v.outcome.text}</span>
      </div>

      <Table columns={COVENANT_COLUMNS} rows={covenantRows(v)} caption={COVENANT_CAPTION} stackBelow={narrow ? 760 : undefined} />
    </section>
  );
}
