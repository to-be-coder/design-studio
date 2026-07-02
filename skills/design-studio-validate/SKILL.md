---
name: design-studio-validate
description: Test the built prototype against the success criteria — with real users when they exist, or a structured expert/heuristic review when they don't — check for visual drift against DESIGN.md, capture findings, and loop back to supersede any decision a finding invalidates. Use after build, to close the loop before handoff. Tenth stage of the design-studio pipeline.
---

# design-studio-validate

Closes the loop the process otherwise leaves open: the build is validated against a spec, not a
person. This skill tests the actual prototype and feeds what it learns back upstream.

**Read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🟡 (back-edge to converge/explore).

## When to use
After `build`. Runs standalone.

## Preconditions
- Expects the prototype (repo path in `00 Dashboard.md`) and the success criteria from
  `01 Brief & Problem.md`. If success criteria are still `PROVISIONAL`, firm them up with the user first.

## Process

1. **Pick the mode:**
   - **Users available** → draft a small, open-ended usability test against the success criteria
     (tasks, not leading questions); the user runs it; capture findings.
   - **No users yet** (common for early/client work) → run a **structured expert review**: heuristic
     evaluation (Nielsen heuristics), a cognitive walkthrough of the core task, and an
     accessibility pass. Mark findings as expert-judgment, not user-validated.
2. **Capture findings** in `05 Validation.md`: what held, what broke, against which success criterion.
   Findings that generalize beyond this project — a pattern that broke, a newly discovered trap —
   also get a one-line flag in `Harvest.md`.
3. **Design-drift check**: run `npx @google/design.md diff` between the prototype's `DESIGN.md` at
   build start (from the repo's git history) and the current file, and spot-check screens for
   hardcoded values that bypass the tokens. Drift or a bypass with no matching decision entry is a
   finding like any other — capture it in `05 Validation.md`.
4. **Loop back** (fix #1, fix #2): if a finding invalidates a prior decision, don't patch silently —
   go to `explore-directions`/`converge` (or `design-system` for the visual language), make the new
   decision, and **supersede** the old entry (`status: superseded`, link `superseded_by`/`supersedes`).
   The log shows the real path.
5. **Update `00 Dashboard.md`** (stage = validate, next = compile-spec or iterate).

## Handoff
Point to `design-studio-compile-spec` (stakeholder or eng-handoff mode), or loop back to iterate.
