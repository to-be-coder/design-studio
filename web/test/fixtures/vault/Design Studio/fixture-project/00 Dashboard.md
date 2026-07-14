---
type: design-project
status: active
stage: build
client: Acme Fixtures Co.
route: full
started: 2026-01-10
prototype_repo:
---

# Fixture Project

A hermetic fixture used only by the Playwright smoke suite in `web/test/`. It exercises the
vault-reading contract in `skills/design-studio-shared/CONVENTIONS.md` — never a real client
project.

## Overview

This project stands in for a Full-route engagement that ran the Understand loop (debrief ↔
research), the structure stage, design-system, and is now closing out build — the pipeline ends at
build, and the on-demand compile-spec handoff render hasn't been invoked yet. Its pipeline log
deliberately keeps legacy rows (verify, reframe, scope-and-sequence, explore-directions, converge,
validate) from before the pipeline compressed to 5 stages, to exercise the parser's silent-drop
tolerance: those rows must be dropped, never crashed on, never mislabeled onto a surviving stage. It
also keeps a `Compile spec` row to exercise the utility-mapping tolerance — kept, not dropped (like
`harvest`), since compile-spec is now a render utility (decision 0028), not a stage.

## Recommended next step

Run `design-studio-compile-spec` for the handoff render, or an evaluate round in
`design-studio-research` to test the prototype against the two in-session signals — recording any
decision-invalidating findings as superseding entries.

## Overrides

- 2026-01-14 — skipped reframe (the restated problem was already the true problem)
- 2026-01-22 — built without an updated design-system lint (npx unavailable)

## Pipeline log

- Debrief — Ran, 2026-01-10
- Research — Ran, 2026-01-12
- Verify — Ran, 2026-01-13
- Reframe — Not run (brief was already the true problem)
- Scope and sequence — Ran, 2026-01-16
- Explore directions — Ran, 2026-01-18
- Converge — Ran, 2026-01-20
- Structure — Ran, 2026-01-17
- Design system — Ran, 2026-01-22
- Build — Ran, 2026-01-26
- Validate — Ran, 2026-01-30
- Compile spec — Not run (on-demand handoff render not yet invoked)
