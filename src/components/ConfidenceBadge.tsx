import { LOW_CONFIDENCE_FLOOR, confidenceBucket } from '../agent/util';

/** Color-coded model-confidence chip. Low confidence is a first-class signal here. */
export function ConfidenceBadge({ value }: { value: number }) {
  const bucket = confidenceBucket(value);
  const pct = (value * 100).toFixed(0);
  const floor = Math.round(LOW_CONFIDENCE_FLOOR * 100);
  // The tooltip states the REAL rule the loop applies (see lowConfidenceFlag in
  // runAgent.ts) — not an aspiration: below the floor, the agent raises a
  // needs-human flag on the run.
  const title =
    `Simulated extraction certainty: ${pct}% (${bucket}). ` +
    `≥90% high · ${floor}–90% medium · <${floor}% low — below ${floor}% the agent flags the figures for human verification.`;
  return (
    <span className={`conf conf--${bucket}`} title={title} aria-label={title}>
      {pct}%
    </span>
  );
}
