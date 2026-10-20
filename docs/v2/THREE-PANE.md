# Countersign V2 · Three-pane case file and memo section hierarchy

`docs/v2/THREE-PANE.md` · addendum to `docs/v2/SPEC.md` · branch `v2` · light only · final (critique resolved, see Appendix R)

This addendum changes the case file (`#/file/<id>`) in two ways the owner asked for. Everything it does not name stays as `SPEC.md` and the CLAUDE.md "V2" section define it. Where they conflict, this file wins.

1. **Three panes.** Left: navigation. Middle: the agent's run as a conversation for the open case file, ending in the one decision card, with a composer that takes questions and instructions. Right: the credit memo as a clean document, plus the source CIM, the stress test, the exhibits and the signature record.
2. **Section hierarchy.** The owner, verbatim: 同时把1，2，3，4section的层级处理一下。现在看上去就是一坨，看着费劲 ("sort out the hierarchy of sections 1 to 4; right now it is one blob and hard to read"). Every memo section becomes its own paper card: a step eyebrow, a real title, a one-line takeaway written by the model, then labelled blocks, with the flagged figure marked where it sits.

**What this supersedes in SPEC.md:**
- §3 "Regions" and "Responsive floor", for `#/file/*` only.
- §7.2: the page grid (`.file-row` / `.file-pagecell` / `.file-margincell`), every "Notes" block, the header margin cell (Ask, Show all reasoning, evidence check), the Contents row, the stub, the doc bar note stepper, the section-row anatomy and the source pane placement.
- §7.3: SignatureBlock. It is split into `DecisionCard` (agent panel) and `SignatureRecord` (memo foot).
- §7.6 rows for A, S, R, J/K, `[`, `]`, Esc, and the palette "Countersign" command.
- §8: the trigger list and the two-phase rule (redefined in §3.4).
- §13 walkthrough steps that mention Contents, margin notes, "Go to signature" or "A (line off-screen) scrolls only" (adapted in §9.8).

---

## R2 · Owner revision (2026-10-20): the agent panel is command and control only; the countersign lives on the right

**This section wins over everything below it except R3, which wins over R2.** Owner, verbatim: 你他妈中间这一栏显示那么多数据干嘛？没用过claude code？claude code中间要显示那么多吗？中间只搞high level。命令与指挥。显示的都看右边。不然我到底看中间还是右边？ ("Why does the middle column show so much data? Does Claude Code show that much in the middle? The middle is high level only: command and control. Everything that is displayed goes on the right. Otherwise do I look at the middle or the right?") Then: countersign也要移到右边去。("The countersign moves to the right too.")

**The rule.** The agent panel (middle) never DISPLAYS data and holds no decision. It holds only (a) one-line status from the agent, (b) the plan prompt (start drafting), (c) the reviewer's questions/instructions and short answers, (d) the composer. Every number, list, table, record, reason, attestation, consequence and file detail, AND THE WHOLE DECISION (recommendation, note, verbs, signature), lives in the memo pane (right). A panel line may POINT at something on the right with a link ("Covenants →"); it never reproduces it. Reference model: Claude Code (short status lines in the conversation; the detail and the work product are in the artifact).

### R2.1 Agent panel contents (supersedes §2.2 items, §3 decision-card-in-panel, §4.4 where they conflict)
- **Head (44px):** "Credit Analyst · Project Cobalt" and the collapse chevron. Nothing else (no note stepper, no outline button, no run number).
- **No context/file item.** Borrower, facility, amount, CAM id, CIM paragraphs and the Source CIM button are on the right (memo header, doc bar).
- **Thread lines.** Each is ONE line (t-body, ellipsis if it overflows), an optional status glyph, an optional trailing link "Section →" that scrolls the memo to that card (the existing trace). Lines only: no boxes, no cards, no expandable records, no buttons except the plan prompt's:
  - run start: "Drafting the memo for Project Cobalt."
  - step lines, one per plan step, updated in place: running "Testing covenants" (static working glyph; the only infinite animation stays the memo caret), done "Covenants tested", skipped "Peer benchmarks skipped". Each links to its card.
  - action-worthy flags only, at most one line per step: "4 covenants breached" (link Covenants), "2 figures below 75% confidence" (link Financials), "No restructure within policy" (link Revision). Never the flag's sentence, never "raised by", never confidences or durations.
  - revision: "Returned for revision · rev 2", "Proposed a $6.0M sponsor equity cure" (link Revision).
  - the gate: ONE line "Your countersignature is needed" with a "Decision →" link (scrolls the memo to the Decision card and focuses its note field or primary). Countdown variant: "Auto-countersigning in 4 s · Decision →"; held: "Auto-countersign held · <reason>".
  - Q&A: "You · <message>" and the agent's answer clipped to 2 lines with a link to the section it concerns when relevant.
  - system: "Run cancelled".
  - decided: "You countersigned DECLINE · 00:52 · Record →" (link to the memo Decision card).
- **Plan prompt** (plan_review; above the composer): one line "I'll draft 5 steps. Peer benchmarks is optional." Then one row: primary [Start drafting ⌘↵], secondary [Skip peers] / [Include peers], ghost [Cancel], and one quiet line "Starts in 7 s · Hold" while the countdown runs. The step list itself is shown on the right (memo skeleton cards; the optional card shows "Optional · will be skipped" when skipped).
- **Composer:** one line, placeholder "Ask or instruct". Same intent rules as §4: typing can never sign, return or reject; such text gets the reply "Decide in the memo: Decision →".

