# Research move — directions

Loaded only when a **directions round** runs ([[0021 directions-fold-into-the-loop]]). The old
`explore-directions` stage folds into research as this move: the craft is ported intact, the
ceremony is gone. Use it for the trickiest architectural or product decisions — the hard,
non-obvious calls, especially the ones recorded `deferred` in the log (rendered under Backlog in `What's Worth Building.md`).

The hardest decisions don't have an obvious right answer. Don't commit to the first instinct.
Generate genuinely different approaches, price their true cost, and watch for the fourth framing
that dissolves the problem the others all struggle with. Autonomy: 🟡→🔴 — generation and pricing
are the skill's job; the pick is the user's (the 🔴 ritual in CONVENTIONS).

## Preconditions
- A named hard question. If unclear, ask the user what decision we're making. Directions rounds are
  **user-triggered**; the orchestrator may *suggest* one when a hard decision surfaces, but never
  runs it unasked.

## The move

1. **Pull the wiki, then fan out to generate.** Read relevant `applies: mechanism` pattern pages
   from `Studio Wiki/` and surface up to 3 sparks from `_sparks.md` that smell like this problem —
   unprompted; sparks die if retrieval depends on someone remembering to look. Then **spawn one
   sub-agent per candidate direction** so structural diversity is real, not one thread's variations
   on a single idea. Aim for 3+ genuinely different approaches. (Only the main thread writes files
   or decisions; sub-agents return their direction, they never touch disk.)
2. **Price true cost** for each: **build cost AND support cost** (ongoing maintenance, data to keep
   forever), explicitly weighted by the team size the user supplies. Cost-to-support-forever is the
   part that's easy to forget — force it.
3. **Sketch the data model each direction forces** and compare past surface metrics: same table
   count ≠ same complexity; does it require migrations as the product grows? The schema makes
   long-term cost visible in a way mockups never do. This sketch is a section of the round's
   research report — it does **not** get its own `04 Directions.md` (retired,
   [[0021 directions-fold-into-the-loop]]).
4. **Let cost disqualify.** Mark directions a cost rules out, with the reason.
5. **Watch for the dissolving reframe.** If every direction struggles with the same cost, name it
   and ask whether a different framing makes that cost irrelevant (the edit→reference move). Offer
   the possibility; don't assert the answer. A dissolving reframe that passes the reframe test
   routes through the framing check like any other departure (back to `design-studio-debrief`).
6. **The user picks** (🔴 ritual — the full two-turn protocol from CONVENTIONS). Present directions +
   costs + the data-model comparison, then **stop and end the turn**. Only after the user replies in
   their own words, record the chosen direction as a decision (`authored_by: user`, verbatim words
   under **In their words.**), with all rejected directions and their disqualifying reasons; link
   `rests_on` to any assumption it depends on. The skill never picks — if the user says "you decide,"
   decompose into narrow either/or questions; if they still decline, record `status: proposed`,
   `authored_by: skill`.

## Byproducts (capture is free)
- **Auto-flag each rejected direction** as one line in `Harvest.md` — rejected directions are
  pre-packaged sparks.
- If a darling was cut in favor of the chosen direction, flag the **kept/cut pair** (kept X over cut
  Y, with the user's quoted why) in `Harvest.md` marked `taste-pair candidate`
  ([[0010 taste-entity-kept-cut-pairs]]).

## Where the outcome lives (one loop, three surfaces)
- The **menu** (candidates + data models + costs) → the directions section of the round's research
  report (`02 Research/Synthesis.md`).
- The **outcome** (pick, rejected alternatives, true cost) → the decision entry.
- The **settled state** → `What's Worth Building.md` (the chosen direction under Build now once the
  human rules it, rejected directions under Don't build; until then the pick sits in Parked decisions).

Return to the orchestrator's report contract to fold the menu and the trap-check
(`../SKILL.md`) — a directions round **always** runs the trap-check against the decisions on the
table.
