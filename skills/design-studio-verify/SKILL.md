---
name: design-studio-verify
description: Verify the single riskiest, load-bearing assumption behind a design decision before committing. Fact-checks claims against primary sources adversarially, or drafts an open-ended user-study plan when the assumption needs humans. Maintains a living verified/partial/unverified/accepted risk register. Use after research, before locking a direction. Third stage of the design-studio pipeline.
---

# design-studio-verify

A design is only as good as the problem it solves, and a wrong claim presented to the people who
build the product destroys credibility. This skill spends a small verification budget well: on the
one assumption that, if wrong, collapses the leading decision.

**Read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🟡 + gate.

## When to use
After `research`, before `explore-directions`/`converge`. Runs standalone.

## Preconditions
- Expects `02 Research/*` and `Assumptions & Risks.md`. If missing, warn; you can still verify a
  specific claim the user names.

## Process

1. **Collect every load-bearing claim** from the research files and the risk register.
2. **Identify the single riskiest assumption** — the one whose failure breaks the leading
   decision. Name it explicitly.
3. **Verify it:**
   - *Checkable against sources* → fact-check **adversarially**: actively try to refute it against
     primary sources (docs, the actual API, the actual data). Default to "unverified" when unsure.
   - *Needs humans* → draft a small, **open-ended** user-study plan (questions that don't steer,
     e.g. "When you pick X, how do you know it's right?") for the user to run, and mark the
     assumption `untested — study drafted`.
4. **Update the risk register** — sort everything into verified / partial / unverified / accepted.
   For anything `accepted` (untested but proceeding), write a short "we accept this risk because…".
5. **Gate (soft):** if a leading decision rests on an `unverified` load-bearing assumption, say so
   and recommend verifying or recording an explicit accepted-risk decision before proceeding. Warn;
   don't hard-block.
6. **Update `00 Dashboard.md`** (stage = verify, next = reframe).

## Outputs
Updated `Assumptions & Risks.md`; verification notes; optional study plan. A decision entry only if
the user accepts a risk explicitly.

## Handoff
Point to `design-studio-reframe`.
