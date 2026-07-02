---
id: 0004
stage: design-system
status: superseded
date: 2026-07-02
rests_on:
supersedes:
superseded_by: "[[0005 language-pink]]"
tags: [decision]
---

# 0004 — The wall speaks Ember (amber), chosen from boards

**Decision.** Studio Wall's visual language is **Ember**: amber phosphor (`#FF8A3D`) on warm
near-black (`#141009`), four-step surface ladder, warm inks, instrument-light dots capped at
8px, one filled primary action. Codified in `wall/DESIGN.md`; chosen by Jess from two rendered
specimen boards (`wall/design/boards/`), not from adjectives.

**Why.** Rarer and more ownable than blue in a field saturated with cool-toned dashboards;
analog-cinematic register (amber CRT / JPL console) fits the instrument stance; the thumbnail
test favors the distinctive choice. The known amber risk — reading as a warning state — is
mitigated structurally: semantic color is dot-capped and the accent appears filled exactly once
per view.

**Rejected alternatives.**
- **Orbital (blue)** — competent and calm, but the *expected* choice; adjacent to fintech
  default-dark; loses the differentiation rubric item.
- Mixing boards — offered, declined; Ember taken whole.

**True cost.** build: none beyond the tokens / support: amber discipline must be enforced by
lint + the Don'ts forever.

**Status note.** Prior art: Raycast's "no second primary color" law and surface-ladder
elevation, adapted single-hue (see design research in the project plan).
