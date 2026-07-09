---
name: Design Studio Web
description: >-
  Dark-first, monotone-with-one-blue instrument UI for the design-studio pipeline
  dashboard. Derived faithfully from the shipped src/app/globals.css.
# ── Values are the committed DARK theme (the default look). A light fallback
#    exists in globals.css but the instrument is designed dark.
colors:
  # Grounds — neutrals carry a whisper of blue (hue ~260, low chroma) so the
  # monochrome reads as chosen, not defaulted.
  background:        "oklch(0.155 0.008 260)"   # near-black, faintly cool
  surface:           "oklch(0.185 0.008 260)"   # cards / panels
  surfaceRaised:     "oklch(0.27 0.011 260)"    # hover / raised
  foreground:        "oklch(0.955 0.004 260)"   # primary text
  muted:             "oklch(0.7 0.008 260)"     # secondary text
  border:            "oklch(1 0 0 / 9%)"        # hairlines
  input:             "oklch(1 0 0 / 13%)"
  # The one accent — blue. Rationed to meaning only.
  accent:            "oklch(0.64 0.16 255)"
  accentForeground:  "oklch(0.99 0.01 255)"
  accentGlow:        "oklch(0.64 0.16 255 / 0.35)"
  ring:              "oklch(0.64 0.15 255)"
  # Neutral primary — near-white, for default (non-accent) buttons.
  primary:           "oklch(0.92 0.004 260)"
  primaryForeground: "oklch(0.2 0.008 260)"
  # Semantic status — SEPARATE from the accent; used only to encode state.
  statusActive:      "oklch(0.64 0.16 255)"     # = accent (a live project)
  statusBlocked:     "oklch(0.72 0.16 70)"      # amber
  statusDone:        "oklch(0.7 0.15 155)"      # emerald
  danger:            "oklch(0.62 0.2 20)"

typography:
  fontFamily:     "Geist Sans, system-ui, sans-serif"
  fontFamilyMono: "Geist Mono, ui-monospace, monospace"
  display: { size: "1.875rem", weight: 600, tracking: "-0.02em" }              # page titles
  heading: { size: "1.25rem",  weight: 600, tracking: "-0.01em" }              # section heads
  title:   { size: "1rem",     weight: 600, tracking: "-0.01em" }              # card / row titles
  body:    { size: "0.9375rem", weight: 400, leading: "1.6" }                  # 15px reading text
  small:   { size: "0.8125rem", weight: 400 }                                  # 13px
  label:   { size: "0.6875rem", weight: 600, tracking: "0.08em", case: "uppercase" }  # 11px eyebrows
  mono:    { size: "0.78rem",   weight: 400 }                                  # code / console

spacing:
  base:    "0.25rem"   # 4px base scale (Tailwind)
  rowGap:  "1rem"      # between items in a row
  section: "1.5rem"    # between sections
  page:    "2rem"      # page padding (md+)

rounded:
  base:  "0.7rem"      # --radius
  panel: "1.12rem"     # base * 1.6 — cards, rails, side-nav
  pill:  "9999px"      # buttons, badges, chips
  dot:   "9999px"      # pipeline nodes

components:
  panel:
    backgroundColor: "{colors.surface}"    # rendered at ~82% opacity + 8px backdrop-blur
    textColor:       "{colors.foreground}"
    rounded:         "{rounded.panel}"
    padding:         "1.25rem"
  runButton:                               # the accent action
    backgroundColor: "{colors.accent}"
    textColor:       "{colors.accentForeground}"
    rounded:         "{rounded.pill}"
    height:          "1.75rem"
    padding:         "0 0.75rem"
    typography:      "{typography.small}"
  defaultButton:                           # neutral, non-accent
    backgroundColor: "{colors.primary}"
    textColor:       "{colors.primaryForeground}"
    rounded:         "{rounded.pill}"
  copyButton:                              # gated-skill action
    backgroundColor: "transparent"
    textColor:       "{colors.muted}"
    rounded:         "{rounded.pill}"
  statusPill:
    backgroundColor: "transparent"         # hairline border + a state dot
    textColor:       "{colors.foreground}"
    rounded:         "{rounded.pill}"
  stageDotActive:
    backgroundColor: "{colors.accent}"     # + accentGlow shadow
    size:            "0.625rem"
    rounded:         "{rounded.dot}"
  stageDotPending:
    backgroundColor: "transparent"         # 1.5px inset ring in {colors.accent}
    size:            "0.625rem"
    rounded:         "{rounded.dot}"
  listRowSelected:
    backgroundColor: "{colors.accent}"     # rendered at 12% tint + 32% inset ring
    textColor:       "{colors.foreground}"
  focusRing:
    backgroundColor: "transparent"
    textColor:       "{colors.ring}"       # 3px ring on focus-visible
