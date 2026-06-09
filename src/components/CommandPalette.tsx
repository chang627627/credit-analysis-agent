import { useEffect, useRef, useState } from 'react';

// A context-aware ⌘K command palette: App builds the command list from current
// agent state (approve/reject only exist while the gate is open, export only
// after a run), so the palette doubles as a map of what the UI can do right now.

export interface Command {
  id: string;
  label: string;
  hint?: string;
  kbd?: string;
  section: string;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
  commands,
}: {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // keep the active row visible while arrowing through a scrollable list
  useEffect(() => {
    if (!open) return;
    document.querySelector('.palette__row--active')?.scrollIntoView({ block: 'nearest' });
  }, [open, active, query]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const filtered = commands.filter(
    (c) => c.label.toLowerCase().includes(q) || c.section.toLowerCase().includes(q),
  );
  const clamped = Math.min(active, Math.max(0, filtered.length - 1));

  const runItem = (c: Command) => {
    onClose();
    c.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.max(0, Math.min(a + 1, filtered.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const c = filtered[clamped];
      if (c) runItem(c);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // group consecutive commands by section for headers
  const sections: { name: string; items: { c: Command; idx: number }[] }[] = [];
  filtered.forEach((c, idx) => {
    const last = sections[sections.length - 1];
    if (!last || last.name !== c.section) sections.push({ name: c.section, items: [{ c, idx }] });
    else last.items.push({ c, idx });
  });

  return (
    <div className="palette__overlay" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <input
          ref={inputRef}
          className="palette__input"
          placeholder="Type a command…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          aria-label="Search commands"
        />
        <div className="palette__list">
          {filtered.length === 0 && <div className="palette__empty">No matching commands</div>}
          {sections.map((s) => (
            <div key={s.name}>
              <div className="palette__section">{s.name}</div>
              {s.items.map(({ c, idx }) => (
                <button
                  key={c.id}
                  className={`palette__row ${idx === clamped ? 'palette__row--active' : ''}`}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => runItem(c)}
                >
                  <span className="palette__label">{c.label}</span>
                  {c.hint && <span className="palette__hint">{c.hint}</span>}
                  {c.kbd && <span className="kbd">{c.kbd}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="palette__foot">
          <span>
            <span className="kbd">↑↓</span> navigate
          </span>
          <span>
            <span className="kbd">↵</span> run
          </span>
          <span>
            <span className="kbd">esc</span> close
          </span>
        </div>
      </div>
    </div>
  );
}
