// ---------------------------------------------------------------------------
// Agent panel · the plan prompt (THREE-PANE.md R2.1). Plan review only, above
// the composer: one line ("My plan: 5 steps. Peer benchmarks is optional; untick it to skip."),
// the plan as a one-line-per-step checklist (optional steps toggle with their checkbox), one row
// of actions (Start drafting, Cancel) and, while the auto-start countdown runs, one quiet line
// with Hold. Like Claude Code's plan: the intent is approved here, the work shows on the right.
// Start drafting is the panel's one primary (C13). When the prompt leaves
// (Start drafting, Cancel, the countdown) with focus inside it, the composer
// takes focus instead of the body.
// ---------------------------------------------------------------------------

import { useLayoutEffect, useRef } from 'react';
import { Button, Checkbox, LinkButton } from '../../kit';
import type { PlanPromptView } from '../../model';
import { useV2 } from '../../state/store';
import { focusComposerIfLost, heldByKeyboard } from './focus';

export interface PlanPromptProps {
  plan: PlanPromptView;
  dealId: string;
}

export function PlanPrompt({ plan, dealId }: PlanPromptProps) {
  const a = useV2().actions;
  const countdown = plan.countdown;
  const rootRef = useRef<HTMLDivElement>(null);

  // the prompt's DOM is still attached when this cleanup runs on unmount, so focus inside it is
  // still visible here; the hand-off itself waits for the commit. Keyboard only: after a mouse click
  // focus is left where it falls, so the composer is not lit while the analysis runs
  useLayoutEffect(() => {
    const root = rootRef.current;
    return () => {
      const held = document.activeElement;
      if (root && held && root.contains(held) && heldByKeyboard(held)) focusComposerIfLost(root.closest('[data-chat-pane]'));
    };
  }, []);

  return (
    <div ref={rootRef} className="chat-plan">
      <p className="chat-plan__text t-body">{plan.text}</p>
      <ol className="chat-plan__steps">
        {plan.steps.map((st) => (
          <li key={st.id} className={st.included ? 'chat-plan__step' : 'chat-plan__step chat-plan__step--skipped'}>
            {st.optional ? (
              <Checkbox checked={st.included} onChange={() => (plan.preview ? a.togglePreviewStep(dealId, st.id) : a.togglePlanStep(st.id))} ariaLabel={st.toggleLabel} />
            ) : (
              <Checkbox checked locked onChange={() => undefined} ariaLabel={st.title} />
            )}
            <span className="chat-plan__n t-meta">{st.n}</span>
            <span className="chat-plan__title t-body">{st.title}</span>
            <span className="chat-plan__tool t-meta">{st.tool}</span>
          </li>
        ))}
      </ol>
      <div className="chat-plan__actions">
        <Button variant="primary" kbd={plan.start.kbd} disabled={plan.start.disabled} onClick={() => (plan.preview ? a.draftFile(dealId) : a.approvePlan())}>
          {plan.start.label}
        </Button>
        {plan.preview ? null : (
          <Button variant="ghost" onClick={() => a.cancelPlan()}>
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
