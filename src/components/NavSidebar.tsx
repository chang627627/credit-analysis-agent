import { useState } from 'react';

// App-shell navigation. This is a single-screen prototype, so the items establish
// the product shell rather than route — the active item reflects the current view.
const NAV = [
  { id: 'analysis', icon: '◧', label: 'Credit Analysis' },
  { id: 'deals', icon: '▤', label: 'Deals', badge: '12' },
  { id: 'portfolio', icon: '◍', label: 'Portfolio' },
  { id: 'agents', icon: '✦', label: 'Agents' },
  { id: 'audit', icon: '☑', label: 'Audit log' },
];

export function NavSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [active, setActive] = useState('analysis');

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
              onClick={() => setActive(it.id)}
              title={collapsed ? it.label : undefined}
            >
              <span className="nav__icon">{it.icon}</span>
              {!collapsed && <span className="nav__label">{it.label}</span>}
              {!collapsed && it.badge && <span className="nav__badge">{it.badge}</span>}
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
