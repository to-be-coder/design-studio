---
name: design-studio-structure
description: Draft the product's bones before its skin (user flows and information architecture) from the accepted recommendation and What's Worth Building.md. Task flows for the core journeys, a screen/state inventory, and the navigation model, so design-system and build both build against a known structure instead of inventing it. 🟡 draft the user edits; supersedable like everything else, since nothing locks before production. Writes 03 Structure.md. Third stage of the design-studio pipeline.
---

# design-studio-structure

Bones before skin. Once the Understand loop has landed on a recommendation the team accepts, the
next question is not "what does it look like" but "what are the pieces and how do you move between
them" — the user flows and information architecture. Fixing that first is what lets the visual
language (`design-studio-design-system`) be derived for a *known* structure instead of guessing at
one, and lets `build` build against a map instead of drawing it as it goes. This is the "missing
middle" between deciding and making.

**Read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🟡 (draft — the user edits;
team review through the conversation loop as wanted). Per
[[0023 nothing-locks-before-production]] nothing here locks: `03 Structure.md` is supersedable like
any other artifact, and a build reality that contradicts it supersedes it.

## When to use
After the Understand loop has produced an **accepted recommendation** (a research recommendation the
user has ruled on — a `decided` decision), before `design-system`. Runs standalone (resolve the
project from `.design-studio-active`). On a Lite run where the look doesn't need its own contract,
structure still earns its place — a thin flow + screen list is cheaper than discovering the screens
mid-build. Come back to it whenever a later stage's finding reshapes the flows.

## Preconditions
- Expects the **accepted recommendation** and `What's Worth Building.md`. Read the leading recommendation
  decision in `Decisions/` (the one the user ruled `decided`), `What's Worth Building.md`'s **Build now**
  section (human-confirmed only), and any directions-move data-model sketch in the research report. If
  the recommendation is still only `proposed` (the loop hasn't closed), warn and offer to run another
  `design-studio-research` round or proceed from what the user states, naming what the structure is
  anchored to instead.
- **Empty Build now?** If `What's Worth Building.md`'s **Build now** section has no entries, warn: no
  human-confirmed Build now entries; triage the Proposed candidates in What's Worth Building first
  (the human rules them into Build now). Warn, never block: the user may still proceed from what they
  state, and loose coupling means the triage can happen later.

## Process

1. **Gather the inputs.** The accepted recommendation and its assumptions, the **Build now** scope
   (human-confirmed only) in `What's Worth Building.md`, the as-is journey / provisional persona / JTBD carried in the research report,
   and any data-model sketch from a directions move. Pull the Studio Wiki too: `applies: mechanism`
   pattern/play pages for flows and IA that already solved this problem shape; cite and reuse rather
   than re-derive.

2. **Draft the core task flows** (🟡). For each core journey the recommendation implies, map the
   steps a user actually takes — entry point, the decisions and actions along the way, the success
   state, and the branches that matter (not every edge, the load-bearing ones). Name the emotional
   lows the as-is journey marked, and show how the flow answers them. A flow is a sequence, not a
   prose paragraph — draw it as ordered steps (an Excalidraw sketch in `_assets/` is welcome for the
   complex ones).

3. **Inventory the screens and their states.** From the flows, derive the screen/view inventory:
   every screen a flow passes through, and for each, the states it must have — not just the happy
   path but empty, loading, error, and the edge states the flow's branches force. This inventory is
   what `design-system` sizes its component set against and what `build`'s states/edge/a11y gate
   checks against; getting it here means neither stage discovers a missing screen late.

4. **Fix the information architecture.** The navigation model and how the screens group — the
   primary structure a user holds in their head. Keep it as flat as the flows allow; name the model
   (tabs / hub-and-spoke / linear / etc.) and why it fits *these* flows. Where the wiki has a
   relevant IA pattern, apply it and cite it.

5. **Trace it back to the rubric and assumptions.** Each flow should answer a rubric question from
   `01 Brief & Problem.md`; each screen that exists only because of an assumption should name that
   assumption (link `Assumptions & Risks.md`). A flow that answers no rubric question is a candidate
   cut — surface it, don't quietly keep it.

6. **Write `03 Structure.md`** — flows, screen/state inventory, and the IA model, in that order.
   It fills the retired `03` slot ([[0024 structure-stage-flows-and-ia]]); `04 Directions.md` and
   `03 Scope.md` are both retired, so this is the only numbered artifact between research and
   design-system. A RENDER-adjacent artifact but not a pure render: it's the skill's drafted solution
   design, which the user edits, so it carries its own content, unlike `What's Worth Building.md`.

7. **Review and record.** Walk the flows and IA with the user; adjust until they'd defend the shape.
   Where the structure makes a real decision (a flow chosen over an alternative, a screen cut), record
   it as a decision entry so the reasoning is kept and the artifact stays supersedable. Team review
   rides on `design-studio-debrief`'s conversation loop when the user wants it. Then **update
   `00 Dashboard.md`** (stage = structure, next = design-system) and, if a flow contradicts something
   in `What's Worth Building.md`, route it back into the loop rather than silently diverging.

   **At close, run the utility check** ([[0030 utilities-push-dont-pull]]): refresh the harvest-debt
   standing line (`Harvest flags pending: N · last crossing: <date | none>`) on `00 Dashboard.md`; if
   undistilled flag-debt has crossed ~5, **offer** a `design-studio-harvest` crossing; and if
   `Studio Wiki/log.md`'s last `lint` is older than ~7 days, **run** `design-studio-wiki-lint`'s
   mechanical pass (semantic proposals still queue for the user). Skip silently when no `Studio Wiki/`
   exists yet.

## Handoff
Point to `design-studio-design-system` (Full route — visual language derived for these flows), or
straight to `design-studio-build` on a Lite run where no separate visual contract is needed. Both
consume `03 Structure.md`: `build`'s flows/IA step relocated here
([[0024 structure-stage-flows-and-ia]]), so build reads the structure instead of authoring it.
