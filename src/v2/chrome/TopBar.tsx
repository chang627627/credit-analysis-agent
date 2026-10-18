// The top bar (spec §3): the current section's name, then the policy switch and search.
// Navigation lives in the sidebar (P-21). Demo pace and Compare V1 were removed on owner
// request (V1 stays reachable at /?v=1). No theme toggle, no primary.
import { Search } from 'lucide-react';
import { Button, IconButton, Menu, Switch } from '../kit';
import { COPY, selectTopBar } from '../model';
import { useV2 } from '../state/store';

export function TopBar() {
  const s = useV2();
  const v = selectTopBar(s);
  const a = s.actions;
  const togglePolicy = (on: boolean) => a.setPolicy(on ? 'auto' : 'gate');

  return (
    <header className="app-topbar">
      <div className="app-topbar__left t-strong">{v.sectionTitle}</div>

      <div className="app-topbar__right">
        <div className="app-topbar__full">
          <label className="app-policy">
            <span className="t-label app-policy__long" aria-hidden="true">
              {v.policyLabel}
            </span>
            <span className="t-label app-policy__short" aria-hidden="true">
              {v.policyShort}
            </span>
            <Switch checked={v.policyOn} onChange={togglePolicy} ariaLabel={v.policyLabel} />
          </label>
          <span className="app-divider" aria-hidden="true" />
        </div>

        <div className="app-topbar__search">
          <Button variant="ghost" size="sm" icon={Search} kbd={v.searchKbd} onClick={() => a.setPaletteOpen(true)}>
            Search
          </Button>
        </div>
        <div className="app-topbar__search-compact">
          <IconButton icon={Search} label="Search" size="sm" onClick={() => a.setPaletteOpen(true)} />
        </div>

        <div className="app-topbar__more">
          <Menu
            label={COPY.more}
            trigger={{ text: COPY.more, variant: 'ghost' }}
            items={[
              {
                id: 'policy',
                label: v.policyLabel,
                checked: v.policyOn,
                onSelect: () => togglePolicy(!v.policyOn),
              },
            ]}
          />
        </div>
      </div>
    </header>
  );
}
