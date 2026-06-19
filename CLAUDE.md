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
    util.ts         abortable sleep, uid, confidenceBucket
  hooks/
    useCreditAgent.ts   generator → reduce → state + controls
    useMonitor.ts       always-on sweep cadence → portfolio state + escalation queue
    useCountUp.ts       rAF count-up for metric/score numbers
  components/
    Header, NavSidebar, DocumentPanel, PlanBar, AgentStream, StepCard, ToolCallView,
    Artifact, ConfidenceBadge, FlagPill, ApprovalGate, OutcomeBanner, Composer,
    CommandPalette, Toasts, PortfolioView (monitor + escalation queue), AuditView (session log)
  App.tsx, main.tsx, index.css
.claude/launch.json   dev-server config for the preview tool
```

## Key product / UX decisions (why it is the way it is)

- **Layout = app shell:** collapsible nav rail | document/context panel | agent canvas + composer.
  (The audit-trail right panel was removed in favor of nav; audit data still exists and exports.)
- **Nav routes to real screens:** Credit Analysis & Deals → the analysis view; Portfolio → the
  monitor; Audit log → the session trail. "Agents" is the only shell item (toasts "backlog").
  Badges show the deal count and the open-escalation count. (Deals currently duplicates Credit
  Analysis — see backlog: a real Deals pipeline screen would close that.)
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

## Backlog (to-do)

Items 1–4 are DONE (kept for the record). Remaining work grouped by type.

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
**Remaining — frontend-only (next candidates):**
5. [ ] **Editable "what-if" fields** — stress EBITDA/rates/leverage; recommendation flips live.
       Highest demo value (interactive sensitivity analysis); relatively small build.
6. [ ] **Deals pipeline screen** — make the (currently redundant) Deals nav item a real
       origination board: deals by stage (Screening → In analysis → Awaiting countersign →
       Decided), clickable to open in analysis. Distinct from Portfolio (monitoring, not pipeline).
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
