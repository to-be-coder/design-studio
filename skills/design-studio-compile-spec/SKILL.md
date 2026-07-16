---
name: design-studio-compile-spec
description: Render the decision log into an audience-shaped document — an early align one-pager to socialize a reframe with stakeholders, a why-first stakeholder spec, a what-plus-acceptance engineering handoff, or the pre-build PRD (a render invoked after design-system, not a stage of its own). Use on demand whenever you need to communicate decisions. Utility skill, not a pipeline stage.
---

# design-studio-compile-spec

The stakeholder doc is a **render of the decision log**, not a second document you write. The same
source produces different views for different audiences and formats — lead with **why**, not what.

**A render utility, not a pipeline stage** ([[0028 compile-spec-is-a-render-utility]]). The pipeline
is five stages ending at `build`; a document is a projection of the record, not a milestone, so this
skill is **invocable at any moment** to shape that record for an audience — never a stop the project
has to walk through.

**Read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🟢 (executes). Runs on demand,
at any point in a project.

## When to use
Whenever you need to communicate decisions — there is no fixed slot. The natural moments:
- an **align** render early, whenever a framing changes and stakeholders need to be brought along;
- the **PRD** render after `design-system`, as the pre-build eng-handoff of everything decided so far;
- the **handoff** render after `build`, when the built thing is ready to travel.

Runs standalone; reads `Decisions/` + the artifacts. `Agreements.md` stays the living client-facing
state — this skill supplies audience-shaped projections of it, never a rival source of truth.

## Modes (ask which, or infer from when it's called)

**1. `align`** (early — right after a reframe; gap #3).
A one-page brief to socialize the reframe **before** deep work: "I believe the real problem is X
(not the literal brief) — here's the evidence — here's what changes — do we agree?" Structured to
invite a yes / no / adjust. After the user shares it, record the stakeholder response (aligned /
adjusted / rejected) as a decision.

**2. `stakeholder`** (why-first spec).
Render the log for a decision-maker audience: lead with the problem and the spine; organize **by
decision, not by feature tour**; surface the rejected alternatives as evidence of judgment; show
deferred decisions honestly; end on the spine. Pull `deferred`/`superseded` entries in where they
show good thinking.

**3. `eng-handoff`** (what + acceptance).
Render for engineering: the accepted recommendation and chosen directions, acceptance criteria, the
states/edge/a11y notes from build, the flows/IA and data model from `03 Structure.md` (and any
directions-move data-model sketch in the research report), copy, the migration plan, and the visual
contract — link the prototype repo's `DESIGN.md` and attach a token export produced by the studio's
owned script (`node ~/.claude/skills/design-studio-shared/scripts/design-export.mjs DESIGN.md`, or
`npm run design:export` from the design-studio repo's `web/`), which emits CSS custom properties from
the resolved tokens. The `DESIGN.md` travels
alongside as the portable source, so a team on another stack can regenerate their own format from
the same tokens. This is the *what/how*, complementing the stakeholder spec's *why*.

**The pre-build PRD is this skill, invoked after `design-system`** — not a new stage and not an
authored document ([[0024 structure-stage-flows-and-ia]]). By design-system sign-off everything a
PRD contains already exists in the record (framing, agreements, accepted recommendation with
assumptions, flows/IA, DESIGN.md, cuts with reasons); the PRD is the `eng-handoff` render of that
log. Single source, multiple projections, no drift.

## Process
1. Read all of `Decisions/`, `01 Brief & Problem.md`, and the relevant artifacts.
2. Render the requested mode to `Spec.md` (or `Align.md` / `Handoff.md`), reframed for that audience.
3. Match structure to format if told (live deck vs sent doc): a live presentation is process-heavy
   and invites interruption; a sent doc is a polished one-way walkthrough.
4. **Update `00 Dashboard.md`** with the link to what was produced.

## Handoff
A render, not a stage — there is no pipeline successor to point at. Return to wherever the project
was: another `build` round, a `research` **evaluate**/**reconcile** move to test the built thing, or
done.
