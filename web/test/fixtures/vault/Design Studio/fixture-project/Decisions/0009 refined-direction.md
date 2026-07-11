---
id: 0009
stage: converge
status: decided
date: 2026-01-22
rests_on:
supersedes: "[[0008 initial-direction]]"
superseded_by:
tags: [decision]
---

# 0009 — Split into a portfolio grid and a per-project detail page

**Decision.** Split the dashboard into `/portfolio` (every project, at a glance) and
`/project/<slug>` (pipeline rail + decisions + stage output for one project).

**Why.** Users needed to compare projects at a glance, then drill into one project's pipeline
and decision log without the two competing for the same screen real estate.

**Rejected alternatives.**
- Keep the single combined view — disqualified because the pipeline rail crowded the
  portfolio grid on any but the widest screens.

**True cost.** build: medium / support: low.

**Status note.** Supersedes [[0008 initial-direction]].
