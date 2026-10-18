// Chip: a small neutral or accent label ("uploaded", "required", "agent-drafted · unedited").
export interface ChipProps {
  children: string;
  tone?: 'neutral' | 'accent';
}

export function Chip({ children, tone = 'neutral' }: ChipProps) {
  return <span className={tone === 'accent' ? 'k-chip k-chip--accent t-meta' : 'k-chip t-meta'}>{children}</span>;
}
