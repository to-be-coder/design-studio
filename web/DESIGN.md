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
  # ── Overlay. Modal scrim — a dark wash in BOTH themes (it darkens the page
  #    behind a dialog, so it must NOT follow ink, which flips light in dark).
  scrim:           "oklch(0 0 0 / 0.45)"      # light 0.45 · dark 0.60

typography:
  fontFamilySerif: "Geist Sans, system-ui, sans-serif"                            # reading — unified onto the one sans face
  fontFamilySans:  "Geist Sans, system-ui, sans-serif"                            # chrome
  fontFamilyMono:  "Geist Mono, ui-monospace, monospace"                          # code, ids
  # Reading scale — the artifact bodies (one sans face, no serif). Generous leading.
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
  # Canvas nav + reading-pane scale: four named steps so the chrome reads as one
  # system (a dim group caption over bright nav rows, pane section labels over body).
  navLabel:   { family: "sans", size: "0.75rem",  weight: 600, tracking: "0.08em", case: "uppercase" }  # 12px sidebar group header (dim)
  navRow:     { family: "sans", size: "0.875rem", weight: 400 }                                          # 14px sidebar nav rows (full ink, active keeps accent)
  panelLabel: { family: "sans", size: "0.875rem", weight: 600, tracking: "0.08em", case: "uppercase" }  # 14px reading-pane section labels + inline For:/Against:
  panelBody:  { family: "sans", size: "1rem",     weight: 400, leading: "1.6" }                          # 16px reading-pane body, cards, asks, buttons, textareas

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

motion:
  duration:
    fast:     "140ms"     # label and hover color response
    tabGlide: "240ms"     # shared tab indicator movement
  easing:
    standard: "cubic-bezier(0.2, 0, 0, 1)"
    tabGlide: "cubic-bezier(0.22, 1, 0.36, 1)"

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
  navRow:                                 # side nav rows: resting at full ink (bright)
    backgroundColor: "transparent"
    textColor:       "{colors.ink}"
    rounded:         "{rounded.inset}"
  navRowHover:                            # the same rows on hover or focus-visible
    backgroundColor: "{colors.paperRaised}"
    textColor:       "{colors.ink}"
    rounded:         "{rounded.inset}"
  sidebarRowActive:                       # the same rows, selected (one treatment, both lists)
    backgroundColor: "{colors.accentWash}"
    textColor:       "{colors.accent}"
    rounded:         "{rounded.inset}"
  reviewTabList:                          # one shared baseline, never separate pills
    backgroundColor: "transparent"
    textColor:       "{colors.inkMuted}"
    borderColor:     "{colors.rule}"
    borderWidth:     "1px"
  reviewTabActive:                        # selected tab: accent word + 2px baseline
    backgroundColor: "transparent"
    textColor:       "{colors.accent}"
    borderColor:     "{colors.accent}"
    borderWidth:     "2px"
    duration:        "{motion.duration.tabGlide}"
    easing:          "{motion.easing.tabGlide}"
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
a desk; a clean sans reading face at a real measure (~68ch) and generous leading (1.72) makes a card a
page you actually read at 100% zoom, not a thumbnail you squint at. Calm, quiet, spare. Light
(paper) and dark are both first-class; this front matter is the light theme, the dark theme is in
Colors and in `globals.css`.

**Voice.** Product copy avoids the em dash. This product's bar is *designed, not generated*, and a
stray em dash reads as an AI tell, so the app's own strings (labels, headings, empty and error
states, tooltips, buttons) use a comma, a colon, parentheses, or two short sentences instead. The
rule governs copy the app authors; a human's own vault documents are rendered verbatim and left
exactly as written.

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
partial `oklch(0.78 0.13 80)`, unverified/danger `oklch(0.68 0.19 25)`, accepted `oklch(0.68 0.03 275)`,
scrim `oklch(0 0 0 / 0.60)` (a touch deeper over the already-dark page).

## Typography
One face across the whole surface. **`Geist Sans`** carries everything — every artifact body,
heading, pull-quote, and the guiding-principle display (the *reading* role) as well as card titles,
the uppercase `label` eyebrow, HUD, and sidebar (the *chrome* role). The `fontFamilySerif` token is
kept as the reading alias but points at the same sans stack, so no serif is used. `Geist Mono`
carries ids and code. The reading scale is deliberate —
`body` 17px at 1.72 leading on a 34rem measure, a true `artifactH1/H2/H3` hierarchy, and an italic
`pullQuote` for the **In their words.** voice so the human is visibly distinct from the tool's prose.
Type is the loud element here; everything else is quiet. The chrome and reading pane resolve to
four named steps. In the sidebar, a dim uppercase group caption (`navLabel`, 12px, `inkMuted`) sits
over bright navigation rows (`navRow`, 14px, full `ink`); the active row keeps its `accentWash` plus
`accent` treatment, never a larger size, so each group reads as one even list. In the reading pane,
uppercase section labels (`panelLabel`, 14px) caption the pane's own prose and card text
(`panelBody`, 16px), with the active accent unchanged; rendered artifact and vault documents keep
the `body` reading size (17px), so a read page stays a read page.

