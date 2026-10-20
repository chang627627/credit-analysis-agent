// ---------------------------------------------------------------------------
// Plan review, the intent gate (spec §9.2 #1). The checklist draft and the
// unattended auto-start countdown live here, lifted out of any screen, so a
// route switch never re-checks an excluded step or re-arms a held countdown.
//
// The countdown arms only while the live file is on screen with the tab
// visible AND the plan prompt itself is shown (it lives in the agent panel,
// THREE-PANE.md §1.5, R2.1; the memo shows the steps as skeleton cards);
// leaving, hiding the tab or hiding the panel holds it, an open confirm
// strip (Stop, or a start that would close this review) holds it as
// engagement, and an expiry re-checks every condition before calling
// approvePlan(..., { auto: true }), which the engine records as "Plan
// auto-started · unattended countdown", never as approval. A plan can never
// auto-start where the reviewer cannot see or edit it.
//
// A compound start ("draft without peer benchmarks", state/files.ts) rides
// x.pendingPlanToggle: the plan review it opens shows that step already off,
// with the countdown held, so nothing starts unseen.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { getPlan } from '../../agent/runAgent';
import type { PlanStep } from '../../agent/types';
import { PLAN_COUNTDOWN_S, chatShown, selectLiveDealId } from '../model';
import type { PlanState, V2Actions, V2Internals, V2Store } from './store';
import { composerEngaged, onLiveFile } from './gate';

export function initialPlan(): PlanState {
  return { enabledIds: getPlan().map((p) => p.id), held: false, holdReason: null, deadline: null };
}

/**
 * The plan's enabled ids with one optional step switched on or off (plan
 * order kept). Required steps are locked, so a toggle on one changes nothing.
 */
export function withToggle(plan: PlanStep[], ids: string[], toggle: { stepId: string; include: boolean }): string[] {
  const step = plan.find((p) => p.id === toggle.stepId);
  if (!step || !step.optional) return ids;
  return plan.map((p) => p.id).filter((id) => (id === toggle.stepId ? toggle.include : ids.includes(id)));
}

/** The plan countdown may run: plan review, not held, the live file on screen with its plan prompt shown, the tab visible. */
function armable(s: V2Store): boolean {
  return s.agent.status === 'plan_review' && !s.plan.held && onLiveFile(s) && chatShown(s) && s.tabVisible;
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

  // entering plan review starts a fresh draft (or applies a compound start's toggle, held);
  // leaving it resets everything
  const prevStatus = useRef(status);
  useEffect(() => {
    const was = prevStatus.current;
    if (was === status) return;
    prevStatus.current = status;
    if (status === 'plan_review') {
      const c = x.current();
      const plan = c.agent.plan;
      const ids = plan.map((p) => p.id);
      const pending = x.pendingPlanToggle.current;
      if (pending && pending.dealId === selectLiveDealId(c)) {
        x.pendingPlanToggle.current = null;
        x.setPlan({ enabledIds: withToggle(plan, ids, pending), held: true, holdReason: 'manual', deadline: null });
      } else {
        x.setPlan({ enabledIds: ids, held: false, holdReason: null, deadline: null });
      }
    } else if (was === 'plan_review') {
      x.setPlan(initialPlan());
    }
  }, [status, x]);

  // arm while armable; leaving the file, hiding the tab or hiding the panel while
  // armed holds it, and an open confirm strip holds it instead of arming (a
  // palette start navigates to the file and opens its strip in the same tick)
  const canArm = armable(s);
  const inReview = status === 'plan_review';
  const confirmOpen = s.ui.confirm !== null;
  const drafting = composerEngaged(s);
  useEffect(() => {
    if (!inReview) return;
    const p = x.planRef.current;
    if (p.held) return;
    if (canArm) {
      // an open strip, or unsent text in the live file's composer, is engagement: hold, never arm
      if (x.uiRef.current.confirm !== null || composerEngaged(x.current())) {
        x.setPlan({ ...p, held: true, holdReason: 'manual', deadline: null });
        return;
      }
      if (p.deadline === null) {
        x.setPlan({ ...p, deadline: Date.now() + PLAN_COUNTDOWN_S(x.current().agent.speed) * 1000 });
      }
      return;
    }
    if (p.deadline === null) return; // never armed (off-file, or the panel hidden): wait, unheld, until it shows
    const c = x.current();
    x.setPlan({ ...p, held: true, holdReason: onLiveFile(c) ? 'hidden' : 'left', deadline: null });
  }, [canArm, inReview, confirmOpen, drafting, s.plan.held, s.plan.deadline, x]);

  // the expiry re-checks every arming condition, then starts the plan as edited, unattended
  const deadline = s.plan.deadline;
  useEffect(() => {
    if (!inReview || deadline === null) return;
    const id = window.setTimeout(() => {
      const c = x.current();
      if (c.plan.deadline !== deadline) return;
      if (!armable(c)) return;
      if (c.ui.confirm !== null || composerEngaged(c)) {
        x.setPlan({ ...c.plan, held: true, holdReason: 'manual', deadline: null });
        return;
      }
      x.setPlan({ ...c.plan, deadline: null });
      c.agent.approvePlan([...c.plan.enabledIds], { auto: true });
    }, Math.max(0, deadline - Date.now()));
    return () => window.clearTimeout(id);
  }, [inReview, deadline, x]);
}
