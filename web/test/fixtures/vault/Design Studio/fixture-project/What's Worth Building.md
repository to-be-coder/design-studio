---
type: wwb
stage: research
round: 3
updated: 2026-01-24
tags: [wwb]
---

# What's Worth Building

A render of the decision log annotated by the ledger, regenerated at every round close. Every
reason carries a receipt to the evidence; a clause resting on a non-verified load-bearing known is
prefixed ASSUMPTION.

Awaiting you: 2 to triage, 2 questions, 1 parked call.

## Parked decisions

### W7: Rule the framing before scope
kind: framing-departure
ask: Should the project settle its problem framing before
scoping features?
why: Research points away from the current framing, but choosing the project's problem is a product judgment.
changes: Choose framing first and the build set is rescoped; keep scope first and the team starts sooner with a risk of revisiting the frame.
evidence: Reviewers said they need to settle the problem before features, while the current brief assumes scope comes first.
supersedes: 0001
blocks: build now
receipts: [[0009 refined-direction|0009]] [[02 Research/Interviews|R2]]

> The evidence says reviewers want to settle what problem we are solving before we scope any features, which departs from the debrief's assumption that scope leads.

Both sides: ruling framing-first re-scopes the whole Build-now set against the reframed problem, at the cost of a slower start. Keeping scope-first ships something clickable sooner but risks re-litigating the frame mid-build. This passes the reframe test, so it is yours to call.

### 0042: Directions pick, where the export lives
kind: directions-pick
ask: Where should export live: on each card or in one board-level tray?
why: Both directions are workable, and the choice depends on how you want people to think about export.
changes: Card-level export keeps actions local; a shared tray makes export a board-wide workflow.
evidence: Research found no usability evidence that clearly favors either drafted direction.
blocks: build now
options:
  - A: Export lives on each card
  - B: One export tray for the whole board
receipts: [[0009 refined-direction|0009]]

> Option A: export lives on each card. Option B: one export tray for the whole board.

Both drafted options are in the case; the pick is taste, so it is yours.

## Build now

### W1: Evidence-first cards
ruled_by: user
in_their_words: "The screenshot lied to me. I want the real running thing on every card."

- Every card shows the real running artifact, not a screenshot proxy. [[02 Research/Interviews|R1]] "The screenshot lied to me."
- The whole flow reads at a glance on one surface. [[02 Research/Landscape|the gap]] "That gap is the opening."

## Proposed

### W2: A pannable spatial canvas
what: One pannable board that holds research, decisions, and the
prototype side by side.
for: Everything about the project is visible in one place, no
tab-hopping.
against: Rests on reviewers trusting a restated problem, which is
unverified.
- One world shows research through prototype without the pieces fighting for a screen. [[02 Research/Company|company]] "The pain is not authoring"
- ASSUMPTION: Reviewers will trust an AI-restated problem over their own brief. [[Knowns & Unknowns|L1]]

### W4: A one-glance loop checkpoint
what: A single status signal that says whether the loop needs you right now.
for: Interrupts the team at the right moment instead of asking them to poll.
against: Assumes one signal is enough, which no round has tested.
- A single signal could interrupt the team at the right moment, if one signal is enough. [[Knowns & Unknowns|L4]]

## Backlog

### W3: A multiplayer review mode
unblocks: A second reviewer joining a live session without a rebuild.

- Teams could review together, but whether it belongs in a first cut is deferred. [[02 Research/Interviews|R2]] "It took me a week to understand why we chose the split layout."
- Rests on reviewers reading a real measure without zooming, still unverified. [[Knowns & Unknowns|L7]]

## Don't build

### W5: A tabbed dashboard
decided-by-human

- Users rejected another dashboard with tabs; they want the flow legible at once. [[02 Research/Interviews|R3]] "legible at a glance, including the parts that were deliberately skipped"

## Questions for you

### L1: Will reviewers trust an AI-restated problem over their own brief?
ask: Do you, as a reviewer, act on the restated problem, or keep
working from the original brief?
why: Research cannot observe which framing a real reviewer will trust without your judgment or a live test.
changes: Choose the restated problem and scope follows the reframed goal; keep the original brief and current scope stays.
evidence: One reviewer distrusted a screenshot proxy, but no evidence shows which problem statement they would act on.
options:
  - A: Act on the restated problem
  - B: Keep working from the original brief
receipts: [[02 Research/Interviews|R1]] "The screenshot lied to me."

### L3: Which skipped steps most need to show honestly?
ask: Which omissions have burned you before, so we surface those first?
why: Research cannot rank hidden workflow failures without your experience of where handoffs usually break.
changes: Your answer decides which skipped steps the first build must make visible.
evidence: The team values honest omissions, but the available research does not identify which omissions cause the most harm.

## Implied but unruled

### W6: A full offline mode
- The full vision implies working offline, but whether a first cut needs it is honestly undecided. [[02 Research/Company|constraints]]

## Open unknowns blocking a verdict

- [[Knowns & Unknowns|L1]]: will reviewers trust the restated problem over their own brief?
- [[Knowns & Unknowns|L4]]: is one signal enough to interrupt the team?
