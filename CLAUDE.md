# CLAUDE.md

Guidance for Claude Code (and humans) in this repo. **Auto-loaded at the start of every session
in this project**, so it's the shared source of truth. Keep it current — see _Maintaining this
file_ at the bottom.

## What this is

**Countersign** — a **front-end research prototype** exploring how an autonomous
credit-analysis agent can expose its evidence, route uncertainty, pause for accountable human
judgment, and preserve an auditable decision trail. The domain is regulated finance (credit
analysis, document intelligence, covenant monitoring, audit trails); the **backend is mocked
and deterministic** (no API keys). Focus: **frontend / UX engineering**.

**On the name** — a countersignature is the second signature that makes a document binding;
the agent analyzes, a human countersigns (human-in-the-loop encoded in the name).
The GitHub repo/Vercel slugs stay `credit-analysis-agent` (renaming would break the live URL).

> All deal data is fictional; the agent and its tools are simulated.

## Run & build

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc --noEmit + vite build  (keep this green)
npm run preview  # serve the production build
```

Verify changes in the running app (browser preview) **and** with `tsc --noEmit`. Target **zero
console errors**.

## Deploy — GitHub + Vercel

It's a **static Vite SPA with no backend**, so Vercel is a zero-config, free fit.

- **Flow:** push to GitHub → import the repo in Vercel → it auto-detects Vite (build command
  `npm run build`, output dir `dist/`) → every push to `main` auto-deploys, and PRs get preview
  URLs.
- **No env vars / secrets** needed (backend is mocked). `.gitignore` excludes `node_modules/`
  and `dist/`.
- **Repo:** https://github.com/chang627627/credit-analysis-agent (public, `main`).
- **Live:** https://credit-analysis-agent.vercel.app ✅
- **Status:** deployed on Vercel, GitHub integration connected — **push to `main` auto-deploys**;
  PRs get preview URLs. Production deployment is public (no deployment protection).

## Architecture — the spine

The whole app is a **reducer over a typed event stream**:

```
runCreditAgent()  ──AsyncGenerator<AgentEvent>──►  useCreditAgent (reduce)  ──►  components
   (the loop)                                         (React state)            (dumb views)
