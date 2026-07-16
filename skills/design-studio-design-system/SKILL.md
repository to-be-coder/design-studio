---
name: design-studio-design-system
description: Codify the project's visual language as a DESIGN.md — the studio's owned AI-readable format (forked from google-labs-code), with design tokens in YAML front matter and rationale in prose — derived from the client's existing brand when one exists, or chosen from rendered HTML specimen boards when it doesn't. Linted for structure and WCAG contrast and signed off by the user, so build and its parallel agents share one visual contract. Use after the structure stage, before build. Fourth stage of the design-studio pipeline.
---

# design-studio-design-system

A prototype reads as designed when every screen draws from one visual language — and AI-built UI
drifts because each generation quietly re-invents it. This skill fixes the language **once, in
writing**: exact tokens plus the rationale for applying them, in the one file coding agents actually
read — [`DESIGN.md`](../design-studio-shared/DESIGN-SPEC.md).

**Read `../design-studio-shared/CONVENTIONS.md` first** — its "DESIGN.md — the visual contract"
section points at the owned spec and the owned lint. The authoritative format definition is
`../design-studio-shared/DESIGN-SPEC.md` (the studio's fork of google-labs design.md — token groups,
fixed section order, the component vocabulary, plus the studio's **motion** and **accessibility
floor** extensions). Autonomy: 🟡 draft + gate (lint + user sign-off).

## When to use
After `structure` (Full route), or before `build` on a Lite run whenever the look matters. Brand-led
projects — where the look *is* the product — may run it earlier, alongside the research loop.
Runs standalone. Also use it alone to derive a DESIGN.md from an existing product or brand.

## Preconditions
- Expects the **accepted recommendation** (the leading `decided` decision), `Agreements.md`, and
  `03 Structure.md` (the flows + IA the language must serve). If missing, warn and offer to run
  `design-studio-structure` (or the loop) first — the user may proceed from brief-level knowledge,
  but name what the language is anchored to instead.

## Process

1. **Read the authoritative format.** Read `../design-studio-shared/DESIGN-SPEC.md` — the studio's
   owned format definition (forked from google-labs design.md, provenance-pinned). It is the spec:
   author against it, not memory. No runtime fetch, no `npx`, no drift.
2. **Collect the visual inputs.** Ask for existing brand material (guidelines, sites, apps, Figma —
   read variables and styles through the Figma MCP when connected, and treat what it yields as a
   draft to review with the user, not gospel). Pull the company vocabulary from
   `02 Research/Company.md`, the accepted recommendation, the flows/IA in `03 Structure.md`, and any
   a11y requirements. **Derive before you invent** —
   if a visual identity exists, DESIGN.md codifies it faithfully; redesigning it was nobody's brief.
   If a studio-default DESIGN.md exists and the project is greenfield, offer it as the fork base.
   Pull the Studio Wiki too: `applies: mechanism` craft/pattern pages always apply;
   `applies: taste` pages are invited only — greenfield/unbranded work, never client-brand.
3. **Declare the accessibility floors — before any candidate is drafted.** Write the spec's
   `contrast:` block: the global `normalText` / `largeText` minimums and the specific pairings the
   language must satisfy (body text on its ground, text on the accent fill, each state colour on the
   surfaces it lands on), each with a `min`. A11y is an **input, not an audit** — candidate token
   sets are drawn to clear these floors, and the specimen boards render inside them, so contrast is
   designed for rather than discovered after.
4. **Draft candidate languages** (🟡). If the direction is genuinely open, draft 2–3 contrasting
   token sets, each with a stated stance in one line ("editorial calm", "dense instrument") laddered
   to the accepted recommendation — every one drafted to satisfy the floors from step 3. If the
   identity was derived in step 2, draft one faithful set and skip to step 6.
5. **Render specimen boards — never ask the user to judge YAML.** For each candidate, generate a
   self-contained HTML page *from its tokens*: the type scale set in the product's real vocabulary
   (from `02 Research/`), the palette in use (text on backgrounds, the primary button, borders),
   motion on an interactive element where it matters, and a sample card / form / table row for
   spacing and radius feel. Same content on every board — only the language varies. Render each
   candidate across light, dark, and the key states (empty, loading, error), and critique it in every
   mode before the language is committed, not just the default view. Save to
   `_assets/boards/`, review side by side with the user; they pick or mix ("palette from A, type
   from B" is a valid answer). Rejected boards stay in `_assets/boards/` as the record for the
   decision entry.
6. **Develop the pick into the full front matter**: `colors` (with the `contrast:` floors from step
   3), `typography`, `spacing`, `rounded`, **`motion`** (the studio extension — `duration` / `easing`
   / `transition` tokens, so a prototype's timing is part of the contract instead of re-invented per
   generation), and `components` that reference them (`{colors.primary}`, and a `transition` sub-token
   referencing `{motion.transition.*}` where motion matters), with hover/active/disabled variants as
   their own named entries.
7. **Write the rationale body** in the spec's fixed section order (Overview, Colors — including the
   declared floors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts). The
   prose carries what values can't: when a token applies and what it must never be used for. Write
   the Do's and Don'ts from this project's real temptations — patterns competitors overuse (per
   `02 Research/Landscape.md`), the accepted recommendation's known risks.
8. **Write `<project>/DESIGN.md`** — canonical here until `build` moves it into the prototype repo.
9. **Lint gate** (🟢): run the owned lint until clean —
   `node ~/.claude/skills/design-studio-shared/scripts/design-lint.mjs <project>/DESIGN.md` (or, from
   the design-studio repo's `web/`, `npm run design:lint -- <path>`). It validates structure (required sections in the fixed
   order, no duplicate heading), that every `{token}` reference resolves, motion and floor syntax,
   and WCAG contrast against the **declared floors** — a declared pair below its `min` is a design
   problem to solve, not a warning to mute. No repo checkout handy? Author against DESIGN-SPEC.md's
   rules, hand-check the floors, and say so on the dashboard (same fallback discipline as the old
   no-`npx` path).
10. **User sign-off.** Walk the user through the tokens and the Do's/Don'ts; adjust until they'd
    defend it as theirs. Record the committed language as a decision entry (rejected boards and why;
    `rests_on` any brand assumption). Not a full 🔴 — drafting is the skill's job — but build must
    never consume an unreviewed language. Then **update `00 Dashboard.md`** (stage = design-system,
    next = build).

    **At close, run the utility check** ([[0030 utilities-push-dont-pull]]): refresh the harvest-debt
    standing line (`Harvest flags pending: N · last crossing: <date | none>`) on `00 Dashboard.md`;
    if undistilled flag-debt has crossed ~5, **offer** a `design-studio-harvest` crossing; and if
    `Studio Wiki/log.md`'s last `lint` is older than ~7 days, **run** `design-studio-wiki-lint`'s
    mechanical pass (semantic proposals still queue for the user). Skip silently when no `Studio Wiki/`
    exists yet.

## Handoff
Point to `design-studio-build`, which moves `DESIGN.md` into the prototype repo root and builds
against its tokens.
