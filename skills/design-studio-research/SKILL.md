---
name: design-studio-research
description: The engine of the Understand loop. Runs headless rounds over the project's Knowns & Unknowns ledger, attempting every open unknown with fanned-out sub-agent moves (desk sweeps, fed-in data, pressure-test, interviews, a directions move for hard calls, an evaluate move that tests the built prototype, a reconcile move that checks the log against shipped reality), minting receipted Knowns and spawning child unknowns until per-question exhaustion and loop convergence terminate the round. Compiles What's Worth Building.md and the risk register from the ledger every round, proposes a recommendation the human disposes, and parks (never decides) on every red moment: a framing departure that passes the reframe test, a directions pick, a route call. Every round also says whether the evidence follows, subtracts from, or departs the debrief framing, flags any existing-user migration need, keeps a standing primary-contact line, and checks the wiki's traps against the accumulating decisions. Use alongside debrief, as the evidence pole of the Understand loop, before the structure stage. Second stage of the design-studio pipeline.
---

# design-studio-research

The **engine of the Understand loop**. Uses AI as a research accelerator, not to generate UI: it
surveys prior art, standards, competitors, and real pain fast, and explores hard decisions
structurally. The output is understanding, not a design, and it is produced by **running rounds over
the ledger** ([[0034 understand-loop-is-an-exhaustion-engine]]). `debrief` seeds
`Knowns & Unknowns.md`; research attempts **every** open unknown each round, mints receipted Knowns,
spawns the child unknowns each answer implies, and loops until per-question exhaustion and loop
convergence run it dry. The questions it could not answer render into What's Worth Building's
Questions for you tier, which `debrief` carries to the team.

**Research is one orchestrator running named moves.** One agent fans out sub-agents per move and
synthesizes what they return; only the main thread writes files or decisions. Most moves are cheap and
run every round (intake, desk sweeps); the heavier ones run **on demand**, their craft in a reference
file loaded only when that move runs, so this skill stays an index, not a junk drawer
([[0021 directions-fold-into-the-loop]]). The moves are the same; what changed is that their primary
output is now **ledger entries** (minted Knowns, graded, receipted), and `Synthesis.md`, the risk
register, and `What's Worth Building.md` are **downstream renders** recompiled from the ledger at each
round's close.

Research is the **evidence pole of the Understand loop** with `debrief` (client/team conversation on
one side, evidence on the other, the `Knowns & Unknowns.md` ledger between them, per
[[0020 understand-is-one-loop-reframe-and-scope-fold]]). It also owns the living **risk register**.

**Read `../design-studio-shared/CONVENTIONS.md` first**, especially "The Understand loop state
machine": the ledger contract, receipts, the M/K/C convergence latches, the round anatomy, the status
grammar, and the headless-verdict law are defined there once and this skill runs against them.
Autonomy: 🟢 (the loop engine executes rounds) rising to 🔴 for the **directions**-move pick and a
mid-loop **framing departure** (both park, never self-decide).

## When to use
Alongside `debrief`, as the loop's evidence pole. Runs standalone (resolve the project from
`.design-studio-active`). Also the skill to come back to for another round, or the one a headless
controller spawns per round: check `00 Dashboard.md`'s Current stage line first. A
`research: researching: …` line means resume the loop (the round below); a
`research: converged-*` / `capped` line is terminal for the last invocation, and a fresh
run starts a new cycle. Come back whenever `debrief` ingests a batch, or when a hard decision
surfaces that wants a **directions** round.

## Preconditions
- Expects `01 Brief & Problem.md` and a seeded `Knowns & Unknowns.md`. If the brief is missing, warn
  and offer to run `debrief` first or proceed from whatever the user describes. If the ledger is
  missing (an older project, or a Lite run that skipped seeding), scaffold a thin one from the
  framing and its assumptions before the first round, with the convergence block at its defaults
  (K=2, M=2, C=6, U_max=40).

## The named moves: the orchestrator's index

