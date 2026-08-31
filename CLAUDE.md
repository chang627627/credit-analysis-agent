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
    whatif.ts       pure what-if sensitivity model + the shared `decide` rule (recompute
                    covenants/risk/recommendation from editable drivers)
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
  **computed from the data** (no breach → approve; breach + risk ≥ 75 → decline; else escalate).
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
  grab-bag of Unicode glyphs. The `◧` Countersign brandmark stays (identity, not an icon).

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
      gzip. The `◧` Countersign brandmark stays (identity). Sidebar collapse toggle uses
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
- [x] **DESIGN.md + design-preview.html** — the design system documented in the
      VoltAgent/awesome-design-md (Google Stitch) format: YAML front matter with machine-readable
      token maps (`colors` = light default, `typography`, `rounded`, `spacing`, `components` with
      `{token}` refs) + the standard body sections (Overview → Colors → Dark Theme table →
      Typography → Layout → Elevation → Shapes → Components → Motion → Do's/Don'ts → Responsive →
      Iteration Guide → Known Gaps). Values extracted 1:1 from `src/index.css`; the Don'ts encode
      the session's rejected patterns (serif, dim, second accent, alpha borders in dark).
      `design-preview.html` (repo root, self-contained) is the getdesign.md-style visual catalog —
      swatches/type/shapes/controls/component specimens painted EXPLICITLY on side-by-side light
      and dark boards (scoped token re-declaration), with theme-aware page chrome. Also published
      as the "Graphite & Teal" artifact.

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
