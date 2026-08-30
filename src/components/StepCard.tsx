import { Check } from 'lucide-react';
import type { ToolName } from '../agent/types';
import type { StepView } from '../hooks/useCreditAgent';
import { ToolCallView } from './ToolCallView';
import { Artifact } from './Artifact';
import type { Cite } from './Artifact';
import { FlagPill } from './FlagPill';

/** A gate figure being traced back to the tool observation that produced it. */
export interface TraceTarget {
  tool: ToolName;
  tick: number;
}

export function StepCard({ step, cite, trace }: { step: StepView; cite?: Cite; trace?: TraceTarget | null }) {
  const streamingThought = step.status === 'running' && !step.call;
  const traceTick = trace && step.call?.name === trace.tool ? trace.tick : undefined;

  return (
    <article className={`step step--${step.status}`} data-tool={step.call?.name}>
      <div className="step__rail">
        <span className="step__dot">
          {step.status === 'done' ? <Check size={12} strokeWidth={2.25} aria-label="done" /> : step.index + 1}
        </span>
      </div>
      <div className="step__main">
        <header className="step__title">{step.title}</header>

        {step.thinking && (
          <p className={`step__thinking${streamingThought ? ' step__thinking--live' : ''}`}>
            {step.thinking}
            {streamingThought && <span className="cursor" />}
          </p>
        )}

        {step.call && <ToolCallView call={step.call} result={step.result} traceTick={traceTick} />}

        {step.call && step.result && <Artifact tool={step.call.name} data={step.result.data} cite={cite} />}

        {step.flags.map((f) => (
          <FlagPill key={f.id} flag={f} />
        ))}
      </div>
    </article>
  );
}
