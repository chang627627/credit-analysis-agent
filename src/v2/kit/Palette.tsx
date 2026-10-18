// Palette: the ⌘K command palette. A fixed overlay (flat scrim + 560px panel at 15vh) with a
// combobox input over a listbox of commands grouped by section; substring filter; the active row
// is accent-wash + accent-ink label + a 2px accent inset outline. Focus is trapped on the input,
// Esc closes, and focus returns to the opener when nothing else took it.
// `specimen` (kit page only) renders the panel in normal flow: no portal, no scrim, no fixed
// positioning, no focus trap, no autofocus, no document listeners.
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { Kbd } from './Kbd';

export interface PaletteCommand {
  id: string;
  label: string;
  section: string;
  hint?: string;
  kbd?: string;
  run: () => void;
}

export interface PaletteProps {
  open: boolean;
  onClose: () => void;
  placeholder: string;
  commands: PaletteCommand[];
  footer: (count: number) => string;
  specimen?: boolean;
}

export function Palette({ open, onClose, placeholder, commands, footer, specimen = false }: PaletteProps) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optId = (i: number) => `${baseId}-opt-${i}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const shown = specimen || open;

  // Substring filter, then group by section in order of first appearance. Navigation follows the
  // visual order, so indices are assigned after grouping.
  const q = query.trim().toLowerCase();
  const matches = q
    ? commands.filter((c) => `${c.label} ${c.section} ${c.hint ?? ''}`.toLowerCase().includes(q))
    : commands;
  const sections: { name: string; cmds: PaletteCommand[] }[] = [];
  for (const c of matches) {
    const s = sections.find((x) => x.name === c.section);
    if (s) s.cmds.push(c);
    else sections.push({ name: c.section, cmds: [c] });
  }
  const ordered = sections.flatMap((s) => s.cmds);
  const activeIndex = ordered.length === 0 ? -1 : Math.min(active, ordered.length - 1);

  // Opening: remember the opener, focus the input. Closing: reset, and hand focus back to the
  // opener only if focus was lost with the panel (a command may have moved it on purpose).
  useEffect(() => {
    if (!open || specimen) return;
    const ae = document.activeElement;
    const opener = ae instanceof HTMLElement && !(panelRef.current?.contains(ae) ?? false) ? ae : null;
    inputRef.current?.focus();
    return () => {
      setQuery('');
      setActive(0);
      const now = document.activeElement;
      if ((!now || now === document.body) && opener && opener.isConnected) opener.focus();
    };
  }, [open, specimen]);

  // Keep the active row inside the list's own scroll box (never scrolls the page).
  useEffect(() => {
    const list = listRef.current;
    if (!shown || !list || activeIndex < 0) return;
    const el = list.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    if (!el) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [activeIndex, shown, query]);

  if (!shown) return null;

  const runAt = (i: number) => {
    const cmd = ordered[i];
    if (!cmd) return;
    onClose();
    cmd.run();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const n = ordered.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (n) setActive((activeIndex + 1) % n);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (n) setActive(activeIndex <= 0 ? n - 1 : activeIndex - 1);
    } else if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      if (activeIndex >= 0) runAt(activeIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === 'Tab' && !specimen) {
      e.preventDefault(); // the input is the only stop inside the dialog
    }
  };

  // Pressing on a row must not pull focus out of the input.
  const keepFocus = (e: MouseEvent<HTMLDivElement>) => {
    if (!specimen && e.target !== inputRef.current) e.preventDefault();
  };

  let index = -1;
  const panel = (
    <div
      ref={panelRef}
      className="k-palette__panel"
      role="dialog"
      aria-modal={specimen ? undefined : true}
      aria-label={placeholder}
      data-specimen={specimen ? '' : undefined}
      onMouseDown={keepFocus}
    >
      <div className="k-palette__inputrow">
        <Search size={16} className="k-palette__search" aria-hidden="true" />
        <input
          ref={inputRef}
          className="k-palette__input t-body"
          type="text"
          role="combobox"
          aria-expanded={true}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? optId(activeIndex) : undefined}
          aria-label={placeholder}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <Kbd>esc</Kbd>
      </div>
      <div ref={listRef} id={listId} role="listbox" aria-label={placeholder} className="k-palette__list">
        {sections.map((s, si) => (
          <div key={s.name} role="group" aria-labelledby={`${baseId}-sec-${si}`} className="k-palette__section">
            <div id={`${baseId}-sec-${si}`} role="presentation" className="k-palette__sectionlabel t-label">
              {s.name}
            </div>
            {s.cmds.map((cmd) => {
              index += 1;
              const i = index;
              const on = i === activeIndex;
              return (
                <div
                  key={cmd.id}
                  id={optId(i)}
                  data-index={i}
                  role="option"
                  aria-selected={on}
                  className={on ? 'k-palette__row is-active' : 'k-palette__row'}
                  onClick={() => runAt(i)}
                >
                  <span className="k-palette__label t-body">{cmd.label}</span>
                  {cmd.hint ? <span className="k-palette__hint t-meta">{cmd.hint}</span> : null}
                  {cmd.kbd ? <Kbd>{cmd.kbd}</Kbd> : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="k-palette__footer t-meta">{footer(ordered.length)}</div>
    </div>
  );

  if (specimen) {
    return (
      <div className="k-palette" data-specimen="">
        {panel}
      </div>
    );
  }

  return createPortal(
    <div
      className="k-palette"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {panel}
    </div>,
    document.body,
  );
}
