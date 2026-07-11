---
id: 0012
stage: converge
status: decided
authored_by: skill
date: 2026-01-21
rests_on: "[[Assumptions & Risks#Z9-does-not-exist]]"
supersedes: "[[9999 nonexistent-decision]]"
superseded_by:
tags: [decision]
---

# 0012 — Dangling references must not crash the stream

**Decision.** Keep this decision even though its `supersedes` and `rests_on` both point at ids that
do not exist on the board — the renderer must draw what it can and silently skip the edges it
cannot resolve, never dangle a half-drawn connector and never throw.

**Why.** Vaults are edited by hand and by skills mid-flight; a reference can outrun its target for a
few seconds during a live write. Honesty means rendering the entry as-is, not hiding it.

**Rejected alternatives.**
- Drop any decision with an unresolved reference — that would hide real thinking over a typo.

**True cost.** build: low / support: low.
