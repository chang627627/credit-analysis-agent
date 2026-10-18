// ---------------------------------------------------------------------------
// One formatter per unit, so a figure reads the same everywhere it appears.
// (The gate used to print '2.1x' for the same ratio the covenant table printed
// as '2.10x' — in a product about the record, the signed figure must match it.)
// ---------------------------------------------------------------------------

/** Ratios: always 2dp — "4.00x", never "4x" or "4.0x". */
export const fmtX = (n: number) => `${n.toFixed(2)}x`;

/** Money in millions: 1dp — "$14.2M". */
export const fmtM = (n: number) => `$${n.toFixed(1)}M`;

/** Percent: 1dp — "17.6%". */
export const fmtPct = (n: number) => `${n.toFixed(1)}%`;

/** Durations: "840 ms" under a second, "2.3 s" above. */
export const fmtDuration = (ms: number) => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);
