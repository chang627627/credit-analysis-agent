# CLAUDE.md

Guidance for Claude Code (and humans) in this repo. **Auto-loaded at the start of every session
in this project**, so it's the shared source of truth. Keep it current — see _Maintaining this
file_ at the bottom.

## What this is

Interview practice for **obin.ai** (an "agentic workforce for regulated finance" — credit
analysis, document intelligence, covenant monitoring, audit trails). This is a **front-end
reference prototype** for a live-coding round: **"Countersign"** — a credit-analysis agent that
makes the **agent loop visible and inspectable**, with a **mocked backend** (no API keys). Role
focus: **frontend / UX engineering**.

**Product name: Countersign** — a countersignature is the second signature that makes a document
binding; the agent analyzes, a human countersigns (human-in-the-loop encoded in the name).
The GitHub repo/Vercel slugs stay `credit-analysis-agent` (renaming would break the live URL).

> Not affiliated with obin.ai. All deal data is fictional.

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
- **localStorage keys:** `theme` (`light` | `dark`, default `light`), `navCollapsed` (`0` | `1`).
- **HMR false positive:** editing a hook's hook-count mid-session can throw "change in order of
  Hooks"; it's gone on a full reload. Verify on a fresh load, not mid-HMR.
- **Driving via the preview tool:** reading the DOM synchronously right after a `.click()` races
  React's state update — read in a separate call.
- **Single-key shortcuts must reject modifiers:** the A/R gate shortcuts guard with
  `if (e.metaKey || e.ctrlKey || e.altKey) return` — otherwise ⌘A (select-all) approves and
  ⌘R (reload) rejects a memo. Caught by adversarial review; keep the guard if editing shortcuts.
- **Preview console buffer persists across reloads** — only a server restart clears it; old
  HMR-window errors linger and look current.
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

**Non-code (highest ROI before the interview):**
10. [ ] Interview rehearsal — README's 90-second tour + "extend it live" drills.
11. [ ] LinkedIn post — live link + repo exist; caption remaining.

## Interview talking points

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
- "The design system is **all tokens** — an original 'Graphite & Teal' identity. I studied how
  best-in-class product UIs handle surfaces/borders/accent, applied the *principles*, and gave it
  its own teal palette; re-skinning is a token swap, not a component rewrite."

## Maintaining this file

- It's **auto-loaded every session** — no need to open or "load" it.
- **To update it, just ask in plain language**, e.g. _"update CLAUDE.md", "log today's changes to
  CLAUDE.md", "add `<fact>` to the progress log."_ Be specific when it matters.
- **Quick add from the prompt:** start a line with `#` to append a memory (Claude Code asks which
  file). `/memory` opens memory files to edit; `/init` regenerates a CLAUDE.md from scratch.
- Good cadence: update it at the end of a working session, or whenever a decision/convention
  changes. It should always describe the **current** state.
