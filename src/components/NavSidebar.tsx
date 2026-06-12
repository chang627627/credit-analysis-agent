// App-shell navigation. "Credit Analysis"/"Deals" and "Portfolio" route between
// the two real views; the rest are shell items (App toasts that they're backlog).

const NAV = [
  { id: 'analysis', icon: '◧', label: 'Credit Analysis' },
  { id: 'deals', icon: '▤', label: 'Deals' },
  { id: 'portfolio', icon: '◍', label: 'Portfolio' },
  { id: 'agents', icon: '✦', label: 'Agents' },
  { id: 'audit', icon: '☑', label: 'Audit log' },
];

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
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <ul className="nav__list">
        {NAV.map((it) => (
          <li key={it.id}>
            <button
              className={`nav__item ${active === it.id ? 'nav__item--active' : ''}`}
              onClick={() => onNavigate(it.id)}
              title={collapsed ? it.label : undefined}
            >
              <span className="nav__icon">{it.icon}</span>
              {!collapsed && <span className="nav__label">{it.label}</span>}
              {!collapsed && badges[it.id] !== undefined && <span className="nav__badge">{badges[it.id]}</span>}
            </button>
          </li>
        ))}
      </ul>

      <div className="nav__spacer" />

      <ul className="nav__list">
        <li>
          <button className="nav__item" title={collapsed ? 'Settings' : undefined}>
            <span className="nav__icon">⚙</span>
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
