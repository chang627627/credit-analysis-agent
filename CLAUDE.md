# CLAUDE.md

Guidance for Claude Code (and humans) in this repo. **Auto-loaded at the start of every session
in this project**, so it's the shared source of truth. Keep it current — see _Maintaining this
file_ at the bottom.

## What this is

Interview practice for **obin.ai** (an "agentic workforce for regulated finance" — credit
analysis, document intelligence, covenant monitoring, audit trails). This is a **front-end
reference prototype** for a live-coding round: a **Credit Analysis Agent** that makes an
**agent loop visible and inspectable**, with a **mocked backend** (no API keys). Role focus:
**frontend / UX engineering**.

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
    util.ts         abortable sleep, uid, confidenceBucket
  hooks/
    useCreditAgent.ts   generator → reduce → state + controls
  components/
    Header, NavSidebar, DocumentPanel, PlanBar, AgentStream, StepCard, ToolCallView,
    Artifact, ConfidenceBadge, FlagPill, ApprovalGate, OutcomeBanner, Composer
    (AuditLog.tsx is kept but unused — the audit panel was replaced by the nav)
  App.tsx, main.tsx, index.css
.claude/launch.json   dev-server config for the preview tool
```

## Key product / UX decisions (why it is the way it is)

- **Layout = app shell:** collapsible nav rail | document/context panel | agent canvas + composer.
  (The audit-trail right panel was removed in favor of nav; audit data still exists and exports.)
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
- [ ] Not built: real LLM via SSE behind the same event interface; editable "what-if" fields;
      Supabase persistence of the audit trail; composer that can start a run

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
