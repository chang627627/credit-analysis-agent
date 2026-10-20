# Countersign V2 · Case File: final build spec

Builders implement from this document alone. Everything here was checked read-only against the working tree on 2026-10-17:

- `src/agent/types.ts`, `runAgent.ts`, `tools.ts`, `whatif.ts`, `mockData.ts`, `synthesize.ts`, `draftNote.ts`, `format.ts`, `rating.ts`, `monitor.ts`, `util.ts`, `responder.ts`
- `src/hooks/useCreditAgent.ts`, `useMonitor.ts`
- `src/App.tsx`, `src/main.tsx`, `src/components/PlanReview.tsx`, `src/components/AuditView.tsx`
- `package.json`, `tsconfig.json`, `index.html`

Golden values (Appendix A) came from running the engine read-only in a scratch bundle. The guard script (§11) was run on macOS bash 3.2 against a clean fixture (28 ok) and a dirty fixture (28 FAIL). The type fixes in "Stack facts" were compiled with the repo's own tsc 5.9.3.

## Stack facts (verified)

- **Installed versions:** react 19.2.7, react-dom 19.x, @types/react 19.2.17, typescript 5.9.3, vite 6, lucide-react 1.21.0. The runtime dependencies are only react, react-dom and lucide-react. There is no Tailwind and no framer-motion. Do not add dependencies; `package-lock.json` must not change.
- **`index.html`** loads Inter 400–700. V2 uses only 400, 500 and 600. `index.html` is not edited.
- **`tsconfig.json`** has no `vite/client` types and must not be edited. The shell therefore owns `src/v2/env.d.ts`, which contains exactly one line: `/// <reference types="vite/client" />`. That line declares the `*.css` modules for the dynamic imports and also declares `import.meta.env`. Do not create a `css.d.ts`.
- **React 19 typing rules** (each one was a verified compile failure):
  1. Never reference the global `JSX` or `React` namespaces. Import types from `'react'` (`import type { ReactNode, ReactElement, Ref, HTMLAttributes, CSSProperties } from 'react'`).
  2. Do not write explicit component return types. Let them infer.
  3. Write `useRef<T>(null)`. React 19 requires an argument.
  4. Type a child that is cloned or read as `ReactElement<HTMLAttributes<HTMLElement>>`, never as a bare `ReactElement`, whose props are `unknown` in React 19.
  5. Never read `element.ref`.

## Thesis in one line

A credit officer signs a document, not a transcript. In V2 the credit memo is the product, and the decision is the countersignature at its foot.

## Critique resolution log

| Critique item | Resolution | Where |
|---|---|---|
| `import.meta.env` untyped | `src/v2/env.d.ts` with the vite/client reference (verified) | Stack facts, §2 |
| React 19 JSX namespace and Tip child typing | Rules above; Tip wraps its child in a span and never reads the ref | Stack facts, §6 #8 |
| Guard vs spec contradictions | C08 split CSS/TSX; `LedgerView.fileFilter`; no hex in pending text; caret margin 4px; Book indent 24 via the kit; tab underline via `::after`; grep never reads stdin | §6, §7, §11 |
| Upload race with startFile | No start of any kind while `agent.parsing`. The live file is resolved from the current RunRecord, never from `selectedDealId` alone | §9.2 #9, §9.4 |
| Button nested in a button | KeyFigure evidence is plain text. The SignatureLine button is only the pad and rule; the caption is a sibling | §6 #25, #27 |
| `display: contents` rows cannot scroll | `data-section` and scroll-margin live on `.file-pagecell` | §7 DOM contract |
| Kit page cannot show overlays open | Kit-only `specimen` prop on Tip, Menu and Palette | §6 |
| Auto-countersign fires off screen | Both countdowns arm only while the live file is on screen with the tab visible. Leaving holds them. The countdown is printed in the sticky doc bar | §8, §9.2 #3 |
| Ask answers the wrong deal | Ask works only on the live file once its memo exists. One merged thread. Local intercepts | §7.2, §9.4 `askRoute` |
| WCAG 1.4.11 control edges | Control edges use `--ink-3` (5.44:1). The palette and menu active row gets a 2px accent inset outline plus an accent-ink label | §4, §6 |
| `model.ts` on the critical path | `src/v2/model/` module, staged. Stage 1 publishes types, fixtures and stub selectors | §9.4, file plan |
| Keyboard map contradictions | One table of keys × routes × status | §7.6 |
| Cite stepper semantics | `cite(dealId, markIds, startIndex)` | §9.1 |
| Exhibits and export staleness | Derived from `auditHistory` by runId; `ui.attached` per run | §7.3, §9.4 |
| Monitor rows mutate | Append-only `monitorLog` diffed from escalations | §9.2 #12 |
| Table cannot express screen needs | `stackBelow`, rich `group`, `indent`, `span` | §6 #19 |
| Stop and cancelled runs over a seal | Cancelled-after-seal shows not-started plus a prior-record line. Stop needs an inline confirm | §7.2, §9.4 |
| Reader lost while drafting | "Go to drafting" in the doc bar. Auto-follow cut, with the reason | §7.2, Appendix B |
| Notes vs flags wording | Two named facts, `flagsOnRecord` and `countedNotes`; policy check says "flags" | §5, §10 |
| Ledger filter chips cut silently | Kept as `FilterChips` (by actor and kind) | §6 #33, §7.5 |
| Minors | Overrides read from the recorded amendments; explicit auto provenance; confirm for any live run; palette navigates first; unattended plan start attributed to Credit Analyst; tab underline and active outlines in ink; reduced-motion caret, fill and cue; fixed-size ink SVG; DocBar extraction; tightest = minimum cushion; tests count watch as passing; "Mark handed off"; parsing reason; `modKey` in state; driver tone table; `?kit` logged; durations single-sourced | throughout |

---

## 1. Thesis and the four pillars

**Thesis.** V1 shows the run and the decision as separate widgets: a stream of step cards, then a gate card, a what-if card and an outcome banner. The Credit Approval Memorandum the human actually countersigns is never on screen. V2 turns this around: **the memo is the product.**
- The agent drafts the memo section by section beside the CIM it quotes.
- Every figure carries one evidence class.
- Every flag is a margin note beside the section it concerns.
- The decision is a **countersignature line at the foot of the page**, and the agent loop is literally suspended on that line's Promise.

Three lenses look at the same files: **Desk** (index and pipeline), **Book** (monitoring) and **Ledger** (audit). The engine is untouched. V2 is a second pure reduction of the same `useCreditAgent` and `useMonitor` state, which demonstrates the project's architecture claim a second time.

**Pillar 1 · Expose the evidence.**
- One classifier (`evidenceFor` in the model) gives every memo figure exactly one class:
  - **Quoted ¶NN.** The formatted string occurs in that CIM paragraph. Clicking the ¶ cite opens the source and outlines the exact span, with a "1 of 4" stepper over every quoted span in the file.
  - **Derived.** The formula prints inline ("96.3 ÷ 22.6"), and each operand is itself a cite.
  - **Unquoted · extracted.** The extraction produced it, but no CIM sentence states it. Atlas interest coverage, fixed-charge coverage and liquidity are in this class.
  - **Model output.** Produced by the Risk Engine or the Structuring Engine.
- Each section's margin stub opens the raw tool record: args in, data out, measured duration, confidence, and a persistent Copy JSON.
- Each key figure at the top traces to its row and to the tool call behind it.
- Revised figures trace to the Structuring Engine, never to the CIM.
- One formatter set renders both the CIM match and the memo. An uploaded CIM that states its leverage ("or 4.99x leverage") therefore reclassifies that figure as Quoted automatically.

**Pillar 2 · Route uncertainty.**
- Each engine flag becomes a margin note in the grid row of the section it concerns (`anchorFor`):
  - a breach goes to its covenant row;
  - thin headroom goes to its row;
  - low confidence goes to the section that tool wrote;
  - send-back, restructure and no-cure go to the Revision section;
  - anything else goes to the emitting step's section.
- **Counted notes** (breach, watch, low-confidence, no-cure) are washed in their meaning colour. The sticky doc bar counts them ("2 notes to review"), and the reader can step through them with J/K.
- A deterministic **Evidence check** note states how many figures are unquoted. It is info and is not counted.
- Confidence is neutral at 90% and above, warn-ink from 75% to 89%, and bad-ink below the 0.75 floor (where a note always exists). It is never green.
- Covenant distance is a **signed cushion** (+5.0% / −6.5%) on a centred-tick meter with one shared ±50% scale.
- Risk sits on the single band table from `rating.ts`, with the 75 decline line marked.
- "Nearest flip" says how close the call is to changing. It is labelled "Analysis aid · not part of the memo".
- Nothing pulses, glows or rotates.

**Pillar 3 · Pause for accountable human judgment.** The decision happens at the foot of the memo it governs. The agent's pre-signed line sits beside an empty 2px teal reviewer line.
- The primary names what you concur with: "Countersign escalation", "Countersign approval", "Countersign decline", "Countersign as amended" or "Countersign revised structure".
- A **Signed over** list names every counted note you accept, with "you opened n of N".
- An attestation states the consequence before you commit.
- **Return for revision** and **Reject memo** require a reason, and that reason goes on the record.
- **Draft from notes** inserts an evidence draft only on click. Its provenance (authored / agent-drafted, edited / agent-drafted, verbatim) rides into the record.
- Terms are amended **in place on the covenant row** as a redline and re-tested by the same `decide` rule.
- The first press of A only brings the line into view, so nobody signs a line they cannot see.
- **No countdown runs where you cannot see it.** The clean-approval policy's 5s countdown and the plan auto-start countdown arm only while the live file is on screen and the tab is visible. Leaving, hiding the tab or engaging holds them. A policy signature writes `/auto/`, never ink.
- Human verbs (Countersigned / Returned for revision / Rejected) never collide with agent tokens (APPROVE / ESCALATE / DECLINE).
- After signing, the app never navigates by itself.

**Pillar 4 · Preserve the decision trail.**
- Each decided file is **sealed** for the session as a `CaseFileSnapshot`: plan, steps, package, decision, note and provenance, amendments, the engine's `decidedAt`, wait time, notes opened, and the as-presented attestation.
- The memo's events, exhibits and the file export always read `auditHistory` filtered by runId, so the memo and the Ledger cannot disagree.
- Revisions stay inside the document: rev 1 → rev 2 as a redline, with the returned note quoted and attributed.
- Attached stress tests become numbered **Exhibits**.
- A countersigned ESCALATE is raised into the monitor queue (deduped per run) and appears in the Book with "Mark handed off".
- Monitor activity is written to an **append-only log**, so no Ledger row ever changes after the fact.
- The **Ledger** groups everything by file and then run:
  - a closed actor set;
  - the decision pinned first, with suspended wait and notes opened;
  - amendments as redlines;
  - the raw engine label kept in the expansion and the export.
- **Export file** (snapshot + as-presented) and **Export session** (everything, with an actor per event).

---

## 2. Information architecture and routing

### Entry points (query flag; no server rewrites)

| URL | Loads | Stylesheets |
|---|---|---|
| `/` (no query) | **V2 app** (default) | `src/v2/v2.css`, `kit/kit.css`, `app.css`, screen CSS |
| `/?v=1` | **V1 app, unchanged** (`src/App.tsx`) | `src/index.css` only |
| `/?kit` | **V2 kit page** (`src/v2/KitPage.tsx`) | `v2.css`, `kit/kit.css`, `kitpage.css` |

Changing the query string is a full page load, so V1 and V2 stylesheets never coexist in one document. "Compare V1 ↗" opens `/?v=1` in a new tab. The owner method asked for a live `/kit`. `/?kit` serves it without rewrites; this is logged as P-18.

### `src/main.tsx` (exact replacement; the only V1-side source file edited)

```tsx
import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

const params = new URLSearchParams(window.location.search);
const root = createRoot(document.getElementById('root')!);
const mount = (C: ComponentType) =>
  root.render(
    <StrictMode>
      <C />
    </StrictMode>,
  );

if (params.get('v') === '1') {
  // V1, byte-for-byte: its own global stylesheet and nothing from V2
  void Promise.all([import('./App'), import('./index.css')]).then(([m]) => mount(m.default));
} else {
  // V2: tokens live on the .v2 root, which is <html> itself
  document.documentElement.classList.add('v2');
  const page = params.has('kit') ? import('./v2/KitPage') : import('./v2/App');
  void Promise.all([page, import('./v2/v2.css')]).then(([m]) => mount(m.default));
}
```

**Module rules:**
- `src/App.tsx` already `export default`s V1.
- `src/v2/App.tsx` and `src/v2/KitPage.tsx` must each `export default` a component.
- `src/v2/App.tsx` imports `./app.css`. `KitPage.tsx` imports `./kitpage.css`.
- The kit barrel `src/v2/kit/index.ts` imports `./kit.css`.
- Each screen's `index.tsx` imports its own `<name>.css`.

### V2 routes (hash; parsed by `state/route.ts`)

| Hash | Route object | Screen |
|---|---|---|
| `#/`, empty or unknown | `{ name: 'desk' }` | Desk |
| `#/file/<dealId>` | `{ name: 'file', dealId, at: null }` | Case file |
| `#/file/<dealId>?at=<FileAt>` | `{ name: 'file', dealId, at }` | Case file, scrolled to a row |
| `#/book` | `{ name: 'book' }` | Book |
| `#/ledger` | `{ name: 'ledger', file: null }` | Ledger |
| `#/ledger?file=<dealId>` | `{ name: 'ledger', file: dealId }` | Ledger filtered to one file |

```ts
// state/route.ts
export type FileAt =
  | 'recommendation' | 'financials' | 'risk' | 'peers' | 'covenants'
  | `revision-${number}` | 'exhibits' | 'stress' | 'signature' | 'monitoring';
export type Route =
  | { name: 'desk' }
  | { name: 'file'; dealId: string; at: FileAt | null }
  | { name: 'book' }
  | { name: 'ledger'; file: string | null };
export function parseHash(hash: string): Route;
export function toHash(route: Route): string;
export function useHashRoute(): { route: Route; navSeq: number; navigate: (to: Route) => void };
```

- Every `navigate()` increments `navSeq`, so navigating to the same URL re-scrolls.
- Deal ids are `atlas`, `meridian`, `cobalt`, or `deal_N` for uploads (from `uid('deal')`). Uploads do not survive a reload; an unknown dealId renders the not-found state.

### Movement

- **Top-bar tabs:** Desk · Book · Ledger. On a file route the Desk tab is active, because files belong to the Desk.
- **Any file name or row, anywhere,** opens `#/file/<id>`.
- **Doc-bar breadcrumb** "Desk / Project Atlas ▾":
  - "Desk" returns to the Desk.
  - The ▾ menu switches file. Switching only routes; V2 never calls `selectDeal` (C18), so browsing never aborts a run.
- **Desk "Review and countersign"** → `#/file/<id>?at=recommendation`. The reader reads top-down, and the signature is at the foot.
- **Book:** a row opens `?at=monitoring`. A countersign-routed item's "Open record" opens `?at=signature`.
- **Ledger:** "Open file" → `#/file/<id>`. The sealed doc bar's "Open in Ledger" → `#/ledger?file=<id>`.
- **⌘K palette** reaches every route, file and live action. A palette start or countersign on a file first navigates to that file, so any confirm or line appears where the user is looking.
- **Starting a run** (`agent.start`) happens only through "Draft memo", "Re-run" or ⌘↵ on a not-started or sealed file.
  - While `agent.parsing` is set, every start is **disabled**, with the reason "Extraction in progress · q3_cim.pdf". There is no confirm.
  - If any run is live (`plan_review` | `running` | `awaiting_approval`), including on the same file, an inline confirm appears first. Nothing is ever aborted silently.
- **Upload:** the Desk drop zone calls `agent.uploadDeal`. A parsing row shows on the Desk. When parsing ends, the app navigates to the new file, but only if the user is still on the Desk.

---

## 3. Shell

### Regions at 1440×900 and 1280×800

```
y=0   ┌──────────────────────────────────────────────────────────────────────────────┐
      │ TOP BAR 48px · paper · 1px bottom line · padding 0 16                          │
y=48  ├───────┬──────────────────────────────────────────────────────────────────────┤
      │SOURCE │ CANVAS (scroll container)                                              │
      │spine  │ ┌ DOC BAR 44px sticky top:0 · canvas bg · 1px bottom line · pad 0 24 ┐ │
      │40px   │ │ (+ ConfirmStrip 44px when a confirm is open, inside the sticky wrap) │ │
      │(open: │ └──────────────────────────────────────────────────────────────────────┘ │
      │360)   │   content wrapper max-width 1072, margin 0 auto, padding 24 24 48         │
      │       │   ┌ PAGE minmax(600px,720px) ┐ gap 24 ┌ MARGIN 280 ┐                     │
y=900 └───────┴──────────────────────────────────────────────────────────────────────┘
```

**Frame.**
- `.app-shell` is `height: 100vh` with `display: grid; grid-template-rows: 48px 1fr`, and `overflow: hidden` on body.
- Every screen body is its own scroll container (`overflow-y: auto; height: calc(100vh - 48px)`).

**Desk, Book and Ledger.**
- One scroll container on canvas, holding a centred column (max-width 1040, padding 32 40).
- 1120 ≤ 1280, so it fits at 1280. Below 1120 the Desk's Facility column is hidden (`hideBelow: 1120`) and the facility shows under the borrower.

**Case file.**
- Grid `[source 40px | canvas 1fr]`, or `[360px | 1fr]` with the source pushed open. Both columns are `calc(100vh - 48px)` tall and scroll independently.
- The source head (44px) and the doc bar (44px) share one header line at y=48–92.
- The content wrapper is 1072 wide (24 + 720 + 24 + 280 + 24). At 1440 the canvas is 1400 and the wrapper is centred. At 1280 the canvas is 1240 and it fits.

**Source pane.**
- Closed by default: a 40px spine with a vertical label "Source ¶" (`writing-mode: vertical-rl`, t-label, ink-2) and the quoted-mark count (t-figure) beneath. The whole spine is one kit `LinkButton` (`ariaLabel` "Open source").
- At viewport ≥ 1432px it opens as a **push** column (360).
- Below 1432px it opens as a 360px **overlay** over the canvas's left edge. The overlay uses `--shadow-pop` with no scrim. Esc or its × closes it.
- It opens automatically on any ¶ cite.

### Top bar (48px, paper, 1px bottom line, padding 0 16, nowrap)

**Left:**
- Brand: the kit `BrandMark` (a signature on a line on the teal tile, 20px; it replaced the "◧" glyph) + "Countersign" (t-heading).
- 24px gap, then kit `Tabs`: "Desk", "Book", "Ledger" (t-control, ink-2). The active tab is ink with a **2px ink** underline drawn by `::after` at `bottom: -1px`. Tabs are 48 tall with padding 0 12.
- Counts appear only when > 0 (t-label, tabular):
  - Desk = 1 when the live file is in `plan_review` or `awaiting_approval` (tone accent).
  - Book = the count of escalations with `status === 'open'` (tone warn).

**Right** (gap 8, controls 28 tall):
1. "Auto-countersign clean approvals" (t-label, ink-2) + kit `Switch`. The track is **ink** when on, never teal.
2. A 1×20 divider in `--line`.
3. Speed: kit `Menu` with trigger ghost sm "1×", menu label "Demo pace", items 0.5× / 1× / 2× / 4×, and a check on the current item.
4. Search: `Button` ghost sm with icon `Search`, label "Search" and `Kbd` `${modKey}K`.
5. "Compare V1 ↗": `LinkButton` (role label, href `/?v=1`, newTab).

There is no theme toggle and no primary in the top bar.
- Below 1024px the switch label shortens to "Auto-countersign".
- Below 760px the right cluster collapses into a ghost "More" `Menu` holding the policy item, the pace items and Compare V1.

### Overlays (the only elevated surfaces; `--shadow-pop`)

- Command palette: 560 wide, top 15vh, radius md, flat `--scrim` behind it.
- Menus.
- Tooltips.
- The source overlay below 1432px.

**There are no toasts.** Every side effect appears in place:
- an attached exhibit appears as a new Exhibit row;
- a routed escalation appears as a routed line under the signature and as a Book item;
- a sealed file shows its seal row;
- an export appears as the browser download.

### Ambient tab title (`selectTabTitle`)

| State | Title |
|---|---|
| Running | "▍ Drafting 4 of 5 · Countersign" |
| Gate | "● Awaiting your countersignature · Countersign" |
| Plan review | "☑ Plan review · Countersign" |
| Otherwise | "Countersign" |

### Responsive floor

| Width | Behaviour |
|---|---|
| ≥ 1432 | Full layout; source push. |
| 1000–1431 | Same layout; source overlay. |
| 760–999 | The page becomes one column (max-width 720, centred). Each margin cell renders inside the paper, directly under its section, as a "Notes" block (paper bg, side borders, padding 0 48 24, t-label "Notes", 1px top line). |
| < 760 | 16px side gutter, page padding 20. Doc-bar actions collapse into a "More" `Menu`. Tables use `stackBelow: 760`. Book hides Tests, Risk and Checked. |

There is no horizontal page scroll at any width ≥ 360.

---

## 4. Tokens (light only; `src/v2/v2.css`)

`v2.css` has two parts, in this order:
1. The **token block**, between the exact comment lines `/* @tokens:start */` and `/* @tokens:end */`. The block holds:
   - the `.v2` custom properties;
   - the control font rule;
   - the 12 role classes, **one line each**;
   - the reduced-motion overrides.
2. The base reset.

The token block is the only place in `src/v2` where colour literals, raw type values, the word `dashed`, `font-family` and duration literals may appear (guarded, §11). Tokens are declared on `.v2`, which is the `<html>` element.

