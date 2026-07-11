---
name: Design Studio Canvas
description: >-
  An editorial, calm reading surface for the design-studio pipeline rendered as
  one pannable canvas. The artifacts are documents; typography does the heavy
  lifting. Autonomy and stage-state are expressed through a designed system of
  weight, fill-vs-outline, and labels — never traffic-light dots. One accent,
  indigo, spent only on live meaning. Light (paper) is the canonical theme in
  this front matter; the dark theme is given in the Colors prose and in
  globals.css. Both are first-class.
colors:
  # ── Grounds. A desk (background) holds paper sheets (surface). Neutrals carry
  #    a faint warm bias (hue ~80, very low chroma) so the calm reads as chosen.
  desk:            "oklch(0.955 0.006 85)"    # canvas ground behind the cards
  paper:           "oklch(0.992 0.003 85)"    # card / sheet surface
  paperRaised:     "oklch(0.975 0.005 85)"    # insets, wells, raised strips
  # ── Ink. Warm near-black text; two muted steps for hierarchy.
  ink:             "oklch(0.26 0.008 70)"     # primary reading text
  inkMuted:        "oklch(0.47 0.008 70)"     # secondary text, metadata labels
  inkFaint:        "oklch(0.63 0.006 70)"     # faintest — timestamps, ghosts
  rule:            "oklch(0.88 0.005 80)"     # hairline rules between sheets
  ruleStrong:     "oklch(0.80 0.006 80)"      # emphasized rule / marker outline
  # ── The one accent: indigo. Rationed to LIVE meaning only — current stage,
  #    active selection, live prototype status, the blast-radius highlight.
  accent:          "oklch(0.47 0.15 275)"
  accentInk:       "oklch(0.99 0.01 275)"     # text on an accent fill
  accentWash:      "oklch(0.47 0.15 275 / 0.08)"  # 8% tint for selected rows
  accentEdge:     "oklch(0.47 0.15 275 / 0.30)"   # 30% for selected outlines
  # ── Semantic state — a SEPARATE system from the accent. Used to encode
  #    assumption / decision / prototype state, never as decoration.
  verified:        "oklch(0.50 0.12 150)"     # verified — solid green ink
  partial:         "oklch(0.58 0.13 75)"      # partial — ochre
  unverified:      "oklch(0.55 0.19 25)"      # unverified / at-risk — red ink
  accepted:        "oklch(0.50 0.02 275)"     # accepted risk — deliberate slate
  danger:          "oklch(0.55 0.19 25)"      # error states (= unverified hue)

typography:
  fontFamilySerif: "Iowan Old Style, Georgia, Cambria, 'Times New Roman', serif"  # reading
  fontFamilySans:  "Geist Sans, system-ui, sans-serif"                            # chrome
  fontFamilyMono:  "Geist Mono, ui-monospace, monospace"                          # code, ids
  # Reading scale (serif) — the artifact bodies. Generous leading.
  body:     { family: "serif", size: "1.0625rem", weight: 400, leading: "1.72" }  # 17px reading text
  artifactH1: { family: "serif", size: "1.6rem",  weight: 600, leading: "1.25", tracking: "-0.015em" }
  artifactH2: { family: "serif", size: "1.25rem", weight: 600, leading: "1.3" }
  artifactH3: { family: "serif", size: "1.05rem", weight: 600, leading: "1.4" }
  pullQuote:  { family: "serif", size: "1.2rem",  weight: 400, leading: "1.5", style: "italic" }  # In-their-words
  display:  { family: "serif", size: "2.4rem",  weight: 400, leading: "1.1", tracking: "-0.02em" } # guiding principle
  # Chrome scale (sans) — titles, labels, HUD.
  cardTitle: { family: "sans", size: "0.9375rem", weight: 600, tracking: "-0.005em" }
  small:    { family: "sans", size: "0.8125rem", weight: 400, leading: "1.5" }
  label:    { family: "sans", size: "0.6875rem", weight: 600, tracking: "0.1em", case: "uppercase" }
  mono:     { family: "mono", size: "0.8125rem", weight: 400 }

spacing:
  base:     "0.25rem"    # 4px base scale
  cardPad:  "2rem"       # generous card padding — a page, not a tile
  measure:  "34rem"      # ~68ch reading measure on artifact bodies
  gutter:   "3rem"       # horizontal gap between cards on a stage row
  spineGap: "4rem"       # vertical gap between stage rows on the spine

rounded:
  card:  "0.5rem"        # sheets — square-ish, editorial
  inset: "0.35rem"       # wells, chips inside a card
  pill:  "9999px"        # status chips, HUD buttons
  marker: "9999px"       # spine markers (shape carries state, not color-dot)

