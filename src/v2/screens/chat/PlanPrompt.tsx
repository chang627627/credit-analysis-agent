// ---------------------------------------------------------------------------
// Agent panel · the plan prompt (THREE-PANE.md R2.1). Plan review only, above
// the composer: one line ("I'll draft 5 steps. Peer benchmarks is optional."),
// one row of actions (Start drafting, Skip / Include the optional step,
// Cancel) and, while the auto-start countdown runs, one quiet line with Hold.
// The step list itself is shown on the right (the memo's skeleton cards).
// Start drafting is the panel's one primary (C13). When the prompt leaves
// (Start drafting, Cancel, the countdown) with focus inside it, the composer
// takes focus instead of the body.
// ---------------------------------------------------------------------------

import { useLayoutEffect, useRef } from 'react';
import { Button, LinkButton } from '../../kit';
import type { PlanPromptView } from '../../model';
import { useV2 } from '../../state/store';
import { focusComposerIfLost } from './focus';

export interface PlanPromptProps {
  plan: PlanPromptView;
}

export function PlanPrompt({ plan }: PlanPromptProps) {
  const a = useV2().actions;
  const optional = plan.optional;
  const countdown = plan.countdown;
  const rootRef = useRef<HTMLDivElement>(null);

  // the prompt's DOM is still attached when this cleanup runs on unmount, so focus inside it is
  // still visible here; the hand-off itself waits for the commit
  useLayoutEffect(() => {
    const root = rootRef.current;
    return () => {
      const held = document.activeElement;
      if (root && held && root.contains(held)) focusComposerIfLost(root.closest('[data-chat-pane]'));
    };
  }, []);

  return (
    <div ref={rootRef} className="chat-plan">
      <p className="chat-plan__text t-body">{plan.text}</p>
      <div className="chat-plan__actions">
        <Button variant="primary" kbd={plan.start.kbd} disabled={plan.start.disabled} onClick={() => a.approvePlan()}>
          {plan.start.label}
        </Button>
        {optional ? (
          <Button variant="secondary" onClick={() => a.togglePlanStep(optional.stepId)}>
            {optional.label}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={() => a.cancelPlan()}>
          {plan.cancelLabel}
        </Button>
      </div>
      {countdown ? (
        <p className="chat-plan__countdown t-meta">
          <span>{countdown.text}</span>
          {countdown.holdLabel ? (
            <>
              <span aria-hidden="true">·</span>
              <LinkButton role="meta" onClick={() => a.holdPlan()}>
                {countdown.holdLabel}
              </LinkButton>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
