import { useEffect, useRef } from 'react';
import type { StepView } from '../hooks/useCreditAgent';
import type { Cite } from './Artifact';
import { StepCard } from './StepCard';

/** The live transcript of the agent loop. Auto-follows the newest output. */
export function AgentStream({ steps, cite }: { steps: StepView[]; cite?: Cite }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [steps]);

  return (
    <div className="stream">
      {steps.map((s) => (
        <StepCard key={s.id} step={s} cite={cite} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
