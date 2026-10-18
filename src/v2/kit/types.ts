// src/v2/kit/types.ts: the kit's shared vocabulary (§5, §6). Types only.
import type { LucideIcon } from 'lucide-react';

export type ForceState = 'hover' | 'focus' | 'active';
export type MeaningTone = 'good' | 'warn' | 'bad';
export type TextTone = 'ink' | 'ink-2' | 'ink-3' | 'accent' | 'good' | 'warn' | 'bad';
export type Role = 'body' | 'strong' | 'small' | 'label' | 'meta' | 'figure';
export type StatusKey =
  | 'pending' | 'drafting' | 'awaiting' | 'done' | 'pass' | 'watch' | 'breach' | 'info'
  | 'returned' | 'rejected' | 'signed' | 'signed-auto' | 'signed-over' | 'acknowledged'
  | 'resolved' | 'excluded' | 'cancelled' | 'error';
export type { LucideIcon };
