---
type: wiki-page
entity: standard
applies: mechanism
origin: starter
born: design-studio
sources: ["https://github.com/google-labs-code/design.md", "npm @google/design.md v0.3.0"]
status: live
last_confirmed: 2026-07-14
---

# design.md format essentials

**The primitive.** [google-labs-code/design.md](https://github.com/google-labs-code/design.md):
an AI-readable design-system file — design tokens in YAML front matter (exact values) + rationale
in the markdown body (when and why to apply them). One file both humans and coding agents read.

**Where it applies.** Any repo an agent will style. The design-studio pipeline authors it at the
`design-system` stage and enforces it through `build` — whose round-closing checklist runs the owned
`design:diff` drift check against the signed-off version.

**Source of truth.** The studio forked and now **owns** this format — author against
`design-studio-shared/DESIGN-SPEC.md` (provenance-pinned to google-labs' `design.md`), never a
runtime `npx` fetch. The upstream `spec` command was broken and `npx` was blocked in live runs
anyway (see gotchas), which is exactly why the fork happened (vault decision `0025`).

**Key facts (v0.3.0)**
- Component sub-tokens are a **fixed vocabulary**: `backgroundColor`, `textColor`, `typography`,
  `rounded`, `padding`, `size`, `height`, `width` — not arbitrary CSS property names.
- Token references: `{colors.primary}`. State variants (hover/active/disabled) are separate named
  entries.
- Body sections in fixed order: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes,
  Components, Do's and Don'ts.
- Tooling is the studio's own zero-dependency Node scripts now, not the upstream CLI: `design:lint`
  checks structure **and WCAG contrast** (exit 1 on errors), `design:export` emits CSS custom
  properties from the resolved tokens, `design:diff` reports added/removed/changed tokens between two
  versions.
- **Gotcha (why we forked):** the upstream `spec` command was broken in the published v0.3.0
  (spec.md not bundled) and `npx` was blocked in live runs — so the studio vendored the spec as
  `DESIGN-SPEC.md` and owns the tooling instead.
- Required front-matter fields: `name`, `colors` (min. `primary`), `typography`, `spacing`,
  `rounded`.
