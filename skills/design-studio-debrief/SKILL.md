---
name: design-studio-debrief
description: Start a new product-design project from a brief. Restates the brief as a problem (not a task), extracts the hidden rubric and guiding principle, sets provisional success criteria, and seeds the Knowns & Unknowns ledger the Understand loop runs on: unknowns from embedded scope decisions and hidden-rubric gaps, load-bearing knowns from the framing's own assumptions, none of it pre-routed to a human. Initializes the Obsidian project folder under Design Studio/ with a dashboard, a decision log, and a thin What's Worth Building render. The human pole of the loop: locks the framing with the client across as many meetings as convergence takes, and ingests each answer batch back into the ledger as anchored, receipted knowns that research resumes from. Use at the very start of a design project, when handed a brief, spec, or feature request to design. First stage of the design-studio pipeline.
---

# design-studio-debrief

The front door and the **human pole of the Understand loop**. Turns a brief into a clear problem, sets
up the project workspace every later skill reads from, and seeds the ledger the loop runs on.
**Front-load understanding, not answers**: most outputs here are provisional and explicitly marked for
revisit as research attempts them. Confirming the problem with a client is rarely one conversation, so
this stage runs as a loop across however many meetings real convergence takes, not one self-directed
pass.

Together with `design-studio-research` this forms the pipeline's single **Understand loop** ([[0020
understand-is-one-loop-reframe-and-scope-fold]]), now an **exhaustion engine** ([[0034
understand-loop-is-an-exhaustion-engine]]): debrief seeds `Knowns & Unknowns.md`, research runs
headless rounds attempting every unknown until it runs dry, and debrief takes the residue (the
questions research could not answer) to the team and feeds the answers back in. There is **no
clarification question list drafted up front** anymore: every unknown is research's to attempt first,
and only the exhausted ones become a human question. A research round that finds the framing should be departed
comes back here, not to a separate reframing stage: the team's words, not the tool's, decide it.

**Always read `../design-studio-shared/CONVENTIONS.md` first**, especially "The Understand loop state
machine" (the ledger contract, the convergence block, the answer-batch protocol, and the
headless-verdict law). Autonomy: 🟡→🔴.

## When to use
At the start of a design project. Runs standalone. The only skill that creates a project folder (under
`<vault>/Design Studio/`) and sets `.design-studio-active`. Also the skill to come back to between
meetings, and the one that ingests an answer batch when research has parked with questions for you: check
`00 Dashboard.md`'s Current stage line first. A `debrief: seeded` or a
`research: converged-humans-needed` / `capped` line means resume for answer ingestion (the convergence
loop below), not a fresh debrief. Also come back whenever a framing departure sits parked in What's
Worth Building's Parked decisions section, to rule it with the team's own words.

## Preconditions
- No vault pointer (`~/.design-studio-vault`)? Suggest `/design-studio-setup` first, or accept a vault
  path from the user and proceed; this skill stays the safety net for skipped setup.
- If a folder for this project already exists under `Design Studio/`, do NOT clobber it: ask whether to
  resume. If `Knowns & Unknowns.md` has open questions (exhausted unknowns with an `ask:` line), that
  resume is the next round of the loop, not a fresh debrief; skip to the convergence loop below.
- **Legacy fold (one time).** If the project predates the ledger and still carries `Clarifications.md`
  and/or `Agreements.md`, fold them into the new docs before anything else: each open clarification
  question becomes an `open` unknown with lineage (or `research-exhausted` if it was clearly a
  human-only question already asked); each retired question becomes an `answered` unknown with its
  recorded answer as an `answered_by` batch; `Agreements.md`'s Agreed / Decided against / Deferred /
  full vision map into `What's Worth Building.md`'s Build now / Don't build / Backlog / Implied but
  unruled; the register is regenerated as the render of the ledger's load-bearing Knowns. Then leave
  the old files as historical artifacts or delete them, and note the fold on the dashboard.

## Process

