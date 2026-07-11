---
id: 0009
stage: converge
status: decided
authored_by: user
date: 2026-01-20
rests_on: "[[Assumptions & Risks#A1]]"
supersedes: "[[0008 initial-direction]]"
superseded_by:
tags: [decision]
---

# 0009 — Split the journey onto one spatial canvas

**Decision.** Drop the single combined dashboard and render the whole design journey as one
pannable, zoomable canvas: a spine of stages, artifact cards, and a consolidated decision stream.

**Why.** Users needed to see the *shape* of the flow at a glance and drill into any part without
the pieces competing for one screen. This ladders to the guiding principle — assert what users
see — by making the flow literally visible.

**In their words.**

> I don't want another dashboard with tabs. I want to see the whole thing at once, like a board,
> and I want the skipped steps to show up honestly instead of just being missing.

**Rejected alternatives.**
- Keep the single combined view ([[0008 initial-direction]]) — disqualified because the pipeline
  rail crowded the portfolio grid on any but the widest screens.
- A long scrolling document — flat; decisions end up far from the artifacts they shaped.

**True cost.** build: high (a pan/zoom engine with performance laws) / support: medium.

**Status note.** Supersedes [[0008 initial-direction]]. Rests on the unverified assumption A1 that
reviewers will trust the restated problem.
