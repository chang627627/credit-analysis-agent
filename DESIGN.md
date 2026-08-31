---
version: alpha
name: Countersign-Graphite-Teal
description: "An original light-first product system for a regulated-finance agent UI, built around white and cool-neutral surfaces (#ffffff / #f4f6f9), graphite-navy ink (#0f2436), hairline borders, and one signature accent: deep teal (#0f7d8c light / #2bb8cc dark) — deliberately distinct from the indigo-led systems it studied. Dark mode is a graphite near-black surface ladder (#0a0b0d → #16181b) where depth comes from surface lifts and a faint top-edge highlight instead of shadows. Type is Inter (cv11 single-story a) with negative optical tracking on headings, paired with Geist Mono for every number, eyebrow, and audit token — always tabular-nums. Functional green/amber/red carry pass/warn/breach meaning and are kept strictly apart from teal, which marks liveness, identity, and the active thing. Motion runs on ONE ease-out curve: elements announce themselves, then go completely still — a surface where a human must read carefully never keeps moving. A dashed hairline frame means sandbox (what-if, amendments): scratchpad, not the record."

colors:
  accent: "#0f7d8c"
  accent-hover: "#0b6573"
  accent-soft: "rgba(15, 125, 140, 0.10)"
  accent-text: "#0a6675"
  on-accent: "#ffffff"
  bg: "#ffffff"
  bg-2: "#f4f6f9"
  panel: "#ffffff"
  panel-2: "#f4f6f9"
  border: "#dfe3ea"
  border-strong: "#d3d9e2"
  hover-tint: "rgba(15, 30, 50, 0.04)"
  chip-bg: "rgba(15, 30, 50, 0.06)"
  text: "#0f2436"
  text-dim: "#51607a"
  text-faint: "#66727f"
  good: "#16a34a"
  good-hover: "#128a3e"
  good-soft: "rgba(22, 163, 74, 0.12)"
  good-text: "#117a39"
  on-good: "#ffffff"
  warn: "#d9930a"
  warn-soft: "rgba(217, 147, 10, 0.14)"
  warn-text: "#97670a"
  bad: "#e03131"
  bad-soft: "rgba(224, 49, 49, 0.10)"
  bad-text: "#bb1f2f"
  on-bad: "#ffffff"
  code-bg: "#f4f6f9"
  code-text: "#243246"
  gate-glow: "rgba(15, 125, 140, 0.12)"
  gate-glow-strong: "rgba(15, 125, 140, 0.20)"
  ambient: "rgba(15, 125, 140, 0.05)"

typography:
  page-title:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.024em
  section-title:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.014em
  card-title:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.014em
  doc-title:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.008em
  brand:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.008em
  step-title:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.008em
  body:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: normal
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: normal
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: normal
  field-label:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: normal
  eyebrow:
    fontFamily: Geist Mono
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.06em
  mono-data:
    fontFamily: Geist Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  mono-badge:
    fontFamily: Geist Mono
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.06em
  button:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: normal

rounded:
  xs: 6px
  sm: 8px
  md: 12px
  pill: 999px
  full: 50%

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px

components:
  button-default:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: 8px 14px
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: 8px 14px
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
  button-approve:
    backgroundColor: "{colors.good}"
    textColor: "{colors.on-good}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: 8px 14px
  button-reject:
    backgroundColor: "transparent"
    textColor: "{colors.bad-text}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: 8px 14px
  button-rework:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text-dim}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: 8px 14px
  chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 6px 13px
  eyebrow-badge:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-text}"
    typography: "{typography.eyebrow}"
    rounded: "{rounded.pill}"
    padding: 3px 9px
  kbd:
    backgroundColor: "{colors.chip-bg}"
    textColor: "{colors.text-dim}"
    typography: "{typography.mono-badge}"
    rounded: "{rounded.xs}"
    padding: 1px 5px
  metric-card:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.text}"
    typography: "{typography.mono-data}"
    rounded: "{rounded.sm}"
    padding: 10px 12px
  tool-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.mono-data}"
    rounded: "{rounded.sm}"
    padding: 10px 12px
  gate:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 20px
  sandbox-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 18px 20px
  flag-critical:
    backgroundColor: "{colors.bad-soft}"
    textColor: "{colors.bad-text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 8px 12px
  flag-warning:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn-text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 8px 12px
  rec-pill:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn-text}"
    typography: "{typography.mono-badge}"
    rounded: "{rounded.xs}"
    padding: 4px 10px
  confidence-badge:
    backgroundColor: "{colors.good-soft}"
    textColor: "{colors.good-text}"
    typography: "{typography.mono-badge}"
    rounded: "{rounded.pill}"
    padding: 2px 8px
  plan-item:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.text-faint}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 9px 11px
  text-input:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: 9px 11px
  composer-input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 9px 12px
  toast:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: 10px 14px
