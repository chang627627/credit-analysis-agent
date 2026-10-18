// ---------------------------------------------------------------------------
// Case file · the source pane (spec §3 "Source pane", §7.2 "Source pane").
// Closed: nothing (the doc bar carries a horizontal toggle). Open: the CIM with
// numbered paragraphs and every quoted span marked; the active cite carries a
// 2px ink outline and scrolls into view. At 1432px and up it pushes the canvas
// (360px column); below it floats over the canvas under the doc bar, never
// wider than the pane (file.css). Esc and `[` are handled once in
// state/shortcuts.ts. Closing it while focus is inside (its close button, Esc,
// `[`) hands focus back to the doc bar's Source toggle instead of dropping it.
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, ChevronsLeft, X } from 'lucide-react';
import { Chip, IconButton, LinkButton } from '../../kit';
import { COPY } from '../../model';
import type { SourceView } from '../../model';
import type { V2Actions } from '../../state/store';

const CLOSE_SOURCE = 'Close source ([)';
const PREV_CITE = 'Previous cite';
const NEXT_CITE = 'Next cite';
const CLEAR_CITES = 'Clear cites';
const BORROWER = 'Borrower';
const FACILITY = 'Facility';

/** The doc bar's Source toggle that is showing (DocBar renders a labelled and an icon form). */
function focusSourceToggle(): void {
  const candidates = document.querySelectorAll<HTMLElement>('[data-source-toggle] button');
  for (const el of Array.from(candidates)) {
    if (el.getClientRects().length > 0) {
      el.focus({ preventScroll: true });
      return;
    }
  }
}

export function SourcePane(props: { source: SourceView; dealId: string; actions: V2Actions; reducedMotion: boolean }) {
  const { source: v, dealId, actions: a, reducedMotion } = props;
  const bodyRef = useRef<HTMLDivElement>(null);
  // the last element focused inside the pane: if closing removes it, focus would fall to <body>
  const lastFocus = useRef<HTMLElement | null>(null);

  // the active span (block centre) whenever the cite index moves
  let activeMark: string | null = null;
  for (const p of v.paragraphs) {
    for (const seg of p.segments) if (seg.active && seg.markId) activeMark = seg.markId;
  }
  const stepLabel = v.stepper ? v.stepper.label : null;
  useEffect(() => {
    if (!v.open || !activeMark) return;
    const body = bodyRef.current;
    if (!body) return;
    const el = body.querySelector<HTMLElement>(`[data-mark="${activeMark.replace(/["\\]/g, '\\$&')}"]`);
    if (el) el.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [v.open, activeMark, stepLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  // closed with focus inside (close button, Esc, `[`): return it to the toggle, after the commit
  // that removed the pane and relabelled the toggle. Focus that already moved elsewhere stays.
  useLayoutEffect(() => {
    if (v.open) return;
    const el = lastFocus.current;
    lastFocus.current = null;
    if (!el || el.isConnected) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    focusSourceToggle();
  }, [v.open]);

  // closed: no column at all. The doc bar's horizontal 'Source CIM · n quoted' toggle opens it.
  if (!v.open) return null;

  return (
    <aside
      className="file-source"
      aria-label={v.heading}
      onFocus={(e) => {
        lastFocus.current = e.target instanceof HTMLElement ? e.target : null;
      }}
    >
      <div className="file-source__panel">
        <div className="file-source__head">
          <span className="file-source__heading t-label">{v.heading}</span>
          {v.simulated ? <Chip>{COPY.simulatedExtraction}</Chip> : null}
          <IconButton icon={ChevronsLeft} label={CLOSE_SOURCE} size="xs" onClick={() => a.closeSource()} />
        </div>
        <div className="file-source__tools">
          <LinkButton
            role="label"
            disabled={v.quoted.count === 0}
            onClick={() => a.cite(dealId, v.quoted.markIds, 0)}
          >
            {v.quoted.showAllLabel}
          </LinkButton>
          {v.stepper ? (
            <span className="file-source__stepper">
              <span className="file-source__count t-label">{v.stepper.label}</span>
              <IconButton icon={ArrowUp} label={PREV_CITE} size="xs" disabled={!v.stepper.hasPrev} onClick={() => a.citeStep(-1)} />
              <IconButton icon={ArrowDown} label={NEXT_CITE} size="xs" disabled={!v.stepper.hasNext} onClick={() => a.citeStep(1)} />
              <IconButton icon={X} label={CLEAR_CITES} size="xs" onClick={() => a.clearCites()} />
            </span>
          ) : null}
        </div>
        <div ref={bodyRef} className="file-source__body">
          <h2 className="file-source__title t-heading">{v.title}</h2>
          <dl className="file-source__facts t-small">
            <dt>{BORROWER}</dt>
            <dd>{v.borrower}</dd>
            <dt>{FACILITY}</dt>
            <dd>{v.facility}</dd>
          </dl>
          <div className="file-source__paras">
            {v.paragraphs.map((p) => (
              <div key={p.n} className="file-para">
                <span className="file-para__n t-meta">{p.label}</span>
                <p className="file-para__text t-body">
                  {p.segments.map((seg, i) =>
                    seg.markId ? (
                      <mark key={i} className={seg.active ? 'file-mark is-active' : 'file-mark'} data-mark={seg.markId}>
                        {seg.text}
                      </mark>
                    ) : (
                      <span key={i}>{seg.text}</span>
                    ),
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
