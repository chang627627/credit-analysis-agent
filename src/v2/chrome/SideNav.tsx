// The sidebar navigation (P-21, owner request): brand, then Desk · Book · Ledger as NavItems
// with their live counts. Replaces the top-bar tabs; the top bar keeps the global controls.
// The chevron at the top folds it to a 64px icon rail (persisted); below 1100px it is always
// the rail. Labels stay the accessible names and show as tips in the rail.
import { Activity, ChevronsLeft, ChevronsRight, FileStack, ScrollText } from 'lucide-react';
import { IconButton, NavItem, Tip } from '../kit';
import { COPY, selectTopBar } from '../model';
import type { Route } from '../state/route';
import { useV2 } from '../state/store';
import { useNarrowViewport } from '../state/nav';

const ICONS = { desk: FileStack, book: Activity, ledger: ScrollText } as const;

function routeFor(id: 'desk' | 'book' | 'ledger'): Route {
  if (id === 'book') return { name: 'book' };
  if (id === 'ledger') return { name: 'ledger', file: null };
  return { name: 'desk' };
}

export function SideNav({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const s = useV2();
  const v = selectTopBar(s);
  const a = s.actions;
  const narrow = useNarrowViewport();
  const rail = collapsed || narrow;
  return (
    <nav className="app-sidenav" aria-label={COPY.sectionsLabel}>
      <div className="app-sidenav__brand t-heading">
        <span className="app-sidenav__mark" aria-hidden="true">
          ◧
        </span>
        <span className="app-sidenav__word">{COPY.brand}</span>
        <span className="app-sidenav__toggle">
          <IconButton
            icon={collapsed ? ChevronsRight : ChevronsLeft}
            label={collapsed ? COPY.expandSidebar : COPY.collapseSidebar}
            size="xs"
            onClick={onToggle}
          />
        </span>
      </div>
      <ul className="app-sidenav__list">
        {v.tabs.map((t) => (
          <li key={t.id}>
            {rail ? (
              <Tip label={t.count ? `${t.label} · ${t.count}` : t.label}>
                <NavItem
                  icon={ICONS[t.id]}
                  label={t.label}
                  count={t.count}
                  countTone={t.countTone}
                  active={t.id === v.active}
                  compact
                  onClick={() => a.navigate(routeFor(t.id))}
                />
              </Tip>
            ) : (
              <NavItem
                icon={ICONS[t.id]}
                label={t.label}
                count={t.count}
                countTone={t.countTone}
                active={t.id === v.active}
                onClick={() => a.navigate(routeFor(t.id))}
              />
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
