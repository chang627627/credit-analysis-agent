// ---------------------------------------------------------------------------
// Agent panel · the strip (THREE-PANE.md R4.13, P-40). Below a 900px viewport
// the case file stacks: the memo full width on top, and the agent panel docked
// under it as this always-visible strip (never a drawer, never a toggle, never
// hidden). Built from the same AgentPanelView as the column, no new data:
//   1. the LATEST status line only (the thread's last line, one line, with its
//      trailing link, e.g. "Your countersignature is needed · Decision →");
//   2. while a plan is shown (not started, plan review), the plan as ONE
//      compact row instead of the checklist: "5 steps", each optional step's
//      checkbox with its line ("Peer benchmarks optional"), Start drafting with
//      its kbd, Cancel in plan review, and the countdown line while it runs;
//   3. the composer, exactly as in the column (passed in as `composer`).
// No head row. Pure (handlers in, nothing read from the store), so the kit
// page renders the real thing (as it does VerbRow).
//
// When the compact plan leaves (Start drafting, Cancel, the countdown) with
// keyboard focus inside it, the composer takes focus instead of the body, as
// the column's plan prompt does.
// ---------------------------------------------------------------------------

import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button, Checkbox, LinkButton } from '../../kit';
import type { PlanPromptView, ThreadLine } from '../../model';
import { focusComposerIfLost, heldByKeyboard } from './focus';
import { ChatLine } from './Line';
import type { GoTo } from './Line';
import './chat.css';

export interface StripPlanHandlers {
  onToggleStep: (stepId: string) => void;
  onStart: () => void;
  onCancel: () => void;
  onHold: () => void;
}

export interface AgentStripProps extends StripPlanHandlers {
  /** the thread's last line (AgentPanelView.lines), or null when there is none yet */
  line: ThreadLine | null;
  plan: PlanPromptView | null;
  onGo: GoTo;
  /** the composer: the connected one in the app, a specimen field on the kit page */
  composer: ReactNode;
}

function CompactPlan({ plan, onToggleStep, onStart, onCancel, onHold }: StripPlanHandlers & { plan: PlanPromptView }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const c = plan.compact;
  const countdown = plan.countdown;

  // the row's DOM is still attached when this cleanup runs on unmount, so focus inside it is still
  // visible here; the hand-off waits for the commit. Keyboard only, like the column's plan prompt
  useLayoutEffect(() => {
    const root = rootRef.current;
    return () => {
      const held = document.activeElement;
      if (root && held && root.contains(held) && heldByKeyboard(held)) focusComposerIfLost(root.closest('[data-chat-pane]'));
    };
  }, []);

  return (
    <div ref={rootRef} className="chat-plan chat-plan--compact">
      <p className="chat-plan__summary t-body">
        <span className="chat-plan__count">{c.count}</span>
        {c.optional.map((o) => (
          <span key={o.stepId} className={o.included ? 'chat-plan__opt' : 'chat-plan__opt chat-plan__opt--skipped'}>
            <span className="chat-plan__dot" aria-hidden="true">
              ·
            </span>
            <Checkbox checked={o.included} onChange={() => onToggleStep(o.stepId)} ariaLabel={o.toggleLabel} />
            <span className="chat-plan__optext">{o.text}</span>
          </span>
        ))}
      </p>
      <div className="chat-plan__actions">
        <Button variant="primary" kbd={plan.start.kbd} disabled={plan.start.disabled} onClick={onStart}>
          {plan.start.label}
        </Button>
        {plan.preview ? null : (
          <Button variant="ghost" onClick={onCancel}>
            {plan.cancelLabel}
          </Button>
        )}
      </div>
      {countdown ? (
        <p className="chat-plan__countdown t-meta">
          <span>{countdown.text}</span>
          {countdown.holdLabel ? (
            <>
              <span aria-hidden="true">·</span>
              <LinkButton role="meta" onClick={onHold}>
                {countdown.holdLabel}
              </LinkButton>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

export function AgentStrip({ line, plan, onGo, composer, ...handlers }: AgentStripProps) {
  return (
    <>
      <div className="chat-strip" data-pattern="P-40">
        {line ? <ChatLine line={line} onGo={onGo} as="div" /> : null}
        {plan ? <CompactPlan plan={plan} {...handlers} /> : null}
      </div>
      <div className="chat-foot">{composer}</div>
    </>
  );
}
