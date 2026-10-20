// ---------------------------------------------------------------------------
// Case file · the memo pane (THREE-PANE.md R2.2, §1.7, §5). Everything the
// reviewer reads, and the whole decision, lives here; the agent panel beside
// it is command and control only and merely points at these cards.
//
//   header on the canvas (borrower, facility and amount, CAM id, prepared-by,
//     the CIM paragraphs; never the agent's call)
//   one paper card per section, 16px of canvas apart: step eyebrow, real
//     title, the model's one-line takeaway, labelled blocks with the flagged
//     figure marked where it sits, the row-less flags as one marked line each
//     at the card's foot, then ONE quiet record line with a collapsed Record
//   the Decision card (slots.signature, rendered by screens/decision inside
//     this screen's MemoCard section="signature"), right after step 5: the
//     ONE place to decide, and the sealed record once decided
//   the stress test (scratch, no card), the exhibits card, the appendix card
//
//   .file = [canvas] or [canvas | source 360]   (push at a memo pane of
//   1064px and up, @container viz; an overlay on the right edge below)
//   canvas = sticky doc bar + .file-content (max 808, cards 16px apart)
//
// No notes blocks, no margin column, no header margin, no Contents row. The
// screen is a pure reduction of selectFile(): it renders the view verbatim and
// calls only store actions. It owns the scroll and cue effects: [dealId, at,
// navSeq] scrolling, ui.memoCue (panel links, J / K, Signed over, Edit in
// memo, the stress link: scroll the card, bring the row into view, cue it with
// the one-shot flash or a held highlight under reduced motion) and
// ui.amendFocus (reaches the AmendField). Every card carries data-section, so
// every panel link ("Covenants →", "Decision →") has a target.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Caret, EmptyNote, LinkButton, MemoCard, SectionHead, StatusLabel } from '../../kit';
import { COPY, CUE_HOLD_MS, isRowAnchor, selectFile } from '../../model';
import type { FileView, MemoSection, SectionAside, SectionView } from '../../model';
import { CardFlags, CardFooter } from './CardFoot';
import { useV2 } from '../../state/store';
import type { V2Actions } from '../../state/store';
import type { FileScreenProps } from '../../state/screens';
import { Appendix } from './Appendix';
import { DocBar } from './DocBar';
import { PageHeader } from './PageHeader';
import { SourcePane } from './SourcePane';
import { Covenants } from './sections/Covenants';
import { Financials } from './sections/Financials';
import { Peers } from './sections/Peers';
import { Recommendation } from './sections/Recommendation';
import { Revision } from './sections/Revision';
import { Risk } from './sections/Risk';

/** Everything a memo card needs from the screen: the view, the actions and the local cue state. */
export interface FileCtx {
  dealId: string;
  view: FileView;
  actions: V2Actions;
  activeMarkId: string | null;
  amendFocus: { kind: 'leverage' | 'liquidity'; tick: number } | null;
  isHighlighted: (anchorId: string) => boolean;
  flashKeyOf: (anchorId: string) => number | undefined;
  cite: (citeIndex: number) => void;
}

/** A cue written this recently is honoured when the memo mounts in the same batch (§2.6). */
const CUE_FRESH_MS = 1000;
/** Cards sit this far below the scroller's top edge, under the 44px doc bar (MemoCard scroll-margin-top). */
const CARD_SCROLL_MARGIN = 60;