---

# Design Studio Web — visual contract

## Overview
An **instrument, not a document**: a dark, spare dashboard whose job is to make the design-studio
pipeline legible at a glance. The whole surface is monochrome — neutrals with a faint blue bias
(hue ~260) — with **exactly one saturated color, blue**, spent only where it carries meaning. The
pipeline is the hero: stage nodes encode true per-stage state, and the single blue marks what is
*live*. Derived faithfully from the shipped `src/app/globals.css`; this file is now the source of
truth and the CSS should be generated from it.

## Colors
Two families. **Neutrals** (`background` → `surfaceRaised`, `foreground`, `muted`, `border`) do all
the structural work — grounds, text, hairlines — and are never pure gray: every one carries hue 260
at very low chroma. **The accent** (`accent`, blue) is rationed: current stage, active nav, the Run
action, links, focus ring, and the glow on a live node. **Semantic status** colors (`statusBlocked`
amber, `statusDone` emerald, `danger`) are a separate system — they encode state only and must never
be used decoratively or as a second accent.

## Typography
`Geist Sans` throughout, `Geist Mono` for code, skill names, and console output. One scale
(`display` → `mono`); headings are semibold with tight tracking, body is 15px at 1.6 leading, and
`label` is the 11px uppercase eyebrow used for section headers and metadata. Type does the quiet
work; it is never the loud element.

## Layout
A fixed left rail (`panel`, 15rem) + a scrolling main column. Content sits in `panel` surfaces
separated by hairlines and `section` gaps; lists use dividers, not boxes. Generous whitespace and a
tight geometric grid carry the "futuristic + simple" read. Spacing is the 4px base scale.

## Elevation & Depth
Dark UI, so **depth is light, not shadow**. Panels are translucent (`surface` at ~82%) over a faint
background grid + a single blue radial glow. Elevation is expressed by surface lightness
(`background` → `surface` → `surfaceRaised`) and hairline `border`, plus an `accentGlow` bloom on
live/active elements. Avoid drop shadows.

## Shapes
Soft but not round: `panel` radius on surfaces (~1.12rem), full `pill` on every button/badge/chip,
`dot` on pipeline nodes. Consistent radii are part of the calm.

## Components
`panel` is the one surface primitive (side-nav, rail, cards, content). Actions split by autonomy:
`runButton` (accent-filled, for 🟢/🟡 runnable skills) vs `copyButton` (quiet, bordered, for 🔴
gated skills) — the *look* encodes whether a human is required. `stageDot` variants (`active`,
`pending`, derived/neutral, skipped, none) are the core information design: a filled+glowing blue
dot = live, a blue ring = pending, a neutral fill = done/derived, a faint ring = skipped.
`listRowSelected` uses a 12% accent tint + inset ring. Every interactive element gets the blue
`focusRing`.

## Do's and Don'ts
- **Do** reserve blue (`colors.accent`) for *live/current meaning* only — current stage, active nav,
  Run, links, focus, live-node glow.
- **Don't** use blue as a decorative fill, a background wash, or on large areas. If a whole region is
  blue, it's wrong.
- **Do** keep every neutral faintly blue (hue ~260, low chroma). **Don't** use a pure/neutral gray —
  it reads as unconsidered.
- **Don't** add a second accent hue. Status colors (amber/emerald/rose) are for state only, never
  decoration.
- **Do** express depth with surface lightness, hairlines, and a restrained glow. **Don't** reach for
  drop shadows.
- **Do** let `runButton` vs `copyButton` carry the 🟢/🔴 distinction visually. **Don't** make a gated
  skill look runnable.
- **Do** derive every value from a token here. **Don't** hardcode a hex/oklch in a component.

## Contrast (hand-checked — `design.md lint` unavailable, npx blocked)
Estimated WCAG AA, dark theme:
- `foreground` on `background` — ~15:1 ✅ · `muted` on `background` — ~6.7:1 ✅ (AA normal)
- `accent` as text on `background` — ~4.7:1 ✅ (passes AA normal, borderline — keep accent text ≥ small/medium)
- ⚠ **`accentForeground` (white) on `accent` fill (the Run button) — ~3.2:1 — FAILS AA for normal text.**
  This is a real finding surfaced by the faithful derive (not silently fixed). Resolve by **deepening
  the fill blue for buttons** (e.g. `accent` → ~`oklch(0.5 0.17 255)` for `runButton.backgroundColor`
  only, keeping the lighter blue for text/dots/glow), or by enlarging/bolding the button label. Track
  at `validate`.
