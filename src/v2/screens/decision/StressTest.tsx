// Countersign V2 · the stress test (spec §7.3; THREE-PANE.md §5.2, §5.8): scratch, in a provisional
// frame, never the record until attached. FileScreen's stress slot, inside .file-scratch (no memo
// card: the provisional frame keeps its scratch semantics). Collapsed it is one 48px line with "Open";
// open it shows the four drivers on flip-zone sliders, the base → stressed outcome (re-keyed so
// every recompute enters), a mini covenant table with the Covenant compliance columns (no amend
// fields, no anchors: the memo's rows own those), and Reset / Attach as exhibit. The frame is its
// own container, so the drivers and the table stack by the frame's real width (the table below
// 640px, like the memo's covenant table), whatever the viewport or the agent panel beside it.
// Renders selectStress verbatim and calls only store actions.
import { useId } from 'react';
import { ChevronUp } from 'lucide-react';
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

// Covenant compliance columns, as the memo's own table (THREE-PANE §5.4, §9.6 item 5): Covenant 1fr |
// Threshold 128 | Actual 88 | Cushion 152 | Status 104, with Threshold, Actual and Cushion right-aligned
const COVENANT_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Covenant', width: '1fr' },
  { key: 'threshold', label: 'Threshold', width: '128px', align: 'end' },
  { key: 'actual', label: 'Actual', width: '88px', align: 'end' },
  { key: 'cushion', label: 'Cushion', width: '152px', align: 'end' },
  { key: 'status', label: 'Status', width: '104px' },
];

const DELTA_TONE: Record<StressView['drivers'][number]['deltaTone'], string> = {
  good: 'decision-good',
  bad: 'decision-bad',
  'ink-3': 'decision-ink3',
};

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
      // the model picks the tone: a breached actual reads in bad-ink (THREE-PANE §5.6)
      actual: c.actualTone === 'bad' ? <span className="decision-bad">{c.actual}</span> : c.actual,
      cushion: (
        <span className="decision-cushion">
          <span className="decision-cushion__text t-figure">{c.cushion.text}</span>
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

  if (!v) return null;

  if (!v.open) {
    return (
      <div className="decision-stress">
        <div className="decision-stress__collapsed">
          <p className="t-small">{v.collapsedLine}</p>
          <Button variant="secondary" size="sm" onClick={() => a.openStress(dealId)}>
            {v.openLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="decision-stress" aria-labelledby={headingId}>
      <div className="decision-stress__open">
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
            <Button variant="ghost" size="sm" icon={ChevronUp} onClick={() => a.closeStress(dealId)}>
              {v.closeLabel}
            </Button>
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

        <Table columns={COVENANT_COLUMNS} rows={covenantRows(v)} caption={COVENANT_CAPTION} stackBelow={640} />
      </div>
    </section>
  );
}
