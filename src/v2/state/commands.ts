// ---------------------------------------------------------------------------
// Palette commands: the model decides WHICH actions exist right now
// (selectCommands; never reject or return, since a reason must be typed at the
// gate), this file maps each CommandAction onto the store's actions.
//
// A palette start or countersign on a file navigates to that file first, so
// any confirm strip or signature line appears where the user is looking. The
// action runs on the next task, after the palette has closed and handed focus
// back, so a focus move it makes (the signature line) is not taken away.
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
  run: () => void;
}

export function runCommand(s: V2Store, action: CommandAction): void {
  const a = s.actions;
  switch (action.kind) {
    case 'sign':
      a.requestSign('palette');
      return;
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
      a.startFile(action.dealId);
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
    run: () => {
      s.actions.setPaletteOpen(false);
      window.setTimeout(() => runCommand(latest(), cmd.action), 0);
    },
  }));
}
