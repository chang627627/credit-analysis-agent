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
// Live drafting (like an artifact being written): before Start drafting the
// memo is its header alone; a card appears when its step starts (rising in
// once), shows the one drafting line and caret, then writes itself in when its
// step returns (takeaway, blocks, rows, flags, record line, one stagger apart).
// While drafting, the pane follows the card being written until the reviewer
// takes over (scrolls, presses into another card, follows a link or cue);
// "Go to drafting" in the doc bar (shown only then) resumes following. The cards
// already on the page when a file opens never animate.
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

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Caret, EmptyNote, LinkButton, MemoCard, SectionHead, StatusLabel } from '../../kit';
import { COPY, CUE_HOLD_MS, isRowAnchor, selectFile } from '../../model';
import type { FileView, MemoSection, SectionAside, SectionView } from '../../model';
import { CardFlags, CardFooter } from './CardFoot';
import { useV2 } from '../../state/store';
import type { V2Actions } from '../../state/store';
import type { FileScreenProps } from '../../state/screens';
import { cssMs } from '../../state/ui';
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
/** While following, the card being written keeps this much canvas under it. */
const FOLLOW_FOOT = 24;
/** A downward wheel takes over only with more memo than this below the view (not just the foot's padding). */
const FOLLOW_SLACK = 96;
/** Scroll events this soon after the follow (or a cue) scrolled are its own glide, not the reviewer. */
const OWN_SCROLL_MS = 1000;
/** After the reviewer takes over, a re-follow waits for that gesture to settle. */
const REFOLLOW_AFTER_MS = 400;
/** A write-in lasts at most this many --dur-stagger steps (blocks, rows, flags, the record line) plus --dur-2. */
const REVEAL_STEPS = 22;

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

function SectionBody(props: { sec: SectionView; ctx: FileCtx; reveal: boolean }) {
  const { sec, ctx, reveal } = props;
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
  return (
    <div className="file-secbody" data-reveal={reveal ? '' : undefined}>
      {body}
    </div>
  );
}

/**
 * One section card. `arrived`: the memo had already rendered when this card mounted, so its step
 * started while you watched and the card rises in once. A card that drafted on this page (or
 * arrived already set) writes itself in when its step returns, once; the cards already on the page
 * when the file opened stay still.
 */
