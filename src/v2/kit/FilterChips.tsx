// FilterChips: a single-select row of filter chips (Ledger: by actor and kind).
export interface FilterChipsItem {
  id: string;
  label: string;
  count: string;
}

export interface FilterChipsProps {
  items: FilterChipsItem[];
  active: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
}

export function FilterChips({ items, active, onSelect, ariaLabel }: FilterChipsProps) {
  return (
    <div className="k-fchips" role="group" aria-label={ariaLabel}>
      {items.map((it) => {
        const on = it.id === active;
        return (
          <button
            key={it.id}
            type="button"
            className={on ? 'k-fchip is-active t-label' : 'k-fchip t-label'}
            aria-pressed={on}
            onClick={() => onSelect(it.id)}
          >
            <span>{it.label}</span>
            <span className="k-fchip__count t-meta">{it.count}</span>
          </button>
        );
      })}
    </div>
  );
}