| Move | When | Where the craft lives |
|---|---|---|
| **Intake** | first work of every round | the round, step 2 |
| **Desk sweeps** | default, every round | the round, step 3 |
| **Behavioral-data** | optional, when usage data would settle an open unknown | the round, step 3 |
| **Pressure-test** | every round, riding the riskiest load-bearing entry | `moves/pressure-test.md` |
| **Interviews** | only when the user asks | `moves/interviews.md` |
| **Directions** | on a hard decision (user-triggered; skill may suggest) | `moves/directions.md` |
| **Evaluate** | on demand, test the built (or drafted) thing against the success criteria | `moves/evaluate.md` |
| **Reconcile** | on demand, does the decision log still match shipped reality? writes `Drift Ledger.md` | `moves/reconcile.md` |

Load a move's reference file only when that move runs. The **standing report lines** (framing check,
migration flag, primary-contact, trap-check) run every round regardless of which moves fired.

## The round: the loop's fixed order

Every round follows the round anatomy from CONVENTIONS' state machine; the steps below are that
anatomy with research's craft filled in. Every round starts at step 1, including round 1 (where
`_inbox/` is usually empty and the ledger is freshly seeded).

1. **Rollback check.** First act, always: if `Knowns & Unknowns.md`'s round log ends in an unclosed
   `<!-- round:N:begin -->` block, a prior round crashed mid-write; truncate back to the last
   `<!-- round:N:end -->` before doing anything else. Every other ledger section and every render is a
   projection, so this alone makes a re-run safe.