```css
/* @tokens:start */
.v2 {
  color-scheme: light;
  --font: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;

  /* surfaces */
  --canvas: #f3f5f8;   /* app background, canvas behind the paper */
  --paper: #ffffff;    /* memo sheet, top bar, lists, tables, notes, menus */
  --sunken: #eef1f5;   /* table header, hover row, kbd, neutral chips, disabled fill */
  --scrim: rgba(15, 36, 54, 0.24);

  /* ink (AA on paper, canvas AND sunken) */
  --ink: #0f2436;      /* 15.84 paper · 14.50 canvas · 13.98 sunken */
  --ink-2: #4a5a6e;    /*  7.05 · 6.45 · 6.22 */
  --ink-3: #5f6b78;    /*  5.44 · 4.98 · 4.80; also the control-edge colour (3:1 non-text) */

  /* ONE line colour (structure) + provisional variants */
  --line: #d0d6df;                                /* 1.46:1 on paper: structure only, never a control edge */
  --line-provisional: 1px dashed #d0d6df;         /* not the record: stress frame, drop zone, amend trigger */
  --line-provisional-edge: 1px dashed #5f6b78;    /* not the record, on a control: the amend input */
  --line-provisional-active: 1px dashed #1f4fbf;  /* drag-over, focused amend input */

  /* ONE accent: signature-ink blue (owner, 2026-10-20: the teal sat too close to the approve green) */
  --accent: #1f4fbf;       /* fills + 2px state strokes; white on it 7.17:1; dE 27.8 from --good-mark */
  --accent-hover: #1a43a3; /* primary hover/pressed; white on it 8.84:1 */
  --accent-ink: #1a46ad;   /* accent TEXT: links, cites (8.32 paper · 7.62 canvas · 7.15 accent-wash) */
  --accent-wash: #e8eefb;  /* cited span, active menu/palette row, focus halo, flash */
  --on-accent: #ffffff;

  /* meaning: ink (text/glyph) · wash (tokens, open notes) · mark (data marks only) */
  --good-ink: #10733a; --good-wash: #e7f4ec; --good-mark: #1f8a4c; /* ink-on-wash 5.25 · mark 4.38 */
  --warn-ink: #8a5d08; --warn-wash: #fbf0da; --warn-mark: #b97f0a; /* ink-on-wash 5.09 · mark 3.44 */
  --bad-ink:  #b42335; --bad-wash:  #fbe9eb; --bad-mark:  #c8323f; /* ink-on-wash 5.56 · mark 5.27 */

  /* radii */
  --r-xs: 4px; --r-sm: 6px; --r-md: 8px; --r-pill: 999px;

  /* spacing (4px grid) */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 20px; --s-6: 24px; --s-8: 32px; --s-10: 40px; --s-12: 48px;

  /* elevation: exactly one float shadow, plus two field halos */
  --shadow-pop: 0 8px 24px rgba(15, 36, 54, 0.12), 0 0 0 1px #d0d6df;
  --halo-focus: 0 0 0 3px #e8eefb;
  --halo-error: 0 0 0 3px #fbe9eb;

  /* motion: the ONLY source of visual durations (JS reads them, see cssMs) */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-press: 60ms;    /* pressed background */
  --dur-1: 160ms;       /* hover, colour, caption swap, rule recolour, chevron */
  --dur-2: 320ms;       /* section set, note enter, signature recede, disclosure unfold */
  --dur-3: 600ms;       /* ink stroke only */
  --dur-flash: 1200ms;  /* one-shot anchor/cite flash */
  --dur-caret: 1060ms;  /* THE one loop: the drafting caret */

  /* type roles (Inter only; weights 400/500/600) */
  --t-display-size: 22px; --t-display-lh: 28px; --t-display-weight: 600; --t-display-track: -0.024em;
  --t-heading-size: 15px; --t-heading-lh: 20px; --t-heading-weight: 600; --t-heading-track: -0.008em;
  --t-body-size: 13px;    --t-body-lh: 20px;    --t-body-weight: 400;    --t-body-track: 0em;
  --t-strong-size: 13px;  --t-strong-lh: 20px;  --t-strong-weight: 500;  --t-strong-track: 0em;
  --t-control-size: 13px; --t-control-lh: 16px; --t-control-weight: 500; --t-control-track: 0em;
  --t-small-size: 12px;   --t-small-lh: 18px;   --t-small-weight: 400;   --t-small-track: 0em;
  --t-label-size: 12px;   --t-label-lh: 16px;   --t-label-weight: 500;   --t-label-track: 0em;
  --t-meta-size: 11px;    --t-meta-lh: 16px;    --t-meta-weight: 400;    --t-meta-track: 0em;
  --t-eyebrow-size: 11px; --t-eyebrow-lh: 16px; --t-eyebrow-weight: 500; --t-eyebrow-track: 0.06em;
  --t-figure-size: 13px;  --t-figure-lh: 20px;  --t-figure-weight: 500;  --t-figure-track: 0em;
  --t-figure-lg-size: 18px; --t-figure-lg-lh: 24px; --t-figure-lg-weight: 500; --t-figure-lg-track: -0.014em;
  --t-token-size: 11px;   --t-token-lh: 16px;   --t-token-weight: 600;   --t-token-track: 0.04em;

  background: var(--canvas);
  color: var(--ink);
  font-family: var(--font);
  font-size: var(--t-body-size);
  line-height: var(--t-body-lh);
  font-weight: var(--t-body-weight);
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'cv11';
  font-optical-sizing: auto;
  -webkit-font-smoothing: antialiased;
}
.v2 button, .v2 input, .v2 textarea, .v2 select { font-family: inherit; }
/* role classes: ONE LINE EACH (the guard keys on this shape) */
.t-display { font-size: var(--t-display-size); line-height: var(--t-display-lh); font-weight: var(--t-display-weight); letter-spacing: var(--t-display-track); }
.t-heading { font-size: var(--t-heading-size); line-height: var(--t-heading-lh); font-weight: var(--t-heading-weight); letter-spacing: var(--t-heading-track); }
.t-body { font-size: var(--t-body-size); line-height: var(--t-body-lh); font-weight: var(--t-body-weight); letter-spacing: var(--t-body-track); }
.t-strong { font-size: var(--t-strong-size); line-height: var(--t-strong-lh); font-weight: var(--t-strong-weight); letter-spacing: var(--t-strong-track); }
.t-control { font-size: var(--t-control-size); line-height: var(--t-control-lh); font-weight: var(--t-control-weight); letter-spacing: var(--t-control-track); }
.t-small { font-size: var(--t-small-size); line-height: var(--t-small-lh); font-weight: var(--t-small-weight); letter-spacing: var(--t-small-track); }
.t-label { font-size: var(--t-label-size); line-height: var(--t-label-lh); font-weight: var(--t-label-weight); letter-spacing: var(--t-label-track); }
.t-meta { font-size: var(--t-meta-size); line-height: var(--t-meta-lh); font-weight: var(--t-meta-weight); letter-spacing: var(--t-meta-track); }
.t-eyebrow { font-size: var(--t-eyebrow-size); line-height: var(--t-eyebrow-lh); font-weight: var(--t-eyebrow-weight); letter-spacing: var(--t-eyebrow-track); text-transform: uppercase; }
.t-figure { font-size: var(--t-figure-size); line-height: var(--t-figure-lh); font-weight: var(--t-figure-weight); letter-spacing: var(--t-figure-track); }
.t-figure-lg { font-size: var(--t-figure-lg-size); line-height: var(--t-figure-lg-lh); font-weight: var(--t-figure-lg-weight); letter-spacing: var(--t-figure-lg-track); }
.t-token { font-size: var(--t-token-size); line-height: var(--t-token-lh); font-weight: var(--t-token-weight); letter-spacing: var(--t-token-track); text-transform: uppercase; }
@media (prefers-reduced-motion: reduce) {
  .v2 { --dur-press: 0ms; --dur-1: 0ms; --dur-2: 0ms; --dur-3: 0ms; --dur-flash: 0ms; }
}
.v2[data-reduce-motion] { --dur-press: 0ms; --dur-1: 0ms; --dur-2: 0ms; --dur-3: 0ms; --dur-flash: 0ms; }
/* @tokens:end */
```

**Base reset** (outside the token block, no literals):
- `.v2 body { margin: 0; overflow: hidden; }`
- `.v2 *, .v2 *::before, .v2 *::after { box-sizing: border-box; }`
- `:where(.v2 h1, .v2 h2, .v2 h3, .v2 h4, .v2 h5, .v2 h6, .v2 p, .v2 dl, .v2 dd, .v2 ol, .v2 ul) { margin: 0; padding: 0; }`
- `:where(.v2 h1, .v2 h2, .v2 h3, .v2 h4, .v2 h5, .v2 h6, .v2 strong, .v2 b) { font-weight: var(--t-heading-weight); }` (this kills the UA 700 leak)
- `.v2 button, .v2 input, .v2 textarea, .v2 select { color: inherit; }`
- `.v2 .lucide { stroke-width: 1.5; }`
- `.v2 .lucide[width="12"], .v2 .lucide[width="14"] { stroke-width: 2; }`
- `.v2 :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`
- `.v2-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }`. This is the shared sr-only class, usable by any file.

### Type roles (closed set of 12)

| Role | Size/line | Weight | Tracking | Case | Use |
|---|---|---|---|---|---|
| `t-display` | 22/28 | 600 | −0.024em | sentence | One per screen: borrower on the file; "Case files", "Book", "Ledger" |
| `t-heading` | 15/20 | 600 | −0.008em | sentence | Memo section headings, "Countersignature", Ledger file groups, brand |
| `t-body` | 13/20 | 400 | 0 | sentence | Memo prose, UI copy, table cells |
| `t-strong` | 13/20 | 500 | 0 | sentence | Row subjects, signed-over items, `/s/` lines |
| `t-control` | 13/16 | 500 | 0 | sentence | md buttons, tabs, menu rows |
| `t-small` | 12/18 | 400 | 0 | sentence | Margin notes, attestation, sub-lines, evidence tags |
| `t-label` | 12/16 | 500 | 0 | sentence | Column headers, field labels, sm buttons, group headers |
| `t-meta` | 11/16 | 400 | 0 | sentence | Timestamps, captions, "simulated" disclosures, Kbd, chips |
| `t-eyebrow` | 11/16 | 500 | +0.06em | UPPER | At most one per region |
| `t-figure` | 13/20 | 500 | 0 | n/a | Every numeral in tables and prose figures |
| `t-figure-lg` | 18/24 | 500 | −0.014em | n/a | Key-figure values, risk score |
| `t-token` | 11/16 | 600 | +0.04em | UPPER | APPROVE / ESCALATE / DECLINE / REJECTED only |

Sizes in use: 11 / 12 / 13 / 15 / 18 / 22. Uppercase appears only through `.t-eyebrow` and `.t-token`. Source strings stay sentence case.

### Colour rules

**Accent (teal) roles, closed:**
- the one primary button fill;
- the **open reviewer signature line** (2px);
- focus indicators: the focus ring, and the palette/menu active row (inset 2px outline + accent-wash + accent-ink label);
- links, ¶ cite text and `LinkButton` (accent-ink);
- the cited-span wash and the focus halo (accent-wash);
- the awaiting dot, the drafting bar glyph and the drafting caret.

Nothing else is teal.
- The policy switch, the active tab underline and every "selected/current" outline (active cite, cited span, linked note) are **2px ink**.
- **Uniqueness claim (exact):** apart from the keyboard focus ring and the palette's active row, the open reviewer line is the only 2px teal stroke on screen.

**Meaning colours** never fill a button.
- `*-ink` is used for text and glyphs.
- `*-wash` is used for token fills and the backgrounds of counted margin notes.
- `*-mark` is used only for data marks: meter fills, flip zones, and the 6px dot before a key-figure label.
- There are no row washes; hover uses `--sunken`. The four washes are accent, good, warn and bad.

**Control edges (WCAG 1.4.11, logged as P-14):** these use `border-color: var(--ink-3)` (5.44:1 on paper, 4.80 on sunken):
- an unchecked Checkbox;
- the Switch track when off;
- TextInput, TextArea and FilterChips;
- the AmendField input, which uses `var(--line-provisional-edge)`.

Structure (sheet, rows, dividers, panes, secondary-button borders, meter tracks) keeps `--line`. Buttons are identified by their label text.

### Lines (one colour, two weights)

| Kind | Spec | Meaning |
|---|---|---|
| hairline | 1px solid `--line` | All structure |
| control edge | 1px solid `--ink-3` | Boundary of a text field, checkbox, switch or chip |
| provisional | `var(--line-provisional)` / `-edge` / `-active` | Not the record |
| state | 2px | Open reviewer line (accent); focus ring (accent); tab underline, active cite, cited span, linked note (ink); rejected rule is 1px bad-ink |

1.5px and 3px are banned. Coloured 1px borders are allowed only for field focus (accent), field error (bad-ink) and the rejected rule.

### Radii, spacing, heights

- **Radii:** 4 (cite, kbd, checkbox, cited span), 6 (buttons, inputs, chips), 8 (paper sheet, notes, tables, menus, drop zone, palette), pill (tokens, switch, dots).
- **Spacing:** 4/8/12/16/20/24/32/40/48 only; no negative margins (C26). Section gap 32; table cells padding 8 12; Book sub-row indent 24.
- **Heights:**

  | Element | Height |
  |---|---|
  | Controls | sm 28, md 34 |
  | Table rows | 36 single-line, 48 two-line (memo), 56 two-line (Desk) |
  | Group rows | 32, or 40 for Ledger run headers |
  | Doc bar, source head, confirm strip | 44 |
  | Top bar | 48 |
  | Tokens and chips | 20 |
  | Kbd | 18 |
  | Checkbox | 16 |
  | Switch | 28×16 |

### Elevation

Flat. `--shadow-pop` is used only on the palette, menus, tooltips and the source overlay. There is no gradient, blur, glow or text-shadow anywhere (C08).

### Focus and disabled

- **Focus:** every interactive element gets `outline: 2px solid var(--accent); outline-offset: 2px`.
  - Text fields use `border-color: var(--accent); box-shadow: var(--halo-focus)` instead.
  - A field in error uses `border-color: var(--bad-ink); box-shadow: var(--halo-error)`.
- **Disabled** is a token swap only: `color: var(--ink-3); background: var(--sunken); border-color: var(--line); cursor: not-allowed`, with no hover change. Never use opacity.
- Opacity appears only in `v2-enter` (0→1) and the signature recede (1→0.4).

### Motion

**Keyframes (closed list).** All are one-shot except the caret.

| Keyframe | Animates | Duration · easing |
|---|---|---|
| `v2-enter` | opacity 0→1, `translateY(4px)`→0 | `--dur-2` · `--ease-out`, fill-mode `backwards` |
| `v2-flash` | background `--accent-wash`→transparent | `--dur-flash` |
| `v2-ink` | stroke-dashoffset 1→0 | `--dur-3` · `--ease-out` |
| `v2-fill` | `scaleX(0)`→`scaleX(1)` | `var(--k-fill-ms)` · linear. `--k-fill-ms` is set inline by SignatureLine from the model's `AUTO_COUNTDOWN_MS`, a policy constant and not a motion token. |
| `v2-caret` | opacity 1, then 0 at 50% | `steps(1)` · **infinite** |

**Exactly one infinite animation exists in the app:** `.k-caret`. It is mounted only at the write point of the running section while `agent.status === 'running'`. The kit page shows one live specimen.

**There is one source for durations.**
- JS that must wait for a visual reads the token: `cssMs('--dur-2')` before calling `requestRework`. `cssMs` lives in `state/ui.ts` and parses the computed `ms`/`s` value.
- Under reduced motion the token is 0, so the wait is 0 automatically.
- The auto countdown (5000ms) is policy and stays 5s under reduced motion.

There are no count-ups, shimmer, seams, pulses, spinners, glows or rotations.

**Reduced motion** applies under `@media (prefers-reduced-motion: reduce)` **and** under `.v2[data-reduce-motion]` (the kit preview):
- durations are 0;
- `.k-caret { animation: none; }`;
- `.k-sig__fill { display: none; }`;
- the ink appears instantly;
- flash cues become a static `highlighted` state held for `CUE_HOLD_MS` (1200, model).

---

## 5. Status vocabulary (closed; identical on every screen)

`StatusKey` and its glyph/tone map live in `src/v2/kit/types.ts` and `kit/StatusGlyph.tsx`. Its words live in the model's `STATUS_WORD`. Screens render `<StatusGlyph state>` or `<StatusLabel state>` with model-supplied text; they never pick a glyph freely. The glyph box is 16×16.

| StatusKey | Glyph | Tone | Default word | Used for |
|---|---|---|---|---|
| `pending` | 8px hollow ring, 1px ink-3 | ink-3 | Not started | Files and sections not yet reached |
| `drafting` | static 2×10 accent bar | accent | Drafting | Running file/section, upload parsing |
| `awaiting` | 6px solid accent dot | accent | Awaiting your countersignature | Gate, plan review, countdowns |
| `done` | `Check` 12 | ink-2 | Done | Finished section/step (process, not a verdict) |
| `pass` | `Check` 12 | good-ink | Pass | Covenant pass, Book healthy, policy check ok |
| `watch` | `TriangleAlert` 12 | warn-ink | Watch | Thin headroom, warning escalations, low-confidence and no-cure notes |
| `breach` | `OctagonAlert` 12 | bad-ink | Breach | Covenant breach, critical escalations, breach notes |
| `info` | `Info` 12 | ink-2 | Note | Restructure proposed, evidence check, answers |
| `returned` | `CornerUpLeft` 12 | warn-ink | Returned for revision | Send-back records, Revision notes |
| `rejected` | `X` 12 | bad-ink | Rejected | Rejected files/runs, failed policy checks |
| `signed` | `PenLine` 12 | ink | Countersigned | Human-sealed files/runs |
| `signed-auto` | `ShieldCheck` 12 | ink-2 | Auto-countersigned | Policy-sealed files/runs |
| `signed-over` | `Check` 12 | ink-3 | Signed over | Notes after sealing |
| `acknowledged` | `Check` 12 | ink-3 | Acknowledged | Acknowledged or handed-off items |
| `resolved` | `Check` 12 | ink-3 | Resolved | Monitor items that recovered |
| `excluded` | en dash "–" text | ink-3 | Excluded | Peer benchmarks skipped at plan review |
| `cancelled` | `CircleSlash` 12 | ink-3 | Run cancelled | Cancelled runs |
| `error` | `OctagonAlert` 12 | bad-ink | Run error | Run errors, stopped sections |

**Word sets** (closed; model only):
- **Agent recommendation tokens:** APPROVE · ESCALATE · DECLINE (agent only); REJECTED appears only on the rejected signature line.
- **Human verbs:** Countersigned · Countersigned as amended · Auto-countersigned · Returned for revision · Rejected · Run cancelled. The imperatives are Countersign … · Return for revision · Reject memo.
- **Covenant and monitor words:** Pass · Watch · Breach (monitor `healthy` → Pass, `watch` → Watch, `breach` → Breach).
- **Evidence classes:** Quoted · Derived · Unquoted · extracted · Model output.
- **"Flag" vs "note":**
  - A **flag** is any engine flag on the package (`flagsOnRecord`). The word is used only in the policy check and the Ledger.
  - A **note** is a margin note.
  - "Notes to review" and "signed over" count **counted notes** only (`countedNotes`: breach, watch, low-confidence, no-cure).
- **Banned everywhere in V2:** "Approved", "Declined", "Awaiting approval", "Running…". `KitPage.tsx` and `design-pending.ts` are exempt (review statuses).

---

## 6. Primitive kit (`src/v2/kit/*`, CSS in `src/v2/kit/kit.css`, prefix `.k-`)

**Rules for every primitive:**
- **Closed kit.** No primitive accepts `className` or `style`. Screens wrap primitives in their own layout elements. A kit primitive may set inline **custom properties** on its own elements (for example `--k-fill-ms`, `--k-fill`) and nothing else inline.
- **No `title` prop and no native `title=`.** Use `heading`, `label` or `ariaLabel`.
- **Kit-only `force?: 'hover' | 'focus' | 'active'`** on every interactive primitive, rendered as `data-force`. `kit.css` mirrors the `:hover`, `:focus-visible` and `:active` rules for `[data-force=…]`.
- **Kit-only `specimen?: boolean`** on Tip, Menu and Palette. It renders the open popover **in normal flow**: no portal, no fixed positioning, no scrim, no focus trap, no autofocus, no document listeners. It is used only by the kit page.
- **Icons** are `LucideIcon` components at size 12, 14 or 16. There are no `strokeWidth` props.
- **Barrel.** `src/v2/kit/index.ts` imports `./kit.css` and re-exports every primitive and type.
- **Pattern ids.** A primitive embodying a new pattern sets `data-pattern="P-NN"` on its root (§12).
- **Exports.** Each kit `.tsx` exports components only as `export function Name`. Helpers are `const` or unexported. Every exported function must be rendered on the kit page (C20).
- **Self-contained.** The kit compiles with no other V2 files present and imports nothing from `src/v2/model` or `src/v2/state`.

```ts
// src/v2/kit/types.ts
import type { LucideIcon } from 'lucide-react';
export type ForceState = 'hover' | 'focus' | 'active';
export type MeaningTone = 'good' | 'warn' | 'bad';
export type TextTone = 'ink' | 'ink-2' | 'ink-3' | 'accent' | 'good' | 'warn' | 'bad';
export type Role = 'body' | 'strong' | 'small' | 'label' | 'meta' | 'figure';
export type StatusKey =
  | 'pending' | 'drafting' | 'awaiting' | 'done' | 'pass' | 'watch' | 'breach' | 'info'
  | 'returned' | 'rejected' | 'signed' | 'signed-auto' | 'signed-over' | 'acknowledged'
  | 'resolved' | 'excluded' | 'cancelled' | 'error';
export type { LucideIcon };
```

