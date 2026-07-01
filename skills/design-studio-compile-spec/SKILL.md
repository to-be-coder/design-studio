---
name: design-studio-compile-spec
description: Render the decision log into an audience-shaped document — an early align one-pager to socialize a reframe with stakeholders, a why-first stakeholder spec, or a what-plus-acceptance engineering handoff. Use on demand whenever you need to communicate decisions. Tenth stage of the design-studio pipeline.
---

# design-studio-compile-spec

The stakeholder doc is a **render of the decision log**, not a second document you write. The same
source produces different views for different audiences and formats — lead with **why**, not what.

**Read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🟢 (executes). Runs on demand,
at any point — between stages or at the end.

## When to use
Whenever you need to communicate decisions. Runs standalone; reads `Decisions/` + the artifacts.

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
Render for engineering: the chosen directions, acceptance criteria, the states/edge/a11y notes from
build, the data model from `04 Directions.md`, copy, and the migration plan. This is the *what/how*,
complementing the stakeholder spec's *why*.

## Process
1. Read all of `Decisions/`, `01 Brief & Problem.md`, and the relevant artifacts.
2. Render the requested mode to `06 Spec.md` (or `Align.md` / `Handoff.md`), reframed for that audience.
3. Match structure to format if told (live deck vs sent doc): a live presentation is process-heavy
   and invites interruption; a sent doc is a polished one-way walkthrough.
4. **Update `00 Dashboard.md`** with the link to what was produced.

## Handoff
Back to whatever stage is next, or done.
