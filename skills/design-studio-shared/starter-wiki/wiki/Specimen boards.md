---
type: wiki-page
entity: pattern
applies: mechanism
origin: starter
born: design-studio
sources: ["design-studio PR #1 — design.md integration, 2026-07"]
status: live
last_confirmed: 2026-07-02
---

# Specimen boards

Never ask a human to judge abstract values — render them. When a decision comes down to choosing
between candidate token sets, configs, or schemas, generate a small artifact *from each candidate*
and let the eye compare.

**Works when**
- Choosing between candidate visual languages: one self-contained HTML page per candidate — type
  scale set in the product's real vocabulary, palette in use (text on background, primary button,
  borders), one sample card/form/table for spacing and radius feel.
- The board is generated *from the tokens themselves*, so what gets approved is literally what the
  system produces — no fidelity gap between the mock and the machine.
- Content is held constant across boards; only the language varies. Controlled comparison, like a
  proper stylescape review.
- "Mix" is a valid verdict — palette from A, type from B — record it and rebuild.

**Breaks when**
- Used as final QA. A board is a decision aid, not the product; states, edge cases, and a11y still
  need their own gates.
- The board HTML gets hand-tweaked after generation. A board that no longer derives from its tokens
  is lying to the reviewer.

**Seen in**
- design-studio `design-system` stage (2026-07) — candidate DESIGN.md token sets rendered side by
  side before the user picks.
- Traditional stylescapes practice, minus the re-interpretation gap.
