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
2. **Sort, with the user** (🔴 ritual, phase 1) into: **build deeply / build lightly / design-only /
   cut.** Present the list and the trade-offs; do not pre-sort it for them and call it done — make
   them cut. Before they commit, run the **trap check**: match the decisions on the table against
   the traps in `Studio Wiki/_plays.md` and surface any hits — this reach is implicit; the user
   won't know to ask. Record which trap pages were surfaced — **even if none changed the outcome** —
   as one line in the spine/cut decision; this is what makes trap efficacy measurable later.
3. **Primary-contact gate** (a receipt, never a hard block). If no primary user contact is recorded
   anywhere — `02 Research/Interviews.md` absent AND no user-sourced entries in `Assumptions &
   Risks.md` — say so, and require an explicit accepted-risk entry in `Assumptions & Risks.md`
   ("no primary user contact as of converge — accepted because <user's reason>") before recording
   the spine. The receipt is the point.
4. **Commit the spine** (🔴 — the most important 🔴 moment). The single organizing idea everything
   hangs off, in one sentence. Do NOT write it for the user; feed them the synthesized inputs and
   interrogate until they say it, then **stop and end the turn — do not record in the same turn.**
   Record it in a later turn, quoting the user verbatim under **In their words.** with
   `authored_by: user`. If they can't say it yet, it's not ready — record `status: proposed`,
   `authored_by: skill`, and stop.
5. **Record every cut** with its reason (out-of-scope / wrong-persona / true-cost / not-on-critical-
   path). The cut list is a deliverable, not a deletion. When a darling is cut, capture the
   **kept/cut pair** (kept X over cut Y, with the user's quoted why) as a one-liner in `Harvest.md`
   marked `taste-pair candidate` — a taste page for the wiki; an orphaned darling with no pair stays
   a spark candidate.
6. **Write** `Cut list` (inside `03 Scope.md` or its own note), the spine decision, and a decision
   entry per significant cut.
7. **Update `00 Dashboard.md`** (stage = converge, next = design-system).

## Handoff
Point to `design-studio-design-system` (or straight to `design-studio-build` if a signed-off
`DESIGN.md` already exists).