### R2.2 The memo pane (right) holds everything, including the decision (supersedes §3 and parts of §5)
- **Memo header** (canvas, top): borrower, facility, amount, CAM id, prepared-by line, CIM paragraphs. Still no recommendation at the top.
- **Section card footer:** ONE quiet line, e.g. "Document Intelligence · 94% · 1.1 s", with a "Record" disclosure, collapsed by default, holding the tool's args in, data out and the reasoning (tool records and reasoning live here now; the Ledger keeps the full trail).
- **Flags in the memo:** marked on the figure/row where they sit (as today). A flag with no row (e.g. "Earnings are highly sensitive to commodity prices") is one marked line at the foot of its card. No notes blocks.
- **Decision card** (its own card right after step 5 Recommendation, before the stress test; owned by `screens/decision`; this is the ONE place to decide, i.e. the existing SignatureBlock moved into a memo card, keeping the owner-approved arrangement):
  1. Signed over list ("you opened n of N"), each with "Show row".
  2. Reviewer note field with Draft from notes + provenance chip (optional to countersign, required to return or reject; exactly as today).
  3. Amendment summary with Revert (amend in place stays on the covenant row).
  4. The decision panel directly above the verbs: "The agent recommends [TOKEN]" (always the agent's own call) + the question + the one-sentence reason (`SignatureView.call`).
  5. The verbs in ONE horizontal row that may wrap (never a vertical list), each with its one-line consequence under it (`SignatureView.verbs.notes`). Clicking the primary signs.
  6. The attestation (small, under the verbs) and the policy line/checks.
  7. The signature lines (agent pre-signed + reviewer line), which become the sealed record after the decision (ink / AUTO / REJECTED + quote + provenance + routed line).
- After the decision the card shows the sealed record (no verbs, no note field).

### R2.3 Keyboard (supersedes §3.4)
A / S / R behave as before the three-pane change, relative to the memo Decision card: A (no modifier, not typing) brings the Decision card's reviewer line into view on the first press when it is off screen, then signs; S / R run return / reject through the note-required flow (focus the note field if empty). The panel's "Decision →" link and the composer's refusal link scroll to the card.

### R2.4 Interfaces (exact; model owns model/types.ts, state owns state/contracts.ts + state/screens.ts)
```ts
// model/types.ts (additions; keep every existing export that is still imported)
export type ThreadLineKind = 'run' | 'step' | 'flag' | 'revision' | 'gate' | 'you' | 'answer' | 'system' | 'decided';
export interface ThreadLine {
  id: string;
  kind: ThreadLineKind;
  glyph: StatusKey | null;
  text: string;                                    // one line, plain
  link: { label: string; target: FileAt } | null;  // memo card to scroll to ('signature' = the Decision card)
}
export interface PlanPromptView {
  text: string;
  start: { label: string; kbd: string; disabled: boolean };
  optional: { stepId: string; label: string; included: boolean } | null; // 'Skip peers' / 'Include peers'
  cancelLabel: string;
  countdown: { text: string; holdLabel: string | null } | null;
}
export interface AgentPanelView {
  title: string;
  lines: ThreadLine[];
  plan: PlanPromptView | null;
  composer: { placeholder: string; disabled: boolean; disabledReason: string | null };
}
// model/index.ts
export function selectAgentPanel(s: V2Store, dealId: string): AgentPanelView;
// The memo Decision card renders selectSignature(s, dealId) (SignatureView) in full, verbs included.
```
No composer note mode and no decision state in the panel.

### R2.5 As integrated (2026-10-20; records where the build settles what R2 left open)
- **Memo order:** header → 1 to 4 → revisions → 5 Recommendation → the Decision card → the stress test → exhibits → appendix (R2.2 only fixes the Decision card right after step 5 and before the stress test; §1.1 / §5.2 put exhibits first, superseded).
- **Removed with the old panel** (nothing reads them): `selectThread` / `ThreadItem` / `ThreadView`, `selectNotes`, `UiState.threadCue` / `noteFocus` / `showReasoning` (and the `v2.showReasoning` key), `V2Actions.revealInThread` / `setShowReasoning` / `showChat` / `markOpened` (the transient reveal is internal: the plan auto-reveal only), `ChatPaneProps.slots`, `SectionAside` `'meta'`, `SignatureView.memo`, `SignatureView.reviewer.kbd`, `NoteView.traceStepId`, `KeyFigureView.traceStepId`, `SignatureRecord` and the panel `DecisionCard`.
- **Added:** `SignatureView.amendment.editTarget` (the amended covenant row; "Edit in memo" lands there). A row-less flag's `NoteView.target` is its marked line (`{ section, anchorId: 'flag:<flagId>' }`), so J / K, Signed over and "Show row" flash the flag itself; revision-stated flags keep the card head.
- **Focus:** after a return for revision, focus that fell to the body goes to the Decision card's pending line (`[data-record-focus]`, tabIndex -1); when the plan prompt or the "New activity" pill unmounts with focus inside, the panel's composer takes it. The panel never takes focus on its own.
- **Copy:** a skipped optional card in plan review reads "Optional · will be skipped"; a key figure's accessible name ends "Show in Financials." (or the revision), since it scrolls to its memo row.
- **Q&A tokens:** questions open only once the memo is assembled (gate or sealed), i.e. after step 5, so an answer that names the agent's call never precedes the recommendation card.

---

## R3 · Owner revision (2026-10-20): the memo writes itself live, the panel reads like Claude Code

**R3 wins over R2 and over everything else in this file.** It supersedes the skeleton cards (§5.7,
R2.1's "the step list itself is shown on the right", R2.5's Copy clause "a skipped optional card in
plan review reads 'Optional · will be skipped'", §9 item 6) and the plan prompt's place above the
composer.

- **Agent panel = Claude Code.** The conversation runs top-down from the top of the panel; the plan
  checklist with Start drafting is a message in that flow, after the status lines. Only the
  composer is pinned to the foot: one frame with the round send button inside (quiet while empty,
  accent once there is a draft); the frame takes the focus ring. No rule crosses the panel foot or
  the sidebar foot, and no empty-state filler line. A skipped step's line links nowhere.
- **No skeleton cards.** Before Start drafting (not started, plan review) the memo is its header
  alone; the plan lives only in the agent panel. A card exists once its step starts: it rises in
  once (`MemoCard enter`) carrying the one drafting line and the caret, then **writes itself in**
  when its step returns (`MemoCard reveal`: the takeaway, each block, each table row, the row-less
  flag lines, the record line, one `--dur-stagger` apart). The write-in plays once (then the card is
  ordinary again, so a row flash is never outranked). A skipped optional step has no card, and steps
  are numbered among the included ones ("Step 3 of 4" when peers is skipped). Cards already on the
  page when a file opens never animate; everything is instant under reduced motion. The Decision
  card and the Portfolio Monitor appendix arrive with the agent's package (the gate) and stay through
  a send-back; a Book row's link (`at=monitoring`) shows the appendix on a file that has none yet. A
  run that errors keeps a stopped card where it halted, so the panel's "Drafting stopped at …" link
  has a target.
- **Follow.** While the file's run drafts, the memo pane keeps the card being written in view (whole,
  24px of canvas under it; a card taller than the view shows from its head; opening a file mid-run
  jumps there, later moves glide). The reviewer takes over with a wheel or touch scroll that can move
  the memo (downward only with real memo below, so wheeling toward the card being written keeps
  following), any scroll the follow did not make that goes up or carries that card off the top
  (keys, scrollbar, focus), a press inside any other card (its Record, a link, a selection), or a
  memo cue / link into the file (panel links, J / K, traces) that targets another card. Scrolling
  back down until the card being written sits whole in view (after the take-over gesture settles),
  or the doc bar's "Go to drafting" (shown only while not following), resumes. When the analysis
  finishes (the run reaches the gate, first pass or a revision) while following, the memo **lands on
  the Decision card**, its head at the top (owner: "after finish the analyze ... it should locate at
  the Decision section"). Scroll only, never focus, so a stray Enter cannot sign; a reviewer who took
  over stays where they are reading, with "Go to decision" in the doc bar. Reasoning is never
  streamed onto the page: it stays in each card's Record.

## 0. Owner decisions that survive (each is checked in §9)

| Decision | Where it holds |
|---|---|
| Light only, one typeface (Inter), weights 400/500/600, the closed set of 12 type roles | No new tokens, no new type roles. Section titles use the existing 18px role `t-figure-lg`; no figure inside a memo card uses that role any more (§5.3). |
| Professional over flashy | Pane changes are instant (no width or grid animation; the existing `.app-shell` grid transition is removed). One cue: the existing one-shot `v2-flash`. No spinners. The only loop stays the memo's drafting caret. |
| No vertical source spine | The source still opens from the doc bar button "Source CIM · n quoted". It moves to the right edge of the memo pane (§1.7). |
| Citations read "CIM para 2" | Unchanged (`paraLabel`, `model/evidence.ts`). |
| Recommendation only at the foot (step 5) | Card order 1 Financials, 2 Risk, 3 Peers, 4 Covenants, revisions, 5 Recommendation (`PAGE_ORDER` + `pageSectionIds`, `model/select-file.ts:837-849`). The header seal no longer states the agent's call (§5.11). The thread shows no token before the gate, and the current gate line shows none either; the card states it. Takeaways in steps 1 to 4 state facts only, never "deciding" language (§5.5). Revision cards keep stating their own outcome (the existing redline row), since they sit after step 4 and directly above step 5. |
| No side margin column of notes, no notes under sections | Every note leaves the memo and becomes a thread message (§2). |
| Verbs never stacked vertically | One verb row with a fixed wrap point: the primary on line 1, Return and Reject side by side on line 2. Never three lines and never a one-column list at any width (width table in §3.1). Logged for the owner as part of P-23. |
| The decision lives in one place | The decision card in the agent panel. The memo's signature record has no verbs and its open line is not a control. The palette has no sign command (§6.5). The composer refuses every decision verb (§4). |
| Top bar = section name + auto-countersign switch + search | `chrome/TopBar.tsx` is unchanged. No pace menu, no Compare V1. V1 stays at `/?v=1`. |
| Sidebar collapsible with a clean icon rail | Kept. It also rails itself beside an open agent panel below 1400px, without overwriting the owner's stored choice (§1.4). |
| The decision token is always the agent's own call | `SignatureView.call.token = tokenOf(pkg.recommendation)` (`model/select-decision.ts:187`), unchanged in every amended state. |
| Never promise what does not happen | Every consequence line still reads `routesOnSign` (`model/select-file.ts:320-324`). The intro sentence "Nothing is signed without you" appears only while auto-countersign is off (§2.2). |
| Rejected, never resurrect | Serif, dimming the stream, full-width progress lines, decorative spines, sparklines, glass composer and composer kbd hints, filter bars, sortable tables, date pickers, donuts, cross-pane connector lines. |

---

## 1. Layout

### 1.1 Regions (case file, 1440×900, agent panel open)

```
y=0   ┌──────────┬──────────────────────────────────────────────────────────────────────────┐
      │ BRAND 48 │ TOP BAR 48 · section name · auto-countersign switch · Search (unchanged)   │
y=48  │──────────┼──────────────────────┬───────────────────────────────────────────────────┤
      │ SIDEBAR  │ AGENT HEAD 44        │ DOC BAR 44 (sticky in the memo scroller)          │
y=92  │ 216      ├──────────────────────┼───────────────────────────────────────────────────┤
      │ (64 rail)│ THREAD (scrolls)     │ MEMO SCROLLER (canvas)                            │
      │          │  context · plan ·    │  header (on canvas)                               │
      │ Desk     │  steps · flags ·     │  [card] Step 1 of 5 · Financials                  │
      │ Book     │  gate · Q&A          │  [card] Step 2 of 5 · Risk score and rating       │
      │ Ledger   ├──────────────────────┤  [card] Step 3 · [card] Step 4 · [card] Rev 2    │
      │          │ DECISION DOCK        │  [card] Step 5 of 5 · Recommendation              │
      │          │ (gate states only)   │  [card] Exhibits · [dashed] Stress · [card] Sig   │
      │          ├──────────────────────┤  [card] Appendix                  SOURCE 360 → │
      │          │ COMPOSER             │                              (push or overlay)  │
y=900 └──────────┴──────────────────────┴───────────────────────────────────────────────────┘
          nav            agent panel 400              memo pane (viz) 1fr
```

- The 48px top bar and the sidebar brand row share the line y=0 to 48 (unchanged, `app.css:40-50`, `app.css:77-90`).
- The agent head (44px), the doc bar (44px) and the source head (44px) share one header line, y=48 to 92. All three draw a 1px `--line` bottom border, so the line at y=92 is continuous. The agent head is on `--paper`; the doc bar stays on `--canvas` (`file.css:134-153`).

### 1.2 Which routes show the agent panel

| Route | Panes | Why |
|---|---|---|
| `#/file/<id>` (known id) | nav · agent panel · memo pane | The panel is scoped to one case file, so every intent typed in it is about that file. |
| `#/file/<unknown>` | nav · full width, the existing not-found note (`FileScreen.tsx:326-335`) | There is no thread for a file that does not exist. |
| `#/` (Desk) | nav · full width (unchanged) | See below. |
| `#/book`, `#/ledger` | nav · full width (unchanged) | Full-width visualizations, as the owner asked. |

**Desk decision: full width, no chat.** The Desk lists files and has a drop zone. A Desk chat would need file disambiguation ("draft Atlas") and would add a second place to start runs beside the existing one-click "Draft memo" row action. One composer per case file keeps parsing deterministic, and it matches the established input model "upload to ingest, chat to steer" (CLAUDE.md, key product decisions): the Desk ingests, the case file steers.

### 1.3 Widths and behaviour per viewport

Two layout modes, chosen by `matchMedia('(min-width: 1024px)')`:
- **Column mode** (viewport ≥ 1024): the agent panel is a grid column, 400px at viewport ≥ 1280 and 360px at 1024 to 1279.
- **Drawer mode** (viewport < 1024): the agent panel overlays the memo pane's left edge, width `min(400px, 100%)` of the memo pane.

Memo content = `.file-content` (max 808 = 760 content + 24 padding each side; padding 16 when the memo pane is below 640). Doc bar folds are the container widths of §5.10.

| Viewport | Nav | Agent panel | Memo pane | Memo content | Source when open | Doc bar at that width |
|---|---|---|---|---|---|---|
| 1728 | 216 (owner's choice) | column 400 | 1112 | 760 | **push** 360 on the right → canvas 752 | full labels; with the source pushed (752): Source and Agent icons, actions in More |
| 1440 | 216 | column 400 | 824 | 760 | overlay 360 on the right | Agent panel toggle (when shown) as icon, actions in More, Source labelled |
| 1440, panel hidden | 216 | 0 | 1224 | 760 | push → canvas 864 | full labels; with the source pushed (864): Agent icon, actions in More |
| 1280 | **64, forced rail** | column 400 | 816 | 760 | overlay | as 1440 |
| 1100 | 64 (forced) | column **360** | 676 | 628 | overlay | Source icon, Go to decision labelled |
| 1024 | 64 | column 360 | 600 | 568 | overlay | Go to decision and the Desk crumb in More |
| 900 | 64 | **drawer** 400 | 836 | 760 | overlay (closes the drawer) | as 1440 |
| 760 | 64 | drawer 400 | 696 | 648 | overlay | as 1100 |
| 390 | 64 | drawer 326 (the whole memo pane) | 326 | 294 | overlay, full pane width | minimal (status ellipsizes) |

- With the panel hidden in column mode the memo pane takes `100vw − nav`.
- Width changes are instant: no `grid-template-columns` transition anywhere in the shell, so container-query tables never re-stack mid-animation. The existing rule `.app-shell { transition: grid-template-columns ... }` (`app.css:53`) is deleted.
- No horizontal page scroll at any width ≥ 360.

### 1.4 Sidebar: forced rail beside the panel

```ts
// App.tsx (shell). useViewportAtMost is new in state/nav.ts (live matchMedia, like useNarrowViewport).
const le1099 = useViewportAtMost(1099);
const le1399 = useViewportAtMost(1399);
const forced = le1099 || (s.route.name === 'file' && s.chatLayout === 'column' && chatShown(s) && le1399);
const navRail = navCollapsed || forced;
// <div className="app-shell" data-nav={navRail ? 'collapsed' : 'expanded'} data-nav-forced={forced ? '' : undefined}>
// <SideNav rail={navRail} toggleVisible={!forced} collapsed={navCollapsed} onToggle={toggleNav} />
```

```css
/* app.css, added beside the existing data-nav rules (app.css:55-58) */
.app-shell[data-nav-forced] .app-sidenav__toggle { display: none; }
.app-shell[data-nav-forced] .app-sidenav__mark { display: inline; }
```

- `data-nav="collapsed"` drives the 64px grid column (`app.css:55`), so the forced rail needs no new grid rule.
- The forced rail never writes `v2.navCollapsed`. Hiding the panel at 1280 brings the 216px sidebar back if the owner had it expanded.
- `SideNav` stops calling `useNarrowViewport` (`SideNav.tsx:24-25`): it renders rail items when `rail` is true, and the chevron (`collapsed ? ChevronsRight : ChevronsLeft`) only when `toggleVisible`.
- The ≤1099 media query (`app.css:67-74`) stays as the no-JS fallback; it agrees with `forced`.

### 1.5 Panel visibility: three flags, two kinds of caller

| Flag | Mode | Persisted | Meaning |
|---|---|---|---|
| `panes.chatOpen` | column | yes, `v2.chatOpen` ('1' or '0', default '1'), read and written only in `state/panes.ts` (C19), every access in try/catch like `state/nav.ts:8-27` | the owner's choice |
| `panes.revealed` | column | no | a transient reveal over a hidden panel. Cleared on every file change and on any explicit hide. |
| `panes.drawerOpen` | drawer | no, starts false | the drawer is open |

`chatShown(s)` (model, `select-top.ts`) = route is a known file && (`chatLayout === 'column'` ? `chatOpen || revealed` : `drawerOpen`).

| Caller | Kind | Effect |
|---|---|---|
| `]`, the doc bar "Agent panel" button, the agent head hide or close button | **explicit** (`toggleChat` / `setChatOpen`) | column: writes `chatOpen` (persisted) and clears `revealed`; drawer: `drawerOpen` |
| J / K, A phase one, S / R, "Go to decision" (doc bar, memo record, palette, composer reply), a memo "Record" link, Signed over "Show row" | **transient** (`showChat()`) | column: `revealed = true` if the panel is hidden (never writes storage); drawer: `drawerOpen = true` |
| Auto-reveal (below) | transient | as above, and never moves focus |

**Auto-reveal (both modes, once per key, `x.autoRevealed: Box<Set<string>>`)**, run by an effect in `state/panes.ts` while the live file is the route and the tab is visible:
- key `plan:<threadEpoch[dealId]>` when the live file enters plan review;
- key `gate:<pkgKey>` when the live file's package reaches the gate (rev 1 and every revision).
If the reviewer hides the panel afterwards, it stays hidden for that key. A key whose conditions first hold later (the gate reached while on the Desk) fires when the file is opened.

**The plan countdown requires the plan card on screen.** `armable` (`state/plan.ts:25-27`) gains `&& chatShown(s)`. Hiding the panel (or closing the drawer) while the plan countdown runs holds it with the existing reason `'hidden'` (the effect at `state/plan.ts:102-104` already writes `onLiveFile ? 'hidden' : 'left'`). A plan that never armed waits, unheld, until the panel is shown. So a plan can never auto-start where the reviewer cannot see or edit it. The doc bar status then reads "Plan review · review the plan in the agent panel" (§5.10).

The gate's auto-countersign countdown keeps the P-20 rule (route + tab visible, `state/gate.ts:125-135`): it is visible in the memo record line (P-11 fill) and in the doc bar status even with the panel hidden.

**Drawer mode.**
- The drawer is `position: absolute` inside `.app-main` (top 0, left 0, bottom 0, width `min(400px, 100%)`), z-index 6 (above the doc bar 3 and the source overlay 5), `box-shadow: var(--shadow-pop)`, no scrim.
- The drawer and the source overlay are mutually exclusive: opening one closes the other (`toggleChat`, `showChat`, `openSource`, `cite`).
- It closes on: any place change (route hygiene, `state/ui.ts:191-205`); Esc (§6.4); `cueMemo` without `keepDrawer` (a thread link that sends the reader to the memo, §2.6); a composer intent that opens a confirm strip in the doc bar (§4.3).

**Focus return (owned by the shell, A).** `setChatOpen(false)`, `toggleChat()` (when hiding) and every drawer close first check `document.activeElement?.closest('[data-chat-pane]')`. If focus was inside, after the commit (`requestAnimationFrame`) focus the first visible `[data-chat-toggle] button` (the pattern of `focusSourceToggle`, `SourcePane.tsx:26-35`).

**Resizing: not built.** The owner allowed "resizable or at least collapsible with persisted state". A drag separator would need a new kit control with full keyboard support; collapse plus persistence meets the brief.

### 1.6 Scroll containers and DOM hooks

| Container | Element | Scrolls | Height |
|---|---|---|---|
| Thread | `.chat-thread` | `overflow-y: auto` | `flex: 1 1 0; min-height: 96px` |
| Decision card scroll region | `.decision-card__scroll` | `overflow-y: auto` | `flex: 0 1 auto; min-height: 96px` |
| Memo | `.file-canvas` (existing, `file.css:18-23`), doc bar sticky at its top | `overflow-y: auto` | `calc(100vh - 48px)` |
| Source | `.file-source__body` (existing) | `overflow-y: auto` | the pane |
| Agent panel (fallback only) | `.chat-pane` | `overflow-y: auto` only when its children's minimum heights exceed the pane (viewports under about 560px tall) | `calc(100vh - 48px)` |

The body never scrolls (`v2.css:106`).

DOM hooks (the contract between owners):

| Hook | Element | Owner |
|---|---|---|
| `[data-viz]` | the memo pane wrapper `.app-viz` | A |
| `[data-chat-pane]` | agent panel root (also `data-layout="column"` or `"drawer"`) | C |
| `[data-decision-dock]` | the dock wrapper | C |
| `[data-decision]` | DecisionCard root | D |
| `[data-sign-primary]` | span around the card's primary Button | D |
| `[data-record-focus]` | `tabIndex=-1` wrapper around the signature lines in SignatureRecord | D |
| `[data-thread-item="<id>"]` | every thread item wrapper (`tabIndex=-1` on `decided` and `returned:<n>`) | C |
| `[data-note="<id>"]` | MarginNote (existing, `kit/MarginNote.tsx:38`) | F (unchanged) |
| `[data-section="<MemoSection>"]` | every memo card, plus `.file-scratch` for the stress test | E (D's slots render inside) |
| `[data-anchor="<id>"]` | rows and section heads (existing) | F / E |
| `[data-docbar]`, `[data-source-toggle]` | existing | E |
| `[data-chat-toggle]` | wrappers of the doc bar "Agent panel" button and of every "Go to decision" (doc bar, memo record) | E, D |

### 1.7 The source pane moves to the right edge of the memo pane

- Today the source opens on the memo's left edge (`file.css:15-16`, `file.css:55-73`). With the agent panel on the memo's left it would sit between chat and memo. It moves to the right edge, so the chain reads narrative (chat) → document (memo) → evidence (CIM): trace links go chat → memo, cites go memo → source.
- **Push vs overlay is decided by the memo pane's own width**, not the viewport: `.app-viz { container: viz / inline-size; }`.
  - `@container viz (min-width: 1064px)`: `.file[data-source="open"] { grid-template-columns: minmax(0, 1fr) 360px; }`, source in column 2 with a 1px `--line` **left** border.
  - Below: overlay `position: absolute; top: 44px; right: 0; bottom: 0; width: min(360px, 100%)`, panel with `--shadow-pop`, z-index 2 under the doc bar (today's rules mirrored to the right edge).
- JS twin in `state/ui.ts`, replacing `SOURCE_OVERLAY_MAX = 1431` (`state/ui.ts:176-181`), null-safe because `routeHygiene` calls it inside `navigate()` before the target route renders (`state/ui.ts:195-198`):

```ts
export const VIZ_SOURCE_PUSH_MIN = 1064;

/** True when an open source overlays the memo. Before a case file mounts (navigating from the
    Desk, Book or Ledger) there is no [data-viz]: treat that as overlay, so the next file never
    opens already covered. Never throws. */
export function sourceIsOverlay(): boolean {
  try {
    const el = document.querySelector('[data-viz]');
    return !(el instanceof HTMLElement) || el.clientWidth < VIZ_SOURCE_PUSH_MIN;
  } catch {
    return true;
  }
}
```

- `state/shortcuts.ts` Esc uses `sourceIsOverlay()` instead of `window.innerWidth <= SOURCE_OVERLAY_MAX` (`state/shortcuts.ts:129`).
- The close icon becomes `ChevronsRight` with label "Close source ([)". The doc bar's Source toggle moves to the right end of the doc bar (§5.10).

### 1.8 Shell grid CSS (`app.css`, A) and drawer CSS (`chat.css`, C)

```css
/* app.css (A) */
.app-main { position: relative; }                 /* drawer anchor */
.app-split { display: grid; grid-template-columns: minmax(0, 1fr); height: calc(100vh - 48px); }
.app-split[data-chat="column"] { grid-template-columns: 400px minmax(0, 1fr); }
@media (max-width: 1279px) { .app-split[data-chat="column"] { grid-template-columns: 360px minmax(0, 1fr); } }
.app-viz { min-width: 0; height: calc(100vh - 48px); container: viz / inline-size; }
```

```css
/* chat.css (C): the panel's own geometry, keyed on its layout prop */
.chat-pane { display: flex; flex-direction: column; min-width: 0; height: calc(100vh - 48px); background: var(--paper); border-right: 1px solid var(--line); }
.chat-pane[data-layout="drawer"] { position: absolute; top: 0; left: 0; bottom: 0; z-index: 6; width: min(400px, 100%); height: auto; box-shadow: var(--shadow-pop); }
```

`data-chat` on `.app-split` is `column` (panel shown as a column), `none` (column mode, panel hidden) or `drawer` (one grid column; the ChatPane, when open, is the absolute drawer).

---

## 2. The agent thread (middle pane)

### 2.1 Anatomy (`screens/chat/`)

`<aside class="chat-pane" data-chat-pane data-layout={layout} data-pattern="P-22" aria-label="Agent panel">`, a flex column:

1. **Head** (`.chat-head`, `flex: none`, 44px, padding 0 8 0 16, 1px bottom line).
   - Left, ellipsized: t-label ink `head.heading` ("Credit Analyst") and t-meta ink-3 `head.meta` = deal name, plus `· run N` once a run exists, plus `· rev N` when rev ≥ 2 ("Project Atlas · run 3 · rev 2").
   - Right, gap 4:
     - note stepper, when counted notes exist: `IconButton xs ArrowUp` "Previous note (K)", t-label `head.stepper.label` ("– of 2", "1 of 2"), `IconButton xs ArrowDown` "Next note (J)";
     - `IconButton TextQuote` "Show all reasoning" with `pressed={head.reasoningOn}` (persisted `v2.showReasoning`, unchanged, `state/ui.ts:107-123`); per-step overrides are discarded whenever it flips (today's rule, `FileScreen.tsx:219-220`);
     - `IconButton ChevronsLeft` "Hide agent panel (])" in column mode, `IconButton X` "Close agent panel (])" in drawer mode.
2. **Thread** (`.chat-thread`, padding 16, items gap 12): `<ol aria-label="Agent run">` of items (§2.2). The "New activity" pill floats at the bottom centre of this region (§2.5).
3. **Decision dock** (`.chat-dock`, rendered only while `ThreadView.dock`): `<div class="chat-dock" data-decision-dock>`, `flex: 0 1 auto; min-height: 0; display: flex; flex-direction: column; border-top: 1px solid var(--line)`. It holds `slots.decision`. The dock sits outside the thread scroller, so scrolling the thread never hides the decision, and the flex rules let it grow to everything but the thread's 96px floor (§3.1).
4. **Composer** (`.chat-composer`, `flex: none`, padding 12 16 16, 1px top line, `data-pattern="P-25"`): `TextArea size="composer"` (flex 1) and `IconButton ArrowUp` "Send", disabled while the draft is blank. Flat: no shadow, no glass, no kbd hint chips (both rejected earlier).

`chat.css` lays out `.chat-*` wrappers only; it never styles a `.k-` class (C23).

### 2.2 Item catalogue

Every item is a `ThreadItem` from `selectThread` (§2.3, types in §7.1). Screens render the view verbatim with kit primitives. JSX props are never named `title` (C02 greps ` title=`), so every view field that a screen passes on is named `heading`.

| Kind (id) | When | Copy (all composed in the model) | Visual | Links to |
|---|---|---|---|---|
| `context` (`context`) | always first | borrower (t-strong ink); facility · memo id (t-small ink-2); "Project Atlas CIM · 3 paragraphs" (t-meta ink-3) + `Chip` "uploaded" for uploads. **Not started only:** intro (policy off) "The Credit Analyst reads the CIM, drafts the memo section by section and stops for your countersignature. Nothing is signed without you." or (policy on) "The Credit Analyst reads the CIM, drafts the memo section by section and stops for your countersignature. Auto-countersign is on: a clean first-pass APPROVE may be signed by the policy after a visible 5 s countdown you can hold." (the token word via `tokenWord`), then **primary "Draft memo"** + `Kbd ⌘↵`, disabled with t-meta "Extraction in progress · q3_cim.pdf" under it while parsing. | plain block, no frame; `LinkButton role="small"` `sourceLabel` ("Source CIM · 4 quoted") → `openSource()` | source pane |
| `system` (`cancelled`) | `ctx.cancelled` | `StatusLabel cancelled role="small"` "Last run cancelled 14:05 · reset before a decision" + `LinkButton role="meta"` "Open in Ledger" | status line | Ledger filtered to the file |
| `plan` (`plan`) | the live file in plan review | heading "Proposed plan" (t-strong); meta "5 of 5 steps · source: Project Atlas CIM, 3 paragraphs" (t-meta ink-3). One row per non-rework step: `Checkbox` (locked when required, ariaLabel "Include Financials") · ordinal (t-figure ink-3) · heading (t-strong ink) · describe (t-small ink-2, `STEP_DESCRIBE`) · meta (t-meta ink-3) "Document Intelligence · required" or "Peer Benchmarks · optional · simulated comparables" · trailing `LinkButton role="meta"` "Show in memo". Footer: **primary "Start drafting"** + `Kbd ⌘↵` and ghost "Cancel"; then "Drafting starts in 6 s · " + `LinkButton role="meta"` "Hold", or "Held · start when ready"; then t-meta ink-3 "An unattended start is recorded as 'Plan auto-started', never as your approval." | `.chat-card` (paper, 1px line, `--r-md`, padding 12 16, gap 12) | each row → its skeleton card (and holds the countdown, §2.6) |
| `plan-record` (`plan-record`) | the plan was approved (an entry "Plan approved by reviewer" or "Plan auto-started · unattended countdown" exists for the run) | `StatusLabel done role="small"` "Plan approved by you · 5 of 5 steps", or `StatusLabel info role="small"` "Plan auto-started · unattended countdown · 4 of 5 steps"; second line t-meta ink-3 "Skipped: Peer benchmarks" when any optional step was skipped; meta clock "14:02:51". Counts and skipped headings come from `ctx.plan` (`p.skipped`), never from parsing the entry detail. | status line | none |
| `step` (`step:<stepId>`) | each started step, in plan order | Line (copy in §2.4): t-small **ink** text, then t-meta meta "94% · 1.1 s" (the confidence span in `confTone`, the duration ink-3), then " · " and `LinkButton role="meta"` "Show in memo" with `ariaLabel` "Show in memo · Financials" (the visible label leads the name, WCAG 2.5.3). While a call is in flight: t-meta ink-3 "Calling Document Intelligence…". Below, stacked (gap 4): `Disclosure` "Record" (meta "args 2 fields · result 8 fields") → `JsonBlock` "args →" and "← result"; `Disclosure` "Reasoning" → t-small ink-2, `white-space: pre-line`, no caret. | grid [16px `StatusGlyph`][1fr]. Glyph `drafting` (the static accent bar) / `done` / `error`. | its section card |
| `step`, phase `skipped` (`skip:<stepId>`) | an excluded optional step, in plan order | t-small ink-3 "Skipped peer benchmarks · excluded at plan review" | glyph `excluded` | its excluded card |
| `flag` (`flag:<flagId>`) | each engine flag, in emission order, after its step; kind `send-back` is omitted (the `returned` item carries it) | `NoteView` verbatim: heading "Breach · Max Total Leverage", the engine message, meta "raised by Covenant Tester · 14:02:57". Actions: "Show row" (row anchors) or "Show in memo" (section anchors), plus "Amend term" at an amendable live gate. A superseded note reads info with "· superseded by rev 2". | `MarginNote` inside `.chat-flag` (padding-left 24, aligned with the step text) | the row or section |
| `flag` evidence check (`evidence-check`) | once `step_extract` is done | heading "Evidence check"; text from `evidenceCheckNote` (`select-file.ts:921-948`), for example "3 of 8 figures are not quoted in the CIM: interest coverage, fixed-charge coverage and liquidity. They come from the extraction model; verify against the source." (uploads add " Extraction ran at 76% confidence on an unseen document."); meta "Countersign · deterministic check"; action "Show in memo" | `MarginNote` tone info | Financials (`sec:financials`) |
| `gate` (`gate:<rev>`) | each package that reached the gate | **Current** (live, gate, not leaving): `StatusLabel awaiting role="small"` "Suspended at the countersignature · rev 1" + t-meta "2 notes above to review · decide below" (or "No notes to review · decide below"). No token: the card states the call. **Leaving:** `StatusLabel returned role="small"` "Returning for revision". **Past:** `StatusLabel done role="small"` "Rev 1 presented for countersignature" + `Token variant="muted"` (the call presented at that revision: rev 1 = `decide` on the filed figures; rev n = that revision's outcome, the §5.5 TO word or the standing call) + clock. | status line (+ token when past) | none |
| `returned` (`returned:<n>`) | each send-back, shown as soon as the plan grows (before the rework step starts) | `StatusLabel returned role="small"` "You returned rev 1 for revision"; quote t-small ink-2 “Tighten the leverage covenant before I can sign.”; t-meta ink-3 "Reviewer · 14:05 · agent-drafted, edited by the reviewer"; `LinkButton role="meta"` "Show in memo" | block, `tabIndex=-1` | the revision card |
| `decided` (`decided`) | sealed | `StatusLabel role="strong"` (`signed` / `signed-auto` / `rejected`) with the record headline ("The agent recommended ESCALATE. You countersigned."); t-meta caption "Countersigned · concurs ESCALATE · Reviewer · 17 Oct 2026, 14:03"; policy checks (auto); quote + provenance; amendment `Redline`s; routed line "Routed to the Book for senior credit review · " + `LinkButton` "Open in Book"; `LinkButton role="small"` "Show the record" | `.chat-card`, `tabIndex=-1` | the memo signature card |
| `system` (`exhibit:<entryId>`) | each attached stress test (entries of kind `whatif`) | `StatusLabel info role="small"` "Exhibit A attached · stress test flips" + clock + `LinkButton role="meta"` "Show in memo" | status line | the exhibits card |
| `system` (`error`) | mode `error` | `StatusLabel error role="small"` "Run error · drafting stopped at Covenant compliance" | status line | the stopped card |
| `you` (entry id) | a composer submit | the text as typed | `.chat-you`: right aligned, `--sunken`, `--r-md`, padding 8 12, t-body ink, max-width 85% | none |
| `answer` (entry id) | a composer reply | **answer:** t-body ink-2 + t-meta ink-3 meta "rule-based responder · simulated" (engine responder) or "Countersign" (local). **done:** `StatusLabel done role="body"` + text. **refusal:** `StatusLabel info role="body"` + text. Optional action `LinkButton role="small"` ("Go to decision", "Show covenant rows", "Open stress test", "Open source", "Open in Ledger"). | left aligned, no bubble | per action |

**Exactly one caret.** The caret stays in the memo's drafting card (§5.7). No thread item renders `Caret` and no thread item animates, except the one-shot `v2-flash` on a revealed item (§2.6). This keeps C06 and the runtime loop probe (`state/effects.ts:37-40`).

**Primaries in the panel** (C13 per file, and the one-visible-primary probe `state/effects.ts:29-36`): "Draft memo" in `ContextItem.tsx` (only when `context.primary` is set, i.e. not started); "Start drafting" in `PlanCard.tsx` (plan review); the decision primary in `DecisionCard.tsx` (gate). These states are mutually exclusive, and the memo pane holds no primary.

### 2.3 Derivation: `selectThread(s, dealId)`, pure over existing state

**Inputs:** `fileContext(s, dealId)` (`select-file.ts:515-578`: mode, plan, steps, pkg, seal, entries, run, cancelled, snapshot, the same for a live run and a sealed snapshot); `selectNotes` (below); `selectSignature` (record headline); the run's `whatif` entries; `s.plan`, `s.gate`, `s.policy`, `s.ui.thread`, `s.ui.threadEpoch`, `s.ui.noteCursor`, `s.ui.showReasoning`.

**Step 1 · structural list S.** Each item gets an internal time `t`; a missing `t` inherits the previous item's, and `t` is forced non-decreasing down the list.
1. `context` (t = −∞); then `system cancelled` when `ctx.cancelled` (t = −∞).
2. Plan:
   - mode `plan-review` (live): `plan`, t = `(threadEpoch[dealId] ?? 0) + 1`;
   - else, when `ctx.runId !== null` and an entry labelled "Plan approved by reviewer" or "Plan auto-started · unattended countdown" exists: `plan-record`, t = that entry's `t`.
3. For each **non-rework** plan step `p`, in plan order:
   - `p.skipped` → the skipped `step` item;
   - else, if a `StepView` with that id exists → its `step` item (t = the entry labelled `` `Step ${st.index + 1} · ${st.title}` ``, written at step_started, `useCreditAgent.ts:235`); then its flags in emission order, skipping kind `send-back` (t = `flagTimer`, `select-file.ts:767-780`); then, if `p.id === 'step_extract'` and the step is done, `evidence-check`;
   - else stop: later steps are pending and get no item.
4. If an entry "Awaiting human approval" exists: `gate:1` (t = that entry).
5. For each **rework** plan step `p`, n = `reworkN(p.id)`:
   - `returned:n` (t = the "Plan extended · reviewer send-back" entry whose detail equals `p.title`; content from `returnedRecord(ctx, n)`, `select-file.ts:1175-1203`);
   - the rework `step` item and its flags (send-back omitted), if the step exists;
   - `gate:n` when "Awaiting human approval · rev n" exists.
6. Terminal: sealed → `decided` (t = `seal.decidedAt`); mode `error` → `system error` (t = the "Run error" entry).

**Step 2 · timed extras E**, sorted by `t`: `system exhibit:<id>` for each `whatif` entry of the run; and every `s.ui.thread` entry with `dealId === dealId && t >= (threadEpoch[dealId] ?? −∞)`, as `you` / `answer`.

**Step 3 · merge.** Each extra is inserted before the first structural item after `context` whose `t >= extra.t`; if none, at the end. So a start echo written at `t = epoch` lands above the plan card (`epoch + 1`), and a question asked at the gate lands after the gate item and before `decided`.

**Other ThreadView fields:**
- `dock = ctx.live && ctx.mode === 'gate'` (this includes `gate.leaving`).
- `head.stepper` from `selectNotes(...).toReview` (null when empty).
- **`toReview` is in emission order** (top to bottom in the thread), so J/K and the Signed over list follow what the reader sees. The page-order loop in `buildNotes` (`select-file.ts:916-918`) is replaced by a walk over the flag refs in emission order.

`selectNotes(s, dealId)` returns `{ all, toReview }`: `all` = every flag note in emission order plus the evidence-check note; `toReview` = the counted, non-superseded notes in emission order.

**Q&A has one source.** The thread reads only `s.ui.thread`. The engine's `agent.messages` (cleared on every `start()`/`reset()`, `useCreditAgent.ts:355,490`) is no longer used by V2: the composer answers through the model (`answerFor`, §4.3), which calls the same pure responder the engine uses (`answerQuestion`, `src/agent/responder.ts:11`). `selectAsk` (`select-file.ts:1699-1725`) is retired.

### 2.4 Step line copy (model, `STEP_LINE` in `vocab.ts`)

| Step | Running | Done (keyed on the step's result, never on its title) |
|---|---|---|
| `extract_financials` | Extracting financials from the CIM… | Extracted financials |
| `compute_risk_score` | Scoring risk… | Scored risk |
| `benchmark_peers` | Benchmarking against simulated peers… | Benchmarked against simulated peers |
| `check_covenants` | Testing covenants… | Tested covenants |
| `assemble_approval_package` | Writing the recommendation… | Wrote the recommendation |
| `propose_restructure` (any rework step) | Searching for a revised structure… | `asCure(result.data)` viable with `contributionM > 0` → "Proposed a revised structure"; `viable === false` → "Searched for a revised structure · none within policy"; viable with `contributionM <= 0` → "Revised per your note · recommendation stands" |
| skipped optional step | n/a | Skipped peer benchmarks · excluded at plan review |
| stopped (mode error, no result) | n/a | Stopped while testing covenants (state `error`) |

The engine titles the rework step "Propose revised structure · rev n" only when a cure with a positive contribution exists, else "Revise per reviewer note · rev n" (`runAgent.ts:320-325`), and the Structuring Engine runs either way, so the result is the reliable key (Cobalt: "Searched for a revised structure · none within policy").

Done meta = `` `${fmtConf(conf)} · ${fmtDuration(durationMs)}` `` ("94% · 1.1 s"). The confidence span takes `confTone` (`select-file.ts:278-280`): ink-3 at 90% and above, warn 75 to 89%, bad below 75%.

### 2.5 Auto-follow (ChatThread, component-local)

1. `pinned` (a ref, initially true) = `scrollHeight − scrollTop − clientHeight <= 24`, recomputed on every scroll event.
2. On a new item (the item count or the last id changes) and on `ResizeObserver` callbacks for **both** the list and the scroller (the dock appearing shrinks the scroller): if `pinned`, set `scroller.scrollTop = scroller.scrollHeight` in a layout effect. **Instant jumps, never `behavior: 'smooth'`**: a smooth follow reads its own frames as reader scroll and unpins itself (CLAUDE.md, UI elevation pass).
3. Not pinned: new items add to `unseen`. When `unseen > 0`, show `Button variant="secondary" size="sm" icon={ArrowDown}` labelled `newActivityLabel(unseen)` ("New activity · 3"), absolute at the bottom centre, 12px above the thread's bottom edge. A click jumps to the bottom, re-pins and resets `unseen`. It is an in-place affordance, not a toast (P-17 holds).
4. On mount (panel opened, file switched): jump to the bottom and pin, unless a `threadCue` or `noteFocus` whose `at` is less than 1000 ms old is waiting (§2.6), which is revealed instead.
5. A composer send always re-pins and jumps.
6. Reveals (`threadCue`, `noteFocus`) use `scrollIntoView({ block: 'center', behavior: 'auto' })`; pinning then follows from the resulting scroll position.

### 2.6 Links between the thread and the memo (the trace)

**Cues carry time.** `memoCue`, `threadCue` and `noteFocus` each carry `{ tick, at }` (`at = Date.now()` when written). A consumer reacts to a tick change after mount, and on mount honours a cue whose `at` is less than 1000 ms old (the panel or memo may mount in the same batch as the write). Re-honouring the same cue on a remount within that second is harmless (one more scroll and flash). This replaces the "ticks present at mount are ignored" pattern (`FileScreen.tsx:311-313`) for these three cues.

**Thread → memo:** `actions.cueMemo(target, { instant?, keepDrawer? })`, `MemoTarget = { section, anchorId }` (§7.1).
1. Drawer mode: close the drawer first, unless `keepDrawer`.
2. Write `ui.memoCue = { section, anchorId, instant, tick + 1, at }`.
3. FileScreen: scroll `[data-section="<section>"]` into view with `block: 'start'` (cards carry `scroll-margin-top: 60px`, below the 44px doc bar), instant when `instant` or reduced motion, else smooth; when `anchorId` names a row, then `scrollIntoView({ block: 'nearest' })` on its `[data-anchor]` in the next frame; then cue the anchor, or the card's head (`sec:<section>`) when `anchorId` is null or `sec:*`, with the existing `cue()` (`FileScreen.tsx:242-258`).
4. The look: one `v2-flash` (`--accent-wash` → transparent over `--dur-flash`, 1200ms) on the exact row (`.k-table__row.is-flash`, `kit.css:470`) or head; under reduced motion a static `--sunken` highlight held `CUE_HOLD_MS` (1200ms). The card itself never moves, outlines or casts a shadow.
5. Sources:

| Thread element | Target | Also |
|---|---|---|
| step "Show in memo" | the section card | none |
| flag "Show row" | `cov:<name>` / `fig:<id>` / `rev<n>:<id>` | `markOpened(flagId)` at the live gate |
| flag "Show in memo" | the section | `markOpened(flagId)` at the live gate |
| flag "Amend term" | the covenant row, then `focusAmend(kind)` | `markOpened(flagId)` |
| plan row "Show in memo" | the skeleton card | `holdPlan()` first (reading the plan is engagement) |
| `returned` "Show in memo" | the revision card | none |
| `decided` "Show the record" | the signature card | none |
| exhibit "Show in memo" | the exhibits card | none |

Every explicit note action counts the note as opened (P-13), as today (`FileScreen.tsx:355-361`).

**Memo → thread:** `actions.revealInThread(stepId, { openPane? = true })`.
1. `openPane` → `showChat()` (transient). With `openPane: false` a hidden panel stays hidden and the call is a no-op.
2. Write `ui.threadCue = { itemId: 'step:<stepId>', openRecord: true, tick + 1, at }`.
3. ChatThread reveals the item, opens its "Record" disclosure and flashes the item wrapper (`v2-flash`, same tokens).
4. Sources: each memo card's "Record" link (§5.3); a key figure in the Recommendation card calls `cueMemo(kf.target)` then `revealInThread(kf.traceStepId, { openPane: false })`, replacing `actions.trace` (`Recommendation.tsx:46`).

**Not built:** connector or leader lines across panes ("Tether", judged too fancy in the concept panel, `scratchpad/concept-agent-workspace.json`). The trace is scroll plus one flash.

---

## 3. The decision card (the one place to decide)

### 3.1 Structure, content and the verb row (`screens/decision/DecisionCard.tsx`, renders `selectSignature` verbatim)

The card **is** the dock's content: no second frame inside the dock.

```
.chat-dock (C)                         border-top 1px line; flex 0 1 auto; min-height 0
└ section.decision-card (D)            data-decision data-state data-pattern="P-23"; canvas background;
  │                                    flex column; flex 0 1 auto; min-height 0; container: decision-card
  ├ .decision-card__scroll             overflow-y auto; flex 0 1 auto; min-height 96px; padding 16 16 12; gap 16
  │   1 call · 2 signed over · 3 reviewer note · 4 amendment summary · 5 idle policy line · 6 attestation
  └ .decision-card__foot               flex none; padding 12 16 16; 1px top line; gap 8
      7 live policy line (countdown or hold) · 8 the verb row
```

Because the thread has `flex: 1 1 0; min-height: 96px` and the dock `flex: 0 1 auto; min-height: 0`, the dock takes its content height until only the thread's 96px floor is left, and then its scroll region shrinks. The verbs never scroll out of view. The card root registers itself with `actions.registerDecision(el)` and is labelled by the call title (`aria-labelledby`).

**Scroll region, top to bottom:**
1. **Call.** `p.t-label`: ink-3 `call.lead` "The agent recommends" + `Token` `call.token` (always the agent's own call). `p.t-heading` `call.title` ("Send Project Atlas to senior credit review?"). `p.t-small` ink-2 `call.why` (`select-decision.ts:136-194`); its "n notes above are yours to sign over" is true, since the flag messages sit above the dock.
2. **Signed over.** t-label ink-3 `signedOverLabel` ("Signed over · you opened 0 of 2"), then 28px rows on 1px rules: `StatusGlyph` + text (t-strong; struck + " · cleared by amendment" when cleared) + `LinkButton role="label"` with the row's own `linkLabel` ("Show row" for row anchors, "Show in memo" for section anchors) → `focusNoteById(noteId)`.
3. **Reviewer note.** Head row: t-label "Reviewer note · on the record" + `LinkButton` "Draft from notes" + `Chip` provenance ("agent-drafted · unedited" / "agent-drafted · edited by you"). `TextArea size="note"` registered with `actions.registerNoteField(el)`. Hint `role="alert"` in bad-ink when `needNote`.
4. **Amendment summary** (when amended): t-small "Amended terms · Max Total Leverage ≤ 4.00x → ≤ 4.30x · as amended" + `Token` (the amended outcome) + `LinkButton` "Revert" + `LinkButton` "Edit in memo" → `cueMemo({ section: 'covenants', anchorId: 'cov:<name>' })` then `focusAmend(editKind)`. Amending itself stays on the covenant row (P-05).
5. **Idle policy line** (policy off, or on but not eligible): t-meta ink-3 `policy.line` and, when on, `Disclosure` "Show checks".
6. **Attestation**, t-meta ink-3 (§10 copy, `select-decision.ts:71-116`): last in the scroll region, directly above the pinned verbs, so it is read before committing.

The returned history ("Rev 1 returned for revision · …") is **not** in the card: the thread shows each `returned` item right above, and the memo record keeps the history.

**Pinned foot:**
7. **Live policy line**, only when `policy.on && policy.eligible`: countdown "Auto-countersign in 4 s · clean-approval policy · " + `LinkButton role="meta"` "Review manually"; held: the hold caption ("Held · you started reviewing"); plus `Disclosure` "Show checks". It stays visible while the countdown runs.
8. **The verb row.** `ul.decision-card__choices`, one horizontal row with a fixed wrap point:

```css
.decision-card__choices { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 12px 16px; list-style: none; }
.decision-card__choice { display: flex; flex: 1 1 0; flex-direction: column; align-items: flex-start; gap: 8px; min-width: 0; }
.decision-card__choice--sign { flex: 1 0 100%; }                   /* the primary owns line 1 */
.decision-card__choice > span { width: 0; min-width: 100%; }        /* a caption takes its unit's width */
@container decision-card (max-width: 319px) {
  .decision-card__choice button > span[aria-hidden="true"] { display: none; }   /* decorative Kbd chips drop; A/S/R still work */
}
```

- Line 1: `<span data-sign-primary>` wrapping **primary** `verbs.primary` + `Kbd A`, caption `verbs.notes.sign` under it at the full row width.
- Line 2: secondary `verbs.returnLabel` + `Kbd S` and danger `verbs.rejectLabel` + `Kbd R`, side by side, each with its caption (`verbs.notes.ret`, `verbs.notes.rej`) under its own button.
- The units are `flex: 1 1 0` with the button's `nowrap` label as their minimum, so a unit never gets narrower than its button and a label never ellipsizes (`kit.css:44`).

Width check (md buttons, 13px/500 labels, padding 12 + 1px borders, chip 8 + 18; calibrated against `decision.css:108-111`, "Countersign revised structure" = 212 without its chip, 238 with it):

| Label | without chip | with chip |
|---|---|---|
| Countersign revised structure | ≈ 212 | ≈ 238 |
| Countersign escalation / as amended | ≈ 167 | ≈ 193 |
| Countersign approval | ≈ 154 | ≈ 180 |
| Countersign decline | ≈ 148 | ≈ 174 |
| Return for revision | ≈ 148 | ≈ 174 |
| Reject memo | ≈ 96 | ≈ 122 |

| Where | Card content width | Line 2 (Return 16 Reject) | Result |
|---|---|---|---|
| column 400 (≥ 1280), drawer 400 (760 to 1023) | ≈ 368 | 312 with chips | 2 lines, chips shown |
| column 360 (1024 to 1279) | ≈ 328 | 312 with chips | 2 lines, chips shown |
| drawer at 390 (memo pane 326) | ≈ 294 | 260 without chips | 2 lines, chips dropped (< 320) |

So the row is always exactly two lines: never a third line, never a column. Builders re-measure in the browser; the acceptance is "two lines at every width in §1.3" (§9.4).

**Clicks.** A click (or Enter or Space) on the primary calls `requestSign('card')` and **signs at once**: activating the visible primary is the deliberate act. Return → `tryRework()`. Reject → `tryReject()`.

### 3.2 Card states

| `SignatureView.state` | Card |
|---|---|
| `pending` (running) | Not rendered (`ThreadView.dock` is false). |
| `gate` | As §3.1. Verbs live. |
| `countdown` | As gate, with the live policy line in the foot. The memo record line shows the P-11 fill (§3.3). Verbs live; manual signing wins (`state/gate.ts:316-321`). |
| `held` | The foot shows the hold caption. |
| `leaving` (return for revision) | Class `decision-card--leaving`: `opacity: 0.4`, `transition: opacity var(--dur-2) var(--ease-out)`. Verbs, note and links disabled. After `cssMs('--dur-2')` the loop resumes, the dock unmounts and the `returned` item appears. |
| `signed` / `signed-auto` / `rejected` | Not rendered (the dock closes). The thread's `decided` item is the compact record; the memo foot holds the full record. |

Every V1 guard stays in `state/gate.ts`: verbs are dead while `leaving` and once `justSigned.runId === runId` (`state/gate.ts:101-104`); every refusal holds the countdown first (`:328`, `:347`).

### 3.3 The memo signature record (`screens/decision/SignatureRecord.tsx`, FileScreen's `signature` slot)

Rendered inside `MemoCard section="signature"` with `SectionHead` eyebrow `v.eyebrow` ("Countersignature record · CAM-2026-0417 · rev 1") and heading `v.heading` ("Countersignature"). The two lines sit in a `div[data-record-focus][tabIndex=-1]`.

| State | Content |
|---|---|
| `pending` | Returned history + `pendingLine` ("The signature opens when the memo is assembled." / "…when revision 2 is assembled."). |
| `gate` / `held` | Returned history; agent line (pre-signed `/s/ Credit Analyst`) + reviewer line `state="open"` **without `onActivate` or `lineRef`** (the record awaiting ink, not a control); caption `v.memo.caption` "Awaiting your countersignature · decide in the agent panel" (or the hold caption) + `LinkButton role="meta"` `v.memo.goToDecisionLabel` "Go to decision" (wrapped in `data-chat-toggle`) → `requestSign('button')`. |
| `countdown` | Reviewer line `state="countdown"` with the P-11 fill; caption = the policy line + `LinkButton` "Review manually". |
| `leaving` | Caption "Returning for revision". |
| `signed` | `record.headline` as `StatusLabel signed role="strong"` ("The agent recommended ESCALATE. You countersigned."), the ink (`animate` only within `INK_REPLAY_WINDOW_MS`, `select-decision.ts:292-293`), caption, the sealed record (quote + provenance, amendment redlines, routed line + "Open in Book"), then the static Signed over list ("Signed over · you opened 1 of 2") whose links call `cueMemo(target)`. |
| `signed-auto` | Headline "The agent recommended APPROVE. The policy countersigned.", `/auto/ clean-approval policy`, no ink, the four checks. |
| `rejected` | Headline "The agent recommended DECLINE. You rejected the memo.", REJECTED on the bad rule, the reason quoted with its provenance. |

**Signing reveals the ink.** Phase two of `requestSign` ends with `cueMemo({ section: 'signature', anchorId: null }, { instant: true })`. In column mode the memo pane is visible, so the ink draws in view. In drawer mode that cue closes the drawer, so the memo (and the ink) is what the reviewer sees.

**Refactor.** `SignatureBlock.tsx` is deleted, with `revealLine` (`SignatureBlock.tsx:53-66`) and `signFromPrimary` (`:126-130`). The call, note, amendment and verb markup moves to `DecisionCard.tsx`; the lines and sealed markup to `SignatureRecord.tsx`. Both read `selectSignature`. `decision.css` renames `.decision-sig*` to `.decision-card*` (card) and `.decision-record*` (memo). The record's two-line grid (`248px | 1fr`) collapses to one column under `@container k-memocard (max-width: 559px)` instead of the viewport query (`decision.css:189-190`).

### 3.4 Keyboard and "bring into view" (exact)

`requestSign(source: 'key' | 'button' | 'card')` replaces the line-visibility rule (`state/gate.ts:287-323`). The palette source is gone (§6.5).

```ts
requestSign(source):
  s = x.current()
  if (!atGate(s) || verbsDead(s)) return                          // unchanged guards
  live = selectLiveDealId(s); if (!live) return
  here = onLiveFile(s)
  card = x.decisionRef.current
  primary = card && card.isConnected ? card.querySelector('[data-sign-primary] button') : null
  onScreen = here && chatShown(s) && primary instanceof HTMLElement && inViewport(primary)
  sign = source === 'card' || (source === 'key' && onScreen && document.activeElement === primary)
  if (!sign) {                                                    // phase one: nothing is signed
    if (!here) x.navigate({ name: 'file', dealId: live, at: 'signature' })
    showChat()                                                    // transient reveal (drawer: open it)
    if (primary && primary.isConnected) {
      x.pendingSignFocus.current = 0
      requestAnimationFrame(() => primary.isConnected && primary.focus({ preventScroll: true }))
    } else {
      x.pendingSignFocus.current = Date.now()                     // registerDecision focuses it within 3000 ms
    }
    if (source === 'key') x.announce('sign-ready')                // "Countersign is focused. Press A again to sign."
    return
  }
  // phase two: unchanged from today (amendments, provenance, presented, justSigned, agent.approve)
  then cueMemo({ section: 'signature', anchorId: null }, { instant: true })
```

`inViewport(el)` = `rect.height > 0 && rect.top >= 0 && rect.bottom <= window.innerHeight`.

**Semantics (updates P-02):**
- **A** signs only when the decision card is on screen **and** the primary verb already holds focus. Otherwise the first A opens the panel if needed, moves focus to the primary and announces "Countersign is focused. Press A again to sign."; the second A signs. A stray keystroke while reading never signs, even though the docked card is always visible at the gate.
- A typed in the note or the composer is typing (`state/shortcuts.ts:28-33`) and never reaches this action.
- **Primary click / Enter / Space** on the focused primary signs (`'card'`).
- **"Go to decision"** (doc bar, memo record, palette, composer reply) is phase one only (`'button'`).
- **S / R:** `showChat()` first, then the unchanged `tryRework()` / `tryReject()` (`state/gate.ts:325-365`). With an empty note they set `needNote` and focus the note field: if `x.noteFieldRef.current` is connected, through `focusTick` as today; otherwise they set `x.pendingNoteFocus.current = Date.now()` and `registerNoteField` focuses it on mount within 3000 ms. With a note present they act at once.
- Guards unchanged: no meta, ctrl or alt; not typing; palette closed; not `leaving`; no `e.repeat` (`state/shortcuts.ts:78-105`).

### 3.5 Focus handling

| Moment | Focus |
|---|---|
| Gate arrival | Never stolen. The live region announces as today: "The agent is suspended at the countersignature. 2 notes to review." |
| Phase-one A, Go to decision | The card's primary (`[data-sign-primary] button`), directly or via `pendingSignFocus`. |
| S or R with an empty note | The note TextArea; its hint has `role="alert"`. |
| After sign or reject, column mode | The dock unmounts. If `document.activeElement` is `body`, ChatThread focuses the `decided` item (`tabIndex=-1`, `preventScroll`, then the pinned jump). |
| After sign or reject, drawer mode | The instant signature cue closed the drawer (a successful `tryReject` issues the same `cueMemo({ section: 'signature', anchorId: null }, { instant: true })` as signing, in both modes). If focus is on `body`, SignatureRecord focuses `[data-record-focus]` (`preventScroll`; the cue already scrolled it into view). |
| After return for revision | ChatThread focuses the new `returned:<n>` item when focus is on `body` (both modes; the drawer stays open). |
| `]` or the doc bar toggle opens the panel | The composer TextArea. |
| The panel or drawer closes with focus inside | The visible `[data-chat-toggle] button` (shell, §1.5). |
| J / K, Signed over link | The thread note (`[data-note]`, `tabIndex=-1`). `presentNote` (`state/ui.ts:260-271`) marks it opened only once shown and focused at the same live gate, and now retries for up to 3 animation frames because the panel may have just mounted. |

---

## 4. The composer (backlog #7: a composer that can start a run)

### 4.1 Anatomy, keyboard, states

- `TextArea size="composer"`: auto-grows from 36px to 160px (kit, §7.3). `ariaLabel` "Message the Credit Analyst". The draft lives in `ui.composerDraft[dealId]`: not persisted, kept across panel collapse and file switches, cleared on send.
- **Enter** sends a non-blank draft. **Shift+Enter** inserts a newline. Enter during IME composition never sends. Enter with meta, ctrl or alt never sends (so ⌘↵ stays the global approve/start, `state/shortcuts.ts:59-75`, and is never doubled by a submit). `IconButton ArrowUp` "Send" is disabled while the draft is blank.
- The composer is never disabled on a case file: every input gets an answer or a reason.
- **The composer never signs, returns, rejects, amends or writes the reviewer note.** Those words get a refusal that points to the card or the covenant row.

Placeholders (`COPY.placeholders`):

| File mode | Placeholder |
|---|---|
| not started | Type “draft the memo” to start, or “draft without peer benchmarks” |
| plan review | Type “start drafting” or “skip peer benchmarks” |
| running | Type “stop” to stop the run. Questions open when the memo is assembled. |
| gate | Ask about this file. Decide with the buttons above. |
| sealed (live or snapshot) | Ask about this file, or type “re-run” to draft it again |
| error | Type “re-run” to draft again |

### 4.2 Parsing (model, pure, deterministic, conservative): `parseComposer(raw, c)`

```ts
n      = raw.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!]+$/, '')
q      = n.endsWith('?')
bare   = n.replace(/\?+$/, '').trim()
POLITE = /^(please |can you |could you |would you |will you )+/
polite = POLITE.test(bare)
core   = bare.replace(POLITE, '').replace(/ please$/, '').trim()
asks   = !polite && (q || /^(why|what|how|which|who|when|where|is|are|was|were|does|do|did|should|explain|tell me|summari[sz]e|walk me through)\b/.test(core))
```

Patterns (JS):

```ts
START      = /^(draft|start|run|begin|re-?run|kick off|go ahead)( (it|this|memo|the memo|a memo|the analysis|the file|this file|drafting|the draft|the run|a run))?( now)?$/
START_LEAD = /^(draft|start|run|begin|re-?run|kick off|go ahead)\b/
PLAN_OK    = /^(approve|accept|confirm)( the)? plan$/
DECIDE     = /\b(countersign\w*|sign( it| off| this)?|approve\w*|accept\w*|lgtm|reject\w*|refuse|decline\w*|send (it |this )?back|return( it| this)?( for revision)?|rework|revise it)\b/
AMEND      = /\b(amend\w*|waive\w*|waiver|step.?down|loosen|tighten|raise|lower|change|set)\b.*\b(leverage|liquidity|covenant\w*|threshold\w*|terms?)\b/
NOTE       = /^(note|my note|reason)\s*[:,-]/  or  /\b(add|write|put|leave)( a| my)? note\b/
STEPS      = { step_peers: /\b(peers?|benchmarks?|comparables|comps)\b/, step_extract: /\b(financials|extraction|extract)\b/,
               step_risk: /\b(risk|rating|score)\b/, step_covenants: /\bcovenants?\b/, step_package: /\b(recommendation|memo builder)\b/ }
EXCL       = /\b(skip|exclude|drop|remove|without|no|leave out|turn off|disable)\b/
INCL       = /\b(include|add|keep|with|turn on|enable|restore|bring back)\b/
NEG        = /\b(don't|do not|never|not)\b/
HOLD       = /^(hold|wait|pause|hold on|not yet|review manually|stop the countdown|hold the countdown)$/
STOP       = /^(stop|cancel|abort|stop (the )?(run|drafting)|cancel (the )?(run|plan|plan review))$/
STRESS     = /\b(stress|what.?if|scenario|sensitivit\w*)\b/
```

`toggle` = exactly one STEPS key matches `core` **and** exactly one of EXCL / INCL matches **and** NEG does not match. Both verbs, or NEG with a step word and a verb, → `refuse 'ambiguous'`. A step word with no verb is not a toggle.

Rules, first match wins:

| # | Applies when | Rule | Intent |
|---|---|---|---|
| R1 | always | `PLAN_OK` on core | live plan review → `approve-plan`; not started → `refuse 'no-plan'`; else `refuse 'plan-fixed'` |
| R2 | `!asks` | `START_LEAD` on core **and** a toggle | **compound start.** Required step with exclude → `refuse 'required-step'`. Live plan review → `start-plan {toggle}` (apply the toggle, then approve the plan as edited). This file running or at the gate → `refuse 'already-live'`. `c.parsing` → `refuse 'parsing'`. Otherwise → `start {toggle}` (the plan opens with the toggle applied and the countdown held, §4.3). |
| R3 | `!asks` | `DECIDE` on core | `refuse 'decision'` |
| R4 | `!asks` | `AMEND` on core | `refuse 'amend'` |
| R5 | `!asks` | `NOTE` on core | `refuse 'note'` |
| R6 | `!asks` | a toggle (no start verb) | not live plan review → not started ? `refuse 'no-plan'` : `refuse 'plan-fixed'`. Required + exclude → `refuse 'required-step'`. Otherwise `toggle-step {stepId, include}`. |
| R7 | `!asks` | `START` on core | live plan review → `approve-plan`; this file running or at the gate → `refuse 'already-live'`; `c.parsing` → `refuse 'parsing'`; otherwise `start {toggle: null}` |
| R8 | `!asks` | `HOLD` on core | `c.planCountdown` → `hold 'plan'`; `c.policyCountdown || c.policyEligible` → `hold 'policy'`; else `refuse 'nothing-to-hold'` |
| R9 | `!asks` | `STOP` on core | this file live (plan review, running or gate) → `stop`; else `refuse 'nothing-running'` |
| R10 | `!asks` | `STRESS` on core | `c.stressAvailable` → `open-stress`; else `refuse 'no-stress'` |
| R11 | `asks` | question | `c.askEnabled` → `question {text: raw.trim(), stress: STRESS.test(core)}`; else `refuse 'question-closed'` |
| R12 | fallback | none | `c.askEnabled` → `question`; else `refuse 'unknown'` |

So "can you draft the memo" and "please run it" start a run (polite instructions are instructions), "can you countersign it?" is refused as a decision, and "why escalate?" is a question.

`ComposerContext` (`composerContext(s, dealId)`, §7.1):
- `askEnabled` = the file shows a package at the gate or sealed (`ctx.pkg !== null && (ctx.mode === 'gate' || ctx.mode === 'sealed')`), live or snapshot. The answers read only the deal and the package.
- `askDisabledReason` = `COPY.askDisabledNotStarted` (not started, plan review) or `COPY.askDisabledRunning` (running, error).

### 4.3 Execution (`state/composer.ts`, A) and replies (`composerReply` / `answerFor`, B)

`submitComposer(dealId, raw)`:
1. Trim; if empty, return.
2. `c = composerContext(s, dealId)`; `intent = parseComposer(raw, c)` (both read the store **before** any hold, so replies can say "the countdown is held").
3. **Engage** (the integrity rule, `state/gate.ts:6-8`): if `dealId === selectLiveDealId(s)`: at the gate → `holdAuto(x, 'engaged')`; in plan review → hold the plan countdown (`held: true, holdReason: 'manual', deadline: null`, the same write as `holdPlan`, `state/plan.ts:47-50`). This runs for **every** intent, questions and refusals included, before anything executes, so no countdown can fire while a typed refusal or question sits in the thread.
4. Write a `you` entry (`t = Date.now()`; for a `start` that opens a fresh plan review, `t = threadEpoch[dealId]` after `doStart`).
5. Execute the intent (table).
6. Write the reply entry, if any.
7. Clear `composerDraft[dealId]`; the thread re-pins.

`setComposerDraft(dealId, text)` also engages (step 3's rule) on every change to non-blank text, exactly like `setNote` (`state/gate.ts:247-257`): typing is engagement.

| Intent | Effect | Reply (tone · text · action) |
|---|---|---|
| `start {toggle}` | `startFile(dealId, { toggle })`: the same guarded path (no start while parsing; confirm strip if any run is live, `state/files.ts:179-189`). The toggle rides `x.pendingPlanToggle` (§6.3). If a strip opened: close the drawer in drawer mode. | Strip opened: refusal · "Project Atlas is live. Confirm in the bar above the memo to start Project Meridian, or keep Project Atlas." With a toggle and no strip: done · "Peer benchmarks is off in the plan." (or "…is in the plan.") + " The countdown is held: choose Start drafting when ready." Otherwise none (the plan card answers). |
| `start-plan {toggle}` | toggle if needed (`togglePlanStep`), then `approvePlan()` (the plan as edited, `state/plan.ts:52-57`) | none (the plan-record answers) |
| `approve-plan` | `approvePlan()` | none |
| `toggle-step` | already in that state: nothing; else `togglePlanStep(stepId)` | done · "Peer benchmarks is off. Drafting skips it and the memo marks it excluded." / "Peer benchmarks is back in the plan." + " The auto-start countdown is held." when `c.planCountdown`. Already: done · "Peer benchmarks is already off in the plan." / "…already in the plan." |
| `hold 'plan'` | `holdPlan()` | done · "Held. Drafting starts when you choose Start drafting." |
| `hold 'policy'` | `reviewManually()` (hold `manual`) | done · "Auto-countersign held. The memo waits for your decision." |
| `stop` | `requestStop()` (opens the strip, never stops directly); closes the drawer in drawer mode | done · "Stopping discards this run. Confirm in the bar above the memo." |
| `open-stress` | `openStress(dealId)` (which also cues `stress`, §6.2) | done · "The stress test is open in the memo. Nothing there is on the record until you attach it." · `{memo, 'Show in memo', {section:'stress', anchorId:null}}` |
| `question` | `answerFor(s, dealId, text)` (model): a local intercept via `askRoute` (`select-file.ts:1733-1757`), else the engine's pure responder `answerQuestion(deal, true, ctx.pkg, q)` | Local: answer · the `askRoute` text · meta "Countersign"; a stress question adds `{stress, 'Open stress test'}`. Engine: answer · the responder text · meta "rule-based responder · simulated". |
| `refuse 'decision'` | none | At the live gate: refusal · "Decisions are made on the decision card, where your note and the attestation go with them. Typing cannot countersign, return or reject." · `{decision, 'Go to decision'}`. Otherwise: "Nothing awaits your decision yet. The decision card appears here when the agent stops for your countersignature." |
| `refuse 'amend'` | none | Amendable gate: "Terms are amended on the covenant row in the memo and take effect only with your countersignature." · `{memo, 'Show covenant rows', {section:'covenants', anchorId:'sec:covenants'}}`. Otherwise: "Terms can be amended only at the countersignature, on a memo built on the filed figures." |
| `refuse 'note'` | none | Gate: "Your note goes in the decision card, where it is recorded with your decision." · `{decision, 'Go to decision'}`. Otherwise: "Notes are written at the countersignature." |
| `refuse 'required-step'` | none | "Covenant compliance is required and cannot be skipped. Only peer benchmarks is optional." (heading via `sectionHeading`) |
| `refuse 'ambiguous'` | none | "Say “skip peer benchmarks” or “include peer benchmarks”." |
| `refuse 'no-plan'` | none | "No plan is open yet. Type “draft the memo” to open one; optional steps are chosen there." |
| `refuse 'plan-fixed'` | none | "The plan is fixed once drafting starts. Optional steps are chosen at plan review." |
| `refuse 'already-live'` | none | Running: "Project Atlas is already drafting. Type “stop” to discard the run." Gate: "Project Atlas is awaiting your countersignature. Decide on the card above, or type “stop” to discard the run." |
| `refuse 'parsing'` | none | `parsingReason(s)`: "Extraction in progress · q3_cim.pdf" |
| `refuse 'question-closed'` | none | `c.askDisabledReason` ("Questions open when the memo is assembled.") |
| `refuse 'nothing-to-hold'` | none | "Nothing is counting down." |
| `refuse 'nothing-running'` | none | "Nothing is running on this file." |
| `refuse 'no-stress'` | none | "The stress test opens once the memo is assembled." |
| `refuse 'unknown'` | none | "Try “draft the memo”, “skip peer benchmarks”, “hold” or “stop”. Questions open once the memo is assembled." (when `askEnabled` this rule never fires) |

Reply actions → `decision`: `requestSign('button')`; `memo`: `cueMemo(target)`; `stress`: `openStress(dealId)`; `source`: `openSource()`; `ledger`: navigate to the Ledger filtered to the file.

**One echo.** `submitComposer` writes the only `you` entry. The local intercept and the engine responder each produce only the answer. There is no mirror of `agent.messages`, so a question shows exactly one `you` and one `answer`.

### 4.4 How entries persist

- `ui.thread: ThreadEntry[]` is capped at the last 300 entries and is **no longer cleared** by `clearReading` (`state/ui.ts:168-174`).
- Visibility is decided by the per-file epoch instead. `doStart(dealId)` sets `threadEpoch[dealId] = Date.now()` (a re-run starts a fresh thread) and, when it replaces a live run on another file, also sets that file's epoch (no orphan Q&A under "Last run cancelled"). `confirmStop()` sets the live file's epoch.
- Entries carry `dealId`, so a sealed file keeps its Q&A after another file is drafted.

---

## 5. The memo pane after the move

### 5.1 Removed from the memo

- The page grid `.file-grid` / `.file-row` / `.file-pagecell` / `.file-margincell` and the one continuous sheet (`file.css:215-273`).
- `Margin.tsx` (`MarginCell`, `Notes`, `Stub`) and every "Notes" label (`Margin.tsx:16`): deleted.
- `HeaderMargin` (`PageHeader.tsx:49-103`): Show all reasoning moves to the agent head, Ask to the composer, the evidence check to the thread.
- `Contents.tsx`: deleted. The plan card is in the thread; the memo shows skeleton cards (§5.7).
- The doc bar note stepper (`DocBar.tsx:122-128`), now in the agent head.
- The note, stub, hover and reasoning reading state in `FileScreen.tsx` (`:211-220`, `:266-324`) and the `stackTables` / `stackWide` viewport queries (`:202-203`).

### 5.2 Page structure and separation

`.file-content { max-width: 808px; margin: 0 auto; padding: 24px 24px 48px; display: flex; flex-direction: column; gap: 16px; }`, padding 16 under `@container viz (max-width: 639px)`. In order:

1. **Header on the canvas** (no card; padding 8 24 0 so its text aligns with card content): eyebrow "Credit approval memorandum" (t-eyebrow ink-3), borrower (t-display, the page's only display line), meta (t-small ink-2), prepared (t-meta ink-3), cancelled note, seal row (§5.11).
2. **Section cards** `MemoCard section="<id>"`: financials, risk, peers, covenants, `revision-N`…, recommendation (`pageSectionIds`).
3. `MemoCard section="exhibits"` when any exhibit exists: `slots.exhibits`.
4. `<div class="file-scratch" data-section="stress">`: `slots.stress`, **no card** (the stress test keeps its dashed provisional frame, scratch semantics).
5. `MemoCard section="signature"`: `slots.signature` (SignatureRecord), once running.
6. `MemoCard section="monitoring"`: the Appendix.

**Separation: one paper card per section, on the canvas.**

| Option | Verdict |
|---|---|
| Spacing plus a rule inside one sheet | Rejected. Today's single sheet with 32px between rows (`file.css:225-235`) is exactly what reads as one blob; a rule inside the same white field is still one field. |
| One paper card per section | Chosen. The 16px of canvas between 1px-framed cards gives every section a visible boundary at a glance (LangChain usage and Exa usage both put titled white 1px cards on a grey canvas, §11). Each card is also its own container, so tables stack by the section's real width (§5.8). No new colours: the canvas already surrounds the memo. |

### 5.3 Card anatomy and the type ladder

**Kit `MemoCard`** (§7.3): `<section class="k-memocard" data-section data-pattern="P-26" aria-label>`; paper, 1px `--line`, `--r-md`, `scroll-margin-top: 60px`, `container: k-memocard / inline-size`; body `.k-memocard__body`: padding 24 (16 when the card is under 560px), flex column, **gap 24** between the head and each block.

**Kit `SectionHead`** (new anatomy, replaces `kit/SectionHead.tsx:18-33`):
1. Top row (flex, space-between, gap 12, min-height 16): `p.t-eyebrow` ink-3, ellipsized ("Step 1 of 5 · Document Intelligence"), and the `aside` slot on the right.
2. Title `h2.t-figure-lg` ink, margin-top 4.
3. Takeaway (margin-top 8, flex, gap 8, align start): a `StatusGlyph state` (box height `--t-strong-lh`), or for the recommendation `[Token variant="struck" prior] [Token token]`; then `p.t-strong` **ink** `text`; then, on its own line, `p.t-meta` ink-3 `basis` when present.
4. The head root keeps `data-anchor={anchorId}` and the flash and highlight cues (`useFlash`, `kit/Table.tsx:52-77`).

**Blocks** (screen-owned, `file.css`): `.file-block` is a flex column with gap 8; `.file-block__label` is `p.t-label` ink-2 (sentence case), then the table, meter or list. The 24px between blocks against 8px from a label to its content keeps labels attached to their content and apart from the table's own header band (sunken, ink-3).

**The ladder (existing roles only):**

| Level | Role | Size / line / weight | Colour |
|---|---|---|---|
| Page title (borrower) | `t-display` | 22 / 28 / 600 | ink |
| Section eyebrow | `t-eyebrow` | 11 / 16 / 500, uppercase | ink-3 |
| **Section title** | `t-figure-lg` | 18 / 24 / 500, −0.014em | ink |
| **Takeaway** | `t-strong` | 13 / 20 / 500 | ink, with a status glyph |
| Block label | `t-label` | 12 / 16 / 500 | ink-2 |
| Table header | `t-label` (kit) | 12 / 16 / 500 | ink-3 on `--sunken` |
| Body | `t-body` | 13 / 20 / 400 | ink / ink-2 |
| Figures | `t-figure` | 13 / 20 / 500, tabular | ink (bad-ink when flagged) |

- Today the title is `t-heading` 15/600 over 13px body (`kit/SectionHead.tsx:26`), a 1.15 ratio, which is why sections read as one level. `t-display` (22) is the one-per-screen page title (SPEC §4) and is already the borrower and the Desk, Book and Ledger titles, so reusing it would make every section equal to the page. `t-figure-lg` is the only 18px role (`v2.css:71`): 22 → 18 → 13 gives a 1.38 section-to-body ratio, inside the measured in-app range (CLAUDE.md "real 2026 pass": no reference exceeds 1.5×).
- **The 18px role belongs to section titles alone inside a memo card.** Two figures used it and would read at the title's rank: the Risk score (`Risk.tsx:26`) becomes `t-figure` inline in its block, and `KeyFigure`'s value (`kit/KeyFigure.tsx:29`) moves to `t-heading` (15/20/600), a kit change (F). `KeyFigures` is used only by the Recommendation card and the kit page.
- P-26 records that a dedicated 18/600 title role would be a one-line token addition if the owner wants more weight; it is not built (the brief keeps the 12 roles closed, SPEC §4).

**Aside** (right of the eyebrow, `SectionView.aside`):
- set: t-meta "94% · 1.1 s" (the confidence span in `confTone`) + " · " + `LinkButton role="meta"` "Record" → `revealInThread(recordStepId)`;
- drafting / excluded / stopped: `StatusLabel role="label"` "Drafting" / "Excluded" / "Stopped";
- pending: none.

### 5.4 Blocks per section

| Card | Eyebrow · title | Blocks (label → content) |
|---|---|---|
| 1 | "Step 1 of 5 · Document Intelligence" · "Financials" | **Size** → Table (Figure 1fr \| Value 120 end \| Source 200): revenue, Adj. EBITDA, EBITDA margin, total debt. **Tested by covenants** → the same columns, `header={false}`: total leverage, interest coverage, fixed-charge coverage, liquidity. |
| 2 | "Step 2 of 5 · Risk Engine" · "Risk score and rating" | **Score** → one line: t-figure "58" + t-meta "/100" + t-body rating + `EvidenceTag` model; then `Meter kind="risk"` (tick 75) + t-meta "Decline line · 75 (with a breach)". **Drivers** → the factor list (unchanged tones, `Risk.tsx:35-44`). |
| 3 | "Step 3 of 5 · Peer Benchmarks" · "Peer benchmarks" | **Against simulated comparables** → Table (Cohort \| Leverage \| Interest coverage \| EBITDA margin, numbers end). The "This deal" row is t-strong. The old position sentence becomes the takeaway. |
| 4 | "Step 4 of 5 · Covenant Tester" · "Covenant compliance" | **Tests on the filed figures** (or **Tests as amended** when amendments are in force) → Table (Covenant 1fr \| Threshold 128 **end** \| Actual 88 end \| Cushion 152 \| Status 104). AmendField in place at the live gate (unchanged, `Covenants.tsx:41-62`). The heading suffix "· 1 of 4 breached" is removed (`select-file.ts:1343-1347`); the takeaway says it. |
| R*n* | "Returned for revision · Structuring Engine" · "Revision 2" | **Reviewer note** → quote t-small ink-2 + attribution t-meta ink-3. Then **Proposed revision** → summary t-body + redline Table (Figure \| Rev 1 \| Rev n), or **Outcome** → the no-cure `StatusLabel watch` line or "no restructure is needed" line. |
| 5 | "Step 5 of 5 · Memo Builder" · "Recommendation" | The takeaway carries the token(s), the sentence and the basis. **Summary** → `pkg.summary` t-body ink-2. **Key figures** → `KeyFigures` (5). **Analysis aid · not part of the memo** → nearest flip t-small ink-2 + `LinkButton` "Stress test ↓". The rework line (t-meta ink-3) stays when present. |
| Exhibits | "Attached by the reviewer" · "Exhibits" | the table, unchanged (`Exhibits.tsx:13-58`) |
| Signature | "Countersignature record · CAM-2026-0417 · rev 1" · "Countersignature" | §3.3 |
| Appendix | "Appendix · simulated drift" · "Portfolio Monitor readings" | aside t-meta "sweep #4 · 6 s ago"; the table or "First sweep pending." |

Every card: numbers right-aligned (`align: 'end'`, tabular-nums globally, `v2.css:80`); the evidence column is renamed "Source", narrowed 240 → 200, and kit `.k-evidence` text drops to ink-3 for every class (`kit.css:200-201`) while cites keep `--accent-ink`; one emphasis per section (§5.6). The total in the eyebrow ("of 5") is the count of non-rework plan steps; an excluded step keeps its number.

### 5.5 Takeaways, derived in the model (`model/takeaways.ts`, pure)

`takeaway` is non-null only when `phase === 'set'`. Steps 1 to 4 state facts, never "deciding" language and never the call. Figures use the existing formatters (`fmtFigure`, `cushionOf`, `fmtSigned`, `fmtM`, `fmtX`). `<label>` is the `FIGURES` label (`evidence.ts:28-37`), lower-cased mid-sentence. "Thin headroom" = `cushionOf(...).tone === 'warn'` (0 to under 10%, `evidence.ts:227`).

The functions are pure over engine and view types, so a golden check can call them without a store (§10):

```ts
financialsTakeaway(deal: Deal, f: ExtractedFinancials, amended: boolean): TakeawayView
riskTakeaway(risk: { score: number; rating: string }): TakeawayView
peersTakeaway(dealLeverageX: number, medianLeverageX: number): TakeawayView
covenantsTakeaway(rows: CovenantRow[], amended: boolean): TakeawayView
revisionTakeaway(r: { kind: 'cure'; contributionM: number; revisedLeverageX: number; from: Recommendation; to: Recommendation }
                  | { kind: 'none-needed'; rec: Recommendation } | { kind: 'no-cure'; rec: Recommendation }): TakeawayView
recommendationTakeaway(body: RecommendationBody): TakeawayView
```

| Card | Rule (first match) | Atlas | Meridian | Cobalt |
|---|---|---|---|---|
| Financials | The tested figures (leverage, interest, fixed, liquidity), each against its **filed** covenant (`covenantForFigure`, `select-file.ts:292-296`), cushion = `cushionOf(threshold, value)`. **1 breach** → `breach` · "`<Label> <value>` breaches the `<threshold>` covenant; the other `<k>` tested figures clear theirs." (clause omitted when k = 0). **≥ 2 breaches** → `breach` · "`<b>` of `<m>` tested figures breach their covenants, led by `<label> <value>` against `<threshold>`." (lead = most negative cushion). **None, tightest thin** → `watch` · "No tested figure breaches its covenant, but `<label> <value>` has thin headroom: `<cushion>` against `<threshold>`." **Else** → `pass` · "Every tested figure clears its covenant; the tightest is `<label> <value>`, with `<cushion>` cushion against `<threshold>`." When amendments are in force, `basis` = "Tested against the covenants as filed; amended terms are tested in Covenant compliance." | breach · "Total leverage 4.26x breaches the ≤ 4.00x covenant; the other 3 tested figures clear theirs." | pass · "Every tested figure clears its covenant; the tightest is total leverage 2.80x, with +30.0% cushion against ≤ 4.00x." | breach · "4 of 4 tested figures breach their covenants, led by total leverage 5.66x against ≤ 4.00x." |
| Risk | s = score, r = rating, state from `riskTone` (`rating.ts`: good → `pass`, warn → `watch`, bad → `breach`). **s ≥ 75** → "Risk `s` (`r`) is at or over the 75 decline line." **Else** → "Risk `s` (`r`) is `75 − s` points under the 75 decline line." (`plural` for 1 point) | watch · "Risk 58 (B2 / Speculative) is 17 points under the 75 decline line." | pass · "Risk 28 (Ba2 / Non-investment grade) is 47 points under the 75 decline line." | breach · "Risk 82 (Caa1 / Substantial risk) is at or over the 75 decline line." |
| Peers | d = the deal's leverage, m = the "Sector median" cohort's (`benchmark_peers`, `tools.ts:63-68`). Always `info` · "Total leverage `d` is above the sector median of `m`." ("below" when d < m, "level with" when equal). `basis` = "Comparables are simulated." | info · "Total leverage 4.26x is above the sector median of 3.96x." | info · "Total leverage 2.80x is above the sector median of 2.60x." | info · "Total leverage 5.66x is above the sector median of 5.26x." |
| Covenants | The rows under the amendments in force (`covenantRows`, `select-file.ts:1037-1053`); `as` = " as amended" when amendments exist. **b = 1 or 2** → `breach` · "`b` of `n` covenants breached`as`: `<names, listJoin>`." **b ≥ 3** → `breach` · "`b` of `n` covenants breached`as`, led by `<name>` (`<cushion>`)." **b = 0, tightest thin** → `watch` · "All `n` covenants pass`as`; `<name>` has thin headroom (`<cushion>`)." **Else** → `pass` · "All `n` covenants pass`as`; the tightest is `<name>` (`<cushion>`)." | breach · "1 of 4 covenants breached: Max Total Leverage." ≤ 4.30x → watch · "All 4 covenants pass as amended; Max Total Leverage has thin headroom (+0.9%)." ≤ 4.10x → "1 of 4 covenants breached as amended: Max Total Leverage." Liquidity ≥ $15.0M → "2 of 4 covenants breached as amended: Max Total Leverage and Min Liquidity." | pass · "All 4 covenants pass; the tightest is Max Total Leverage (+30.0%)." | breach · "4 of 4 covenants breached, led by Max Total Leverage (−41.5%)." |
| Revision n | **Viable cure** → `pass` · "`<fmtM(contribution)>` sponsor equity brings total leverage to `<revised>`: `<FROM>` becomes `<TO>`." **No restructure needed** → `info` · "The filed structure already passes every covenant: `<REC>` stands." **No cure** → `watch` · "No structure within policy clears the covenants: `<REC>` stands." (token words via `tokenWord`; this is the revision's own outcome, read where the revision sits) | rev 2 · pass · "$6.0M sponsor equity brings total leverage to 4.00x: ESCALATE becomes APPROVE." | if returned · info · "The filed structure already passes every covenant: APPROVE stands." | rev 2 · watch · "No structure within policy clears the covenants: DECLINE stands." |
| Recommendation | token = `tokenOf(pkg.recommendation)`; prior = the struck rev-1 token when restructured; text = `recommendationSentence` (`select-file.ts:1130-1145`); basis = `body.basis` | [ESCALATE] "Escalate to a credit officer. 1 covenant breach rules out approval; risk 58 sits below the 75 decline line." · On the filed figures. Rev 2: ~~ESCALATE~~ [APPROVE] "Approve the revised structure. $6.0M sponsor equity clears every covenant; risk 55 (B2 / Speculative)." · On the proposed revised structure · rev 2 | [APPROVE] "Approve. Every covenant passes on the filed figures; risk 28 (Ba2 / Non-investment grade)." | [DECLINE] "Decline as structured. 4 covenant breaches and risk 82, at or above the 75 decline line." |

Golden inputs are SPEC Appendix A: Atlas cushions Lev −6.5% · Int +5.0% · FCC +7.3% · Liq +42.0%; Meridian Lev +30.0% tightest; Cobalt Lev −41.5% lead; Atlas cure $6.0M → 4.00x; amended ≤ 4.30x gives Lev +0.9%.

**Uploads** (`q3_cim.pdf`): the same rules over the synthesized figures (a 4.99x upload: "Total leverage 4.99x breaches the ≤ 4.00x covenant; the other 3 tested figures clear theirs." when the others clear). Low confidence is shown by the aside (for example "70% · 0.8 s" in bad-ink on Risk) and by the thread's low-confidence messages, never folded into a takeaway.

**Sealed snapshots** recompute the same takeaways from the snapshot's steps; amendments come from `seal.amendments` (`amendmentsOf`, `select-file.ts:586-592`), never from gate state after the seal.

### 5.6 Flagged figures: one emphasis per section

| Card | The emphasis, where it sits | Everything else |
|---|---|---|
| Financials | Each tested figure that breaches its filed covenant: `StatusGlyph breach` before its label and the value in bad-ink (`FigureRow.mark = 'breach'`, `valueTone = 'bad'`). Atlas: total leverage. Cobalt: all four tested rows. | Thin headroom is not marked here; the takeaway names it. |
| Risk | the meter fill in risk tone + the decline tick (existing) | score in ink; driver impacts keep their small text tones |
| Peers | the "This deal" row in t-strong (existing) | other rows t-body |
| Covenants | breached rows: Actual in bad-ink (`CovenantRow.actualTone`) + the Breach `StatusLabel` (existing) | thin cushions keep their warn meter (existing) |
| Revision | the redline cells (existing) | none |
| Recommendation | the token(s) + KeyFigure tones (existing) | none |

Screens never pick a tone: `valueTone`, `mark` and `actualTone` arrive from the model.

### 5.7 Skeleton, drafting and the caret

- **Not started and plan review:** `buildSections` stops returning `[]` (`select-file.ts:1285`) and returns the five skeleton cards: phase `pending`, `phaseLine` "Not drafted yet." (Recommendation: "Written last, after every covenant is tested."); an optional step toggled off in the plan under review: phase `excluded`, `phaseLine` "Off in the plan under review. Drafting skips it."; after approval an excluded step reads "Excluded at plan review by the reviewer." (unchanged). Toggling peers in the plan card, or typing "skip peer benchmarks", flips the Step 3 card live. The memo has no controls in these states.
- **Drafting:** the card shows `drafting.line` (t-small ink-2) with the `Caret` at its end: `callLine` "Calling Covenant Tester…" while a call is in flight, else "Writing this section…" (rework: "Writing revision 2…"). The streaming reasoning lives in the thread's Reasoning disclosure. **Exactly one caret** exists app-wide.
- **Pending / excluded / stopped** cards show the head (eyebrow and title, no takeaway) and the `phaseLine` (t-small ink-3), or `StatusLabel error` "Stopped".

### 5.8 Tables stack by their own width

Kit `Table.stackBelow` gains 640 and 480 (§7.3): Covenants, Appendix and the stress covenant table use 640; Financials, Peers and Revision use 480; Desk, Book and Ledger keep 760. This replaces the viewport queries (`FileScreen.tsx:202-203`, `StressTest.tsx:35-62`), which are wrong once a 360 to 400px panel sits beside the memo. Results: at memo pane 676 (1100) the covenant table stacks and Financials does not; at 326 (390) every table stacks.

### 5.9 Trace highlight

See §2.6 step 4: the row or the card head flashes `--accent-wash` to transparent once over 1200ms; under reduced motion it holds `--sunken` for 1200ms. Nothing else moves.

### 5.10 Doc bar (`DocBar.tsx`, `DocBarView`)

- **Left:** `<span data-chat-toggle>` ghost sm `Button icon={MessageSquare}` "Agent panel" and its `IconButton` twin, shown only when `docBar.chatToggle` is set (the panel is hidden and the file is not at the gate, where "Go to decision" opens it); then "Desk /" crumb and the file switcher (unchanged).
- **Centre:** status sentence, elapsed, extraction, policy suffix (unchanged). Plan review status: held → "Plan review · held"; counting → "Plan review · drafting starts in 6 s"; armed nowhere yet (panel hidden) → "Plan review · review the plan in the agent panel" (no frozen countdown).
- **Right:** "Review manually" (countdown); **"Go to decision"** (ghost sm, `PenLine` icon, wrapped in `data-chat-toggle`; was "Go to signature") → `requestSign('button')`; or "Go to drafting"; then the actions (Stop / Export file / Re-run / Open in Ledger); then the **Source toggle**, moved here (labelled `Button` and `IconButton` twins in `data-source-toggle`).
- The note stepper is removed. The doc bar still never holds a primary.

**Folds** key on the bar's own width (`container: file-docbar`, `file.css:139-141`), re-measured for the widest states. Budget (padding 48 + column gaps 32 + status floor 160):

| State | Left | Right | Total, nothing folded |
|---|---|---|---|
| gate | crumb 42 + switcher 128 | Go to decision 119 + Stop 45 + Source 162 | ≈ 760 |
| sealed, panel hidden (widest) | Agent panel 100 + crumb 42 + switcher 128 | Export 86 + Re-run 56 + Open in Ledger 98 + Source 162 | ≈ 952 |

| Container width | Fold |
|---|---|
| ≤ 999 | "Agent panel" label → its icon |
| ≤ 939 | the actions (Stop, Export file, Re-run, Open in Ledger) → "More" |
| ≤ 759 | Source label → its icon (same name, shown as a tip) |
| ≤ 659 | "Go to decision" / "Go to drafting", "Review manually", the Desk crumb and the policy suffix → "More" |

Acceptance: no clipping or overlap at doc bar widths 1112, 1224, 864, 824, 816, 752, 676, 600, 836, 696 and 326, in the gate, sealed-with-panel-hidden and running states (§9.6).

### 5.11 The header seal no longer states the call

`headerView` seal headline (`select-file.ts:1381-1390`) becomes the who-clause only: "You countersigned." / "You countersigned as amended." / "The policy countersigned." / "You rejected the memo.", followed by the unchanged receipt. The full sentence with the agent's call ("The agent recommended APPROVE on the revised structure. You countersigned.") moves to `SignatureView.record.headline` (memo foot) and the thread's `decided` item. So the top of a sealed memo never shows a token; the recommendation stays at the foot.

---

## 6. State (`src/v2/state/`)

### 6.1 Types: all store types move to `state/contracts.ts` (T)

`state/contracts.ts` (new) holds every type declaration currently in `store.tsx:28-192`, moved verbatim with their imports, plus the changes below. `store.tsx` keeps the provider and re-exports the types (`export type * from './contracts';`), so every `import type { … } from './store'` keeps working.

```ts
import type { MemoSection, ThreadAction } from '../model/types';   // type-only; model/types already imports from state

export type ChatLayout = 'column' | 'drawer';
export interface PaneState { chatOpen: boolean; revealed: boolean; drawerOpen: boolean }

export interface ThreadEntry {
  id: string; dealId: string; t: number;
  role: 'you' | 'answer';
  text: string; meta: string | null;
  tone: 'answer' | 'done' | 'refusal';
  action: ThreadAction | null;
}

export interface Cue { tick: number; at: number }

export interface UiState {
  sourceOpen: boolean;
  cites: { dealId: string; markIds: string[]; index: number } | null;
  memoCue: (Cue & { section: MemoSection; anchorId: string | null; instant: boolean }) | null;   // replaces trace + flash
  threadCue: (Cue & { itemId: string; openRecord: boolean }) | null;                            // new: memo → thread
  noteFocus: (Cue & { noteId: string }) | null;                                                 // gains `at`; targets the thread note
  noteCursor: number;
  amendFocus: { kind: 'leverage' | 'liquidity'; tick: number } | null;
  showReasoning: boolean;
  confirm: { kind: 'start'; dealId: string } | { kind: 'stop' } | null;
  paletteOpen: boolean;
  ledgerOpen: Record<string, boolean>;
  ledgerChip: LedgerChip;
  stress: Record<string, { open: boolean; scenario: Scenario }>;
  attached: Record<number, string[]>;
  thread: ThreadEntry[];                    // changed shape; capped 300; not cleared by clearReading
  threadEpoch: Record<string, number>;      // new: per dealId
  composerDraft: Record<string, string>;    // new: per dealId, not persisted
  parsingSince: number | null;
  pendingUploadOpen: boolean;
  announce: string | null;
}

export type AnnounceKind = 'gate' | 'signed' | 'auto' | 'rejected' | 'returned' | 'attached' | 'held' | 'sign-ready';

export interface V2Store { /* every existing field */ panes: PaneState; chatLayout: ChatLayout }

export interface V2Internals {
  /* every existing field EXCEPT lineRef and pendingLineFocus, plus: */
  panesRef: Box<PaneState>;
  setPanes: Setter<PaneState>;
  decisionRef: Box<HTMLElement | null>;           // registered DecisionCard root
  noteFieldRef: Box<HTMLTextAreaElement | null>;  // registered reviewer note field
  pendingSignFocus: Box<number>;                  // 0 = none; 3000 ms window
  pendingNoteFocus: Box<number>;                  // 0 = none; 3000 ms window
  pendingPlanToggle: Box<{ dealId: string; stepId: string; include: boolean } | null>;
  autoRevealed: Box<Set<string>>;                 // 'plan:<epoch>' | 'gate:<pkgKey>'
}
```

`x.current()` also returns `panes: panesRef.current`. Follow state (`pinned`, `unseen`) is component-local to ChatThread: view state tied to one scroller that resets on remount by design.

### 6.2 Actions (`V2Actions`, full list; † = new, ‡ = changed)

```ts
export interface V2Actions {
  navigate(to: Route): void;
  setPolicy(p: Policy): void;
  setSpeed(n: number): void;
  startFile(dealId: string, opts?: { toggle?: { stepId: string; include: boolean } }): void;   // ‡ optional toggle (§6.3)
  confirmStart(): void;
  requestStop(): void;
  confirmStop(): void;                                    // ‡ also sets threadEpoch[live]
  cancelConfirm(): void;                                  // ‡ also clears pendingPlanToggle
  upload(file: File): void;
  togglePlanStep(stepId: string): void;
  holdPlan(): void;
  approvePlan(): void;
  cancelPlan(): void;
  setNote(text: string): void;
  insertDraft(): void;
  setThreshold(kind: 'leverage' | 'liquidity', v: number | null): void;
  revertAmendments(): void;
  requestSign(source: 'key' | 'button' | 'card'): void;   // ‡ §3.4 ('line' and 'palette' removed)
  tryReject(): void;                                      // ‡ showChat() first; pendingNoteFocus; on success → instant signature cue
  tryRework(): void;                                      // ‡ showChat() first; pendingNoteFocus
  reviewManually(): void;
  registerDecision(el: HTMLElement | null): void;         // † consumes pendingSignFocus
  registerNoteField(el: HTMLTextAreaElement | null): void;// † consumes pendingNoteFocus
  markOpened(flagId: string): void;
  openSource(): void; closeSource(): void; toggleSource(): void;   // ‡ opening closes the drawer
  cite(dealId: string, markIds: string[], startIndex: number): void;
  citeStep(delta: 1 | -1): void;
  clearCites(): void;
  cueMemo(target: MemoTarget, opts?: { instant?: boolean; keepDrawer?: boolean }): void;   // †
  revealInThread(stepId: string, opts?: { openPane?: boolean }): void;                    // †
  focusNote(delta: 1 | -1): void;                         // ‡ showChat(); selectNotes; cueMemo(note.target, { keepDrawer: true })
  focusNoteById(noteId: string): void;                    // ‡ same
  focusAmend(kind: 'leverage' | 'liquidity'): void;
  setShowReasoning(v: boolean): void;
  openStress(dealId: string): void;                       // ‡ also cueMemo({ section: 'stress', anchorId: null })
  closeStress(dealId: string): void;
  setDriver(dealId: string, key: DriverKey, v: number): void;
  resetStress(dealId: string): void;
  attachStress(dealId: string): void;
  setChatOpen(open: boolean): void;                       // † explicit (persists in column mode)
  toggleChat(): void;                                     // † explicit
  showChat(): void;                                       // † transient reveal
  submitComposer(dealId: string, text: string): void;     // †
  setComposerDraft(dealId: string, text: string): void;   // † engages (§4.3)
  sweepNow(): void;
  acknowledge(id: string): void;
  markHandedOff(id: string): void;
  exportFile(dealId: string): void;
  exportSession(): void;
  setPaletteOpen(v: boolean): void;
  toggleLedgerGroup(key: string): void;
  setLedgerChip(c: LedgerChip): void;
}
```

Removed: `trace`, `flashAnchor`, `registerSignatureLine`, `ask` (its logic moves into `state/composer.ts` and `model/composer.ts`). `clearReading` now clears `cites`, `memoCue`, `threadCue`, `noteCursor` and `confirm`, and no longer touches `thread`.

### 6.3 Effects and plumbing

1. **Layout** (`state/panes.ts`): `chatLayout` from `matchMedia('(min-width: 1024px)')`, live. `chatOpen` read once from storage (default true).
2. **Auto-reveal** (`state/panes.ts`, §1.5): once per `plan:<epoch>` / `gate:<pkgKey>` while the live file is the route and the tab is visible; transient; never moves focus.
3. **Route hygiene:** a file change clears `revealed` and closes the drawer; any place change closes the drawer; opening the source in overlay mode closes the drawer and vice versa.
4. **Plan arming** (`state/plan.ts`): `armable` adds `chatShown(s)`.
5. **Compound start** (`state/files.ts` + `state/plan.ts`): `startFile(dealId, { toggle })` stores `x.pendingPlanToggle = { dealId, ...toggle }` before deciding between the strip and `doStart`. `doStart` applies a matching pending toggle to the fresh `enabledIds` it writes (`state/files.ts:172`) with `held: true, holdReason: 'manual'`, and clears it if the status was already `plan_review` (no status transition follows). The plan-review entry effect (`state/plan.ts:71-80`) applies and clears a pending toggle that matches the live deal instead of writing an unheld fresh draft. `cancelConfirm` and a `doStart` for another deal clear it. The reviewer sees the plan with the step off and the countdown held; nothing starts unseen.
6. **Engagement** (`state/composer.ts`): §4.3 step 3, also on `setComposerDraft`.
7. Unchanged: snapshot seal, routing, probes, announcements, the countdown effects (`state/gate.ts:388-439`, `state/plan.ts:82-123`).

### 6.4 Keyboard map (`state/shortcuts.ts`, replaces SPEC §7.6 rows)

| Key | Behaviour |
|---|---|
| ⌘K / Ctrl K | Palette (unchanged). |
| ⌘↵ / Ctrl ↵ | Unchanged: approve the live plan as edited, or start a not-started file. The composer never submits on it (§4.1). |
| A | Live file at the gate: `requestSign('key')` (§3.4). |
| S / R | Live file at the gate: `showChat()` then `tryRework()` / `tryReject()`. |
| J / K | File route: `focusNote(±1)`: reveals the panel, focuses the thread note, cues its memo anchor (drawer kept open). |
| `[` | File route: toggle the source (unchanged). |
| `]` | **New.** File route: `toggleChat()`. Opening focuses the composer. |
| Esc | Palette → kit menus → confirm strip → **drawer** (drawer mode) → source overlay (`sourceIsOverlay()`) → cites. |

- The single-key guards are unchanged (`state/shortcuts.ts:78-80`).
- **Esc from a field inside the drawer.** The global handler returns early for typing targets (`:79`). ChatPane therefore owns an `onKeyDown` for Escape: in drawer mode, when the target is not inside `[role="menu"],[role="dialog"],[role="listbox"]` and `!e.defaultPrevented`, it calls `setChatOpen(false)` (focus returns to the toggle, §1.5). The global handler calls `e.preventDefault()` whenever it closes something on Esc, so the two never both act.

### 6.5 Palette (`model/select-commands.ts`, `state/commands.ts`)

- The `sign` command ("Countersign", `select-commands.ts:32`) is removed: signing happens only on the card.
- "Go to signature" becomes **"Go to decision"** (`action: go-signature` → `requestSign('button')`, kbd hint "A").
- `announceFor('sign-ready')` = "Countersign is focused. Press A again to sign."
- The palette still never offers reject or return (`select-commands.ts:1-4`).

---

## 7. Interfaces between owners (TypeScript, exact)

### 7.1 Model view types (`model/types.ts`, T)

```ts
export type MemoSection = FileAt | 'header';            // FileAt from state/route.ts
export interface MemoTarget { section: MemoSection; anchorId: string | null }   // 'fig:leverage' | 'cov:Max Total Leverage' | 'rev2:debt' | 'sec:risk' | null

export interface TakeawayView { state: StatusKey; text: string; token: TokenView | null; prior: TokenView | null; basis: string | null }
export type SectionAside =
  | { kind: 'meta'; conf: string; confTone: 'ink-3' | 'warn' | 'bad'; duration: string; recordStepId: string; recordLabel: string }
  | { kind: 'status'; state: StatusKey; text: string };

interface SectionBase {
  id: SectionId; anchorId: string;                      // 'sec:<id>'
  eyebrow: string; heading: string;
  phase: SectionPhase; status: StatusKey; statusLabel: string;
  aside: SectionAside | null;
  takeaway: TakeawayView | null;                        // only when phase === 'set'
  phaseLine: string | null;                             // pending / excluded copy; null when set, drafting or stopped
  drafting: { line: string; caret: boolean } | null;
}                                                       // removed: ordinal, suffix, pendingLine, stub, notes
export type SectionView =
  | (SectionBase & { kind: 'recommendation'; body: RecommendationBody | null })
  | (SectionBase & { kind: 'financials'; body: FigureRow[] | null; blockLabels: { size: string; tested: string } })
  | (SectionBase & { kind: 'risk'; body: RiskBody | null })
  | (SectionBase & { kind: 'peers'; body: PeersBody | null })
  | (SectionBase & { kind: 'covenants'; body: CovenantRow[] | null; testsLabel: string })
  | (SectionBase & { kind: 'revision'; body: RevisionBody | null });

export interface FigureRow { id: FigureId; anchorId: string; label: string; value: string; evidence: EvidenceView; group: 'size' | 'tested'; valueTone: 'ink' | 'bad'; mark: 'breach' | null }
// CovenantRow: + actualTone: 'ink' | 'bad'
// RiskBody: + scoreLabel: string; driversLabel: string
export interface PeersBody { label: string; rows: { cohort: string; leverage: string; interest: string; margin: string; isDeal: boolean }[] }   // position removed
// RevisionBody: + noteLabel: string; proposalLabel: string    ('Proposed revision' | 'Outcome')
// RecommendationBody: + summaryLabel: string; keyFiguresLabel: string   (basis, prior, token, sentence kept for exports)
// KeyFigureView: + target: MemoTarget
// NoteView: + target: MemoTarget; actions[].kind is 'show' | 'memo' | 'amend' ('trace' removed; labels 'Show row' | 'Show in memo' | 'Amend term')
// DocBarView: - stepper; goToSignature → goToDecision: boolean; + chatToggle: { label: string } | null
// FileView: - headerMargin; - contents     (toReview stays, emission order; primary stays for ⌘↵)
// HeaderView.seal.headline: the who-clause only (§5.11)
// AppendixView: + eyebrow: string
// SignatureView: + eyebrow: string;
//   + memo: { caption: string; goToDecisionLabel: string | null };
//   + record: { state: StatusKey; headline: string } | null;          // sealed only
//   signedOver[] + target: MemoTarget; + linkLabel: string;
//   amendment + editLabel: string; + editKind: 'leverage' | 'liquidity';
//   reviewer.kbd is always null (the open line is not a control)
// removed: ContentsView, AskView

export type ThreadAction =
  | { kind: 'memo'; label: string; target: MemoTarget }
  | { kind: 'decision'; label: string }
  | { kind: 'stress'; label: string }
  | { kind: 'source'; label: string }
  | { kind: 'ledger'; label: string };

export type ThreadItem =
  | { kind: 'context'; id: 'context'; borrower: string; facility: string; source: string; uploaded: boolean; intro: string | null;
      sourceLabel: string; primary: { label: string; kbd: string; disabled: boolean; disabledReason: string | null } | null }
  | { kind: 'plan'; id: 'plan'; heading: string; meta: string;
      rows: { stepId: string; ordinal: string; heading: string; describe: string; meta: string; required: boolean; included: boolean; target: MemoTarget; linkLabel: string }[];
      primary: { label: string; kbd: string }; cancelLabel: string;
      countdown: string | null; held: boolean; holdLabel: string; heldLine: string; unattendedNote: string }
  | { kind: 'plan-record'; id: 'plan-record'; state: StatusKey; text: string; skipped: string | null; meta: string | null }
  | { kind: 'step'; id: string; stepId: string; phase: 'running' | 'done' | 'stopped' | 'skipped'; state: StatusKey;
      line: string; conf: string | null; confTone: 'ink-3' | 'warn' | 'bad'; duration: string | null; callLine: string | null;
      reasoning: string; record: StubView | null; target: MemoTarget; linkLabel: string; linkAria: string }
  | { kind: 'flag'; id: string; note: NoteView }
  | { kind: 'gate'; id: string; rev: number; current: boolean; state: StatusKey; text: string; detail: string | null; token: TokenView | null; meta: string | null }
  | { kind: 'returned'; id: string; n: number; text: string; quote: string | null; attribution: string; target: MemoTarget; linkLabel: string }
  | { kind: 'decided'; id: 'decided'; state: StatusKey; headline: string; caption: string; quote: string | null; provenance: string | null;
      amendments: { label: string; from: string; to: string }[]; routed: string | null; routedLinkLabel: string | null;
      checks: { ok: boolean; text: string }[] | null; link: ThreadAction }
  | { kind: 'system'; id: string; state: StatusKey; text: string; meta: string | null; link: ThreadAction | null }
  | { kind: 'you'; id: string; text: string }
  | { kind: 'answer'; id: string; tone: 'answer' | 'done' | 'refusal'; text: string; meta: string | null; action: ThreadAction | null };

export interface ThreadView {
  dealId: string; mode: FileMode; live: boolean;
  head: { heading: string; meta: string; stepper: { label: string; count: number } | null; reasoningLabel: string; reasoningOn: boolean;
          hideLabel: string; closeLabel: string; prevNoteLabel: string; nextNoteLabel: string };
  items: ThreadItem[];
  dock: boolean;
  composer: { placeholder: string; label: string; sendLabel: string };
}

export interface ComposerContext {
  dealId: string; dealName: string; mode: FileMode; live: boolean; otherLiveName: string | null;
  parsing: string | null; askEnabled: boolean; askDisabledReason: string | null;
  plan: { stepId: string; heading: string; optional: boolean; included: boolean }[];
  planCountdown: boolean; policyCountdown: boolean; policyEligible: boolean;
  amendable: boolean; stressAvailable: boolean; atGate: boolean;
}
export type ComposerToggle = { stepId: string; include: boolean };
export type ComposerIntent =
  | { kind: 'start'; toggle: ComposerToggle | null } | { kind: 'start-plan'; toggle: ComposerToggle } | { kind: 'approve-plan' }
  | { kind: 'toggle-step'; stepId: string; include: boolean }
  | { kind: 'hold'; target: 'plan' | 'policy' } | { kind: 'stop' } | { kind: 'open-stress' }
  | { kind: 'question'; text: string; stress: boolean }
  | { kind: 'refuse'; reason: 'decision' | 'amend' | 'note' | 'required-step' | 'ambiguous' | 'no-plan' | 'plan-fixed' | 'already-live'
      | 'parsing' | 'question-closed' | 'nothing-to-hold' | 'nothing-running' | 'no-stress' | 'unknown'; stepId?: string };
export type ComposerOutcome = 'done' | 'already' | 'confirm-opened' | 'refused';
export interface ComposerReply { tone: 'answer' | 'done' | 'refusal'; text: string; meta: string | null; action: ThreadAction | null }
```

### 7.2 Model functions (B; new exports through `model/index.ts`)

```ts
// model/select-thread.ts
export function selectThread(s: V2Store, dealId: string): ThreadView | null;
export function selectNotes(s: V2Store, dealId: string): { all: NoteView[]; toReview: NoteView[] } | null;
export function memoTargetOfAnchor(anchorId: string): MemoTarget;   // fig:* → financials · cov:* → covenants · rev<n>:* → revision-n · sec:<id> → id · else header
export function newActivityLabel(n: number): string;                // 'New activity · 3'
// model/composer.ts
export function composerContext(s: V2Store, dealId: string): ComposerContext;
export function parseComposer(raw: string, c: ComposerContext): ComposerIntent;
export function composerReply(intent: ComposerIntent, c: ComposerContext, outcome: ComposerOutcome): ComposerReply | null;
export function answerFor(s: V2Store, dealId: string, text: string): ComposerReply;   // askRoute, else answerQuestion (engine, pure)
// model/takeaways.ts  (the six functions of §5.5)
// model/select-top.ts
export function chatShown(s: V2Store): boolean;
// model/select-commands.ts: announceFor gains 'sign-ready'; the 'sign' command is removed
// model/fixtures.ts (kit page)
export const FX_NOTES: { breach: NoteView; watch: NoteView; low: NoteView; evidence: NoteView; restructure: NoteView; signedOver: NoteView };
export const FX_STUB_EXTRACT: StubView;
// FX_FILE_* and FX_SIG_* updated to the new shapes; their takeaways and eyebrows equal the §5.5 strings
```

New copy lives in `COPY` / `vocab.ts`: `agentName`, `agentPanel`, `hideAgentPanel`, `closeAgentPanel`, `goToDecision` (renames `goToSignature`), `awaitingInPanel`, `contextIntroOff`, `contextIntroOn`, `proposedPlan`, `showInMemo`, `showTheRecord`, `editInMemo`, `signReady`, `composerLabel`, `send`, `figureGroupSize`, `figureGroupTested`, `riskScoreBlock`, `riskDriversBlock`, `peersBlock`, `testsFiled`, `testsAmended`, `reviewerNoteBlock`, `proposalBlock`, `outcomeBlock`, `summaryBlock`, `keyFiguresBlock`, `excludedDraftLine`, `draftingLine`, `draftingRevision`, `exhibitsEyebrow`, `appendixEyebrow`, `appendixTitle`, `planReviewInPanel`, `placeholders.{notStarted, planReview, running, gate, sealed, error}`, the refusal and done strings of §4.3, and `STEP_LINE` (§2.4). `askDisabled*` and `askMeta*` stay.

### 7.3 Kit (F)

```ts
// SectionHead.tsx (breaking)
export interface SectionTakeaway { state: StatusKey; text: string; token?: { word: string; tone: MeaningTone } | null; prior?: { word: string; tone: MeaningTone } | null; basis?: string | null }
export interface SectionHeadProps { eyebrow: string; heading: string; takeaway?: SectionTakeaway | null; aside?: ReactNode; anchorId: string; flashKey?: number; highlighted?: boolean }
// MemoCard.tsx (new)
export interface MemoCardProps { section: string; ariaLabel: string; children: ReactNode }   // root data-section + data-pattern="P-26"
// TextArea.tsx
export interface TextAreaProps { /* existing */ size?: 'note' | 'composer'; onSubmit?: () => void }
//   note: 64 to 160px (today); composer: 36 to 160px.
//   onSubmit fires on Enter when !e.shiftKey && !e.nativeEvent.isComposing && !e.metaKey && !e.ctrlKey && !e.altKey && !e.defaultPrevented (then preventDefault).
// Table.tsx
export interface TableProps { /* existing */ stackBelow?: 760 | 640 | 480 }   // data-stack="<n>"; one @container k-table (max-width: n−1 px) rule per value; the existing 759 rule is scoped to data-stack="760"
// KeyFigure.tsx: the value role is t-heading (was t-figure-lg)
// kit.css: .k-evidence → --ink-3 for every class; .k-memocard; the new .k-sechead anatomy; the stack rules
```

`TextArea` keeps `inputRef`. `MarginNote`, `Disclosure`, `JsonBlock`, `StatusLabel`, `StatusGlyph`, `Token`, `Button`, `IconButton`, `LinkButton`, `Checkbox`, `Chip`, `Kbd`, `KeyFigures` and `SignatureLine` are otherwise unchanged. F exports exactly one new component (`MemoCard`); any other new `export function` in `kit/*.tsx` must be reported to G, because C20 requires it on the kit page.

### 7.4 Screen props (`state/screens.ts`, T) and composition (`App.tsx`, A)

```ts
export interface FileScreenProps { dealId: string; at: FileAt | null; navSeq: number; slots: { exhibits: ReactNode; stress: ReactNode; signature: ReactNode } }   // unchanged; signature = <SignatureRecord/>
export interface ChatPaneProps { dealId: string; layout: ChatLayout; slots: { decision: ReactNode } }   // decision = <DecisionCard dealId/>, mounted only while ThreadView.dock
export interface DecisionBlockProps { dealId: string }   // DecisionCard, SignatureRecord, StressTest, Exhibits
```

```tsx
// App.tsx, for a known #/file/<id> (unknown ids render FileScreen alone, full width)
const shown = chatShown(s);
<div className="app-split" data-chat={s.chatLayout === 'drawer' ? 'drawer' : shown ? 'column' : 'none'}>
  {shown ? <ChatPane key={dealId} dealId={dealId} layout={s.chatLayout} slots={{ decision: <DecisionCard dealId={dealId} /> }} /> : null}
  <div className="app-viz" data-viz="">
    <FileScreen key={dealId} dealId={dealId} at={r.at} navSeq={s.navSeq}
      slots={{ exhibits: <Exhibits dealId={dealId} />, stress: <StressTest dealId={dealId} />, signature: <SignatureRecord dealId={dealId} /> }} />
  </div>
</div>
```

---

## 8. Guardrails and the pending-review queue

**`npm run v2-check` must print `v2-check: 28 checks, clean`.** `scripts/v2-check.sh` is not edited.

| Check | How it is kept |
|---|---|
| C01, C03, C04, C05, C25, C26 | New CSS uses tokens and role classes only: spacing 4/8/12/16/20/24, radius tokens, `--shadow-pop` only on the drawer. No new type tokens (titles reuse `t-figure-lg`). |
| C02 | No JSX prop or attribute named `title` (view fields are named `heading`). |
| C06 | No new keyframes, no loops. Cues reuse `v2-flash`; the caret stays the only `infinite`. |
| C09, C17 | No em dashes in source. Token words only through the model; no "Approved", "Declined", "Awaiting approval", "Running…". |
| C11 | The stress frame stays the only dashed line (`--line-provisional`). |
| C13 | One `variant="primary"` per file: `ContextItem.tsx`, `PlanCard.tsx`, `DecisionCard.tsx`. |
| C15 | Every number and time is formatted in `model/`. |
| C19 | `v2.chatOpen` is read and written only in `state/panes.ts`. |
| C20 | `MemoCard` is rendered on `KitPage.tsx`; the SectionHead, TextArea, Table and KeyFigure specimens are updated. |
| C21 | New `data-pattern` ids (P-22 ChatPane, P-23 DecisionCard, P-25 composer, P-26 MemoCard) have entries in `design-pending.ts`. |
| C22, C23, C24 | `screens/chat/*` use kit controls only; `chat.css` and `decision.css` style no `.k-` class (the Kbd chip is targeted as `button > span[aria-hidden="true"]`, as `decision.css:119` does today); icon sizes 12/14/16. |
| C28 | Edits only in `src/v2/**`, `docs/v2/**` and the CLAUDE.md V2 section; engine hashes untouched. |

**`design-pending.ts` changes** (no em dashes, no hex):
- **P-22** (layout, proposedBy 'Owner request'): "Three-pane case file: navigation, agent thread, memo". The sidebar rails itself beside an open panel below 1400px without overwriting the stored choice; the panel is collapsible (persisted) in column mode, a drawer below 1024px; transient reveals at plan review and at the gate. Evidence: Dropbox Dash, Mistral Le Chat, Langdock (§11).
- **P-23** (interaction, 'Owner request'): "One decision card, docked in the agent thread". Call, Signed over, note, amendment summary and attestation scroll; the verbs are pinned in one row with a fixed wrap point (the primary on line 1, Return and Reject on line 2, never three lines). The memo keeps the signature record; its open line is not a control. Evidence: Higgsfield, Gumloop, Unify (§11).
- **P-24** (interaction, 'V2 three-pane addendum'): "Trace links between thread and memo": scroll plus one `v2-flash` on the exact row; "Record" links back. No connector lines.
- **P-25** (interaction, 'Owner request', backlog #7): "Composer that takes instructions": draft (also "draft without peer benchmarks"), start drafting, skip or include peer benchmarks, hold, stop, stress, questions. Any composer use holds a running countdown. Typed sign, return, reject, amend and note are refused with a pointer to the card or the covenant row.
- **P-26** (layout, 'Owner request'): "Memo sections as cards with a step eyebrow, a title, a one-line takeaway and labelled blocks". Titles use the 18px `t-figure-lg` role, which no in-card figure uses any more; a dedicated 18/600 title role would be a one-line token addition if preferred. Evidence: LangChain usage, Exa usage.
- **Update P-01:** the line in the memo is the record; the decision verbs are in P-23.
- **Update P-02:** "Two-press A: the first A focuses the primary on the decision card; the next A signs".
- **Update P-03:** "Flags as messages in the agent thread, linked to their row" (MarginNote reused).
- **Update P-12:** "Source on the memo pane's right edge: push when the pane is 1064px or wider, overlay below".
- **Update P-20:** the plan countdown also requires the plan card on screen.
- **`REJECTED_BEFORE` add:** `{ name: 'cross-pane connector lines (the concept-panel tether)', note: 'Judged too fancy in the concept panel; trace links scroll and flash instead (P-24).' }`.

---

## 9. Acceptance criteria

### 9.1 Global

1. On the integrated branch: `npm run build` is green and `npm run v2-check` prints 28 clean checks and exits 0.
2. Zero console errors and warnings on a fresh load of `/`, `/?kit` and `/?v=1`, and through every walkthrough (tab focused). `/?v=1` is unchanged.
3. On app routes, at every moment: at most one visible `.k-btn--primary` and at most one running infinite animation (the memo drafting caret). The dev probes never fire (`state/effects.ts:28-56`).
4. Each §0 owner decision holds: the agent's token never appears in the memo header (sealed files included) or in cards 1 to 4; in the memo it appears only in revision cards (their own outcome, as today), card 5, the signature record and the scratch areas below card 5; no "Notes" block or margin column; no ¶; the verb row is two lines at every width; the top bar has exactly the section name, the switch and search; light only; the card's lead token equals `pkg.recommendation` in every amended state; the routed line appears only when `routesOnSign` is true; "Nothing is signed without you" appears only with auto-countersign off.
5. No horizontal page scroll at 1728, 1440, 1280, 1100, 1024, 900, 760 and 390 on any route.

### 9.2 Layout

1. Measured nav / agent panel / memo pane: 216/400/1112 (1728), 216/400/824 (1440), 64/400/816 (1280), 64/360/676 (1100), 64/360/600 (1024). At 900, 760 and 390 the panel is a drawer (400, 400, 326).
2. The bottom edges of the agent head and the doc bar sit at y = 92 ± 0.5 at every column-mode width; the brand row and the top bar share y = 48.
3. Hide the panel, reload: it stays hidden and `localStorage['v2.chatOpen'] === '0'`. With storage throwing, the panel opens and the toggle still works.
4. At 1280 with the panel open, the sidebar is the 64px rail with the mark and no toggle. Hiding the panel restores the 216px sidebar (if expanded) without changing `v2.navCollapsed`. Toggling the panel never animates any width.
5. Desk, Book and Ledger render full width with no agent panel at every width.
6. At 1728 the source pushes on the right (canvas 752); at 1440 it overlays from the right under the doc bar. Navigating Desk → another file never throws (no `[data-viz]` yet) and opens it with the source closed. In drawer mode, opening the source closes the drawer and vice versa.
7. Drawer mode: entering plan review on the live file, and reaching the gate while on it, each open the drawer once. Esc closes it, including with focus in the composer or the note; focus returns to the doc bar toggle.
8. Column mode, panel hidden by the owner: entering plan review or reaching the gate reveals it transiently; `localStorage['v2.chatOpen']` stays '0'; switching files hides it again. J (or a memo "Record" link) reveals it without writing storage.

### 9.3 Thread

1. **Atlas rev-1 gate, policy off.** Items in order: context; plan-record "Plan approved by you · 5 of 5 steps"; "Extracted financials · 94% · …"; Evidence check "3 of 8 figures are not quoted in the CIM: …"; "Scored risk · 88% · …"; "Benchmarked against simulated peers · 86% · …"; "Tested covenants · 97% · …"; Breach · Max Total Leverage; Watch · Min Fixed-Charge Coverage; "Wrote the recommendation · 91% · …"; "Suspended at the countersignature · rev 1" with "2 notes above to review · decide below" and no token. The dock is shown; the head stepper reads "– of 2".
2. While drafting, the running step shows the static drafting glyph and "Calling …", with no animation; the single caret is in the memo's drafting card.
3. "Show row" on the breach scrolls the memo to `cov:Max Total Leverage` and flashes that row once (static `--sunken` for 1200ms under reduced motion); the gate's tally moves to "1 of 2". "Show in memo" on a low-confidence note (upload) also counts it.
4. A memo card's "Record" reveals the panel (if hidden), reveals that step, opens its Record disclosure and flashes it (also when the panel mounts in the same batch). A key figure flashes its Financials row and, only if the panel is shown, opens the Document Intelligence record.
5. Auto-follow: at the bottom, new items keep it pinned with instant jumps; scrolled up, "New activity · n" appears, and clicking it jumps and re-pins; no smooth scrolling is ever used for following.
6. "why escalate?" at the gate shows exactly one `you` and one `answer` (meta "rule-based responder · simulated"); it is still there after drafting another file and returning to Atlas's sealed record.
7. Rev 2 adds, in order: the past gate "Rev 1 presented for countersignature" [ESCALATE muted]; `returned:2` with the quote and provenance; "Proposed a revised structure · …"; "Restructure proposed: $6.0M …" (info); the current gate rev 2. Cobalt rev 2 reads "Searched for a revised structure · none within policy".
8. Stop on Atlas, confirm: the thread shows context, "Last run cancelled …" and no earlier Q&A.

### 9.4 Decision

1. **Content:** lead "The agent recommends" [ESCALATE]; "Send Project Atlas to senior credit review?"; the why sentence; "Signed over · you opened 0 of 2"; the note with Draft from notes; the attestation directly above the verbs; "Countersign escalation" on line 1, "Return for revision" and "Reject memo" side by side on line 2, each with its caption.
2. **Note visible without scrolling the card:** Atlas rev 1, one-line composer, at 1280×800 and 1100×800: the note TextArea is fully visible with the card's scroll region at `scrollTop` 0, and the verbs are visible.
3. **Verbs at width:** at panel 400, panel 360, drawer 400 and drawer 326 the verb row is exactly two lines; no label ellipsizes; with "Countersign revised structure" and "Countersign as amended" too.
4. **Amend in memo:** amending leverage to 4.30 on the covenant row makes the primary "Countersign as amended", the summary shows [APPROVE] with Revert and Edit in memo, and the lead token still reads ESCALATE.
5. **A, focus elsewhere:** focus in the memo, A once moves focus to "Countersign escalation" and announces "Countersign is focused. Press A again to sign."; nothing is signed (Ledger and run unchanged). A again signs. Tab to "Return for revision" and press A: focus moves to the primary, nothing is signed.
6. **A, panel hidden:** A reveals the panel and focuses the primary; the second A signs.
7. **Primary click** signs at once: the memo jumps to the signature record and the ink draws in view; the dock closes; the `decided` item takes focus (column mode). Drawer mode: the drawer closes and focus lands on `[data-record-focus]`.
8. **S with an empty note** shows the hint and focuses the note. Draft from notes shows "agent-drafted · unedited"; after editing, S recedes the card (opacity 0.4), the dock closes and `returned:2` appears and takes focus.
9. **Meridian, policy on, staying on the file:** the foot shows "Auto-countersign in 5 s · clean-approval policy · Review manually"; the memo reviewer line fills; at the deadline "/auto/ clean-approval policy" appears. Hiding the panel during the countdown does not hold it (P-20 is route + tab) and the doc bar keeps showing it. Switching to the Book holds it: "Held · you left the file".
10. **Cobalt:** the attestation says "signs over 5 notes, including 4 covenant breaches". Return gives rev 2 with "No structure within policy clears the covenants: DECLINE stands." Reject with a reason puts REJECTED on the memo record and the decided item reads "The agent recommended DECLINE. You rejected the memo."
11. The palette has "Go to decision" and no "Countersign" command.

### 9.5 Composer

| Input | State | Expected |
|---|---|---|
| "draft the memo", "can you draft the memo", "draft memo" | Atlas not started, nothing live | Plan review opens; the thread shows the echo, then the plan card. ⌘↵ / Start drafting work. |
| "draft the memo without peer benchmarks" | Atlas not started | Plan review opens with peers unchecked, the Step 3 card "Off in the plan under review…", the countdown held; reply "Peer benchmarks is off in the plan. The countdown is held: choose Start drafting when ready." |
| "skip peer benchmarks" | plan review | The checkbox unchecks; the Step 3 card reads "Off in the plan under review. Drafting skips it."; the countdown holds; reply "Peer benchmarks is off. … The auto-start countdown is held." |
| typing anything | plan review, countdown running | The countdown holds on the first non-blank keystroke ("Held · start when ready"). |
| "skip covenants" | plan review | refusal "Covenant compliance is required and cannot be skipped. Only peer benchmarks is optional." |
| "no, keep peers" | plan review | refusal "Say “skip peer benchmarks” or “include peer benchmarks”." |
| "skip peers" | Atlas not started | refusal "No plan is open yet. Type “draft the memo” to open one; optional steps are chosen there." |
| "start drafting" | plan review | Plan approved; plan-record "Plan approved by you · 4 of 5 steps" when peers were off. |
| "countersign", "approve", "reject it", "send it back", "can you countersign it?" | gate | refusal + "Go to decision". Nothing is signed, returned or rejected (Ledger unchanged). |
| "reject it" | **Meridian, policy on, countdown running** | The countdown holds before the reply ("Held · you started reviewing"); no `/auto/` signature appears. |
| "why is this approved?" | Meridian countdown running | Held, then answered; no `/auto/` signature. |
| "set leverage to 4.3" | Atlas gate rev 1 | refusal + "Show covenant rows" (cues the Covenants card); no amendment. |
| "note: tighten it" | gate | refusal + "Go to decision"; the note field is unchanged. |
| "what if leverage was lower?" | gate | local answer pointing to the stress test + "Open stress test" (opens and cues it). |
| "stop" | running | The stop strip opens in the doc bar (the drawer closes in drawer mode); nothing stops until "Stop run". |
| "draft the memo" | Meridian while Atlas is at the gate | The start strip opens; reply "Project Atlas is live. Confirm in the bar above the memo to start Project Meridian, or keep Project Atlas." |
| "hello" | running | refusal "Try “draft the memo”, “skip peer benchmarks”, “hold” or “stop”. Questions open once the memo is assembled." |
| Enter on a blank draft, Enter during IME, ⌘↵ with a draft | any | nothing is sent (⌘↵ does only its global action) |
| Shift+Enter | any | a newline is inserted |

### 9.6 Memo

1. Every section is its own card with 16px of canvas between cards; the header sits on the canvas; no "Notes" text, margin cell, stub or Contents row anywhere in the memo pane.
2. Each set card shows the eyebrow "Step n of 5 · <tool>", the title at 18/24/500, the takeaway (glyph + 13/500 ink, or tokens for card 5) and labelled blocks 24px apart, label to content 8px. No figure inside a card renders at 18px.
3. The takeaway strings equal §5.5 exactly for Atlas (rev 1; amended ≤ 4.30x, ≤ 4.10x and liquidity ≥ $15.0M; rev 2), Meridian and Cobalt.
4. Atlas Financials: the total leverage row has the breach glyph and a bad-ink value; no other row is toned; the Source column is ink-3 with accent cites.
5. Covenants: Threshold, Actual and Cushion are right-aligned. At memo pane 676 the covenant table stacks and Financials does not; at 326 every table stacks.
6. Not started / plan review: five skeleton cards with phase lines and no controls. Running: exactly one drafting card with the caret; "Go to drafting" scrolls to it.
7. At the gate the signature card shows the open reviewer line (not a control: clicking it does nothing), "Awaiting your countersignature · decide in the agent panel" and "Go to decision".
8. The doc bar never clips or overlaps at the §5.10 widths in the gate, sealed-with-panel-hidden and running states, and never holds a primary.
9. A sealed memo's header seal reads only the who-clause and the receipt.

### 9.7 Build hygiene

1. Each owner, before integration: `node_modules/.bin/tsc --noEmit 2>&1 | grep -E '^src/v2/(<owned paths>)'` prints nothing (errors only in other owners' files are expected until integration).
2. The golden takeaway check (§10) prints every §5.5 string and exits 0.

### 9.8 Walkthroughs (SPEC §13, adapted)

- **Atlas:** SPEC §13 with these substitutions: Contents → the plan card in the thread; margin notes → thread flags; "Go to signature" → "Go to decision"; step 9 "A (line off-screen) scrolls only" → "A (focus not on the primary) focuses only"; the sealed sentence "The agent recommended APPROVE on the revised structure. You countersigned." appears in the signature record and the decided item, and the header seal reads "You countersigned."
- **Meridian auto-countersign:** §9.4 item 9; SPEC step 3 ("type in the note → Held · you started reviewing") also holds for typing in the composer.
- **Cobalt:** §9.4 item 10.
- **Upload `q3_cim.pdf`:** leverage is Quoted; low-confidence messages appear under "Scored risk" (70%), the peers step (68%, if included) and "Wrote the recommendation" (73%); the Risk card aside reads "70% · …" in bad-ink; the doc bar shows "Extraction 76%"; policy is not eligible.
- **Browsing never aborts:** while Atlas is at the gate, open Meridian and the Book: Atlas is still awaiting; Meridian's composer "draft the memo" opens the start strip and "Keep Project Atlas" leaves it untouched; "stop" on Atlas opens the stop strip.

---

## 10. Build order and verification

1. **T · contracts first.** One owner lands `state/contracts.ts` (every store type, moved and changed per §6.1), `model/types.ts` (§7.1) and `state/screens.ts` (§7.4), types only. After T lands, contract files change only through the integrator: a builder who needs a change asks rather than edits.
2. **Then in parallel** against the contracts: F (kit), B (model), A (shell and state), C (chat), D (decision), E (memo). Each codes to the interfaces in §7, not to another owner's unfinished file.
3. **Integrate in order** F → B → A → C → D → E → G, then run `npm run build`, `npm run v2-check`, the golden check and the walkthroughs. "tsc green" is an acceptance of the integrated branch; per owner the gate is §9.7 item 1.
4. **Golden takeaway check** (no `tsx` in the repo; use the installed esbuild): write a script in your scratchpad that imports `src/agent/mockData` and `src/v2/model/takeaways.ts` (plus `covenantRow` / `amendedChanged` from `select-file.ts` and `amendmentsFor` from `flags.ts` for the amended cases), then `node_modules/.bin/esbuild <scratch>/golden.ts --bundle --platform=node --format=esm --outfile=<scratch>/golden.mjs && node <scratch>/golden.mjs`. The model's runtime imports are engine modules and the model itself; store imports are type-only and erased.

---

## 11. Research references

**Agent chat beside a document artifact, pane headers on one line** (Dash, Le Chat and Langdock re-checked on Mobbin for this addendum):
- Dropbox Dash: nav · chat · document, chat head and document toolbar on one line. https://mobbin.com/screens/f7b146fb-ea9a-4596-a37a-3f72b340ea1e
- Mistral Le Chat: folded "Thought for 1s" rows in the thread; the artifact pane has its own head. https://mobbin.com/screens/76e16697-0e20-4bfc-8162-e93d6f1fc8ff
- Langdock: the tool record ("Read …") as a compact expandable line beside a document canvas. https://mobbin.com/screens/579fb137-50fa-42d0-9222-4970f35648d5
- Mintlify: expandable tool rows. https://mobbin.com/screens/c2d85dca-8840-4bfb-8e24-61e52325ab44

**A decision or question card docked above the composer, actions in one row:**
- Higgsfield: "Waiting for your approval" with Approve / Stop docked above the input. https://mobbin.com/screens/b6741ae3-c1f1-4335-bb72-530bea496619
- Gumloop: "Asking for your input" with Reject / Submit in one row. https://mobbin.com/screens/a0c0e7b0-88bb-4a89-904a-d88ee892a8dd
- Unify: a question card docked over the composer. https://mobbin.com/screens/ca1f0060-e1ab-4ba2-98f9-6a9789f2afc4

**Separate titled 1px white cards on a grey canvas:**
- LangChain usage: https://mobbin.com/screens/86925057-b5b9-4c85-9787-9dcbee1d7b76
- Exa usage: https://mobbin.com/screens/279d5948-258a-4519-b3e3-c15a746d8b9c

**Earlier research reused:** `scratchpad/research/mobbin-agent-run-canvas-*.json` (one working indicator per region, hence no spinners in the thread); `mobbin-app-shell-*.json` (pane heads of one height on one line); `concept-agent-workspace.json` (narrative beside an evidence canvas, claims tethered to evidence; its leader lines are not reused).

---

## Appendix R · Critique resolution log

| Critique item | Resolution |
|---|---|
| **Blocker:** composer did not hold a running countdown | §4.3 step 3: every submit on the live file engages first (`holdAuto('engaged')` at the gate, a manual plan hold in plan review), questions and refusals included, and `setComposerDraft` engages on non-blank typing like `setNote`. Acceptance rows in §9.5. |
| Verbs cannot share one row at panel width | Card = dock (no nested frame), fixed wrap point (primary line 1, Return + Reject line 2), chips drop under 320px; width table proves two lines everywhere (§3.1, §9.4 item 3). Logged in P-23. |
| Pinned head + foot squeeze the note | Only the live policy line and the verbs are pinned; call, Signed over, note, amendment, idle policy and attestation scroll; the dock may take everything but a 96px thread floor; returned history leaves the card (§3.1, §9.4 item 2). |
| Plan review unseen with the panel hidden | Transient auto-reveal at plan review and at the gate (both modes); the plan countdown arms only while the plan card is shown and holds when hidden; plan-row links hold the countdown; the doc bar no longer shows a frozen countdown (§1.5, §5.10). |
| Circular types and per-builder tsc | Contracts step T owns all store and view types (`state/contracts.ts`, `model/types.ts`, `state/screens.ts`); merge order; per-owner tsc filter; esbuild golden check (§10). |
| No CSS hook for the forced rail; nav transition | `data-nav` from `navRail`, `data-nav-forced` hides the toggle and shows the mark, `useViewportAtMost`; the grid transition is deleted (§1.4). |
| Drawer: showChat and cueMemo cancel | `cueMemo(..., { keepDrawer })` for J/K and Signed over links; flag links close the drawer and count via `markOpened`; drawer-mode focus after signing goes to `[data-record-focus]` (§2.6, §3.5). |
| Duplicate echo | One echo, written by `submitComposer`; the engine path is the pure responder via `answerFor`; no message mirror (§2.3, §4.3). |
| `sourceIsOverlay()` unguarded | Null-safe, never throws; no `[data-viz]` → overlay (§1.7). |
| Honesty: "Nothing is signed without you" | Policy-aware intro (§2.2). |
| Title collides with figures; takeaway and labels blur | Existing roles kept (SPEC §4 closed set): no in-card figure uses 18px (Risk score → t-figure, KeyFigure value → t-heading); takeaway t-strong ink; blocks 24px apart, label 8px to content; ladder table (§5.3). |
| Header seal states the call at the top | Header seal is the who-clause only; the full sentence moves to the foot record and the decided item (§5.11). |
| "Deciding figure" pre-empts the conclusion | Factual wording, amendment basis line (§5.5). |
| Composer parsing gaps | Compound start rule with pending toggle, polite instructions, wider START objects, `ambiguous` and `no-plan` refusals (§4.2, §6.3). |
| ⌘↵ double-fires | TextArea submit ignores meta/ctrl/alt and prevented events (§7.3). |
| Esc from a field in the drawer | ChatPane-owned Escape handler; global handler prevents default when it acts (§6.4). |
| Focus return has no owner | The shell owns it (§1.5). |
| Cue timing on mount; pending focus writers | Cues carry `at`; mount honours cues under 1000 ms; `pendingNoteFocus` written by S/R when the field is unmounted; `pendingSignFocus` only when the card is unmounted (§2.6, §3.4). |
| Opened tally and Signed over labels | Any explicit note action counts; per-row `linkLabel` (§2.6, §3.1). |
| Step copy did not match the engine | Done line keyed on the Structuring Engine result (§2.4). |
| Layout number inconsistencies | Doc bar re-measured in the widest state; folds 999 / 939 / 759 / 659; 752 and 864 added; the 1440 row fixed (§1.3, §5.10). |
| Step line link a11y and teal column | Ink step text, toned meta, one trailing "Show in memo" link whose name leads with its visible label (§2.2). |
| C02 / C20 traps | `heading` naming rule; F reports any new kit export to G (§2.2, §7.3). |
| Drawer CSS ownership; orphan Q&A | Drawer geometry in `chat.css` (C), shell grid in `app.css` (A); `doStart` also resets the replaced live file's epoch (§1.8, §4.4). |
| Persisted state overwritten by incidental reveals | Explicit vs transient callers; `revealed` never touches storage (§1.5). |
