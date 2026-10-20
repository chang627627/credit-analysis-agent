// Table: the one grid-based table of V2 (role=table semantics, CSS grid layout).
// Every row is its own grid on the shared column template (fr tracks become minmax(0, fr) so
// rows always align). Group rows, full-width span rows, indented rows, detail blocks, highlight,
// flash, muted and activatable rows are all expressed through TableRow. `hideBelow` hides a column
// below that viewport width; `stackBelow` (760, 640 or 480) stacks each row's cells into one column
// once the table itself is narrower than that width (a container query on the table's own box, so a
// table in a narrow memo card or a 360px frame stacks by its real width, whatever the viewport).
import { useLayoutEffect, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { StatusGlyph } from './StatusGlyph';
import type { StatusKey } from './types';

export interface TableColumn { key: string; label: string; width: string; align?: 'start' | 'end'; srOnlyLabel?: boolean; hideBelow?: 1120 | 760 }
export interface TableGroup {
  label: string; status?: StatusKey; meta?: string; count?: string;
  height?: 32 | 40; expanded?: boolean; onToggle?: () => void; trailing?: ReactNode;
}
export interface TableRow {
  key: string;
  cells?: Record<string, ReactNode>;   // normal row
  span?: ReactNode;                     // one full-width cell instead of cells
  group?: TableGroup;                   // group/header row instead of cells
  height?: 36 | 48 | 56;
  indent?: boolean;                     // 24px extra left padding (Book sub-rows)
  onActivate?: () => void;
  ariaLabel?: string;
  anchorId?: string;                    // rendered as data-anchor on the row element
  highlighted?: boolean;
  flashKey?: string | number;
  muted?: boolean;
  detail?: ReactNode;                   // full-width block after the row (confirm strip, expansion)
}
export interface TableProps { columns: TableColumn[]; rows: TableRow[]; caption: string; header?: boolean; stackBelow?: 760 | 640 | 480 }

const cx = (...c: (string | false | null | undefined)[]): string => c.filter(Boolean).join(' ');

const track = (w: string): string => {
  const t = w.trim();
  return /^\d*\.?\d+fr$/.test(t) ? `minmax(0, ${t})` : t;
};
const templateOf = (cols: TableColumn[]): string => (cols.length > 0 ? cols.map((c) => track(c.width)).join(' ') : 'minmax(0, 1fr)');

// Elements that handle their own activation: a click or key on one never activates the row.
const INTERACTIVE =
  'a, button, input, textarea, select, label, summary, [role="button"], [role="switch"], [role="link"], [role="checkbox"], [role="menuitem"], [role="menuitemradio"], [role="option"], [contenteditable="true"], [tabindex]';

/**
 * Replays the one-shot v2-flash cue each time `flashKey` changes (never on mount).
 * Shared with SectionHead. Under reduced motion --dur-flash is 0, so the cue ends at once and
 * screens hold `highlighted` instead.
 */
export const useFlash = (flashKey: string | number | undefined) => {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef(flashKey);
  const [on, setOn] = useState(false);
  useLayoutEffect(() => {
    if (prev.current === flashKey) return;
    prev.current = flashKey;
    if (flashKey === undefined) return;
    if (!on) {
      setOn(true);
      return;
    }
    ref.current?.getAnimations().forEach((a) => {
      if ('animationName' in a && (a as CSSAnimation).animationName === 'v2-flash') {
        a.cancel();
        a.play();
      }
    });
    // `on` is read from the render that changed flashKey, which is the latest one.
  }, [flashKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const onAnimationEnd = (e: AnimationEvent<HTMLElement>) => {
    if (e.target === e.currentTarget && e.animationName === 'v2-flash') setOn(false);
  };
  return { ref, on, onAnimationEnd };
};

/** A body row's position for the memo card's write-in stagger (--k-row), capped so long tables do not trail. */
const ROW_STAGGER_CAP = 8;

function BodyRow({ row, columns, index }: { row: TableRow; columns: TableColumn[]; index: number }) {
  const flash = useFlash(row.flashKey);
  const activatable = row.onActivate !== undefined && row.group === undefined;
  const n = Math.max(1, columns.length);

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const target = e.target as Node;
    if (!el.contains(target)) return; // bubbled through a portal (menu, tooltip): not a row click
    const hit = target instanceof Element ? target.closest(INTERACTIVE) : null;
    if (hit && hit !== el && el.contains(hit)) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.anchorNode && el.contains(sel.anchorNode)) return;
    row.onActivate?.();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      row.onActivate?.();
    }
  };

  const state = cx(
    row.highlighted && 'is-highlighted',
    row.muted && 'is-muted',
    flash.on && 'is-flash',
    row.indent && 'is-indent',
  );

  let inner: ReactNode;
  let kind: string;
  if (row.group) {
    const g = row.group;
    kind = 'k-table__group';
    const parts = (
      <>
        {g.onToggle ? <ChevronRight size={12} className="k-table__chevron" aria-hidden="true" /> : null}
        {g.status ? <StatusGlyph state={g.status} /> : null}
        <span className="k-table__glabel t-label">{g.label}</span>
        {g.meta ? <span className="k-table__gmeta t-meta">{g.meta}</span> : null}
        {g.count ? <span className="k-table__gcount t-label">{g.count}</span> : null}
      </>
    );
    inner = (
      <div role="cell" aria-colspan={n} className="k-table__groupcell">
        {g.onToggle ? (
          <button type="button" className="k-table__toggle" aria-expanded={g.expanded === true} onClick={() => g.onToggle?.()}>
            {parts}
          </button>
        ) : (
          <span className="k-table__gmain">{parts}</span>
        )}
        {g.trailing ? <span className="k-table__trailing">{g.trailing}</span> : null}
      </div>
    );
  } else if (row.span !== undefined) {
    kind = 'k-table__row k-table__row--span';
    inner = (
      <div role="cell" aria-colspan={n} className="k-table__cell k-table__span">
        {row.span}
      </div>
    );
  } else {
    kind = 'k-table__row';
    inner = columns.map((c, i) => {
      const label = i > 0 && !c.srOnlyLabel && c.label ? c.label : null;
      return (
        <div
          key={c.key}
          role="cell"
          className={cx('k-table__cell', c.align === 'end' && 'k-table__cell--end t-figure')}
          data-hide={c.hideBelow}
        >
          {label ? <span className="k-table__stacklabel t-meta">{label}</span> : null}
          {row.cells?.[c.key] ?? null}
        </div>
      );
    });
  }

  return (
    <>
      <div
        ref={flash.ref}
        role="row"
        className={cx(kind, state)}
        data-h={row.group ? (row.group.height ?? 32) : (row.height ?? 36)}
        style={{ '--k-row': Math.min(index + 1, ROW_STAGGER_CAP) } as CSSProperties}
        data-anchor={row.anchorId}
        data-activate={activatable ? '' : undefined}
        tabIndex={activatable ? 0 : undefined}
        aria-label={activatable ? row.ariaLabel : undefined}
        onClick={activatable ? onClick : undefined}
        onKeyDown={activatable ? onKeyDown : undefined}
        onAnimationEnd={flash.onAnimationEnd}
      >
        {inner}
      </div>
      {row.detail !== undefined && row.detail !== null ? (
        <div role="row" className={cx('k-table__detail', row.muted && 'is-muted')}>
          <div role="cell" aria-colspan={n} className="k-table__detailcell">
            {row.detail}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function Table({ columns, rows, caption, header = true, stackBelow }: TableProps) {
  const style = {
    '--k-cols': templateOf(columns),
    '--k-cols-1120': templateOf(columns.filter((c) => c.hideBelow !== 1120)),
    '--k-cols-760': templateOf(columns.filter((c) => c.hideBelow === undefined)),
  } as CSSProperties;
  return (
    <div className="k-table" data-stack={stackBelow}>
      <div className="k-table__grid" role="table" aria-label={caption} style={style}>
        {header ? (
          <div role="row" className="k-table__head">
            {columns.map((c) => (
              <div
                key={c.key}
                role="columnheader"
                className={cx('k-table__cell t-label', c.align === 'end' && 'k-table__cell--end')}
                data-hide={c.hideBelow}
              >
                {c.srOnlyLabel ? <span className="v2-sr">{c.label}</span> : c.label}
              </div>
            ))}
          </div>
        ) : null}
        {rows.map((r, i) => (
          <BodyRow key={r.key} row={r} columns={columns} index={i} />
        ))}
      </div>
    </div>
  );
}