---

## Overview

Countersign's "Graphite & Teal" is an **original, light-first, token-driven system** for an
agentic credit-analysis UI where traceability is the product. The default canvas is white with
cool-neutral `{colors.panel-2}` (#f4f6f9) secondary surfaces, graphite-navy ink
(`{colors.text}` #0f2436), hairline `{colors.border}` dividers, and soft, barely-there
shadows. Dark mode swaps philosophy, not identity: a graphite near-black surface ladder
(#0a0b0d → #111315 → #16181b) where hierarchy comes from surface lifts, solid hairlines one
step brighter, and a faint white top-edge highlight on lifted cards — not from shadows.

The single chromatic accent is the **signature deep teal** — `{colors.accent}` #0f7d8c in
light, brightening to #2bb8cc on the dark graphite. Teal means *live, active, yours*: the
running tool's seam, the active nav item, the focus ring, provenance links, the primary CTA.
It is never decoration. Functional meaning belongs to the pass/warn/breach triad
(`{colors.good}` / `{colors.warn}` / `{colors.bad}`), which stays strictly separate from teal.

Every number in the product — metrics, thresholds, timestamps, confidence, memo ids — sets in
**Geist Mono with tabular-nums**. Micro-taxonomy (eyebrows, badges) is uppercase mono at 11px
with +1.2px tracking, deliberately contrasting the negative-tracked Inter headings above it.

**Key Characteristics:**
- **Light-first** (white + cool neutrals) with a full graphite dark theme; both are pure token swaps.
- **One accent, two jobs split by tier**: solid `{colors.accent}` for surfaces/CTAs, darker `{colors.accent-text}` for text/icons on soft tints.
- Functional green/amber/red carry pass/warn/breach semantics — never mixed with teal.
- Depth in light = a 3-step shadow ramp; depth in dark = the surface ladder + `inset 0 1px 0` edge highlight, shadows near-zero.
- Inter with `cv11` (single-story a), −0.008em body tracking, −0.024em headings; mono for every number, always `tabular-nums`.
- Radius ladder is tight and crisp: 4 / 6 / 10 px + pills. Nothing larger.
- **One motion curve** — `cubic-bezier(0.22, 1, 0.36, 1)` at 0.16s / 0.32s / 0.6s. Things announce, then rest.
- **A dashed hairline frame = sandbox** (what-if stress panel, term amendments): scratchpad semantics, not the record.
- Icons are Lucide stroke at width 1.5 (2.0 below 14px), `currentColor` so they theme for free.

## Colors

> Source of truth: `src/index.css` `:root` (light, default) and `:root[data-theme="dark"]`.

### Accent (signature teal)
- **Accent** ({colors.accent}): The one chromatic voice — primary CTA fill, live seam, active states, custom slider fill/thumb.
- **Accent Hover** ({colors.accent-hover}): Darker teal for hovered accent surfaces.
- **Accent Soft** ({colors.accent-soft}): 10% teal tint — active-item fills, focus rings (3px soft ring), selected chips, eyebrow badges.
- **Accent Text** ({colors.accent-text}): Darkened teal that passes contrast as TEXT on white and on accent-soft. Never fill surfaces with it.
- **On Accent** ({colors.on-accent}): Text/icons sitting on solid accent.

### Surfaces
- **Canvas** ({colors.bg}): Page background; the app canvas adds a faint top-to-bottom cool gradient (#ffffff → #f3f5f8).
- **Canvas 2** ({colors.bg-2}): Recessed areas (code blocks share it).
- **Panel** ({colors.panel}): Cards, the gate, toasts, buttons.
- **Panel 2** ({colors.panel-2}): Inset tiles inside panels — metric cards, plan items, inputs.
- **Hairline** ({colors.border}): Default 1px borders and dividers.
- **Hairline Strong** ({colors.border-strong}): Interactive-element frames (buttons, inputs), meter rails, step spines.
- **Hover Tint** ({colors.hover-tint}) / **Chip Bg** ({colors.chip-bg}): Alpha inks for hover washes and kbd chips.

### Text
- **Ink** ({colors.text}): Headings, values, primary copy — graphite-navy, not black.
- **Ink Dim** ({colors.text-dim}): Secondary copy, sublabels, mono thresholds.
- **Ink Faint** ({colors.text-faint}): Tertiary micro-labels, timestamps, placeholder text. Floor of the hierarchy — nothing dimmer.

### Functional (pass / warn / breach)
- **Good** ({colors.good}) + soft/text/on variants: covenant PASS, approve CTA, the countersign stamp.
- **Warn** ({colors.warn}) + soft/text: watch states, ESCALATE, reviewer send-back thread, revision diff strip.
- **Bad** ({colors.bad}) + soft/text/on: BREACH, DECLINE, reject affordances, headroom "over" captions.
- Tinted rows/cards (e.g. breach table rows) use the *-soft fills with *-text ink; any button on a tinted surface gets a **solid `{colors.panel}` fill** so its frame survives dark mode.

### Depth & Ambience
- **Gate Glow** ({colors.gate-glow} / {colors.gate-glow-strong}): The approval gate's teal aura — pulses twice on arrival, then rests.
- **Ambient** ({colors.ambient}): 5% teal wash behind the canvas dot-grid texture.
- **Code** ({colors.code-bg} / {colors.code-text}): The tool inspector's JSON blocks.

## Dark Theme

Dark is a first-class theme (persisted; light is default). Same token names, different physics:
depth moves from shadows to the **surface ladder** plus a faint top-edge highlight
(`inset 0 1px 0 rgba(255,255,255,0.04)`) on lifted cards.

| Token | Light | Dark | Dark note |
|---|---|---|---|
| bg | #ffffff | #0a0b0d | graphite canvas, not pure black |
| bg-2 | #f4f6f9 | #0d0f11 | |
| panel | #ffffff | #111315 | surface-1 |
| panel-2 | #f4f6f9 | #16181b | surface-2 |
| border | #dfe3ea | #20232a | light hairline sits ~10 L below the canvas |
| border-strong | #d3d9e2 | #31353d | |
| text | #0f2436 | #f3f5f6 | |
| text-dim | #51607a | #8b929d | |
| text-faint | #66727f | #777e8a | both clear WCAG AA (light 4.91:1 on white, 4.53:1 on bg-2) |
| accent | #0f7d8c | #2bb8cc | brighter teal for near-black |
| accent-hover | #0b6573 | #4dccdd | hover goes LIGHTER in dark |
| accent-soft | rgba(15,125,140,.10) | rgba(43,184,204,.16) | |
| accent-text | #0a6675 | #57cfe0 | |
| on-accent | #ffffff | #042a30 | dark ink on bright teal |
| good / text | #16a34a / #117a39 | #2ea043 / #4ac76a | |
| warn / text | #d9930a / #97670a | #d6a02b / #e3b341 | |
| bad / text | #e03131 / #bb1f2f | #e5484d / #ff6166 | |
| shadow-sm | soft 2-layer | 0 2px 8px rgba(0,0,0,.35) | shadows minimal |
| edge | transparent | rgba(255,255,255,.04) | top-edge highlight, dark only |

**Dark-mode laws (learned the hard way):**
- A 16%-alpha colored border is invisible on graphite — frame important tinted elements with the **solid** functional color.
- Transparent/ghost buttons on tinted surfaces lose their frame — give them solid `{colors.panel}`.
- Set `color-scheme: dark` or native controls (scrollbars, spinners) render glaring light.
- Buttons must inherit `color` — UA-default black text vanishes on graphite.

## Typography

### Font Family

- **Inter** — the single UI voice; fallback `SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto`. Loaded at 400/500/600 — weight 700 is deliberately unused (display ceiling 600). `font-feature-settings: "cv11"` (single-story a), `font-optical-sizing: auto`, antialiased.
- **Geist Mono** — fallback `JetBrains Mono, ui-monospace, SF Mono, Menlo`. Carries every number, threshold, timestamp, id, eyebrow, badge, and JSON block. Numeric UI always sets `font-variant-numeric: tabular-nums`.
- There is **no serif**. A serif "document voice" for the source memo was prototyped and rejected: one typeface family everywhere.

### Hierarchy

| Token | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| `{typography.page-title}` | 22px | 600 | −0.024em | Launchpad headline |
| `{typography.section-title}` | 18px | 700 | −0.024em | Gate title, screen titles ("Approve the plan") |
| `{typography.card-title}` | 17px | 700 | −0.024em | Panel titles (what-if) |
| `{typography.doc-title}` | 16px | 600 | −0.024em | Document titles |
| `{typography.brand}` | 15px | 700 | +0.2px | Wordmark |
| `{typography.step-title}` | 14px | 700 | −0.024em | Agent step titles |
| `{typography.body}` | 13px | 400 | −0.008em | Default copy, buttons at 600 |
| `{typography.body-sm}` | 12.5px | 400 | −0.008em | Card copy, flags |
| `{typography.caption}` | 12px | 400 | −0.008em | Chips, meta |
| `{typography.field-label}` | 10.5px | 600 | +0.6px UPPER | Data labels (BORROWER, REVENUE) |
| `{typography.eyebrow}` | 10px mono | 500 | +1.2px UPPER | Section taxonomy (HUMAN-IN-THE-LOOP) |
| `{typography.mono-data}` | 11.5px mono | 400 | 0 | Values, thresholds, JSON |
| `{typography.mono-badge}` | 10px mono | 700 | +0.5px | Pills: PASS/BREACH, 94%, kbd |

### Principles

- **Negative tracking scales with size**: −0.024em on headings, −0.008em on body, positive on micro-labels.
- **Eyebrows are mono, uppercase, wide-tracked** — the contrast against tight Inter headings marks them as taxonomy, echoing audit-trail typography.
- **10px floor.** Nothing renders below 10px (a 9/9.5px tier was audited out).
- **Numbers never wobble**: tabular-nums on anything that updates live or sits in a column.
- **Weight pairing**: 700 titles over 400 body; 600 is reserved for interactive labels and field labels.

## Layout

### Spacing System

- **Base unit 4px**; the working rhythm is 8 / 12 / 16 / 20 / 24.
- Panel interiors: `{spacing.lg}` 20px (gate, plan review); inset tiles 10–12px; the workspace gutter is `{spacing.xl}` 24px.
- Buttons: 8px × 14px. Inputs: 9px × 11–12px. Chips: 6px × 13px. Badges: 2–4px × 8–10px.

### App Shell

Three-column shell: **collapsible nav rail** (icon rail ~60px when folded, persisted) |
**document/context panel** (the source CIM; hidden ≤1100px) | **agent canvas** with a sticky
plan bar on top and the composer pinned at the bottom. Full-width screens (Portfolio, Deals,
Agents, Audit) replace the right two columns with stacked sections capped ~1200px.

### Whitespace Philosophy

Sections separate by hairlines and surface changes, not big gaps. Density is a feature — this
is an analyst's tool — but every data cluster gets one clear eye-line: label above, value
below, evidence adjacent.

## Elevation & Depth

| Level | Light treatment | Dark treatment | Use |
|---|---|---|---|
| 0 flat | canvas | canvas | body copy, empty state |
| 1 card | `{colors.panel}` + 1px `{colors.border}` + shadow-xs | surface-1 + hairline + edge highlight | cards, tool rows |
| 2 inset | `{colors.panel-2}`, no shadow | surface-2 | metric tiles, inputs, plan items |
| 3 lifted | shadow-sm | 0 2px 8px black/35% | toasts, live pill, palette |
| live seam | rotating conic teal border + `{colors.gate-glow}` | same, stronger glow | running tool, suspended gate |
| focus | 3px `{colors.accent-soft}` ring + accent border | same | inputs, thumbs, traced cards |

Light leans on the shadow ramp; dark leans on the ladder. Never both at once.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | kbd chips, rec pills, tiny tags |
| `{rounded.sm}` | 6px | buttons, inputs, cards' inner tiles, flags, tool rows |
| `{rounded.md}` | 10px | major panels: gate, what-if, plan review, toasts, composer |
| `{rounded.pill}` | 999px | chips, badges, meter rails, eyebrow badges, autonomy control |
| `{rounded.full}` | 50% | step dots, avatars, slider thumbs |

### Line Semantics

- **Solid hairline** = structure (cards, dividers, tables).
- **Solid strong hairline** = interactive frames and meter rails.
- **Dashed strong hairline** = **sandbox**: the what-if stress panel and the amend-terms
  editor. Dashed says "scratchpad, not the record."
- **3px solid left spine** in a functional color = attribution (amber = reviewer thread).

## Components

### Buttons

**`button-default`** — panel fill, `{colors.border-strong}` frame, ink text. Hover: accent border + `{colors.hover-tint}`.
**`button-primary`** — solid `{colors.accent}` / `{colors.on-accent}`; hover `{colors.accent-hover}`. Carries kbd chips inline (⌘↵).
**`button-approve`** — solid `{colors.good}`: "Countersign & approve" (label flips to "Countersign as amended" when terms were edited).
**`button-reject`** — ghost: transparent fill, `{colors.bad}` border, `{colors.bad-text}` label. On tinted cards it gets solid panel fill.
**`button-rework`** — the neutral middle verb: panel fill, dim text; hover teal.
Press state: 0.06s scale-down (the one fast exception). Disabled: 45% opacity.

### Pills & Badges

**`rec-pill`** — APPROVE/ESCALATE/DECLINE in `{typography.mono-badge}` on the matching *-soft fill; a ghost variant (dashed border, no fill) shows superseded/base values.
**`confidence-badge`** — bucketed: ≥90% good tint, 75–90% warn tint, <75% bad tint. Never a bare number.
**`flag-critical` / `flag-warning` / flag-info** — full-width rows: Lucide icon + message + optional NEEDS HUMAN mono tag; solid functional border in dark.
**`eyebrow-badge`** — uppercase mono pill on accent-soft (HUMAN-IN-THE-LOOP · REVISION 2).
**`kbd`** — 10px mono on `{colors.chip-bg}`; an on-accent variant sits inside primary buttons.

### Cards & Data

**`metric-card`** — inset `{colors.panel-2}` tile: 10.5px uppercase label, 15px mono 700 value, confidence badge. Clickable ones (trace-to-source) lift 1px and ring on hover.
**`tool-card`** — the inspector: mono tool name in accent-text, latency + confidence right-aligned; body unfolds via grid-rows animation with args/result JSON on `{colors.code-bg}`.
**`headroom-bar`** — 4px rail (`{colors.border-strong}`), good/bad fill to the actual, a 2px threshold tick, 10px mono caption ("0.26x over").
**`flip-zones`** — 5px strip under sliders painted in *-soft zone colors with 2px canvas notches at decision boundaries.
**`plan-item`** — flex tile with numbered dot; active = accent-soft + accent frame; done = good frame + check; skipped = 45% opacity + strikethrough.

### The Gate (signature composite)

`{components.gate}` — 10px-radius panel wearing the **live seam**: a slow-rotating conic teal
border + `{colors.gate-glow}` aura. On arrival the seam ignites with one fast sweep and the
glow pulses exactly twice, then everything is STILL. Contains eyebrow badge → recommendation
row → metric grid → flags → summary → required-note textarea → three verbs. The
countersign moment renders a **signature block**: mono `/s/` line for the agent, a drawn SVG
ink flourish for the human (a rotated DECLINED stamp on refusal, a mono `/auto/` line for
policy approvals).

### Inputs

**`text-input` / note textarea / `composer-input`** — panel-2 or panel fill, strong hairline,
focus = accent border + 3px accent-soft ring (the app's one focus language). Range sliders are
fully custom: 4px rail with accent fill to the thumb (`--fill` inline var), 14px accent thumb
with a 2px `{colors.bg}` ring.

## Motion

- **One curve**: `cubic-bezier(0.22, 1, 0.36, 1)` (--ease-out) at 0.16s / 0.32s / 0.6s.
  Exceptions: 0.06s button press; linear slider-follow.
- **Announce, then rest.** Entrances rise 6px + fade; infinite animation is reserved for
  genuinely live states (running seam, streaming shimmer). Any surface where a human must
  read and decide goes still after announcing.
- Signature moments: rail segments ink downward as steps hand off; the gate recedes upstream
  on send-back while an amber revision item slides into the plan; the countersign stamp
  presses in with one soft ring; the signature stroke draws itself.
- `prefers-reduced-motion` snaps everything to final state (durations + delays zeroed).

## Do's and Don'ts

### Do

- Drive every color through tokens; re-skinning must be a token swap.
- Keep teal scarce and meaningful: live, active, focus, provenance, identity.
- Use `{colors.accent-text}` for teal text/icons — solid `{colors.accent}` is a surface color.
- Set every number in mono with tabular-nums; label it with an uppercase micro-label above.
- Frame sandboxes with dashed hairlines; keep the record's surfaces solid.
- Give ghost buttons on tinted surfaces a solid panel fill.
- Announce with motion once, then hold still; guard everything for reduced motion.
- Bucket confidence (high/medium/low tints); below 75% is a flagged event, not just a color.

### Don't

- Don't introduce a second chromatic accent, gradients-as-decoration, or glassmorphism (tried, rejected).
- Don't use a serif anywhere (tried, rejected) or any type below 10px.
- Don't dim or blur content behind a decision surface (tried, rejected).
- Don't color functional states with teal or mark liveness with green/amber/red.
- Don't use pure black (#000) anywhere; the graphite ladder starts at #0a0b0d.
- Don't exceed 10px radius or pill-round rectangular CTAs.
- Don't rely on alpha borders in dark mode for anything that must be seen.
- Don't let any animation loop forever on a surface that asks for a human decision.

## Responsive Behavior

### Breakpoints

| Width | Change |
|---|---|
| >1100px | Full three-column shell |
| ≤1100px | Document panel hides; provenance clicks toast a width hint |
| ≤900px | Deals board 4-up → 2-up; card grids collapse |
| Nav | User-collapsible to a ~60px icon rail with tooltips (persisted), `[` toggles |

### Touch & Keyboard

- Primary controls hold ≥34px height; gate verbs are full buttons with kbd chips (A / R).
- Single-key shortcuts must reject modifier keys (⌘A must stay select-all).
- Focus is always visible: the 3px accent-soft ring or a 2px accent outline.

## Iteration Guide

1. New UI states start as token combinations — check both themes before adding any new color.
2. Reference components by their `components:` names; add variants as new entries.
3. Numbers → mono + tabular-nums + micro-label. No exceptions.
4. Motion: reuse `--ease-out` + `--dur-*`; if it loops forever, it must mean "live right now".
5. Anything speculative (stress tests, amendments) gets the dashed sandbox frame.
6. Verify dark mode against the laws in **Dark Theme** — alpha borders and ghost buttons are the recurring traps.

## Known Gaps

- Front matter documents the **light** (default) theme; dark values live in the Dark Theme table above.
- A visual catalog ships at **`/designsystem`** (source: `public/designsystem/index.html`; live at [credit-analysis-agent.vercel.app/designsystem](https://credit-analysis-agent.vercel.app/designsystem)): swatches, type scale, shapes, controls, and component specimens rendered explicitly in BOTH themes side by side. The running app is the living catalog.
- Spacing is a working rhythm (4px base) rather than a strict enforced scale; some interiors use 9/11/13px optical values.
- Print styles and mobile (<480px) layouts are not designed — this is a desktop demo product.
- The `◧` Countersign brandmark is identity, not part of the icon system (Lucide everywhere else).