| # | File · export | Props (TypeScript) | Variants / states | A11y | Classes owned |
|---|---|---|---|---|---|
| 1 | `Button.tsx` · `Button` | `{ variant: 'primary'\|'secondary'\|'ghost'\|'danger'; size?: 'sm'\|'md'; children: string; icon?: LucideIcon; kbd?: string; onClick?: () => void; disabled?: boolean; block?: boolean; ariaLabel?: string; force?: ForceState }` | md 34 (t-control, padding 0 12, icon 14); sm 28 (t-label, padding 0 8, icon 12). primary = accent fill + on-accent + 1px accent border; hover/active `--accent-hover`. secondary = paper + 1px line + ink; hover sunken. ghost = transparent + ink-2; hover sunken + ink. danger = ghost with bad-ink text; hover bad-wash. Disabled = token swap. Pressed background over `--dur-press`. A trailing `Kbd` inside primary uses `onAccent`. | native `<button type="button">`; `aria-label` falls back to children | `.k-btn .k-btn--primary .k-btn--secondary .k-btn--ghost .k-btn--danger .k-btn--sm .k-btn--block .k-btn__icon` |
| 2 | `IconButton.tsx` · `IconButton` | `{ icon: LucideIcon; label: string; onClick?: () => void; size?: 'sm'\|'xs'; disabled?: boolean; pressed?: boolean; force?: ForceState }` | sm 28×28 (icon 16), xs 24×24 (icon 14). Ghost styling. `pressed` = sunken fill. | `aria-label={label}`; wrapped in `Tip` with the same label; `aria-pressed` when `pressed` is set | `.k-iconbtn .k-iconbtn--xs` |
| 3 | `LinkButton.tsx` · `LinkButton` | `{ children: string; onClick?: () => void; href?: string; newTab?: boolean; role?: 'small'\|'label'\|'body'\|'meta'; icon?: LucideIcon; iconAfter?: boolean; disabled?: boolean; provisional?: boolean; ariaLabel?: string; force?: ForceState }` | accent-ink; underline on hover. `provisional` = `border-bottom: var(--line-provisional)` (amend trigger). disabled = ink-3, no underline. | `<a>` when `href` is set (`target=_blank rel=noopener` if `newTab`), otherwise `<button type="button">` | `.k-link .k-link--provisional` |
| 4 | `Kbd.tsx` · `Kbd` | `{ children: string; onAccent?: boolean }` | min-width 18, height 18, padding 0 4, radius xs, sunken + 1px line, t-meta ink-2. `onAccent` = accent-hover fill + on-accent text, no border. | `aria-hidden` | `.k-kbd .k-kbd--on-accent` |
| 5 | `Token.tsx` · `Token` | `{ tone: MeaningTone; children: string; variant?: 'solid'\|'muted'\|'struck' }` | Height 20, padding 0 8, radius pill, t-token. solid = tone wash + tone ink. muted = transparent + 1px line + ink-2. struck = muted + line-through + ink-3. | text | `.k-token .k-token--good .k-token--warn .k-token--bad .k-token--muted .k-token--struck` |
| 6 | `Chip.tsx` · `Chip` | `{ children: string; tone?: 'neutral'\|'accent' }` | Height 20, padding 0 8, radius sm, t-meta. neutral = sunken + ink-2. accent = accent-wash + accent-ink. | text | `.k-chip .k-chip--accent` |
| 7 | `StatusGlyph.tsx` · `StatusGlyph`, `StatusLabel`, `GLYPHS` | `StatusGlyph { state: StatusKey; srLabel?: string }`; `StatusLabel { state: StatusKey; children: string; role?: 'small'\|'body'\|'label'\|'strong' }` | The §5 map. StatusLabel = glyph + 8px gap + text in the role. Text is ink, or ink-3 for pending/excluded/signed-over/acknowledged/resolved/cancelled. | glyph `aria-hidden`; `srLabel` renders a `.v2-sr` span | `.k-glyph .k-glyph--ring .k-glyph--bar .k-glyph--dot .k-glyph--dash .k-tone-ink .k-tone-ink2 .k-tone-ink3 .k-tone-accent .k-tone-good .k-tone-warn .k-tone-bad .k-status` |
| 8 | `Tip.tsx` · `Tip` | `{ label: string; children: ReactElement<HTMLAttributes<HTMLElement>>; placement?: 'top'\|'bottom'; specimen?: boolean }` | Renders `<span class="k-tip-anchor">` (inline-flex) around the child and clones the child only to add `aria-describedby`. Positions against the anchor span. Listens to pointerenter/leave and focusin/out on the span. Never reads `child.ref`. Bubble: t-label, paper, `--shadow-pop`, radius sm, padding 4 8, max-width 240. Shows after 400ms hover, immediately on keyboard focus-visible. Hides on leave, blur and Esc. | `role="tooltip"`, `useId` | `.k-tip-anchor .k-tip` |
| 9 | `Cite.tsx` · `Cite` | `{ label: string; active?: boolean; onClick: () => void; ariaLabel: string }` | Inline, height 18, padding 0 4, radius xs, t-meta accent-ink. hover sunken. active = **2px ink** outline (offset 1). | `<button>`, `aria-pressed={active}` | `.k-cite .k-cite--active` |
| 10 | `EvidenceTag.tsx` · `EvidenceTag` | `{ cls: 'quoted'\|'derived'\|'unquoted'\|'model'; text: string; children?: ReactNode }` | t-small. quoted/derived = ink-2 word + `children` (Cite buttons, formula text). unquoted = ink-3. model = ink-2. Never placed inside a button. | text | `.k-evidence .k-evidence--unquoted` (P-04) |
| 11 | `TextArea.tsx` · `TextArea` | `{ value: string; onChange: (v: string) => void; placeholder: string; ariaLabel: string; invalid?: boolean; describedBy?: string; inputRef?: Ref<HTMLTextAreaElement>; disabled?: boolean }` | Paper, 1px **ink-3** edge, radius sm, padding 8 12, t-body. Min height 64, auto-grows to 160 via scrollHeight. Focus and invalid recipes from §4. | `aria-invalid`, `aria-describedby` | `.k-textarea .k-textarea--invalid` |
| 12 | `AmendField.tsx` · `AmendField` | `{ display: string; amended: { from: string; to: string } \| null; value: number; step: number; min: number; max: number; prefix: string; suffix: string; onCommit: (v: number \| null) => void; ariaLabel: string; disabled?: boolean; focusTick?: number }` | View: `LinkButton provisional` showing `display` (or a `Redline` from→to when amended) + `PenLine` 12 on hover/focus. Edit: inline 28px number input (width 72) with prefix/suffix (t-figure), `border: var(--line-provisional-edge)`, or `-active` on focus. Enter or blur commits (`NaN`/empty → `null` = terms as filed). Esc reverts. A change in `focusTick` enters edit and focuses. | input `aria-label`; view button `aria-label="Amend <ariaLabel>"` | `.k-amend .k-amend__input` (P-05) |
| 13 | `TextInput.tsx` · `TextInput` | `{ value: string; onChange: (v: string) => void; onSubmit: () => void; placeholder: string; ariaLabel: string; disabled?: boolean; icon?: LucideIcon }` | Height 32, padding 0 12, paper, 1px **ink-3** edge, radius sm, t-body. Enter submits. | `aria-label` | `.k-input` |
| 14 | `Checkbox.tsx` · `Checkbox` | `{ checked: boolean; onChange: (v: boolean) => void; ariaLabel: string; disabled?: boolean; locked?: boolean; force?: ForceState }` | 16×16, radius xs, 1px **ink-3** edge. checked = accent fill + white `Check` 12. locked = a `Lock` 12 ink-3 glyph instead of the box. | native checkbox visually replaced; locked = `aria-disabled` | `.k-check .k-check--locked` |
| 15 | `Switch.tsx` · `Switch` | `{ checked: boolean; onChange: (v: boolean) => void; ariaLabel: string; disabled?: boolean; force?: ForceState }` | 28×16 pill. off = sunken track + 1px **ink-3** edge. on = **ink** track. 12px paper knob slides over `--dur-1`. | `role="switch" aria-checked` | `.k-switch .k-switch--on` (P-10) |
| 16 | `Tabs.tsx` · `Tabs` | `{ items: { id: string; label: string; count: string \| null; countTone: 'accent'\|'warn'\|'ink-3' }[]; active: string; onSelect: (id: string) => void; ariaLabel: string }` | 48 tall, t-control ink-2. Active = ink + 2px **ink** underline (`::after`, `bottom: -1px`). | `<nav aria-label>`; items are buttons with `aria-current="page"` | `.k-tabs .k-tabs__item .k-tabs__count` |
| 17 | `Menu.tsx` · `Menu` | `{ label: string; trigger: { text: string; icon?: LucideIcon; variant?: 'ghost'\|'secondary' }; items: { id: string; label: string; meta?: string; checked?: boolean; onSelect: () => void }[]; specimen?: boolean }` | Trigger = `Button` sm + `ChevronDown` 12. Popover: paper, `--shadow-pop`, radius md, padding 4, min-width 200. Rows 32, t-body, padding 0 12. Hover row = sunken. **Active (keyboard) row** = accent-wash + accent-ink label + `outline: 2px solid var(--accent); outline-offset: -2px`. `checked` = `Check` 14. | `aria-haspopup="menu"`, `role="menu"`/`menuitemradio`; ↑↓ Enter Esc; focus returns to the trigger | `.k-menu .k-menu__item .is-active` |
| 18 | `Meter.tsx` · `Meter` | `{ kind: 'risk'; value: number; tick: number; tone: MeaningTone; ariaLabel: string } \| { kind: 'cushion'; pct: number; tone: 'neutral'\|'warn'\|'bad'; ariaLabel: string }` | risk: full width, 6px tall, `--line` track, fill in tone mark to value%, one 2×12 ink tick at tick%. cushion: 64×4 track, 2×10 ink-2 centre tick; fill grows from the centre by `min(\|pct\|,50)/50 × 50%` (right if positive, left if negative); fill bad-mark (<0) / warn-mark (0–10) / ink-3 (>10). | `role="img" aria-label` | `.k-meter .k-meter--risk .k-meter--cushion` (P-07) |
| 19 | `Table.tsx` · `Table` | see the type block below | Grid-based. Header 36, sunken, t-label ink-3. Rows 36/48/56 with a 1px `--line` rule. Cells padding 8 12; `align: 'end'` = right + figures. Group rows (sunken): 32 or 40; label t-label ink; optional StatusGlyph, meta t-meta ink-3, count; when `onToggle` is set, a `ChevronRight` 12 rotates 90° over `--dur-1`. `trailing` sits at the far right. `span` rows render one full-width cell. `indent` = 24px extra left padding on the first cell/span. `detail` renders full-width after the row. `highlighted` = sunken. A `flashKey` change replays `v2-flash`. `muted` = ink-2 text. `onActivate` rows: hover sunken, `cursor: pointer`, Enter/Space/click; kit controls inside a row stop propagation. `stackBelow: 760`: below 760px the header hides and each row's cells stack in one column; columns with `hideBelow` hide. | `role="table"/"row"/"columnheader"/"cell"`; activatable rows `tabIndex=0` + `aria-label`; toggling groups are buttons with `aria-expanded` | `.k-table .k-table__head .k-table__row .k-table__cell .k-table__cell--end .k-table__group .k-table__span .k-table__detail .is-highlighted .is-muted .is-flash .is-indent .is-stacked` |
| 20 | `Redline.tsx` · `Redline` | `{ from: string; to: string; role?: Role }` | Old value ink-3 line-through + " → " ink-3 + new value ink. | `aria-label="<from> changed to <to>"` | `.k-redline` |
| 21 | `MarginNote.tsx` · `MarginNote` | `{ id: string; tone: 'breach'\|'watch'\|'info'\|'returned'\|'signed-over'; status: StatusKey; heading: string; children: string; meta?: string; actions?: { label: string; onClick: () => void }[]; active?: boolean; onHover?: (on: boolean) => void }` | radius md, padding 12, 1px line. Background: breach = bad-wash; watch and returned = warn-wash; info and signed-over = paper. Head = StatusGlyph + heading (t-label). Body t-small. Meta t-meta ink-3. Actions = `LinkButton role="label"`, gap 12. `active` = **2px ink** outline. Enters with `v2-enter`. | `<aside aria-label={heading}>`, `data-note={id}` | `.k-note .k-note--breach .k-note--watch .k-note--returned .k-note--info .k-note--signed-over .is-active` (P-03) |
| 22 | `SectionHead.tsx` · `SectionHead` | `{ ordinal: string; heading: string; suffix?: string \| null; status: StatusKey; statusLabel: string; anchorId: string; flashKey?: number; highlighted?: boolean }` | 28px row, grid `[24px ordinal][1fr heading][16px glyph]`. Ordinal t-figure ink-3. Heading t-heading (`h2`). Suffix t-small ink-2 inline. Same flash/highlight as Table rows. | `h2`; glyph `srLabel` | `.k-sechead .is-flash .is-highlighted` |
| 23 | `Disclosure.tsx` · `Disclosure` | `{ label: string; meta?: string; open: boolean; onToggle: () => void; children: ReactNode }` | Trigger looks like `LinkButton role="label"` + `ChevronRight` 12 rotating 90° over `--dur-1`. Panel: `grid-template-rows` 0fr→1fr over `--dur-2`; collapsed padding collapses with the row. | `aria-expanded`, `aria-controls`; panel `inert` when closed | `.k-disclosure .k-disclosure__panel` |
| 24 | `JsonBlock.tsx` · `JsonBlock`, `CopyButton` | `JsonBlock { label: string; count: string; value: unknown }`; `CopyButton { text: string; label: string }` | Label row: t-label ink-2 + t-meta ink-3 count + CopyButton (always visible). Block: sunken, radius sm, padding 8 12, t-small, `white-space: pre-wrap`, max-height 240, `overflow: auto`, no syntax colour. CopyButton = `IconButton xs`: `Copy` → `Check` for 1200ms after copying, announces "Copied" via an internal `.v2-sr` live span. | `<pre tabIndex=0 aria-label>` | `.k-json .k-json__pre` |
| 25 | `KeyFigure.tsx` · `KeyFigure`, `KeyFigures` | `KeyFigure { label: string; value: string; sub?: string \| null; caption?: string \| null; tone: 'ink'\|'warn'\|'bad'; dot?: MeaningTone \| null; evidence: string; onClick: () => void; ariaLabel: string; force?: ForceState }`; `KeyFigures { children: ReactNode; ariaLabel: string }` | KeyFigures = grid of N equal cells in a 1px line frame, radius md, 1px vertical rules (borders, not gaps). KeyFigure = a `<button>` with **no interactive descendants**: min-height 76, padding 12 16. Label t-label ink-3 (optional 6px `dot` in tone mark). Value t-figure-lg in tone ink. Sub t-small ink-2. Caption t-small in tone. Evidence t-small ink-3, **plain text** (for example "Quoted ¶02", "Derived · 96.3 ÷ 22.6", "Unquoted · extracted", "Model output · Structuring Engine"). Hover sunken. Wraps 3+2 below a 600px container (container query). | `<button aria-label>` | `.k-keyfigs .k-keyfig` |
| 26 | `Slider.tsx` · `Slider` | `{ value: number; min: number; max: number; step: number; onChange: (v: number) => void; ariaLabel: string; valueText: string; zones: { tone: MeaningTone; fromPct: number; toPct: number }[]; boundaries: { pct: number; text: string; tone: MeaningTone }[] }` | 56px row. Labels above the track (t-meta in tone ink), hidden when < 48px apart or < 24px from either end. 4px track of flat zone segments in tone mark (gapless; no gradient) + 2px ink-3 notches at boundaries. 14px paper thumb with a 2px ink ring. Fully custom cross-engine range chrome; focus = accent outline on the thumb. | native `<input type=range>` with `aria-valuetext`; a `.v2-sr` list of zones | `.k-slider .k-slider__zones .k-slider__label` |
| 27 | `SignatureLine.tsx` · `SignatureLine`, `INK_PATH` | see the type block below | See §8. The interactive element (`role="button"`) wraps **only the pad and the rule**. The caption renders as a **sibling** below it, so a `LinkButton` in the caption is never nested. | open line `role="button" tabIndex=0 aria-label="Countersignature line. The agent is suspended until you act."`; ink SVG `aria-hidden` | `.k-sig .k-sig__hit .k-sig__pad .k-sig__rule .k-sig__fill .k-sig__ink .k-sig__caption .k-sig--open .k-sig--signed .k-sig--rejected .k-sig--auto` (P-01, P-11) |
| 28 | `Caret.tsx` · `Caret` | `{}` | inline-block 2×14 accent, `vertical-align: text-bottom`, **margin-left 4px**, `animation: v2-caret var(--dur-caret) steps(1) infinite` (the only `infinite` in the codebase). Reduced motion: `animation: none`. | `aria-hidden` | `.k-caret` (P-06) |
| 29 | `EmptyNote.tsx` · `EmptyNote` | `{ children: string; state?: StatusKey }` | t-small ink-3, padding 16, optional glyph before the text. | `role="status"` | `.k-empty` |
| 30 | `DropZone.tsx` · `DropZone` | `{ label: string; sub: string; chooseLabel: string; disabledReason: string \| null; onFile: (f: File) => void }` | Height 64, `border: var(--line-provisional)`, radius md, flex centre, gap 12. `Upload` 16 ink-2, label t-body, sub t-meta ink-3, inline `LinkButton` "choose a file" (opens a hidden `input accept=".pdf,application/pdf"`). Drag-over = `var(--line-provisional-active)` + accent-wash. Disabled = sunken + ink-3 + the reason as the sub line; drops are ignored. | choose button keyboard reachable; zone `aria-disabled` | `.k-drop .k-drop--over .k-drop--disabled` |
| 31 | `Palette.tsx` · `Palette` | `{ open: boolean; onClose: () => void; placeholder: string; commands: { id: string; label: string; section: string; hint?: string; kbd?: string; run: () => void }[]; footer: (count: number) => string; specimen?: boolean }` | Fixed overlay: `--scrim` + 560 panel, top 15vh, paper, radius md, `--shadow-pop`. Input row 48 (t-body, `Search` 16, `Kbd` "esc"). Section labels t-label ink-3. Rows 36: label t-body + hint t-meta ink-3 + Kbd. **Active row** = accent-wash + accent-ink label + inset 2px accent outline. Substring filter. Footer t-meta ink-3. | `role="dialog" aria-modal`; combobox/listbox with `aria-activedescendant`; focus trap; Esc closes; focus returns to the opener (all off in `specimen`) | `.k-palette .k-palette__panel .k-palette__row .is-active` |
| 32 | `LiveRegion.tsx` · `LiveRegion` | `{ message: string \| null }` | `.v2-sr` | `aria-live="polite" role="status"` | `.k-live` |
| 33 | `FilterChips.tsx` · `FilterChips` | `{ items: { id: string; label: string; count: string }[]; active: string; onSelect: (id: string) => void; ariaLabel: string }` | Single-select row, gap 8. Chip 28 tall, padding 0 12, radius sm, t-label. Inactive = paper + 1px ink-3 edge + ink-2. Active = sunken + 1px ink edge + ink. Count t-meta ink-3 after the label. | `role="group" aria-label`; buttons with `aria-pressed` | `.k-fchips .k-fchip .is-active` |
| 34 | `ConfirmStrip.tsx` · `ConfirmStrip` | `{ text: string; confirmLabel: string; cancelLabel: string; tone: 'neutral'\|'bad'; onConfirm: () => void; onCancel: () => void }` | min-height 44, sunken, 1px line top and bottom, padding 8 12, flex with gap 12. t-small ink text; Button sm `secondary` (neutral) or `danger` (bad) for confirm; Button sm ghost for cancel. On mount, focus moves to the cancel button. Esc = cancel. | `role="group" aria-label={text}` | `.k-confirm` (P-19) |

```ts
// Table.tsx
import type { ReactNode } from 'react';
import type { StatusKey } from './types';
export interface TableColumn { key: string; label: string; width: string; align?: 'start' | 'end'; srOnlyLabel?: boolean; hideBelow?: 1120 | 760 }
export interface TableGroup {
  label: string; status?: StatusKey; meta?: string; count?: string;
  height?: 32 | 40; expanded?: boolean; onToggle?: () => void; trailing?: ReactNode;
}
export interface TableRow {
  key: string;
  cells?: Record<string, ReactNode>;   // normal row
  span?: ReactNode;                     // one full-width cell instead of cells
  group?: TableGroup;                   // group/header row instead of cells
  height?: 36 | 48 | 56;
  indent?: boolean;                     // 24px extra left padding (Book sub-rows)
  onActivate?: () => void;
  ariaLabel?: string;
  anchorId?: string;                    // rendered as data-anchor on the row element
  highlighted?: boolean;
  flashKey?: string | number;
  muted?: boolean;
  detail?: ReactNode;                   // full-width block after the row (confirm strip, expansion)
}
export interface TableProps { columns: TableColumn[]; rows: TableRow[]; caption: string; header?: boolean; stackBelow?: 760 }

// SignatureLine.tsx
import type { ReactNode, Ref } from 'react';
export type SigState = 'pre-signed' | 'open' | 'countdown' | 'held' | 'signed' | 'signed-auto' | 'rejected' | 'returned';
export interface SignatureLineProps {
  role: 'agent' | 'reviewer';
  state: SigState;
  text?: string;                 // agent '/s/ Credit Analyst' · auto '/auto/ clean-approval policy'
  caption: ReactNode;            // sibling of the hit area: t-meta ink-3, 8px below the rule
  ink?: 'none' | 'animate' | 'static';
  rejectedWord?: string;         // 'REJECTED' (from the model)
  fillMs?: number;               // countdown fill duration (AUTO_COUNTDOWN_MS); sets --k-fill-ms inline
  lineRef?: Ref<HTMLDivElement>; // the hit area (pad + rule)
  onActivate?: () => void;       // click/Enter on an open reviewer line
}
export const INK_PATH = 'M4 30 C 24 6, 40 6, 48 22 S 70 40, 84 18 S 120 4, 132 24 S 168 36, 196 14';
// The ink is a FIXED-SIZE <svg width="200" height="40" viewBox="0 0 200 40"> left-aligned in the pad
// (no preserveAspectRatio="none", no vector-effect), so pathLength normalisation is consistent:
// <path d={INK_PATH} pathLength={1} /> with CSS stroke: var(--ink); stroke-width: 2px;
// stroke-linecap: round; fill: none; stroke-dasharray: 1; stroke-dashoffset: 0;
// animate mode runs v2-ink from dashoffset 1. Verify in Chrome and Safari (§13).
```

**No surface may hand-roll a control.** `<button>`, `<input>`, `<textarea>`, `<select>` and `<a>` are banned in `src/v2/screens/**`, `src/v2/chrome/**`, `src/v2/App.tsx` and `src/v2/KitPage.tsx` (C22). Kit classes may be styled only in `kit/kit.css` (C23). Screens and chrome use no inline `style` at all. KitPage may set `background: var(--token)` on swatches.

---

## 7. Screens

All screens read `const s = useV2()` and the model selectors, and they call only `s.actions.*`. Screens import only from `../../kit`, `../../model`, `../../state/store` and `../../state/screens`.

**Shared DOM contract** (scroll and flash targets must be real boxes):

| Attribute | Placed on (never on a `display: contents` element) |
|---|---|
| `data-section="<FileAt>"` + `scroll-margin-top: 60px` | the **`.file-pagecell`** of every page row (and the stress/exhibits/signature/monitoring cells) |
| `data-anchor="<anchorId>"` | Table rows (via `anchorId`) and SectionHead roots |
| `data-stub="<stepId>"` | the margin stub container |
| `data-note="<noteId>"` | MarginNote roots |
| `data-docbar` | the sticky doc-bar wrapper (doc bar + confirm strip) |

Anchor ids: `sec:<SectionId>`, `cov:<covenant name>` (for example `cov:Max Total Leverage`), `fig:<FigureId>`, `rev<N>:<FigureId>`.

### 7.1 Desk (`#/`, `screens/desk/`)

**Purpose.** One calm list of every file. It merges V1's launchpad, Deals board and upload. Stages come from real run state. The human's next obligation is the only possible primary.

**Layout** (column max-width 1040, padding 32 40, gap 24):

```
Case files                                                            t-display
3 sample files, chosen to end differently · none decided this session · extraction is simulated   t-small ink-2
┌ Table (paper, 1px line, radius md, stackBelow 760) ──────────────────────────────────────────┐
│ File 1fr(min 220) | Facility 200 (hideBelow 1120) | Leverage 88 end | Agent's call 120 | Stage 200 | Action 168 end │
│ ● Awaiting your countersignature   1                                               group 32 │
│ Project Atlas            Senior Secured Term     4.26x   [ESCALATE]  ● Awaiting you · rev 1 │
│ Atlas Industrial Hold…   Loan B · $45.0M        (bad-ink)            waiting 1:12  [Review and countersign] │
│ ○ Not started   2                                                                           │
│ Project Meridian …                               2.80x       –       ○ Not started   [Draft memo] │
│ Project Cobalt …                                 5.66x       –       ○ Not started   [Draft memo] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ DropZone 64: ⤒ Drop a CIM (PDF) to open a new file, or choose a file · Extraction is simulated from the file name ┐
```

**Cells** (row height 56):
- **File:** `LinkButton role="body"` with the name (t-strong), then the borrower in t-small ink-2. Uploads add `Chip` "uploaded".
- **Facility:** t-small ink-2.
- **Leverage:** t-figure; bad-ink when above the leverage covenant threshold parsed from `deal.covenants` (never a literal).
- **Agent's call:** a `Token` when the file has a package (live gate, live sealed, or snapshot); otherwise "–" in ink-3.
- **Stage:** `StatusLabel role="small"` + an optional sub-meta (t-meta ink-3).
- **Action:** a `Button`.

**Groups** (`Table` group rows), in this order, with empty groups hidden:
1. Awaiting your countersignature
2. Plan review
3. Drafting
4. Run error
5. Not started
6. Decided

**Stage copy (`selectDesk`):**

| File state | Stage | Action |
|---|---|---|
| not started | `pending` "Not started" (sub-meta "Last run cancelled · reset before a decision" when the latest RunRecord is cancelled) | secondary sm "Draft memo" (disabled while parsing) |
| plan review (live) | `awaiting` "Plan review · starts in 6 s" / "Plan review · held" / "Plan review · open the file to start" (countdown not armed off-file) | secondary sm "Open plan" |
| running (live) | `drafting` "Drafting · Covenant compliance · 0:06" / "Drafting · Revision 2 · 0:14" | ghost sm "Open" |
| gate (live) | `awaiting` "Awaiting you · rev 1 · waiting 1:12" | **primary md "Review and countersign"** (the only primary) |
| error (live) | `error` "Run error · drafting stopped" | secondary sm "Re-run" |
| decided | `signed` "Countersigned 14:03" / "Countersigned as amended 14:03"; `signed-auto` "Auto-countersigned 14:03"; `rejected` "Rejected 14:03". Sub-meta: "signed over 1 breach", "routed to the Book" or "no notes". | ghost sm "Open record" → `?at=signature` |
| parsing (upload) | a synthetic first row in Not started: `drafting` "Extracting financials from q3_cim.pdf · simulated · 0:01" (the numeral ticks; no animation) | none |

**Interactions:**
- A row click (`onActivate`) opens the file.
- "Draft memo" / "Re-run" → `actions.startFile(dealId)`. When a run is live, that row's `detail` renders a `ConfirmStrip` (tone neutral) with the §10 copy. "Start anyway" → `actions.confirmStart()`; "Keep Project Atlas" → `actions.cancelConfirm()`.
- "Review and countersign" → navigate to `?at=recommendation`.
- The drop zone → `actions.upload(file)`. It is disabled with "Finish or stop the live run on Project Atlas to add a file." while a run is live, and with "Extraction in progress · q3_cim.pdf" while parsing.

**Summary line:**
- Initially: "3 sample files, chosen to end differently · none decided this session · extraction is simulated".
- Later: "4 files · 1 awaiting your countersignature · 1 decided this session · extraction is simulated". Segments with a count of 0 are omitted, except the file count.

**Keyboard:** see §7.6. There are no single-key shortcuts on the Desk.

### 7.2 Case file (`#/file/<dealId>`, `screens/file/`)

**Purpose.** This is the product. The agent drafts the Credit Approval Memorandum live beside the CIM it quotes. Evidence classes are visible, flags are margin notes, the run log lives in the margin, and the decision is the signature at the foot.

**Files:**
- `index.tsx` (exports `FileScreen`)
- `FileScreen.tsx`
- `DocBar.tsx`
- `SourcePane.tsx`
- `PageHeader.tsx`
- `Contents.tsx`
- `Margin.tsx`
- `Appendix.tsx`
- `sections/Recommendation.tsx`, `Financials.tsx`, `Risk.tsx`, `Peers.tsx`, `Covenants.tsx`, `Revision.tsx`
- `file.css`

**Page grid** (rows align notes deterministically; no absolute positioning, no ResizeObserver):

```css
.file-grid { display: grid; grid-template-columns: minmax(600px, 720px) 280px; column-gap: 24px; }
.file-row { display: contents; }                 /* never a scroll or flash target */
.file-pagecell { background: var(--paper); border-left: 1px solid var(--line); border-right: 1px solid var(--line); padding: 0 48px 32px; scroll-margin-top: 60px; }
.file-row:first-child .file-pagecell { border-top: 1px solid var(--line); border-top-left-radius: var(--r-md); border-top-right-radius: var(--r-md); padding-top: 40px; }
.file-row:last-child .file-pagecell { border-bottom: 1px solid var(--line); border-bottom-left-radius: var(--r-md); border-bottom-right-radius: var(--r-md); padding-bottom: 40px; }
.file-margincell { display: flex; flex-direction: column; gap: 12px; align-self: start; }
@media (max-width: 999px) { .file-grid { grid-template-columns: 1fr; } }
```

- Each memo row is one `.file-row` holding one page cell (with `data-section`) and one margin cell.
- **Row order:**
  1. header
  2. contents (not-started / plan-review) **or** the sections: recommendation, financials, risk, peers, covenants, revision-N…
  3. exhibits (if any)
  4. stress (when available)
  5. signature (when `rows.signature`)
  6. monitoring (when `rows.monitoring`)
- The margin cells for exhibits, stress, signature and monitoring are empty.
- Below 1000px the margin cells move inside the paper (§3).

**Doc bar** (44px, sticky, canvas bg, 1px bottom line, padding 0 24, three zones). It sits inside the `data-docbar` wrapper together with any open `ConfirmStrip`.
- **Left:** `LinkButton` "Desk", "/" in ink-3, and `Menu` (trigger ghost sm = file name; one item per file, with meta = its stage).
- **Centre:**
  - `StatusLabel role="label"` showing `docBar.status`;
  - elapsed (t-figure ink-3);
  - `docBar.extraction` when present (t-meta in its tone, for example "Extraction 76%");
  - `policySuffix` (t-meta ink-3).
  - During an auto countdown the status reads "Auto-countersign in 4 s · clean-approval policy".
