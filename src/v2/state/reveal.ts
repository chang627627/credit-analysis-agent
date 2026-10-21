// ---------------------------------------------------------------------------
// DOM hand-offs shared by the state modules (THREE-PANE.md R2.3): retrying a
// focus or a reveal for a few frames while its target mounts, bringing memo
// elements into the band below the sticky doc bar, and telling whether an
// element is really on screen (inside that band and not covered by an
// overlaid source). The band ends at the memo pane's bottom edge: the window's
// in the column layout, the docked agent strip's top edge in the stacked one
// (R4.13). Every function is null-safe and never throws:
// a missing hook only means nothing moves.
// ---------------------------------------------------------------------------

/** Clearance kept between a revealed element and the doc bar / the window's bottom edge. */
const REVEAL_PAD = 8;

/**
 * Run `attempt` on the next animation frames until it reports success or
 * `frames` frames have passed (a target may mount in the commit after the call).
 */
export function onFrames(attempt: () => boolean, frames = 3): void {
  let tries = 0;
  const run = () => {
    tries += 1;
    let done = false;
    try {
      done = attempt();
    } catch {
      done = true;
    }
    if (done || tries >= frames) return;
    window.requestAnimationFrame(run);
  };
  window.requestAnimationFrame(run);
}

/** CSS.escape where it exists (every supported browser), else a quote-safe fallback. */
export function cssEscape(v: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(v) : v.replace(/["\\]/g, '\\$&');
}

/** The element is in the document and laid out. */
export function rendered(el: Element | null | undefined): el is HTMLElement {
  return el instanceof HTMLElement && el.isConnected && el.getClientRects().length > 0;
}

/** The top of the readable band: the bottom edge of the memo's sticky doc bar (0 without one). */
function bandTop(): number {
  try {
    const bar = document.querySelector('[data-docbar]');
    return bar ? bar.getBoundingClientRect().bottom : 0;
  } catch {
    return 0;
  }
}

/**
 * The bottom of the readable band: the memo pane's bottom edge, clipped to the window. In the
 * stacked layout (below 900px, R4.13) the agent strip is docked under the memo, so the memo ends
 * above the window's bottom edge; anything below that edge is scrolled out of the memo, not shown.
 */
function bandBottom(): number {
  try {
    const viz = document.querySelector('[data-viz]');
    const b = viz ? viz.getBoundingClientRect().bottom : window.innerHeight;
    return Math.min(b, window.innerHeight);
  } catch {
    return window.innerHeight;
  }
}

/** The nearest scrolling ancestor (the memo canvas), else the document scroller. */
function scrollerOf(el: HTMLElement): Element | null {
  let box = el.parentElement;
  while (box) {
    const oy = getComputedStyle(box).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && box.scrollHeight > box.clientHeight) return box;
    box = box.parentElement;
  }
  return document.scrollingElement;
}

/**
 * Bring the union of `els` into the band between the doc bar and the memo
 * pane's bottom edge, in one scroll of their scroller. 'center' centres the union when
 * any part of it is outside the band; 'nearest' moves it the least distance.
 * A union taller than the band aligns its LAST element's bottom with the band's
 * bottom (the reviewer line is listed last, so the line wins).
 */
export function revealInBand(els: (HTMLElement | null)[], mode: 'center' | 'nearest', behavior: ScrollBehavior): void {
  try {
    const live = els.filter((el): el is HTMLElement => rendered(el));
    if (live.length === 0) return;
    const rects = live.map((el) => el.getBoundingClientRect());
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const lo = bandTop() + REVEAL_PAD;
    const hi = bandBottom() - REVEAL_PAD;
    let dy = 0;
    if (bottom - top > hi - lo) {
      dy = rects[rects.length - 1].bottom - hi;
    } else if (top < lo || bottom > hi) {
      dy = mode === 'center' ? (top + bottom) / 2 - (lo + hi) / 2 : top < lo ? top - lo : bottom - hi;
    }
    if (Math.abs(dy) < 1) return;
    const scroller = scrollerOf(live[live.length - 1]);
    if (scroller) scroller.scrollBy({ top: dy, behavior });
  } catch {
    /* nothing to reveal */
  }
}

/**
 * The element is fully inside the readable band (below the doc bar, above the
 * memo pane's bottom edge) and not covered: a point on its left part or its
 * centre hits the element itself, so an overlaid source on top of it means it
 * is not on screen.
 */
export function onScreen(el: HTMLElement | null): boolean {
  try {
    if (!rendered(el)) return false;
    const r = el.getBoundingClientRect();
    if (r.height <= 0 || r.width <= 0) return false;
    if (r.top < bandTop() || r.bottom > bandBottom()) return false;
    const y = r.top + Math.min(r.height / 2, 20);
    for (const x of [r.left + Math.min(24, r.width / 2), r.left + r.width / 2]) {
      const hit = document.elementFromPoint(x, y);
      if (hit && el.contains(hit)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Focus moved away (nothing holds it, or the holder left the page). */
export function focusLost(): boolean {
  const a = document.activeElement;
  return a === null || a === document.body || !a.isConnected;
}
