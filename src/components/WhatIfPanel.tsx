// ---------------------------------------------------------------------------
// WhatIfPanel — interactive sensitivity analysis. The analyst perturbs the key
// credit drivers (EBITDA, debt, rate, liquidity) and the covenants, risk score
// and recommendation recompute live through the *same* decision rule the agent
// uses (see src/agent/whatif.ts). The "flip" — watching ESCALATE become APPROVE
// as you nudge EBITDA — is the point: it makes the decide step tangible.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react';
import { Check, Paperclip, RotateCcw } from 'lucide-react';
import type { Deal } from '../agent/mockData';
import type { Recommendation } from '../agent/types';
import { baselineScenario, driversFor, evaluate, flipZonesFor } from '../agent/whatif';
import type { Driver, FlipZone, Scenario } from '../agent/whatif';
import { HeadroomBar } from './HeadroomBar';

const REC_LABEL: Record<Recommendation, string> = {
  approve: 'APPROVE',
  decline: 'DECLINE',
  escalate: 'ESCALATE',
};

const fmtValue = (d: Driver, v: number): string =>
  d.unit === 'pct' ? `${v.toFixed(2)}%` : `$${v.toFixed(1)}M`;

const fmtDelta = (d: Driver, v: number): string => {
  const delta = v - d.base;
  const sign = delta > 0 ? '+' : '';
  return d.unit === 'pct' ? `${sign}${delta.toFixed(2)} pts` : `${sign}${delta.toFixed(1)}M`;
};

