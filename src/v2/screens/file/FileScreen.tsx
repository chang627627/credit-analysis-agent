// ---------------------------------------------------------------------------
// Case file (spec §7.2): the product. The agent drafts the Credit Approval
// Memorandum beside the CIM it quotes; flags are margin notes; the run log
// lives in the margin; the decision is the signature at the foot.
//
//   [canvas] or [source 360 | canvas]      canvas = sticky doc bar + content
//   content = page grid: one .file-row per memo row (display: contents)
//             holding a .file-pagecell (data-section) and a .file-margincell
//
// The screen is a pure reduction of selectFile(): it renders the view
// verbatim and calls only store actions. It owns the scroll/cue effects of
// §7.2 (scroll to ?at=, trace, flash, note focus, amend focus) and the local
// reading state (hovered note/row, open records, reasoning overrides).
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { Caret, EmptyNote, LinkButton, SectionHead, StatusLabel } from '../../kit';
import { COPY, CUE_HOLD_MS, selectAsk, selectFile } from '../../model';
import type { FileView, NoteView, SectionView } from '../../model';
import { useV2 } from '../../state/store';
import type { V2Actions } from '../../state/store';
import type { FileScreenProps } from '../../state/screens';
import { Appendix } from './Appendix';
import { Contents } from './Contents';
import { DocBar } from './DocBar';
import { MarginCell, Notes, Stub } from './Margin';
import { HeaderMargin, PageHeader } from './PageHeader';
import { SourcePane } from './SourcePane';
import { Covenants } from './sections/Covenants';
import { Financials } from './sections/Financials';
import { Peers } from './sections/Peers';
import { Recommendation } from './sections/Recommendation';
import { Revision } from './sections/Revision';
import { Risk } from './sections/Risk';

/** Everything a memo row needs from the screen: the view, actions and the local cue state. */
export interface FileCtx {
  dealId: string;
  view: FileView;
  actions: V2Actions;
  /** below 760px every memo table stacks (§3 responsive floor) */
  stackTables: boolean;
  /** below 1120px the five-column covenant tables stack too: their fixed columns leave no room for the name */
  stackWide: boolean;
  quotedMarkIds: string[];
  activeMarkId: string | null;
  amendFocus: { kind: 'leverage' | 'liquidity'; tick: number } | null;
  isHighlighted: (anchorId: string) => boolean;
  flashKeyOf: (anchorId: string) => number | undefined;
  isNoteActive: (n: NoteView) => boolean;
  hoverNote: (anchorId: string | null) => void;
  noteAction: (n: NoteView, kind: 'show' | 'trace' | 'amend') => void;
  isRecordOpen: (stepId: string) => boolean;
  setRecordOpen: (stepId: string, open: boolean) => void;
  isReasoningOpen: (stepId: string) => boolean;
  setReasoningOpen: (stepId: string, open: boolean) => void;
  cite: (citeIndex: number) => void;
  openStress: () => void;
}