components:
  card:                                   # an artifact sheet
    backgroundColor: "{colors.paper}"
    textColor:       "{colors.ink}"
    rounded:         "{rounded.card}"
    padding:         "{spacing.cardPad}"
  cardSelected:                           # current selection — the one accent use on cards
    backgroundColor: "{colors.paper}"
    textColor:       "{colors.ink}"
    rounded:         "{rounded.card}"
  spineMarkerCurrent:                     # the live stage — filled accent, bold label
    backgroundColor: "{colors.accent}"
    textColor:       "{colors.accentInk}"
    size:            "0.85rem"
    rounded:         "{rounded.marker}"
  spineMarkerRan:                         # a completed stage — solid ink fill
    backgroundColor: "{colors.ink}"
    textColor:       "{colors.paper}"
    size:            "0.85rem"
    rounded:         "{rounded.marker}"
  spineMarkerSkipped:                     # not run — hollow outline, faint label
    backgroundColor: "transparent"
    textColor:       "{colors.inkFaint}"
    size:            "0.85rem"
    rounded:         "{rounded.marker}"
  spineMarkerPending:                     # awaiting — dashed outline
    backgroundColor: "transparent"
    textColor:       "{colors.inkMuted}"
    size:            "0.85rem"
    rounded:         "{rounded.marker}"
  stateChip:                              # verified/partial/unverified/accepted label
    backgroundColor: "transparent"        # hairline + filled/half/outline swatch + word
    textColor:       "{colors.inkMuted}"
    rounded:         "{rounded.pill}"
    typography:      "{typography.label}"
  pullQuote:                              # In-their-words — the human's verbatim voice
    backgroundColor: "{colors.paperRaised}"
    textColor:       "{colors.ink}"
    typography:      "{typography.pullQuote}"
    rounded:         "{rounded.inset}"
    padding:         "1rem 1.25rem"
  decisionRetired:                        # a superseded decision — visibly retired, not hidden
    backgroundColor: "{colors.paperRaised}"
    textColor:       "{colors.inkMuted}"
    rounded:         "{rounded.card}"
  hudButton:                              # zoom HUD control
    backgroundColor: "{colors.paper}"
    textColor:       "{colors.ink}"
    rounded:         "{rounded.pill}"
    typography:      "{typography.small}"
  sidebarRowActive:                       # keyboard index — focused row
    backgroundColor: "{colors.accentWash}"
    textColor:       "{colors.ink}"
    rounded:         "{rounded.inset}"
  connector:                              # supersede / rests_on edges drawn between entries
    backgroundColor: "transparent"
    textColor:       "{colors.ruleStrong}"
  connectorLive:                          # blast-radius / active edge
    backgroundColor: "transparent"
    textColor:       "{colors.accent}"
---

# Design Studio Canvas — visual contract

## Overview
The whole design journey — research to prototype — is one pannable board, and the board's first
job is to be **read**. This is an **editorial reading surface**, not an instrument: the artifacts
are documents, so typography carries the design and the chrome recedes. Cards are paper sheets on
a desk; a serif reading face at a real measure (~68ch) and generous leading (1.72) makes a card a
page you actually read at 100% zoom, not a thumbnail you squint at. Calm, quiet, spare. Light
(paper) and dark are both first-class; this front matter is the light theme, the dark theme is in
Colors and in `globals.css`.

## Colors
Two families, kept strictly apart.

**Neutrals** do all the structural work. A **desk** ground holds **paper** sheets; **ink** in three
muted steps (`ink` → `inkMuted` → `inkFaint`) sets text hierarchy; hairline `rule` separates sheets.
Every neutral carries a faint warm bias (hue ~70–85, very low chroma) so the calm reads as a choice.

**The accent** is a single **indigo**, and it is rationed to *live meaning only*: the current stage
marker, the active selection, live prototype status, and the assumption **blast-radius** highlight.
If a whole region is indigo, it is wrong.

**Semantic state** colors are a third, separate system — `verified` green, `partial` ochre,
`unverified`/`danger` red, `accepted` slate — and they encode assumption and decision state, never
decoration and never a second accent. Crucially, **the traffic-light idiom is retired**: these colors
never appear as a bare 🟢🟡🔴 dot standing in for "good/warn/bad." State is always carried by a
*designed* mark — a filled/half/outline swatch paired with a word — so it survives colour-blindness
and greyscale.

Dark theme (in `globals.css`): desk `oklch(0.20 0.006 275)`, paper `oklch(0.245 0.008 275)`,
paperRaised `oklch(0.285 0.009 275)`, ink `oklch(0.94 0.004 85)`, inkMuted `oklch(0.72 0.006 85)`,
inkFaint `oklch(0.58 0.006 85)`, rule `oklch(1 0 0 / 10%)`, ruleStrong `oklch(1 0 0 / 20%)`,
accent `oklch(0.68 0.15 275)`, accentInk `oklch(0.16 0.02 275)`, verified `oklch(0.72 0.14 150)`,
partial `oklch(0.78 0.13 80)`, unverified/danger `oklch(0.68 0.19 25)`, accepted `oklch(0.68 0.03 275)`.

