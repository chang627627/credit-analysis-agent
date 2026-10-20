// ---------------------------------------------------------------------------
// Countersign V2 · Settings (sidebar bottom). Session-level controls that are
// neither commands for a case file (agent panel) nor global status (top bar):
// demo pace, the clean-approval policy, and restoring files removed from the Desk.
// ---------------------------------------------------------------------------

import type { V2Store } from '../state/contracts';
import { fmtSpeed } from './format';
import { SPEED_STEPS } from './select-top';
import type { SettingsView } from './types';
import { COPY } from './vocab';

export function selectSettings(s: V2Store): SettingsView {
  const removed = s.ui.removedFiles ?? [];
  return {
    title: COPY.settings,
    intro: COPY.settingsIntro,
    policy: { label: COPY.policyLabel, help: COPY.policyHelp, on: s.policy === 'auto' },
    pace: {
      label: COPY.paceTitle,
      help: COPY.paceHelp,
      options: SPEED_STEPS.map((v) => ({ id: String(v), label: fmtSpeed(v), count: '' })),
      active: String(s.agent.speed),
    },
    removed: removed.length > 0 ? { text: COPY.removedText(removed.length), restoreLabel: COPY.restoreRemoved } : null,
  };
}