function SectionCard(props: { sec: SectionView; ctx: FileCtx; arrived: boolean }) {
  const { sec, ctx, arrived } = props;
  const [enter] = useState(arrived);
  // remember, across renders, that this card was seen drafting (React's "previous render" pattern)
  const [sawDrafting, setSawDrafting] = useState(sec.phase === 'drafting');
  if (sec.phase === 'drafting' && !sawDrafting) setSawDrafting(true);
  // the write-in is one-shot: once it has played, the card is an ordinary card again (a row flash
  // must win over the reveal's animation); a card that drafts again writes itself in again
  const [revealDone, setRevealDone] = useState(false);
  if (sec.phase === 'drafting' && revealDone) setRevealDone(false);
  const reveal = sec.phase === 'set' && (sawDrafting || enter) && !revealDone;
  useEffect(() => {
    if (!reveal) return;
    const t = window.setTimeout(() => setRevealDone(true), cssMs('--dur-2') + REVEAL_STEPS * cssMs('--dur-stagger') + 100);
    return () => window.clearTimeout(t);
  }, [reveal]);
  return (
    <MemoCard section={sec.id} ariaLabel={sec.heading} enter={enter} reveal={reveal}>
      <SectionHead
        eyebrow={sec.eyebrow}
        heading={sec.heading}
        takeaway={sec.takeaway}
        aside={sec.aside ? <Aside aside={sec.aside} /> : null}
        anchorId={sec.anchorId}
        flashKey={ctx.flashKeyOf(sec.anchorId)}
        highlighted={ctx.isHighlighted(sec.anchorId)}
      />
      <SectionBody sec={sec} ctx={ctx} reveal={reveal} />
      {sec.flagLines.length > 0 ? <CardFlags lines={sec.flagLines} ctx={ctx} reveal={reveal} /> : null}
      {/* keyed by run, so a re-run opens with every Record collapsed again */}
      {sec.footer ? <CardFooter key={`${ctx.view.runId ?? 'none'}:${sec.footer.record.stepId}`} footer={sec.footer} reveal={reveal} /> : null}
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

  // ---- live drafting state (THREE-PANE R3) ----------------------------------------------------
  // the card being written: the one drafting card while this file's run drafts (the model keeps
  // exactly one while the run is live)
  const running = view !== null && view.live && view.mode === 'running';
  const frontier = running ? view.sections.find((sec) => sec.phase === 'drafting')?.id ?? null : null;
  const runningRef = useRef(running);
  runningRef.current = running;
  const frontierRef = useRef(frontier);
  frontierRef.current = frontier;
  const lastFrontier = useRef<string | null>(frontier);
  if (frontier) lastFrontier.current = frontier;
  // following: the pane keeps the card being written in view until the reviewer takes over. A run
  // that starts here turns it back on, and so does "Go to drafting"; opening the file at a target
  // (a link) starts with it off.
  const [following, setFollowing] = useState(at === null);
  const followingRef = useRef(following);
  followingRef.current = following;
  const tookOverAt = useRef(0);
  const ownScrollUntil = useRef(0);
  const takeOver = useCallback(() => {
    if (!followingRef.current) return;
    followingRef.current = false;
    tookOverAt.current = performance.now();
    setFollowing(false);
  }, []);
  const follow = useCallback(() => {
    followingRef.current = true;
    setFollowing(true);
  }, []);
  /** A navigation the reviewer asked for (a panel link, J / K, a trace, a link into the file): while
      drafting it takes over, unless it targets the card being written. */
  const navTakeOver = useCallback(
    (section: string) => {
      ownScrollUntil.current = performance.now() + OWN_SCROLL_MS;
      if (runningRef.current && section !== frontierRef.current) takeOver();
    },
    [takeOver],
  );

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
      navTakeOver(section);
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
    [query, cue, navTakeOver],
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
    if (!el) return;
    navTakeOver(at);
    el.scrollIntoView({ block: 'start', behavior: scrollBehavior(first, reducedRef.current) });
  }, [dealId, at, navSeq, query, navTakeOver]);

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

  // ---- live drafting ---------------------------------------------------------------------------
  // `settled`: the memo has rendered once, so a card that mounts from now on arrived while you
  // watched (FileScreen is keyed by the file, so opening another file starts unsettled again).
  const [settled, setSettled] = useState(false);
  useEffect(() => setSettled(true), []);

  const wasRunning = useRef(running);
  useEffect(() => {
    const was = wasRunning.current;
    wasRunning.current = running;
    if (running && !was) {
      follow();
      return;
    }
    // the run reached the gate while you were following: settle on the last card written from its
    // head (the recommendation on the first pass, with the Decision card right under it; the
    // revision after a send-back, which reads before the recommendation it changed)
    if (!running && was && followingRef.current && viewRef.current?.mode === 'gate') {
      const sc = canvasRef.current;
      const id = lastFrontier.current;
      const el = sc && id ? sc.querySelector<HTMLElement>(`[data-section="${esc(id)}"]`) : null;
      if (sc && el) {
        const v = sc.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        if (r.bottom > v.bottom - FOLLOW_FOOT) {
          sc.scrollTo({ top: sc.scrollTop + r.top - (v.top + CARD_SCROLL_MARGIN), behavior: scrollBehavior(false, reducedRef.current) });
        }
      }
    }
  }, [running, follow]);

  // The reviewer takes over while the run drafts:
  //   - a wheel or touch scroll that can move the memo (downward only with real memo below the view,
  //     never the foot's padding, so wheeling toward the card being written keeps following);
  //   - a scroll the follow did not make that goes up, or carries the card being written above the
  //     view (scroll keys, the scrollbar, focus moving);
  //   - a press inside any card but the one being written (its Record, a link, selecting text);
  //   - a memo cue or a link into the file (navTakeOver above).
  // Scrolling back down until the card being written sits whole in view picks it up again once the
  // gesture that took over has settled; "Go to drafting" always does.
  useEffect(() => {
    const sc = canvasRef.current;
    if (!sc || !running) return;
    const frontierEl = () => {
      const id = frontierRef.current;
      return id ? sc.querySelector<HTMLElement>(`[data-section="${esc(id)}"]`) : null;
    };
    const onWheel = (e: WheelEvent) => {
      const room = sc.scrollHeight - sc.clientHeight - sc.scrollTop;
      if (e.deltaY < 0 ? sc.scrollTop > 0 : e.deltaY > 0 && room > FOLLOW_SLACK) takeOver();
    };
    const onTouch = () => takeOver();
    const onPointer = (e: PointerEvent) => {
      const t = e.target;
      const card = t instanceof Element ? t.closest('[data-section]') : null;
      if (card && card.getAttribute('data-section') !== frontierRef.current) takeOver();
    };
    let lastTop = sc.scrollTop;
    const onScroll = () => {
      const top = sc.scrollTop;
      const down = top > lastTop;
      const up = top < lastTop;
      lastTop = top;
      const now = performance.now();
      const v = sc.getBoundingClientRect();
      const bandTop = v.top + CARD_SCROLL_MARGIN;
      if (followingRef.current) {
        if (now < ownScrollUntil.current) return;
        if (up) takeOver();
        else if (down) {
          const el = frontierEl();
          if (el && el.getBoundingClientRect().top < bandTop - 8) takeOver();
        }
        return;
      }
      if (!down || now - tookOverAt.current < REFOLLOW_AFTER_MS) return;
      const el = frontierEl();
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top >= bandTop - 2 && r.bottom <= v.bottom) follow();
    };
    sc.addEventListener('wheel', onWheel, { passive: true });
    sc.addEventListener('touchmove', onTouch, { passive: true });
    sc.addEventListener('pointerdown', onPointer);
    sc.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      sc.removeEventListener('wheel', onWheel);
      sc.removeEventListener('touchmove', onTouch);
      sc.removeEventListener('pointerdown', onPointer);
      sc.removeEventListener('scroll', onScroll);
    };
  }, [running, takeOver, follow]);

  // follow: when a card starts (the frontier moves) or grows, show it whole with a little canvas
  // under it; a card taller than the view shows from its head. Opening a file mid-run jumps there
  // (no long glide down a freshly mounted memo); every later move glides.
  const openedRunning = useRef(running);
  const followMoved = useRef(false);
  useLayoutEffect(() => {
    if (!frontier || !following) return;
    const sc = canvasRef.current;
    const el = query(`[data-section="${esc(frontier)}"]`);
    if (!sc || !el) return;
    let instant = openedRunning.current && !followMoved.current;
    followMoved.current = true;
    const bring = () => {
      const v = sc.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const top = v.top + CARD_SCROLL_MARGIN;
      const bottom = v.bottom - FOLLOW_FOOT;
      let dy = 0;
      if (r.height > bottom - top || r.top < top) dy = r.top - top;
      else if (r.bottom > bottom) dy = r.bottom - bottom;
      if (Math.abs(dy) < 1) return;
      ownScrollUntil.current = performance.now() + OWN_SCROLL_MS;
      sc.scrollTo({ top: sc.scrollTop + dy, behavior: scrollBehavior(instant, reducedRef.current) });
    };
    bring();
    instant = false;
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(bring);
    ro.observe(el);
    return () => ro.disconnect();
  }, [frontier, following, query]);

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
    follow();
    const target = view.sections.find((sec) => sec.phase === 'drafting');
    if (!target) return;
    const el = query(`[data-section="${esc(target.id)}"]`);
    ownScrollUntil.current = performance.now() + OWN_SCROLL_MS;
    if (el) el.scrollIntoView({ block: 'start', behavior: 'auto' });
  };

  return (
    <div ref={rootRef} className="file" data-source={view.sourceView.open ? 'open' : 'closed'}>
      <div ref={canvasRef} className="file-canvas">
        <DocBar
          docBar={following && running ? { ...view.docBar, goToDrafting: false } : view.docBar}
          source={view.sourceView}
          dealId={dealId}
          actions={a}
          onGoToDrafting={goToDrafting}
        />
        <div className="file-content">
          <PageHeader header={view.header} ctx={ctx} />
          {view.sections.map((sec) => (
            <SectionCard key={sec.id} sec={sec} ctx={ctx} arrived={settled} />
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
          {/* the Portfolio Monitor's appendix arrives with the package; a link from the Book
              (at=monitoring) shows it on a file that has none yet */}
          {(view.rows.monitoring || at === 'monitoring') && view.appendix ? (
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
