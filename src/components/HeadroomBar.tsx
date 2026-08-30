// ---------------------------------------------------------------------------
// HeadroomBar — distance-to-threshold, not just pass/fail. A tiny inline bar
// with the covenant threshold as a hard tick: pass shows how MUCH room is left,
// breach shows how far over. Shared by the memo's covenant table and the
// what-if panel's live table (where it breathes as sliders move).
// ---------------------------------------------------------------------------

const num = (s: string): number | null => {
  const m = s.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
};

export function HeadroomBar({ threshold, actual }: { threshold: string; actual: string }) {
  const t = num(threshold);
  const a = num(actual);
  // uploaded-deal safety: no parseable numbers → render nothing (pill still shows)
  if (t === null || a === null || t <= 0) return null;

  const isMax = threshold.includes('≤') || threshold.includes('<');
  const pass = isMax ? a <= t : a >= t;
  // shared scale so actual and threshold are comparable; headroom stays visible
  const scale = Math.max(t, a) * 1.25;
  const fillPct = Math.min(100, (a / scale) * 100);
  const tickPct = Math.min(100, (t / scale) * 100);

  const unit = actual.includes('$') ? '$' : actual.includes('x') ? 'x' : '';
  const diff = Math.abs(a - t);
  const fmt = unit === '$' ? `$${diff.toFixed(1)}M` : `${diff.toFixed(2)}${unit}`;
  const caption = pass ? `${fmt} room` : isMax ? `${fmt} over` : `${fmt} short`;

  return (
    <span className="hbar" role="img" aria-label={`${actual} vs ${threshold} — ${caption}`}>
      <span className="hbar__track">
        <span className={`hbar__fill hbar__fill--${pass ? 'pass' : 'breach'}`} style={{ width: `${fillPct}%` }} />
        <span className="hbar__tick" style={{ left: `${tickPct}%` }} />
      </span>
      <span className={`hbar__cap${pass ? '' : ' hbar__cap--bad'}`}>{caption}</span>
    </span>
  );
}
