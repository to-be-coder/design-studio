---
name: design-studio-explore-directions
description: For a hard decision with no obvious answer, generate several structurally-different directions, sketch the data model each one forces, and surface their true build-and-support cost so cost can disqualify and a dissolving reframe can emerge. Use for the trickiest architectural or product decisions. Sixth stage of the design-studio pipeline (includes data-model comparison).
---

# design-studio-explore-directions

The hardest decisions don't have an obvious right answer. Don't commit to your first instinct.
Generate genuinely different approaches, price their true cost, and watch for the fourth framing
that dissolves the problem the others all struggle with. Includes the data-model lens, because the
schema makes long-term cost visible in a way mockups never do.

**Read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🟡→🔴.

## When to use
For any hard, non-obvious decision — especially the ones `scope-and-sequence` deferred. Runs standalone.

## Preconditions
- Expects a named hard question. If unclear, ask the user what decision we're making.

## Process

1. **Pull the wiki, then generate.** Read relevant pattern pages from `Studio Wiki/` and surface
   up to 3 sparks from `_sparks.md` that smell like this problem — unprompted; sparks die if
   retrieval depends on someone remembering to look. Then **generate N structurally-different
   directions** (🟡) — not variations on one idea; genuinely different approaches. Aim for 3+.
2. **Price true cost** for each: **build cost AND support cost** (ongoing maintenance, data to keep
   forever), explicitly weighted by team size. Cost-to-support-forever is the part that's easy to
   forget — force it.
3. **Sketch the data model each direction forces** and compare past surface metrics: same table
   count ≠ same complexity; does it require migrations as the product grows? Write the comparison
   to `04 Directions.md`.
4. **Let cost disqualify.** Mark directions a cost rules out, with the reason.
5. **Watch for the reframe.** If every direction struggles with the same cost, name it and ask
   whether a different framing makes that cost irrelevant (the edit→reference move). Offer the
   possibility; don't assert the answer.
6. **The user picks** (🔴 ritual). Present directions + costs + the data-model comparison, then stop
   and let them choose. Record the chosen direction with all rejected directions and their
   disqualifying reasons; link `rests_on` to any assumption it depends on. Auto-flag each rejected
   direction as one line in `Harvest.md` — rejected directions are pre-packaged sparks.
7. **Update `00 Dashboard.md`** (stage = directions, next = converge or another hard decision).

## Handoff
Loop back into this skill for the next hard decision, or go to `design-studio-converge`.
