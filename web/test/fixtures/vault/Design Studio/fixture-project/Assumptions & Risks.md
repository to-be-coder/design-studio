---
type: register
stage: verify
date: 2026-01-13
tags: [assumptions, risks]
---

# Assumptions & Risks

The living register: each assumption carries a state — verified / partial / unverified / accepted.
The single riskiest load-bearing assumption is verify's whole focus.

## Load-bearing assumptions

### A1 — Reviewers will trust an AI-restated problem over their own brief

**State.** unverified · **Riskiest load-bearing assumption.**

The entire split-view direction stands on this. If reviewers distrust the restatement and keep
working from the original brief, the framing pane is theatre. Not yet tested with a real reviewer;
staleness clock started 2026-01-13.

### A2 — A production build starts deterministically enough to test against

**State.** verified

Confirmed against the Next.js production server: `next build && next start` boots reproducibly, so
the smoke suite has a stable target. No open question here.

### A3 — Reviewers will read a serif body at a real measure without zooming

**State.** partial

Plausible from typography research, but only lightly evidenced. Treat as partial until the validate
session observes it directly.

## Accepted risks

### R1 — No primary user contact

**State.** accepted

We have no direct line to a real end user for this fixture; validation leans on expert/heuristic
review. This admission is part of the flow, as visible as any artifact — not hidden.
