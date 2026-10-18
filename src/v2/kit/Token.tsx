// Token: an agent recommendation word, or the rejected word, always supplied by the model.
import type { MeaningTone } from './types';

export interface TokenProps {
  tone: MeaningTone;
  children: string;
  variant?: 'solid' | 'muted' | 'struck';
}

export function Token({ tone, children, variant = 'solid' }: TokenProps) {
  const cls = ['k-token', 't-token', `k-token--${tone}`];
  if (variant !== 'solid') cls.push('k-token--muted');
  if (variant === 'struck') cls.push('k-token--struck');
  return <span className={cls.join(' ')}>{children}</span>;
}
