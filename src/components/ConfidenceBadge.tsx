import { confidenceBucket } from '../agent/util';

/** Color-coded model-confidence chip. Low confidence is a first-class signal here. */
export function ConfidenceBadge({ value }: { value: number }) {
  const bucket = confidenceBucket(value);
  return (
    <span className={`conf conf--${bucket}`} title={`Model confidence ${(value * 100).toFixed(0)}%`}>
      {(value * 100).toFixed(0)}%
    </span>
  );
}
