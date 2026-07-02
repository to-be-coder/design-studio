---
version: alpha
name: Studio Wall — Ember
colors:
  primary: "#FF8A3D"
  primary-pressed: "#E87729"
  primary-dim: "#402917"
  canvas: "#141009"
  surface: "#1B150D"
  elevated: "#231B11"
  card: "#2B2216"
  hairline: "#3B2F1D"
  ink: "#E8DCC9"
  ink-dim: "#AD9E80"
  dot-ok: "#63C78A"
  dot-warn: "#D9A441"
  dot-err: "#D96A6A"
typography:
  display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.01em
  metric:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  micro:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.09em
  mono:
    fontFamily: ui-monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  section: 56px
rounded:
  sm: 10px
  lg: 16px
  pill: 999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
  button-tertiary:
    backgroundColor: "{colors.elevated}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  button-ghost:
    textColor: "{colors.ink-dim}"
  tile:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  palette:
    backgroundColor: "{colors.elevated}"
    rounded: "{rounded.lg}"
  palette-row-selected:
    backgroundColor: "{colors.primary-dim}"
    textColor: "{colors.ink}"
  chip:
    backgroundColor: "{colors.elevated}"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.pill}"
  chip-active:
    backgroundColor: "{colors.primary-dim}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
  drillin:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  divider:
    backgroundColor: "{colors.hairline}"
    height: 1px
  status-dot-ok:
    backgroundColor: "{colors.dot-ok}"
    size: 8px
  status-dot-warn:
    backgroundColor: "{colors.dot-warn}"
    size: 8px
  status-dot-err:
    backgroundColor: "{colors.dot-err}"
    size: 8px
---

## Overview

Ember: amber phosphor on warm near-black — an instrument panel, not a light show. The wall is
ambient by default (a glanceable status surface and the social screenshot) and an operator
surface on intent (⌘K palette, hover affordances). One hue carries the whole interface; calm is
the product. Chosen from specimen boards against a blue candidate (Orbital) on 2026-07-02 —
see `wall/design/Decisions/0004 language.md`.

## Colors

Amber (`{colors.primary}`) is chrome, action, and focus — there is no second accent. The four
background steps (`canvas → surface → elevated → card`) are the **surface ladder**: all elevation
comes from stepping up the ladder, never from shadows. `ink` and `ink-dim` are warm — never pure
white; `canvas` is warm — never pure black. `primary-dim` marks selection and active chips: it
is 13% amber **precomposited over `elevated`** into a solid, so its contrast pairings are
verifiable in this contract rather than depending on what an alpha value happens to sit on.
The three `dot-*` colors are **instrument lights**: they exist only as the `status-dot-*`
components, size-capped at 8px in the contract itself — never fills, text, chart strokes, or
borders. The known risk of an amber brand hue is reading as a warning state; the dot-size cap
and the single-primary-action rule are what prevent that.

## Typography

Inter (system fallbacks acceptable), tabular numerals everywhere data appears
(`font-feature-settings: "tnum"`). `display` for the wordmark, `metric` for tile numbers,
`body` for prose, `micro` (uppercase, tracked) for panel labels, `mono` for log lines and
keyboard hints. No font weight above 600 — instrument panels don't shout.

## Layout

8px base rhythm. Tiles sit on `{colors.surface}` with hairline borders in a responsive grid;
`{spacing.section}` separates major regions. The default (ambient) view shows **zero buttons**:
tiles, dots, one computed primary action, nothing else. Density comes from restraint —
whitespace is the differentiator against the cluttered dashboards this product competes with.

## Elevation & Depth

Surface ladder only: `canvas` (page) → `surface` (tiles) → `elevated` (palette, inputs, chips) →
`card` (highest, rare). Hairline borders (`{colors.hairline}`) define edges. **No drop shadows,
no glow, no blur.** Overlays (palette, drill-ins) dim the page beneath with canvas at high
opacity, never black.

## Shapes

`{rounded.sm}` for inputs, small controls, and table containers; `{rounded.lg}` for tiles and
overlays; `{rounded.pill}` exclusively for the primary action and chips. No other radii.

## Components

`button-primary` is **the only filled-accent element on screen** — one per view, computed by
the wall ("Review draft crossing" beats "Run wiki-lint" beats nothing). `button-tertiary` is the
mid-emphasis soft surface; `button-ghost` is dim text for handoffs and de-emphasis. Secondary
actions never render as button rows: they live in the ⌘K `palette` (rows use
`palette-row-selected` with a 2px inset accent bar) and per-card ⋯ overflow revealed on
hover/focus. `chip-active` is the only other place the tint appears.

## Do's and Don'ts

- Do keep the ambient view button-free; controls appear on intent (hover, focus, ⌘K).
- Do compute one primary action; if two things feel primary, neither is — pick.
- Do use the surface ladder for all depth; if a shadow feels needed, step the ladder instead.
- Don't use pure `#FFFFFF` or `#000000` anywhere, for anything.
- Don't let semantic color exceed an 8px dot — no red text, no green fills, no amber banners.
- Don't add a second accent hue; illustration, charts, and focus states all derive from amber
  and its tints.
- Don't animate for delight; motion only communicates state change, and respects
  `prefers-reduced-motion`.