- **Right:**
  - When counted notes exist: `IconButton xs ArrowUp` "Previous note (K)", t-label "1 of 2", `IconButton xs ArrowDown` "Next note (J)".
  - During the countdown: `LinkButton role="label"` "Review manually" (→ `actions.reviewManually`).
  - At the gate: ghost sm "Go to signature" with an `ArrowDown` icon (→ `actions.requestSign('button')`, which only scrolls when the line is off-screen).
  - While running: ghost sm "Go to drafting" with an `ArrowDown` icon (scrolls the `drafting` section's page cell into view, block start, instant).
  - The `docBar.actions` buttons:

    | Kind | Button | Action |
    |---|---|---|
    | `stop` | ghost "Stop" | `actions.requestStop` → ConfirmStrip |
    | `export` | secondary "Export file" | `actions.exportFile` |
    | `rerun` | ghost "Re-run" | `actions.startFile` |
    | `ledger` | ghost "Open in Ledger" | navigate |

  - The doc bar never holds a primary.
- **ConfirmStrip** under the doc bar, from `docBar.confirm` (stop or start; copy in §10).

**Source pane (`SourcePane.tsx`):**
- **Head (44):**
  - t-label "Source · Project Atlas CIM.pdf"; uploads add `Chip` "simulated extraction".
  - When cites are active: t-label "1 of 4" + `IconButton xs ArrowUp` "Previous cite" + `ArrowDown` "Next cite" + `IconButton xs X` "Clear cites".
  - Always: `LinkButton role="label"` "Show all quoted (4)" (→ `actions.cite(dealId, quoted.markIds, 0)`) and `IconButton xs ChevronsLeft` "Close source ([)".
- **Body** (padding 16 20):
  - Title in t-heading.
  - A `dl` in t-small: Borrower / Facility.
  - Paragraphs: grid `[32px | 1fr]`, gap 8, 16 between paragraphs. The gutter shows "¶01" in t-meta ink-3; the text is t-body.
  - Quoted spans are `<mark>` with accent-wash and radius xs. The active span adds a **2px ink** outline. Marks are not interactive. The active span scrolls into view (block centre) when the cite index changes.
- **Closed:** the 40px spine (§3).

**Page header row:**
- Eyebrow "Credit approval memorandum" (t-eyebrow ink-3).
- Borrower (t-display, `h1`).
- Meta line (t-small ink-2): "Senior Secured Term Loan B · $45.0M · CAM-2026-0417 · rev 1".
- Prepared line (t-meta ink-3): "Prepared by Credit Analyst (agent) · 17 Oct 2026, 14:02 · source: Project Atlas CIM, ¶01 to ¶03".
- **Cancelled note**, when `header.cancelled` is set (8px top, t-small ink-2): "Last run cancelled 14:06 · reset before a decision. The previous record (run 1, countersigned 14:03) is in the Ledger." + `LinkButton` "Open in Ledger".
- **Seal row**, when sealed (8px top margin, 1px top line, padding-top 12):
  - `StatusLabel role="strong"` with the headline ("The agent recommended ESCALATE. You countersigned.");
  - a receipt in t-meta ink-3: "5 steps · 5 tool calls · drafted in 6.1 s · suspended 1:12 · lowest confidence 88% · rev 1 · run 1".
- **Header margin cell**, in this order:
  1. `Switch` + t-label "Show all reasoning" (persisted `v2.showReasoning`).
  2. Ask: `TextInput` with placeholder "Ask about this file" and icon `MessageSquare`; submit → `actions.ask(dealId, text)`; disabled with `ask.disabledReason` (t-meta ink-3) when not enabled.
  3. The thread (t-small): "You" lines in ink; answers in ink-2 with meta "rule-based responder · simulated" (engine) or "Countersign" (local intercept).
  4. The evidence-check note (`headerMargin.evidenceCheck`).

**Contents row** (not-started and plan-review; `Contents.tsx`):
- `SectionHead` with ordinal "" and heading "Contents".
- Table, no header, 48px rows: `Checkbox` (locked for required steps) · ordinal · title (t-strong) + describe (t-small ink-2) · tool (t-small ink-3, end) · tag `Chip` ("required" / "optional · simulated comparables").
- "Source · Project Atlas CIM · 3 paragraphs" + `LinkButton` "Open source".
- **Footer** (16 top):
  - not-started: **primary md "Draft memo"**, kbd `${modKey}↵` (disabled with the parsing reason while parsing).
  - plan-review: **primary md "Start drafting"**, kbd `${modKey}↵` + ghost md "Cancel" + the countdown line in t-small ink-2: "Drafting starts in 6 s · " + `LinkButton` "Hold". After a hold the line reads "Held · start when ready". Then t-meta ink-3: "An unattended start is recorded as 'Plan auto-started', never as your approval."
- **Margin:** `EmptyNote` "Notes, evidence checks and the run log appear here as the memo is drafted."

**Section rows** (running / gate / sealed / error):
- Each page cell holds a `SectionHead`. Ordinals are "1"–"4" for §1–§4, "" for Recommendation, and "R2" for revision 2.
- After the head, one of:
  - **pending:** t-small ink-3 `pendingLine`.
  - **drafting:** t-small ink-2 reasoning text, plus a new line "Calling Covenant Tester…" while a tool call is in flight, plus `<Caret/>` at the very end. Only the drafting section renders a Caret.
  - **set:** the section body, entering with `v2-enter`.
  - **excluded:** t-small ink-3 "Excluded at plan review by the reviewer."
  - **stopped:** `StatusLabel error` "Stopped".
- The margin cell holds the **stub** (`data-stub`) plus that section's notes.

**Stub anatomy:**
- Tool label (t-label ink-2).
- Meta "1.1 s · 94%" (t-meta; confidence in ink-3, warn-ink or bad-ink by `confTone`).
- `Disclosure` "Record" (meta "args 3 fields · result 8 fields") containing `JsonBlock` "args →" and `JsonBlock` "← result".
- `Disclosure` "Reasoning" with t-small ink-2 `reasoning`. It defaults open when `showReasoning`.
- The open state is local per stub, and a trace opens it.

**Section bodies:**
- **Recommendation** (top; pending line "Written last, after every covenant is tested."):
  - Basis eyebrow (t-eyebrow ink-3): "On the filed figures" or "On the proposed revised structure · rev 2".
  - A row of `Token`s: when restructured, a `Token variant="struck"` of the rev-1 recommendation comes first. Then the sentence (t-body).
  - The engine summary (t-body ink-2).
  - `KeyFigures` with 5 `KeyFigure`s; a click calls `actions.trace(traceStepId, anchorId)`.
  - The analysis aid: t-meta ink-3 "Analysis aid · not part of the memo" on its own line, then the t-small ink-2 nearest-flip sentence + `LinkButton role="small"` "Stress test ↓" (`actions.openStress` + scroll to `stress`).
  - During rework, an extra t-meta line: "Revision 2 is being drafted. This recommendation is from rev 1."
- **§1 Financials:** Table with columns Figure 1fr | Value 120 (end) | Evidence 240. Eight 36px rows, each with `anchorId fig:<id>`. Evidence = `EvidenceTag` with `Cite`s; a click calls `actions.cite(dealId, quoted.markIds, evidence.citeIndex)`.
- **§2 Risk score and rating:**
  - `t-figure-lg` "58" + t-meta "/100" + t-body rating + `EvidenceTag` model.
  - `Meter kind="risk"` with tick 75 and caption t-meta ink-3 "Decline line · 75 (with a breach)".
  - Drivers table, no header, 32px rows: factor t-body | impact t-small in the model's driver tone.
- **§3 Peer benchmarks:** Table: Cohort 1fr | Leverage 96 end | Interest coverage 128 end | EBITDA margin 112 end. The "This deal" row is in t-strong. Then the position sentence (t-small ink-2).
- **§4 Covenant compliance** (heading suffix "· 1 of 4 breached" / "· all 4 pass"):
  - Table: Covenant 1fr | Threshold 128 | Actual 88 end | Cushion 152 (signed % t-figure + `Meter kind="cushion"`) | Status 104 (`StatusLabel`: "Pass" / "Breach" / "Pass · as amended" / "Breach · as amended").
  - At the live gate on a filed-figure package, the threshold cells of Max Total Leverage and Min Liquidity are `AmendField`s (`onCommit` → `actions.setThreshold(kind, v)`).
  - Rows carry `anchorId cov:<name>` and are `highlighted` while a linked note is hovered.
- **Revision N:**
  - The returned-note quote (t-small ink-2, “…”) + attribution in t-meta ink-3: "Reviewer · rev 1 · 14:05 · agent-drafted, edited by the reviewer".
  - Viable: a summary sentence (t-body) + a redline Table (Figure | Rev 1 | Rev N). Changed cells are `Redline`s; unchanged cells read t-small ink-3 "unchanged". Rows carry `anchorId rev<N>:<id>`.
  - No cure: `StatusLabel watch role="small"` with the `noCure` copy.

**Margin notes:** one `MarginNote` per `NoteView`. Actions:
- "Show row" → `actions.flashAnchor`.
- "Trace" → `actions.trace`.
- "Amend term" → `actions.focusAmend`.

Each action also calls `actions.markOpened(flagId)`. Hovering a note sets the local `hoverAnchor` (row highlighted); hovering an anchored row sets that note `active`.

**Exhibits / Stress / Signature rows:** these render `props.slots.exhibits`, `.stress` and `.signature` inside page cells. They are owned by `screens/decision`.

**Appendix row** ("monitoring"):
- `SectionHead` "" "Appendix · Portfolio Monitor readings".
- t-meta ink-3 "Simulated drift on the filed figures · sweep #4 · 6 s ago".
- Table: Covenant | Threshold | Actual | Cushion | Status (Pass/Watch/Breach), or `EmptyNote` "First sweep pending."

**States** (`FileView.mode`; `docBar.status` shown):

| Mode | Doc-bar status | Page |
|---|---|---|
| **not-started** | `pending` "Not started · CIM ready · 3 paragraphs" | Header (+ cancelled note) + Contents + primary "Draft memo" |
| **plan-review** | `awaiting` "Plan review · drafting starts in 6 s" / "Plan review · held" | Contents checklist + primary "Start drafting" |
| **running** | `drafting` "Drafting · Covenant compliance · step 4 of 5" + elapsed "0:06" + Stop + Go to drafting | Sections fill top-down; completed sections get stubs; notes appear as their flags land; exactly one Caret |
| **rework** (running, revision ≥ 2) | `drafting` "Drafting · Revision 2 · proposed restructure" | Signature row shows the returned record + pending line |
| **gate** | `awaiting` "Awaiting your countersignature · rev 1 · 2 notes to review · waiting 1:12" + stepper + Go to signature | No auto-scroll. Live region: "The agent is suspended at the countersignature. 2 notes to review." |
| **gate, countdown** | `awaiting` "Auto-countersign in 4 s · clean-approval policy" + Review manually | Line fill plays (§8) |
| **gate, held** | `awaiting` "Awaiting your countersignature · rev 1 · held · you left the file" (hold reason copy) | Fill removed |
| **gate, leaving** | `awaiting` "Returning for revision" | Signature block recedes |
| **sealed (live)** | `signed` "Countersigned 14:03 · rev 1" / `signed-auto` "Auto-countersigned 14:03" / `rejected` "Rejected 14:03" | Seal row. Counted notes become `signed-over`, except after a rejection, when they keep their open styling. Actions: Export file · Re-run · Open in Ledger |
| **sealed (snapshot)** | same + " · sealed in this session" | Read-only: no AmendField, Stress readonly, Ask disabled |
| **error** | `error` "Run error · drafting stopped at Covenant compliance" + Re-run | The interrupted section shows "Stopped" |
| **not found** | n/a | `EmptyNote` "This file is not in this session. Uploaded files do not survive a reload." + `LinkButton` "Back to the Desk" |

**Effects owned by the file screen:**

| Trigger | Effect |
|---|---|
| `[dealId, at, navSeq]` | `scrollIntoView` on the `.file-pagecell[data-section=at]` (smooth, or instant under reduced motion) |
| `ui.trace.tick` | Open that stub's Record, scroll the stub into view (block centre), cue `ui.trace.anchorId` |
| `ui.flash.tick` | Cue `[data-anchor]`: bump its `flashKey`; under reduced motion set `highlighted` for `CUE_HOLD_MS` |
| `ui.noteFocus.tick` | Scroll `[data-note]` into view (centre) and cue its anchor |
| `ui.amendFocus.tick` | Pass `focusTick` to the matching `AmendField` |

### 7.3 Decision blocks (`screens/decision/`: SignatureBlock, StressTest, Exhibits)

`index.tsx` exports `SignatureBlock`, `StressTest` and `Exhibits`. All three take `DecisionBlockProps { dealId }` and render inside page cells supplied by the file screen.

#### SignatureBlock (the gate; full behaviour in §8)

```
──── 1px line, 32 gap ─────────────────────────────────────────────────────────
Countersignature                                                     t-heading
↩ Rev 1 returned for revision · Reviewer · 14:05 · “…” · agent-drafted, edited   (history; t-small)
Signed over · you opened 1 of 2                                       t-label ink-3
 ⬣ Max Total Leverage 4.26x breaches the ≤ 4.00x covenant          Show note   rows 28, 1px rules
 ⚠ Fixed-charge coverage 1.18x leaves only thin headroom over the 1.10x floor   Show note
 (gap 24)
 ┌ AGENT 248 ───────────────────┐ 24 ┌ REVIEWER 1fr ─────────────────────────────┐
 │ /s/ Credit Analyst            │    │ [hit area: 40px pad + 2px accent rule]     │
 │ ─── 1px line ───────────────  │    │ ═══════════════════════════════════════════ │
 └───────────────────────────────┘    └────────────────────────────────────────────┘
 Credit Analyst (agent) · rev 1 · 14:02   Countersign here [A]      (captions: siblings)
 Auto-countersign is off. Every file waits for you.          t-meta ink-3 (policy line; Disclosure "Show checks" when on)
 Reviewer note · on the record                         Draft from notes   [agent-drafted · unedited]
 [ TextArea: "Optional to countersign. Required to return or reject." ]
 (hint, role=alert, t-small bad-ink, only when needed)
 Amended terms · Max Total Leverage ≤ 4.00x → ≤ 4.30x · as amended [APPROVE] · Revert   (only when amended)
 Countersigning concurs with the agent's ESCALATE on CAM-2026-0417 and signs over 2 notes,
 including 1 covenant breach. The memo then routes to the escalation queue for senior credit review.  t-small ink-2, max 64ch
 (gap 16)
 [ Countersign escalation  A ]   [ Return for revision  S ]   [ Reject memo  R ]
 (primary md)                    (secondary md)               (danger md)
```

- Content width 624, or 560 when the page is narrower. The lines grid is `248px 1fr`, column-gap 24.
- **Leaving:** the whole block transitions opacity 1→0.4 over `--dur-2`.
- **Sealed** content replaces the note, attestation and verbs (§8).
- **Pending** (running before the first package, or during rework): only the returned history plus t-small ink-3 "The signature opens when the memo is assembled." (or "…when revision 2 is assembled.").

#### StressTest (scratch; dashed provisional)

- **Collapsed:** a 48px block with `border: var(--line-provisional)`, radius md, padding 0 16. t-small "Stress test · scratch. Nothing here is on the record until you attach it." + secondary sm "Open".
- **Open** (padding 16 20, same frame):
  - Eyebrow "Stress test · scratch" + t-small ink-2 base label ("Base = filed figures (rev 1)" / "Base = filed figures · rev 2 proposes a restructure (see Revision 2)").
  - Right side: ghost sm "Reset to base" (disabled at base) + secondary sm "Attach as exhibit" (disabled with a reason).
  - Four driver rows: grid `140px | 1fr | 120px`. Label t-label · `Slider` · value t-figure + delta t-small (good-ink favourable, bad-ink adverse).
  - Outcome line (40px; re-keyed by `outcome.key` → `v2-enter`): t-label "Base" + `Token muted` + "→" + t-label "Stressed" + `Token` + t-small "flips · risk 58 → 53 · breaches 1 → 0" / "holds · …" / "matches the filed figures".
  - A mini covenant table with the §4 columns and no AmendField.
  - `readonly` (snapshot): no Attach; t-meta "Attach is available on the live file."
- The row is not rendered before a package exists (`rows.stress = false`).

#### Exhibits (solid, part of the memo; rendered only when ≥ 1)

- Derived from `auditHistory` entries of kind `whatif` with this file's runId, in time order.
- `SectionHead` "" "Exhibits".
- Rows (Table, no header, 48): letter (t-figure ink-3) + t-strong "Stress test" + meta (t-meta ink-3) "attached 14:04 · Reviewer", with " · attached after countersignature" when `t > decidedAt`. Detail t-small ink-2 is the entry detail verbatim ("Total debt $96.3M→$90.4M ⇒ risk 58→55, breaches 1→0"), followed by `Token muted` → `Token` + t-small "flips"/"holds".
- New rows enter with `v2-enter`.

### 7.4 Book (`#/book`, `screens/book/`)

**Purpose.** The live covenant state of every file, from the always-on Portfolio Monitor, with open items grouped under their file. It replaces V1's KPI tiles and card wall.

**Layout** (column 1040):

```
Book                                         Portfolio Monitor · every 25 s · sweep #4 · 6 s ago · next in 19 s  [Sweep now]
⬣ 2 of 3 files in breach · 3 covenants need review · 1 memo awaiting senior hand-off           (StatusLabel strong)
Figures are simulated drift on each file's filed figures.                                        t-meta ink-3
┌ Table (stackBelow 760) ──────────────────────────────────────────────────────────────────────┐
│ File 1fr | Status 104 | Tightest covenant 240 | Cushion 136 end | Tests 128 end (hideBelow 760) | Risk 56 end (hideBelow 760) | Checked 64 end (hideBelow 760) │
│ Project Cobalt        ⬣ Breach   Max Total Leverage           −42.8% ▬|   0 of 4 pass   84   #4 │ row 48
│ Cobalt Resources…                5.71x / ≤ 4.00x                                                 │
│   ⬣ Breach  Max Total Leverage  5.71x / ≤ 4.00x  1.71x over  raised 2 m ago        [Acknowledge] │ span rows 36, indent
│   ⬣ Breach  Min Liquidity  $5.9M / ≥ $10.0M  $4.1M short  raised 2 m ago           [Acknowledge] │
│ Project Atlas  …                                                                                │
│   ✎ From your countersignature · CAM-2026-0417 routed for senior credit review · 14:03           │
│                                              Open record   [Mark handed off]                    │
│ Project Meridian      ✓ Pass   Max Total Leverage 2.75x / ≤ 4.00x  +31.3%  4 of 4 pass  27  #4  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Rows** come from `monitor.portfolio`, sorted breach → watch → healthy, then by the oldest open item.
- **Tightest covenant** = the covenant with the **minimum signed cushion** (`cushionOf`).
- **Tests** = "n of 4 pass", where watch counts as passing, plus " · 1 on watch" when any are on watch.

**Sub-rows:** `Table` rows with `span` + `indent: true`, height 36, built from the deal's escalations with status `open` or `acknowledged`. The screen lays out the span content with its own `.book-subrow` grid.
- **Live figures:** read `portfolio[dealId].covenants` by `item.covenant`, falling back to `item.actual`/`item.threshold`. Never parse the reason sentence.
- **Monitor items:** ghost sm "Acknowledge" → `actions.acknowledge(id)`. Afterwards the row is `muted` with `StatusLabel acknowledged` "Acknowledged 14:05".
- **Countersign items:** `LinkButton` "Open record" (→ `?at=signature`) + secondary sm **"Mark handed off"** → `actions.markHandedOff(id)` (calls `monitor.acknowledge`). Afterwards: "Marked handed off to senior review · 14:05". Nothing is sent anywhere; the label says exactly what happened.
- Resolved items are hidden; the deal's file cell adds t-meta "2 resolved".
- A deal row click opens `#/file/<id>?at=monitoring`.

**Cadence:**
- t-small ink-2 "Portfolio Monitor · every 25 s · sweep #4 · 6 s ago · next in 19 s".
- The tail reads "· next due" when overdue. The interval follows speed ("every 13 s" at 2×). While sweeping it reads "Portfolio Monitor · re-testing · sweep #5" (static text).
- secondary sm "Sweep now" → `actions.sweepNow`, disabled while sweeping.
- The Book has **no primary**.

**States:**
- Before the first sweep: `EmptyNote` "The Portfolio Monitor runs its first sweep in a moment."
- All clear: `pass` "All 3 files within covenants · last checked sweep #4, 6 s ago".
- Watch only: `watch` "1 file on watch · thin headroom on 2 covenants".
- Breach: as drawn.
- While sweeping, rows keep their last values.

### 7.5 Ledger (`#/ledger`, `screens/ledger/`)

**Purpose.** Every event of the session, grouped by file and then run, with an actor column and the human decision pinned first. It replaces V1's flat AuditView and absorbs the Agents roster's attribution job.

**Layout** (column 1040):

```
Ledger                                                                  [Export session (JSON)]   (primary md, the only primary)
Every event this session, by file and run · 64 events · 3 runs · 2 reviewer decisions · 1 policy decision   t-small ink-2
Earlier runs keep their event trail; the drafted memo is kept for the latest decided run of each file.        t-meta ink-3
[ All 64 ] [ Reviewer 6 ] [ Policy 1 ] [ Flags 9 ] [ Exhibits 1 ] [ Portfolio Monitor 12 ]       FilterChips
Project Atlas · CAM-2026-0417                                                                    t-heading
┌ group 40 (toggle): ▾ ✎ Run 2 · Countersigned as amended · concurs ESCALATE · 14 events · 12.4 s · 14:03   [Open file] ┐
│ span (pinned decision, paper, padding 12 16): 14:03:12 · Reviewer · Countersigned as amended                          │
│   “Waiver agreed with sponsor at 4.30x.” · authored by the reviewer                                                 │
│   Max Total Leverage covenant  ≤ 4.00x → ≤ 4.30x  (Redline)                                                         │
│   suspended 1:12 before countersignature · notes opened 1 of 2 · signed over 1 note                                 │
│ 14:02:58 │ Credit Analyst │ Suspended at countersignature · rev 1      recommendation escalate     rows 36: 72 | 168 | 1fr │
│ 14:02:57 │ Credit Analyst │ Flag · Breach   Max Total Leverage 4.26x breaches the ≤ 4.00x covenant …              │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
 ▸ Run 1 · Returned for revision … (collapsed)
Portfolio Monitor                                                                                   t-heading
 rows: 14:01:04 │ Portfolio Monitor │ Raised · Project Cobalt · Breach · Max Total Leverage 5.71x / ≤ 4.00x
```

**Structure:**
- One `Table` per file (`stackBelow: 760`).
- Runs come from `agent.runs` + `auditHistory` grouped by `runId`; the dealId comes from the RunRecord. Events are oldest → newest.
- The latest run per file is expanded; older runs are collapsed. Toggling uses `actions.toggleLedgerGroup(key)`.
- A row click expands a key/value grid (Event id, ISO time, Actor, Kind, File, Run, Raw label, Detail) + `CopyButton` "Copy JSON", using `detail` + `onActivate`.
- **Actor cell:** a 14px icon + t-label. Icons: Credit Analyst `FileSearch`, Reviewer `User`, Policy `ShieldCheck`, Portfolio Monitor `Activity`. The Reviewer is ink; agents are ink-2.
- **FilterChips** (`ui.ledgerChip`): All · Reviewer · Policy · Flags · Exhibits · Portfolio Monitor, each with a count. They filter rows; runs with no matching rows hide.
- **`?file=` filter:** only that file, plus `LinkButton` "Show all files".
- **The Portfolio Monitor group** renders from `monitorLog` (append-only), never from live escalation objects.

**States:**
- Empty: `EmptyNote` "Nothing on the record yet. Draft a memo to start the trail."
- A live run header shows `drafting` "In progress" or `awaiting` "Awaiting your countersignature".
- A cancelled run shows `cancelled` "Run cancelled · reset before a decision", with the detail from its own "Run cancelled" audit entry.
- A filter with no rows: `EmptyNote` "No events match this filter."

**Export session** → `actions.exportSession()`.

### 7.6 Keyboard map (implemented once in `state/shortcuts.ts`)

**Global guards for every single-key shortcut:**
- no meta, ctrl or alt;
- focus is not in an input, textarea, select or contenteditable;
- the palette is closed;
- `gate.leaving` is false.

| Key | Desk | Book | Ledger | File route (non-live or not at gate) | Live file at the gate |
|---|---|---|---|---|---|
| ⌘K / Ctrl K | toggle palette | toggle palette | toggle palette | toggle palette | toggle palette |
| ⌘↵ / Ctrl ↵ | if `plan_review` is live: approve the plan as edited | same | same | approve plan if live; else if `FileView.primary` = draft and not parsing: `startFile(dealId)` | approve plan if live (n/a) |
| A | none | none | none | none | `requestSign('key')` (two-phase) |
| S | none | none | none | none | `tryRework()` |
| R | none | none | none | none | `tryReject()` |
| J / K | none | none | none | next / previous counted note | next / previous counted note |
| `[` | none | none | none | toggle source | toggle source |
| Esc | close palette | close palette | close palette | palette → open menus (kit) → confirm strip → source overlay → clear cites | same |

---

## 8. The signature interaction: sign at the foot

**What it is.** The countersignature line is the product's name made physical. It occurs once per revision. The suspended Promise *is* the empty 2px teal line. Apart from the keyboard focus ring and the palette's active row, it is the only 2px teal stroke on screen. It replaces V1's rotating seam, glow, gradient wash and stamp ring.

**Anatomy:**
- **Agent line:** "/s/ Credit Analyst" (t-strong) on a 1px `--line` rule. Caption "Credit Analyst (agent) · rev 1 · 14:02", where the time comes from the latest "Awaiting human approval" audit entry. On a restructure revision: "Credit Analyst (agent) · rev 2 · Structuring Engine proposal · 14:06".
- **Reviewer line:** the hit area is the 40px pad + 2px accent rule. The caption (a sibling) is "Countersign here" + `Kbd` "A".

**Triggers.** Signing happens only on the live file at the gate, via:
- **A** (guards in §7.6);
- the primary button;
- a click or Enter on the open hit area;
- the doc bar's "Go to signature";
- palette "Countersign".

All of them call `actions.requestSign(source)`.

**Two-phase.** `requestSign` reads the registered line element and the bottom of the `[data-docbar]` element.
- **Phase one (nothing is signed)** applies when the user is not on this file's route, or `rect.top < docbarBottom` or `rect.bottom > window.innerHeight`, or the source is `'button'` from Go to signature:
  1. Navigate to `#/file/<live>?at=signature` if needed.
  2. `scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' })`.
  3. Focus the hit area.
- **Phase two:** the line is visible and the source is key, line, primary or palette. Sign with the **live draft** (note, provenance, amendments) and clear any countdown. Manual signing always wins over a countdown.

**On sign (manual approve).** About 920ms in total. The engine is called at t=0, so the record is truthful immediately.
1. **t=0:**
   - `agent.approve(note || undefined, { amendments, provenance })`.
   - Set `gate.justSigned = { runId, verb: 'approve', auto: false, at: Date.now(), presented }`, where `presented` = { attestation, primaryLabel, signedOver, notesOpened, keyFigures }.
   - `run_finished` reduces, status becomes `approved`, and the file view is sealed in the same render cycle.
2. **0–600ms:** the ink path draws left→right in the reviewer pad (`v2-ink`, `--dur-3`). This happens only when `ink === 'animate'`, which the model sets when `justSigned.runId === file.runId && verb === 'approve' && !auto && now − at < INK_REPLAY_WINDOW_MS (2000)`. Any later render shows static ink.
3. **t=600:** the rule recolours accent → ink and thins 2px → 1px (`--dur-1`, delay `--dur-3`). The caption swaps to "Countersigned · concurs ESCALATE · Reviewer · 17 Oct 2026, 14:03" (time = `agent.decidedAt`).
4. **600–920ms:** the sealed record enters (`v2-enter` with `animation-delay: var(--dur-3)`; CSS only, no JS timer): the quoted note + provenance, the amendment redlines and the routed line. At the same time:
   - the seal row appears;
   - the doc bar switches;
   - counted notes become `signed-over`;
   - for a routed ESCALATE, "Routed to the Book for senior credit review · " + `LinkButton` "Open in Book" appears;
   - the live region announces "Countersigned by the reviewer at 14:03."

**Variants on the same line:**
- **As amended:** the same ink. Caption: "Countersigned as amended · approves on your amended terms · Reviewer · 17 Oct 2026, 14:03". Amendments print under the line as redlines.
- **Auto (policy).** While `policy.armed`:
  - The caption reads "Auto-countersign in 5 s · clean-approval policy · " + `LinkButton` "Review manually". The numeral ticks with `s.now`. The doc bar shows the same countdown.
  - A 2px ink-3 fill grows across the line (`v2-fill`, `fillMs = AUTO_COUNTDOWN_MS`, linear, one-shot). It is hidden under reduced motion.
  - At the deadline the state re-checks every arming condition, then calls `agent.approve(AUTO_NOTE, { auto: true })`.
  - The pad then shows "/auto/ clean-approval policy" in t-strong ink-2 with **no ink**.
  - The caption becomes "Auto-countersigned · clean-approval policy · 17 Oct 2026, 14:03", with the 4 checks listed (all ✓). The note provenance reads "written by the clean-approval policy".
  - **Holds** remove the fill and set the caption from `holdReason`:

    | Hold trigger | Reason | Caption |
    |---|---|---|
    | typing in the note; Draft from notes; any AmendField commit; R or S (even with an empty note) | `engaged` | "Held · you started reviewing" |
    | Review manually | `manual` | "Held · review manually" |
    | leaving the live file's route while armed | `left` | "Held · you left the file" |
    | the tab becoming hidden while armed | `hidden` | "Held · the tab was hidden" |
    | switching the policy off | `policy-off` | "Held · auto-countersign switched off" |

    A hold lasts until the package changes (`pkgKey`).
- **Reject** (R / "Reject memo"; note required): no ink. `Token tone=bad` "REJECTED" centred on a 1px bad-ink rule (`v2-enter`). Caption "Rejected · Reviewer · 14:03". The reason is quoted beneath with its provenance.
- **Return for revision** (S; note required):
  - The line stays empty and `gate.leaving = true`. The block recedes (opacity 1→0.4).
  - After `cssMs('--dur-2')` (0 under reduced motion), `agent.requestRework(note, provenance)` runs and `leaving` resets.
  - The block compacts to the history record "↩ Rev 1 returned for revision · Reviewer · 14:05 · “…” · agent-drafted, edited".
  - A fresh block with a fresh teal line opens when rev 2's package lands.

**Guards** (ported from V1, plus additions):
- A, R, S, the palette and all verb buttons are dead while `gate.leaving`, or while `justSigned?.runId === agent.runId`.
- Every refusal attempt calls `holdAuto('engaged')` first, so a countdown can never fire through a refusal.
- No live verbs render before `awaiting_approval`.
- **Need-note:** R or S with an empty note sets `needNote` and bumps `focusTick` (TextArea invalid recipe). The hint reads "A reason is required to reject. It goes on the record." or "A reason is required to return for revision. It goes on the record."

**Reduced motion:** the ink, collapse and recede are instant, the fill is hidden (numerals only), and the scroll is instant.

**Why this is the one signature:** it is the product's name; it is rare by construction; it is an interaction; and it resolves the human-in-the-loop promise. Trace-to-source and cites stay quiet grammar, and flip zones stay inside the dashed scratch block.

---

## 9. Data layer

### 9.1 Store and state (`src/v2/state/*`, shell-owned)

`state/store.tsx` exports `V2Provider` and `useV2()`.
- `V2Provider` calls `useCreditAgent()` and `useMonitor(agent.dealsFull, agent.speed)` **exactly once**, owns all V2 state, runs `effects.ts` and `shortcuts.ts`, and exposes one `V2Store`.
- `modKey` is computed here (`/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'`), never in the model.

```ts
// state/store.tsx
import type { ReactNode } from 'react';
import type { CreditAgentApi, StepView, RunDecision } from '../../hooks/useCreditAgent';
import type { MonitorApi } from '../../hooks/useMonitor';
import type { Amendment, ApprovalPackage, NoteProvenance, PlanStep } from '../../agent/types';
import type { Deal } from '../../agent/mockData';
import type { DriverKey, Scenario } from '../../agent/whatif';
import type { Route } from './route';

export type Policy = 'gate' | 'auto';
export type HoldReason = 'engaged' | 'manual' | 'left' | 'hidden' | 'policy-off';
export type LedgerChip = 'all' | 'reviewer' | 'policy' | 'flags' | 'exhibits' | 'monitor';

export interface PresentedAtSign {
  attestation: string | null; primaryLabel: string | null;
  signedOver: string[]; notesOpened: { opened: number; total: number };
  keyFigures: { label: string; value: string }[];
}
export interface CaseFileSnapshot {
  dealId: string; runId: number; deal: Deal;
  plan: PlanStep[]; steps: StepView[]; pkg: ApprovalPackage;
  outcome: 'approve' | 'reject'; decision: RunDecision;
  note: string | null; noteProvenance: NoteProvenance | null; amendments: Amendment[] | null; auto: boolean;
  startedAt: number; awaitingAt: number | null; decidedAt: number;
  routed: boolean;                 // countersigned ESCALATE raised into the monitor queue
  presented: PresentedAtSign | null;
}                                  // events always come from auditHistory filtered by runId
export interface GateState {
  pkgKey: string | null;           // `${runId}:${revision}` the draft belongs to
  note: string;
  insertedDraft: string | null;
  needNote: 'reject' | 'rework' | null;
  levMax: number | null;           // amended Max Total Leverage ceiling (null = as filed)
  liqMin: number | null;           // amended Min Liquidity floor (null = as filed)
  held: boolean; holdReason: HoldReason | null;   // survives route changes until pkgKey changes
  autoDeadline: number | null;
  leaving: boolean;
  opened: string[];                // flag ids opened by explicit actions
  focusTick: number;               // focus the note field
  justSigned: { runId: number; verb: 'approve' | 'reject'; auto: boolean; at: number; presented: PresentedAtSign } | null;
}
export interface PlanState {
  enabledIds: string[]; held: boolean; holdReason: 'manual' | 'left' | 'hidden' | null; deadline: number | null;
}
export interface MonitorLogEntry {
  id: string;                      // `${escalationId}:${kind}:${severity}` (dedupe key)
  escalationId: string; kind: 'raised' | 'upgraded' | 'acknowledged' | 'resolved'; reraised: boolean;
  at: number; dealId: string; dealName: string; origin: 'monitor' | 'countersign';
  covenant: string | null; severity: 'warning' | 'critical'; reason: string; actual: string | null; threshold: string | null;
}
export interface UiState {
  sourceOpen: boolean;
  cites: { dealId: string; markIds: string[]; index: number } | null;
  trace: { stepId: string; anchorId: string | null; tick: number } | null;
  flash: { anchorId: string; tick: number } | null;
  noteFocus: { noteId: string; tick: number } | null;
  noteCursor: number;              // -1 = none yet
  amendFocus: { kind: 'leverage' | 'liquidity'; tick: number } | null;
  showReasoning: boolean;          // persisted 'v2.showReasoning'
  confirm: { kind: 'start'; dealId: string } | { kind: 'stop' } | null;
  paletteOpen: boolean;
  ledgerOpen: Record<string, boolean>;
  ledgerChip: LedgerChip;
  stress: Record<string, { open: boolean; scenario: Scenario }>;   // keyed by dealId
  attached: Record<number, string[]>;                              // stressRecord keys attached, per runId
  thread: { id: string; runId: number; role: 'you' | 'answer'; text: string; at: number }[];  // local intercepts; at = agent.messages.length when added
  parsingSince: number | null;
  pendingUploadOpen: boolean;      // navigate to the new file when parsing ends
  announce: string | null;
}
export interface V2Actions {
  navigate(to: Route): void;
  setPolicy(p: Policy): void;                  // switching off while armed → holdAuto('policy-off')
  setSpeed(n: number): void;
  startFile(dealId: string): void;             // no-op while parsing; confirm if ANY run is live; else agent.start + navigate
  confirmStart(): void;
  requestStop(): void;                         // opens the stop confirm
  confirmStop(): void;                         // agent.reset()
  cancelConfirm(): void;
  upload(file: File): void;                    // agent.uploadDeal + parsingSince + pendingUploadOpen
  togglePlanStep(stepId: string): void;        // also holds the plan countdown ('manual')
  holdPlan(): void;
  approvePlan(): void;                         // agent.approvePlan(plan.enabledIds)
  cancelPlan(): void;                          // agent.cancelPlan()
  setNote(text: string): void;                 // holdAuto('engaged'); clears needNote when non-empty; insertedDraft = null when cleared
  insertDraft(): void;                         // note = draftNoteFor(pkg); insertedDraft = that; holdAuto('engaged')
  setThreshold(kind: 'leverage' | 'liquidity', v: number | null): void;  // holdAuto('engaged'); v equal to filed → null
  revertAmendments(): void;
  requestSign(source: 'key' | 'button' | 'line' | 'palette'): void;     // two-phase (§8)
  tryReject(): void;
  tryRework(): void;
  reviewManually(): void;                      // holdAuto('manual')
  registerSignatureLine(el: HTMLElement | null): void;
  markOpened(flagId: string): void;
  openSource(): void; closeSource(): void; toggleSource(): void;
  cite(dealId: string, markIds: string[], startIndex: number): void;   // opens the source
  citeStep(delta: 1 | -1): void;
  clearCites(): void;
  trace(stepId: string, anchorId: string | null): void;
  flashAnchor(anchorId: string): void;
  focusNote(delta: 1 | -1): void;              // stepper / J K; marks opened
  focusNoteById(noteId: string): void;         // "Show note" in Signed over; marks opened
  focusAmend(kind: 'leverage' | 'liquidity'): void;
  setShowReasoning(v: boolean): void;
  openStress(dealId: string): void;
  closeStress(dealId: string): void;
  setDriver(dealId: string, key: DriverKey, v: number): void;
  resetStress(dealId: string): void;
  attachStress(dealId: string): void;          // live only: agent.logWhatIf(label, detail) + attached[runId].push(key)
  ask(dealId: string, text: string): void;     // askRoute → local entry pair in ui.thread, or agent.sendMessage
  sweepNow(): void;
  acknowledge(id: string): void;               // monitor.acknowledge
  markHandedOff(id: string): void;             // monitor.acknowledge on a countersign-origin item
  exportFile(dealId: string): void;
  exportSession(): void;
  setPaletteOpen(v: boolean): void;
  toggleLedgerGroup(key: string): void;
  setLedgerChip(c: LedgerChip): void;
}
export interface V2Store {
  agent: CreditAgentApi;
  monitor: MonitorApi;
  route: Route;
  navSeq: number;
  now: number;                     // Date.now(), refreshed by ONE 1000ms interval
  reducedMotion: boolean;          // matchMedia('(prefers-reduced-motion: reduce)'), live
  tabVisible: boolean;             // document.visibilityState === 'visible', live
  modKey: string;                  // '⌘' or 'Ctrl'
  policy: Policy;                  // persisted 'v2.autonomy' (V1 used 'autonomy')
  plan: PlanState;
  gate: GateState;
  snapshots: Record<string, CaseFileSnapshot>;   // latest sealed run per dealId
  snapshotList: CaseFileSnapshot[];              // every sealed run, for export
  monitorLog: MonitorLogEntry[];                 // append-only
  ui: UiState;
  actions: V2Actions;
}
export function V2Provider(props: { children: ReactNode }) { /* … */ }
export function useV2(): V2Store { /* … */ }
```

**Other `state/` files:**

| File | Contents |
|---|---|
| `route.ts` | Router (§2) |
| `plan.ts` | Plan countdown and draft |
| `gate.ts` | Gate draft, verbs, policy countdown, holds |
| `files.ts` | Snapshot capture, the `download(filename, payload)` helper (Blob + programmatic anchor click, not JSX) |
| `monitorLog.ts` | Escalation diffing |
| `ui.ts` | UiState, actions, `cssMs(name)` |
| `effects.ts` | Routing, upload auto-open, tab title, routing of countersigned ESCALATE, dev probes, announcements |
| `shortcuts.ts` | §7.6 |
| `commands.ts` | Maps model `CommandAction` → actions |
| `screens.ts` | Screen props |

```ts
// state/screens.ts
import type { ReactNode } from 'react';
import type { FileAt } from './route';
export interface FileScreenProps { dealId: string; at: FileAt | null; navSeq: number; slots: { exhibits: ReactNode; stress: ReactNode; signature: ReactNode } }
export interface DecisionBlockProps { dealId: string }
export interface LedgerScreenProps { fileFilter: string | null }
// DeskScreen and BookScreen take no props.
```

**`App.tsx` composition:**

```tsx
<V2Provider>
  <div className="app-shell">
    <TopBar/>
    <main>
      {route desk → <DeskScreen/>}
      {route file → <FileScreen dealId at navSeq slots={{ exhibits: <Exhibits dealId/>, stress: <StressTest dealId/>, signature: <SignatureBlock dealId/> }}/>}
      {route book → <BookScreen/>}
      {route ledger → <LedgerScreen fileFilter={route.file}/>}
    </main>
    <AppPalette/>
    <LiveRegion message={ui.announce}/>
  </div>
</V2Provider>
```

**Stub index files.** Screen owners create these as their **first commit**, verbatim, so that tsc passes while they build. The shell publishes the props interfaces but never writes in screen folders.

```tsx
// src/v2/screens/desk/index.tsx    (+ empty desk.css)
import './desk.css';
export function DeskScreen() { return null; }
// src/v2/screens/book/index.tsx    (+ empty book.css)
import './book.css';
export function BookScreen() { return null; }
// src/v2/screens/ledger/index.tsx  (+ empty ledger.css)
import './ledger.css';
import type { LedgerScreenProps } from '../../state/screens';
export function LedgerScreen(_props: LedgerScreenProps) { return null; }
// src/v2/screens/file/index.tsx    (+ empty file.css)
import './file.css';
import type { FileScreenProps } from '../../state/screens';
export function FileScreen(_props: FileScreenProps) { return null; }
// src/v2/screens/decision/index.tsx (+ empty decision.css)
import './decision.css';
import type { DecisionBlockProps } from '../../state/screens';
export function SignatureBlock(_props: DecisionBlockProps) { return null; }
export function StressTest(_props: DecisionBlockProps) { return null; }
export function Exhibits(_props: DecisionBlockProps) { return null; }
```

### 9.2 Orchestration ported from V1 `App.tsx` (faithful, with every integrity guard)

**The live file (fixes the upload race).** `selectLiveDealId(s)`:
- `idle` → `null`.
- `plan_review` → `agent.selectedDealId` (`start(dealId)` sets it synchronously).
- Otherwise → `agent.runs.find(r => r.runId === agent.runId)?.dealId ?? agent.selectedDealId`.

No V2 code reads `selectedDealId` to decide liveness anywhere else.

1. **Plan review (intent gate):**
   - When `agent.status` becomes `plan_review`: `enabledIds = agent.plan.map(p => p.id)`, `held = false`, `deadline = null`.
   - **Arming:** while `held === false`, the route is the live file and `tabVisible`, set `deadline = now + PLAN_COUNTDOWN_S(speed) * 1000`, where `PLAN_COUNTDOWN_S = max(3, round(7/speed))`.
   - Leaving the route while armed → `held = true, holdReason = 'left'`. The tab becoming hidden while armed → `'hidden'`.
   - Toggling a step or Hold → `held = true, holdReason = 'manual', deadline = null`.
   - At the deadline (a `setTimeout` to the deadline, cleaned up on change): re-check the arming conditions, then call `agent.approvePlan([...enabledIds], { auto: true })`. The engine records "Plan auto-started · unattended countdown".
   - ⌘↵, the palette and the primary call `agent.approvePlan(enabledIds)`, approving the plan **as edited**.
   - When status leaves `plan_review`, reset everything. The state is lifted, so route switches never re-check a step.
2. **Gate draft:**
   - When `awaiting_approval` arrives with a new `pkgKey`, reset: note, insertedDraft, needNote, levMax, liqMin, held=false, holdReason=null, autoDeadline=null, opened, focusTick.
   - **Provenance (derived):**
     - empty note → `undefined`;
     - `insertedDraft === null` → `'authored'`;
     - `note.trim() === insertedDraft.trim()` → `'drafted-verbatim'`;
     - otherwise `'drafted-edited'`.
   - Clearing the note resets `insertedDraft = null`.
3. **Auto-countersign policy:**
   - `eligible` = `policy === 'auto'` && status `awaiting_approval` && `pkg.recommendation === 'approve'` && `pkg.flags.length === 0` && `pkg.revision === 1` && every `pkg.keyMetrics[i].confidence >= 0.9`. This is V1's rule unchanged.
   - `armed` = `eligible && !gate.held && route is the live file && tabVisible && !gate.leaving && !gate.justSigned`.
   - When armed and `autoDeadline === null`: set `now + AUTO_COUNTDOWN_MS` (5000).
   - When armed turns false while a deadline exists:
     - route left → `holdAuto('left')`;
     - tab hidden → `holdAuto('hidden')`;
     - policy off → `holdAuto('policy-off')`;
     - otherwise clear the deadline.
   - At the deadline, if still armed: `agent.approve(AUTO_NOTE, { auto: true })` + `justSigned` (auto).
   - `holdAuto(reason)` sets `held = true, holdReason = reason, autoDeadline = null`.
   - **A refusal can never auto-approve, and no countdown completes off screen.**
4. **Verbs:**
   - `tryReject`: `holdAuto('engaged')`. An empty note → `needNote='reject'`, `focusTick++`. Otherwise `agent.reject(note, provenance)` + `justSigned(reject)`.
   - `tryRework`: `holdAuto('engaged')`. Empty → `needNote='rework'`. Otherwise `leaving=true`; after `cssMs('--dur-2')`, call `agent.requestRework(note, provenance)` and set `leaving=false`.
   - Every verb is a no-op while `leaving` or when `justSigned?.runId === agent.runId`.
5. **Countersigned ESCALATE routing** (effect on status → `approved`):
   - Proceed only if `pkg.recommendation === 'escalate'` and the decision is not auto.
   - Compute `overrides = overridesFromAmendments(agent.decisionAmendments)`, which parses the recorded `to` values ("≤ 4.30x" → `leverageMax 4.3`, "≥ $8.0M" → `liquidityMin 8`). The record is the source; there is no gate state read after the seal.
   - If amendments exist **and** `amendedOutcome(deal, overrides).recommendation === 'approve'`, do **not** route: the amendment resolved the escalation. This is a refinement of V1, which skipped routing for any amendment; V2 still routes an amended memo whose amended outcome remains escalate.
   - Otherwise raise (deduped forever by the hook's `raisedKeysRef`; the effect is also keyed by runId):

     ```ts
     monitor.raise({ key: `${dealId}:countersign-escalate:run${runId}`, dealId, dealName, severity: 'warning',
       reason: `Memo ${memoId} countersigned as ESCALATE · routed for senior credit review`, origin: 'countersign' })
     ```

6. **Snapshot capture:** when status becomes `approved` or `rejected`, capture once per runId into `snapshots[dealId]` and `snapshotList`:
   - `startedAt` from the RunRecord;
   - `awaitingAt` = the latest `auditHistory` entry of this run whose label starts with "Awaiting human approval";
   - `decidedAt` = `agent.decidedAt`;
   - `presented` = `gate.justSigned?.presented` when the runId matches;
   - `routed` computed as in step 5.
7. **Hygiene:** clear `ui.cites`, `ui.trace`, `ui.noteCursor`, `ui.confirm` and the local `ui.thread` when `agent.runId` changes or the route's dealId changes (the V1 stale-trace fix).
8. **Upload auto-open:** when `pendingUploadOpen` is set and `agent.parsing` goes non-null → null, navigate to the newest uploaded deal **only if** the route is still `desk`. Then clear the flag and `parsingSince`.
9. **startFile:**
   - If `agent.parsing`: no-op. Every start control is already disabled with "Extraction in progress · <name>".
   - Else, if any run is live (`plan_review` | `running` | `awaiting_approval`), including on the same file: `ui.confirm = { kind: 'start', dealId }`.
   - Otherwise `agent.start(dealId)` + navigate to the file.
   - `confirmStart()` performs the start and clears the confirm.
   - Palette start-file navigates to `#/file/<id>` first.
   - **V2 never calls `selectDeal`** (C18).
10. **Stop:** `requestStop()` opens `ui.confirm = { kind: 'stop' }`. `confirmStop()` calls `agent.reset()`, which the engine records as "Run cancelled · reset before a decision".
11. **Tab title and dev probes** (`import.meta.env.DEV` only, on route/status change, app routes only). They `console.error` when:
    - more than one visible `.k-btn--primary` exists;
    - `document.getAnimations().filter(a => a.effect?.getTiming().iterations === Infinity).length > 1`;
    - a key figure's value differs from its FigureRow (§9.4).
12. **Monitor log** (`monitorLog.ts`): on every change of `monitor.escalations`, diff against a ref of the previous list by id and append:
    - `raised` (new id; `reraised: true` when another item with the same key exists acknowledged);
    - `upgraded` (severity rank rose);
    - `acknowledged` (status → acknowledged, at = acknowledgedAt);
    - `resolved` (status → resolved, at = resolvedAt).

    Each entry copies the reading at that moment. Entries are deduped by `id` inside a functional setState, so StrictMode double effects append nothing twice.
13. **StrictMode safety:** every effect is idempotent, timers are cleaned up, routing is deduped by key, snapshot capture is keyed by runId, and `justSigned` is set in actions, never in effects.

**Persistence** (localStorage, every access in try/catch, only in `src/v2/state/`):
- `v2.autonomy` (`'gate'` default, `'auto'`)
- `v2.showReasoning` (`'0'` default, `'1'`)

Nothing else is persisted.

### 9.3 Hook fields consumed per screen (all through model selectors)

| Screen | `useCreditAgent` | `useMonitor` | V2 state |
|---|---|---|---|
| Top bar | status, speed, setSpeed, runs, runId, selectedDealId | escalations | policy, route, modKey |
| Desk | status, selectedDealId, dealsFull, deals, runs, runId, approvalPackage, parsing, plan, steps, auditHistory | none | snapshots, plan, gate, ui.confirm, ui.parsingSince, now |
| Case file | status, selectedDealId, dealsFull, plan, steps, approvalPackage, auditHistory, runs, runId, decision* fields, decidedAt, messages, parsing | portfolio, lastSweepAt, sweepCount | snapshots, plan, gate, ui, now, reducedMotion, modKey |
| Decision blocks | approvalPackage, status, decision*, decidedAt, runId, runs, auditHistory, dealsFull | none (routing via effect) | gate, policy, ui.stress, ui.attached, snapshots, now, reducedMotion |
| Book | dealsFull | portfolio, escalations, sweeping, lastSweepAt, nextSweepAt, sweepCount | now, speed |
| Ledger | auditHistory, runs, status, runId | none (reads monitorLog) | monitorLog, snapshots, ui.ledgerOpen, ui.ledgerChip, now |
| Kit page | none | none | none (model fixtures and formatters only) |

### 9.4 `src/v2/model/`: the single source of every derived fact, label, number and sentence

It is one module, imported as `../../model` through `src/v2/model/index.ts`, and split into files so the shell can stage it. Shell-owned.

**Rules:**
- Pure functions only: no React and no DOM (no `navigator`, no `document`).
- `src/v2/model/` is the only place allowed `toFixed`, `toLocale*`, `new Date`, `Intl`, `.toUpperCase()` and the agent token words (C10, C15).
- It re-exports `fmtX`, `fmtM`, `fmtPct` and `fmtDuration` from `../../agent/format`.
- Split engine strings on the em dash with `const EM = String.fromCharCode(0x2014)`. The minus sign is `String.fromCharCode(0x2212)`. Literal em dashes are banned in V2 source.

| File | Contents |
|---|---|
| `model/types.ts` | Every view type below (stage 1) |
| `model/fixtures.ts` | Fixture views for every selector from Appendix A (stage 1); also used by the kit page |
| `model/vocab.ts` | `STATUS_WORD`, `tokenOf`, `VERB_WORD`, actors, copy constants, the driver tone table |
| `model/format.ts` | All formatters |
| `model/flags.ts` | `classifyFlag`, `isCounted`, `flagClause`, `anchorFor`, `sectionOfStep` |
| `model/evidence.ts` | `paragraphsOf`, `evidenceFor`, `cushionOf`, `distanceOf` |
| `model/flip.ts` | `nearestFlip`, `stressZones` (the shared bisection) |
| `model/select-*.ts` | `select-top.ts`, `select-desk.ts`, `select-file.ts`, `select-decision.ts`, `select-book.ts`, `select-ledger.ts`, `select-commands.ts` |
| `model/exports.ts` | `buildFileExport`, `buildSessionExport` |
| `model/index.ts` | The barrel. In stage 1 it exports stub selectors returning fixtures; stage 2 swaps in real ones with identical signatures |

```ts
// ---- constants (vocab.ts)
export const AUTO_COUNTDOWN_MS = 5000;       // policy, not motion
export const INK_REPLAY_WINDOW_MS = 2000;
export const CUE_HOLD_MS = 1200;             // reduced-motion static highlight
export function PLAN_COUNTDOWN_S(speed: number): number;   // max(3, round(7/speed))
export const AUTO_NOTE = 'Auto-countersigned · clean-approval policy (recommendation APPROVE, zero flags, every key figure at 90% confidence or above)';
export const DRIVER_TONE: { match: RegExp; tone: 'good' | 'warn' | 'bad' | 'ink-2' }[];
//  /severe|high/ → bad · /moderate/ → warn · /favorable|strong/ → good · otherwise (e.g. 'low') → ink-2

// ---- formatters (format.ts)
export { fmtX, fmtM, fmtPct, fmtDuration } from '../../agent/format';
export function fmtSigned(n: number, unit: 'pct' | 'x' | 'usd'): string;  // '+5.0%' '−6.5%' '+0.26x' '−$5.9M' (U+2212)
export function fmtClock(t: number): string;     // '14:03:12' (24h, local)
export function fmtHM(t: number): string;        // '14:03'
export function fmtStamp(t: number): string;     // '17 Oct 2026, 14:03'
export function fmtIso(t: number): string;
export function fmtElapsed(ms: number): string;  // '0:07' '1:12' '12:04'
export function fmtAgo(ms: number): string;      // <5 s 'just now' · '6 s ago' · '2 m ago' · '1 h ago'
export function fmtConf(c: number): string;      // '94%'
export function fmtSeconds(ms: number): string;  // '25 s'
export function fmtCountdown(deadline: number, now: number): string;  // '4 s' (ceil, never below 0)
export function fmtRatio(n: number): string;     // '4.98:1'
export function contrastRatio(a: string, b: string): number;   // WCAG, kit token sheet
export function sessionFilename(t: number): string;            // 'countersign-session-20261017-1403.json'
export function fileFilename(memoId: string): string;          // 'CAM-2026-0417-record.json'

// ---- vocabulary (vocab.ts)
export const STATUS_WORD: Record<StatusKey, string>;            // §5
export function tokenOf(rec: Recommendation | 'rejected'): TokenView;  // APPROVE/good, ESCALATE/warn, DECLINE/bad, REJECTED/bad
export type Verb = 'countersigned' | 'countersigned-amended' | 'auto-countersigned' | 'returned' | 'rejected' | 'cancelled';
export const VERB_WORD: Record<Verb, string>;
export type Actor = 'Credit Analyst' | 'Reviewer' | 'Policy' | 'Portfolio Monitor';
export function provenanceText(p: NoteProvenance | null, auto: boolean, hasNote: boolean): string | null;
//  auto && hasNote → 'written by the clean-approval policy' · 'authored' → 'authored by the reviewer' ·
//  'drafted-edited' → 'agent-drafted, edited by the reviewer' · 'drafted-verbatim' → 'agent-drafted, accepted verbatim' ·
//  null && !auto → null (NEVER defaults to authored)

// ---- flags & anchors (flags.ts)
export type FlagKind = 'breach' | 'watch' | 'low-confidence' | 'send-back' | 'restructure' | 'no-cure' | 'info';
export function classifyFlag(f: Flag): FlagKind;
//  startsWith('Reviewer send-back') → send-back; startsWith('Restructure proposed') → restructure;
//  startsWith('Structuring search exhausted') → no-cure; /returned \d+% confidence/ → low-confidence;
//  severity critical → breach; severity warning → watch; else info
export function isCounted(kind: FlagKind): boolean;   // breach, watch, low-confidence, no-cure
export function flagClause(message: string): string;  // text before ' ' + EM + ' ', trailing '.' removed
export function anchorFor(flag: Flag, emittingStepId: string, deal: Deal): string;
//  breach: covenant whose name prefixes the message → `cov:<name>`
//  watch: covenant by keyword (leverage|interest|fixed|liquid, the same mapping as whatif classify) → `cov:<name>`, else the emitting section
//  low-confidence: tool label prefix → that tool's section (Risk Engine → sec:risk, Peer Benchmarks → sec:peers,
//    Memo Builder → sec:recommendation, Structuring Engine → sec:revision-N, Document Intelligence → sec:financials)
//  send-back | restructure | no-cure → `sec:revision-N` of the emitting rework step
//  fallback → `sec:<sectionOfStep(emittingStepId)>` (a flag is never lost)
export function sectionOfStep(stepId: string): SectionId;
//  step_extract→financials, step_risk→risk, step_peers→peers, step_covenants→covenants,
//  step_package→recommendation, step_rework_N→`revision-N`
export function overridesFromAmendments(a: Amendment[] | null): TermOverrides;
export function amendmentsFor(deal: Deal, levMax: number | null, liqMin: number | null): Amendment[];
//  labels exactly 'Max Total Leverage covenant' / 'Min Liquidity covenant'; from/to '≤ 4.00x'→'≤ 4.30x', '≥ $10.0M'→'≥ $8.0M'
export function overridesFor(levMax: number | null, liqMin: number | null): TermOverrides;

// ---- evidence (evidence.ts)
export function paragraphsOf(body: string): { n: number; label: string; text: string }[];
//  split on blank lines; join wrapped lines with one space; label '¶01'
export function evidenceFor(fig: FigureId, value: number, deal: Deal, paras: { n: number; text: string }[], quotedMarkIds: string[]): EvidenceView;
//  quoted when the formatted string occurs in a paragraph (first match); leverage → derived 'debt ÷ ebitda'
//  with operands '96.3', '22.6' each carrying its quoted markId and citeIndex; interest/fixed/liquidity →
//  unquoted unless quoted; risk → model 'Model output · Risk Engine (internal-pd-v3)'; revised → 'Model output · Structuring Engine'
export function evidenceText(e: EvidenceView): string;   // plain text for KeyFigure: 'Quoted ¶02' · 'Derived · 96.3 ÷ 22.6' · …
export function cushionOf(threshold: string, actual: string): { pct: number; text: string; tone: 'neutral' | 'warn' | 'bad' };
//  max covenant: (t − a)/t·100; min covenant: (a − t)/t·100; tone bad <0, warn 0–<10, neutral ≥10
export function distanceOf(name: string, threshold: string, actual: string): string;  // '1.71x over' · '$4.1M short' · '0.10x room' · '$4.2M room'

// ---- flip (flip.ts)
export function nearestFlip(deal: Deal): string;        // Appendix A algorithm and goldens
export function stressZones(deal: Deal, scenario: Scenario, key: DriverKey): { zones: { tone: MeaningTone; fromPct: number; toPct: number }[]; boundaries: { pct: number; text: string; tone: MeaningTone }[] };
//  the same bisection as nearestFlip, so boundary labels and the nearest-flip line always agree
export function stressRecord(deal: Deal, scenario: Scenario): { label: string; detail: string; key: string };
//  label `Stress test attached · ESCALATE → APPROVE (flips)` | `(holds)`; detail `Total debt $96.3M→$90.4M ⇒ risk 58→55, breaches 1→0`
export function parseStressLabel(label: string): { from: TokenView; to: TokenView; result: 'flips' | 'holds' } | null;

// ---- ask (select-file.ts)
export function askRoute(q: string, ctx: { restructured: boolean; revision: number; rec: Recommendation | null; summary: string | null; filedLeverage: string; revisedLeverage: string | null }): { kind: 'engine' } | { kind: 'local'; text: string };
//  /what.?if|waiver|step.?down|stress|scenario|sensitiv/i → 'Use the stress test in this file, below the exhibits. It re-runs the same decide rule the agent uses, and you can attach a scenario as an exhibit.'
//  restructured && /why|recommend|decision|approve|decline|escalat/i → `On revision ${n} the agent recommends ${WORD} on the revised structure. ${summary}`
//  restructured && /leverage|levered/i → `Filed leverage is ${filed} against the ≤ 4.00x covenant. Revision ${n} proposes a restructure that brings it to ${revised}.`
//  otherwise → engine (agent.sendMessage)

// ---- ledger / exports
export function actorOf(e: AuditHistoryEntry): Actor;
export function relabel(e: AuditHistoryEntry): { event: string; detail: string | null };
export function startConfirmCopy(s: V2Store, dealId: string): ConfirmView;
export function stopConfirmCopy(s: V2Store): ConfirmView;
export function announceFor(kind: 'gate' | 'signed' | 'auto' | 'rejected' | 'returned' | 'attached' | 'held', s: V2Store): string;
export function buildFileExport(s: V2Store, dealId: string): { filename: string; payload: unknown };
export function buildSessionExport(s: V2Store): { filename: string; payload: unknown };

// ---- selectors (pure over the store snapshot)
export function selectLiveDealId(s: V2Store): string | null;
export function selectTopBar(s: V2Store): TopBarView;
export function selectTabTitle(s: V2Store): string;
export function selectPolicy(s: V2Store): PolicyView;
export function selectDesk(s: V2Store): DeskView;
export function selectFile(s: V2Store, dealId: string): FileView | null;
export function selectAsk(s: V2Store, dealId: string): AskView;
export function selectSignature(s: V2Store, dealId: string): SignatureView | null;
export function selectStress(s: V2Store, dealId: string): StressView | null;
export function selectExhibits(s: V2Store, dealId: string): ExhibitView[];
export function selectBook(s: V2Store): BookView;
export function selectLedger(s: V2Store, fileFilter: string | null): LedgerView;
export function selectCommands(s: V2Store): { id: string; label: string; section: string; hint?: string; kbd?: string; action: CommandAction }[];
export type CommandAction =
  | { kind: 'sign' } | { kind: 'go-signature' } | { kind: 'approve-plan' } | { kind: 'cancel-plan' }
  | { kind: 'stop' } | { kind: 'open-file'; dealId: string } | { kind: 'start-file'; dealId: string }
  | { kind: 'route'; route: Route } | { kind: 'export-file'; dealId: string } | { kind: 'export-session' }
  | { kind: 'sweep' } | { kind: 'speed'; value: number } | { kind: 'policy'; value: Policy } | { kind: 'href'; href: string };
//  The palette never offers reject or return (a reason must be typed at the gate). 'sign' appears only when the
//  live file is at the gate and not leaving/justSigned. 'start-file' is omitted while parsing.
```

**View types** (`model/types.ts`; screens render them verbatim):

```ts
export interface StatusText { state: StatusKey; text: string }
export interface TokenView { word: string; tone: MeaningTone }
export interface ConfirmView { kind: 'start' | 'stop'; text: string; confirmLabel: string; cancelLabel: string; tone: 'neutral' | 'bad' }
export type SectionId = 'recommendation' | 'financials' | 'risk' | 'peers' | 'covenants' | `revision-${number}`;
export type FigureId = 'revenue' | 'ebitda' | 'margin' | 'debt' | 'leverage' | 'interest' | 'fixed' | 'liquidity';
export type EvidenceView =
  | { cls: 'quoted'; text: 'Quoted'; para: number; paraLabel: string; markId: string; citeIndex: number }
  | { cls: 'derived'; text: 'Derived'; formula: string; operands: { text: string; markId: string | null; citeIndex: number | null }[] }
  | { cls: 'unquoted'; text: 'Unquoted · extracted' }
  | { cls: 'model'; text: string };

export interface TopBarView {
  tabs: { id: 'desk' | 'book' | 'ledger'; label: string; count: string | null; countTone: 'accent' | 'warn' | 'ink-3' }[];
  active: 'desk' | 'book' | 'ledger'; policyOn: boolean; policyLabel: string; policyShort: string;
  speedLabel: string; speeds: { value: number; label: string; checked: boolean }[]; searchKbd: string;
}
export interface PolicyView {
  on: boolean; eligible: boolean; armed: boolean; line: string;
  checks: { ok: boolean; text: string }[] | null;   // null when policy off
  countdown: string | null;                          // '4 s' while armed
  holdLabel: string | null;                          // from holdReason
}

export type DeskStage = 'awaiting' | 'plan-review' | 'drafting' | 'error' | 'not-started' | 'decided';
export interface DeskRow {
  dealId: string; name: string; borrower: string; facility: string; uploaded: boolean;
  leverage: { text: string; tone: 'ink' | 'bad' }; call: TokenView | null;
  stage: StatusText; subMeta: string | null;
  action: { kind: 'review' | 'open-plan' | 'open' | 'draft' | 'open-record' | 're-run'; label: string; variant: 'primary' | 'secondary' | 'ghost'; disabled: boolean } | null;
  confirm: ConfirmView | null;
}
export interface DeskView {
  title: string; summary: string;
  groups: { stage: DeskStage; label: string; status: StatusKey; count: string; rows: DeskRow[] }[];
  parsing: StatusText | null;
  drop: { label: string; sub: string; chooseLabel: string; disabledReason: string | null };
}

export type FileMode = 'not-started' | 'plan-review' | 'running' | 'gate' | 'sealed' | 'error';
export interface StubView { stepId: string; tool: string; meta: string; confTone: 'ink-3' | 'warn' | 'bad'; recordMeta: string; argsLabel: string; argsCount: string; args: unknown; resultLabel: string; resultCount: string; result: unknown; reasoning: string }
export interface NoteView {
  id: string; flagId: string | null; kind: FlagKind | 'evidence-check';
  tone: 'breach' | 'watch' | 'info' | 'returned' | 'signed-over'; status: StatusKey;
  heading: string; text: string; meta: string;
  anchorId: string; counted: boolean; opened: boolean;
  actions: { kind: 'show' | 'trace' | 'amend'; label: string }[]; traceStepId: string | null; amendKind: 'leverage' | 'liquidity' | null;
}
export interface FigureRow { id: FigureId; anchorId: string; label: string; value: string; evidence: EvidenceView }
export interface CovenantRow {
  anchorId: string; name: string; threshold: string; amended: { from: string; to: string } | null;
  actual: string; cushion: { pct: number; text: string; tone: 'neutral' | 'warn' | 'bad' };
  status: 'pass' | 'breach'; statusText: string;
  amend: { kind: 'leverage' | 'liquidity'; value: number; step: number; min: number; max: number; prefix: string; suffix: string } | null;
}
export interface KeyFigureView { label: string; value: string; sub: string | null; caption: string | null; tone: 'ink' | 'warn' | 'bad'; dot: MeaningTone | null; evidenceText: string; traceStepId: string; anchorId: string; ariaLabel: string }
export interface RecommendationBody { basis: string; prior: TokenView | null; token: TokenView; sentence: string; summary: string; keyFigures: KeyFigureView[]; aidLabel: string; nearestFlip: string; stressLinkLabel: string; reworkLine: string | null }
export interface RiskBody { scoreText: string; outOf: string; rating: string; tone: MeaningTone; value: number; tick: number; tickCaption: string; evidence: EvidenceView; drivers: { factor: string; impact: string; tone: 'good' | 'warn' | 'bad' | 'ink-2' }[] }
export interface PeersBody { rows: { cohort: string; leverage: string; interest: string; margin: string; isDeal: boolean }[]; position: string }
export interface RevisionBody { n: number; returned: { quote: string; attribution: string } | null; viable: boolean; summary: string | null; redline: { label: string; from: string; to: string; unchanged: boolean; anchorId: string }[]; noCure: string | null }
export type SectionPhase = 'pending' | 'drafting' | 'set' | 'excluded' | 'stopped';
interface SectionBase { id: SectionId; anchorId: string; ordinal: string; heading: string; suffix: string | null; phase: SectionPhase; status: StatusKey; statusLabel: string; pendingLine: string; drafting: { text: string; callLine: string | null; caret: boolean } | null; stub: StubView | null; notes: NoteView[] }
export type SectionView =
  | (SectionBase & { kind: 'recommendation'; body: RecommendationBody | null })
  | (SectionBase & { kind: 'financials'; body: FigureRow[] | null })
  | (SectionBase & { kind: 'risk'; body: RiskBody | null })
  | (SectionBase & { kind: 'peers'; body: PeersBody | null })
  | (SectionBase & { kind: 'covenants'; body: CovenantRow[] | null })
  | (SectionBase & { kind: 'revision'; body: RevisionBody | null });
export interface DocBarView {
  fileName: string; files: { dealId: string; label: string; meta: string }[];
  status: StatusText; elapsed: string | null;
  extraction: { text: string; tone: 'ink-3' | 'warn' | 'bad' } | null;   // shown when extraction confidence < 90%
  policySuffix: string | null;
  countdown: { reviewLabel: string } | null;        // the status already carries the countdown text
  stepper: { label: string; count: number } | null;
  goToSignature: boolean; goToDrafting: boolean;
  actions: { kind: 'stop' | 'export' | 'rerun' | 'ledger'; label: string; variant: 'secondary' | 'ghost'; disabled: boolean }[];
  confirm: ConfirmView | null;
}
export interface HeaderView {
  eyebrow: string; borrower: string; meta: string; prepared: string; uploaded: boolean;
  cancelled: { text: string; linkLabel: string } | null;
  seal: { state: StatusKey; headline: string; receipt: string } | null;
}
export interface ContentsView {
  mode: 'not-started' | 'plan-review';
  rows: { stepId: string; ordinal: string; title: string; describe: string; tool: string; required: boolean; included: boolean; tag: string }[];
  sourceLine: string; countdown: string | null; held: boolean; holdLabel: string; unattendedNote: string | null;
}
export interface SourceView {
  open: boolean; heading: string; title: string; borrower: string; facility: string; simulated: boolean;
  paragraphs: { n: number; label: string; segments: { text: string; markId: string | null; active: boolean }[] }[];
  stepper: { label: string; hasPrev: boolean; hasNext: boolean } | null;
  quoted: { count: number; markIds: string[]; showAllLabel: string };
  spineLabel: string; spineCount: string;
}
export interface AppendixView { heading: string; meta: string; rows: { name: string; threshold: string; actual: string; cushion: { pct: number; text: string; tone: 'neutral' | 'warn' | 'bad' }; status: StatusText }[] | null; empty: string | null }
export interface FileView {
  dealId: string; mode: FileMode; live: boolean; source: 'live' | 'snapshot' | 'deal';
  runId: number | null; revision: number; restructured: boolean;
  docBar: DocBarView; header: HeaderView; contents: ContentsView | null; sections: SectionView[];
  headerMargin: { showReasoning: boolean; reasoningLabel: string; evidenceCheck: NoteView | null };
  toReview: NoteView[]; sourceView: SourceView; appendix: AppendixView | null;
  rows: { exhibits: boolean; stress: boolean; signature: boolean; monitoring: boolean };
  primary: { label: string; kbd: string; action: 'draft' | 'start-drafting'; disabled: boolean; disabledReason: string | null } | null;
  flagsOnRecord: number; countedNotes: number;
}

export type SignatureState = 'pending' | 'gate' | 'countdown' | 'held' | 'leaving' | 'signed' | 'signed-auto' | 'rejected';
export interface SignatureView {
  state: SignatureState; heading: string; pendingLine: string | null;
  returned: { rev: number; text: string }[];
  signedOver: { flagId: string; noteId: string; state: StatusKey; text: string; cleared: boolean; opened: boolean }[];
  signedOverLabel: string;
  agent: { text: string; caption: string };
  reviewer: { sigState: SigState; caption: string; kbd: string | null; ink: 'none' | 'animate' | 'static'; autoText: string | null; rejectedWord: string | null; fillMs: number; reviewLabel: string | null };
  policy: PolicyView;
  note: { value: string; label: string; placeholder: string; draftLabel: string; draftDisabled: boolean; chip: string | null; hint: string | null } | null;
  amendment: { text: string; token: TokenView; revertLabel: string } | null;
  attestation: string | null;
  verbs: { primary: string; returnLabel: string; rejectLabel: string; disabled: boolean; kbd: { sign: string; ret: string; rej: string } } | null;
  sealed: { caption: string; quote: string | null; provenance: string | null; amendments: { label: string; from: string; to: string }[]; routed: string | null; routedLinkLabel: string | null; checks: { ok: boolean; text: string }[] | null } | null;
}
export interface StressView {
  open: boolean; available: 'live' | 'readonly'; collapsedLine: string; openLabel: string; eyebrow: string; baseLabel: string;
  drivers: { key: DriverKey; label: string; value: number; min: number; max: number; step: number; valueText: string; deltaText: string | null; deltaTone: 'good' | 'bad' | 'ink-3'; zones: { tone: MeaningTone; fromPct: number; toPct: number }[]; boundaries: { pct: number; text: string; tone: MeaningTone }[] }[];
  outcome: { base: TokenView; live: TokenView; text: string; key: string };
  covenants: CovenantRow[];
  attach: { label: string; disabled: boolean; reason: string | null } | null;   // null when readonly
  readonlyNote: string | null; resetLabel: string; resetDisabled: boolean;
}
export interface ExhibitView { id: string; letter: string; heading: string; meta: string; detail: string; from: TokenView; to: TokenView; result: 'flips' | 'holds' }
export interface BookItem { id: string; origin: 'monitor' | 'countersign'; status: StatusText; covenant: string; reading: string; distance: string; raised: string; muted: boolean; action: { kind: 'acknowledge' | 'mark-handed-off'; label: string } | null; link: { label: string; route: Route } | null; doneText: string | null }
export interface BookRow { dealId: string; name: string; borrower: string; resolvedMeta: string | null; status: StatusText; tightest: { name: string; reading: string } | null; cushion: { pct: number; text: string; tone: 'neutral' | 'warn' | 'bad' } | null; tests: string; risk: { text: string; tone: 'ink' | 'bad' }; checked: string; items: BookItem[] }
export interface BookView { title: string; verdict: StatusText | null; disclosure: string; cadence: string; sweepLabel: string; sweepDisabled: boolean; empty: string | null; rows: BookRow[] }
export interface LedgerRow { id: string; time: string; actor: Actor; event: string; detail: string | null; raw: Record<string, string>; chip: LedgerChip }
export interface LedgerRun { key: string; runId: number; dealId: string; expanded: boolean; header: StatusText & { meta: string }; decision: { time: string; actor: Actor; verb: string; note: string | null; provenance: string | null; amendments: { label: string; from: string; to: string }[]; facts: string } | null; rows: LedgerRow[]; openFile: Route | null; openFileLabel: string }
export interface LedgerView {
  title: string; summary: string; note: string; exportLabel: string;
  chips: { id: LedgerChip; label: string; count: string }[]; activeChip: LedgerChip;
  fileFilter: { label: string; clearLabel: string } | null;
  empty: string | null;
  files: { key: string; heading: string; runs: LedgerRun[] }[];
  monitor: { heading: string; rows: LedgerRow[] } | null;
}
export interface AskView { enabled: boolean; placeholder: string; disabledReason: string | null; thread: { id: string; role: 'you' | 'answer'; text: string; meta: string | null }[] }
```

**File resolution (`selectFile`):**
- `live = dealId === selectLiveDealId(s)`.
- If live, the mode comes from status: `plan_review` → plan-review; `running` → running; `awaiting_approval` → gate; `approved` | `rejected` → sealed; `error` → error.
- Else, if the deal's latest RunRecord is `cancelled` and newer than `snapshots[dealId]` (or there is no snapshot): not-started, with `header.cancelled` built from that run's "Run cancelled" audit detail and the prior snapshot, if any.
- Else, if `snapshots[dealId]` exists → sealed (source snapshot).
- Otherwise not-started (source deal; plan = `getPlan()`).
- An unknown dealId → `null`.

**Ask (`selectAsk`):**
- Enabled only when `dealId === selectLiveDealId(s)` and status ∈ {`awaiting_approval`, `approved`, `rejected`}.
- Disabled reasons:
  - not started: "Draft the memo first. Questions answer about the file being drafted."
  - running: "Questions open when the memo is assembled."
  - snapshot: "Questions answer about the live file only. Re-run this file to ask about it."
- **Thread:** walk `agent.messages` by index `i`. Before message `i`, emit the local `ui.thread` entries with `at === i` and the current runId; after the last message, emit entries with `at === messages.length`. Engine answers have meta "rule-based responder · simulated"; local answers have meta "Countersign".

**Data sources for sections.** Use the step's `result.data`, narrowed with type guards. If the shape is unexpected, fall back to the deal's own fields; never throw.

| Step | `result.data` shape |
|---|---|
| `step_extract` | `ExtractedFinancials` |
| `step_risk` | `RiskScore` |
| `step_peers` | `{ deal, peers, position }` |
| `step_covenants` | `CovenantTest[]` |
| `step_package` | `{ memoId, sections, attachments }` |
| `step_rework_N` | `{ viable: true, contributionM, debtPaydownM, liquidityTopUpM, revised: { totalDebtM, leverageX, interestCoverageX, liquidityM, riskScore }, breachesRemaining }` or `{ viable: false, searched, reason }` |

**Key figures** = the 5 `pkg.keyMetrics` entries, in order:
- Labels are mapped to sentence case ('Total Leverage' → 'Total leverage', 'Interest Coverage' → 'Interest coverage').
- Each is linked to its FigureRow (filed) or to its revision redline row (restructured). `evidenceText` comes from that row's evidence.
- **Dev probe:** the FigureRow's formatted value must equal `keyMetric.value` (for EBITDA, the part before " · "). A mismatch is a bug to fix, never silence.
- Captions:
  - leverage "0.26x over ≤ 4.00x" (bad);
  - interest "0.10x room · ≥ 2.00x" (warn: cushion < 10%);
  - liquidity "$4.2M room · ≥ $10.0M" (neutral).

**Notes:**
- **Counted notes** ("to review") = flags whose `classifyFlag` is counted, in page order.
- **Signed over** = the current package's counted flags. Flags whose covenant now passes under `amendedOutcome(...).changed` render with `cleared: true` (line-through + " · cleared by amendment").
- **`flagsOnRecord`** = `pkg.flags.length` (the policy check uses this number and the word "flags").

**Relabel table** (`actorOf` / `relabel`; the raw label always stays in `raw`):

| Raw engine label (match) | Event shown | Actor | Chip |
|---|---|---|---|
| `Run started` | "Run started · {detail}" | Credit Analyst | all |
| `Plan approved by reviewer` | "Plan approved · {detail}" | Reviewer | reviewer |
| `Plan auto-started · unattended countdown` | "Plan auto-started · unattended countdown, no reviewer action · {detail}" | Credit Analyst | all |
| `/^Step \d+ · (.+)/` | "Started · {title}" | Credit Analyst | all |
| `/^Tool call · (\w+)/` | "Called {tool label}" (detail = args JSON) | Credit Analyst | all |
| `/^Tool result · (\w+)/` | "{tool label} returned" (detail) | Credit Analyst | all |
| `/^Flag · (critical\|warning\|info)/` | "Flag · Breach/Watch/Note" (detail = message) | Credit Analyst | flags |
| `/^Awaiting human approval( · rev (\d+))?/` | "Suspended at countersignature · rev N" | Credit Analyst | all |
| `Plan extended · reviewer send-back` | "Returned for revision · rev N−1" (detail = the reviewer note from the following send-back flag) | Reviewer | reviewer |
| `Human APPROVED` + EM + ` countersigned` | "Countersigned" | Reviewer | reviewer |
| `Human APPROVED` + EM + ` countersigned as amended` | "Countersigned as amended" | Reviewer | reviewer |
| `AUTO-countersigned · clean-approval policy` | "Auto-countersigned · clean-approval policy" | Policy | policy |
| `Human REJECTED` | "Rejected" | Reviewer | reviewer |
| kind `whatif` | the label as written by V2 ("Stress test attached · …") | Reviewer | exhibits |
| `Run cancelled` | "Run cancelled · {detail}" | Reviewer | reviewer |
| `Run error` | "Run error" | Credit Analyst | all |
| anything else | the raw label | Credit Analyst | all |

**Monitor group rows** (from `monitorLog`):

| Log kind | Event shown | Actor | Chip |
|---|---|---|---|
| raised, monitor | "Raised · {deal} · {Breach/Watch} · {covenant} {actual} / {threshold}" (+ " · re-raised after acknowledgement") | Portfolio Monitor | monitor |
| raised, countersign | "Routed for senior credit review · {deal}" | Reviewer | reviewer |
| upgraded | "Worsened · {deal} · Watch → Breach · {covenant} {actual} / {threshold}" | Portfolio Monitor | monitor |
| acknowledged, monitor | "Acknowledged · {covenant}" | Reviewer | reviewer |
| acknowledged, countersign | "Marked handed off to senior review" | Reviewer | reviewer |
| resolved | "Resolved · passed 2 sweeps in a row" | Portfolio Monitor | monitor |

**Exports:**
- **File** (`exportFile`; available for any sealed file), saved as `fileFilename(memoId)`:

  ```
  { exportedAt, app: 'Countersign V2', file: { dealId, memoId, borrower, facility }, runId,
    decision: { verb, at, note, noteProvenance, noteProvenanceText, amendments, auto, suspendedMs },
    asPresented: presented, package,
    steps: steps.map(s => ({ title, call, result, flags, thinking })),
    events: auditHistory.filter(e => e.runId === runId),
    exhibits: selectExhibits(...) }
  ```

- **Session** (`exportSession`), saved as `sessionFilename(now)`:

  ```
  { exportedAt, app: 'Countersign V2',
    analysisEvents: auditHistory.map(e => ({ ...e, actor: actorOf(e), display: relabel(e).event })),
    runs, monitorLog, escalations, snapshots: snapshotList }
  ```

**Fixtures** (`model/fixtures.ts`, stage 1). Each is a fully populated view object using Appendix A values:
- `FX_TOPBAR`
- `FX_DESK_INITIAL`, `FX_DESK_ATLAS_GATE`
- `FX_FILE_NOT_STARTED`, `FX_FILE_PLAN_REVIEW`, `FX_FILE_RUNNING`, `FX_FILE_ATLAS_GATE`, `FX_FILE_ATLAS_REV2`, `FX_FILE_SEALED`, `FX_FILE_UPLOAD_GATE`
- `FX_ASK`
- `FX_SIG_ATLAS_GATE`, `FX_SIG_ATLAS_AMENDED`, `FX_SIG_ATLAS_REV2`, `FX_SIG_MERIDIAN_COUNTDOWN`, `FX_SIG_COBALT_GATE`, `FX_SIG_SEALED`, `FX_SIG_AUTO_SEALED`, `FX_SIG_REJECTED`
- `FX_STRESS_ATLAS`
- `FX_EXHIBITS`
- `FX_BOOK_BREACH`, `FX_BOOK_EMPTY`
- `FX_LEDGER_AFTER_ATLAS`, `FX_LEDGER_EMPTY`

The stage-1 stub selectors return these. The kit page uses them for specimens.

---

## 10. Copy and voice rules

1. **Case and words:**
   - Sentence case everywhere. Uppercase only through `.t-eyebrow` and `.t-token`.
   - **No em dashes (U+2014) in V2-authored copy or source.** Use a period, comma, colon or " · ". Engine-authored strings (flag messages, memo summaries, reasoning, draft notes, raw labels) are data and are shown as written.
   - Second person for the reviewer. Agents are named: Credit Analyst, Portfolio Monitor, Policy. Records say **"Reviewer"**; never invent names.
   - Use the closed word sets of §5. Never "Approved", "Declined", "Awaiting approval" or "Running…".
2. **Numbers** only via model formatters:
   - ratios 2dp "4.26x";
   - money 1dp "$14.2M";
   - percent 1dp "17.6%";
   - signed with U+2212 "−6.5%";
   - durations "840 ms" / "1.1 s";
   - clocks "14:03:12" / "14:03";
   - stamps "17 Oct 2026, 14:03";
   - elapsed "0:07".
3. **Honesty disclosures:** "simulated" goes on extraction, monitor drift, comparables and the responder. The analysis aid is labelled "Analysis aid · not part of the memo". "Mark handed off" says exactly what happens.
4. **Status sentences** start with the state word ("Awaiting your countersignature · rev 1 …", "Drafting · Covenant compliance …").
5. **Punctuation:** no exclamation marks, no "please", no "Oops". "…" is used only for in-flight work ("Calling Covenant Tester…").
6. **Button labels** are imperative and short; the primary names what is being done.

**Exact copy for key moments:**

| Moment | Copy |
|---|---|
| Desk title / initial summary | "Case files" / "3 sample files, chosen to end differently · none decided this session · extraction is simulated" |
| Start confirm (gate) | "Project Atlas is awaiting your countersignature. The agent handles one file at a time: starting Project Meridian discards that run, and the Ledger records it as cancelled." [Start anyway] [Keep Project Atlas] |
| Start confirm (running / plan) | "Project Atlas is drafting." / "Project Atlas is in plan review." + the same continuation |
| Start confirm (same file) | "Project Atlas is awaiting your countersignature. Re-running discards the suspended memo, and the Ledger records it as cancelled." [Re-run anyway] [Keep this run] |
| Stop confirm | gate: "Stop discards the suspended rev 1 memo. The Ledger records the run as cancelled." · running: "Stop discards this run. The Ledger records it as cancelled." [Stop run] (danger) [Keep] |
| Drop zone | "Drop a CIM (PDF) to open a new file, or" + "choose a file" · sub "Extraction is simulated from the file name" · disabled (live) "Finish or stop the live run on Project Atlas to add a file." · disabled (parsing) "Extraction in progress · q3_cim.pdf" |
| Start disabled while parsing | "Extraction in progress · q3_cim.pdf" |
| Not started doc bar | "Not started · CIM ready · 3 paragraphs" |
| Cancelled note | "Last run cancelled 14:06 · reset before a decision. The previous record (run 1, countersigned 14:03) is in the Ledger." · "Open in Ledger" |
| Contents describe lines | extract "Pulls revenue, EBITDA, debt, coverage and liquidity from the CIM." · risk "Scores the credit and maps it to a rating." · peers "Places the credit against simulated sector comparables." · covenants "Tests each proposed covenant against the extracted figures." · package "Writes the recommendation last, after every covenant is tested." |
| Plan review | "Drafting starts in 6 s · Hold" → "Held · start when ready" · "An unattended start is recorded as 'Plan auto-started', never as your approval." |
| Pending section | Recommendation "Written last, after every covenant is tested." · others "Not drafted yet." |
| Drafting call line | "Calling Document Intelligence…" |
| Evidence check note | heading "Evidence check" · "3 of 8 figures are not quoted in the CIM: interest coverage, fixed-charge coverage and liquidity. They come from the extraction model; verify against the source." Uploads add " Extraction ran at 76% confidence on an unseen document." |
| Note meta | "raised by Covenant Tester · 14:02:57" |
| Recommendation sentences | escalate "Escalate to a credit officer. 1 covenant breach rules out approval; risk 58 sits below the 75 decline line." · approve "Approve. Every covenant passes on the filed figures; risk 28 (Ba2 / Non-investment grade)." · decline "Decline as structured. 4 covenant breaches and risk 82, at or above the 75 decline line." · revised "Approve the revised structure. $6.0M sponsor equity clears every covenant; risk 55 (B2 / Speculative)." |
| No cure | "Search exhausted policy limits: sponsor equity up to 35% of total debt ($39.2M), as paydown and liquidity splits. The recommendation stands." |
| Policy line | off: "Auto-countersign is off. Every file waits for you." · on, not eligible: "Policy · not eligible · 2 of 4 checks fail" · armed: "Auto-countersign in 5 s · clean-approval policy" · held: the hold caption |
| Policy checks | "Recommendation is APPROVE" / fail "Recommendation is ESCALATE" · "No flags on record" / fail "2 flags on record" · "First pass" / fail "Revision 2" · "Every key figure at 90% confidence or above" / fail "Lowest key-figure confidence 76%" |
| Hold captions | "Held · you started reviewing" · "Held · review manually" · "Held · you left the file" · "Held · the tab was hidden" · "Held · auto-countersign switched off" |
| Primary labels | "Countersign approval" · "Countersign escalation" · "Countersign decline" · "Countersign as amended" · "Countersign revised structure" |
| Attestations | escalate: "Countersigning concurs with the agent's ESCALATE on CAM-2026-0417 and signs over 2 notes, including 1 covenant breach. The memo then routes to the escalation queue for senior credit review." · approve clean: "Countersigning concurs with the agent's APPROVE on CAM-2026-0418. There are no notes to sign over. The memo is committed to the record." · decline: "Countersigning concurs with the agent's DECLINE on CAM-2026-0419 and signs over 5 notes, including 4 covenant breaches. The facility is recorded as declined as structured." · amended to approve: "Countersigning as amended approves CAM-2026-0417 on your amended terms (Max Total Leverage ≤ 4.30x). Your amended term is recorded with your signature. Nothing routes onward: the amendment resolves the escalation." · amended, still escalate: "Countersigning as amended concurs with ESCALATE on your amended terms. Your amended term is recorded with your signature. The memo then routes to the escalation queue for senior credit review." · revised: "Countersigning concurs with the revised structure on CAM-2026-0417 ($6.0M sponsor equity: $6.0M debt paydown), subject to the sponsor commitment. There are no notes to sign over." |
| Note field | label "Reviewer note · on the record" · placeholder "Optional to countersign. Required to return or reject." · draft "Draft from notes" · chips "agent-drafted · unedited" / "agent-drafted · edited by you" |
| Sealed provenance | "authored by the reviewer" · "agent-drafted, edited by the reviewer" · "agent-drafted, accepted verbatim" · "written by the clean-approval policy" |
| Seal headlines | "The agent recommended ESCALATE. You countersigned." · "…You countersigned as amended." · "The agent recommended APPROVE on the revised structure. You countersigned." · "The agent recommended APPROVE. The policy countersigned." · "The agent recommended DECLINE. You rejected the memo." |
| Routed line | "Routed to the Book for senior credit review · Open in Book" |
| Stress | collapsed "Stress test · scratch. Nothing here is on the record until you attach it." · attach "Attach as exhibit" · disabled reasons "Change a driver first" / "This scenario is already attached" |
| Book verdicts | "2 of 3 files in breach · 3 covenants need review · 1 memo awaiting senior hand-off" · "All 3 files within covenants · last checked sweep #4, 6 s ago" · "1 file on watch · thin headroom on 2 covenants" |
| Book actions | "Acknowledge" → "Acknowledged 14:05" · "Mark handed off" → "Marked handed off to senior review · 14:05" |
| Ask disabled | "Draft the memo first. Questions answer about the file being drafted." · "Questions open when the memo is assembled." · "Questions answer about the live file only. Re-run this file to ask about it." |
| Ledger empty / filter empty | "Nothing on the record yet. Draft a memo to start the trail." / "No events match this filter." |
| Palette | placeholder "Search files and actions" · footer "14 actions" |

---

## 11. Guardrails

**`package.json`:** add exactly one line, between `"build"` and `"preview"`, so that no other line changes:

```json
    "v2-check": "bash scripts/v2-check.sh",
```

`build` is unchanged.

**`scripts/v2-check.sh`** (verbatim; validated on macOS bash 3.2 + BSD grep/sed/awk against a spec-compliant fixture (28 ok, exit 0) and a deliberately dirty fixture (28 FAIL, exit 1); C28 validated in a scratch git repo with the real baseline files):

```bash
#!/usr/bin/env bash
# scripts/v2-check.sh: Countersign V2 guardrails (acceptance greps over src/v2).
# Exit 0 = clean, 1 = violations, 2 = setup error.
# Portable: macOS bash 3.2, BSD grep/sed/awk, shasum. Paths under src/v2 contain no spaces.
set -u
cd "$(dirname "$0")/.." || exit 2
V2="src/v2"
TOK="$V2/v2.css"
if [ ! -d "$V2" ] || [ ! -f "$TOK" ]; then echo "v2-check: $V2 or $TOK missing"; exit 2; fi
FAIL=0
N=0
EM=$'\xe2\x80\x94'

report() { # report <id> <description> <offending-lines>
  N=$((N+1))
  if [ -z "$3" ]; then echo "ok   $1  $2"; else echo "FAIL $1  $2"; printf '%s\n' "$3" | sed 's/^/       /' | head -40; FAIL=1; fi
}
# gr <regex> <files...>: grep with file:line prefixes; silent when the file list is empty
gr() { re=$1; shift; [ $# -gt 0 ] || return 0; grep -HnE -- "$re" "$@" </dev/null; }

CSS=$(find "$V2" -type f -name '*.css' | sort)
TS=$(find "$V2" -type f \( -name '*.ts' -o -name '*.tsx' \) | sort)
TSX=$(find "$V2" -type f -name '*.tsx' | sort)
# TS/TSX minus the two files that print motion and review vocabulary as copy
TS_APP=$(printf '%s\n' $TS | grep -vE "^$V2/(KitPage\.tsx|design-pending\.ts)\$")
TSX_APP=$(printf '%s\n' $TSX | grep -vE "^$V2/KitPage\.tsx\$")
SCREEN_TSX=$( { find "$V2/screens" "$V2/chrome" -type f -name '*.tsx' 2>/dev/null; [ -f "$V2/App.tsx" ] && echo "$V2/App.tsx"; } | sort)
UI_TSX=$( { printf '%s\n' $SCREEN_TSX; [ -f "$V2/KitPage.tsx" ] && echo "$V2/KitPage.tsx"; } | grep . | sort)
NONKIT_CSS=$(find "$V2" -type f -name '*.css' ! -path "$V2/kit/*" | sort)
MODEL="^$V2/model/"

# every CSS line OUTSIDE the token block of v2.css, as "file:line: text"
outside() { [ -n "$CSS" ] || return 0; awk 'FNR==1{t=0} /@tokens:start/{t=1} { if(!t) printf "%s:%d: %s\n", FILENAME, FNR, $0 } /@tokens:end/{t=0}' $CSS; }
# every line INSIDE the token block
inside()  { awk '/@tokens:start/{t=1} { if(t) printf "%s:%d: %s\n", FILENAME, FNR, $0 } /@tokens:end/{t=0}' "$TOK"; }
# outside lines whose matching declarations carry px values outside an allowed set
pxcheck() { # pxcheck <declaration-regex> <allowed-px-regex>
  outside | grep -E "$1" | while IFS= read -r l; do
    v=$(printf '%s\n' "$l" | sed -E 's/^[^:]+:[0-9]+: //' | grep -oE "$1[^;}]*" | grep -oE -- '-?[0-9.]+px' | grep -vxE "$2")
    [ -n "$v" ] && printf '%s\n' "$l"
  done
}
# outside lines with a typography declaration whose value is not exactly one role token
typecheck() {
  outside | awk '{ s = $0; while (match(s, /(font-size|font-weight|line-height|letter-spacing)[ \t]*:[^;}]*/)) {
    d = substr(s, RSTART, RLENGTH); if (d !~ /:[ \t]*var\(--t-[a-z0-9-]+\)[ \t]*$/) { print $0; break } s = substr(s, RSTART + RLENGTH) } }'
}
# outside lines whose transition/animation carries a literal duration (0s and 0ms are allowed)
durcheck() {
  outside | grep -E '(transition|animation)[a-z-]*[[:space:]]*:' | while IFS= read -r l; do
    v=$(printf '%s\n' "$l" | sed -E 's/^[^:]+:[0-9]+: //; s/(^|[^0-9.])0m?s([^a-z0-9-]|$)/\1\2/g' | grep -E '[0-9.]+m?s([^a-z0-9-]|$)')
    [ -n "$v" ] && printf '%s\n' "$l"
  done
}
# engine files that were already uncommitted before the V2 build: path:sha256 (edit only if the owner changes one on purpose)
BASELINE="src/agent/monitor.ts:ce5a47c67b8672cbbf7265878ed62b6bcba2b83bc369b66e6b36e006c083c98f
src/agent/runAgent.ts:99500db8731c9fe797cca5f4578606139cb09b9c366b42ec5d54e8618e81f3c8
src/agent/synthesize.ts:ae43413d2782eec95c7407e3e2b8d8a49ac89d6fe8a9fdaad889134698a56b0a
src/agent/whatif.ts:4aa71cc4aad5dc34c668501e2270d38d8c1c64601ce1988c979a004440c30346
src/agent/format.ts:1a8caef4aacbeb3d9ae17cfe1465bed5f9d0644d2dd45c541be7668a9882c786
src/agent/rating.ts:1a912053eafaabcf1b124e61845bf046a33b4b5fd850cde12de837d3a7cd0b33
src/hooks/useCreditAgent.ts:6ec0ddc30bf823a91bbb3f13f5b3810ee198d8e511d8a3abed97f939348bf744
src/hooks/useMonitor.ts:0d2c62194ae45b45acb5ff84a48b92300b4ef39181bc79f545243c47f4e6401b
src/components/Artifact.tsx:6177f0ce4d3bfd9b9e008e823688f161144223e999455e33701ec937c4bda3ed"
v1_changes() {
  { git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u | while IFS= read -r f; do
    case "$f" in
      src/v2/*|src/main.tsx|package.json|scripts/v2-check.sh|.claude/*) continue ;;
    esac
    want=$(printf '%s\n' "$BASELINE" | awk -F: -v p="$f" '$1==p {print $2}')
    if [ -z "$want" ]; then echo "$f  (outside the V2 build area)"
    elif [ "$(shasum -a 256 "$f" 2>/dev/null | awk '{print $1}')" != "$want" ]; then echo "$f  (engine baseline file was edited)"; fi
  done
  git diff HEAD -- package.json | grep -E '^[-+]' | grep -vE '^(\+\+\+|---) ' | grep -vE '^\+[[:space:]]*"v2-check": "bash scripts/v2-check\.sh",$' | sed 's/^/package.json  /'
}

report C01 "no colour literals outside the token block" "$(
  outside | grep -E '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?([^0-9a-zA-Z_-]|$)|rgba?\(|hsla?\(|oklch\(|:[^;{]*[^a-z-](white|black|red|green|blue|gray|grey|silver|teal|navy)([^a-z-]|$)';
  gr '#[0-9a-fA-F]{6}([^0-9a-zA-Z_-]|$)|#[0-9a-fA-F]{3}([^0-9a-zA-Z_-]|$)|rgba?\(|hsla?\(' $TS )"
report C02 "no native title attributes" "$(gr '[[:space:]]title=' $TSX)"
report C03 "type only through role tokens" "$(
  typecheck;
  outside | grep -E '(^|[[:space:];{])font(-family)?[[:space:]]*:';
  gr 'fontSize|fontWeight|lineHeight|letterSpacing|fontFamily' $TSX )"
report C04 "role tokens: sizes 11/12/13/15/18/22px, line boxes 16/18/20/24/28px, weights 400/500/600; 12 role classes" "$(
  inside | grep -oE -- '--t-[a-z0-9-]+-size[[:space:]]*:[^;]*' | grep -vE ':[[:space:]]*(11|12|13|15|18|22)px$';
  inside | grep -oE -- '--t-[a-z0-9-]+-lh[[:space:]]*:[^;]*' | grep -vE ':[[:space:]]*(16|18|20|24|28)px$';
  inside | grep -oE -- '--t-[a-z0-9-]+-weight[[:space:]]*:[^;]*' | grep -vE ':[[:space:]]*(400|500|600)$';
  inside | grep -oE '(^|[^-])font-weight[[:space:]]*:[^;]*' | grep -vE 'font-weight[[:space:]]*:[[:space:]]*var\(--t-[a-z0-9-]+-weight\)$';
  for r in display heading body strong control small label meta eyebrow figure figure-lg token; do
    inside | grep -qE ": \.t-$r[[:space:]]*\{" || echo ".t-$r is not defined inside the token block"; done )"
report C05 "box-shadow only via --shadow-pop / --halo-focus / --halo-error" "$(
  outside | grep -E 'box-shadow[[:space:]]*:' | grep -vE 'box-shadow[[:space:]]*:[[:space:]]*(none|var\(--(shadow-pop|halo-focus|halo-error)\))[[:space:]]*(;|\}|$)';
  gr 'boxShadow' $TSX )"
INF=$(gr 'infinite' $CSS $TS_APP)
report C06 "exactly one infinite animation (the caret); keyframes from the allowlist" "$(
  if [ "$(printf '%s\n' "$INF" | grep -c .)" -ne 1 ] || ! printf '%s\n' "$INF" | grep -q 'v2-caret'; then
    printf 'need exactly 1 line with "infinite", on the v2-caret rule; found:\n%s\n' "$INF"; fi;
  [ -n "$CSS" ] && grep -hoE '@keyframes[[:space:]]+[A-Za-z0-9_-]+' $CSS </dev/null | awk '{print $2}' | grep -vxE 'v2-enter|v2-flash|v2-ink|v2-fill|v2-caret' )"
report C07 "no imports from V1 components, App or index.css" "$(gr "(from|import)[[:space:]]*\(?[[:space:]]*['\"](\.\./)+(components|App|index\.css)['\"/]" $TS)"
report C08 "no gradients, blur, backdrop-filter, filter or text-shadow" "$(
  gr 'gradient\(|backdrop-filter|blur\(|text-shadow|(^|[^a-z-])filter[[:space:]]*:' $CSS;
  gr 'gradient\(|backdropFilter|WebkitBackdropFilter|textShadow' $TSX )"
report C09 "no em dashes in V2 source" "$(gr "$EM" $CSS $TS)"
UPP=$(gr 'text-transform[[:space:]]*:[[:space:]]*uppercase' $CSS)
report C10 "uppercase only in .t-eyebrow and .t-token; toUpperCase only in src/v2/model/" "$(
  printf '%s\n' "$UPP" | grep . | grep -vE '^[^:]+:[0-9]+:[[:space:]]*\.t-(eyebrow|token)[[:space:]]*\{';
  [ "$(printf '%s\n' "$UPP" | grep -c .)" -le 2 ] || echo "more than 2 uppercase rules";
  gr 'toUpperCase\(' $TS | grep -vE "$MODEL" )"
report C11 "border/outline widths 1px or 2px; dashed only via the --line-provisional tokens" "$(
  pxcheck '(border(-(top|right|bottom|left))?(-width)?|outline(-width)?)[[:space:]]*:' '(0|1|2)px';
  outside | grep 'dashed';
  gr 'dashed' $TS )"
report C12 "no literal durations in transition/animation (0s allowed)" "$(
  durcheck;
  gr "(transition|animation)[A-Za-z]*['\"]?[[:space:]]*:" $TSX_APP )"
report C13 "at most one primary button per screen/chrome file" "$(for f in $SCREEN_TSX; do n=$(grep -o 'variant="primary"' "$f" | grep -c .); [ "$n" -gt 1 ] && echo "$f: $n primaries"; done)"
report C14 "light only: no theme switching" "$(gr 'prefers-color-scheme|data-theme|color-scheme[[:space:]]*:[[:space:]]*dark' $CSS $TS)"
report C15 "number/date formatting only in src/v2/model/" "$(gr 'toFixed\(|toLocale[A-Za-z]*\(|new Date\(|Intl\.' $TS | grep -vE "$MODEL")"
report C16 "no strokeWidth props (icon stroke is set in CSS)" "$(gr 'strokeWidth' $TSX)"
report C17 "agent tokens only from the model; banned decision words absent" "$(
  gr "['\">](APPROVE|ESCALATE|DECLINE|REJECTED)['\"<]" $TSX_APP;
  gr '(^|[^A-Za-z])(Approved|Declined)([^A-Za-z]|$)|Awaiting approval|Running(…|\.\.\.)' $CSS $TS_APP )"
report C18 "V2 never calls selectDeal (browsing must not abort a run)" "$(gr 'selectDeal\(' $TS)"
report C19 "browser storage only in src/v2/state/" "$(gr 'localStorage|sessionStorage' $TS | grep -vE "^$V2/state/")"
report C20 "every kit primitive is shown on the kit page" "$(
  [ -f "$V2/KitPage.tsx" ] || echo "KitPage.tsx missing";
  for n in $(cat $V2/kit/*.tsx 2>/dev/null | grep -oE 'export function [A-Z][A-Za-z0-9]*' | awk '{print $3}' | sort -u); do
    grep -qE "<$n([[:space:]/>]|\$)" "$V2/KitPage.tsx" 2>/dev/null || echo "$n is not rendered in KitPage.tsx"; done )"
report C21 "every data-pattern id has a design-pending entry" "$(
  for id in $(grep -rhoE 'data-pattern="P-[0-9]+"' $V2 </dev/null | grep -oE 'P-[0-9]+' | sort -u); do
    grep -q "id: '$id'" "$V2/design-pending.ts" 2>/dev/null || echo "$id has no entry in design-pending.ts"; done )"
report C22 "no hand-rolled controls in screens, chrome, App or KitPage (use the kit)" "$(gr '<(button|input|textarea|select|a)([[:space:]>]|$)' $UI_TSX)"
report C23 "kit classes are styled only in kit/kit.css" "$(gr '\.k-[a-z]' $NONKIT_CSS)"
report C24 "icon sizes 12/14/16 only" "$(gr 'size=\{[0-9]+\}' $TSX | grep -vE 'size=\{(12|14|16)\}')"
report C25 "radius only via --r-xs/--r-sm/--r-md/--r-pill" "$(outside | grep -E 'border-radius[[:space:]]*:' | grep -vE 'border-radius[[:space:]]*:[[:space:]]*(0|var\(--r-(xs|sm|md|pill)\))[[:space:]]*(;|\}|$)')"
report C26 "spacing on the 4px grid (no negative spacing)" "$(pxcheck '(^|[[:space:];{])(padding|margin|gap|row-gap|column-gap)(-(top|right|bottom|left|inline|block)(-start|-end)?)?[[:space:]]*:' '(0|4|8|12|16|20|24|32|40|48)px')"
report C27 "no !important" "$(gr '!important' $CSS)"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  report C28 "V1 untouched: changes only in src/v2, src/main.tsx, scripts/v2-check.sh, one package.json line" "$(v1_changes)"
else
  echo "skip C28  not a git work tree"
fi
if [ "$FAIL" -eq 0 ]; then echo "v2-check: $N checks, clean"; else echo "v2-check: $N checks, FAILED"; fi
exit "$FAIL"
```

**Conventions the guard relies on** (every builder follows them):
- **Token block:** the markers are exact; role classes are one line each.
- **Kit:** kit classes appear only in `kit/kit.css`. Each kit component is `export function Name` and appears as `<Name` in `KitPage.tsx`.
- **No "infinite" in prose:** the word never appears in comments or copy outside `KitPage.tsx` and `design-pending.ts`.
- **Declarations:** never split one declaration across lines.
- **No negative margins:** draw offsets (such as the tab underline) with positioned pseudo-elements (`bottom: -1px` is not spacing).
- **Dashed borders:** use `var(--line-provisional…)`; never write `dashed` outside the token block.
- **No literal colours** anywhere in TS, and no hex in `design-pending.ts` text.
- **Words:** status, verb and token words come from `src/v2/model/`.
- **C28 baseline:** it lists, with hashes, the uncommitted engine files that existed before this build. Builders do not edit them. CLAUDE.md and README updates happen after acceptance, outside this build.

---

## 12. The kit page (`/?kit`) and the pending-review queue

**Files** (kitpage-owned):
- `src/v2/KitPage.tsx` (default export)
- `src/v2/kitpage.css` (prefix `.kp-`)
- `src/v2/design-pending.ts`

The page imports the real kit (`./kit`), so parity holds by construction (V1's `/designsystem` copy drifted). It also imports `./model` for formatters, `tokenOf`, `contrastRatio` and the `FX_*` fixtures.

**Layout:**
- **Top bar (48):** `BrandMark` + "Countersign V2 · Kit" + `LinkButton` "Open the app" (href "/") + `LinkButton` "Compare V1 ↗" (href "/?v=1", newTab) + `Switch` "Preview reduced motion". The switch toggles `data-reduce-motion` on `<html>`, in local state only; it zeroes the durations, stops the caret and hides the fill.
- **Body:**
  - A 200px sticky index of `LinkButton`s to the board anchors, hidden below 1100.
  - A boards column (max 1080, gap 24).
  - Each board: paper, 1px line, radius md, padding 24, `id="board-<name>"`, a t-heading name, a t-meta ink-3 spec line (the tokens used), and a state grid (cells 1fr, each with a t-meta ink-3 caption).
- There is no primary on this page outside the Button board specimens.
- Popover specimens use `specimen` (Tip, Menu, Palette). Hover/focus/active specimens use `force`.

**Boards, in order:**
1. Type roles: 12 specimens with size/line/weight/tracking.
2. Colour roles: 40px swatch (`background: var(--token)`) + token name + contrast vs paper, canvas and sunken, read live via `getComputedStyle(document.documentElement).getPropertyValue(name)` → `contrastRatio` → `fmtRatio`.
3. Lines: hairline / control edge / provisional (3 variants) / state (accent and ink).
4. Radii · Spacing · Elevation (`--shadow-pop` specimen).
5. Motion: token table + a "Replay" `Button` re-keying the `v2-enter`, `v2-flash`, `v2-ink` and `v2-fill` specimens.
6. Button: 4 variants × rest/hover/focus/active/disabled × sm/md, plus with-kbd and with-icon.
7. IconButton · LinkButton (including provisional and disabled) · Kbd (plain and onAccent).
8. Token: APPROVE/ESCALATE/DECLINE/REJECTED × solid/muted/struck. Chip: neutral/accent.
9. StatusGlyph / StatusLabel: all 18 states with their words.
10. Tip (`specimen`) · Cite (rest/hover/active) · EvidenceTag (4 classes).
11. TextArea (rest/focus/invalid/disabled) · AmendField (view/amended/editing) · TextInput · Checkbox (off/on/locked/focus) · Switch (off/on/focus/disabled).
12. Tabs · Menu (`specimen`, with a keyboard-active row) · Palette (`specimen`, with an active row) · FilterChips · ConfirmStrip (neutral and bad).
13. Meter: risk at 28/58/82 with tick 75; cushion at −42.8/−6.5/+5.0/+42.0.
14. Table: header, row, end-aligned figures, group 32, toggling group 40 with trailing, span row, indented row, highlighted, muted, detail row, flash, stacked (fixed 360px frame).
15. Redline · MarginNote (breach open, watch open, low-confidence, evidence check, returned, restructure info, signed-over, active).
16. SectionHead (pending/drafting/done/excluded/error, flash) · Disclosure (closed/open) · JsonBlock + CopyButton.
17. KeyFigure (ink/warn/bad, with dot) · KeyFigures strip (from `FX_FILE_ATLAS_GATE`).
18. Slider: Atlas debt zones with labelled boundary (from `FX_STRESS_ATLAS`).
19. SignatureLine: agent pre-signed; reviewer open / countdown / held / signed (with "Replay" re-running the ink) / signed-auto / rejected / returned.
20. Caret: the single live loop specimen.
21. EmptyNote · DropZone (rest/over/disabled) · LiveRegion (shown as its message in a caption).
22. Pending review (`id="pending"`).
23. Previously rejected (`id="rejected"`).

**`design-pending.ts`:**

```ts
export interface PendingPattern {
  id: string;                    // 'P-01' (also used in data-pattern="P-01")
  type: 'interaction' | 'layout' | 'component' | 'token' | 'ia' | 'motion' | 'copy';
  name: string;
  description: string;           // what, why, and how it differs from V1; no em dashes, no hex
  evidence: string;              // mobbin_url / DESIGN.md / research reference
  proposedBy: string;            // 'V2 spec · case-file'
  proposedDate: string;          // '2026-10-17'
  status: 'awaiting' | 'approved' | 'rejected';
  kitAnchor: string | null;      // '#board-signatureline'
  ownerNote?: string;            // owner's reason when approved/rejected
}
export const PENDING: PendingPattern[];
export const REJECTED_BEFORE: { name: string; note: string }[];
```

**Pending review section:**
- Heading "Pending review" + t-small "20 patterns · 0 approved".
- Table: Id 64 | Pattern 1fr (name t-strong + description t-small ink-2 + evidence t-meta ink-3) | Type 104 | Proposed 160 ("V2 spec · case-file · 2026-10-17") | Status 160 | View 96 (`LinkButton` "View in kit" → `kitAnchor`, or "–").
- Status: `pending` glyph + "Awaiting approval" / `pass` + "Approved" / `rejected` + "Rejected". Rejected rows add the owner's note.

**Seed entries** (all `status: 'awaiting'`, `proposedDate: '2026-10-17'`):

| Id | Name | Type · anchor | Description notes |
|---|---|---|---|
| P-01 | Countersignature line with ink, inside the gate | interaction · #board-signatureline | The one signature interaction |
| P-02 | Two-press sign: the first A brings the line into view | interaction · – | Nobody signs a line they cannot see |
| P-03 | Margin notes aligned to their section by grid rows | layout · #board-marginnote | |
| P-04 | Evidence classes: Quoted ¶ / Derived / Unquoted / Model output | component · #board-evidencetag | |
| P-05 | Inline amend with redline on the covenant row | component · #board-amendfield | |
| P-06 | Drafting caret as the app's only loop | motion · #board-caret | |
| P-07 | Signed cushion with a centred-tick meter on one ±50% scale | component · #board-meter | Fixes V1's HeadroomBar |
| P-08 | Sealed file state: counted notes become "signed over" | interaction · – | |
| P-09 | Exhibits derived from attached stress tests | ia · – | |
| P-10 | Policy checks printed on every gate + ink-coloured policy switch | component · #board-switch | |
| P-11 | Auto-countersign countdown fills the reviewer line | motion · #board-signatureline | Description must say: the fill is a one-shot progress line inside the gate and resembles the previously rejected full-width progress line; the owner should judge it explicitly |
| P-12 | Source as an on-demand spine (push ≥ 1432px, overlay below) | layout · – | |
| P-13 | "You opened n of N" tally (explicit actions only, never blocks) | copy · – | |
| P-14 | One structure line colour (1.46:1); control edges use ink-3 for WCAG 1.4.11 | token · #board-lines | Records the control-edge exception |
| P-15 | Tooltip primitive replacing native title | component · #board-tip | Research preferred native title; the owner method asks for a primitive |
| P-16 | Desk list replaces the Deals board; the Agents screen is cut | ia · – | Re-homed into Ledger actors, Book cadence and Desk stages |
| P-17 | No toasts: every side effect is shown in place | ia · – | |
| P-18 | Kit page served at /?kit instead of /kit | ia · – | No server rewrites; V1 stays at /?v=1 |
| P-19 | Inline confirm strip for run-discarding actions (Stop, Start anyway), never a modal | component · #board-confirmstrip | |
| P-20 | Countdowns only run where you can see them | interaction · #board-signatureline | Leaving the file or hiding the tab holds the plan and auto-countersign countdowns |

**REJECTED_BEFORE** (rendered as a plain list):
- serif document voice
- dimming the stream at the gate
- full-width plan progress line
- teal left spine on the what-if panel
- sparklines / trend column
- glass composer and composer kbd hints
- view-transition theme reveal
- filter bars, sortable columns, date pickers, donuts, pipeline totals, bulk acknowledge

---

## 13. Acceptance criteria

### Global
1. `npm run build` (`tsc --noEmit && vite build`) is green.
2. `npm run v2-check` prints `v2-check: 28 checks, clean` and exits 0.
3. Zero console errors and zero warnings (including React `validateDOMNesting`) on a **fresh load** of `/`, `/?kit` and `/?v=1`, and through every walkthrough below, with the tab focused. Background tabs throttle timers, and the countdowns intentionally hold when the tab is hidden.
4. `/?v=1` renders V1 exactly as before: the dark theme toggle works, the nav works, and no V2 styles are present.
5. `/` renders V2 with no V1 styles: no stylesheet rule from `index.css`, for example no `.gate` selector.
6. Outside `src/v2`, only these change: `src/main.tsx`, one `package.json` line and `scripts/v2-check.sh` (C28, including the baseline hashes).
7. On **app routes**, at every moment there is at most one visible `.k-btn--primary` and at most one running infinite animation; the dev probe never fires. The kit page is exempt.
8. No computed font-weight other than 400/500/600 and no font-family other than Inter in V2 (DOM spot check).
9. Layouts are verified at 1440×900 and 1280×800, with no horizontal scroll at 1024, 760 and 390.
10. The ink stroke draws progressively in both Chrome and Safari. If not, apply the `getTotalLength()` fallback inside SignatureLine.

### Walkthroughs (golden values in Appendix A)
- **Atlas: amend, revert, send back, countersign.**
  1. Desk → Draft memo → the file opens in plan review; the countdown runs on the file → Hold → Start drafting.
  2. The page drafts with one caret. "Go to drafting" scrolls to it.
  3. The ¶02 cite outlines "$128.4M" with "1 of 4", and the stepper walks all 4 spans.
  4. The gate shows "2 notes to review" and the primary "Countersign escalation". The policy line reads "Auto-countersign is off. Every file waits for you."
  5. Amend leverage to 4.30 → the row reads "Pass · as amended", and the primary reads "Countersign as amended" with an [APPROVE] token. Revert.
  6. S with an empty note → hint + focus.
  7. Draft from notes → chip "agent-drafted · unedited"; edit → "edited by you"; S → recede → Revision 2 drafts.
  8. Rev 2 redline: Total debt $96.3M → $90.3M; leverage 4.26x → 4.00x; ESCALATE → APPROVE. Primary "Countersign revised structure". The policy checks show "2 flags on record" and "Revision 2" failing, while the signed-over list says there are no notes. Both are correct and named differently.
  9. A (line off-screen) scrolls only. A again → ink → sealed: "The agent recommended APPROVE on the revised structure. You countersigned."
  10. The Ledger shows "Returned for revision" then "Countersigned", both by Reviewer, with note provenance. The suspension is by Credit Analyst.
- **Meridian: auto-countersign, visible only.**
  1. Policy on → Draft memo → stay on the file. At the gate the doc bar reads "Auto-countersign in 5 s · clean-approval policy", and the line fills over 5 s → "/auto/ clean-approval policy", with no ink. Ledger actor "Policy"; provenance "written by the clean-approval policy".
  2. Second run: switch to the Book during the countdown → return → "Held · you left the file", and nothing was signed.
  3. Third run: type in the note → "Held · you started reviewing".
  4. With the gate reached while on the Desk, the countdown starts only when the file is opened.
- **Cobalt: return, then reject.** The gate shows "signs over 5 notes, including 4 covenant breaches". Return → rev 2 shows "Search exhausted policy limits…" and DECLINE stands. Reject with a reason → the REJECTED token on the line; the Ledger shows "Rejected".
- **Atlas countersigned ESCALATE without amendment** (rev 1, policy off):
  1. The routed line appears.
  2. The Book shows "From your countersignature · CAM-2026-0417…".
  3. Mark handed off → "Marked handed off to senior review · hh:mm".
  4. The Ledger shows the routed and handed-off rows, and the raise happens once per run.
  5. Amending to 4.10x (still ESCALATE) and countersigning **does** route. Amending to 4.30x does not.
- **Upload** (`q3_cim.pdf`):
  1. The parsing row appears on the Desk. Every Draft memo / Re-run is disabled with "Extraction in progress · q3_cim.pdf"; the palette has no start command.
  2. The file opens. Leverage is **Quoted**.
  3. Low-confidence notes anchor to §2 Risk (70%), §3 Peers (68%, if included) and Recommendation (73%).
  4. The doc bar shows "Extraction 76%" in warn-ink. Policy is not eligible.
- **Browsing never aborts:**
  1. While Atlas is at the gate, open Meridian's file and the Book → Atlas is still awaiting.
  2. "Draft memo" on Meridian shows the confirm strip, and "Keep Project Atlas" leaves Atlas untouched.
  3. Stop on Atlas shows the stop confirm. Confirming makes Atlas read not-started with the cancelled note, and its earlier sealed record is still in the Ledger.

### Per screen
- **Desk:**
  - Groups and stages match §7.1, with exactly one primary, and only when a file awaits.
  - The leverage tone comes from the covenant threshold.
  - The drop zone is keyboard reachable and disabled with the right reason.
  - The parsing row ticks without animation.
- **Case file:**
  - Every §1 figure has exactly one evidence class. Atlas: 4 Quoted, 1 Derived "96.3 ÷ 22.6", 3 Unquoted.
  - Notes sit in their section's margin cell and link to covenant rows on hover. The stepper cycles counted notes only.
  - A key-figure click opens the stub's Record and cues the row.
  - `?at=` scrolling works for every FileAt (targets are page cells).
  - Below 1000px the notes render inside the paper.
  - There is exactly one Caret during a run and none otherwise.
  - Ask is disabled on non-live files and intercepts "what if leverage was lower" locally.
- **Decision blocks:**
  - Labels, attestations, policy lines and checks match §10 exactly for Atlas, Meridian, Cobalt, amended and revised.
  - Verbs are dead during the recede and after signing.
  - Ink animates only on the signing transition.
  - Exhibits come from `auditHistory`. Attach is disabled at base and for any already-attached scenario of the run.
  - Stress boundary labels equal the nearest-flip numbers.
- **Book:**
  - Sub-row figures update each sweep, from live readings, never the reason text.
  - Tightest = the minimum cushion. Tests count watch as passing.
  - Verdict, cadence and Sweep now behave as specified. There is no primary.
- **Ledger:**
  - Runs are grouped with the decision pinned. Actors come from the closed set. The suspension is by Credit Analyst, and an unattended plan start is by Credit Analyst.
  - The filter chips filter.
  - Monitor rows never change after being written.
  - The expanded row shows the raw label.
  - The session export includes the actor per event, `monitorLog` and the snapshots.
- **Kit page:**
  - Every kit export is rendered (C20), in every state listed in §12, with popovers via `specimen` and no focus stolen.
  - The pending table renders all 20 entries as "Awaiting approval".
  - Contrast values come from live tokens.
  - The reduced-motion preview stops the caret.

---

## Appendix A: golden values (computed from the engine, read-only)

| Fact | Atlas | Meridian | Cobalt |
|---|---|---|---|
| Recommendation (filed) | ESCALATE (1 breach, risk 58, B2) | APPROVE (0 breaches, risk 28, Ba2) | DECLINE (4 breaches, risk 82, Caa1) |
| Covenant cushions (filed) | Lev −6.5% · Int +5.0% · FCC +7.3% · Liq +42.0% | Lev +30.0% · Int +140.0% · FCC +77.3% · Liq +120.0% | Lev −41.5% · Int −30.0% · FCC −13.6% · Liq −35.0% |
| Flags on record rev 1 / counted notes | 2 / 2 (1 breach + thin FCC headroom) | 0 / 0 | 5 / 5 (4 breaches + commodity watch) |
| Plan steps (default, peers included) | 5 steps · 5 tool calls | same | same |
| Nearest flip | "Nearest flip · Total debt ≤ $90.4M (−$5.9M) → APPROVE" | "Nearest flip · Adj. EBITDA ≤ $17.6M (−$7.6M) → ESCALATE" | "No single driver reaches APPROVE in range · nearest change: Total debt ≤ $98.3M (−$13.7M) → ESCALATE" |
| Cure (send-back) | $6.0M equity, all paydown → debt $90.3M, leverage 4.00x (3.9956), interest coverage 2.24x, risk 55 B2 → APPROVE. Rev 2 flags = [restructure info, send-back] → flags on record 2, counted 0 | n/a | none within 35% of debt ($39.2M) → DECLINE stands; rev 2 counted notes 6 (adds no-cure) |
| Amend | ≤ 4.30x → 0 breaches → APPROVE (not routed); ≤ 4.10x → still ESCALATE (routed); liquidity ≥ $15.0M → 2 breaches, ESCALATE | no change | still DECLINE |
| Auto-eligible (policy on) | no (ESCALATE, 2 flags) | **yes** (APPROVE, 0 flags, rev 1, key figures 94%) | no |

**Nearest-flip algorithm** (`nearestFlip`, shared with `stressZones`):
1. For each driver in `driversFor(deal)`, scan from base in both directions in steps of `(max−min)/400` until `evaluate(...).recommendation` differs from base.
2. Bisect 50 iterations between the last same-value point and the first different point.
3. Snap the boundary to display precision (0.1 for $M, 0.05 for rate) toward the flipping side.
4. Confirm with `evaluate`, stepping one more unit if needed.
5. Candidate distance = |snapped − base| / |base|.
6. If base is not approve: take the nearest candidate whose new recommendation is APPROVE. If there is none: "No single driver reaches APPROVE in range · nearest change: …" with the nearest candidate of any kind.
7. If base is approve: take the nearest candidate of any kind.
8. The comparator is "≤" when the flip lies below base and "≥" when above. The delta is formatted with `fmtSigned` on the snapped value.

**Uploaded deal confidences (−0.18 vs curated):**

| Tool | Confidence | Flagged? |
|---|---|---|
| Document Intelligence | 76% | no; warn tone; key figures 76% |
| Risk Engine | 70% | flag |
| Peer Benchmarks | 68% | flag |
| Covenant Tester | 79% | no |
| Structuring Engine | 72% | flag |
| Memo Builder | 73% | flag |

Every upload body has 3 paragraphs and states its leverage ("…, or 4.99x leverage."), so leverage is Quoted.

## Appendix B: V1 capabilities and where they went

| V1 capability | V2 home |
|---|---|
| Streaming reasoning, collapse-on-complete, show-all toggle | Drafting note + caret in the section, folding into the margin "Reasoning" disclosure; "Show all reasoning" persisted as `v2.showReasoning` |
| Pinned auto-follow + "live · N new" pill | **Cut, with reason:** the memo is a document and the reader owns the scroll. Replaced by "Go to drafting" in the doc bar plus the tab title progress |
| Tool inspector (args/result/copy/confidence/duration) | Margin stub "Record" with a persistent CopyButton and measured duration |
| PlanBar | Merged into the doc-bar sentence and section heads (cut as a component) |
| Intent gate (optional step, locked required, countdown ÷ speed floor 3s, held state lifted, plan-as-edited, unattended attribution) | Contents checklist; the countdown now runs only on the visible file |
| Approval gate (A/R/S + guards, note required to refuse, leaving guard, palette signs the live draft) | Signature block |
| Amend terms | Inline AmendField on §4 rows |
| Send-back + cure + no-cure | Revision sections |
| Revision diff strip | The redline |
| Agent-drafted note + provenance | "Draft from notes" with chips; explicit auto provenance |
| Autonomy dial | Ink switch + policy checks on every gate + countdown on the line and in the doc bar; visible-only arming |
| Signature block + stamp + outcome banner | THE signature + seal row. Stamp ring, disc and banner cut. Next-step chips cut (doc-bar actions cover them) |
| Countersigned ESCALATE routing | Kept, refined (only an amendment that resolves to APPROVE skips routing; overrides read from the record) + Book "Mark handed off" |
| Trace-to-source, click-through cites | Kept and upgraded (¶ addresses, stepper over all quoted spans, 4 evidence classes, derived formulas) |
| Confidence badges ×5 | One neutral figure per stub; tone only below 90/75; never green |
| HeadroomBar | Signed cushion meter (bug fixed) |
| Risk gauge + coloured drivers | Risk Meter + driver tone table |
| What-if panel, flip zones, attach | Dashed stress test + Exhibits; boundary labels added |
| Portfolio monitor + escalation queue | Book (verdict line replaces the KPI tiles; grouped sub-rows with live figures) |
| Deals board, launchpad, doc-panel deal picker, upload | Desk |
| Agents roster | Cut as a screen; re-homed in Ledger actors, Book cadence and Desk stages (P-16) |
| Audit log + kind filter chips + export | Ledger with FilterChips (by actor and kind) + Export session; Export file per sealed file; append-only monitor log |
| Composer Q&A | "Ask about this file" in the header margin (live file only); attach cut (Desk drop zone) |
| Command palette, ⌘K/⌘↵, tab title, speed | Kept; `[` toggles the source |
| Toasts | Cut (side effects in place) |
| Dark theme, theme toggle, nav rail | Cut (light only; top-bar tabs) |
| Count-ups, seams, shimmer, pulses, glow, doc scan | Cut (one loop) |
