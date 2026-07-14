---
name: design-studio-research
description: Accelerated problem-space research for a design project, run as one orchestrator fanning out subagents per named move — desk sweeps, fed-in data, pressure-test, interviews, a directions move for hard decisions, an evaluate move that tests the built prototype against the success criteria, and a reconcile move that checks the decision log against shipped reality. Runs as a convergence loop — each round closes in a research report that names a recommendation and the assumptions it rests on, looping again on request. Every report also says whether the evidence follows, subtracts from, or departs the debrief framing, flags any existing-user migration need, keeps a standing primary-contact line, and checks the wiki's traps against the accumulating decisions. Use alongside debrief, as the evidence pole of the Understand loop, before the structure stage. Second stage of the design-studio pipeline.
---

# design-studio-research

Uses AI as a research accelerator — not to generate UI, but to survey prior art, standards,
competitors, and real pain fast, and to explore hard decisions structurally. The output is
understanding, not a design — and understanding rarely lands in one pass.

**Research is one orchestrator running named moves.** One agent fans out sub-agents per move and
synthesizes what they return; only the main thread writes files or decisions. Most moves are cheap
and run every round (intake, desk sweeps); the heavier ones run **on demand**, and their craft
lives in a reference file loaded only when that move runs — so this skill stays an index, not a junk
drawer ([[0021 directions-fold-into-the-loop]]).

Research is the **evidence pole of the Understand loop** with `debrief` (client/team conversation on
one side, evidence on the other, `Agreements.md` the ledger between them, per
[[0020 understand-is-one-loop-reframe-and-scope-fold]]). It also owns the living **risk register**.

**Read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🟡 (draft — the user corrects);
the **directions** move rises to 🔴 for the pick.

## When to use
Alongside `debrief`, as the loop's evidence pole. Runs standalone (resolve the project from
`.design-studio-active`). Also the skill to come back to for another round — check
`00 Dashboard.md`'s Current stage line first; "research — round 2, report ready for review" means
resume the loop (step 1), not start over. Come back to it whenever `debrief` reopens with new client
words that need re-checking, or when a hard decision surfaces that wants a **directions** round.

## Preconditions
- Expects `01 Brief & Problem.md`. If missing, warn and offer to run `debrief` first or proceed with
  whatever the user describes.

## The named moves — the orchestrator's index

| Move | When | Where the craft lives |
|---|---|---|
| **Intake** | first move, every round | step 1 below |
| **Desk sweeps** | default, every round | step 2 below |
| **Behavioral-data** | optional, when usage data would settle a question | step 3 below |
| **Pressure-test** | on demand — refute a claim | `moves/pressure-test.md` |
| **Interviews** | only when the user asks | `moves/interviews.md` |
| **Directions** | on a hard decision (user-triggered; skill may suggest) | `moves/directions.md` |
| **Evaluate** | on demand — test the built (or drafted) thing against the success criteria (most often after `build`) | `moves/evaluate.md` |
| **Reconcile** | on demand — does the decision log still match shipped reality? → `Drift Ledger.md` | `moves/reconcile.md` |

Load a move's reference file only when that move runs. The **standing report lines** (framing check,
migration flag, primary-contact, trap-check) run every round regardless of which moves fired
(step 4).

**The loop, in one line:** intake → the round's moves → report (findings, recommendation,
assumptions, what's lacking, contradiction flags, standing lines) → user review → another round on
request, or close. Every round — including round 1, where `_inbox/` is usually empty — starts at
step 1.

## Process

1. **Intake — the first move, every round.** List `02 Research/_inbox/`. Read whatever's there.
   Material pasted straight into chat is written to a file in `_inbox/` *before* it's used for
   anything — fed-in data becomes a file before it becomes evidence. Once an item is read, move it
   out of `_inbox/`: into the sweep file it feeds (`Company.md` / `Pain.md` / `Standards.md` /
   `Landscape.md`), or, if it doesn't fit one, as its own dated note directly in `02 Research/` —
   either way carrying a provenance note (source, date fed in, round). An empty `_inbox/` is normal.

   **Wiki first:** before researching, check `Studio Wiki/` for existing standard/pattern pages that
   already answer part of the question — cite them and research only the gaps.

