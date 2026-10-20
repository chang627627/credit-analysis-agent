// ---------------------------------------------------------------------------
// Countersign V2 · Settings (reached from the sidebar's bottom). Session-level
// controls only: demo pace, the clean-approval policy, and restoring files
// removed from the Desk. A pure reduction of selectSettings(s). The policy row's
// help line is the rule itself, built in the model (R4.2, P-31).
// ---------------------------------------------------------------------------
import { Button, FilterChips, Switch } from '../../kit';
import { selectSettings } from '../../model';
import { useV2 } from '../../state/store';

export function Settings() {
  const s = useV2();
  const v = selectSettings(s);
  const a = s.actions;
  return (
    <div className="settings">
      <div className="settings__col">
        <header className="settings__head">
          <h1 className="t-display">{v.title}</h1>
          <p className="settings__intro t-small">{v.intro}</p>
        </header>
        <section className="settings__card">
          <div className="settings__row">
            <div className="settings__text">
              <h2 className="t-strong">{v.pace.label}</h2>
              <p className="settings__help t-small">{v.pace.help}</p>
            </div>
            <FilterChips items={v.pace.options} active={v.pace.active} onSelect={(id) => a.setSpeed(Number(id))} ariaLabel={v.pace.label} />
          </div>
          <div className="settings__row">
            <div className="settings__text">
              <h2 className="t-strong">{v.policy.label}</h2>
              <p className="settings__help t-small" data-pattern="P-31">
                {v.policy.help}
              </p>
            </div>
            <Switch checked={v.policy.on} onChange={(on) => a.setPolicy(on ? 'auto' : 'gate')} ariaLabel={v.policy.label} />
          </div>
          {v.removed ? (
            <div className="settings__row">
              <div className="settings__text">
                <h2 className="t-strong">{v.removed.restoreLabel}</h2>
                <p className="settings__help t-small">{v.removed.text}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => a.restoreRemoved()}>
                {v.removed.restoreLabel}
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
