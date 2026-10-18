// ---------------------------------------------------------------------------
// Countersign V2 · formatters (spec §9.4, §10 rule 2). The model is the only
// place in src/v2 allowed toFixed / Date / Intl, so every number, clock and
// stamp a screen prints is composed here. The four engine formatters are
// re-exported so a figure reads the same in the CIM match and in the memo.
// ---------------------------------------------------------------------------

export { fmtX, fmtM, fmtPct, fmtDuration } from '../../agent/format';

/** U+2212, the typographic minus used by every signed figure. */
export const MINUS = String.fromCharCode(0x2212);
/** U+2014, used only to SPLIT engine strings; never printed by V2 copy. */
export const EM = String.fromCharCode(0x2014);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

/**
 * '+5.0%' · '−6.5%' · '+0.26x' · '−$5.9M'. The sign is decided AFTER rounding,
 * so a value that rounds to zero prints as '+0.0%', never '−0.0%'.
 * `dp` overrides the unit's precision (the stress test's rate driver uses 2).
 */
export function fmtSigned(n: number, unit: 'pct' | 'x' | 'usd', dp?: number): string {
  const places = dp ?? (unit === 'x' ? 2 : 1);
  const abs = Math.abs(n).toFixed(places);
  const zero = Number(abs) === 0;
  const sign = n < 0 && !zero ? MINUS : '+';
  if (unit === 'usd') return `${sign}$${abs}M`;
  if (unit === 'x') return `${sign}${abs}x`;
  return `${sign}${abs}%`;
}

/** '14:03:12' (24h, local). */
export function fmtClock(t: number): string {
  const d = new Date(t);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** '14:03' (24h, local). */
export function fmtHM(t: number): string {
  const d = new Date(t);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** '17 Oct 2026, 14:03' (local; fixed English month names, no locale drift). */
export function fmtStamp(t: number): string {
  const d = new Date(t);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${fmtHM(t)}`;
}

/** ISO 8601 in UTC (the Ledger's raw key/value grid and the exports). */
export function fmtIso(t: number): string {
  return new Date(t).toISOString();
}

/** '0:07' · '1:12' · '12:04' · '1:02:09' (floored to the second). */
export function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}

/** Under 5 s 'just now' · '6 s ago' · '2 m ago' · '1 h ago'. */
export function fmtAgo(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s} s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} m ago`;
  return `${Math.floor(m / 60)} h ago`;
}

/** '94%' (confidence 0..1, whole percent). */
export function fmtConf(c: number): string {
  return `${Math.round(c * 100)}%`;
}

/** '25 s' (whole seconds). */
export function fmtSeconds(ms: number): string {
  return `${Math.max(0, Math.round(ms / 1000))} s`;
}

/** '4 s': seconds left, rounded up, never below 0. */
export function fmtCountdown(deadline: number, now: number): string {
  return `${Math.max(0, Math.ceil((deadline - now) / 1000))} s`;
}

/** '4.98:1' (WCAG contrast ratio). */
export function fmtRatio(n: number): string {
  return `${n.toFixed(2)}:1`;
}

/** '1×' · '0.5×' (demo pace). */
export function fmtSpeed(n: number): string {
  return `${String(n)}×`;
}

/** The stress test's interest-rate driver: '11.18%' (2dp; its step is 0.25). */
export function fmtRate(n: number): string {
  return `${n.toFixed(2)}%`;
}

/** Parse a 3/6/8-digit hex colour or a functional rgb/rgba colour into 0..255 channels. */
function parseColor(input: string): [number, number, number] | null {
  const s = input.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (hex) {
    const h = hex[1];
    if (h.length === 3) return [0, 1, 2].map((i) => parseInt(h[i] + h[i], 16)) as [number, number, number];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  }
  const fn = /^rgba?\s*\(([^)]*)\)$/.exec(s);
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map((p) => parseFloat(p));
    if (parts.length === 3 && parts.every((p) => Number.isFinite(p))) return [parts[0], parts[1], parts[2]];
  }
  return null;
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.x contrast ratio between two colours (1 when either cannot be parsed). */
export function contrastRatio(a: string, b: string): number {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return 1;
  const la = luminance(ca);
  const lb = luminance(cb);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** 'countersign-session-20261017-1403.json' (local time). */
export function sessionFilename(t: number): string {
  const d = new Date(t);
  return `countersign-session-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}.json`;
}

/** 'CAM-2026-0417-record.json'. */
export function fileFilename(memoId: string): string {
  return `${memoId}-record.json`;
}

/** Engine facility strings carry a spaced em dash before the amount; V2 prints ' · '. */
export function dotJoin(engine: string): string {
  return engine.split(` ${EM} `).join(' · ');
}

/** 'a' · 'a and b' · 'a, b and c'. */
export function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** '1 note' · '2 notes'. */
export function plural(n: number, one: string, many?: string): string {
  return `${n} ${n === 1 ? one : many ?? `${one}s`}`;
}