2. **Run the four desk sweeps in parallel** (spawn sub-agents; sub-agents return findings, they
   never touch disk). Every claim carries a source; a claim with no source is flagged `unverified`,
   queued for pressure-testing.
   1. **Product / company spine** — who builds this, their strategy, public language and vocabulary
      to echo later. Feeds the **migration flag** (current users, data, integrations). →
      `02 Research/Company.md`.
   2. **Pain points** — real, cited friction (app-store reviews, forums, support, HCI research). Tag
      each pain to the rubric question it touches. Split verified / partial / unverified. →
      `02 Research/Pain.md`.
   3. **Prior art & standards** — has the industry converged on a standard or primitive for this
      problem? (The highest-leverage finding — Thunderbolt's "the standard already exists" moment.)
      → `02 Research/Standards.md`.
   4. **Competitive landscape** — decompose the best tools into **interaction patterns with lineage**
      (not feature lists); map tools × rubric; note gaps nobody fills well. →
      `02 Research/Landscape.md`.

3. **Behavioral-data move — optional, recommends rather than fetches.** When an open question would
   be settled by real usage data (a metric, a segment cut, a support-ticket archive query), draft
   the **specific, fetchable request** — what to pull, from where, filtered how — keyed to that
   question, and hand the list to the user. The user fetches; next round's intake reads whatever
   comes back. "That data doesn't exist" is also an answer: record it, and leave the assumption it
   would have tested visibly `untested` in the register rather than quietly dropping the question.

   **On-demand moves** — run only when the round calls for them, loading the reference file:
   - **Pressure-test** (`moves/pressure-test.md`) — point the round at *breaking* a named assumption
     or the recommendation, against primary sources, defaulting to `unverified`. The trap-check
     rides here (and always in directions rounds).
   - **Interviews** (`moves/interviews.md`) — draft a Mom Test guide, generative or
     targeted-evaluative, only when the user asks. The user runs it; the skill never simulates users.
   - **Directions** (`moves/directions.md`) — for a hard, non-obvious decision, fan out one sub-agent
     per candidate direction, sketch the data model each forces, price true build-AND-support cost so
     cost can disqualify, watch for the dissolving reframe, and let the **user** pick (🔴). Rejected
     directions and cut darlings flag to `Harvest.md`.
   - **Evaluate** (`moves/evaluate.md`) — test the built prototype (or an early concept/flow) against
     the **in-session success criteria**: an open-ended usability test the user runs when users
     exist, or a structured expert review (Nielsen heuristics + cognitive walkthrough + a11y pass)
     when they don't. The old `validate` stage's craft, now a move ([[0027 validate-dissolves-6-stages]]).
   - **Reconcile** (`moves/reconcile.md`) — walk the decision log against the shipped prototype and
     write `Drift Ledger.md`; where they disagree the built thing wins, and each divergence
     reconciles through a superseding decision or a build finding, never a quiet edit.

4. **Standing report lines — flag, don't decide. Run every round.** Four checks; the first two are
   **FORCED sections of every report** — never omitted, even when the honest answer is "follow the
   framing" or "N/A — greenfield."
   - **Framing check (forced).** Does what this round found say the framing from `01 Brief &
     Problem.md` should be *followed*, *subtracted from* (something in it turns out unnecessary), or
     *departed* (the real problem is a bigger pattern this one is a special case of)? This skill
     never decides or asserts a departure — it structures the evidence and applies the **ported
     reframe test**, out loud, as scaffolding for the team: (a) does the candidate stay grounded in
     the original ask, (b) does it explain the ask as a special case of a bigger pattern, (c) does it
     change what "done well" looks like. A candidate that fails any leg isn't a departure yet — say
     so plainly. **Never manufacture a departure to look clever** — "follow the debrief framing" is
     the correct, expected answer most rounds, and reframe-for-its-own-sake is a junior tell. When a
     candidate passes all three legs, it is **not decided here**: it routes back through the team
     conversation `design-studio-debrief` runs ([[0016 debrief-is-a-convergence-loop]]) — lay out the
     evidence and the candidate framing in the report, then let the team's own words, relayed through
     debrief's next round, **supersede** the framing decision (`Decisions/0001`). This skill's job
     stops at flagging and structuring the evidence.
   - **Migration flag (forced).** Do existing users or systems have to transition off what's there
     today — **yes / no / what**? Fed primarily by the product/company-spine sweep. When yes, name
     the concerns the retired migration gate used to check for — **data migration, backward
     compatibility, and what breaks** — as things the eventual sequence must design around.
     Greenfield: record "N/A — greenfield." Feeds the full-vision confrontation in `Agreements.md`.
   - **Primary-contact line (standing).** One line every report, like the migration flag: **"primary
     user contact: none so far / \<who>"** — continuously visible instead of gated once at a
     ceremony ([[0023 nothing-locks-before-production]]). Fed by `02 Research/Interviews.md` and
     user-sourced entries in `Assumptions & Risks.md`. When it's still "none so far" by the time
     expensive work is near, that visibility is the nudge — no block.
   - **Trap-check (standing; always in directions rounds).** Match the accumulating decisions
     against the traps in `Studio Wiki/_plays.md` and surface any hits — **log a surfaced trap even
     when it changes nothing** (measurable trap efficacy later). This reach is implicit; the user
     won't know to ask. Detail rides with the pressure-test move (`moves/pressure-test.md`).
   - **Contradictions**, routed by flavor, written into the report's contradiction-flags section:
     - *vs. an earlier finding* — say which source now wins and why.
     - *vs. an assumption under the current recommendation* — flag loud; the recommendation may need
       superseding (step 6).
     - *vs. something the client said at debrief* — route it into `Clarifications.md`'s open agenda
       (client-friendly phrasing) so it rides into the next client/PM meeting.

   Findings that generalize beyond this project — a pattern with lineage, a standard, a trap — also
   get a one-line flag in `Harvest.md` (capture is free; distillation comes later).

5. **Write the round's research report.** *`02 Research/Synthesis.md` is the living report* — the
   closing-synthesis folds into the report contract, so the recommendation and its evidence stay
   attached, not two documents that can drift. Update it in place each round, except its round log,
   which is append-only. Contents — **every report carries all of these; the Framing check,
   Migration flag, and Primary-contact line are standing, never omitted:**
   - **Findings** — the sweeps distilled, cited, organized by rubric question.
   - **What should we be building?** — the recommendation, stated plainly.
   - **Assumptions this rests on** — named explicitly, each a real entry in `Assumptions & Risks.md`.
   - **What's lacking** — specific, named gaps, each with what evidence would close it.
   - **Directions menu** (when a directions move ran) — candidates + data-model comparison + costs.
   - **Framing check (forced)** — follow / subtract / depart; a departure names the candidate framing
     and the evidence for the team, never a verdict.
   - **Migration flag (forced)** — yes / no / what.
   - **Primary-contact line (standing)** — none so far / who.
   - **Contradiction flags** — this round's flags, by flavor.
   - **As-is journey & provisional persona/JTBD** — evidence-cited, marked `PROVISIONAL`, emotional
     lows marked. A **named input to the framing check** and to the `structure` stage's flows.
   - **Round log** — one dated entry per round: what was fed in, what changed, what the
     recommendation now says vs. last round.

6. **Record the recommendation as a decision.** `Decisions/NNNN <recommendation-slug>.md`:
   `status: proposed`, `authored_by: skill` — research never promotes it to `decided` itself. Give
   each named assumption its own entry in `Assumptions & Risks.md` (continue the `A<N>` numbering;
   `untested` unless already tested), and link the decision's `rests_on` to it. When the
   recommendation changes, write a **new** decision that supersedes the old one — never edit a past
   recommendation in place; the trail is the deliverable. **Only the main thread writes decision
   files — never a sub-agent** (avoids id collisions). A **directions** move's pick is the user's own
   `decided` decision (its own 🔴 ritual; see `moves/directions.md`), separate from the skill's
   `proposed` recommendation.

7. **Update the risk register and the dashboard — research owns the register.** Any new assumption
   from a sweep or a pressure-test still gets its own entry in `Assumptions & Risks.md`. Sort every
   entry into **verified / partial / unverified / accepted** — never leave one unsorted. `accepted`
   means untested but consciously proceeding: write a short **"we accept this risk because…"**
   rationale, not just the label. Default to `unverified` when a result is genuinely unclear. Update
   `00 Dashboard.md`: while the loop is open, Current stage reads "research — round N, report ready
   for review"; next step points at this round's report. Flip stage to done (next = structure, or
   back to debrief if this round's framing check found a departure) only at loop closure (step 8).

   **At this round's close, run the utility check** ([[0030 utilities-push-dont-pull]]): put the
   harvest-debt standing line (`Harvest flags pending: N · last crossing: <date | none>`) on both the
   report and `00 Dashboard.md`; if this project's undistilled flag-debt has crossed ~5 (research
   rounds are a heavy flag source), **offer** a `design-studio-harvest` crossing; and if
   `Studio Wiki/log.md`'s last `lint` is older than ~7 days, **run** `design-studio-wiki-lint`'s
   mechanical pass (semantic proposals still queue for the user). Skip silently when no `Studio Wiki/`
   exists yet.

