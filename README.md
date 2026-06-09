# Credit Analysis Agent — agentic workflow prototype

A front-end reference prototype for practicing an **obin.ai-style live coding round**.
It shows an **agent loop you can watch and inspect** — plan → call tool → observe →
decide → repeat → **human approval gate** — applied to a credit-analysis workflow.

There is **no backend**. The "LLM" and its "tools" are mocked with async generators
and timers (`src/agent/*`), so it runs with zero API keys and is fully deterministic.
The point of the exercise is the *agentic UX and control flow*, not the model.

> Maps to obin.ai's actual product: extract financials from a deal doc → score risk →
> test covenants → assemble an approval package **with an audit trail**, pausing for a
> human on the consequential call ("in regulated finance, 80% accuracy is a liability").

---

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Press **Run analysis**. Use the **speed** slider (top bar) to speed up / slow down the
demo — it also affects in-flight delays, which is a nice thing to show live. **Reset**
aborts a run mid-flight.

```bash
npm run build    # type-check (tsc --noEmit) + production build
npm run preview  # serve the build
```

---

## The 90-second tour (what to say while screen-sharing)

The whole app is a **reducer over a typed event stream**. That one idea is the spine:

```
runCreditAgent()  ──AsyncGenerator<AgentEvent>──►  useCreditAgent (reduce)  ──►  UI
   (the loop)                                          (React state)           (dumb views)
```

1. **`src/agent/runAgent.ts` — the loop.** A single `async function*` that yields
   `AgentEvent`s. It announces a plan, then loops: stream reasoning → choose a tool →
   `await tool.run()` → **inspect the result and derive flags** (the "decide" step) →
   next. It never imports React. A real LLM backend would emit the *same events* from a
   streamed response, so the UI wouldn't change.

2. **`src/agent/types.ts` — the contract.** `AgentEvent` is a discriminated union. Every
   moment of the loop (`thinking_delta`, `tool_call`, `tool_result`, `flag`,
   `awaiting_approval`, …) is one variant. Strong typing here is what keeps the reducer
   honest.

3. **`src/hooks/useCreditAgent.ts` — orchestration.** Consumes the generator with
   `for await`, reduces each event into view state, and owns the controls. Components
   stay declarative.

4. **Human-in-the-loop (the bit worth pointing at).** The loop *suspends itself* at the
   gate:

   ```ts
   const decisionPromise = ctx.requestApproval(); // registers a resolver
   yield { type: 'awaiting_approval', package };   // UI renders the gate
   const decision = await decisionPromise;         // ← loop is parked here
   ```

   `requestApproval` returns a Promise whose `resolve` is stashed in a ref; the
   Approve/Reject buttons call it. The `await` literally pauses the generator until a
   human acts — no polling, no flags. That's the cleanest demonstration of async control
   flow in the codebase.

5. **Traceability.** Every event also appends to the **audit trail** (right column) with
   a timestamp, and tool calls are **expandable** to show exact args in / data out. This
   is the "show your work" surface a regulated-finance product needs.

6. **Uncertainty as a first-class signal.** Tool results carry a `confidence`; the
   covenant breach raises a `critical` flag with `needsHuman: true`, which flips the
   recommendation to **escalate** and is what forces the gate. Talk about this — it's
   exactly obin.ai's "edge cases are where the risk lives" thesis.

---

## Architecture at a glance

```
src/
  agent/
    types.ts        AgentEvent union + domain types  (the contract)
    runAgent.ts     the async-generator agent loop    (★ the centerpiece)
    tools.ts        mocked tools: latency + data + confidence
    mockData.ts     the "backend" — canned deal numbers
    util.ts         abortable sleep, id/confidence helpers
  hooks/
    useCreditAgent.ts   consume generator → reduce events → state + controls
  components/
    Header, DocumentPanel, PlanBar, AgentStream, StepCard,
    ToolCallView, ConfidenceBadge, FlagPill, ApprovalGate,
    OutcomeBanner, AuditLog
  App.tsx, main.tsx, index.css
```

Design choices worth defending if asked:
- **Generator over an event emitter / reducer-only.** Generators model "a process that
  pauses" naturally — streaming *and* the approval await fall out of the same construct.
- **Events, not direct setState from the loop.** Keeps the loop pure/testable and the UI
  a pure function of state; also the exact shape you'd get from a real streaming API.
- **`AbortController` threaded into every `sleep`.** Reset cancels cleanly mid-run.
- **`speed` read via a live getter** so the slider affects already-scheduled delays.

---

