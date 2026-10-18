// StatusGlyph / StatusLabel: the closed status vocabulary of §5. Screens pass a StatusKey and
// model-supplied words; they never pick a glyph or a tone themselves. The glyph box is 16×16.
import { Check, CircleSlash, CornerUpLeft, Info, OctagonAlert, PenLine, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import type { LucideIcon, StatusKey, TextTone } from './types';

type GlyphSpec =
  | { shape: 'ring' | 'bar' | 'dot' | 'dash'; tone: TextTone }
  | { shape: 'icon'; icon: LucideIcon; tone: TextTone };

export const GLYPHS: Record<StatusKey, GlyphSpec> = {
  pending: { shape: 'ring', tone: 'ink-3' },
  drafting: { shape: 'bar', tone: 'accent' },
  awaiting: { shape: 'dot', tone: 'accent' },
  done: { shape: 'icon', icon: Check, tone: 'ink-2' },
  pass: { shape: 'icon', icon: Check, tone: 'good' },
  watch: { shape: 'icon', icon: TriangleAlert, tone: 'warn' },
  breach: { shape: 'icon', icon: OctagonAlert, tone: 'bad' },
  info: { shape: 'icon', icon: Info, tone: 'ink-2' },
  returned: { shape: 'icon', icon: CornerUpLeft, tone: 'warn' },
  rejected: { shape: 'icon', icon: X, tone: 'bad' },
  signed: { shape: 'icon', icon: PenLine, tone: 'ink' },
  'signed-auto': { shape: 'icon', icon: ShieldCheck, tone: 'ink-2' },
  'signed-over': { shape: 'icon', icon: Check, tone: 'ink-3' },
  acknowledged: { shape: 'icon', icon: Check, tone: 'ink-3' },
  resolved: { shape: 'icon', icon: Check, tone: 'ink-3' },
  excluded: { shape: 'dash', tone: 'ink-3' },
  cancelled: { shape: 'icon', icon: CircleSlash, tone: 'ink-3' },
  error: { shape: 'icon', icon: OctagonAlert, tone: 'bad' },
};

const TONE_CLASS: Record<TextTone, string> = {
  ink: 'k-tone-ink',
  'ink-2': 'k-tone-ink2',
  'ink-3': 'k-tone-ink3',
  accent: 'k-tone-accent',
  good: 'k-tone-good',
  warn: 'k-tone-warn',
  bad: 'k-tone-bad',
};

/** Text-tone class for kit internals (shared by sibling primitives). */
export const toneClass = (tone: TextTone): string => TONE_CLASS[tone];

/** States whose label text recedes to ink-3. */
const QUIET: ReadonlySet<StatusKey> = new Set<StatusKey>([
  'pending', 'excluded', 'signed-over', 'acknowledged', 'resolved', 'cancelled',
]);

export interface StatusGlyphProps {
  state: StatusKey;
  srLabel?: string;
}

export function StatusGlyph({ state, srLabel }: StatusGlyphProps) {
  const g = GLYPHS[state];
  const cls = g.shape === 'icon' ? `k-glyph ${toneClass(g.tone)}` : `k-glyph k-glyph--${g.shape} ${toneClass(g.tone)}`;
  let visual = null;
  if (g.shape === 'icon') {
    const Icon = g.icon;
    visual = <Icon size={12} aria-hidden="true" />;
  } else if (g.shape === 'dash') {
    visual = <span className="t-label" aria-hidden="true">–</span>;
  }
  if (!srLabel) {
    return (
      <span className={cls} aria-hidden="true" data-state={state}>
        {visual}
      </span>
    );
  }
  return (
    <span className={cls} data-state={state}>
      {visual}
      <span className="v2-sr">{srLabel}</span>
    </span>
  );
}

export interface StatusLabelProps {
  state: StatusKey;
  children: string;
  role?: 'small' | 'body' | 'label' | 'strong';
  /** One line that ends in an ellipsis when its box is too narrow (a doc-bar status), never cut mid-word. */
  truncate?: boolean;
}

export function StatusLabel({ state, children, role = 'body', truncate = false }: StatusLabelProps) {
  return (
    <span className={`k-status t-${role}${truncate ? ' k-status--truncate' : ''}`} data-role={role}>
      <StatusGlyph state={state} />
      <span className={`k-status__text ${QUIET.has(state) ? 'k-tone-ink3' : 'k-tone-ink'}`}>{children}</span>
    </span>
  );
}
