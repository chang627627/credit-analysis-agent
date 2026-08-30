import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
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

/** One-line factual summary a finished step's reasoning folds into. */
function stepSummary(step: StepView): string {
  const d = step.result?.data as Record<string, unknown> | unknown[] | undefined;
  switch (step.call?.name) {
    case 'extract_financials':
      return 'Grounded revenue, EBITDA, leverage, coverage and liquidity in the CIM';
    case 'compute_risk_score': {
      const r = d as { score?: number; rating?: string } | undefined;
      return r?.score !== undefined ? `Scored ${r.score}/100 · ${r.rating ?? ''}` : 'Scored the credit';
    }
    case 'benchmark_peers':
      return 'Placed the credit against sector comparables';
    case 'check_covenants': {
      const list = Array.isArray(d) ? (d as { status?: string }[]) : [];
      const breaches = list.filter((c) => c.status === 'breach').length;
      return `Tested ${list.length} covenants · ${breaches} breach${breaches === 1 ? '' : 'es'}`;
    }
    case 'assemble_approval_package':
      return 'Assembled the approval memo';
    case 'propose_restructure': {
      const r = d as { viable?: boolean; contributionM?: number } | undefined;
      return r?.viable ? `Found the minimal cure · $${r.contributionM}M sponsor equity` : 'No cure within policy limits';
    }
    default:
      return 'Reasoned through this step';
  }
}

export function StepCard({
  step,
  cite,
  trace,
  showAllReasoning = false,
}: {
  step: StepView;
  cite?: Cite;
  trace?: TraceTarget | null;
  /** Global "show all reasoning" override (stream-level toggle). */
  showAllReasoning?: boolean;
}) {
  const streamingThought = step.status === 'running' && !step.call;
  const traceTick = trace && step.call?.name === trace.tool ? trace.tick : undefined;
  // collapse-on-complete: finished reasoning folds to a summary + duration
  // chip (the running step stays expanded and streaming)
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const folded = step.status === 'done' && !showAllReasoning && !thinkingOpen;
  const showFoldRow = step.status === 'done' && !showAllReasoning && !!step.thinking;

  return (
    <article className={`step step--${step.status}`} data-tool={step.call?.name}>
      <div className="step__rail">
        <span className="step__dot">
          {step.status === 'done' ? <Check size={12} strokeWidth={2.25} aria-label="done" /> : step.index + 1}
        </span>
      </div>
      <div className="step__main">
        <header className="step__title">{step.title}</header>

        {showFoldRow && (
          <button
            className="step__fold"
            onClick={() => setThinkingOpen((o) => !o)}
            aria-expanded={!folded}
          >
            <span className={`step__foldchev${folded ? '' : ' step__foldchev--open'}`}>
              <ChevronRight size={11} strokeWidth={2} aria-hidden="true" />
            </span>
            {stepSummary(step)}
            {step.result && <span className="step__folddur">{(step.result.durationMs / 1000).toFixed(1)}s</span>}
          </button>
        )}

        {step.thinking && !folded && (
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
