// ---------------------------------------------------------------------------
// Countersign V2 · the app shell (spec §3, §9.1). One provider, a sidebar nav, one top bar,
// one screen per hash route, the palette and the polite live region. The
// screens own their scroll containers; the shell owns nothing below the bar.
// ---------------------------------------------------------------------------
import './app.css';
import { LiveRegion } from './kit';
import { AppPalette } from './chrome/AppPalette';
import { SideNav } from './chrome/SideNav';
import { TopBar } from './chrome/TopBar';
import { V2Provider, useV2 } from './state/store';
import { useNavCollapsed } from './state/nav';
import { DeskScreen } from './screens/desk';
import { FileScreen } from './screens/file';
import { BookScreen } from './screens/book';
import { LedgerScreen } from './screens/ledger';
import { Exhibits, SignatureBlock, StressTest } from './screens/decision';

function Shell() {
  const s = useV2();
  const r = s.route;
  const [navCollapsed, toggleNav] = useNavCollapsed();
  return (
    <div className="app-shell" data-nav={navCollapsed ? 'collapsed' : 'expanded'}>
      <SideNav collapsed={navCollapsed} onToggle={toggleNav} />
      <TopBar />
      <main className="app-main">
        {r.name === 'desk' && <DeskScreen />}
        {r.name === 'file' && (
          <FileScreen
            key={r.dealId}
            dealId={r.dealId}
            at={r.at}
            navSeq={s.navSeq}
            slots={{
              exhibits: <Exhibits dealId={r.dealId} />,
              stress: <StressTest dealId={r.dealId} />,
              signature: <SignatureBlock dealId={r.dealId} />,
            }}
          />
        )}
        {r.name === 'book' && <BookScreen />}
        {r.name === 'ledger' && <LedgerScreen fileFilter={r.file} />}
      </main>
      <div className="app-overlays">
        <AppPalette />
        <LiveRegion message={s.ui.announce} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <V2Provider>
      <Shell />
    </V2Provider>
  );
}