What's Worth Building uses that same scale as an explicit reading order. Each review list starts
with an 18px title and plain-language instruction. Every actionable card shows one judgment brief
before its controls: the call in a `paperRaised` lead, then labeled rows for why the human is needed,
what the paths change, and the strongest evidence signal. Candidate cards express the evidence as
the strongest case for and against. Raw receipts and long research notes stay folded because they
are audit material, not the context required to decide. A card missing a judgment field does not
show an audit warning to the reviewer. The verifier sends that source defect back to research, while
the card shows the useful context and controls that remain. A content-quality problem never blocks
the human from responding. A cut-off question becomes a clarification task rather than a
fake decision: show the captured fragment, one concrete instruction, a "What I meant was" field,
and permission to skip. No visible judgment line uses a document name, wikilink, decision id, or
shorthand such as "the first promise" in place of the actual choice or consequence. The referent is
expanded on the card, while the source stays in the folded evidence. A `rule` separates the action
area from the brief. Every control names its recorded outcome. A two-path proposal uses "Keep
current" and "Take proposal"; a closed question shows every named answer as a button; a build
candidate uses "Build this", "Save for later", and "Leave it out". Only genuinely open questions
use a text field. Every actionable card leads with the label "Decision needed" and a direct question.
When legacy source material mixes two questions into one card, the second is surfaced as "Decision
2" instead of being buried in explanation. The outer card edge stops before the action row, so no
extra border runs underneath already bordered buttons. Primary
choices use full `ink`, while explanations use `inkMuted`, so an available action never looks
disabled. Question cards use an accent edge for the live human task, reduce the ledger id to
metadata, and put a one-sentence answer directly after the complete brief.

Build input uses the same card system as Needs you and Build candidates. Its read-only cards keep
the same `paper` surface, strong rule with no bottom edge, 20px inset, 18px title, uppercase state
eyebrow, and body hierarchy. The state, title, and short human context stay visible. Long reasons
and receipts start folded behind a "Show the evidence" control, because moving a decision into the
build record does not turn its audit trail into primary reading. Navigation cards for Structure and
Design system use the same shell and type hierarchy so the tab does not switch visual languages.

The three What's Worth Building views use a conventional tab strip, not pill buttons. One continuous
`rule` runs under the group. Each tab sits directly on that baseline with square edges and no individual
outline. A single 2px `accent` indicator glides to the active tab in 240ms using `tabGlide`; it changes
width as well as position, so it always belongs to the selected label. The label color crossfades in
140ms using `standard`. Inactive tabs use `inkMuted`, with `paperRaised` only on hover. The tab labels
remain 16px semibold, counts use normal weight, and keyboard focus uses the shared focus ring. Motion
never bounces or delays the panel change, and the global reduced-motion rule makes both transitions
effectively instant. This connected baseline is what makes the controls read as alternate views of one
surface rather than filters or independent actions.

## Layout
A vertical **spine** runs down the left — the two phases (Understand / Build) as sections,
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
complete the chrome. `reviewTabList` and `reviewTabActive` define the connected review navigation:
one shared rule, square tabs, and one accent indicator that glides to the current view.
Override receipts remain project history in the source dashboard, not shared Canvas chrome. They
never render above Structure, Design system, or Build. Those Build-phase boards stay focused on
their own work instead of repeating process history.

## Do's and Don'ts
- **Do** reserve indigo (`colors.accent`) for live meaning only — current stage, active selection,
  live prototype, blast-radius. **Don't** use it as a background wash or decorative fill.
- **Do** carry every state with a designed mark (fill/half/outline + a word). **Don't** ever ship a
  bare 🟢🟡🔴 dot — the traffic-light idiom is retired here.
- **Do** keep the reading measure (~68ch) and the sans reading body on artifact cards — readability
  at 100% is the acceptance test. **Don't** let a card become a thumbnail.
- **Do** keep semantic status (green/ochre/red/slate) separate from the accent and from decoration.
  **Don't** add a second accent hue.
- **Do** express depth with a hairline and a hair of lift. **Don't** reach for heavy drop shadows.
- **Do** keep superseded entries visible-but-retired. **Don't** hide the real path.
- **Do** derive every value from a token here. **Don't** hardcode a hex/oklch in a component.
- **Do** write the app's own copy with commas, colons, parentheses, or two short sentences.
  **Don't** put an em dash (or a spaced hyphen standing in for one) in product copy; it reads as an
  AI tell, and the bar here is designed, not generated. Rendered vault content stays verbatim.
- **Do** give every list of navigable rows (the side nav and the document contents rail / files
  list) one shared treatment: resting `navRow`, `navRowHover` (`paperRaised` background) on hover
  and focus-visible, `sidebarRowActive` (`accentWash` background, `accent` text) when selected, all
  `rounded.inset`. **Don't** invent a different hover or selected style per list, and don't fill a
  selected row or review tab with solid `accent`; review tabs use an accent baseline.

## Contrast (hand-checked here; enforced by the owned `design-lint.mjs`)
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
