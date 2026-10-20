// The sidebar navigation (P-21, owner request): brand, then Desk · Book · Ledger as NavItems
// with their live counts. Replaces the top-bar tabs; the top bar keeps the global controls.
// The chevron at the top folds it to a 64px icon rail (the owner's choice, persisted). The
// shell decides the rail (THREE-PANE.md §1.4): the owner's choice, or a forced rail at 1099px
// and below and beside an open agent panel below 1400px. A forced rail shows the mark and no
// chevron, and never overwrites the stored choice. Labels stay the accessible names and show
// as tips in the rail.
import { Activity, ChevronsLeft, ChevronsRight, FileStack, ScrollText, Settings } from 'lucide-react';
import { IconButton, NavItem, Tip } from '../kit';
import { COPY, selectTopBar } from '../model';
import type { Route } from '../state/route';
import { useV2 } from '../state/store';

const ICONS = { desk: FileStack, book: Activity, ledger: ScrollText } as const;

function routeFor(id: 'desk' | 'book' | 'ledger'): Route {
  if (id === 'book') return { name: 'book' };
  if (id === 'ledger') return { name: 'ledger', file: null };
  return { name: 'desk' };
}

export function SideNav({
  rail,
  toggleVisible,
  collapsed,
  onToggle,
}: {
  /** render the 64px icon rail (the owner's choice or a forced rail) */
  rail: boolean;
  /** the chevron shows only when the owner can actually change the rail (not forced) */
  toggleVisible: boolean;
  /** the owner's stored choice, which the chevron flips */
  collapsed: boolean;
  onToggle: () => void;
}) {
  const s = useV2();
  const v = selectTopBar(s);
  const a = s.actions;
  return (
    <nav className="app-sidenav" aria-label={COPY.sectionsLabel}>
      <div className="app-sidenav__brand t-heading">
        <span className="app-sidenav__mark" aria-hidden="true">
          ◧
        </span>
        <span className="app-sidenav__word">{COPY.brand}</span>
        {toggleVisible ? (
          <span className="app-sidenav__toggle">
            <IconButton
              icon={collapsed ? ChevronsRight : ChevronsLeft}
              label={collapsed ? COPY.expandSidebar : COPY.collapseSidebar}
              size="xs"
              onClick={onToggle}
            />
          </span>
        ) : null}
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
      <div className="app-sidenav__foot">
        {rail ? (
          <Tip label={COPY.settings}>
            <NavItem icon={Settings} label={COPY.settings} active={v.active === 'settings'} compact onClick={() => a.navigate({ name: 'settings' })} />
          </Tip>
        ) : (
          <NavItem icon={Settings} label={COPY.settings} active={v.active === 'settings'} onClick={() => a.navigate({ name: 'settings' })} />
        )}
      </div>
    </nav>
  );
}
