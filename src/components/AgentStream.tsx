import { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import type { StepView } from '../hooks/useCreditAgent';
import type { Cite } from './Artifact';
import type { TraceTarget } from './StepCard';
import { StepCard } from './StepCard';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The live transcript of the agent loop. Follows the newest output — but only
 * while the reader is at the bottom. Scroll up to inspect an earlier step and
 * the stream stops yanking the viewport; a floating "live" pill offers the way
 * back. (Pin-to-bottom-only-when-pinned, the way mature agent UIs behave.)
 */
export function AgentStream({
  steps,
  cite,
  trace,
}: {
  steps: StepView[];
  cite?: Cite;
  /** Bumped when a gate figure is traced: scroll to + open its tool inspector. */
  trace?: TraceTarget | null;
}) {
  const streamRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const nearBottomRef = useRef(true);
  const seenStepsRef = useRef(0);
  const [awayUnseen, setAwayUnseen] = useState<number | null>(null); // null = pinned

  // watch the actual scroll container (.workspace__scroll owns the scrolling)
  useEffect(() => {
    const el = streamRef.current?.closest('.workspace__scroll') as HTMLElement | null;
    containerRef.current = el;
    if (!el) return;
    const onScroll = () => {
      nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (nearBottomRef.current) {
        seenStepsRef.current = steps.length;
        setAwayUnseen(null);
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);

  // While pinned, follow with an INSTANT jump (scrollTop = scrollHeight): a
  // smooth animation here reads its own in-flight frames as "the reader
  // scrolled up" and can silently unpin mid-run. Smooth is reserved for the
  // one-shot trace jump below.
  useEffect(() => {
    if (steps.length === 0) {
      seenStepsRef.current = 0;
      setAwayUnseen(null);
      return;
    }
    const el = containerRef.current;
    if (nearBottomRef.current && el) {
      seenStepsRef.current = steps.length;
      el.scrollTop = el.scrollHeight;
    } else if (!nearBottomRef.current) {
      setAwayUnseen(steps.length - seenStepsRef.current);
    }
  }, [steps]);

  // trace-to-source: jump to the (last) step whose tool produced the figure
  useEffect(() => {
    if (!trace) return;
    const matches = streamRef.current?.querySelectorAll<HTMLElement>(`article[data-tool="${trace.tool}"]`);
    const target = matches && matches.length > 0 ? matches[matches.length - 1] : null;
    target?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' });
  }, [trace]);

  // "Show all reasoning" — persisted preference over the collapse-on-complete
  // default (finished thinking folds to a summary chip)
  const [showAllReasoning, setShowAllReasoning] = useState(() => {
    try {
      return localStorage.getItem('showReasoning') === '1';
    } catch {
      return false;
    }
  });
  const toggleReasoning = () => {
    setShowAllReasoning((v) => {
      try {
        localStorage.setItem('showReasoning', v ? '0' : '1');
      } catch {
        /* private mode */
      }
      return !v;
    });
  };
  const anyDone = steps.some((s) => s.status === 'done');

  const streaming = steps.some((s) => s.status === 'running');
  const showPill = awayUnseen !== null && streaming;

  const jumpToLive = () => {
    seenStepsRef.current = steps.length;
    setAwayUnseen(null);
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight; // instant — lands pinned, no race
  };

  return (
    <div className="stream" ref={streamRef}>
      {anyDone && (
        <div className="stream__tools">
          <button className="linkbtn" onClick={toggleReasoning} aria-pressed={showAllReasoning}>
            {showAllReasoning ? 'fold finished reasoning' : 'show all reasoning'}
          </button>
        </div>
      )}
      {steps.map((s) => (
        <StepCard key={s.id} step={s} cite={cite} trace={trace} showAllReasoning={showAllReasoning} />
      ))}
      {showPill && (
        <button className="stream__live" onClick={jumpToLive}>
          <ArrowDown size={11} strokeWidth={2} aria-hidden="true" /> live
          {awayUnseen ? ` · ${awayUnseen} new step${awayUnseen > 1 ? 's' : ''}` : ''}
        </button>
      )}
      <div ref={endRef} />
    </div>
  );
}
