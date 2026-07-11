---
name: Fixture Prototype
description: >-
  A tiny static prototype used only by the Playwright smoke suite. Its DESIGN.md
  is the token source the Comment / Tweak / Tokens / component-board slices read,
  and it deliberately carries one below-AA color pair so the design-system board
  has a failure to flag.
colors:
  bg: "#ffffff"          # page ground
  surface: "#f4f5f7"     # card / raised surface
  text: "#1a1d21"        # primary text — high contrast on bg
  textMuted: "#5b6270"   # secondary text
  primary: "#3b5bdb"     # primary action
  primaryText: "#ffffff" # text on primary
  border: "#d1d5db"      # hairline
  faint: "#c7cbd2"       # DELIBERATE: faint on surface is below AA (~1.5:1)
  danger: "#e03131"      # destructive
typography:
  fontFamily: "system-ui, -apple-system, sans-serif"
  h1:    { size: "2rem",      weight: 700, leading: "1.2" }
  h2:    { size: "1.5rem",    weight: 600, leading: "1.3" }
  body:  { size: "1rem",      weight: 400, leading: "1.6" }
  small: { size: "0.8125rem", weight: 400, leading: "1.4" }
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
rounded:
  sm: "4px"
  md: "8px"
  pill: "9999px"
components:
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primaryText}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  buttonHover:
    backgroundColor: "#2f4bc4"
    textColor: "{colors.primaryText}"
  buttonActive:
    backgroundColor: "#263c9e"
    textColor: "{colors.primaryText}"
  buttonDisabled:
    backgroundColor: "{colors.faint}"
    textColor: "{colors.primaryText}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "16px"
    border: "{colors.border}"
  cardHover:
    backgroundColor: "#eceef1"
    textColor: "{colors.text}"
  badge:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.primaryText}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
---

# Fixture Prototype — visual contract

## Overview
A minimal token contract for the smoke suite. Two data-component families — `button` and `card` —
appear across three routes with real instances, plus a recurring uncodified `stat-tile` signature
that exists in the markup but not in the token contract.

## Colors
`primary` is the one action color. Text is near-black `text` on white `bg`. `faint` is intentionally
too light on `surface`, so the design-system board has a real below-AA pair to flag.

## Do's and Don'ts
- **Do** use `primary` for the single main action on a screen. **Don't** use `danger` as decoration.
- **Do** keep body text as `text` on `bg`. **Don't** put `faint` text on `surface` — it fails contrast.
- **Do** promote a recurring markup pattern into the `components` group. **Don't** let it stay uncodified.
