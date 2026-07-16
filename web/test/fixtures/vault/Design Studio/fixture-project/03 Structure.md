---
type: structure
stage: structure
date: 2026-01-17
tags: [structure]
---

# Structure

User flows and information architecture for the canvas, drafted from the accepted recommendation
(one pannable board, research → prototype) and `Agreements.md`. Bones before skin: this is what the
design-system and build build against.

## Core flow — read a project end to end

1. Open the portfolio index and pick a project.
2. Land on the canvas at the framing pane (brief beside restated problem).
3. Pan the spine: research → structure → design-system → build, artifacts running off each tick.
4. Drop into the Decision Stream to trace a supersede chain, then into the running prototype frames.

The load-bearing branch is at step 3: a reviewer either reads linearly or flies straight to one
board via the keyboard index. Both must land the reader somewhere legible, never mid-empty-stretch.

## Screen inventory

Every screen a flow passes through, with the states each must have — not just the happy path:

- **Portfolio index** — populated, empty (no projects yet), loading.
- **Canvas board** — full flow, mid-pipeline (pending stages read honestly), zero-decisions empty
  state, no-prototype empty state.
- **Decision stream** — supersede chains drawn, a dangling-supersede entry rendered without a broken
  edge, a live-only filtered view.
- **Prototype frames** — booting, live, and the read-only degraded state when the DOM is off-limits.

## Information architecture

A single pannable world, grouped **Understand → Build**, with the Decision Stream as its own
standalone section rather than a stage. Navigation is the keyboard index (one board per item) layered
over free pan/zoom — flat by design: there are no nested screens to hold in your head, only regions
of one surface.
