// ---------------------------------------------------------------------------
// Case file · the agent panel (THREE-PANE.md R2.1, R3, R4.13, §1.8). Command
// and control only, like a coding agent's conversation. It never displays data
// and holds no decision: every number, record and the whole decision (the
// Decision card) live in the memo pane. Renders selectAgentPanel verbatim, in
// one of two layouts the shell picks from the viewport:
//
//   column (900px and up): the case file's middle pane. The head, one-line
//     status lines that point at the memo, the plan checklist with Start
//     drafting as a message after them (the conversation runs top-down, as in
//     Claude Code), and the composer pinned to the foot.
//   strip (below 900px, R4.13): docked under the memo, always visible. No
//     head; the latest status line only, the plan as one compact row while a
//     plan is shown, and the same composer (AgentStrip).
//
// The shell mounts this keyed by the deal, so the thread's follow state resets
// on a file switch by design. Crossing 900px re-renders it in the other layout
// (the shell moves it to the other side of the memo pane, so the DOM order
// follows the screen); the composer's draft lives in the store, so nothing
// typed is lost, and focus held inside the panel moves to the matching control
// of the new layout, the composer's caret included (focus.ts carryFocusFrom /
// restoreCarriedFocus, noted just before the swap, R4.14).
// ---------------------------------------------------------------------------

import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { COPY, selectAgentPanel, stripLineOf } from '../../model';
import type { ChatPaneProps } from '../../state/screens';
import { onBeforeLayoutSwap } from '../../state/panes';
import { useV2 } from '../../state/store';
import { AgentStrip } from './AgentStrip';
import { ChatHead } from './ChatHead';
import { Composer } from './Composer';
import { Button } from '../../kit';
import { carryFocusFrom, restoreCarriedFocus } from './focus';
import { useGoTo } from './go';
import { PlanPrompt } from './PlanPrompt';
import { Thread } from './Thread';
import './chat.css';

export function ChatPane({ dealId, layout }: ChatPaneProps) {
  const s = useV2();
  const a = s.actions;
  const headingId = useId();
  const go = useGoTo(dealId);
  // a composer send re-pins the thread and jumps to its foot
  const [sendSeq, setSendSeq] = useState(0);
  const onSent = useCallback(() => setSendSeq((n) => n + 1), []);
  const paneRef = useRef<HTMLElement>(null);

  // R4.14: focus survives the 900px swap: noted just before it (the old layout's DOM still on the
  // page), given back after the commit in the new layout
  useLayoutEffect(() => onBeforeLayoutSwap(() => carryFocusFrom(paneRef.current, dealId, layout)), [dealId, layout]);
  useLayoutEffect(() => {
    restoreCarriedFocus(paneRef.current, dealId, layout);
  }, [dealId, layout]);

  const view = selectAgentPanel(s, dealId);
  const strip = layout === 'strip';
  const plan = view.plan;
  const composer = <Composer dealId={dealId} composer={view.composer} onSent={onSent} />;

  return (
    <aside ref={paneRef} className="chat-pane" data-chat-pane="" data-layout={layout} data-pattern="P-22" aria-label={COPY.agentPanel}>
      {strip ? null : <ChatHead heading={view.title} headingId={headingId} />}
      {strip ? (
        <AgentStrip
          line={stripLineOf(view.lines)}
          plan={plan}
          onGo={go}
          onToggleStep={(stepId) => (plan && plan.preview ? a.togglePreviewStep(dealId, stepId) : a.togglePlanStep(stepId))}
          onStart={() => (plan && plan.preview ? a.draftFile(dealId) : a.approvePlan())}
          onCancel={() => a.cancelPlan()}
          onHold={() => a.holdPlan()}
          composer={composer}
        />
      ) : (
        <>
          <Thread dealId={dealId} lines={view.lines} labelledBy={headingId} sendSeq={sendSeq}>
            {view.start ? (
              <div className="chat-plan">
                <div className="chat-plan__actions">
                  <Button variant="primary" kbd={view.start.kbd} onClick={() => a.startFile(dealId)} disabled={view.start.disabled}>
                    {view.start.label}
                  </Button>
                </div>
              </div>
            ) : null}
            {plan ? <PlanPrompt plan={plan} dealId={dealId} /> : null}
          </Thread>
          <div className="chat-foot">{composer}</div>
        </>
      )}
    </aside>
  );
}