/** Live media query (no ResizeObserver: the layout itself is pure CSS). */
function useMedia(query: string): boolean {
  const read = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  const [match, setMatch] = useState(read);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const on = () => setMatch(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Attribute selectors carry anchor ids such as `cov:Max Total Leverage`. */
function esc(v: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(v) : v.replace(/["\\]/g, '\\$&');
}

function allNotes(view: FileView | null): NoteView[] {
  if (!view) return [];
  const out = view.sections.flatMap((sec) => sec.notes);
  if (view.headerMargin.evidenceCheck) out.push(view.headerMargin.evidenceCheck);
  return out;
}

function Row(props: { section: string; page: ReactNode; margin: ReactNode }) {
  return (
    <div className="file-row">
      <div className="file-pagecell" data-section={props.section}>
        {props.page}
      </div>
      <MarginCell empty={props.margin === null}>{props.margin}</MarginCell>
    </div>
  );
}

function SectionContent(props: { sec: SectionView; ctx: FileCtx }) {
  const { sec, ctx } = props;
  switch (sec.phase) {
    case 'pending':
      return <p className="file-pending t-small">{sec.pendingLine}</p>;
    case 'excluded':
      return <p className="file-pending t-small">{COPY.excludedLine}</p>;
    case 'stopped':
      return (
        <div className="file-drafting">
          {sec.drafting && sec.drafting.text ? <p className="file-drafting__text t-small">{sec.drafting.text}</p> : null}
          <StatusLabel state="error" role="small">
            {COPY.stopped}
          </StatusLabel>
        </div>
      );
    case 'drafting': {
      const d = sec.drafting;
      if (!d) return <p className="file-pending t-small">{sec.pendingLine}</p>;
      // exactly one caret, at the very end of the write point
      return (
        <div className="file-drafting">
          {d.text || !d.callLine ? (
            <p className="file-drafting__text t-small">
              {d.text}
              {d.caret && !d.callLine ? <Caret /> : null}
            </p>
          ) : null}
          {d.callLine ? (
            <p className="file-drafting__text t-small">
              {d.callLine}
              {d.caret ? <Caret /> : null}
            </p>
          ) : null}
        </div>
      );
    }
    case 'set':
    default:
      break;
  }
  let body: ReactNode = null;
  switch (sec.kind) {
    case 'recommendation':
      body = sec.body ? <Recommendation body={sec.body} ctx={ctx} /> : null;
      break;
    case 'financials':
      body = sec.body ? <Financials rows={sec.body} heading={sec.heading} ctx={ctx} /> : null;
      break;
    case 'risk':
      body = sec.body ? <Risk body={sec.body} ctx={ctx} /> : null;
      break;
    case 'peers':
      body = sec.body ? <Peers body={sec.body} heading={sec.heading} ctx={ctx} /> : null;
      break;
    case 'covenants':
      body = sec.body ? <Covenants rows={sec.body} heading={sec.heading} ctx={ctx} /> : null;
      break;
    case 'revision':
      body = sec.body ? <Revision body={sec.body} heading={sec.heading} ctx={ctx} /> : null;
      break;
    default:
      body = null;
  }
  if (!body) return null;
  return <div className="file-secbody">{body}</div>;
}

function SectionPage(props: { sec: SectionView; ctx: FileCtx }) {
  const { sec, ctx } = props;
  return (
    <>
      <SectionHead
        ordinal={sec.ordinal}
        heading={sec.heading}
        suffix={sec.suffix}
        status={sec.status}
        statusLabel={sec.statusLabel}
        anchorId={sec.anchorId}
        flashKey={ctx.flashKeyOf(sec.anchorId)}
        highlighted={ctx.isHighlighted(sec.anchorId)}
      />
      <SectionContent sec={sec} ctx={ctx} />
    </>
  );
}

function sectionMargin(sec: SectionView, ctx: FileCtx): ReactNode {
  if (!sec.stub && sec.notes.length === 0) return null;
  return (
    <>
      {sec.stub ? <Stub stub={sec.stub} ctx={ctx} /> : null}
      <Notes notes={sec.notes} ctx={ctx} />
    </>
  );
}

export function FileScreen({ dealId, at, navSeq, slots }: FileScreenProps) {
  const s = useV2();
  const a = s.actions;
  const view = selectFile(s, dealId);

  const stackTables = useMedia('(max-width: 759px)');
  const stackWide = useMedia('(max-width: 1119px)');

  const rootRef = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(s.reducedMotion);
  reducedRef.current = s.reducedMotion;
  const viewRef = useRef<FileView | null>(view);
  viewRef.current = view;

  // ---- local reading state
  const [hoverAnchor, setHoverAnchor] = useState<string | null>(null); // a hovered note's anchor → its row highlights
  const [hoverRow, setHoverRow] = useState<string | null>(null); // a hovered anchored row → its notes go active
  const [focusedNote, setFocusedNote] = useState<string | null>(null);
  const [flashKeys, setFlashKeys] = useState<Record<string, number>>({});
  const [held, setHeld] = useState<Record<string, number>>({});
  const [records, setRecords] = useState<Record<string, boolean>>({});
  const showReasoning = view ? view.headerMargin.showReasoning : false;
  // per-stub reasoning overrides, discarded whenever "Show all reasoning" flips
  const [reasoning, setReasoning] = useState<{ base: boolean; open: Record<string, boolean> }>({ base: showReasoning, open: {} });

  const timers = useRef<number[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    },
    [],
  );

  const query = useCallback((sel: string): HTMLElement | null => {
    const root = rootRef.current;
    return root ? root.querySelector<HTMLElement>(sel) : null;
  }, []);

  const scrollTo = useCallback((el: HTMLElement | null, block: ScrollLogicalPosition, instant = false) => {
    if (!el) return;
    el.scrollIntoView({ block, behavior: instant || reducedRef.current ? 'auto' : 'smooth' });
  }, []);

  /** Cue an anchored row or head: replay the flash, or (reduced motion) hold a static highlight. */
  const cue = useCallback((anchorId: string) => {
    if (reducedRef.current) {
      setHeld((h) => ({ ...h, [anchorId]: (h[anchorId] ?? 0) + 1 }));
      const t = window.setTimeout(() => {
        setHeld((h) => {
          const n = (h[anchorId] ?? 0) - 1;
          const next = { ...h };
          if (n > 0) next[anchorId] = n;
          else delete next[anchorId];
          return next;
        });
      }, CUE_HOLD_MS);
      timers.current.push(t);
      return;
    }
    setFlashKeys((f) => ({ ...f, [anchorId]: (f[anchorId] ?? 0) + 1 }));
  }, []);

  // ---- [dealId, at, navSeq]: scroll the target page cell into view
  useEffect(() => {
    if (!at) return;
    scrollTo(query(`.file-pagecell[data-section="${esc(at)}"]`), 'start');
  }, [dealId, at, navSeq, query, scrollTo]);

  // ---- ui.trace.tick: open that stub's Record, bring the stub into view, cue the anchor
  const trace = s.ui.trace;
  const traceTick = trace ? trace.tick : 0;
  const lastTrace = useRef(traceTick);
  useEffect(() => {
    if (traceTick === lastTrace.current) return;
    lastTrace.current = traceTick;
    if (!trace) return;
    const { stepId, anchorId } = trace;
    setRecords((r) => (r[stepId] ? r : { ...r, [stepId]: true }));
    const raf = window.requestAnimationFrame(() => {
      scrollTo(query(`[data-stub="${esc(stepId)}"]`), 'center');
      if (anchorId) cue(anchorId);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [traceTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- ui.flash.tick: cue the anchor (Show row)
  const flash = s.ui.flash;
  const flashTick = flash ? flash.tick : 0;
  const lastFlash = useRef(flashTick);
  useEffect(() => {
    if (flashTick === lastFlash.current) return;
    lastFlash.current = flashTick;
    if (!flash) return;
    cue(flash.anchorId);
    scrollTo(query(`[data-anchor="${esc(flash.anchorId)}"]`), 'nearest');
  }, [flashTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- ui.noteFocus.tick: bring the note into view and cue its anchor
  const noteFocus = s.ui.noteFocus;
  const noteTick = noteFocus ? noteFocus.tick : 0;
  const lastNote = useRef(noteTick);
  useEffect(() => {
    if (noteTick === lastNote.current) return;
    lastNote.current = noteTick;
    if (!noteFocus) return;
    const { noteId } = noteFocus;
    setFocusedNote(noteId);
    scrollTo(query(`[data-note="${esc(noteId)}"]`), 'center');
    const note = allNotes(viewRef.current).find((n) => n.id === noteId);
    if (note) cue(note.anchorId);
  }, [noteTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- ui.amendFocus.tick reaches the AmendField as focusTick (Covenants); only changes after mount count
  const amendFocus = s.ui.amendFocus;
  const amendAtMount = useRef(amendFocus ? amendFocus.tick : 0);
  const liveAmendFocus = amendFocus && amendFocus.tick !== amendAtMount.current ? amendFocus : null;

  // ---- hovering an anchored row (Table row or section head) activates its notes
  const onGridOver = (e: PointerEvent<HTMLDivElement>) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const cell = t.closest('.file-pagecell');
    const row = cell ? t.closest<HTMLElement>('[data-anchor]') : null;
    const id = row && cell && cell.contains(row) ? row.getAttribute('data-anchor') : null;
    setHoverRow(id);
  };
  const onGridLeave = () => setHoverRow(null);

  if (!view) {
    return (
      <div className="file-missing">
        <div className="file-missing__inner">
          <EmptyNote>{COPY.notFound}</EmptyNote>
          <LinkButton onClick={() => a.navigate({ name: 'desk' })}>{COPY.backToDesk}</LinkButton>
        </div>
      </div>
    );
  }

  const ask = selectAsk(s, dealId);
  const cites = s.ui.cites;
  const activeMarkId = cites && cites.dealId === dealId ? cites.markIds[cites.index] ?? null : null;
  const reasoningMap = reasoning.base === showReasoning ? reasoning.open : {};

  const ctx: FileCtx = {
    dealId,
    view,
    actions: a,
    stackTables,
    stackWide,
    quotedMarkIds: view.sourceView.quoted.markIds,
    activeMarkId,
    amendFocus: liveAmendFocus,
    isHighlighted: (id) => hoverAnchor === id || (held[id] ?? 0) > 0,
    flashKeyOf: (id) => flashKeys[id],
    isNoteActive: (n) => hoverRow === n.anchorId || focusedNote === n.id,
    hoverNote: (id) => setHoverAnchor(id),
    noteAction: (n, kind) => {
      if (n.flagId && view.live) a.markOpened(n.flagId);
      if (kind === 'show') a.flashAnchor(n.anchorId);
      else if (kind === 'trace') {
        if (n.traceStepId) a.trace(n.traceStepId, n.anchorId);
        else a.flashAnchor(n.anchorId);
      } else if (kind === 'amend' && n.amendKind) a.focusAmend(n.amendKind);
    },
    isRecordOpen: (stepId) => records[stepId] === true,
    setRecordOpen: (stepId, open) => setRecords((r) => ({ ...r, [stepId]: open })),
    isReasoningOpen: (stepId) => reasoningMap[stepId] ?? showReasoning,
    setReasoningOpen: (stepId, open) =>
      setReasoning((prev) => ({ base: showReasoning, open: { ...(prev.base === showReasoning ? prev.open : {}), [stepId]: open } })),
    cite: (citeIndex) => a.cite(dealId, view.sourceView.quoted.markIds, citeIndex),
    openStress: () => {
      a.openStress(dealId);
      window.requestAnimationFrame(() => scrollTo(query('.file-pagecell[data-section="stress"]'), 'start'));
    },
  };

  const goToDrafting = () => {
    const target = view.sections.find((sec) => sec.phase === 'drafting') ?? view.sections.find((sec) => sec.phase === 'pending');
    if (target) scrollTo(query(`.file-pagecell[data-section="${esc(target.id)}"]`), 'start', true);
  };

  // ---- memo rows, in page order (§7.2 "Row order")
  const rows: ReactNode[] = [
    <Row
      key="header"
      section="header"
      page={<PageHeader header={view.header} ctx={ctx} />}
      margin={<HeaderMargin view={view} ask={ask} ctx={ctx} />}
    />,
  ];
  if (view.contents) {
    rows.push(
      <Row
        key="contents"
        section="contents"
        page={<Contents contents={view.contents} ctx={ctx} />}
        margin={<EmptyNote>{COPY.contentsEmptyMargin}</EmptyNote>}
      />,
    );
  } else {
    for (const sec of view.sections) {
      rows.push(<Row key={sec.id} section={sec.id} page={<SectionPage sec={sec} ctx={ctx} />} margin={sectionMargin(sec, ctx)} />);
    }
  }
  if (view.rows.exhibits) rows.push(<Row key="exhibits" section="exhibits" page={slots.exhibits} margin={null} />);
  if (view.rows.stress) rows.push(<Row key="stress" section="stress" page={slots.stress} margin={null} />);
  if (view.rows.signature) rows.push(<Row key="signature" section="signature" page={slots.signature} margin={null} />);
  if (view.rows.monitoring && view.appendix) {
    rows.push(<Row key="monitoring" section="monitoring" page={<Appendix appendix={view.appendix} ctx={ctx} />} margin={null} />);
  }

  return (
    <div ref={rootRef} className="file" data-source={view.sourceView.open ? 'open' : 'closed'}>
      <SourcePane source={view.sourceView} dealId={dealId} actions={a} reducedMotion={s.reducedMotion} />
      <div className="file-canvas">
        <DocBar docBar={view.docBar} source={view.sourceView} dealId={dealId} actions={a} onGoToDrafting={goToDrafting} />
        <div className="file-content">
          <div className="file-grid" onPointerOver={onGridOver} onPointerLeave={onGridLeave}>
            {rows}
          </div>
        </div>
      </div>
    </div>
  );
}
