/**
 * Micro trend line for table cells and stat tiles. Follows the stat-tile trend
 * contract: the series draws in the de-emphasis ink, only the CURRENT reading
 * gets the accent (a dot), text stays in text tokens (none in here). Pure SVG,
 * token-driven — themes for free.
 */
export function Sparkline({
  values,
  width = 64,
  height = 18,
  label,
}: {
  /** readings oldest → newest (needs ≥ 2 to draw) */
  values: number[];
  width?: number;
  height?: number;
  /** accessible name + native tooltip, fully formed by the caller */
  label: string;
}) {
  if (values.length < 2) return <span className="spark spark--pending">—</span>;
  const pad = 3; // keeps the 2px stroke + end dot inside the box
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) =>
    // a flat series draws as a midline, not a floor-hugging one
    span === 0 ? height / 2 : height - pad - ((v - min) / span) * (height - pad * 2);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <svg
      className="spark"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <path d={d} fill="none" stroke="var(--text-faint)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={2.5} fill="var(--accent)" />
    </svg>
  );
}
