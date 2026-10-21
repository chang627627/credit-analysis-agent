// The ⌘K palette (spec §3, §9.1): every route, file and live action the
// model offers right now. Never sign, reject or return (THREE-PANE.md §6.5): the
// decision lives on the Decision card in the memo (R2.2); "Go to decision" only
// brings its verbs into view and focuses the primary.
import { useMemo, useRef } from 'react';
import { Palette } from '../kit';
import { COPY, paletteFooter } from '../model';
import { paletteCommands } from '../state/commands';
import { useV2 } from '../state/store';

export function AppPalette() {
  const s = useV2();
  const latest = useRef(s);
  latest.current = s;
  const open = s.ui.paletteOpen;
  const fresh = open ? paletteCommands(s, () => latest.current) : [];
  // the store re-renders every second; hand the palette a new list only when the offer changes
  const signature = fresh.map((c) => `${c.id}|${c.label}|${c.hint ?? ''}|${c.kbd ?? ''}|${c.description ?? ''}`).join('\n');
  const commands = useMemo(() => fresh, [signature]);
  return (
    <Palette
      open={open}
      onClose={() => s.actions.setPaletteOpen(false)}
      placeholder={COPY.palettePlaceholder}
      commands={commands}
      footer={paletteFooter}
    />
  );
}
