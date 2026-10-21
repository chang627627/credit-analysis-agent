// ---------------------------------------------------------------------------
// Palette commands: the model decides WHICH actions exist right now
// (selectCommands), this file maps each CommandAction onto the store's actions.
// The palette never signs, returns or rejects (THREE-PANE.md §6.5): the
// decision lives on the Decision card in the memo (R2.2). "Go to decision"
// only brings that card's verbs into view and focuses its primary
// (requestSign('button')).
//
// A palette start on a file navigates to that file first, so any confirm strip
// appears where the user is looking. The action runs on the next task, after
// the palette has closed and handed focus back, so a focus move it makes (the
// card's primary) is not taken away.
// ---------------------------------------------------------------------------

import { selectCommands, selectLiveDealId } from '../model';
import type { CommandAction } from '../model';
import type { V2Store } from './store';

export interface PaletteCommand {
  id: string;
  label: string;
  section: string;
  hint?: string;
  kbd?: string;
  /** R4.9: shown in the palette's hint row while the command is hovered or active */
  description?: string;
  run: () => void;
}

export function runCommand(s: V2Store, action: CommandAction): void {
  const a = s.actions;
  switch (action.kind) {
    case 'go-signature':
      a.requestSign('button');
      return;
    case 'approve-plan':
      a.approvePlan();
      return;
    case 'cancel-plan':
      a.cancelPlan();
      return;
    case 'stop': {
      const live = selectLiveDealId(s);
      if (live) a.navigate({ name: 'file', dealId: live, at: null });
      a.requestStop();
      return;
    }
    case 'open-file':
      a.navigate({ name: 'file', dealId: action.dealId, at: null });
      return;
    case 'start-file':
      a.navigate({ name: 'file', dealId: action.dealId, at: null });
      a.draftFile(action.dealId);
      return;
    case 'route':
      a.navigate(action.route);
      return;
    case 'export-file':
      a.exportFile(action.dealId);
      return;
    case 'export-session':
      a.exportSession();
      return;
    case 'sweep':
      a.sweepNow();
      return;
    case 'speed':
      a.setSpeed(action.value);
      return;
    case 'policy':
      a.setPolicy(action.value);
      return;
    case 'href':
      window.open(action.href, '_blank', 'noopener');
      return;
  }
}

/** The palette's commands for this store; `latest` supplies the store at run time. */
export function paletteCommands(s: V2Store, latest: () => V2Store = () => s): PaletteCommand[] {
  return selectCommands(s).map((cmd) => ({
    id: cmd.id,
    label: cmd.label,
    section: cmd.section,
    hint: cmd.hint,
    kbd: cmd.kbd,
    description: cmd.description,
    run: () => {
      s.actions.setPaletteOpen(false);
      window.setTimeout(() => runCommand(latest(), cmd.action), 0);
    },
  }));
}
