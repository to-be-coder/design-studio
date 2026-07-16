# DESIGN.md — the studio's owned format

This is the design-studio pipeline's **own** definition of the `DESIGN.md` visual-contract format.
Skills author against this file — the one that sits beside `CONVENTIONS.md` — never against a
runtime fetch, an `npx` command, or memory. Change the format here, nowhere else.

---

## Provenance

**Forked from** [`google-labs-code/design.md`](https://github.com/google-labs-code/design.md),
`docs/spec.md` on the `main` branch (upstream version tag: `alpha`), retrieved **2026-07-13** from
`https://raw.githubusercontent.com/google-labs-code/design.md/main/docs/spec.md`.

The base — token groups, `{path.to.token}` references, fixed section order, the component sub-token
vocabulary, and unknown-content behavior — is Google's. The studio owns the text from here and has
made two deliberate extensions, both marked **[studio extension]** below:

1. a **motion** token group (duration / easing / transition) — retires expert finding **V9**
   (motion was inexpressible), and
2. **declarable accessibility floors** — minimum contrast ratios stated up front in the Colors
   section so candidate token sets are drafted *inside* the constraint rather than checked after
   (retires **V8**).

Why we forked rather than depended: the visual contract is the product's most load-bearing
artifact, and it had depended on alpha software fetched at runtime — a dependency that failed three
ways (a broken `spec` command, `npx` blocked in both live runs so the lint gate never fired, and a
vocabulary that could not express motion). See vault decision `0025 own-the-design-format`.

---

## What a DESIGN.md is

A `DESIGN.md` is a self-contained, plain-text representation of a design system: the visual identity
that both humans and coding agents follow across sessions and tools. It has two parts:

- **YAML front matter** — the machine-readable **design tokens** (the normative values).
- **A markdown body** — human-readable rationale: when and why to apply each token.

The tokens are the source of truth; the prose is context. Prose may use descriptive names ("warm
limestone") that correspond to systematic token names (`neutral`).

---

## Front matter — the token schema

The front matter block begins with a line containing exactly `---` and ends with a line containing
exactly `---`. Between them:

```yaml
version: alpha            # optional
name: <string>
description: <string>     # optional
colors:
  <token-name>: <Color>
contrast:                 # [studio extension] a11y floors — see Colors
  normalText: <number>    # WCAG AA floor for normal text (default 4.5)
  largeText: <number>     # WCAG AA floor for large / non-text (default 3.0)
  pairs:
    - { fg: <Color|ref>, bg: <Color|ref>, min: <number>, note: <string> }
typography:
  <token-name>: <Typography>
spacing:
  <scale-level>: <Dimension | number>
rounded:
  <scale-level>: <Dimension>
motion:                   # [studio extension] — see Motion
  duration:
    <name>: <Duration>    # a time value: 120ms, 0.2s
  easing:
    <name>: <Easing>      # a CSS timing function or a {motion.easing.*} ref
  transition:
    <name>: <Transition>  # composite; may reference duration + easing
components:
  <component-name>:
    <sub-token>: <value | token reference>
```

**Value types**

- **Color** — any valid CSS color string: hex (`#RGB`/`#RGBA`/`#RRGGBB`/`#RRGGBBAA`), named
  (`red`, `transparent`), functional (`rgb()`, `rgba()`, `hsl()`, `hwb()`), wide-gamut (`oklch()`,
  `oklab()`, `lch()`, `lab()`), or `color-mix(...)`. All colors are converted to sRGB for WCAG
  contrast math; the original form is preserved for display and export. Hex is the recommended
  default.
- **Dimension** — a string with a unit suffix: `px`, `em`, or `rem`.
- **Duration** — a time value with a `ms` or `s` suffix (`120ms`, `0.2s`). **[studio extension]**
- **Number** — a bare numeric value (e.g. a unitless `lineHeight`, a column count, a contrast floor).

**Scale levels.** `<scale-level>` is a named step in a sizing/spacing scale. Common names: `xs`,
`sm`, `md`, `lg`, `xl`, `full`. Any descriptive string key is valid.

---

## Token groups

### colors

Defines the color palettes. At least a `primary` (or, in a neutral-led system, a base ground) color
must be present. When there are multiple palettes, a common convention names them `primary`,
`secondary`, `tertiary`, `neutral`, plus roles like `surface`, `on-surface`, `error`. Any consistent
naming convention is valid; unknown color-token names are accepted if their value is a valid Color.

#### Accessibility floors **[studio extension]**

Contrast floors are **declared up front**, in the Colors section, as a top-level `contrast:` block
(a sibling of `colors:`, kept separate so the `colors` map holds only Color values). Floors are a
**drafting constraint, not just a post-hoc check**: candidate token sets are drawn to satisfy them
before specimen boards are rendered, and the owned lint enforces them.

```yaml
contrast:
  normalText: 4.5     # global floor every text/ground pairing must clear (WCAG AA normal)
  largeText: 3.0      # floor for large text (≥24px, or ≥18.66px bold) and non-text marks
  pairs:              # explicit pairings the language must satisfy — drafted inside, then checked
    - { fg: "{colors.ink}",      bg: "{colors.paper}",  min: 7,   note: "body reading text — AAA" }
    - { fg: "{colors.inkMuted}", bg: "{colors.paper}",  min: 4.5, note: "secondary text" }
    - { fg: "{colors.accentInk}", bg: "{colors.accent}", min: 4.5, note: "text on the accent fill" }
```

- `normalText` / `largeText` are the global floors. If omitted, the lint applies WCAG AA defaults
  (4.5 and 3.0).
- Each `pairs` entry names two colors (literal or `{ref}`) and the `min` ratio that pairing must
  meet. `note` is optional prose. A declared pair below its `min` is a **lint failure** — the
  floor was promised, so the language must keep it.
- A pairing that carries information by color alone must clear the floor. A pairing that is always
  paired with a non-color mark (a word, an icon, a fill/outline shape) may sit at `largeText` and
  should say so in its `note` — the mark, not the color, carries the meaning.

### typography

Defines typography levels (most systems have 9–15). Common naming: `headline`/`display`/`body`/
`label`/`caption`, each optionally split `sm`/`md`/`lg`. Each level is a **Typography** object:

- `fontFamily` (string)
- `fontSize` (Dimension) — also accepted as `size` in studio DESIGN.md files
- `fontWeight` (number) — also accepted as `weight`
- `lineHeight` (Dimension | number) — a unitless number is a multiplier of `fontSize`; also
  accepted as `leading`
- `letterSpacing` (Dimension) — also accepted as `tracking`
- `fontFeature` (string) — `font-feature-settings`
- `fontVariation` (string) — `font-variation-settings`

A bare `fontFamily` string may sit directly under `typography` as a shared default; the lint treats
a scalar under `typography` as such and does not require it to be a full level object.

### spacing

A `map<string, Dimension | number>` of spacing scale identifiers to a Dimension or a unitless number
(column counts, ratios). Common keys: `base`, `xs`…`xl`, `gutter`, `margin`.

### rounded

A `map<string, Dimension>` of corner-radius tokens. Common keys: `none`, `sm`, `md`, `lg`, `xl`,
`full` (`9999px` for pills).

### motion **[studio extension]**

Expresses timing so a prototype's transitions are part of the visual contract, not re-invented per
generation. Three sub-groups:

```yaml
motion:
  duration:
    instant: "0ms"
    fast:    "120ms"
    base:    "200ms"
    slow:    "320ms"
  easing:
    standard: "cubic-bezier(0.2, 0, 0, 1)"   # most transitions
    entrance: "cubic-bezier(0, 0, 0, 1)"     # elements arriving
    exit:     "cubic-bezier(0.4, 0, 1, 1)"   # elements leaving
  transition:
    hover:  "{motion.duration.fast} {motion.easing.standard}"
    expand: "{motion.duration.base} {motion.easing.entrance}"
```

- **duration** — `map<string, Duration>`. Values are time values (`ms`/`s`).
- **easing** — `map<string, Easing>`. An Easing is a CSS timing-function keyword (`linear`, `ease`,
  `ease-in`, `ease-out`, `ease-in-out`, `step-start`, `step-end`), a `cubic-bezier(...)`, a
  `steps(...)`, or a `{motion.easing.*}` reference.
- **transition** — `map<string, Transition>`. A Transition is a shorthand string composing a
  duration and an easing, optionally led by a property name
  (`"background-color {motion.duration.fast} {motion.easing.standard}"`). It may reference
  `{motion.duration.*}` and `{motion.easing.*}`.

Components may carry a `transition` sub-token that references a `{motion.transition.*}` (or a
`{motion.duration.*}`), so a specimen board can render a component's motion.

### components

Style guidance for component atoms. It is a `map<string, map<string, string>>`: a component
identifier maps to a group of **sub-tokens**. Values may be literals or `{ref}` references to
previously defined tokens (including composite references like `{typography.label}`).

**Sub-token vocabulary** (fixed — not arbitrary CSS):

| Sub-token | Type |
|---|---|
| `backgroundColor` | Color |
| `textColor` | Color |
| `typography` | Typography (usually a `{typography.*}` ref) |
| `rounded` | Dimension |
| `padding` | Dimension |
| `size` | Dimension |
| `height` | Dimension |
| `width` | Dimension |
| `transition` | Transition — **[studio extension]**, usually a `{motion.transition.*}` ref |

An unknown sub-token is accepted with a warning (the file is not rejected), matching upstream's
tolerance for domain-specific needs — but prefer the vocabulary above.

**State variants.** A component's UI states (hover, active, pressed, disabled, focus, selected) are
their own **named entries** under a related key: `buttonPrimary`, `buttonPrimaryHover`,
`buttonPrimaryActive`. A variant entry may define only the sub-tokens that change. The consumer
considers all variants of a base together.

---

## Token references

A reference is wrapped in curly braces and holds an object path to another token:
`{colors.primary}`, `{rounded.md}`, `{motion.duration.fast}`. Rules:

- For most groups a reference must point to a **primitive** value (`{colors.ink}`), not a whole
  group (`{colors}`).
- Within `components`, references to **composite** values are permitted (`{typography.label}`).
- References may be nested one level deep in the studio extensions
  (`{motion.transition.hover}` may itself hold `{motion.duration.fast}`); the lint follows
  references transitively (with a cycle cap).
- Every reference must **resolve** to an existing token. An unresolved `{ref}` is a lint failure —
  it is left verbatim in output so the defect stays visible, never silently blanked.

---

## Body sections — fixed order

Every DESIGN.md body uses `##` (`<h2>`) sections. A section may be **omitted** if irrelevant, but
those present must appear in this sequence. An `<h1>` title may precede them (not parsed as a
section). A **duplicate** section heading is an error — the file is rejected.

1. **Overview** (alias: "Brand & Style") — brand personality, audience, the emotional response the
   UI should evoke. Foundational context for decisions no token pins down.
2. **Colors** — the palettes in prose, and (studio) the declared **contrast floors**.
3. **Typography** — the type levels and their roles.
4. **Layout** (alias: "Layout & Spacing") — the layout and spacing strategy (grid, margins, rhythm).
5. **Elevation & Depth** (alias: "Elevation") — how hierarchy is conveyed (shadows, or the flat
   alternatives: borders, tonal layers, contrast).
6. **Shapes** — the shape language (corner radius, geometry).
7. **Components** — style guidance for component atoms and their states; (studio) their motion.
8. **Do's and Don'ts** — practical guardrails: patterns to reach for and pitfalls to avoid.

Unknown sections (e.g. `## Iconography`) are preserved, not errored, and may trail the fixed set.

---

## The owned lint

`design-lint.mjs` (run: `node ~/.claude/skills/design-studio-shared/scripts/design-lint.mjs <path>`
in any repo, or `npm run design:lint <path>` from this repo's `web/`) is the zero-dependency gate
that enforces this spec. It checks:

- **Structure** — required sections present appear in the fixed order; no duplicate section
  heading; the front matter parses.
- **References** — every `{group.key}` resolves to an existing token (transitively, cycle-capped).
- **Motion syntax** — `motion.duration` values are time values; `motion.easing` values are valid
  timing functions or easing refs; `motion.transition` values reference a duration and an easing (or
  are valid composite strings).
- **Floors syntax** — `contrast.normalText`/`largeText` are numbers; each `contrast.pairs` entry has
  a resolvable `fg`, `bg`, and numeric `min`.
- **WCAG contrast** — computes the true sRGB contrast ratio for every declared `contrast.pairs`
  entry and fails any below its `min`. It also sweeps likely text-on-ground pairings and **warns**
  (never fails) on any below the global `normalText` floor, so a language with no declared pairs
  still gets an advisory read.

The contrast math (sRGB conversion for hex / rgb / oklch, relative luminance, WCAG ratio) is the
same computation the Canvas uses inline on its design-system board — see `web/src/lib/color.ts`. A
color the lint cannot parse degrades honestly (reported, never a fabricated ratio).

---

## The owned export and diff

Two more scripts share the lint's parser and reference resolution (`design-md.mjs`), so
the whole toolchain reads a DESIGN.md the same way — and, like the lint, they run on plain `node`
with no install, replacing the upstream `@google/design.md export` / `diff` subcommands.

- **Export** — `node ~/.claude/skills/design-studio-shared/scripts/design-export.mjs <path>` (or
  `npm run design:export -- <path>` from this repo's `web/`) emits **CSS custom properties** on
  stdout. Every leaf token becomes a `--group-key`
  variable (nested paths hyphen-joined: `colors.paperRaised` → `--colors-paper-raised`,
  `motion.transition.hover` → `--motion-transition-hover`); references are **resolved** to their
  effective value; a component sub-token that references a whole typography level expands into that
  level's leaves; state variants and motion come along like any other token. Metadata
  (`name`/`description`/`version`) and the a11y `contrast` floors are config, not renderable values,
  so they are omitted. An unresolved `{ref}` is left verbatim (defect stays visible) and warned on
  stderr. This is `build`'s "wire in the visual contract" step.
- **Diff** — `node ~/.claude/skills/design-studio-shared/scripts/design-diff.mjs <old> <new>` (or
  `npm run design:diff -- <old> <new>` from this repo's `web/`) compares two versions' **resolved**
  tokens and reports added / removed / changed. Either
  side is a filesystem path, a `<ref>:<path>` read via `git show`, or a bare `<ref>` reusing the
  other side's path — so `build`'s round-closing drift check can diff the build-start (signed-off)
  version in git history against the current file. Comparing resolved values means a pairing that resolves the same is not spurious
  drift, while a lowered contrast floor or a removed token a consumer still references *is* caught.
  Exit 0 when identical, 1 when there is drift (scriptable as a gate).

---

## Consumer behavior for unknown content

| Scenario | Behavior |
|---|---|
| Unknown section heading | Preserve; do not error |
| Unknown color token name | Accept if the value is a valid Color |
| Unknown typography token name | Accept as a valid typography level |
| Unknown spacing value | Accept; store as a string if not a valid Dimension |
| Unknown component sub-token | Accept with a warning |
| Duplicate section heading | **Error — reject the file** |

---

## Differences from upstream (the fork's deltas)

- **motion** token group (duration / easing / transition) and a component `transition` sub-token —
  net-new; upstream has no motion vocabulary.
- **contrast** floors block under Colors — net-new; upstream mentions AA ratios only as Do's/Don'ts
  prose, not as a declarable, lint-enforced constraint.
- **Studio field aliases** in `typography` (`size`/`weight`/`leading`/`tracking` alongside the
  upstream `fontSize`/`fontWeight`/`lineHeight`/`letterSpacing`) are accepted, matching existing
  studio DESIGN.md files.
- The **tooling is owned and runnable everywhere** — a zero-dependency Node toolchain living in
  `design-studio-shared/scripts/` (installed to `~/.claude/skills/design-studio-shared/scripts/`, so
  it runs from any repo) and sharing one parser (`design-md.mjs`): the lint (`design-lint.mjs`), the
  token export (`design-export.mjs`, `DESIGN.md` → CSS custom properties), and the drift diff
  (`design-diff.mjs`, a resolved-token comparison across versions). Together they replace the upstream
  `@google/design.md` CLI (`lint` / `export` / `diff`) entirely — no runtime fetch of alpha software
  anywhere in the pipeline.
