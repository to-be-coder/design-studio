---
name: design-studio-scope-and-sequence
description: Scope the full vision honestly, then stage it into releases that each ship something real and let you learn between stages, deferring the hardest decision until you have evidence. Includes a gate for existing-user migration/transition design. Use after the problem is reframed and agreed. Fifth stage of the design-studio pipeline.
---

# design-studio-scope-and-sequence

A reframe usually reveals the real project is bigger than the brief. Good — but shipped all at once
it's a big risk. Sequencing is a design decision: how you stage determines what you learn and when,
and which expensive bets you defer until you have evidence.

**Read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🟡→🔴.

## When to use
After `reframe` (and `align`). Runs standalone.

## Preconditions
- Expects the (possibly reframed) problem. If missing, warn and proceed with the user's framing.

## Process

1. **Scope the full vision honestly** (🟡 draft) — list everything the full vision requires. Don't
   pretend it's small.
2. **Stage it** — break into releases that each ship something real, testable, valuable on their
   own, each building on the last. For each stage, **name the hardest/most-uncertain decision it
   defers and why** (defer the hard call until you've earned more information).
3. **Migration gate** (gap #6): ask whether current users/features must transition. If yes, design
   the transition (data migration, backward-compat, what breaks) as part of scope — it's often the
   real engineering work. If greenfield, record "N/A — greenfield."
4. **Confirm the staging** (🔴 ritual) — sequencing is the user's call. Present the staged plan and
   the deferrals; let them adjust; don't impose a sequence.
5. **Write `03 Scope.md`** (full scope + the staged sequence + migration plan) and decision entries for
   the staging and each deferral (`status: deferred`, note what unblocks it).
6. **Update `00 Dashboard.md`** (stage = scope, next = explore-directions).

## Handoff
Point to `design-studio-explore-directions` for the first hard decision.
