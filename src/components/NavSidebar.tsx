// App-shell navigation. Every item routes to a real screen (App handles routing).
// Icons are Lucide stroke icons (consistent grid + weight, currentColor so the
// active item inherits the teal accent and themes for free).

import {
  FileSearch,
  SquareKanban,
  Activity,
  Bot,
  ScrollText,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from 'lucide-react';

const NAV: { id: string; icon: LucideIcon; label: string }[] = [
  { id: 'analysis', icon: FileSearch, label: 'Credit Analysis' },
  { id: 'deals', icon: SquareKanban, label: 'Deals' },
  { id: 'portfolio', icon: Activity, label: 'Portfolio' },
  { id: 'agents', icon: Bot, label: 'Agents' },
  { id: 'audit', icon: ScrollText, label: 'Audit log' },
];

const ICON_SIZE = 18;
const ICON_STROKE = 1.75;

export function NavSidebar({
  collapsed,
  onToggle,
  active,
  onNavigate,
  badges = {},
}: {
  collapsed: boolean;
  onToggle: () => void;
  active: string;
  onNavigate: (id: string) => void;
  badges?: Record<string, string | number | undefined>;
}) {
  const ToggleIcon = collapsed ? ChevronsRight : ChevronsLeft;
  return (
    <nav className={`nav ${collapsed ? 'nav--collapsed' : ''}`}>
      <div className="nav__top">
        {!collapsed && <span className="nav__section">Workspace</span>}
        <button
          className="nav__toggle"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ToggleIcon size={16} strokeWidth={ICON_STROKE} />
        </button>
      </div>

      <ul className="nav__list">
        {NAV.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.id}>
              <button
                className={`nav__item ${active === it.id ? 'nav__item--active' : ''}`}
                onClick={() => onNavigate(it.id)}
                title={collapsed ? it.label : undefined}
              >
                <span className="nav__icon">
                  <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} />
                </span>
                {!collapsed && <span className="nav__label">{it.label}</span>}
                {!collapsed && badges[it.id] !== undefined && <span className="nav__badge">{badges[it.id]}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="nav__spacer" />

      <ul className="nav__list">
        <li>
          <button className="nav__item" title={collapsed ? 'Settings' : undefined}>
            <span className="nav__icon">
              <Settings size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </span>
            {!collapsed && <span className="nav__label">Settings</span>}
          </button>
        </li>
      </ul>

      <div className={`nav__user ${collapsed ? 'nav__user--collapsed' : ''}`}>
        <span className="nav__avatar">CD</span>
        {!collapsed && (
          <div className="nav__userinfo">
            <strong>Credit Desk</strong>
            <span>analyst</span>
          </div>
        )}
      </div>
    </nav>
  );
}