2. **Intake, fed-in data and any human-answer batch.** List `02 Research/_inbox/`; read whatever's
   there. Two kinds of file land there: material pasted straight into chat, written to a file in
   `_inbox/` *before* it is used (fed-in data becomes a file before it becomes evidence), and
   **app-written input files** the web app dropped there from a project's Add-input affordance (a
   verbatim, provenance-headed file, one of the app's three bounded vault writes,
   [[0036 one-continuous-cycle]]). Both carry a provenance header. Once read, move each item out of
   `_inbox/`, into the sweep file it feeds (`Company.md` / `Pain.md` / `Standards.md` / `Landscape.md`),
   or as its own dated note in `02 Research/`, carrying that provenance forward (source, date fed in,
   round). Then **ingest any pending human-answer batch**: an anchored `<!-- answers:B:begin -->` … `<!-- answers:B:end -->`
   block in the ledger (written by `debrief`), or, when this run is headless, the answer batch
   **embedded in the spawn prompt**. Each answer resolves the unknown it targets to `answered`, records
   its `answered_by`, and may mint child unknowns with `spawned_by` lineage. The app writes the vault
   only through its three bounded exceptions (the review block, these input files, and the
   controller's done marker on a pure-duplicate review batch); only this run
   writes renders, decisions, and machine sections.

   **Wiki first:** before researching, check `Studio Wiki/` for standard/pattern pages that already
   answer part of an open unknown, cite them (a wiki page is a legitimate receipt target), and
   research only the gaps.

3. **Attempt every open unknown.** This is the round's work, and the sweeps and the pressure-test are
   how it gets done. Spawn sub-agents (they return findings, they never touch disk). The default shape
   is **one read-only investigator per open unknown, run in parallel** about four at a time
   ([[0038 the-loop-survives-restarts-and-shows-its-work]]), each handed its one question, the entry's
   current state, and where the last attempt died, so every `open` unknown gets its own full attempt
   this round, not just the convenient ones. An investigator returns findings with source links and
   candidate quote spans; before grading anything in, check every span against its target (a span that
   does not occur verbatim in the target is not a receipt). The four desk sweeps
   run in parallel and feed most unknowns:
   1. **Product / company spine**: who builds this, their strategy, public language to echo later.
      Feeds the **migration flag** (current users, data, integrations). Writes `02 Research/Company.md`.
   2. **Pain points**: real, cited friction (app-store reviews, forums, support, HCI research), each
      tagged to the rubric question it touches. Writes `02 Research/Pain.md`.
   3. **Prior art & standards**: has the industry converged on a standard or primitive? (The
      highest-leverage finding, Thunderbolt's "the standard already exists" moment.) Writes
      `02 Research/Standards.md`.
   4. **Competitive landscape**: decompose the best tools into **interaction patterns with lineage**,
      not feature lists; map tools by rubric; note gaps nobody fills. Writes `02 Research/Landscape.md`.

   The **pressure-test** move rides here every round, pointed at the **riskiest load-bearing entry**
   (`moves/pressure-test.md`): it tries to *break* a named assumption or the current recommendation
   against primary sources. The **behavioral-data** move is optional: when an open unknown would be
   settled by real usage data, draft the specific fetchable request (what to pull, from where, filtered
   how), key it to that unknown, and hand it to the user; "that data doesn't exist" is itself an answer
   to record. Even an obviously human-only unknown ("what's the budget?") gets its attempts and **fails
   fast** with `no research surface: <why>` recorded, so its exhaustion is proven, not pre-labeled.

   **On-demand moves**, run only when the round calls for them, loading the reference file:
   - **Interviews** (`moves/interviews.md`): draft a Mom Test guide only when the user asks; the user
     runs it, the skill never simulates users.
   - **Directions** (`moves/directions.md`): for a hard, non-obvious decision, fan out one sub-agent
     per candidate, sketch the data model each forces, price true build-AND-support cost so cost can
     disqualify, watch for the dissolving reframe, and **park a `proposed` directions-pick decision for
     the user** (🔴) without stopping the loop. Rejected directions and cut darlings flag to
     `Harvest.md`.
   - **Evaluate** (`moves/evaluate.md`): test the built prototype (or an early concept) against the
     **in-session success criteria** ([[0027 validate-dissolves-6-stages]]).
   - **Reconcile** (`moves/reconcile.md`): walk the decision log against the shipped prototype and
     write `Drift Ledger.md`; where they disagree the built thing wins.

4. **Grade and record, the ledger is the primary output.** For each attempted unknown, write what the
   round found back into `Knowns & Unknowns.md`:
   - An unknown answered by evidence **mints a Known** (or resolves the unknown to `answered`), graded
     `verified` / `partial` / `unverified` / `accepted`, with **every grade of `verified` or `partial`
     carrying a conforming receipt** (`[[target#anchor]]` plus a verbatim span, 25 words max, that
     really occurs in the target). A grade with no conforming receipt is **downgraded and marked
     `assumption: true`**: the doc can never out-grade the evidence.
   - An unknown that survived `M` no-progress attempts **latches `research-exhausted`** and gets its
     four-line judgment brief filled: `ask:` is the complete question, `why:` says why evidence cannot
     settle it, `changes:` says what the available answers change, and `evidence:` summarizes the
     strongest known signal or exact unresolved tension. It now renders into What's Worth Building's
     Questions for you tier.
   - If later evidence dissolves that choice, mark the unknown `answered` or `retired`. Never leave an
     entry `research-exhausted` while its ask says the human does not need to answer, that it is closed,
     or that it is present only for completeness.
   - New questions an answer raised are **minted as fresh unknowns** with `spawned_by` lineage.
     `answered` is sticky: a contradiction opens a **new superseding `L`-id**, it never edits the old
     answer; after 2 reopenings on a lineage, auto-escalate to the human.

   Run `receipt-verify.mjs` (below) over the ledger and `What's Worth Building.md` at this point, so a
   bad receipt is caught in the round that wrote it. Run it AGAIN after step 5's recompile and fix
   what it flags before closing the round: a render violation (a question or parked call missing its
   `ask:` / `why:` / `changes:` / `evidence:`, a pick missing its `options:`, a candidate
   missing `what:` / `for:` / `against:`, a summary line that leans on
   another line) is yours to repair in the recompile, and the fence is never written while verify
   fails.

5. **Recompile the renders.** Regenerate wholesale from the ledger plus `Decisions/`:
   - **`What's Worth Building.md`** (v2, the single review surface, exactly per CONVENTIONS' contract):
     the eight tiered sections in reading order. Tier 1: `## Parked decisions` (one entry per live
     `proposed` 🔴 decision, opening with a four-line judgment brief: `ask:` is the complete
     question, `why:` says why only the human can settle it, `changes:` names what each path
     changes, and `evidence:` summarizes the strongest signal or unresolved tension; a directions
     pick also carries an `options:` list, one
     plain sentence per drafted option with an `A:` / `B:` label, each rendered as a one-click choice
     (receipt-verify FAILS a directions pick missing its `ask:` or carrying fewer than two options,
     so a prose-only pick is a render defect, not a style choice);
     then the candidate verbatim with both sides + reframe-test
     legs, `supersedes_if_taken:`, `blocks:`, receipts), `## Questions for you` (every
     research-exhausted L-entry's `ask:` / `why:` / `changes:` / `evidence:` brief + receipts; a
     closed choice also carries an `options:` list with every available answer, while an open
     question has no options and accepts a short written response),
     `## Proposed` (untriaged `build`-lean candidates as `### W<N>:`
     entries with receipts + ASSUMPTION marks). Every Proposed entry and every `dont-build`-lean card
     opens with `what:` / `for:` / `against:`, one plain sentence each (the exact feature, the
     strongest reason for, the strongest reason against); receipt-verify fails a reviewable candidate
     missing any of the three, so the skim layer is contract, not courtesy. A labeled sentence may
     wrap across physical lines; its paragraph ends at a blank line or the next label. **Each of the
     three fields stands completely alone.** A reader who reads only that field follows it cold: no pronoun
     pointing at another line (never open with "They", "It", "That", "These"; receipt-verify fails
     those), no reusing the candidate title's phrasing, no "X rather than Y" constructions. A
     document name, `[[wikilink]]`, decision id, or shorthand such as "the first promise" never
     substitutes for meaning in `ask:`, `why:`, `changes:`, `evidence:`, `what:`, `for:`, or
     `against:`. Write the exact promise, choice, or consequence inline so the reviewer never has to
     open another document to understand a card. A control repeats the outcome it records, never
     generic "Accept" or "Reject". If the question names multiple answers, write every one under
     `options:` so all answers become buttons. Say what
     the user would see or do, in concrete words: "the tool reads which part of the image an edit
     touches" beats "serve the direction of each edit". Numbers come with their meaning in the same
     sentence ("in the logs, 4 of 5 edits widen and narrow at the same time"), never bare. **Write Tier 1 prose in everyday language** (the
     CONVENTIONS plain-language hard rule): what it means and what taking or rejecting it changes,
     in words a client could read cold; the research vocabulary stays in the decision files and the
     receipts. Tier 2: `## Build now` (human-confirmed ONLY, from the
     newest dispositions decision; each carries `ruled_by:` + `in_their_words:`), `## Backlog` (each
     with `unblocks:`), `## Don't build` (human-ruled plus `dont-build`-lean proposals, source-marked
     `decided-by-human` or `proposed-by-AI`). Tier 3: `## Implied but unruled`, `## Open unknowns
     blocking a verdict`. Every reason carries a receipt or a literal `ASSUMPTION:` mark; W-ids come
     from the recommendation's Candidates table (step 7). **Disposition resolution:** the newest
     review-batch recorder decision naming a W-id wins; an untriaged candidate renders by its `lean`,
     never silently promoted to Build now. Run the **evidence-moved cross-check** against the ledger: a
     ruled entry whose cited `L`-ids later retired or downgraded gets the mechanical "confirmed,
     evidence moved: re-rule" flag. Write the top summary line
     `Awaiting you: P to triage, Q questions, K parked calls`.
   - **`Assumptions & Risks.md`**: the render of the ledger's load-bearing Knowns, same filename and
     table shape so build's register gate and the web parser stay untouched. Sort every entry into
     verified / partial / unverified / accepted; `accepted` carries a one-line "we accept this risk
     because…" rationale.
   - **`02 Research/Synthesis.md`**: the living prose report (below); its round log now lives in the
     ledger, so Synthesis carries the findings and standing lines, not the append-only history.

6. **Standing report lines, flag, don't decide. Run every round.** (Detail below.) The **framing
   check** can **record a parked decision mid-loop**: a departure candidate that passes the ported
   reframe test parks a `proposed` framing-departure decision, and the loop keeps running.

7. **Record the recommendation as a decision, with its Candidates table.**
   `Decisions/NNNN <recommendation-slug>.md`, `status: proposed`, `authored_by: skill`: the engine
   proposes, the human disposes; research never promotes its own recommendation to `decided`. The
   decision **carries the Candidates table** (`| W | title | lean | rests_on |`, `lean` build or
   dont-build, `rests_on` the ledger L-ids the candidate depends on): the mint for every candidate's
   sticky `W<N>` id (CONVENTIONS' entry-identity law). W-ids survive supersession and are retired,
   never reused. When the recommendation changes, write a **new** decision that supersedes the old one,
   **carrying the surviving candidates' ids unchanged**; the engine supersedes its own prior proposed
   recommendation, never edits it in place, so the trail is the deliverable. Only the main thread
   writes decision files (never a sub-agent, which avoids id collisions). Each load-bearing assumption
   the recommendation rests on is a Known in the ledger; link the decision's `rests_on` to it. A
   **directions** pick is the user's own `decided` decision through its 🔴 ritual, separate from the
   skill's `proposed` recommendation; a headless run **parks** it instead as a `proposed` 🔴 decision
   (below).

8. **Evaluate convergence and write the fence.** Compute this round's **progress** (only a distinct
   unknown reaching `answered` with a conforming receipt counts), the dry streak, the open count, the
   agenda (the `research-exhausted` unknowns), the parked count `K` (live `proposed` 🔴 calls), and the
   review count `R` (proposed candidates + open questions + parked calls). Then decide the terminal
   state and **write the round block, then the dashboard Current stage line LAST** as the commit fence.
   A parked 🔴 is a `proposed` decision this round carries, never a stop ([[0036 one-continuous-cycle]]):
   it rides the `researching` line's `parked K` field and the loop keeps going. The lines, exactly (from
   the state machine):
   - `Current stage: research: researching: round N, dry-streak D, open Y, parked K`: keep looping
     (there was progress this round, or the dry streak is under K and the round cap C is not hit),
     `parked K` counting the live 🔴 calls carried.
   - `Current stage: research: converged-complete: round N`: every load-bearing unknown answered, no
     agenda.
   - `Current stage: research: converged-humans-needed: round N, agenda X, review R`: the dry streak
     hit K, with X exhausted unknowns waiting on the human.
   - `Current stage: research: capped: round C, agenda X, open Y, review R`: the round cap C stopped the
     run with Y still open.

   The utility check ([[0030 utilities-push-dont-pull]]) rides the close too: refresh the harvest-debt
   standing line (`Harvest flags pending: N · last crossing: <date | none>`) on `Synthesis.md` and
   `00 Dashboard.md`, **offer** a `design-studio-harvest` crossing if undistilled flag-debt has crossed
   ~5 (research rounds are a heavy flag source), and **run** `design-studio-wiki-lint`'s mechanical
   pass if `Studio Wiki/log.md`'s last `lint` is older than ~7 days (semantic proposals still queue for
   the user). Skip silently when no `Studio Wiki/` exists yet.

## Standing report lines: flag, don't decide. Run every round.

Four checks; the first two are **FORCED sections of every report**, never omitted, even when the
honest answer is "follow the framing" or "N/A (greenfield)."

- **Framing check (forced), records a parked decision mid-loop.** Does what this round found say the framing
  from `01 Brief & Problem.md` should be *followed*, *subtracted from*, or *departed*? This skill never
  decides or asserts a departure; it structures the evidence and applies the **ported reframe test**,
  out loud: (a) does the candidate stay grounded in the original ask, (b) does it explain the ask as a
  special case of a bigger pattern, (c) does it change what "done well" looks like. A candidate that
  fails any leg is not a departure yet: say so plainly, and **never manufacture a departure to look
  clever** ("follow the debrief framing" is the correct, expected answer most rounds). When a candidate
  **passes all three legs**, the round **parks a decision without stopping** ([[0036 one-continuous-cycle]]):
  write a `proposed` 🔴 framing-departure decision (the candidate framing verbatim with both sides and
  the reframe-test legs, `supersedes_if_taken: [[0001 ...]]`, a `blocks:` line, receipts), **superseding
  the skill's own prior parked framing proposal** rather than accumulating, add it to the round's
  `parked K` count, and **keep looping** to the dry streak or the cap. That `proposed` decision renders
  into What's Worth Building's Parked decisions section (there is
  no `## Awaiting you` bullet anymore). The departure is decided by the team's own words through
  `debrief`'s next round or the review recorder, which supersedes the framing decision
  (`Decisions/0001`), never here.
- **Migration flag (forced).** Do existing users or systems have to transition off what's there today:
  **yes / no / what**? Fed by the product/company-spine sweep. When yes, name the concerns the retired
  migration gate used to check for (data migration, backward compatibility, and what breaks) as things
  the eventual sequence must design around. Greenfield: record "N/A (greenfield)." Feeds the
  full-vision confrontation (`What's Worth Building.md`'s Implied but unruled).
- **Primary-contact line (standing).** One line every report: **"primary user contact: none so far /
  \<who>"**, continuously visible instead of gated once ([[0023 nothing-locks-before-production]]).
  When it is still "none so far" as expensive work nears, that visibility is the nudge, no block.
- **Trap-check (standing; always in directions rounds).** Match the accumulating decisions against the
  traps in `Studio Wiki/_plays.md` and surface any hits: **log a surfaced trap even when it changes
  nothing** (measurable trap efficacy later). Detail rides with the pressure-test move.
- **Contradictions**, routed by flavor into the report's contradiction-flags section:
  - *vs. an earlier finding*: say which source now wins and why.
  - *vs. an assumption under the current recommendation*: flag loud, and supersede the recommendation
    (step 7) if it no longer holds.
  - *vs. something the client said at debrief*: **spawn a ledger unknown** for it (`kind: unknown`,
    `state: open`, load-bearing when it is), so the next round attempts it and, if it exhausts, it
    rides into What's Worth Building's Questions for you tier for the client's own next batch. This
    replaces the old Clarifications line.

Findings that generalize beyond this project (a pattern with lineage, a standard, a trap) also get a
one-line flag in `Harvest.md` (capture is free; distillation comes later).

## Synthesis.md: the living prose report

`02 Research/Synthesis.md` carries the round's readable narrative; the append-only history lives in the
ledger's round log, not here. Update it in place each round. Contents (the Framing check, Migration
flag, and Primary-contact line are standing, never omitted):
- **Findings**: the sweeps distilled, cited, organized by rubric question.
- **What should we be building?**: the recommendation, stated plainly.
- **Assumptions this rests on**: named, each a real load-bearing Known in the ledger and register.
- **What's lacking**: the open and exhausted unknowns, each with what evidence would close it.
- **Directions menu** (when a directions move ran): candidates + data-model comparison + costs.
- **Framing check (forced)**: follow / subtract / depart; a departure names the candidate for the
  team, never a verdict.
- **Migration flag (forced)**: yes / no / what.
- **Primary-contact line (standing)**: none so far / who.
- **Contradiction flags**: this round's flags, by flavor.
- **As-is journey & provisional persona/JTBD**: evidence-cited, marked `PROVISIONAL`, emotional lows
  marked; a named input to the framing check and to `structure`'s flows.

## Terminal states and handoff

The round's status line is the handoff. **`researching`** means the controller (or the user) spawns
another round; its `parked K` field carries any live `proposed` 🔴 calls, which do not stop the loop.
The three terminal lines each point somewhere:
- **`converged-complete`**: enough evidence, no agenda. Advise sufficiency (sufficiency is risk
  acceptance, the user's call), mark residual unknowns `accepted` in the register with a one-line why,
  and point to `design-studio-structure` (flows + IA from the accepted recommendation and
  `What's Worth Building.md`'s **Build now** section, the human-confirmed set). Any unverified
  load-bearing assumption rides along in `Assumptions & Risks.md`; `build`'s register gate (warn, never
  block) is the only one, at build's door ([[0023 nothing-locks-before-production]]).
- **`converged-humans-needed`** / **`capped`**: ensure every research-exhausted entry carries its
  complete `ask:` / `why:` / `changes:` / `evidence:` judgment brief (that brief renders into
  What's Worth Building's Questions for you tier; there is no separate agenda to compile). Hand back
  to `design-studio-debrief`, which takes those questions to
  the team and returns a batch that the next round's intake ingests (step 2).

**Parked 🔴 calls are not a terminal state** ([[0036 one-continuous-cycle]]). A framing departure, a
directions pick, or a route call the loop reaches headlessly is recorded as a `proposed` 🔴 decision
that renders into What's Worth Building's Parked decisions section and rides the `researching` line's
`parked K` count while the loop runs on to a terminal state. The human rules it in their own words at
review (through the review recorder or the interactive ritual), which supersedes the target decision;
the loop never rules it itself.
