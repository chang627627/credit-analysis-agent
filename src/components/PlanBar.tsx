import type { PlanStep } from '../agent/types';
import type { StepView } from '../hooks/useCreditAgent';

/** Horizontal progress tracker for the agent's plan — pending / active / done. */
export function PlanBar({ plan, steps }: { plan: PlanStep[]; steps: StepView[] }) {
  const doneCount = steps.filter((s) => s.status === 'done').length;

  return (
    <div className="plan">
      <div className="plan__head">
        <span className="plan__title">Plan</span>
        <span className="plan__count">
          {doneCount}/{plan.length} steps
        </span>
      </div>
      <ol className="plan__list">
        {plan.map((p, i) => {
          const sv = steps.find((s) => s.id === p.id);
          const cls = sv?.status === 'done' ? 'done' : sv ? 'active' : 'pending';
          return (
            <li key={p.id} className={`plan__item plan__item--${cls}`}>
              <span className="plan__num">{cls === 'done' ? '✓' : i + 1}</span>
              <span className="plan__label">{p.title}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
