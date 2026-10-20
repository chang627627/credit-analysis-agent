// ---------------------------------------------------------------------------
// Countersign V2 · the app shell (spec §3, §9.1, THREE-PANE.md §1, §7.4, R2).
// One provider, a sidebar nav, one top bar, one screen per hash route, the
// palette and the polite live region. A known case file is three panes: nav ·
// the agent panel (command and control only: status lines, the plan prompt,
// Q&A, the composer; a column at 1024px and up, a drawer below) · the memo
// pane (data-viz, the source pane's container), which holds everything shown,
// the whole decision included: the Decision card renders in the memo's
// signature slot, right after step 5. Desk, Book, Ledger and an unknown file
// id render full width with no agent panel. The screens own their scroll
// containers; the shell owns nothing below the bar but the split.
//
// The sidebar rails itself (without writing the owner's stored choice) at
// 1099px and below, and at 1399px and below beside an open agent panel.
// ---------------------------------------------------------------------------
import './app.css';
import { LiveRegion } from './kit';
import { AppPalette } from './chrome/AppPalette';
import { SideNav } from './chrome/SideNav';
import { TopBar } from './chrome/TopBar';
import { chatShown } from './model';
import { V2Provider, useV2 } from './state/store';
import { useNavCollapsed, useViewportAtMost } from './state/nav';
import { DeskScreen } from './screens/desk';
import { FileScreen } from './screens/file';
import { ChatPane } from './screens/chat';
import { BookScreen } from './screens/book';
import { LedgerScreen } from './screens/ledger';
import { DecisionCard, Exhibits, StressTest } from './screens/decision';

function Shell() {
  const s = useV2();
  const r = s.route;
  const [navCollapsed, toggleNav] = useNavCollapsed();
  const le1099 = useViewportAtMost(1099);
  const le1399 = useViewportAtMost(1399);
  const shown = chatShown(s);
  const forced = le1099 || (r.name === 'file' && s.chatLayout === 'column' && shown && le1399);
  const navRail = navCollapsed || forced;
  const knownFile = r.name === 'file' && s.agent.dealsFull.some((d) => d.id === r.dealId);
  const split = s.chatLayout === 'drawer' ? 'drawer' : shown ? 'column' : 'none';

  return (
    <div className="app-shell" data-nav={navRail ? 'collapsed' : 'expanded'} data-nav-forced={forced ? '' : undefined}>
      <SideNav rail={navRail} toggleVisible={!forced} collapsed={navCollapsed} onToggle={toggleNav} />
      <TopBar />
      <main className="app-main">
        {r.name === 'desk' && <DeskScreen />}
        {r.name === 'file' && (
          <div className="app-split" data-chat={knownFile ? split : 'none'}>
            {knownFile && shown ? <ChatPane key={r.dealId} dealId={r.dealId} layout={s.chatLayout} /> : null}
            <div className="app-viz" data-viz="">
              <FileScreen
                key={r.dealId}
                dealId={r.dealId}
                at={r.at}
                navSeq={s.navSeq}
                slots={{
                  exhibits: <Exhibits dealId={r.dealId} />,
                  stress: <StressTest dealId={r.dealId} />,
                  signature: <DecisionCard dealId={r.dealId} />,
                }}
              />
            </div>
          </div>
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