export function WhatIfPanel({
  deal,
  onAttach,
}: {
  deal: Deal;
  /** Put the current scenario on the record — it becomes an audit-trail entry. */
  onAttach?: (label: string, detail: string) => void;
}) {
  const drivers = useMemo(() => driversFor(deal), [deal]);
  const base = useMemo(() => baselineScenario(deal), [deal]);
  const [scenario, setScenario] = useState<Scenario>(base);

  const baseOutcome = useMemo(() => evaluate(deal, base), [deal, base]);
  const live = useMemo(() => evaluate(deal, scenario), [deal, scenario]);

  const dirty = (Object.keys(scenario) as (keyof Scenario)[]).some((k) => scenario[k] !== base[k]);
  const flipped = live.recommendation !== baseOutcome.recommendation;

  // The decision boundary, painted on each track: sweep every driver (holding
  // the others at the current scenario) and shade the track by the resulting
  // recommendation. Zones honestly recompute when the OTHER drivers move.
  const zonesByKey = useMemo(() => {
    const map = {} as Record<Driver['key'], FlipZone[]>;
    for (const d of drivers) map[d.key] = flipZonesFor(deal, scenario, d);
    return map;
  }, [deal, drivers, scenario]);

  // Attach-to-record: sensitivity analysis belongs in the memo file, not just
  // on screen. Disabled at base (nothing stressed) and after attaching the
  // exact same scenario (no duplicate rows).
  const scenarioKey = JSON.stringify(scenario);
  const [attachedKey, setAttachedKey] = useState<string | null>(null);
  const attach = () => {
    if (!onAttach) return;
    const changes = drivers
      .filter((d) => scenario[d.key] !== base[d.key])
      .map((d) => `${d.label} ${fmtValue(d, base[d.key])}→${fmtValue(d, scenario[d.key])}`)
      .join(', ');
    const label = `What-if scenario attached · ${REC_LABEL[baseOutcome.recommendation]} → ${REC_LABEL[live.recommendation]}${flipped ? ' (flips)' : ' (holds)'}`;
    const detail = `${changes} ⇒ risk ${baseOutcome.risk.score}→${live.risk.score}, breaches ${baseOutcome.breaches}→${live.breaches}`;
    onAttach(label, detail);
    setAttachedKey(scenarioKey);
  };

  // `bump` increments on every change so we can re-key the outcome row → it visibly
  // flashes "recomputed" on EVERY drag, even a sub-threshold one that doesn't flip the verdict.
  const [bump, setBump] = useState(0);
  const set = (k: keyof Scenario, v: number) => {
    setScenario((s) => ({ ...s, [k]: v }));
    setBump((n) => n + 1);
  };
  const reset = () => {
    setScenario(base);
    setBump((n) => n + 1);
  };

  return (
    <section className="whatif" aria-label="What-if stress test">
      <div className="whatif__head">
        <div>
          <span className="whatif__badge">stress test · what-if</span>
          <h3 className="whatif__title">What would change this decision?</h3>
        </div>
        <button className="whatif__reset" onClick={reset} disabled={!dirty}>
          <RotateCcw size={11} strokeWidth={1.75} aria-hidden="true" /> Reset to base case
        </button>
      </div>
      <p className="whatif__sub">
        The decision above is the agent's <em>fixed</em> call on the real figures — it doesn't change.
        Drag a driver to pressure-test it: how much headroom is there, and what would flip the verdict?
        Covenants, risk and the recommendation recompute through the same rule the agent uses.{' '}
        <span className="whatif__sim">Simulated sensitivity model.</span>
      </p>

      {/* Inputs first — the sliders sit ABOVE the live outcome so cause (drag) and effect
          (recommendation) share an eye-line. */}
      <div className="whatif__seclabel">
        Inputs · drag to stress
        <em className="whatif__zonekey">track shading = the decision at that value</em>
      </div>
      <div className="whatif__grid">
        {drivers.map((d) => {
          const v = scenario[d.key];
          const delta = v - d.base;
          const good = d.higherBetter ? delta > 0 : delta < 0;
          const deltaTone = delta === 0 ? '' : good ? ' driver-ctl__delta--good' : ' driver-ctl__delta--bad';
          const span = d.max - d.min;
          const zones = zonesByKey[d.key] ?? [];
          const zoneText = zones
            .map((z) => `${REC_LABEL[z.rec]} from ${fmtValue(d, z.from)} to ${fmtValue(d, z.to)}`)
            .join('; ');
          return (
            <label className="driver-ctl" key={d.key}>
              <span className="driver-ctl__top">
                <span className="driver-ctl__label">{d.label}</span>
                <span className="driver-ctl__valwrap">
                  <span className="driver-ctl__val">{fmtValue(d, v)}</span>
                  {delta !== 0 && <span className={`driver-ctl__delta${deltaTone}`}>{fmtDelta(d, v)}</span>}
                </span>
              </span>
              <input
                type="range"
                min={d.min}
                max={d.max}
                step={d.step}
                value={v}
                onChange={(e) => set(d.key, parseFloat(e.target.value))}
                aria-label={`${d.label}: ${fmtValue(d, v)}`}
                style={{ '--fill': `${((v - d.min) / span) * 100}%` } as React.CSSProperties}
              />
              {/* flip zones: the decision boundary painted under the thumb.
                  Each zone paints THROUGH to the next zone's start so the
                  track is gapless — no unpainted band at the boundary. */}
              <span className="driver-ctl__zones" aria-hidden="true">
                {zones.map((z, zi) => {
                  const end = zones[zi + 1]?.from ?? d.max;
                  return (
                    <span
                      key={z.from}
                      className={`driver-ctl__zone driver-ctl__zone--${z.rec}`}
                      style={{
                        left: `${((z.from - d.min) / span) * 100}%`,
                        width: `${((end - z.from) / span) * 100}%`,
                      }}
                    >
                      {zi > 0 && <span className="driver-ctl__flip" />}
                    </span>
                  );
                })}
              </span>
              <span className="sr-only">{`Decision zones for ${d.label}: ${zoneText}`}</span>
              <span className="driver-ctl__foot">
                <span>{fmtValue(d, d.min)}</span>
                <span>{fmtValue(d, d.max)}</span>
              </span>
            </label>
          );
        })}
      </div>

      {/* Live outcome — sits directly under the sliders, re-keyed by `bump` so it flashes on
          every drag. Framed as base → stressed (never a second "Recommend" pill rivalling the
          gate): the ghost pill is the agent's base call, the solid pill is your scenario. */}
      <div className="whatif__outcome">
        <span className="whatif__eyebrow">What-if outcome · driven by the sliders</span>
        <div key={bump} className="whatif__outrow whatif__outrow--flash" role="status" aria-live="polite">
          <span className={`rec rec--${baseOutcome.recommendation} rec--ghost`}>
            {REC_LABEL[baseOutcome.recommendation]}
          </span>
          <span className="whatif__arrow" aria-hidden="true">→</span>
          <span className={`rec rec--${live.recommendation}`}>{REC_LABEL[live.recommendation]}</span>
          <span className={`whatif__verdicttag${flipped ? ' whatif__verdicttag--flip' : ''}`}>
            {!dirty ? 'matches base' : flipped ? 'flips the recommendation' : 'recomputed · holds'}
          </span>
        </div>
        {onAttach && (
          <button
            className="whatif__attach"
            onClick={attach}
            disabled={!dirty || attachedKey === scenarioKey}
            title="Record this scenario in the audit trail — stressed drivers, resulting risk and recommendation"
          >
            {attachedKey === scenarioKey ? (
              <>
                <Check size={11} strokeWidth={2} aria-hidden="true" /> Scenario on the record
              </>
            ) : (
              <>
                <Paperclip size={11} strokeWidth={1.75} aria-hidden="true" /> Attach scenario to audit trail
              </>
            )}
          </button>
        )}
        <div className="whatif__risk">
          <div className="whatif__risktrack" aria-hidden="true">
            <div
              className={`whatif__riskfill whatif__riskfill--${live.risk.tone}`}
              style={{ width: `${live.risk.score}%` }}
            />
          </div>
          <span className="whatif__risklabel">
            Risk{' '}
            {dirty && live.risk.score !== baseOutcome.risk.score ? (
              <>
                <s>{baseOutcome.risk.score}</s> → <strong>{live.risk.score}</strong>
              </>
            ) : (
              live.risk.score
            )}{' '}
            · {live.risk.rating}
          </span>
        </div>
      </div>

      {/* Recomputed covenant tests — the part that actually gates the decision. */}
      <div className="whatif__seclabel">Covenant tests · live</div>
      <table className="ctable">
        <thead>
          <tr>
            <th>Covenant</th>
            <th>Threshold</th>
            <th>Actual</th>
            <th aria-label="status" />
          </tr>
        </thead>
        <tbody>
          {live.covenants.map((c) => (
            <tr key={c.name} className={c.status === 'breach' ? 'ctable__row--breach' : ''}>
              <td>{c.name}</td>
              <td className="ctable__mono">{c.threshold}</td>
              <td className="ctable__mono ctable__actual">
                {c.actual}
                <HeadroomBar threshold={c.threshold} actual={c.actual} />
              </td>
              <td>
                <span className={`cstatus cstatus--${c.status}`}>
                  {c.status === 'breach' ? 'BREACH' : 'PASS'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
