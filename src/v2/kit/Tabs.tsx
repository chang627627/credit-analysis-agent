// Tabs: the top-bar route tabs. The active tab is ink with a 2px ink underline (never teal).
export interface TabsItem {
  id: string;
  label: string;
  count: string | null;
  countTone: 'accent' | 'warn' | 'ink-3';
}

export interface TabsProps {
  items: TabsItem[];
  active: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
}

const COUNT_TONE: Record<TabsItem['countTone'], string> = {
  accent: 'k-tone-accent',
  warn: 'k-tone-warn',
  'ink-3': 'k-tone-ink3',
};

export function Tabs({ items, active, onSelect, ariaLabel }: TabsProps) {
  return (
    <nav className="k-tabs" aria-label={ariaLabel}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className="k-tabs__item t-control"
          aria-current={it.id === active ? 'page' : undefined}
          onClick={() => onSelect(it.id)}
        >
          <span>{it.label}</span>
          {it.count !== null ? <span className={`k-tabs__count t-label ${COUNT_TONE[it.countTone]}`}>{it.count}</span> : null}
        </button>
      ))}
    </nav>
  );
}