1. **Get the inputs.** Ask for: the project/client name, the raw brief (paste / file path / link), who
   the stakeholders are, and **whether there's a client or PM to close the loop with** (that answer
   decides which path this project takes below, step 12). If a link or file, read it. Derive the `slug`
   (lowercase-hyphenated).

2. **Read the brief literally, word by word.** Extract two things juniors miss:
   - **Embedded scope decisions**: wording that quietly decides scope (Forma: "image" → video out).
   - **The hidden rubric**: the sub-questions or criteria you'll actually be judged against.

   This is the stage's surfacing core, unchanged by the loop below; every round re-runs it, round 1
   against the brief, later rounds against whatever came back from the meeting.

3. **Restate the brief as a problem, not a task** (🔴 moment). Draft a one-paragraph restatement, then
   run the 🔴 ritual: present it, ask the user to confirm or correct the framing, and don't finalize
   until they agree. The framing is theirs. On a client project this confirms the restatement is *ready
   to take to the client*, not that it's locked; see the convergence loop below for when it actually is.
   Once agreed, run the **precedent check**: query the Studio Wiki (`_plays.md`, then `_index.md`) with
   the restated problem *shape* and bring back anything relevant. An empty wiki is honest ("no
   precedents yet; this project seeds them"). No `Studio Wiki/` at all → suggest `design-studio-harvest`
   to seed one.

4. **Seed the ledger, don't draft a question list.** Turn every real unknown surfaced in steps 2 and 3
   (an embedded scope decision that could go either way, a hidden-rubric item nobody said out loud) into
   a ledger **unknown**: `kind: unknown`, `state: open`, `load_bearing:` set honestly, **NOT pre-routed
   to a human**. Even a question that looks obviously human-only is seeded `open`: research attempts
   every unknown first and only the exhausted ones become a human question ([[0034
   understand-loop-is-an-exhaustion-engine]]). Then seed the framing's own assumptions as **load-bearing
   Knowns**, `state: unverified` (research will try to receipt them, or downgrade them to explicit
   assumptions). This is the round's first-class output: the ledger research runs against, not a list of
   questions for the client.

5. **Capture the guiding principle / product spine**, the one idea everything ladders back to. If the
   brief/stakeholders state it, record it. If not, write `PROVISIONAL, confirm in research`. Do not
   invent a principle to look complete.

6. **Set provisional success criteria** in **two registers** (see CONVENTIONS): the shipped outcome (how
   you'd know it worked in the world once shipped) AND the in-session signal that would predict it (the
   observable behaviour a prototype test can measure, so research's **evaluate** move has something to
   check). Mark `PROVISIONAL, revisit after research`; rough is fine now.

7. **Seed the register from the ledger.** The load-bearing assumptions from step 4 are the register's
   first entries, `state: unverified`. `Assumptions & Risks.md` is now a render of the ledger's
   load-bearing Knowns, so seeding them in the ledger is what seeds the register; write it as that
   render, same filename and table shape as before.

8. **Recommend a route** (fix #1): based on how ambiguous/net-new the brief is, suggest **Full** or
   **Lite** (a short Understand loop → `build`, inserting `design-system` before `build` when the look
   matters, see CONVENTIONS' Two routes). Let the user decide; record it.

9. **Write the workspace** under `<vault>/Design Studio/<slug>/`:
   - `00 Dashboard.md`: project home note. YAML per the CONVENTIONS dashboard contract
     (`type: design-project`, `status: active`, `stage: debrief`, `client`, `route`, `started`,
     `prototype_repo:` empty). Body: the **Current stage** colon-grammar line
     (`Current stage: debrief: seeded: round 1`), Next step, an Artifacts list (links), and a Dataview
     table of this project's decisions (no `## Awaiting you` section: parked 🔴 calls render in What's
     Worth Building's Parked decisions section, not here):
     ````
     ```dataview
     TABLE status, stage, date FROM "Design Studio/<slug>/Decisions" SORT id ASC
     ```
     ````
   - `01 Brief & Problem.md`: original brief verbatim, the restated problem, the rubric as a checklist,
     the guiding principle, success criteria. Mark provisional items clearly.
   - `Knowns & Unknowns.md`: **the seeded ledger**. Sections in order: a `<!-- convergence -->` block at
     the defaults (K=2, M=2, C=6, U_max=40, reopen_cap=1), the Unknowns (each an `### L<N>` entry per the
     state-machine contract), the Knowns (the seeded load-bearing assumptions, `state: unverified`), an
     empty Retired section, an **empty round log** (research writes the first `<!-- round:1 -->` block),
     and an empty `## Review log` region (the append-only home for answer and review blocks; there is no
     Human agenda section anymore). This replaces the deleted `Clarifications.md`.
   - `What's Worth Building.md`: seed it **thin**, in the v2 tiered shape (CONVENTIONS' contract).
     Parked decisions, Questions for you, Proposed, Build now, Backlog, and Don't build are all empty
     (nothing is proposed or ruled yet); **Implied but unruled** carries the full vision the restated
     problem honestly implies, each line receipted back to the brief or marked `ASSUMPTION:`; the
     **Open unknowns blocking a verdict** band lists the seeded ledger unknowns. Top summary line
     `Awaiting you: 0 to triage, 0 questions, 1 parked calls`: the one parked call is the `proposed`
     framing decision 0001 (client project); a no-client project that ruled 0001 `decided` in step 12
     seeds `0 parked calls`. A RENDER only, never hand-authored past this seed; research recompiles it
     every round. This replaces the deleted `Agreements.md`.
   - `Assumptions & Risks.md`: the register, rendered from the ledger's load-bearing Knowns (step 7).
   - `Harvest.md`: empty flag inbox for Studio Wiki keepers (capture is free; see CONVENTIONS).
   - `Decisions/0001 <framing-slug>.md`: the framing decision. `status: proposed`, UNLESS this is a
     no-client project and the user has already confirmed it in step 3 (then `decided` immediately, step
     12). Never write `decided` for a client project here; that's the loop's call (step 15), not round
     1's.
   - Create empty `02 Research/` (with `_inbox/`) and `_assets/` so later skills have a home.
   - Set `<vault>/.design-studio-active` to the slug.

10. **Ensure the portfolio dashboard exists.** If `<vault>/Design Studio/_Design Studio.md` is missing,
    create it with the Dataview portfolio queries from CONVENTIONS. It auto-discovers this and all future
    projects by frontmatter, no row to append. Ensure a `Home.md` exists at the vault root (Homepage
    landing note) linking to the portfolio, and to `Studio Wiki/_index.md` if the wiki exists.

11. **Update `00 Dashboard.md`, then the controller chains research immediately.** The Current stage
    line is `Current stage: debrief: seeded: round 1` for both paths; writing it hands straight to the
    loop, and the controller chains a `design-studio-research` invocation with no approval gate between
    seed and the loop ([[0036 one-continuous-cycle]]). No client → stage = debrief done, next step =
    research, 0001 reads `decided`. Client → stage stays debrief, next step = "research attempts the
    seeded unknowns" (research runs the ledger dry before anyone bothers the client). The seed no longer
    waits for a manual Run-research trigger.

**The convergence loop (round 2..N) and its one-round exception:**

12. **No client at all** (self-initiated, ingest): there's no second party to converge with, so round 1
    *is* the whole loop for the framing lock and steps 13 to 15 don't apply; the user's own confirmation
    in step 3 flips 0001 straight to `decided`. Research still runs the ledger dry. Don't hold a solo
    project waiting for a meeting that will never happen; this path never hard-blocks. Everything from
    here on is the client path.

13. **Resume to ingest an answer batch, or a research departure.** Standalone per the loose-coupling
    rule; this may be a different session. Read `00 Dashboard.md` and `Knowns & Unknowns.md` to confirm
    this is a resume. A round opens one of two ways:
    - **An answer batch from a meeting.** Research parked with questions for you
      (`research: converged-humans-needed` / `capped`); the user carried the exhausted unknowns' `ask:`
      lines (What's Worth Building's Questions for you tier) to the client and brings answers back. Ask
      which questions got answered, and in whose words (the client's own words are what this loop is for;
      a paraphrase from the user is weaker but workable).
    - **A parked framing departure** ([[0020 understand-is-one-loop-reframe-and-scope-fold]]): research
      recorded a `proposed` framing-departure decision (it renders in What's Worth Building's Parked
      decisions section) and kept looping ([[0036 one-continuous-cycle]]). Treat that candidate's
      evidence as this round's surfacing input, and run the lock check (step 15) on the candidate
      departure.

14. **Ingest the batch and re-render.** Record the answers as an anchored batch in the ledger's Review
    log region: `<!-- answers:B:begin -->` … `<!-- answers:B:end -->`, B monotonic. For each answered
    question: resolve it to `answered`, quote the client's words, set `answered_by: batch B`, and **mint
    the Knowns** the answer establishes (load-bearing where they are), each with a receipt to the batch;
    **spawn child unknowns** with `spawned_by` lineage for anything the answer newly raises. Re-run the
    surfacing core (step 2) against what the client said, and seed any new hidden-rubric item or scope
    decision as a fresh `open` unknown. Then write `Current stage: debrief: ingested: batch B` and
    **hand back to `design-studio-research`**, which resumes the loop from the enriched ledger.

15. **Check the lock condition** (🔴, two-turn, never collapse this to one turn). Present the sharpened
    restatement and ask whether it now matches what the client actually confirmed, then **end the turn.**
    Only after the user replies in a later turn: if the framing is agreed and no framing-level unknown is
    still open, record 0001 `decided`, quoting the client's verbatim confirming words (relayed by the
    user) under **In their words.** The confirming voice is the client's; the two-turn rule and the
    verbatim-quote requirement apply exactly as CONVENTIONS states them, this extends the ritual, it
    doesn't relax it. This lock can now **also be satisfied by a review batch**: when the human confirms
    the framing in the web review, the recorder's verdict decision supersedes 0001 with her verbatim
    words under the amended headless-verdict law (Review ingestion below), the same lock reached through
    the durable review block instead of a live turn. If anything's still open, 0001 stays `proposed` and
    the loop keeps running.

16. **Refresh the renders and the dashboard at the close of every round**, locked or not. Re-render
    `What's Worth Building.md` (v2, the tiered shape per CONVENTIONS' contract) from `Decisions/` and the
    ledger; regenerate it from the sources, never hand-edit it out of sync. Update the Current stage line
    (`debrief: ingested: batch B`, or the handoff line once 0001 reads `decided`).

    **Then run the utility check** ([[0030 utilities-push-dont-pull]]): write the harvest-debt standing
    line (`Harvest flags pending: N · last crossing: <date | none>`) on `00 Dashboard.md`; if
    `Studio Wiki/log.md`'s last `lint` is older than ~7 days, run `design-studio-wiki-lint`'s mechanical
    pass (semantic proposals still queue for the user). Skip silently when no `Studio Wiki/` exists yet.

## Review ingestion (the recorder)

A **headless-runnable** mode, distinct from the interactive convergence loop above. When the human
reviews What's Worth Building in the web app, the app appends her verbatim rulings as a
`<!-- review:B:begin -->` … `<!-- review:B:end -->` block to the ledger's Review log region (a bounded
app-write, CONVENTIONS' review protocol). The controller then spawns this recorder to turn that
block into decisions and renders. It is **strictly bounded**: it may only write decisions that cite the
authorized block, fold that block's answers, re-render, and fence. It never invents a verdict, and **a
ruling absent from the block does not exist.**

The controller passes one or more authorized batch ids, each with its block's content hash, **out of
band** (as process args, never via the vault). Take the batches oldest first and complete each one,
steps 1 through 7 with its own fence, before opening the next: a crash mid-list then loses nothing,
because the earlier batches are fully committed and the controller's boot check picks up the rest.
Batches that say nothing new never reach you: the controller closes pure duplicates itself
(CONVENTIONS' review protocol). The procedure, per batch, in order:

1. **Read block B and run the stale-review guard first, PER ENTRY.** The block stamps the WWB
   `round` and the entry-set hash it reviewed; a mismatch means the page moved since she read it,
   and it triggers a closer look, never a batch rejection. An entry is stale only when ITS OWN
   content changed between the stamped round and now (the candidate's title, lean, reasons, or the
   ask she answered): reject and re-surface exactly those entries. An unchanged entry's verdict,
   ruling, or answer APPLIES even when the rest of the page advanced; a page re-render alone never
   invalidates a click on an entry it did not touch.
2. **Confirm block B exists** in the Review log region, verbatim and anchored. The content-hash
   tamper check is the CONTROLLER's job, run as post-run validation with the hash it captured out
   of band; the recorder does not perform it and never receives the hash.
3. **Write ONE dispositions decision for the batch.** `Decisions/NNNN <slug>.md`: `status: decided`,
   `authored_by: user`, frontmatter `review_batch: B`, cite the block
   (`[[Knowns & Unknowns#review B]]`), list every W-id ruling (build-now / backlog with its `unblocks:`
   / dont-build), and quote her per entry under **In their words.** When she typed words, quote them;
   when she only clicked, quote the block's own disposition line for that entry and mark it honestly
   ("chosen by click; no words typed"). Either way the quoted span must occur literally inside block B
   (the amended headless-verdict law: a click is a verdict too; the app transcribed it).
4. **Write one verdict decision per 🔴 ruled.** A framing supersession (fills `supersedes: [[0001 ...]]`),
   a directions pick, or a route call, each `status: decided`, `authored_by: user`, `review_batch: B`,
   citing block B. Quote her typed words when present; an accept or reject with no words quotes the
   block's own ruling line, marked "chosen by click; no words typed" (the candidate was fully written
   and both sides were in front of her; the click is the verdict). A `reshape` always requires her
   typed words; a word-less reshape is refused, never invented. Only the 🔴s she actually ruled in the
   block; the rest stay parked (`proposed`).
5. **Fold the answers into the ledger.** For each `- L<N>: "..."` in the block's `<!-- answers -->`
   list, run the existing answer ingestion (step 14): resolve the unknown to `answered`, quote her
   words, set `answered_by: review B`, mint the Knowns the answer establishes with a receipt to the
   block, and spawn child unknowns with `spawned_by` lineage. The review block is the durable receipt;
   no separate answers batch is written.
6. **Re-render** What's Worth Building (v2) and `Assumptions & Risks.md` wholesale from `Decisions/` +
   the ledger. Ruled candidates move into Build now / Backlog / Don't build; answered questions leave
   Questions for you; ruled 🔴s leave Parked decisions; refresh the summary line. Then append
   `<!-- review:B:done -->` on its own line immediately after the block's end marker: the controller
   reads it to know the batch is processed (queued batches with no marker get picked up on the next
   loop entry).
7. **Write the status line LAST, as the fence.** Always `Current stage: debrief: ingested: batch B`,
   whatever the batch contained (a verdicts-only batch with no answers included). The recorder never
   decides whether research resumes: the controller always chains a fresh research invocation from a
   clean `ingested` fence ([[0036 one-continuous-cycle]]). A verdicts-only batch simply converges again
   in one cheap round, since exhausted questions are not re-attempted.

**Idempotent.** A re-run skips any decision already carrying `review_batch: B`, so a crashed or repeated
recorder run converges to the same state. The controller always resumes the loop after a clean
`ingested` fence, whatever the batch contained: review ingestion is a human-cycle boundary (the round
counter and `U_max` reset). This mode is headless; the interactive two-turn 🔴 ritual for Claude-session
reviews (step 15) is unchanged and needs no block.

## Handoff
Once the ledger is seeded, the loop takes over: the controller chains `design-studio-research` to run
the seeded unknowns dry with no gate between seed and the loop (in a Claude session, invoke research
next). Both routes run the Understand loop; a Lite run just loops it briefly before heading to `build`.
When research parks with questions for you, come back here to ingest the answer batch (step 13) and hand
it back. The framing lock (0001 `decided`) lands immediately for no-client projects, or after however
many answer-batch rounds a client one takes.
