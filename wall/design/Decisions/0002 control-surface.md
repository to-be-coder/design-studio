---
id: 0002
stage: debrief
status: decided
date: 2026-07-02
rests_on:
supersedes:
superseded_by:
tags: [decision]
---

# 0002 — The wall controls skills (reversing the read-only cut), under hard constraints

**Decision.** Users can run skills from the web UI. The earlier read-only scope is reversed at
the user's explicit direction, with the risk converted into requirements:

- Bind 127.0.0.1 only; bearer token generated at first start, required on every request.
- Server-side allowlist — v1: `wiki-lint` (report) and `harvest` draft-crossing preview only.
- Conversational 🔴 stages are never buttons: they render as copy-the-command handoff cards
  (a button cannot run a ritual).
- Confirm-before-run in the UI; every run logged and visible in the Activity panel.
- No arbitrary prompt passthrough.

**Why.** The user's call ("users should be able to control the skills through the dashboard"),
made after the trade-offs were surfaced. Control is also what separates a wall from a poster —
and the demo value of a live run is real for the social job.

**Rejected alternatives.**
- Read-only wall — rejected by the user; kept as the *default visual mode* (ambient) instead.
- Full chat in the dashboard — rejected in Q&A: rebuilds a Claude Code client; biggest build
  and risk surface.
- Unrestricted skill execution — rejected: the 🔴 ritual and the security posture both forbid it.

**True cost.** build: run API + SSE streaming + token/allowlist plumbing / support: a security
surface that must stay boring forever.

**Status note.** Requirements above are build-gate items; validate exercises each one.
