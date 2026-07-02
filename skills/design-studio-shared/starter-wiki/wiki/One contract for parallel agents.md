---
type: wiki-page
entity: play
applies: mechanism
origin: starter
born: design-studio
sources: ["design-studio PR #1 — design.md integration, 2026-07"]
status: live
last_confirmed: 2026-07-02
---

# One contract for parallel agents

**The move.** N agents working in parallel stay consistent only if a single, readable law exists —
and every agent's prompt *starts* by reading it. Without a shared contract, each agent re-derives
the rules from vibes, and the output reads as N different hands.

**When it applies**
- Fan-out builds: every build agent's prompt opens with "read `DESIGN.md` first; every visual value
  comes from its tokens."
- Process itself: every design-studio skill opens with "read `CONVENTIONS.md` first." Same play,
  different layer.
- Any workflow where more than one session or sub-agent touches the same artifact.

**Cost**
- The contract must stay small enough to actually be read every time — a contract nobody loads is
  decoration. Push detail into referenced files; keep the law short.
- Someone must own updates (single-writer rule), or the contract forks into versions and the play
  collapses.

**The failure it prevents** is not agents being *wrong* — it's agents being *individually
plausible and collectively incoherent*. Consistency is a property of the contract, not of the
agents.
