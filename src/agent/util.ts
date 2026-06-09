/** Promise-based sleep that respects an AbortSignal (so Reset can cancel a run). */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

let counter = 0;
/** Small monotonic id generator — deterministic, no Math.random needed. */
export function uid(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${counter}`;
}

/** 0..1 -> "high" | "medium" | "low" confidence bucket. */
export function confidenceBucket(c: number): 'high' | 'medium' | 'low' {
  if (c >= 0.9) return 'high';
  if (c >= 0.75) return 'medium';
  return 'low';
}