## Likely "now extend it live" drills (practice these)

The interviewer will probably ask you to change something on the spot. Each of these is
small *because* of the event-stream design — rehearse them:

1. **Add a tool / step** (e.g. `check_collateral`): add a `ToolName`, a `TOOLS` entry,
   one `PLAN` row. Nothing else changes. ~3 min.
2. **Cancel an in-flight run** — already wired via `AbortController`; explain it, or add a
   "Stop" button that calls `reset()`.
3. **Let the human *edit* the package before approving** (change the recommendation, add
   a note). Extend `requestApproval` to resolve with `{ decision, edits }`.
4. **Stream real tokens** — swap `streamThinking` for `fetch()` + `ReadableStream` /
   SSE; the reducer doesn't change because the events don't.
5. **Retry on low confidence** — if `result.confidence < 0.8`, loop the step again or
   route to a different tool. Good place to talk about the "80% isn't enough" guardrail.
6. **Persist / export the audit trail** as JSON (download button over the `audit` array).

---

## Agent-UX patterns borrowed from leading agent products

These are lifted from the agentic apps Mobbin catalogs — worth naming the source if asked
"why does it look like this?":

- **Result artifacts** (`Artifact.tsx`) — tool output renders as work-product (metric
  cards, a risk gauge, a pass/fail covenant table), not raw JSON. *Perplexity answer
  cards / v0 / Claude artifacts.* The raw call stays available in the inspector below.
- **Provenance citation** (`⛓ CIM · p.12–28` on the financials) — ties extracted data
  back to its source. *Perplexity / Devin.* On-thesis for regulated finance.
- **Live elapsed timer** on the in-flight tool (`Elapsed` in `ToolCallView.tsx`).
  *Cursor / Devin / Manus activity feeds.*
- **Exportable run** — the audit trail downloads as JSON (`exportAudit` in the hook).
  *Devin run exports.* A real feature, and the compliance artifact a fund would archive.
- **Suggested next steps** — follow-up chips after the outcome. *ChatGPT / Perplexity.*
- **Theming** — every color is a CSS variable with a `data-theme` override, so
  light/dark is one attribute and zero component changes.
- **Original design system — "Graphite & Teal".** A token-driven system with its own identity:
  a deep **teal** accent (`#0f7d8c` light / `#2bb8cc` dark), graphite near-black dark surfaces,
  cool-neutral light surfaces, hairline borders, soft elevation, and Inter with optical
  letter-spacing. It borrows only **universal craft principles** from best-in-class product UIs
  (surface ladder, restrained single accent, depth-from-surfaces) — it is **not a clone** of any
  product (deliberately, since this is shared publicly). Because everything is variables,
  re-skinning is a token swap, *zero component rewrites*. Talking point: "the design is all
  tokens, so it has its own identity *and* could be re-skinned to any brand without touching a
  component."

### Input model: upload to ingest, chat to steer
The left panel is the **ingestion** surface — drop a CIM (PDF) or pick a recent deal.
The bottom **composer** (📎 + text, ChatGPT-style) is the **steering / follow-up** surface.
This is the deliberate split: you don't *type* a 100-page CIM, you hand over the document;
the chat box is for "why did you flag the leverage?" not for data entry.

- **Simulated extraction** (`synthesize.ts`) — uploading derives a plausible, internally
  consistent deal from the *file name* (seeded pseudo-random figures → covenants → risk →
  recommendation), so different files genuinely produce different outcomes. It's clearly
  labeled "extraction is simulated"; in production this is the document-extraction model.
- **Rule-based follow-ups** (`responder.ts`) — the composer answers questions from the
  current deal's data. Not an LLM — a scripted Q&A, honest for a mocked backend.
- Talking point: *"Ingestion is a document; steering is a chat. I kept them separate
  because retyping a CIM into a prompt box would be the wrong affordance and would throw
  away provenance."*

## Talking points cheat-sheet (obin.ai framing)

- "I modeled the agent as a **stream of typed events**, so the UI is a pure reduction and
  the same components work against a mock or a real LLM."
- "The loop is **plan → act → observe → decide**, and the *decide* step is where I derive
  flags and handle **uncertainty** rather than blindly trusting the model."
- "**Human-in-the-loop** isn't a modal bolted on — the agent literally **suspends** at the
  gate and can't proceed without a person. That's the right default for a consequential,
  regulated action."
- "Everything is **inspectable and logged** — args in, data out, confidence, timestamps —
  because traceability is the product, not a feature."

_Built as interview practice; not affiliated with obin.ai. All numbers are fictional._
