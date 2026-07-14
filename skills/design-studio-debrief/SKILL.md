---
name: design-studio-debrief
description: Start a new product-design project from a brief. Restates the brief as a problem (not a task), extracts the hidden rubric and guiding principle, sets provisional success criteria, seeds the risk register, and initializes the Obsidian project folder under Design Studio/ with a dashboard and decision log. Loops the framing with the client across as many meetings as convergence takes — a clarification agenda out each round, answers retired and the restatement sharpened on return — keeping a living Agreements.md current at every round's close. Use at the very start of a design project, when handed a brief, spec, or feature request to design. First stage of the design-studio pipeline.
---

# design-studio-debrief

The front door of the design-studio pipeline. Turns a brief into a clear problem and sets up the
project workspace every later skill reads from. **Front-load understanding, not answers** — most
outputs here are provisional and explicitly marked for revisit after research. Confirming that
problem with a client is rarely one conversation — this stage runs as a loop across however many
meetings real convergence takes, not one self-directed pass. Together with `design-studio-research`
this loop forms the pipeline's single **Understand loop** ([[0020
understand-is-one-loop-reframe-and-scope-fold]]): client/team conversation happens here, evidence
happens there, and `Agreements.md` is the ledger between them. A research round that finds the
framing should be departed comes back here, not to a separate reframing stage — the team's words,
not the tool's, decide it.

**Always read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🟡→🔴.

## When to use
At the start of a design project. Runs standalone. The only skill that creates a project folder
(under `<vault>/Design Studio/`) and sets `.design-studio-active`. Also the skill to come back to
between meetings — check `00 Dashboard.md`'s Current stage line first; "round 2, awaiting meeting"
means resume the loop (step 12 below), not start a fresh debrief. Also come back whenever
`design-studio-research`'s framing check flags a departure from the current framing — treat that
report's evidence as this round's surfacing input (step 13).

## Preconditions
- No vault pointer (`~/.design-studio-vault`)? Suggest `/design-studio-setup` first — or accept a
  vault path from the user and proceed; this skill stays the safety net for skipped setup.
- If a folder for this project already exists under `Design Studio/`, do NOT clobber it — ask
  whether to resume. If `Clarifications.md` shows an open agenda, that resume is the next round of
  the loop, not a fresh debrief — skip to the convergence loop below.

## Process

1. **Get the inputs.** Ask for: the project/client name, the raw brief (paste / file path / link),
   who the stakeholders are, and **whether there's a client or PM to close the loop with** — that
   answer decides which path this project takes below (step 12). If a link or file, read it.
   Derive the `slug` (lowercase-hyphenated).

2. **Read the brief literally, word by word.** Extract two things juniors miss:
   - **Embedded scope decisions** — wording that quietly decides scope (Forma: "image" → video out).
   - **The hidden rubric** — the sub-questions or criteria you'll actually be judged against.

   This is the stage's surfacing core, unchanged by the loop below — every round re-runs it, round 1
   against the brief, later rounds against whatever came back from the meeting.

3. **Restate the brief as a problem, not a task** (🔴 moment). Draft a one-paragraph restatement,
   then run the 🔴 ritual: present it, ask the user to confirm or correct the framing, and don't
   finalize until they agree. The framing is theirs. On a client project this confirms the
   restatement is *ready to take to the client* — not that it's locked; see the convergence loop
   below for when it actually is. Once agreed, run the **precedent check**: query the Studio Wiki
   (`_plays.md`, then `_index.md`) with the restated problem *shape* and bring back anything
   relevant. An empty wiki is honest — "no precedents yet; this project seeds them." No
   `Studio Wiki/` at all → suggest `design-studio-harvest` to seed one.

4. **Draft the clarification agenda.** Turn every real unknown surfaced in steps 2–3 — an embedded
   scope decision that could go either way, a hidden-rubric item nobody said out loud — into one
   question, in plain client language, no design jargon. This is the round's first-class output:
   what the user carries into the next client/PM meeting to actually close the gap this stage
   exists to close. Lives in `Clarifications.md` (see workspace-write, step 9).

