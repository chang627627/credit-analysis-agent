// The top bar (spec §3): the current section's name, then the policy switch, demo pace,
// search and Compare V1. Navigation lives in the sidebar (P-21). No theme toggle, no primary.
import { Search } from 'lucide-react';
import { Button, IconButton, LinkButton, Menu, Switch } from '../kit';
import { COPY, selectTopBar } from '../model';
import { useV2 } from '../state/store';

const COMPARE_HREF = '/?v=1';

export function TopBar() {
  const s = useV2();
  const v = selectTopBar(s);
  const a = s.actions;
  const togglePolicy = (on: boolean) => a.setPolicy(on ? 'auto' : 'gate');
  const openCompare = () => {
    window.open(COMPARE_HREF, '_blank', 'noopener');
  };

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
          <Menu
            label={COPY.paceLabel}
            trigger={{ text: v.speedLabel, variant: 'ghost' }}
            items={v.speeds.map((sp) => ({
              id: `speed-${sp.value}`,
              label: sp.label,
              checked: sp.checked,
              onSelect: () => a.setSpeed(sp.value),
            }))}
          />
        </div>

        <div className="app-topbar__search">
          <Button variant="ghost" size="sm" icon={Search} kbd={v.searchKbd} onClick={() => a.setPaletteOpen(true)}>
            Search
          </Button>
        </div>
        <div className="app-topbar__search-compact">
          <IconButton icon={Search} label="Search" size="sm" onClick={() => a.setPaletteOpen(true)} />
        </div>

        <div className="app-topbar__full">
          <LinkButton role="label" href={COMPARE_HREF} newTab>
            {COPY.compareV1}
          </LinkButton>
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
              ...v.speeds.map((sp) => ({
                id: `more-speed-${sp.value}`,
                label: `${COPY.paceLabel} ${sp.label}`,
                checked: sp.checked,
                onSelect: () => a.setSpeed(sp.value),
              })),
              { id: 'compare', label: COPY.compareV1, onSelect: openCompare },
            ]}
          />
        </div>
      </div>
    </header>
  );
}