## Typography
Two faces with one job each. A **serif** (`Iowan Old Style`/`Georgia` system stack, no web fetch)
is the *reading* face: every artifact body, heading, pull-quote, and the large guiding-principle
display. A **sans** (`Geist Sans`, bundled) is the *chrome* face: card titles, the uppercase `label`
eyebrow, HUD, sidebar. `Geist Mono` carries ids and code. The reading scale is deliberate —
`body` 17px at 1.72 leading on a 34rem measure, a true `artifactH1/H2/H3` hierarchy, and an italic
`pullQuote` for the **In their words.** voice so the human is visibly distinct from the tool's prose.
Type is the loud element here; everything else is quiet.

## Layout
A vertical **spine** runs down the left — the three phases (Understand / Decide / Build) as sections,
each stage a marker. Off each marker, artifact cards run horizontally (`gutter` apart); rows are
`spineGap` apart. Cards are paper `card` surfaces with `cardPad` padding and a reading `measure`
cap on body text, so one overgrown document can't distort the board. Everything lives on one world
container that pans and zooms as a unit.

## Elevation & Depth
Light and editorial: depth is a **hairline and a hair of lift**, never a heavy drop shadow. A card
sits above the desk by one `rule` border and a barely-there shadow. The selected card and the live
stage get the accent, not more shadow. Retired (superseded) entries *recede* — `paperRaised` ground
and `inkMuted` text — so the live path stands forward without anything being hidden.

## Shapes
Editorial and square-ish: `card` radius 0.5rem on sheets, `inset` on wells and chips, full `pill`
on status chips and HUD buttons, `marker` (circle) on spine markers where **shape, not colour**,
carries state (filled = ran, filled-accent = current, hollow = skipped, dashed = pending).

## Components
`card` is the one surface primitive. Stage state is a set of `spineMarker*` variants distinguished
by **fill vs outline** and label weight — `Current` (accent fill, bold), `Ran` (ink fill), `Skipped`
(hollow, faint, labelled "not run"), `Pending` (dashed). Autonomy rides the same idiom: `execute` /
`draft` / `scaffold` become the words **Auto / Review / You decide**, never coloured dots.
`stateChip` renders assumption/decision state as a small filled/half/outline swatch + word.
`pullQuote` gives the In-their-words voice a raised, italic block. `decisionRetired` visibly retires
a superseded entry in place. `connector` draws supersede and `rests_on` edges as thin rules;
`connectorLive` is the accent blast-radius edge. `hudButton`, `sidebarRowActive`, and the focus ring
complete the chrome.

## Do's and Don'ts
- **Do** reserve indigo (`colors.accent`) for live meaning only — current stage, active selection,
  live prototype, blast-radius. **Don't** use it as a background wash or decorative fill.
- **Do** carry every state with a designed mark (fill/half/outline + a word). **Don't** ever ship a
  bare 🟢🟡🔴 dot — the traffic-light idiom is retired here.
- **Do** keep the reading measure (~68ch) and serif body on artifact cards — readability at 100% is
  the acceptance test. **Don't** let a card become a thumbnail.
- **Do** keep semantic status (green/ochre/red/slate) separate from the accent and from decoration.
  **Don't** add a second accent hue.
- **Do** express depth with a hairline and a hair of lift. **Don't** reach for heavy drop shadows.
- **Do** keep superseded entries visible-but-retired. **Don't** hide the real path.
- **Do** derive every value from a token here. **Don't** hardcode a hex/oklch in a component.

## Contrast (hand-checked — `npx @google/design.md lint` unavailable in this sandbox)
Estimated WCAG AA against the canonical light theme:
- `ink` on `paper` — ~13.5:1 ✅ · `inkMuted` on `paper` — ~5.6:1 ✅ (AA normal) ·
  `inkFaint` on `paper` — ~3.4:1 (AA large / non-text only — used for timestamps at ≥ small only).
- `accent` (indigo) as text on `paper` — ~8.2:1 ✅ · `accentInk` on `accent` fill — ~8:1 ✅.
- `verified` on `paper` — ~4.8:1 ✅ · `unverified`/`danger` on `paper` — ~4.9:1 ✅ ·
  `partial` on `paper` — ~3.6:1 (AA large / paired always with a word + swatch, never colour alone).
- Dark theme spot-checks: `ink` on `paper(dark)` — ~12:1 ✅ · `accent(dark)` on `paper(dark)`
  — ~6.1:1 ✅ · `inkMuted(dark)` on `paper(dark)` — ~4.8:1 ✅.
- `partial`/`inkFaint` are the two sub-AA-normal values; both are used only as large text or paired
  with a non-colour mark, per the "designed mark, never colour alone" rule above — so no information
  is carried by a failing pair. Re-lint with the CLI when available.