8. **User review and loop closure — the human's call.** Present the report. The skill may *advise*
   sufficiency — "I believe we have enough; the open unknowns are X and Y, and closing each would
   cost roughly…" — but sufficiency is risk acceptance, which belongs to the user. Outcomes:
   - **Another round.** More research, fetched behavioral data, an interview guide, or a directions
     round. Loop back to step 1.
   - **Pressure-test first.** Refute a named assumption or the recommendation before closing. Run the
     pressure-test move, then return here.
   - **Close.** Mark every residual open unknown consciously — `accepted` in `Assumptions & Risks.md`
     (with the one-line why) or queued for pressure-testing next round. Update `00 Dashboard.md`
     (stage = research done, next = structure). Nothing "locks" — moving on is the user deciding
     attention moves, reversible, per [[0023 nothing-locks-before-production]].

## Handoff
Two paths, decided by the framing check (step 4). **A departure** loops back into
`design-studio-debrief`'s convergence loop so the team decides it — don't proceed past that report
until the team responds. **Follow or subtract** — the common case — points to
`design-studio-structure` (flows + IA drafted from the accepted recommendation and `Agreements.md`).
Any assumption still `unverified` when the loop closes rides along in `Assumptions & Risks.md` —
`build` reads the register and gates (warn, never block) on an `unverified` load-bearing assumption
under the leading decision; that register gate now lives only at build's door
([[0023 nothing-locks-before-production]]).