/** Attribute selectors carry anchor ids such as `cov:Max Total Leverage`. */
function esc(v: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(v) : v.replace(/["\\]/g, '\\$&');
}

/** Smooth unless the cue asks for an instant jump or the reader prefers reduced motion. */
function scrollBehavior(instant: boolean, reduced: boolean): ScrollBehavior {
  return instant || reduced ? 'auto' : 'smooth';
}

/** Right of the eyebrow while a card drafts, is excluded or stopped. A set card has none: its footer carries the record. */
function Aside(props: { aside: SectionAside }) {
  const { aside } = props;
  if (aside.kind !== 'status') return null;
  return (
    <StatusLabel state={aside.state} role="label">
      {aside.text}
    </StatusLabel>
  );
}

function SectionBody(props: { sec: SectionView; ctx: FileCtx }) {
  const { sec, ctx } = props;
  switch (sec.phase) {
    case 'pending':
    case 'excluded':
      return sec.phaseLine ? <p className="file-phase t-small">{sec.phaseLine}</p> : null;
    case 'stopped':
      return sec.phaseLine ? (
        <p className="file-phase t-small">{sec.phaseLine}</p>
      ) : (
        <StatusLabel state="error" role="small">
          {sec.statusLabel}
        </StatusLabel>
      );
    case 'drafting': {
      const d = sec.drafting;
      if (!d) return sec.phaseLine ? <p className="file-phase t-small">{sec.phaseLine}</p> : null;
      // the app's one caret, at the end of the write point
      return (
        <p className="file-drafting t-small">
          {d.line}
          {d.caret ? <Caret /> : null}
        </p>
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
      body = sec.body ? <Financials rows={sec.body} labels={sec.blockLabels} ctx={ctx} /> : null;
      break;
    case 'risk':
      body = sec.body ? <Risk body={sec.body} ctx={ctx} /> : null;
      break;
    case 'peers':
      body = sec.body ? <Peers body={sec.body} /> : null;
      break;
    case 'covenants':
      body = sec.body ? <Covenants rows={sec.body} label={sec.testsLabel} ctx={ctx} /> : null;
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

function SectionCard(props: { sec: SectionView; ctx: FileCtx }) {
  const { sec, ctx } = props;
  return (
    <MemoCard section={sec.id} ariaLabel={sec.heading}>
      <SectionHead
        eyebrow={sec.eyebrow}
        heading={sec.heading}
        takeaway={sec.takeaway}
        aside={sec.aside ? <Aside aside={sec.aside} /> : null}
        anchorId={sec.anchorId}
        flashKey={ctx.flashKeyOf(sec.anchorId)}
        highlighted={ctx.isHighlighted(sec.anchorId)}
      />
      <SectionBody sec={sec} ctx={ctx} />
      {sec.flagLines.length > 0 ? <CardFlags lines={sec.flagLines} ctx={ctx} /> : null}
      {/* keyed by run, so a re-run opens with every Record collapsed again */}
      {sec.footer ? <CardFooter key={`${ctx.view.runId ?? 'none'}:${sec.footer.record.stepId}`} footer={sec.footer} /> : null}
    </MemoCard>
  );
}

export function FileScreen({ dealId, at, navSeq, slots }: FileScreenProps) {
  const s = useV2();
  const a = s.actions;
  const view = selectFile(s, dealId);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(s.reducedMotion);
  reducedRef.current = s.reducedMotion;
  const viewRef = useRef<FileView | null>(view);
  viewRef.current = view;

  // ---- local cue state: replayed flashes, and held highlights under reduced motion
  const [flashKeys, setFlashKeys] = useState<Record<string, number>>({});
  const [held, setHeld] = useState<Record<string, number>>({});

  // effects that wait a frame check this instead of cancelling, so a StrictMode remount keeps them
  const alive = useRef(false);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, []);

  const query = useCallback((sel: string): HTMLElement | null => {
    const root = rootRef.current;
    return root ? root.querySelector<HTMLElement>(sel) : null;
  }, []);

  /** Cue an anchored row or head this screen renders: replay the flash, or (reduced motion) hold a static highlight. */
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

  /** A memo cue (a panel link, J / K, Signed over, Edit in memo, the stress link): scroll the card
      to the top (or, when the row would still sit below the fold, the row to the centre) in ONE
      scroll, then cue the row (a table row or a row-less flag line) or the card's head. */
  const presentCue = useCallback(
    (section: MemoSection, anchorId: string | null, instant: boolean) => {
      const card = query(`[data-section="${esc(section)}"]`);
      if (!card) return;
      const row =
        anchorId !== null && isRowAnchor(anchorId) ? card.querySelector<HTMLElement>(`[data-anchor="${esc(anchorId)}"]`) : null;
      const scroller = canvasRef.current;
      let target: HTMLElement = card;
      let block: ScrollLogicalPosition = 'start';
      if (row && scroller) {
        const below = row.getBoundingClientRect().bottom - card.getBoundingClientRect().top + CARD_SCROLL_MARGIN;
        if (below > scroller.clientHeight) {
          target = row;
          block = 'center';
        }
      }
      target.scrollIntoView({ block, behavior: scrollBehavior(instant, reducedRef.current) });

      if (row && anchorId !== null) {
        cue(anchorId);
        return;
      }
      // the heads this screen renders; a slot card's head (the Decision card, exhibits) listens to
      // the same memoCue itself, since no flash key can be passed into a slot
      const v = viewRef.current;
      const owned = section === 'monitoring' || (v ? v.sections.some((sec) => sec.id === section) : false);
      if (owned) cue(`sec:${section}`);
    },
    [query, cue],
  );

  // ---- [dealId, at, navSeq]: scroll the target card into view. Opening the file jumps (no long
  // smooth run down a freshly mounted memo, and nothing animating under the Decision card's own
  // reveal, which state/gate.ts runs on the next frame); a later navigation within the file glides.
  const atMounted = useRef(false);
  useEffect(() => {
    const first = !atMounted.current;
    atMounted.current = true;
    if (!at) return;
    const el = query(`[data-section="${esc(at)}"]`);
    if (el) el.scrollIntoView({ block: 'start', behavior: scrollBehavior(first, reducedRef.current) });
  }, [dealId, at, navSeq, query]);

  // ---- ui.memoCue: a tick change after mount; on mount, a cue under CUE_FRESH_MS old (§2.6)
  const memoCue = s.ui.memoCue;
  const memoTick = memoCue ? memoCue.tick : 0;
  const memoRef = useRef(memoCue);
  memoRef.current = memoCue;
  const seenMemo = useRef(-1); // -1: the mount pass has not run yet
  useEffect(() => {
    const atMount = seenMemo.current === -1;
    if (memoTick === seenMemo.current) return;
    seenMemo.current = memoTick;
    const c = memoRef.current;
    if (!c || c.tick !== memoTick) return;
    if (atMount && Date.now() - c.at >= CUE_FRESH_MS) return;
    // one frame, so a card that mounted or grew in the same batch (the stress test opening) is laid out
    window.requestAnimationFrame(() => {
      if (!alive.current) return;
      presentCue(c.section, c.anchorId, c.instant);
    });
  }, [memoTick, presentCue]);

  // ---- ui.amendFocus.tick reaches the AmendField as focusTick (Covenants); only changes after mount count
  const amendFocus = s.ui.amendFocus;
  const amendAtMount = useRef(amendFocus ? amendFocus.tick : 0);
  const liveAmendFocus = amendFocus && amendFocus.tick !== amendAtMount.current ? amendFocus : null;

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

  const cites = s.ui.cites;
  const activeMarkId = cites && cites.dealId === dealId ? cites.markIds[cites.index] ?? null : null;
  const quotedMarkIds = view.sourceView.quoted.markIds;

  const ctx: FileCtx = {
    dealId,
    view,
    actions: a,
    activeMarkId,
    amendFocus: liveAmendFocus,
    isHighlighted: (id) => (held[id] ?? 0) > 0,
    flashKeyOf: (id) => flashKeys[id],
    cite: (citeIndex) => a.cite(dealId, quotedMarkIds, citeIndex),
  };

  const goToDrafting = () => {
    const target = view.sections.find((sec) => sec.phase === 'drafting') ?? view.sections.find((sec) => sec.phase === 'pending');
    if (!target) return;
    const el = query(`[data-section="${esc(target.id)}"]`);
    if (el) el.scrollIntoView({ block: 'start', behavior: 'auto' });
  };

  return (
    <div ref={rootRef} className="file" data-source={view.sourceView.open ? 'open' : 'closed'}>
      <div ref={canvasRef} className="file-canvas">
        <DocBar docBar={view.docBar} source={view.sourceView} dealId={dealId} actions={a} onGoToDrafting={goToDrafting} />
        <div className="file-content">
          <PageHeader header={view.header} ctx={ctx} />
          {view.sections.map((sec) => (
            <SectionCard key={sec.id} sec={sec} ctx={ctx} />
          ))}
          {/* R2.2: the Decision card right after step 5, before the stress test. The slot renders
              the card's content (the whole decision at the gate, the sealed record after it). */}
          {view.rows.signature ? (
            <MemoCard section="signature" ariaLabel={COPY.decision}>
              {slots.signature}
            </MemoCard>
          ) : null}
          {view.rows.stress ? (
            <div className="file-scratch" data-section="stress">
              {slots.stress}
            </div>
          ) : null}
          {view.rows.exhibits ? (
            <MemoCard section="exhibits" ariaLabel={COPY.exhibits}>
              {slots.exhibits}
            </MemoCard>
          ) : null}
          {view.rows.monitoring && view.appendix ? (
            <MemoCard section="monitoring" ariaLabel={view.appendix.heading}>
              <Appendix appendix={view.appendix} ctx={ctx} />
            </MemoCard>
          ) : null}
        </div>
      </div>
      <SourcePane source={view.sourceView} dealId={dealId} actions={a} reducedMotion={s.reducedMotion} />
    </div>
  );
}
