---
name: design-studio-converge
description: Commit the design — sort every feature into build-deeply/build-lightly/design-only/cut, make the user articulate the one-sentence spine, and record every cut with its reason so the reasoning is a deliverable. Use after directions are explored, to lock scope before building. Seventh stage of the design-studio pipeline.
---

# design-studio-converge

What you cut is as much a design decision as what you keep, and the spine is what makes a pile of
features feel like a product. This skill makes convergence deliberate and recorded — never silent.

**Read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🔴 + records.

## When to use
After exploration, before `build`. Runs standalone.

## Preconditions
- Expects a set of candidate features/directions. If thin, warn and work from what the user lists.

## Process

1. **Lay out every candidate** feature/direction in one place.
2. **Sort, with the user** (🔴 ritual) into: **build deeply / build lightly / design-only / cut.**
   Present the list and the trade-offs; do not pre-sort it for them and call it done — make them cut.
3. **Commit the spine** (🔴 — the most important 🔴 moment). The single organizing idea everything
   hangs off, in one sentence. Do NOT write it for the user. Feed them the synthesized inputs and
   interrogate until they say it. If they can't yet, it's not ready — record `proposed` and stop.
4. **Record every cut** with its reason (out-of-scope / wrong-persona / true-cost / not-on-critical-
   path). The cut list is a deliverable, not a deletion. Include darlings cut for good reasons.
5. **Write** `Cut list` (inside `03 Scope.md` or its own note), the spine decision, and a decision entry
   per significant cut.
6. **Update `00 Dashboard.md`** (stage = converge, next = design-system).

## Handoff
Point to `design-studio-design-system` (or straight to `design-studio-build` if a signed-off
`DESIGN.md` already exists).
