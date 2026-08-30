import { Check } from 'lucide-react';
import type { PlanStep } from '../agent/types';
import type { StepView } from '../hooks/useCreditAgent';

/**
 * Horizontal progress tracker for the agent's plan — pending / active / done.
 * Keyed by runId in App so the item cascade fires once per run; a reviewer
 * send-back appends a rework item that slides in. (A connective progress line
 * beneath the items was tried and rejected — at 100% it read as a stray rule.)
 */
export function PlanBar({ plan, steps }: { plan: PlanStep[]; steps: StepView[] }) {
  const doneCount = steps.filter((s) => s.status === 'done').length;
  const runnable = plan.filter((p) => !p.skipped).length;

  return (
    <div className="plan">
      <div className="plan__head">
        <span className="plan__title">Plan</span>
        <span className="plan__count">
          {doneCount}/{runnable} steps
        </span>
      </div>
      <ol className="plan__list">
        {plan.map((p, i) => {
          const sv = steps.find((s) => s.id === p.id);
          const cls = p.skipped ? 'skipped' : sv?.status === 'done' ? 'done' : sv ? 'active' : 'pending';
          const rework = p.id.startsWith('step_rework') ? ' plan__item--rework' : '';
          return (
            <li
              key={p.id}
              className={`plan__item plan__item--${cls}${rework}`}
              style={{ '--i': i } as React.CSSProperties}
              title={p.skipped ? 'Excluded at plan review' : undefined}
            >
              <span className="plan__num">
                {cls === 'done' ? <Check size={11} strokeWidth={2.5} aria-label="done" /> : p.skipped ? '–' : i + 1}
              </span>
              <span className="plan__label">{p.title}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