5. **Capture the guiding principle / product spine** — the one idea everything ladders back to. If
   the brief/stakeholders state it, record it. If not, write `PROVISIONAL — confirm in research`.
   Do not invent a principle to look complete.

6. **Set provisional success criteria** (gap #4) in **two registers** (see CONVENTIONS): the
   shipped outcome (how you'd know it worked in the world once shipped) AND the in-session signal
   that would predict it — the observable behaviour a prototype test can actually measure, so
   research's **evaluate** move has something to check. Mark `PROVISIONAL — revisit after research`; rough is fine now.

7. **Seed the risk register** (gap #8) — the assumptions the framing already rests on, status `untested`.

8. **Recommend a route** (fix #1): based on how ambiguous/net-new the brief is, suggest **Full** or
   **Lite** (a short Understand loop → `build` → `compile-spec`, inserting `design-system` before
   `build` when the look matters — see CONVENTIONS' Two routes). Let the user decide; record it.

9. **Write the workspace** under `<vault>/Design Studio/<slug>/`:
   - `00 Dashboard.md` — project home note. YAML per the CONVENTIONS dashboard contract
     (`type: design-project`, `status: active`, `stage: debrief`, `client`, `route`, `started`,
     `prototype_repo:` empty). Body: Current stage (round-aware prose, e.g. "debrief — round 1,
     awaiting meeting"), Next step, Artifacts list (links), and a Dataview table of this project's
     decisions:
     ````
     ```dataview
     TABLE status, stage, date FROM "Design Studio/<slug>/Decisions" SORT id ASC
     ```
     ````
   - `01 Brief & Problem.md` — original brief verbatim, the restated problem, the rubric as a
     checklist, the guiding principle, success criteria. Mark provisional items clearly.
   - `Clarifications.md` — this round's agenda plus a retired section below it (empty on round 1):
     question, answer, who answered, which round. Never delete a retired question — same
     immutability spirit as the decision log.
   - `Assumptions & Risks.md` — the seeded register.
   - `Harvest.md` — empty flag inbox for Studio Wiki keepers (capture is free; see CONVENTIONS).
   - `Decisions/0001 <framing-slug>.md` — the framing decision. `status: proposed`, UNLESS this is
     a no-client project and the user has already confirmed it in step 3 (then `decided`
     immediately, step 12). Never write `decided` for a client project here — that's the loop's
     call (step 15), not round 1's.
   - `Agreements.md` — seed it now, likely thin on round 1: a living render of the decision log in
     **four sections** — **Agreed** (building now), **Decided against**, **Deferred** (each entry
     names what unblocks it — the decision log's own `status: deferred` note, echoed here), and
     **The full vision** (everything the solved problem honestly implies, named and acknowledged
     even though none of it is ruled yet — don't pretend the problem is small just because round 1
     is thin; the full-size confrontation happens every time this document is opened, not once at
     a stage nobody always reached). Never authored content of its own, always regenerated from
     `Decisions/` — step 16 is what keeps it live. **Sequencing is recorded here too, and it is
     human-authored**: the user knows manpower, budget, and politics an AI can't see, so no skill
     drafts a sequence — a skill may only *review-check* one the user states, against two preserved
     principles: each release ships something real, and the hardest, most-uncertain decision is
     deferred until there's evidence for it.
   - Create empty `02 Research/` and `_assets/` so later skills have a home.
   - Set `<vault>/.design-studio-active` to the slug.

10. **Ensure the portfolio dashboard exists.** If `<vault>/Design Studio/_Design Studio.md` is
    missing, create it with the Dataview portfolio queries from CONVENTIONS. It auto-discovers this
    and all future projects by frontmatter — no row to append. Ensure a `Home.md` exists at the
    vault root (Homepage landing note) linking to the portfolio — and to `Studio Wiki/_index.md` if
    the wiki exists.

11. **Update `00 Dashboard.md`.** No client → stage = debrief done, next step = research (or per
    route); 0001 reads `decided`. Client → stage stays debrief, Current stage reads "round 1,
    awaiting meeting," next step = "bring `Clarifications.md`'s agenda to the client/PM."

**The convergence loop (round 2..N) — and its one-round exception:**

12. **No client at all** (self-initiated, ingest): there's no second party to converge with, so
    round 1 *is* the whole loop and steps 13–16 don't apply — the user's own confirmation in step 3
    is enough to flip 0001 straight to `decided`. Don't hold a solo project at `proposed` waiting
    for a meeting that will never happen; this path never hard-blocks. Everything from here on is
    the client path.

13. **Resume when the user comes back from a meeting — or from a research departure.** Standalone
    per the loose-coupling rule — this may be a different session. Read `00 Dashboard.md` /
    `Clarifications.md` to confirm this is a resume, not round 1. A round opens one of two ways:
    - **From a meeting** — ask what came back: which agenda questions got answered, and in whose
      words — the client's own words are what this loop is for; a paraphrase from the user is
      weaker but workable when that's all there is.
    - **From a research departure** ([[0020 understand-is-one-loop-reframe-and-scope-fold]]) —
      `design-studio-research`'s framing check flagged a candidate framing that passed the reframe
      test. Treat the research report's evidence as this round's surfacing input, and run the lock
      check below (step 15) on the candidate departure instead of on retired agenda questions.

14. **Retire and sharpen.** Move each answered question into `Clarifications.md`'s retired section
    with the answer recorded, as verbatim as what the user has. Use the answers to sharpen the
    restatement in `01 Brief & Problem.md` — tighter and more specific, not just longer. Re-run the
    surfacing core (step 2) against what the client said: does any answer imply a new hidden-rubric
    item or a scope decision nobody named? Draft those into next round's agenda (step 4 again) —
    round N+1's `Clarifications.md` entry.

15. **Check the lock condition** (🔴, two-turn — never collapse this to one turn). Present the
    sharpened restatement and ask whether it now matches what the client actually confirmed — then
    **end the turn.** Only after the user replies in a later turn: if every question is retired and
    the client agreed, record 0001 `decided`, quoting the client's verbatim confirming words
    (relayed by the user) under **In their words.** The confirming voice is the client's; the
    two-turn rule and the verbatim-quote requirement still apply exactly as CONVENTIONS states them
    — this extends the ritual, it doesn't relax it. If anything's still open, 0001 stays `proposed`
    and step 4 opens the next round's agenda instead.

16. **Refresh `Agreements.md` and the dashboard at the close of every round** — locked or not.
    `Agreements.md`: re-render all four sections — Agreed / Decided against / Deferred (each with
    what unblocks it) / The full vision — from `Decisions/`; regenerate it from the log, don't
    hand-edit it out of sync with what the log actually says. Dashboard: bump the round in the
    Current stage line ("round 2, awaiting meeting" → "round 3, …") until 0001 reads `decided`,
    then hand off.

    **Then run the utility check** ([[0030 utilities-push-dont-pull]]): write the harvest-debt
    standing line (`Harvest flags pending: N · last crossing: <date | none>`) on `00 Dashboard.md`;
    if `Studio Wiki/log.md`'s last `lint` is older than ~7 days, run `design-studio-wiki-lint`'s
    mechanical pass (semantic proposals still queue for the user). Skip silently when no
    `Studio Wiki/` exists yet — a fresh project usually has neither wiki nor pending flags.

## Handoff
Once 0001 is `decided` — immediately for no-client projects, after however many rounds it takes for
client ones — point to `design-studio-research` (both routes run the Understand loop; a Lite run just
loops it briefly before heading to `build`).
