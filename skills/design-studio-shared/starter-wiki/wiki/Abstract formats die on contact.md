---
type: wiki-page
entity: trap
applies: process
origin: starter
born: design-studio
sources: ["design-studio PR #1 — design.md integration, 2026-07"]
status: live
last_confirmed: 2026-07-02
---

# Abstract formats die on contact

**What happened.** Authoring a DESIGN.md from memory of the format, the component tokens used
`color` and `borderRadius` — plausible CSS, and wrong: the format's component sub-tokens are a
fixed vocabulary (`textColor`, `rounded`, …). The linter caught it in seconds. Same morning, the
format's own `spec` command turned out to be broken in the published package. Reality beat both
memory and documentation twice before lunch.

**The decision shape that triggers it**
- Defining a format, template, or page contract *before* pressure-testing it against real
  material.
- Trusting memory of an alpha-status format — or trusting its docs over its tooling.
- Shipping a schema whose only examples are the ones invented to illustrate it.

**Counter-move**
- Fetch the authoritative spec at author time, from the tool itself if possible (`spec` command,
  `--help`, the repo's own docs), never from recall.
- Hand-write real content through the format *first*; let the material push back on the contract
  before anything automates against it. If the first honest example fights the schema, the schema
  moves.

**Seen in** design-studio's design.md integration (2026-07) — and it's why this wiki's own page
format was proven on these seven pages before the harvest skill was written.
