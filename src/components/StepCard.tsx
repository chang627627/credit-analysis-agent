import type { StepView } from '../hooks/useCreditAgent';
import { ToolCallView } from './ToolCallView';
import { Artifact } from './Artifact';
import { FlagPill } from './FlagPill';

export function StepCard({ step }: { step: StepView }) {
  const streamingThought = step.status === 'running' && !step.call;

  return (
    <article className={`step step--${step.status}`}>
      <div className="step__rail">
        <span className="step__dot">{step.status === 'done' ? '✓' : step.index + 1}</span>
      </div>
      <div className="step__main">
        <header className="step__title">{step.title}</header>

        {step.thinking && (
          <p className={`step__thinking${streamingThought ? ' step__thinking--live' : ''}`}>
            {step.thinking}
            {streamingThought && <span className="cursor" />}
          </p>
        )}

        {step.call && <ToolCallView call={step.call} result={step.result} />}

        {step.call && step.result && <Artifact tool={step.call.name} data={step.result.data} />}

        {step.flags.map((f) => (
          <FlagPill key={f.id} flag={f} />
        ))}
      </div>
    </article>
  );
}
