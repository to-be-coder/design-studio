---
type: wiki-page
entity: standard
applies: mechanism
origin: starter
born: design-studio
sources: ["https://github.com/google-labs-code/design.md", "npm @google/design.md v0.3.0"]
status: live
last_confirmed: 2026-07-02
---

# design.md format essentials

**The primitive.** [google-labs-code/design.md](https://github.com/google-labs-code/design.md):
an AI-readable design-system file — design tokens in YAML front matter (exact values) + rationale
in the markdown body (when and why to apply them). One file both humans and coding agents read.

**Where it applies.** Any repo an agent will style. The design-studio pipeline authors it at the
`design-system` stage and enforces it through `build` and `validate`.

**Source of truth.** `npx @google/design.md spec` — but see gotchas. Format is **alpha**; re-verify
before trusting this page (`last_confirmed` above).

**Key facts (v0.3.0)**
- Component sub-tokens are a **fixed vocabulary**: `backgroundColor`, `textColor`, `typography`,
  `rounded`, `padding`, `size`, `height`, `width` — not arbitrary CSS property names.
- Token references: `{colors.primary}`. State variants (hover/active/disabled) are separate named
  entries.
- Body sections in fixed order: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes,
  Components, Do's and Don'ts.
- `lint` checks structure **and WCAG contrast**; exit 1 on errors. `export --format
  css-tailwind|json-tailwind|dtcg`. `diff` detects token changes/regressions.
- **Gotcha:** the `spec` command is broken in the published v0.3.0 (spec.md not bundled) — fall
  back to the repo's `docs/spec.md`.
- Required front-matter fields: `name`, `colors` (min. `primary`), `typography`, `spacing`,
  `rounded`.
