// ---------------------------------------------------------------------------
// Plan review, the intent gate (spec §9.2 #1). The checklist draft and the
// unattended auto-start countdown live here, lifted out of any screen, so a
// route switch never re-checks an excluded step or re-arms a held countdown.
//
// The countdown arms only while the live file is on screen with the tab
// visible; leaving or hiding the tab holds it, an open confirm strip (Stop, or
// a start that would close this review) holds it as engagement, and an expiry
// re-checks every condition before calling approvePlan(..., { auto: true }),
// which the engine records as "Plan auto-started · unattended countdown",
// never as approval.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { getPlan } from '../../agent/runAgent';
import { PLAN_COUNTDOWN_S } from '../model';
import type { PlanState, V2Actions, V2Internals, V2Store } from './store';
import { onLiveFile } from './gate';

export function initialPlan(): PlanState {
  return { enabledIds: getPlan().map((p) => p.id), held: false, holdReason: null, deadline: null };
}

/** The plan countdown may run: plan review, not held, the live file on screen, the tab visible. */
function armable(s: V2Store): boolean {
  return s.agent.status === 'plan_review' && !s.plan.held && onLiveFile(s) && s.tabVisible;
}

export type PlanActions = Pick<V2Actions, 'togglePlanStep' | 'holdPlan' | 'approvePlan' | 'cancelPlan'>;

export function createPlanActions(x: V2Internals): PlanActions {
  return {
    // toggling a step is engagement: it holds the countdown ('manual')
    togglePlanStep: (stepId) => {
      const s = x.current();
      if (s.agent.status !== 'plan_review') return;
      const step = s.agent.plan.find((p) => p.id === stepId);
      if (!step || !step.optional) return; // required steps are locked
      x.setPlan((p) => ({
        ...p,
        enabledIds: p.enabledIds.includes(stepId) ? p.enabledIds.filter((id) => id !== stepId) : [...p.enabledIds, stepId],
        held: true,
        holdReason: 'manual',
        deadline: null,
      }));
    },
    holdPlan: () => {
      if (x.current().agent.status !== 'plan_review') return;
      x.setPlan((p) => (p.held && p.holdReason === 'manual' && p.deadline === null ? p : { ...p, held: true, holdReason: 'manual', deadline: null }));
    },
    // approves the plan AS EDITED on screen, never the full plan over an excluded step
    approvePlan: () => {
      const s = x.current();
      if (s.agent.status !== 'plan_review') return;
      x.setPlan((p) => ({ ...p, deadline: null }));
      s.agent.approvePlan([...x.planRef.current.enabledIds]);
    },
    cancelPlan: () => {
      const s = x.current();
      if (s.agent.status !== 'plan_review') return;
      s.agent.cancelPlan();
    },
  };
}

export function usePlanEffects(s: V2Store, x: V2Internals): void {
  const status = s.agent.status;

  // entering plan review starts a fresh draft; leaving it resets everything
  const prevStatus = useRef(status);
  useEffect(() => {
    const was = prevStatus.current;
    if (was === status) return;
    prevStatus.current = status;
    if (status === 'plan_review') {
      x.setPlan({ enabledIds: x.current().agent.plan.map((p) => p.id), held: false, holdReason: null, deadline: null });
    } else if (was === 'plan_review') {
      x.setPlan(initialPlan());
    }
  }, [status, x]);

  // arm while armable; leaving the file or hiding the tab while armed holds it,
  // and an open confirm strip holds it instead of arming (a palette start
  // navigates to the file and opens its strip in the same tick)
  const canArm = armable(s);
  const inReview = status === 'plan_review';
  const confirmOpen = s.ui.confirm !== null;
  useEffect(() => {
    if (!inReview) return;
    const p = x.planRef.current;
    if (p.held) return;
    if (canArm) {
      if (x.uiRef.current.confirm !== null) {
        x.setPlan({ ...p, held: true, holdReason: 'manual', deadline: null });
        return;
      }
      if (p.deadline === null) {
        x.setPlan({ ...p, deadline: Date.now() + PLAN_COUNTDOWN_S(x.current().agent.speed) * 1000 });
      }
      return;
    }
    if (p.deadline === null) return; // never armed (gate reached off-file): wait for the file to open
    const c = x.current();
    x.setPlan({ ...p, held: true, holdReason: onLiveFile(c) ? 'hidden' : 'left', deadline: null });
  }, [canArm, inReview, confirmOpen, s.plan.held, s.plan.deadline, x]);

  // the expiry re-checks every arming condition, then starts the plan as edited, unattended
  const deadline = s.plan.deadline;
  useEffect(() => {
    if (!inReview || deadline === null) return;
    const id = window.setTimeout(() => {
      const c = x.current();
      if (c.plan.deadline !== deadline) return;
      if (!armable(c)) return;
      if (c.ui.confirm !== null) {
        x.setPlan({ ...c.plan, held: true, holdReason: 'manual', deadline: null });
        return;
      }
      x.setPlan({ ...c.plan, deadline: null });
      c.agent.approvePlan([...c.plan.enabledIds], { auto: true });
    }, Math.max(0, deadline - Date.now()));
    return () => window.clearTimeout(id);
  }, [inReview, deadline, x]);
}