```

- **`src/agent/runAgent.ts`** — the agent loop (`async function*`): plan → stream reasoning →
  call tool → observe → **derive flags (decide)** → assemble package → **human gate** → finish.
  Never imports React. A real LLM backend would emit the same events.
- **`src/agent/types.ts`** — `AgentEvent` discriminated union (the contract).
- **`src/hooks/useCreditAgent.ts`** — consumes the generator, reduces events to state, owns all
  controls (start / approve / reject / reset / selectDeal / uploadDeal / sendMessage / exportAudit).
- **`src/components/*`** — presentational. `src/index.css` — the token system. `src/App.tsx`.

Key design facts:
- **No backend.** LLM + tools are mocked with async generators + timers.
- **Human-in-the-loop:** the generator `yield`s the gate event then `await ctx.requestApproval()`
  — a Promise the UI resolves via Approve/Reject. The loop literally suspends until a person acts.
- **Design system is fully token-driven:** every color is a CSS variable; `:root` is light,
  `:root[data-theme="dark"]` overrides. Re-skinning = swapping tokens, not components.

## File map

```
src/
  agent/
    types.ts        AgentEvent union + domain types (the contract)
    runAgent.ts     the async-generator agent loop (★ the centerpiece)
    tools.ts        mocked tools; read ctx.deal (latency + data + confidence)
    mockData.ts     3 sample deals + the Deal type
    synthesize.ts   simulated extraction: a Deal derived from an uploaded filename
    responder.ts    rule-based composer Q&A over the current deal
    monitor.ts      portfolio monitoring sweep generator (drift → covenant re-test → escalate)
    policy.ts       house policy constants for the decision rule (confidence floor 0.75, decline
                    score 75, referral score 60, FCC floor 1.00x, leverage outer limit 6.0x,
                    15% headroom cushion, cure cap 35% of debt)
    whatif.ts       pure what-if sensitivity model + the shared severity-gated `decide` rule
                    (recompute covenants/headroom/risk/recommendation from editable drivers)
    util.ts         abortable sleep, uid, confidenceBucket
  hooks/
    useCreditAgent.ts   generator → reduce → state + controls
    useMonitor.ts       always-on sweep cadence → portfolio state + escalation queue
    useCountUp.ts       rAF count-up for metric/score numbers
  components/
    Header, NavSidebar, DocumentPanel, PlanBar, AgentStream, StepCard, ToolCallView,
    Artifact, ConfidenceBadge, FlagPill, ApprovalGate, OutcomeBanner, Composer,
    CommandPalette, Toasts, PortfolioView (monitor + escalation queue), AuditView (session log),
    WhatIfPanel (what-if stress-test sliders → live recommendation flip),
    DealsView (origination pipeline board), AgentsView (agentic-workforce roster)
  App.tsx, main.tsx, index.css
.claude/launch.json   dev-server config for the preview tool
```

## Key product / UX decisions (why it is the way it is)

- **Layout = app shell:** collapsible nav rail | document/context panel | agent canvas + composer.
  (The audit-trail right panel was removed in favor of nav; audit data still exists and exports.)
- **Nav routes to real screens — every item now lands somewhere real:** Credit Analysis → the
  analysis view; **Deals → an origination pipeline board** (`DealsView`); Portfolio → the monitor;
  **Agents → the agentic-workforce roster** (`AgentsView`); Audit log → the session trail. No shell
  items left (the "Agents toasts backlog" dead end is gone). Badges show the deal count and the
  open-escalation count.
- **Portfolio layout = full-width stacked sections:** KPI strip → book table → escalation cards
  in a responsive grid. (A side-by-side table|queue split left dead space under the short table.)
- **Input model = "upload to ingest, chat to steer."** A PDF drop zone (simulated extraction) is
  the primary input; the bottom composer is for follow-ups/steering, not data entry. Avoids the
  "I typed and nothing changed" trap. The composer 📎 reuses the same ingest path.
- **Deal picker:** 3 sample deals → **APPROVE / ESCALATE / DECLINE**; the recommendation is
  **computed from the data** by the severity-gated rule (see the progress log entry): never by
  breach count — data gate → knock-out decline → exception escalate → clean approve.
- **Theme default LIGHT** (per request); dark = graphite. Both persist.
- **Nav collapse toggle is at the TOP** of the sidebar (not the bottom); folds to a ~60px icon
  rail with hover tooltips; persists.
- **Speed control** (top bar, 0.5–4×): a demo-pacing knob that divides the simulated delays;
  read live via a getter so it affects in-flight waits. ~10–13s/run at 1×, ~3–4s at 4×.
- **Design system: original "Graphite & Teal"** (below) — deliberately NOT a clone of any
  product, because this is meant to be posted publicly.

## Design language — "Graphite & Teal" (original)

An **original** token-driven design system with its own identity. It borrows only the
**universal craft principles** common to top product UIs (a surface ladder, hairline borders,
one restrained accent, soft elevation, Inter with optical/negative tracking) — **not a clone**
of any specific product.

- **Signature:** a deep **teal** accent — `#0f7d8c` (light) / `#2bb8cc` (dark) — deliberately
  distinct from the indigo-led look of tools like Linear/Stripe.
- **Light:** white + cool-neutral `#f4f6f9` surfaces, graphite-navy ink `#0f2436`, hairline
  borders, soft card shadows for elevation.
- **Dark:** graphite near-black `#0a0b0d` surface ladder, hairline borders, faint top-edge
  highlight (depth from surfaces, not shadows).
- Functional pass/warn/breach = green/amber/red (they carry meaning), kept distinct from teal.
- Type: **Inter** (loaded in `index.html`) with negative letter-spacing on headings.
- Icons: **Lucide** stroke icons (`lucide-react`) — consistent grid + weight, `currentColor` so they
  inherit the tokens (active nav item turns teal, dark/light theming for free). Replaced the old
  grab-bag of Unicode glyphs. The Countersign brandmark is identity, not an icon: since 2026-10-20 the
  owner's pick (option A) — a signature written on a line, white on the teal tile (`BrandMark` in the V2
  kit and `src/components/BrandMark.tsx` in V1, `public/favicon.svg`); it replaced the crude `◧` glyph.

Research note: VoltAgent/awesome-design-md `DESIGN.md` files (Linear, Stripe) were read as
*references for principles only*. No product's literal palette is used.

## Conventions

- TypeScript strict; use `import type` for type-only imports.
- Keep the loop pure — no React in `src/agent/`. UI is a pure function of reduced state.
- Don't add real secrets/parsing; the mock is the point. Label simulated bits as "simulated."
- New design = change tokens in `index.css`, not component markup.

## Gotchas / things to know

- **Sticky headers in a padded scroll container:** put the top padding INSIDE the sticky element
  (its background must cover the top edge), not on the scroll container — otherwise scrolled
  content peeks above it. (Fixed for `.plan`.)
- **localStorage keys:** `theme` (`light` | `dark`, default `light`), `navCollapsed` (`0` | `1`),
  `showReasoning` (`0` | `1`, collapse-on-complete override), `autonomy` (`gate` | `auto`).
- **HMR false positive:** editing a hook's hook-count mid-session can throw "change in order of
  Hooks"; it's gone on a full reload. Verify on a fresh load, not mid-HMR.
- **Driving via the preview tool:** reading the DOM synchronously right after a `.click()` races
  React's state update — read in a separate call.
- **Single-key shortcuts must reject modifiers:** the A/R gate shortcuts guard with
  `if (e.metaKey || e.ctrlKey || e.altKey) return` — otherwise ⌘A (select-all) approves and
  ⌘R (reload) rejects a memo. Caught by adversarial review; keep the guard if editing shortcuts.
- **Preview console buffer persists across reloads AND server restarts** (it's per-tab); old
  HMR-window errors linger and look current. Judge freshness by ORDER: entries before the
  "WebSocket connection failed" burst (logged when a server stops) predate the restart.
  A hook-count edit to `useCreditAgent`/`useMonitor` shows up as an App hook-order error
  (custom-hook hooks count under App) — mid-HMR only; gone on fresh load.
- **Backgrounded preview tab gets timer-throttled** (Chrome: down to ~1 timer/min) — the agent's
  simulated delays, monitor sweeps, and any in-page polling all crawl. If runs seem stuck during
  automated verification, it's throttling, not the app; verify with the tab focused.

## Progress log

- [x] Core agent loop: streaming reasoning, inspectable tool calls, confidence, audit trail
- [x] Human-in-the-loop approval gate (generator suspends on a Promise)
- [x] Light/dark theme toggle (persisted); **light is the default**
- [x] Result artifacts (metric cards, risk gauge, covenant pass/fail table), provenance
      citation, live elapsed timer, export-audit-as-JSON, suggested-next-step chips
- [x] App shell: nav sidebar (collapsible to icon rail, toggle at top, persisted), document
      panel, agent canvas
- [x] Deal picker — 3 sample deals spanning APPROVE / ESCALATE / DECLINE (computed, not hardcoded)
- [x] Input model: PDF upload (simulated extraction → deal synthesized from filename) +
      ChatGPT-style composer (rule-based follow-up Q&A over the current deal)
- [x] Speed/demo-pacing control (0.5–4×, affects in-flight delays)
- [x] Original "Graphite & Teal" design system (own teal accent + surfaces)
- [x] Fixed sticky PLAN bar bleed-through (top padding moved into the bar)
- [x] Pushed to GitHub (public): chang627627/credit-analysis-agent
- [x] Deployed to Vercel with GitHub auto-deploy → https://credit-analysis-agent.vercel.app
- [x] "2026 polish" pass (multi-lens design panel → implement → adversarial review):
      ⌘K command palette (context-aware), global shortcuts (⌘↵ run, A/R at the gate, `[` nav)
      with kbd chips, streaming-text shimmer + rotating conic "live seam" on running tool &
      gate, count-up numbers, toasts, copy-as-JSON in the inspector, launchpad empty state
      (loop diagram + one-click sample chips via `start(dealId?)`), focus-visible rings +
      aria-live + prefers-reduced-motion guard, gate auto-scroll/focus
      · Reverted on request: glass composer + composer kbd hints (back to the original flat
      bar) and the View Transitions circular theme reveal (theme switch is instant — "too
      fancy, not professional")
- [x] Portfolio & covenant monitoring screen + escalation queue (always-on sweep agent)
- [x] Click-through provenance + Audit-log screen (session trail; dead `AuditLog.tsx` removed)
- [x] Portfolio layout rebalanced — full-width stacked sections + KPI summary strip
- [x] Named the product **Countersign** (gate action relabeled "Countersign & approve")
- [x] What-if sensitivity panel (backlog #5): pure `whatif.ts` model recomputes covenants, risk
      and the recommendation from 4 editable drivers and re-runs the shared `decide` rule, so the
      recommendation flips live; base case reproduces each deal exactly. `recommendationFor` now
      delegates to `decide` (one rule for the agent and the panel)
- [x] What-if **legibility** fix (multi-agent design pass → adversarial verify → implement): the
      gate and the panel both said "Recommend · X", so users watched the static gate, slid a
      driver, saw nothing move, and thought the slider was dead. Now: gate reads "**Agent's
      decision · X**" under an "on the filed figures · final" eyebrow (clearly fixed); the panel
      puts the **sliders first** with the live result **directly beneath** them (one eye-line),
      framed **base → stressed** (ghost base pill → solid live pill + "flips/holds" tag, risk
      shown `58 → 53`), and the outcome row **flashes on every drag** (re-keyed by a `bump`
      counter) so even sub-threshold moves visibly recompute. Panel gets a teal left spine to read
      as a distinct sandbox.
- [x] **Deals pipeline board** (`DealsView`, backlog #6) + **Agents roster** (`AgentsView`) — filled
      the two nav items that didn't lead anywhere (Deals duplicated Credit Analysis; Agents toasted
      "backlog"). Deals is an origination kanban (Screening → In analysis → Awaiting countersign →
      Decided) whose stage is **derived from real run state** (the live deal flows across as you run
      and countersign; decided deals read from `auditHistory`) — verified live. Agents surfaces the
      **three agents that actually run** (Credit Analyst · Portfolio Monitor · Document Intake) with
      live status from `useCreditAgent`/`useMonitor`, KPIs, and a recent-runs feed. IA is now clean:
      Deals = pipeline, Portfolio = monitoring, Agents = the workforce.
- [x] **Mobbin design audit** (visual reference research → multi-agent ground-vs-code + adversarial
      "worth it?" judging). Verdict: the core (loop, gate, provenance, what-if) already matches/beats
      best-in-class; most SaaS "best practices" (sortable tables, pipeline $-totals, filter bars, run
      chrome) are scale-driven clutter for a 3-deal demo → **rejected**. Shipped the two wins that
      passed: (1) **risk drivers → color-coded factor list** (impact phrase → `good/warn/bad` pill, so
      a severe-leverage driver no longer reads the same gray as a favorable margin); (2) **leverage on
      each Deals card** (mono chip, red past the 4.0x covenant) for at-a-glance severity-within-tier.
- [x] **Icon system → Lucide (app-wide)**: replaced the inconsistent Unicode glyphs with
      `lucide-react` stroke icons — `currentColor` + `strokeWidth 1.75`, idle muted → active teal,
      themes for free. Sidebar (FileSearch / SquareKanban / Activity / Bot / ScrollText / Settings),
      header (Moon·Sun), composer (Paperclip·ArrowUp), agent cards (match nav), Deals upload,
      Artifact (FileText memo · Link2 provenance + citemarks), OutcomeBanner (CheckCircle2·XCircle),
      AuditView row icons, Portfolio escalation icons. First runtime dependency; tree-shakes to ~2KB
      gzip. The Countersign brandmark stays (identity; now the signature-on-a-line tile). Sidebar collapse toggle uses
      **ChevronsLeft·Right** (`«`/`»`) — the earlier PanelLeft icons read as confusing.
- [x] **Systemic dark-mode text fix**: the global `button {}` reset only inherited `font-family`,
      not `color`, so any unstyled `<button>` fell back to UA-default black → invisible on dark
      surfaces (surfaced as unreadable deal-card names). Fixed at the root: `button { color: inherit }`.
- [x] **"2026 polish" token pass** (Linear/Vercel/Stripe principles via awesome-design-md +
      judgement — calibration, not trend-chasing; no void-black/120px-display clichés): icon weight
      down to **1.5** (one `.lucide { stroke-width }` knob — fixed the "fat" Moon crescent);
      **radius 12→10 / 8→6** (crisper); **flatter light shadows** (lean on hairline borders);
      **type** — `font-optical-sizing: auto`, Inter `cv11` single-story `a`, grayscale smoothing,
      heading tracking −0.024em. All token/base changes (no component rewrites); verified both themes.
      Deferred Tiers 4–5 (motion-curve unification, accent-usage audit) as optional follow-ups.
- [x] **Escalation button frames unreadable (dark mode)**: the ghost "Acknowledge" button is
      `background: transparent`, so on a tinted (`--bad-soft`/`--warn-soft`) escalation card its
      `--border-strong` frame vanished against the tint. Fix: `.esc__actions .btn` gets a solid
      `var(--panel)` surface so the frame reads on any card. (Gotcha: transparent/ghost buttons on
      tinted surfaces lose their frame in dark mode — give them a solid panel background.)
- [x] **Dark-mode contrast audit** (8-agent workflow → synthesize, grounded in the real dark tokens
      + WCAG ratios). Fixed 12 issues, all token-based: `color-scheme: dark/light` on the roots
      (native sliders/scrollbars were glaring light-grey); lifted dark `--text-faint` #636a76 → #777e8a
      (micro-labels/timestamps below AA app-wide); added a `::placeholder` rule (was UA-default grey);
      borrower names + escalation timestamps → `--text-dim` (faintest on tinted breach/watch rows);
      `fcard--good`/`plan__item--done`/`acard__status--good|bad` got solid colored frames (16%-alpha
      borders were invisible); covenant dots got a hairline ring; step spine + gauge track →
      `--border-strong`. (Gotchas: in dark, a 16%-alpha-soft border is invisible — frame with the
      solid colour; native form controls need `color-scheme` or they render light.)
- [x] **"2026 polish" Tiers 4–5** (the deferred ones): **Tier 4 (motion)** — all 14 `transition:`
      declarations tokenized to ONE curve (`var(--ease-out)` = cubic-bezier(.22,1,.36,1)) + the
      `--dur-*` tokens, keeping the two intentional exceptions (0.06s button press, linear
      slider-follow); hover micro-states were already complete on every interactive element.
      **Tier 5 (accent audit)** — categorised all 33 `--accent-text` usages: 31 are legitimate
      (active nav/deal/row, live/running indicators, links, hover, focus, status, identity,
      categorical tool/human), teal is 100% token-driven (no hardcoded hexes outside a doc
      comment), and the brand is deliberately teal-forward ("Graphite & Teal") — so NO changes
      were warranted. A clean audit is the result; stripping teal would fight the brand.
- [x] **Escalation card button alignment**: action buttons sat at different heights across a row
      (reason text varies 1–2 lines). Made `.esc` a flex column + `.esc__actions { margin-top: auto }`
      so buttons pin to the bottom of the already-equal-height grid cells (short cards get empty
      space above — consistency over compactness, per request). Guarded `.esc--acked` back to
      `flex-direction: row`. (The Agents cards were already aligned via the same pattern.)
      Then made the whole grid uniform — `grid-auto-rows: 1fr` on `.queue__items` (+ `.agents__grid`)
      so EVERY card is the tallest card's height, not just equal within a row (rows were ragged).
      Also made the agent-card KPI tiles (`.astat`) `flex: 1` so they're equal-width and fill the
      row (were content-sized → ragged: "OPEN ESCALATIONS" wider than "SWEEPS"); single-stat cards
      get one full-width tile. Consolidated a duplicate `.astat__v` + added ellipsis for long values.
      Then aligned the KPI tiles ACROSS cards: reserved the description block (`.acard__desc`
      `min-height: calc(1.55em * 4)`) and gave `.acard__head` a `min-height: 52px` (the head varied
      because a wider status pill wraps the agent name to 2 lines); `.acard__type` capped to one line.
      Net: heads/tiles/buttons all share the same Y across cards regardless of name-wrap or
      description length (verified kpisTop + actionsTop identical across all three cards).

- [x] **The five gate/audit fixes** (self-audit found the design's real problems at the
      workflow-semantics layer; all five shipped and verified live, both themes):
      **(1) Reviewer note at the gate** — the human was the least-documented actor in a product
      about documentation. The gate now has a note field: optional to approve, REQUIRED to
      reject/send back (empty → inline hint + focus, no blind action; the R shortcut routes
      through the same flow; the palette's one-keystroke Reject was removed). The note rides the
      gate resolution (`GateDecision { verb, note }`) into `run_finished`, the audit trail, the
      outcome banner (italic quote) and both JSON exports. A/R shortcuts moved INTO ApprovalGate
      (mounted = active; same modifier/typing guards).
      **(2) "Send back for rework"** — the third gate verb. The generator does NOT finish: the
      gate loop re-enters, appends a "Revise per reviewer note · rev N" plan step
      (`plan_updated` event), streams revision reasoning, re-runs the Memo Builder with
      `reviewerNote` in its args, converts the note into a tracked needs-human flag on the memo,
      and re-suspends at a "revision N" gate. Verified through TWO consecutive send-backs + a
      countersign in one run. Reject stays terminal ("the deal is bad"); send-back = "the work
      needs another pass".
      **(3) Countersigned ESCALATE routes somewhere** — App effect raises a deduped
      (`origin: 'countersign'`) item into the monitor's escalation queue via a new
      `monitor.raise()`; outcome banner says so + "View escalation queue" chip; audit log
      sources it as "countersign routing". ESCALATE no longer evaporates.
      **(4) Confidence legibility** — `LOW_CONFIDENCE_FLOOR = 0.75` (one constant shared by the
      badge bucket, the flag rule, and the UI copy). The loop now REALLY flags any observation
      below the floor (needs-human); uploaded/synthesized deals get −0.18 confidence (unseen
      docs parse worse) so the rule visibly fires on the upload path. Badge tooltip + a
      one-line explainer under the gate metrics state the actual thresholds.
      **(5) What-if scenarios attach to the record** — "Attach scenario to audit trail" button
      (disabled at base / after attaching the same scenario) logs a `whatif`-kind audit entry
      (drivers changed, risk/breach/recommendation deltas) with its own FlaskConical icon +
      filter chip in AuditView; sensitivity analysis is no longer screen-only.

- [x] **UI elevation pass** (multi-lens design panel: 2 ground auditors → 5 idea lenses → 3
      adversarial judges over 32 ideas; then implemented in 3 chunks). SHIPPED:
      flip-zone slider tracks (pure `flipZonesFor` sweep paints APPROVE/ESCALATE/DECLINE zones
      + boundary notches under every what-if slider — gapless: each zone paints through to the
      next zone's start); covenant **headroom bars** (shared `HeadroomBar`, distance-to-threshold
      with tick + "0.26x over / $4.2M room" captions, in the memo artifact AND the live what-if
      table); **trace-to-source** (every gate metric is a button → scrolls to + opens + flashes
      the tool observation that produced it; `KeyMetric.source`); **honest confidences** (gate
      metrics read real per-tool confidences via `confByTool`, no more hardcoded 0.90–0.96);
      gate-arrival choreography (seam ignites one fast sweep → slow idle; glow pulses ×2 then
      RESTS; `.gate:focus-visible` ring); **countersign stamp** + **Signature Block** (agent line
      pre-signed `/s/ Countersign`, human line draws an SVG ink flourish on approve / DECLINED
      stamp on reject, timestamp label); **revision diff strip** at the gate (reviewerNotes
      thread as +gutter diff rows); **rework rewind** (gate recedes 320ms before the loop resumes;
      amber revision plan item slides in); plan cascade (items stagger in, keyed by `runId`);
      reader-respecting auto-follow (pin-to-bottom only while pinned — INSTANT scrollTop jumps,
      never smooth: a smooth follow reads its own animation frames as reader scroll and unpins
      itself — plus a sticky "live · N new" pill) + ambient tab title (● Step 2/4 / ⏸ Awaiting
      countersign); tool-inspector unfold (grid-rows 0fr→1fr + `inert` when closed; collapsed
      padding must collapse WITH the row or it leaks the first line); Lucide sweep for remaining
      stream/button glyphs.
      **REJECTED by the user (do not resurrect):** serif "document voice" for the CIM (one
      typeface everywhere); dim-the-stream-at-the-gate hover effect; the plan progress line
      (full-width teal rule at 100%); the what-if teal left spine (replaced with a DASHED
      hairline frame = scratchpad semantics).
- [x] **Send-back now produces a signable revision** (the "get a new one that can pass"
      scenario): a send-back is treated as authorization to restructure within policy —
      `findCure` in whatif.ts pure-searches the smallest sponsor-equity contribution (paydown /
      liquidity split, capped at 35% of debt) that makes the SAME `decide` rule return approve;
      a new `propose_restructure` tool ("Structuring Engine") runs it in-stream with a
      restructure artifact; `buildRevisedPackage` re-gates on the REVISED figures
      (`pkg.restructure`, eyebrow "On the proposed revised structure · rev N", metrics trace to
      the Structuring Engine). Atlas flips ESCALATE→APPROVE on exactly $6.0M equity (leverage
      lands on 4.00x — minimal cure); Meridian reaffirms; **Cobalt provably has no cure within
      the cap** → honest "search exhausted policy limits" warning and the DECLINE stands.
- [x] **Component polish pass** (5-lens pure-visual audit, 38 fixes applied): full cross-engine
      custom range-slider chrome (track/fill via `--fill` inline var, ringed thumb, hover/focus
      ring — the last UA-default controls); micro-icon stroke restored (CSS `stroke-width`
      OVERRIDES the svg attribute, so the global 1.5 knob was flattening ≤13px icons — fixed
      with `[width="10"–"13"] { stroke-width: 2 }`); radius fully tokenized (+`--radius-xs`);
      sub-10px type floor raised to 10px; eyebrow tracking converged to 1.2px; weights 800/650→700;
      rise curves unified on var(--ease-out); `fill-mode: both` → `backwards` on card entrances
      (both PINS the final keyframe transform forever and kills hover lifts); gate metrics
      one-row-of-5 / financials one-row-of-6 via container queries; FlagPill/chips/export/deals
      glyphs → Lucide; meter rails on --border-strong; composer focus/hover parity; tabular-nums
      completion.
- [x] **Adversarial review of the elevation diff** (3 find lenses → skeptic verification; 11
      candidates → 5 confirmed, all fixed): (1) the 320ms gate-recede window left A/R keys +
      palette approve LIVE — an approve there silently discarded the send-back and recorded the
      rework note as the countersign note (guarded: keydown + buttons + palette all respect
      `leaving`); (2) smooth auto-follow unpinning itself (→ instant jumps); (3) stale trace
      target re-opening inspectors on the next run (cleared on `runId` change); (4) the
      reduced-motion guard didn't zero `animation-delay` (staggered items appeared late — added);
      (5) flip-zone sampling left unpainted boundary bands (gapless painting + 140 samples).
      Also fixed live: reset/selectDeal/upload now restore the default plan (rework grows it).

- [x] **"2026 conventions" wave** (web-researched against the mid-2025→Aug-2026 agent-product
      field — Claude Code/Cursor/Devin/Jules/Copilot/LangGraph/Sierra/Harvey/Hebbia — then the
      four gap-closers implemented + adversarially reviewed; 27 confirmed findings fixed):
      **(1) Intent gate** — `start()` now opens a plan-review checklist (`PlanReview`, status
      `plan_review`): optional steps toggleable (new optional step `benchmark_peers` +
      "Peer Benchmarks" tool + comparables artifact), required steps locked, cancellable
      auto-start countdown (÷speed, floor 3s); `approvePlan(ids, {auto})` stamps the approved
      composition into the audit trail — countdown starts log as `info` "Plan auto-started ·
      unattended countdown", NEVER as a human decision; skipped steps ghost in the PlanBar and
      the loop `continue`s them; ⌘↵/palette approve the plan AS EDITED (state lifted to App so
      view-switch remounts keep exclusions and a held countdown stays held); approvePlan
      consumes `pendingDealRef` atomically (countdown+click can't double-launch).
      **(2) Collapse-on-complete** — finished steps' reasoning folds to a data-derived summary
      + duration chip (`stepSummary`), per-step re-expand, "show all reasoning" toggle
      persisted; running step stays streaming.
      **(3) Edit-before-approve ("countersigned as amended")** — gate "Amend terms" block:
      leverage ceiling + liquidity floor inputs preview `amendedOutcome` (whatif.ts — same
      `decide` rule on filed actuals, verified numerically: Atlas 4.30x waiver→APPROVE, 4.10x
      holds, tighter liquidity honestly ADDS a breach, Cobalt uncurable); approve carries
      `GateDecision.amendments` → banner/audit/signature read "countersigned as amended";
      NaN-proof inputs (cleared → terms as filed); closing the editor DISCARDS overrides
      (hidden amendments never ride along); palette approve signs the gate's live draft via
      `gateDraftRef`; an amended-to-APPROVE escalate is NOT routed to the escalation queue.
      **(4) Autonomy dial** — header `gate all / auto-clean` (persisted): auto mode
      auto-countersigns ONLY clean first-pass approvals (APPROVE + zero flags + rev 1 + all
      confidences ≥90%) via a visible 5s countdown with the policy trace; resolves with
      `auto:true` → "AUTO · POLICY" badge, three-check "why", `/auto/` signature line distinct
      from human ink, "AUTO-countersigned" audit label. Integrity guards from the review:
      reject/rework/note-typing/amending ALL hold the countdown (a refusal attempt can never
      auto-approve); flipping policy to gate-all disarms a live countdown; an explicit hold
      survives view-switch remounts (App-owned `gateHold`).
      Verdict context: the researched synthesis rated the trust core top-decile/ahead
      (suspended gate, cure-on-rework, trace-to-source, flip zones have no public equivalent)
      and named 3 conspicuous gaps — untouchable plan, never-folding reasoning, no policy
      layer — all closed by this wave. Remaining researched wave-2 candidates: run replay
      scrubber (best architecture flex), mid-run steering (backlog #7), maker-checker critique
      pass, override-rationale + reviewer identity (EU AI Act Art. 14 / SR 26-2 hook).

- [x] **Agent-drafted reviewer note + provenance on the record** (the "should we auto-fill the
      note?" question, resolved as *draft, never pre-fill*): the gate's note row gains a
      "Draft from flags" affordance — pure `draftNoteFor` (`src/agent/draftNote.ts`) composes an
      evidence summary from the package (breaches; open needs-human items; the restructure line;
      the reviewer's own send-back thread is excluded to avoid echoing them to themselves),
      inserted ONLY on explicit click and fully editable. The decision then records
      `NoteProvenance` (`authored` | `drafted-edited` | `drafted-verbatim`) everywhere the note
      goes: live chip at the gate ("agent-drafted · unedited/edited"), `GateDecision` →
      `run_finished` → outcome banner ("— agent-drafted, accepted verbatim / edited by
      reviewer"), audit trail ("note (agent-drafted, …): …"), the send-back flag
      ("rev N · note agent-drafted, …") and the JSON export (`reviewerNoteProvenance`) — the
      automation-bias guard: the record distinguishes genuine human rationale from an accepted
      machine draft (EU AI Act Art. 14-style oversight hook). Inserting the draft holds the
      auto-countersign countdown; clearing the note resets provenance to authored. Also: the
      send-back verb got its missing `S` shortcut (+ kbd chip, same modifier/typing guards), and
      the amend-terms toggle got a real control frame — it's the fourth reviewer verb
      (approve-with-conditions), not a footnote. (Review fix caught live: App's `handleRework`
      wrapper was dropping the provenance argument on send-back.)
- [x] **Portfolio "industry dashboard" pass** (Mobbin MCP reference sweep — Xero/Square/Revolut/
      Stripe/ClickUp screens — filtered through the earlier audit's "worth it?" lens; 3 shipped,
      chart work done under the dataviz skill's stat-tile/sparkline contract):
      **(1) Sweep-history sparklines — SHIPPED THEN REVERTED by the user** ("no need the
      trend"; do not resurrect): a `Sparkline` component + Trend column drew each deal's
      leverage over the last 12 sweeps. The `PortfolioDealState.history` ring buffer (cap 12,
      `SweepSnapshot { sweepId, leverageX, health }`, rides the prev-state rebuild in
      `sweepPortfolio`) STAYS — the KPI tiles read the previous sweep's health from it.
      Same feedback restyled the covenant dots: circles → **slim status segments** (14×5px,
      radius 2, hairline ring) — status-strip grammar, not traffic lights. **(2) Stat-tile anatomy** —
      Healthy/Watch/Breach tiles gain the comparison line (▲/▼ n vs last sweep, colored by
      direction-is-bad, "· unchanged" when flat), computed from each deal's history[len-2] health
      (no new state). **(3) Next-sweep countdown** — `useMonitor.nextSweepAt` mirrors the REAL
      cadence timer; chip reads "Sweep #N · Xs ago · next in ~Ys" (→ "due"). Rejected again:
      filter bars, sortable columns, date pickers, donuts — scale cosplay at 3–5 deals.
      (Verification note: phantom gate actions during browser automation were stale-coordinate
      clicks from the driving tool, confirmed by a hands-off control run — app exonerated.)
- [x] **The real "2026" pass** (research-grounded, token-level). Pulled 15 actual `DESIGN.md` files
      (Linear, Vercel, Raycast, Superhuman, Cursor, Stripe, Revolut, Wise, Sentry, Claude, VoltAgent,
      Supabase, Warp, PostHog, Notion) and measured our CSS against them in OKLCH/WCAG. **The research
      REFUTED two intuitions** — worth remembering: (a) "borderless cards are 2026" is FALSE, 15/15
      use 1px hairlines on card edges; what left is the DROP SHADOW (7/15 ship zero box-shadows), and
      the dated tell is border AND shadow together; (b) "headings should be bigger" is FALSE in-app —
      nobody exceeds 1.5x h1:body and ours was already 1.38–1.54x. Also: their 16px body is MARKETING
      body; our 13px in-app body is correct. SHIPPED: **weight ladder shifted down one rung**
      (700 x35 → 0; now 400/500/600 — 8 references explicitly forbid 700 in UI chrome; shifting the
      whole ladder preserves every existing hierarchy decision while removing the heaviness);
      **type floor + 6-step scale** (was 17 distinct sizes incl. half-pixels 10.5/11.5/12.5/13.5 and
      113 declarations below 12px → now exactly 11/12/13/15/18/22, no half-pixels — no reference
      system has one); **--text-faint AA BUG FIXED** (#8a96a8 was **3.00:1 on white / 2.77 on --bg-2 —
      failing AA** on ~50 rules at 10px; → #66727f = 4.91/4.53. The dark audit had lifted dark and
      never re-checked light); **light card shadow removed** (`--card-shadow: none`) and the light
      hairline strengthened #e5e8ef → #dfe3ea (≈10 L below white, matching Supabase/Cursor);
      **size-dependent tracking ramp** (the global `body { letter-spacing: -0.008em }` was leaking
      negative tracking onto every 11px label → now normal, with −0.024em@22 / −0.014em@18 /
      −0.008em@15 and ZERO below 15px); **uppercase rescoped 32 → 23** (9 field-label/table-header
      rules dropped caps entirely — JSX text was already properly cased; 20 eyebrows normalized from
      8 ad-hoc tracking values to one 0.06em recipe; status tokens `.flag__tag` / `.deal__tag` /
      `.sig__declined` untouched, caps carry meaning there); **radius ladder shifted up**
      (--radius-sm is used 45x vs --radius 11x, i.e. the 6px CONTROL radius was doing CONTAINER duty
      — inverted vs 14/15 references → 12/8/6); **tabular-nums** extended to every column figure
      (Stripe: "money without tnum breaks the quiet financial-data signature"); container-query
      thresholds lowered to match the containers' real CONTENT-box widths (they measure content, not
      clientWidth, so 760/900 never fired). Verified both themes + AA recomputed in both.
      NOT changed (already at/above standard): the dark surface ladder, in-app type ratio, card
      borders, 13px body, motion tokens, accent discipline.
      **Part 2** (the half that was initially skipped): **4px spacing grid** — 148 off-grid
      padding/margin/gap values (3/5/7/9/11/13/14/17/18/19/21/22/23px) snapped to 4/8/12/16/20/24;
      the research called this the single most unanimous finding across all 15 systems and the
      clearest "hand-built" tell a design-literate reviewer spots in DevTools. Only padding/margin/gap
      were touched — never radius/width/offsets/borders. **PlanBar rebuilt as a segmented progress
      rail**: the numbered-circle-in-bordered-box wizard chips (a 2015 pattern) became a 2px state
      rail above a plain label — pending `--border` / active `--accent` / done `--good`, ordinal is
      now a plain tabular numeral, not a bubble. Reads cleaner AND halves the bar's vertical space.
- [x] **Severity-gated decision rule (shared engine, V1 + V2)** — industry-researched (credit policy
      practice: triage by severity, never by breach count). `decide()` in `whatif.ts` takes a
      structured input and returns `{ recommendation, basis, reasons, triggers, … }`; constants live in
      `src/agent/policy.ts`. First match wins: **(1) data gate** — any of extract / risk / covenant
      tools below 75% confidence → ESCALATE "verify the extracted figures" (run packages only; the
      what-if and amend previews skip it); **(2) knock-out DECLINE** — risk score ≥ 75, fixed-charge
      coverage < 1.00x, leverage > 6.0x, or a breach with no cure within the 35%-of-debt cap; **(3)
      exception ESCALATE** — a curable breach ("approve subject to $X sponsor equity or a covenant
      reset"), any covenant under 15% signed headroom, or score ≥ 60; **(4) APPROVE**. Up to four
      specific reasons with sizes ride `ApprovalPackage.decisionReasons` / `decisionBasis` into V1's
      gate and V2's Decision card. `findCure` now targets a *clean* structure (15% headroom, not bare
      compliance). Outcomes: Meridian APPROVE (30% headroom, score 28); **Atlas ESCALATE with a $19.5M
      cure** (supersedes the old $6.0M → 4.00x cure; rev 2 approves at 3.40x, score 47); Cobalt
      DECLINE (score 82, FCC 0.95x, four breaches, no cure); uploads ESCALATE through the data gate
      (Risk Engine reads 0.70). Amending Atlas's leverage ceiling can no longer reach APPROVE (its
      coverages stay under the cushion). Responder, draft note, monitor watch band (now < 15%) and the
      V1 copy read the same rule. Verified by harnesses (200 checks) + adversarial review + browser.
- [x] **DESIGN.md + the `/designsystem` catalog** — the design system documented in the
      VoltAgent/awesome-design-md (Google Stitch) format: YAML front matter with machine-readable
      token maps (`colors` = light default, `typography`, `rounded`, `spacing`, `components` with
      `{token}` refs) + the standard body sections (Overview → Colors → Dark Theme table →
      Typography → Layout → Elevation → Shapes → Components → Motion → Do's/Don'ts → Responsive →
      Iteration Guide → Known Gaps). Values extracted 1:1 from `src/index.css`; the Don'ts encode
      the session's rejected patterns (serif, dim, second accent, alpha borders in dark).
      `public/designsystem/index.html` (self-contained, served at **`/designsystem`** — it lives in
      `public/` precisely because Vite only copies that directory into `dist/`; at the repo root it
      was never deployed at all) is the visual catalog, and its section order now MIRRORS DESIGN.md
      and the awesome-design-md convention exactly: Overview → Colors → Typography → Layout →
      Elevation & Depth → Shapes → Components → Component specimens → Motion → Do's and Don'ts →
      Responsive Behavior → Iteration Guide → Known Gaps. Linked from the README (a nav-rail
      link was tried and removed on request) —
      swatches/type/shapes/controls/component specimens painted EXPLICITLY on side-by-side light
      and dark boards (scoped token re-declaration), with theme-aware page chrome. Also published
      as the "Graphite & Teal" artifact.

## V2 (branch `v2`, preview only; main and production still serve V1)

A full UI rebuild done the "Homewise V2 way" (independent Mobbin + awesome-design-md research →
5-concept judge panel → spec → parallel file-owning builders → adversarial review → fixes).
**The engine is shared and unchanged in contract**; V2 is a second pure reduction of the same
`useCreditAgent` / `useMonitor` state.

- **Run:** `npm run dev` → V2 at `/`, V1 untouched at `/?v=1`, live kit page at `/?kit`.
  `src/main.tsx` loads exactly one app + one stylesheet per page load.
- **Code:** `src/v2/` = `kit/` (closed primitive set, `.k-` classes, only place kit CSS lives) ·
  `model/` (single source of every derived number/label/sentence) · `state/` (store, gate,
  orchestration ported from V1 with every integrity guard; browser storage only here) ·
  `screens/{desk,file,chat,decision,book,ledger}` · `chrome/{SideNav,TopBar,AppPalette}`.
  Store and view types live in `state/contracts.ts` (re-exported by `state/store.tsx`),
  `model/types.ts` and `state/screens.ts`.
- **Spec:** `docs/v2/SPEC.md` (the build spec) + `docs/v2/THREE-PANE.md` (the three-pane case file
  and section hierarchy addendum). Its sections **"R4 · Owner revision (Mobbin audit fixes)"**,
  **"R3 · Owner revision"** (live drafting, the Claude Code panel) and **"R2 · Owner revision"** win
  over the rest of that file (R4 over R3 over R2) and over SPEC.md; the owner decisions below
  supersede all of them.
- **Guardrails:** `npm run v2-check` (28 greps: tokens only, 400/500/600, 4px grid, one
  infinite animation, no hand-rolled controls outside the kit, V1 + engine hashes untouched, …).
  New visual patterns go to `src/v2/design-pending.ts` (P-01 to P-37, rendered on `/?kit`) for
  owner approval; every `data-pattern` id needs an entry there, every kit export a kit-page specimen.
- **Storage** (only in `src/v2/state/`): `v2.navCollapsed`, `v2.chatOpen` (only `state/panes.ts`).
  (`v2.showReasoning` was retired with R2: reasoning lives in each card's Record.) **Auto-countersign
  is session only** (THREE-PANE R4.2, Mobbin audit fix 2): it starts off on every load and is never
  stored, as the Settings intro says of every setting; `initialPolicy()` (`state/gate.ts`) removes a
  stale `v2.autonomy` value once on load so an earlier On cannot linger.
- **Light mode only** (owner decision): no dark theme, no toggle.
- **Accent = aubergine** `#552d5e` (owner decision, 2026-10-20; hover `#471f50`, accent text `#552d5e`,
  wash `#f8ebfb`). Owner principle: **the accent stays quieter than the status colours** (approve /
  escalate / decline must be the loudest colour on the page), measured as OKLCH chroma: aubergine is
  0.094, below every status ink and mark (0.106 to 0.186). Path there: teal `#0f7d8c` sat 11.5 dE from
  the approve green (the primary verb read as "approve"); the blues `#1f4fbf` and cobalt `#2d5ed4`
  (chroma ~0.18-0.19, as colourful as the decline red) "look very obvious"; steel, dusk violet and others
  were tried. Aubergine also reads as higher-end. White on it 10.92:1. Green means pass/approve only.
  V1 keeps "Graphite & Teal". Brand mark tile and favicon follow the accent.
- **Thesis:** the credit memo is the product; the agent panel beside it is command and control.
  Owner, verbatim: 中间只搞high level。命令与指挥。显示的都看右边。("The middle is high level only:
  command and control. Everything displayed goes on the right.") Then: countersign也要移到右边去。
  ("The countersign moves to the right too.") Reference model: Claude Code (short status lines in
  the conversation, the work product in the artifact).
- **Layout — `#/file/<id>` = nav | command-and-control agent panel | memo with the Decision card**
  (P-22). Column mode at 1024px and up (panel 400px, 360px at 1024 to 1279); drawer below 1024
  (overlays the memo's left edge, no scrim, Esc closes, mutually exclusive with the source overlay).
  Explicit hide/show (`]`, the doc-bar "Agent panel" toggle, the head chevron) persists
  `v2.chatOpen`; the only automatic reveal is once at plan review (never at the gate: the decision is
  in the memo), and it never writes storage. The sidebar forces its 64px rail beside an open panel
  below 1400px without touching `v2.navCollapsed`. Pane changes are instant (no grid-width
  transition). Desk, Book and Ledger stay full width with no panel ("upload to ingest, chat to
  steer": the Desk ingests, the case file steers). The plan auto-start countdown arms only while the
  plan prompt is on screen (P-20).
- **Agent panel** (P-27, `screens/chat/`, rendered verbatim from `selectAgentPanel` →
  `AgentPanelView`): it **never displays data and holds no decision**. Head = "Credit Analyst ·
  Project Cobalt" + the collapse chevron, nothing else (no note stepper, no reasoning toggle, no run
  number). Then ONE-line status lines (t-body, ellipsis; an optional status glyph; an optional
  trailing link that scrolls the memo to its card): "Drafting the memo for Project Cobalt." · one
  line per step, updated in place ("Testing covenants" with the static drafting glyph → "Covenants
  tested · Covenants →"; "Peer benchmarks skipped") · action-worthy flags only, at most one per step
  ("4 covenants breached · Covenants →", never the flag sentence, confidences or durations) ·
  revision lines ("Returned for revision · rev 2", "Proposed a $19.5M sponsor equity cure") · the gate
  as ONE line "Your countersignature is needed · Decision →" (countdown / held variants) · Q&A: the
  reviewer's question as one "You · …" line; a **real answer about the deal is never shown in the
  panel** (P-33, THREE-PANE R4.5): it leaves ONE line, "Answered in the memo · Questions →", that
  scrolls the memo to the answer and flashes it once; command acknowledgements, refusals ("Decide in
  the memo: Decision →"), the help line and the what-if pointer ("Try it in the stress test, below
  the Decision card. · Stress test →") stay one-line replies (may clip to 2) · "You countersigned
  DECLINE · 00:52 · Record →". **Reads like
  Claude Code** (THREE-PANE R3): the conversation runs top-down from the top of the panel and the
  plan checklist (locked required steps, a checkbox on the optional one, [Start drafting ⌘↵], the
  countdown line) is a message in that flow, not pinned above the input. Only the composer is pinned
  to the foot: one frame with the round send button inside (quiet while empty, accent once there is
  a draft). No full-width rule at the panel or sidebar foot, no empty-state filler sentence. A
  skipped step's line links nowhere (it has no card). No boxes, cards, records or buttons other than
  the plan prompt's.
- **Memo pane** (right; holds everything displayed): the header on the canvas (borrower, facility,
  amount, CAM id, prepared-by, CIM paragraphs; no recommendation, and a sealed header seal is the
  who-clause only, "You countersigned.") → one paper `MemoCard` per section, 16px apart (P-26):
  1 Financials → 2 Risk → 3 Peers → 4 Covenants → (revisions) → 5 Recommendation → **the Decision
  card** → **Questions** (scratch, only while the shown run has an answered question, see below) → the
  stress test (dashed scratch frame, no card) → exhibits → the appendix. The source CIM opens on the
  memo pane's right edge (push at a pane width of 1064px and up, overlay below).
- **Answers in the memo** (P-33, THREE-PANE R4.5, Mobbin audit fix 4): the reviewer's answered
  questions are a memo block, "Questions" with the aid line "Analysis aid · not part of the memo",
  in the same dashed provisional frame as the stress test (never a `MemoCard`), after the Decision
  card and before the stress test (`screens/file/Questions.tsx`, rendering `selectQuestions` →
  `QuestionsView`, `model/select-questions.ts`). It lists the questions answered under the run the
  memo shows (`fileContext`'s runId, the same key as the file export and the Ledger; R4.11), so it
  appears with the first answer (no placeholder), a re-run starts fresh, and a cancelled re-run
  gives the sealed record its questions back; only the panel's lines follow the file's epoch. Each
  entry: the question as typed (t-strong), the full answer (t-body ink-2, line breaks kept), one
  t-meta line with the source and the time ("rule-based responder · simulated · 14:03", or
  "Countersign · deterministic" for the answers composed from the decision rule's reasons; once the
  run has more than one revision it names the one that answered, "rev 1 · superseded by rev 2",
  R4.11) and the memo card the answer concerns
  ("Covenants →"). Its anchor is `qa:<entryId>` (FileAt `'questions'`); the panel's "Questions →"
  cues it (scroll + one flash, a held highlight under reduced motion), and in column mode a new
  answer is cued the same way as it arrives (scroll only; focus stays in the composer). Only real
  answers move (`ComposerReply.memo`, set by `answerFor` on the engine responder and the
  deterministic answers, never on the stress pointer, acknowledgements or refusals);
  `ThreadEntry.qa` carries the question, the run whose package answered and its revision. The
  pairs (question, answer, ISO time, source, revision) go into the file export (`questions`, by
  run) and the session export, and the Ledger shows each as a Reviewer event of its run ("Asked ·
  “…”", the answer as its detail, the source under "Answered by" and the revision in the raw
  record; the run header's event count includes them). The thread cap drops answered questions
  last (kept up to 500).
- **Section cards** (P-26, owner: sections 1 to 4 "read as one blob"): a step eyebrow ("Step 1 of 5 ·
  Document Intelligence"; drafting / excluded / stopped show a status aside) → the title in
  `t-figure-lg` (the only 18px role in a card: KeyFigure values moved to `t-heading`, the risk score
  to `t-figure`) → a one-line model-written takeaway (`model/takeaways.ts`; facts only in steps 1 to
  4, never the call) → labelled blocks (24px apart, label 8px to its content). Flags are marked where
  they sit (breach glyph + bad-ink value, the covenant row's Breach label); a flag with no row is ONE
  marked line at the foot of its card (`SectionView.flagLines`; no notes blocks, no margin column).
  Then ONE quiet footer line, "Document Intelligence · 94% · 1.1 s", with a collapsed "Record"
  disclosure holding the tool's args in, data out and the reasoning (`SectionView.footer`; kit
  `Disclosure` `lead` puts the line and the trigger on one row). Tables stack by their own width
  (`stackBelow` 640 for covenants, 480 for financials). Each covenant Actual traces to its
  Financials row (scroll + one flash), and one the CIM does not state carries "Not in CIM" under it
  (P-32, see below). **Live drafting, no skeleton cards**
  (THREE-PANE R3): before Start drafting the memo is its header alone; a card exists once its step
  starts — it rises in once (`MemoCard enter`) with the drafting line and the app's only caret, then
  writes itself in when its step returns (`MemoCard reveal`: takeaway, blocks, table rows, flag lines,
  record line, one `--dur-stagger` apart). A skipped optional step has no card and steps are numbered
  among the included ones ("Step 3 of 4"). The Decision card and the appendix arrive with the agent's
  package (the gate) and stay through a send-back (a Book row's `at=monitoring` link shows the
  appendix earlier); an errored run keeps a stopped card where it halted. While drafting, the memo
  pane follows the card being written until the reviewer takes over (a wheel / touch scroll that can
  move the memo, a scroll the follow didn't make going up, a press in another card, or a memo cue /
  link to another card; see THREE-PANE R3); scrolling back down to it or the doc bar's "Go to
  drafting" (shown only while not following) resumes. When the analysis finishes (the gate, first
  pass or a revision) while following, the memo lands on the Decision card, its head at the top
  (scroll only, never focus, so a stray Enter can't sign). The write-in plays once; cards already on the page when a file opens never animate. J / K step through the flagged rows in the memo (a row-less flag lands
  on its marked line, `flag:<id>`).
- **Decision card** (P-23, `screens/decision/DecisionCard.tsx`, the memo's `signature` slot, renders
  `selectSignature` → `SignatureView` in full): the ONE place to decide, its own card right after
  step 5. In order: Signed over ("you opened n of N", each with Show row or Show in memo; then ONE
  uncounted info item when covenant inputs are not stated in the CIM, P-32) · reviewer note (Draft from
  notes + provenance chip; optional to countersign, required to return or reject) · amendment
  summary with Revert (amending itself stays on the covenant row) · the call **directly above the
  verbs**: "The agent recommends [TOKEN]" (always the agent's own call) + the question + the
  decision's specific reasons with sizes (`pkg.decisionReasons`: the first two on an ESCALATE, every
  principal reason on a DECLINE, "verify the extracted figures" on a data-gated file) · the verbs in **one horizontal row that may wrap, never a vertical list**,
  each with its one-line consequence under it · the attestation + the policy line / checks · the
  signature lines (agent pre-signed, reviewer line). After the decision the same card is the sealed
  record (ink / AUTO / REJECTED + quote + provenance + routed line; no verbs, no note field).
  Clicking the primary signs at once. A (no modifier, not typing) signs only while the card's
  reviewer line is on screen and no refusal verb is armed; otherwise the first A brings the card
  into view, focuses the primary and announces "Countersign is focused. Press A again to sign."
  (P-02; while Return or Reject is armed A never signs: it focuses the primary and says "… Reject
  memo is armed, so press Enter to countersign or Esc to cancel it."). **Return and Reject are
  armed, never immediate** (P-30, THREE-PANE R4.1 + R4.4, Mobbin audit fix 1): a first press (click,
  S or R) never acts. It arms that verb (`GateState.armed`, `armedAt`, `armedBy`), holds the
  countdown, clears the memo covers, brings the note and the verb into view and focuses the note
  (text SELECTED after a click; caret at the END after S or R, so a reflexive key types one letter
  instead of replacing the note); the note label becomes the verb's question ("Why reject it? · on
  the record" / "What should the agent revise? · quoted in Revision N"), the armed button reads
  "Reject now" / "Return with note" (no wider than the resting labels, so the verb row keeps its two
  lines at phone width; checked on `/?kit` `#board-phoneverbs`, see below) with the commit chord ⌘↵, the ONLY chip while armed (A and the other refusal
  key cannot act from the note, so their chips drop), its consequence stays, and a quiet "Cancel"
  link joins the same verb row (at phone width it may wrap alone; it is not a verb). A second press
  of the SAME verb commits only with a note: a click, ⌘↵ from the card, or the key with focus
  outside a field; on an empty note it stays armed with a calm t-small hint ("Write a reason
  first.", announced, never a red alert). The second press must be its own gesture: within 500 ms
  of arming (`ARM_SETTLE_MS`, a double-click) it does nothing, and a key press while neither the
  armed verb nor the note is on screen only brings them back. The other refusal verb re-arms;
  Cancel or Esc in the card disarms; the primary's click (or Enter, Space on it) still signs at once
  (the note goes on the record as the countersign note). So neither a stray R after an optional
  note, a double-click, nor a single A can put a typed reason under the wrong verb. After a return,
  focus that fell to the body lands on the card's pending line (the panel never takes focus). The panel's
  "Decision →", the doc bar's "Go to decision" and the composer's refusal link only scroll to the
  card; the palette has no sign command.
- **Composer** (P-25, backlog #7 on V2): one line, "Ask or instruct". Enter sends, Shift+Enter adds a
  line, never on ⌘↵ or during IME. Deterministic parser (`model/composer.ts`): "draft the memo" /
  "draft without peer benchmarks" / "start drafting" / "skip" or "include peer benchmarks" / "hold" /
  "stop" (opens the confirm strip, never stops directly) / stress / questions (askRoute or the
  engine's pure responder, open once a package exists). Typing can never sign, return, reject, amend
  or write the note: such text gets "Decide in the memo: Decision →" (or a pointer to the covenant
  row). Any composer use, typing included, holds a running countdown. Q&A persists per file, scoped
  by a per-file epoch (a re-run starts fresh); real answers are shown in the memo's Questions block,
  not in the panel (P-33).
- **Shell:** collapsible left sidebar (Desk · Book · Ledger, 64px icon rail, persisted; **no counts**: only
  a small accent dot on the Desk while a file waits on you at plan review or the countersignature);
  top bar = section name + auto-countersign switch + search.
- **The auto-countersign rule is stated in words** (P-31, THREE-PANE R4.2, Mobbin audit fix 2), built in
  the model by `policyRule()` from the same terms the eligibility check tests (`policyChecks`, which
  `isEligible` in `state/gate.ts` now reads; `POLICY_MIN_CONFIDENCE`, `AUTO_COUNTDOWN_MS`; never
  hand-restated numbers). Settings' policy help line: "If the agent recommends APPROVE · no flags ·
  first pass · every key figure at 90% or above → countersign after a visible 5 s countdown you can
  hold. Everything else waits for you." The top-bar switch wears the kit Tip with the one-line version
  ("Clean means APPROVE · no flags · first pass · every key figure at 90% or above → countersign after
  a 5 s countdown you can hold."); the kit Switch forwards `aria-describedby` for it. The terms are
  ONE list, `POLICY_TERMS` (`vocab.ts`), which `AUTO_NOTE` quotes too: a policy signature records
  "Auto-countersigned · clean-approval policy (APPROVE · no flags · first pass · every key figure at
  90% or above)" (R4.4; it used to omit "first pass"). **The rule shows wherever the policy can be
  switched** (P-36, THREE-PANE R4.9): at narrow widths the switch moves into the top bar's "More"
  menu, whose item carries the one-line rule as a secondary line (the kit Menu item's new
  `description`, t-meta ink-3, read as its accessible description); the palette's two policy
  commands carry it as a `description` that the palette shows in its footer hint row for the hovered
  or keyboard-active command (ink-2 beside the count; rows keep 36px; also the option's
  `aria-describedby`, with the option named by its label and hint only so the rule is read once).
  All four copies come from `policyRule()` / `POLICY_TERMS`.
- **Covenant inputs the CIM does not state are on the record** (P-32, THREE-PANE R4.3, Mobbin audit
  fix 3). Interest coverage, fixed-charge coverage and liquidity are stated in no sample CIM, yet
  they are 3 of the 4 covenant-tested actuals. Their evidence class is "Not in the CIM ·
  extraction model" (`NOT_IN_CIM`; class id still `unquoted`) in every accessible name and is
  explained in full by the Financials foot line; ON SCREEN the tight cells read the short "Not in CIM"
  (`NOT_IN_CIM_SHORT`): the Financials Source column (the kit `EvidenceTag`'s new `srText` carries
  the full wording for assistive tech), the Recommendation key figures' caption (`evidenceCaption`;
  `evidenceText` stays the full words) and the line under a covenant Actual, so those rows stay one
  line (THREE-PANE R4.8). The Financials foot line counts and names them, computed:
  "3 of 4 covenant tests use figures the CIM does not state (interest coverage, fixed-charge
  coverage and liquidity); they come from the extraction model." (no more "verify them against the
  source", which the CIM cannot support). `CovenantRow.evidence` (`covenantEvidence`: class, text,
  the "Not in CIM" line, the Financials-row target, an aria label; `null` in the stress test): every
  Actual is a kit `LinkButton role="figure" tone="inherit"` (new variant: the row's own ink, quiet
  `--line` underline) that traces to its Financials row via `cueMemo`; columns and `stackBelow 640`
  unchanged; a row whose Actual carries "Not in CIM" is top-aligned (kit `TableRow.align: 'start'`,
  R4.4), so that Actual sits on its neighbours' line instead of 8px above it. The Decision card's
  Signed over closes with ONE info item, "3 covenant inputs are not stated in the CIM · Show in memo"
  (`SignatureView.inputsNotInCim`, lands on the Covenants card): not a flag, never counted in "you
  opened n of N", never read by the policy or the engine; following it during an auto-countersign
  countdown holds the countdown first (`reviewManually`). The sealed caption adds "signed with 3
  inputs not stated in the CIM" ("decided with …" on a rejection, whose list is always headed "Notes
  on the record", "· none" with no notes, never "Signed over"). Engine numbers unchanged.
- **Acknowledging a covenant item asks why** (P-34, THREE-PANE R4.6, Mobbin audit fix 5): the Book's
  Acknowledge no longer acts in one click. It opens the item's inline strip in the row's detail
  (indented with the sub-rows): the kit `ConfirmStrip` with its new `reason` field (a kit
  `TextInput`, "Why is this acceptable for now?", takes the focus), Acknowledge / Cancel beside it
  and ONE consequence line under it, worded from what the engine does: "Required for a breach.
  Stays quiet until it recovers." / "Optional for a watch. Stays quiet until it worsens or
  recovers." (an acknowledged item is raised again only at a worse severity, and a breach has
  none). An empty reason on a breach keeps the strip and shows the calm hint "Write why it is
  acceptable first." (announced, focus back in the field; the R4.1 pattern, no disabled button, no
  red alert). Enter confirms, Esc / Cancel closes (focus back to the item's Acknowledge); the
  item's own button hides while its strip is open; one strip at a time; leaving the Book closes it.
  Confirm calls the engine's `monitor.acknowledge(id)` unchanged and keeps the reason in V2 state
  (`ui.ackNotes` by escalation id, `ui.ackConfirm` for the open strip, `state/acknowledge.ts`;
  `V2Actions.acknowledge` became `requestAcknowledge` / `setAckNote` / `confirmAcknowledge` /
  `cancelAcknowledge`; the rule is `ackNoteRequired` in `model/select-book.ts`). The acknowledged
  row reads "Acknowledged 14:05" plus a line under its figures, "until it recovers · “Waiver in
  negotiation with sponsor”" ("no reason given" for a watch; "worsened since and raised again"
  once a newer item for the covenant exists, open or acknowledged), where focus lands. While a strip
  is open the Book holds its file order (`ackConfirm.order`), so a sweep never moves the row being
  typed in (R4.11). The Ledger's Reviewer row carries the reason as its detail;
  the session export's `monitorLog` entries gain `detail`. No time-based snooze; Mark handed off
  unchanged. Kit: `ConfirmStrip` `reason` / `hint` / `label`, `TextInput` `describedBy` /
  `required`; kit page group `#board-acknowledge`.
- **Removing a file from the Desk is one click with an in-place undo** (P-35, THREE-PANE R4.7, Mobbin
  audit fix 6): no confirm, no toast. The row collapses to ONE line in its group where it was,
  "Project Cobalt removed from the Desk · Undo" (focus lands on Undo), until the reviewer leaves the
  Desk (`ui.deskUndo`, cleared by `routeHygiene`); Undo brings back that file only. While any file
  is removed the summary adds "· 1 removed · Restore" (restores all; also on an empty Desk while an
  upload is extracting, R4.11). An empty Desk shows a kit
  `EmptyNote` beside the drop zone with "Restore sample files" (the kit EmptyNote gained an optional
  `action` button; the "a refresh brings the samples back" copy is gone, since a refresh ends every
  run); an empty Ledger's EmptyNote offers "Open the Desk". The live file still cannot be removed;
  Settings keeps "Restore removed files" as a fallback. `V2Actions` `removeFile` / `undoRemove` /
  `restoreRemoved` replace the confirm trio; `V2Store.allFiles` (the engine's list, removed files
  included) lets the Desk place each line and name what a restore brings back.
- **The verb row at phone width is checked on the kit page** (P-37, THREE-PANE R4.10, improvement
  batch 2 item 5): the Decision card's verb row is one pure component, `screens/decision/VerbRow.tsx`
  (markup unchanged, imports `decision.css`), rendered by the memo and by `/?kit`
  `#board-phoneverbs`, which puts it in a memo card at the width each phone viewport gives (360,
  375, 390, 414 → cards 264, 279, 294, 318; verb rows 230 to 284, all under 360, so the panel is
  flat and the chips drop) for the resting row, Return armed and Reject armed, and states the
  measured line count under each ("Verbs on 2 lines · Cancel on a line of its own", or red when
  Return and Reject do not share a line). By the estimates the two-line claim holds from a 390
  viewport, is on the edge at 375 (resting about 11px short) and breaks at 360; the board's measured
  line decides, and any fix (labels, tighter buttons, a 390 floor) is the owner's call. Review fixes
  to R4.5 to R4.9 are listed in THREE-PANE R4.11.
- **Rejected by the owner during the V2 build (do not resurrect):** vertical "Source ¶" spine
  (source opens from a doc-bar button instead) · the ¶ citation mark (reads "CIM para 2") ·
  recommendation at the top of the memo · side margin column of notes (left empty gaps) ·
  stacked/vertical verb list · top-bar tabs (→ sidebar) · demo pace menu and "Compare V1" link
  in the top bar · dark mode · cross-pane connector lines (the concept panel's "tether", judged
  too fancy; links scroll and flash instead) · **data in the agent panel** (the first three-pane
  build's step lines with confidences and durations, Record / Reasoning disclosures, flag sentences
  as MarginNote messages, the plan step checklist, the file context block, the head's note stepper
  and Show all reasoning: "do I look at the middle or the right?") · **the decision card in the agent
  panel** (it was docked between the thread and the composer; the countersign moved to the right). · any show/hide toggle or collapse control for the agent panel (after the Desk, a case file is always three panes) · a project picker or project switch in the agent panel (step one, selecting the project, happens on the Desk; the agent panel exists only inside a case file) · the plan prompt pinned above the composer, bottom-anchored ("chat grows upward") thread lines and an empty-thread filler sentence ("Just do what normal claude code did") · a composer whose send button sits outside its field as a grey square · skeleton / "Not drafted yet" placeholder cards in the memo (cards appear as they are drafted) · count badges on the sidebar items (Desk "1", Book "7" monitor totals): a badge only marks something waiting on you

## Backlog (to-do)

Items 1–6 + the Agents roster are DONE (kept for the record). Remaining work grouped by type.

1. [x] **Portfolio & covenant monitoring screen** — DONE: always-on monitoring agent
       (`src/agent/monitor.ts` sweep generator + `useMonitor` hook) re-tests covenants on a
       ~25s÷speed cadence with deterministic metric drift; Portfolio nav item routes to it
2. [x] **Escalation inbox / review queue** — DONE: drift/breach raises deduped escalation
       items; queue supports Acknowledge + "Open deal →" (jumps to analysis with the deal
       selected); open count badges the Portfolio nav item
3. [x] **Click-through provenance** — DONE: citable figure cards (only values present in the
       document become buttons) + the ⛓ chip highlight + scroll to the source in the document
       panel; cites auto-clear on any deal change (false-provenance guard); width-guard toast
       when the doc panel is hidden (≤1100px)
4. [x] **Audit log as a real screen** — DONE: `AuditView` (nav-routed) merges the session-wide
       run trail (`auditHistory` in useCreditAgent, capped 500) with monitor escalations;
       filter chips (aria-pressed), export JSON; dead `AuditLog.tsx` deleted
5. [x] **Editable "what-if" fields** — DONE: `WhatIfPanel` + a pure `src/agent/whatif.ts` model.
       Four drivers (EBITDA / total debt / interest rate / liquidity) recompute leverage,
       coverage, covenant pass/breach and a baseline-anchored risk score, then re-run the SAME
       `decide` rule the agent uses → the recommendation flips live (e.g. Atlas ESCALATE→APPROVE
       on +$2.4M EBITDA; any deal can be driven across all three outcomes). Calibrated so the base
       case reproduces each deal's published figures exactly (every delta is zero at base). Renders
       at the approval gate and after a finished run; "Reset to base case".
6. [x] **Deals pipeline screen** — DONE: `DealsView` origination board, deals by stage (Screening →
       In analysis → Awaiting countersign → Decided), stage derived from real run state, cards open
       in analysis. Plus a bonus **Agents roster** (`AgentsView`) filling the last dead nav item.
**Remaining — frontend-only (next candidates):**
7. [ ] **Composer that can start a run** — instructions kick off work, not just Q&A.

**Deferred — needs a real backend (scoped frontend-only per request: "no backend"):**
8. [ ] Real LLM (`claude-fable-5`) behind the same AgentEvent interface (serverless fn keeps the
       key off the client; mock stays as fallback).
9. [ ] Supabase persistence of the audit trail (runs survive reloads).

**Non-code:**
10. [ ] Walkthrough practice — the README's architecture tour + the extension points.
11. [ ] Write-up / post — live link + repo exist; caption remaining.

## Design and engineering rationale

The claims this prototype is built to demonstrate — useful when explaining it to anyone:

- "The agent is a **stream of typed events**, so the UI is a pure reduction — the same
  components work against a mock or a real LLM."
- "The loop is **plan → act → observe → decide**; the *decide* step handles uncertainty
  (low confidence / covenant breach → escalate to a human) rather than blindly trusting output."
- "**Human-in-the-loop** isn't a modal — the agent **suspends** at the gate and can't proceed
  without a person. Right default for a consequential, regulated action."
- "The **what-if panel** makes the *decide* step tangible: stress EBITDA/debt/rate/liquidity and
  the covenants, risk score and recommendation recompute live — through the **same `decide`
  function** the agent uses, so the analyst's sensitivity test and the agent can never disagree.
  The model is baseline-anchored, so the base case reproduces the deal's published numbers exactly."
- "Everything is **inspectable + logged** (args in, data out, confidence, timestamps) because
  traceability is the product."
- "The design system is **all tokens** — an original 'Graphite & Teal' identity built by applying
  the *principles* best-in-class product UIs use for surfaces/borders/accent, with its own teal
  palette; re-skinning is a token swap, not a component rewrite."

## Maintaining this file

- It's **auto-loaded every session** — no need to open or "load" it.
- **To update it, just ask in plain language**, e.g. _"update CLAUDE.md", "log today's changes to
  CLAUDE.md", "add `<fact>` to the progress log."_ Be specific when it matters.
- **Quick add from the prompt:** start a line with `#` to append a memory (Claude Code asks which
  file). `/memory` opens memory files to edit; `/init` regenerates a CLAUDE.md from scratch.
- Good cadence: update it at the end of a working session, or whenever a decision/convention
  changes. It should always describe the **current** state.
