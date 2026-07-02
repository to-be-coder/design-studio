---
name: design-studio-design-system
description: Codify the project's visual language as a DESIGN.md — the AI-readable design-system format from google-labs-code, with design tokens in YAML front matter and rationale in prose — derived from the client's existing brand when one exists, or chosen from rendered HTML specimen boards when it doesn't. Linted for structure and WCAG contrast and signed off by the user, so build and its parallel agents share one visual contract. Use after converge, before build. Eighth stage of the design-studio pipeline.
---

# design-studio-design-system

A prototype reads as designed when every screen draws from one visual language — and AI-built UI
drifts because each generation quietly re-invents it. This skill fixes the language **once, in
writing**: exact tokens plus the rationale for applying them, in the one file coding agents actually
read — [`DESIGN.md`](https://github.com/google-labs-code/design.md).

**Read `../design-studio-shared/CONVENTIONS.md` first** — its "DESIGN.md — the visual contract"
section is the format's house rules. Autonomy: 🟡 draft + gate (lint + user sign-off).

## When to use
After `converge` (Full route), or before `build` on a Lite run whenever the look matters. Brand-led
projects — where the look *is* the product — may run it earlier, alongside `explore-directions`.
Runs standalone. Also use it alone to derive a DESIGN.md from an existing product or brand.

## Preconditions
- Expects a chosen direction and committed spine (`04 Directions.md`, converge decisions). If
  missing, warn and offer to run upstream first — the user may proceed from brief-level knowledge,
  but name what the language is anchored to instead.

## Process

1. **Get the authoritative format.** Run `npx @google/design.md spec` (and `spec --rules`) and
   author against that — the format is alpha; trust its output over memory. The `spec` command is
   broken in v0.3.0 (spec.md not bundled): fall back to the repo's
   `https://raw.githubusercontent.com/google-labs-code/design.md/main/docs/spec.md`. Offline? Use
   the CONVENTIONS summary and say so on the dashboard.
2. **Collect the visual inputs.** Ask for existing brand material (guidelines, sites, apps, Figma —
   read variables and styles through the Figma MCP when connected, and treat what it yields as a
   draft to review with the user, not gospel). Pull the company vocabulary from
   `02 Research/Company.md`, the spine, and any a11y requirements. **Derive before you invent** —
   if a visual identity exists, DESIGN.md codifies it faithfully; redesigning it was nobody's brief.
   If a studio-default DESIGN.md exists and the project is greenfield, offer it as the fork base.
   Pull the Studio Wiki too: `applies: mechanism` craft/pattern pages always apply;
   `applies: taste` pages are invited only — greenfield/unbranded work, never client-brand.
3. **Draft candidate languages** (🟡). If the direction is genuinely open, draft 2–3 contrasting
   token sets, each with a stated stance in one line ("editorial calm", "dense instrument") laddered
   to the spine. If the identity was derived in step 2, draft one faithful set and skip to step 5.
4. **Render specimen boards — never ask the user to judge YAML.** For each candidate, generate a
   self-contained HTML page *from its tokens*: the type scale set in the product's real vocabulary
   (from `02 Research/`), the palette in use (text on backgrounds, the primary button, borders), and
   a sample card / form / table row for spacing and radius feel. Same content on every board — only
   the language varies. Save to `_assets/boards/`, review side by side with the user; they pick or
   mix ("palette from A, type from B" is a valid answer). Rejected boards stay in `_assets/boards/`
   as the record for the decision entry.
5. **Develop the pick into the full front matter**: `colors`, `typography`, `spacing`, `rounded`,
   and `components` that reference them (`{colors.primary}`), with hover/active/disabled variants as
   their own named entries.
6. **Write the rationale body** in the spec's fixed section order (Overview, Colors, Typography,
   Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts). The prose carries what values
   can't: when a token applies and what it must never be used for. Write the Do's and Don'ts from
   this project's real temptations — patterns competitors overuse (per `02 Research/Landscape.md`),
   the chosen direction's known risks.
7. **Write `<project>/DESIGN.md`** — canonical here until `build` moves it into the prototype repo.
8. **Lint gate** (🟢): `npx @google/design.md lint DESIGN.md` until clean. It checks WCAG contrast
   as well as structure — a contrast failure is a design problem to solve, not a warning to mute.
9. **User sign-off.** Walk the user through the tokens and the Do's/Don'ts; adjust until they'd
   defend it as theirs. Record the committed language as a decision entry (rejected boards and why;
   `rests_on` any brand assumption). Not a full 🔴 — drafting is the skill's job — but build must
   never consume an unreviewed language. Then **update `00 Dashboard.md`** (stage = design-system,
   next = build).

## Handoff
Point to `design-studio-build`, which moves `DESIGN.md` into the prototype repo root and builds
against its tokens.
