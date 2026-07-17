# Design Studio — Shared Conventions

Single source of truth for the **design-studio** pipeline. Every `design-studio-*` skill
reads this file first, then does its own job. Change a convention here, nowhere else.

Structure follows researched Obsidian best practice: **few folders by lifecycle, classification
in YAML; one dedicated parent folder for design projects; one subfolder per project (the only deep
nesting); number-prefixed stage files; an immutable ADR decision log.**

## Output voice (hard rule)

Never write an em dash or an en dash, in anything any skill produces: ledger entries, renders,
decision entries, dashboards, reports, notes, commit messages. Use a comma, a colon, parentheses,
a semicolon, "to" or "through" for ranges, or two sentences. ONE exception: a receipt's quoted
span is verbatim source text and keeps exactly the punctuation the source has; never edit a quote
to comply.

## Write to be read (hard rule)

Every document a skill writes is read by a busy human before it is read by another agent. So in
ALL prose, in every artifact (ledger notes and asks, research docs and reports, What's Worth
Building, dashboards, decision bodies, the register's found column):

- Everyday words and short sentences: write it the way you would say it aloud to a client.
- No system or research vocabulary in prose (refuted, presupposition, exhausted, supersedes,
  evidence grade, reframe test). When a term of art is unavoidable, say what it means in the same
  sentence.
- Lead with what it means and what changes; the reasoning comes after.
- Precision lives in the structure, not the prose: ids, labeled lines, states, frontmatter, and
  receipts carry the exact claim; the prose around them carries the meaning. Never dilute a
  labeled line, an id, or a receipt to sound friendlier; never let prose get technical because the
  structure nearby is.
- Verbatim quotes stay verbatim, always (same exception as the Output voice rule).

The test: a reader who knows nothing about this pipeline can follow any document cold. A document
a layperson cannot follow is a defect, with the same force as the Output voice rule.

**The register (Jess's voice).** Beyond plain, every document reads the way Jess talks. The rules,
each a hard rule:

- Short sentences. One idea each. When a sentence carries two jobs, split it.
- Problem before solution: every section opens with the problem it exists to solve, then the answer.
- One home per fact. A fact appears exactly once, at the moment it does work; never restated.
- Plain nouns, never coined terms. "The hardening moment" loses to "the moment you decide you are
  done". If a phrase had to be invented, it is wrong.
- Concrete scenario over abstract category: not "compliance risk" but "someone leaves the company
  and still sits in some workspace list".
- No writerly antithesis (the "X, not Y" construction reads as written, not spoken; say the one
  thing that is true).
- No stage directions to the reader ("think about what that means"); state the consequence instead.
- Deliberate fragments are fine. Errors are not. Grammar is correct; the register is casual.
- Sections end on the verdict, not on process.
- Say what exists, not asides about it ("we have a working prototype", never "the prototype
  actually works").
- Never judge earlier work or its author; supersede it and say why the new thing is right.
- Do not undersell an example, and do not narrate your own competence.

---

## The pipeline's grammar — loops, stages, moves ([[0031 loops-are-law]])

The law that shapes everything below. Three shapes, and every skill is exactly one of them — the
stage-by-stage rethink discovered this grammar empirically before it had a name (every ruling from
0016 to 0028 was an instance of it).

- **Loop** — *work that converges with a human in the middle.* Rounds of AI work → artifact →
  human review → sharpen, **closed only by the human** as risk-acceptor. There are two: the
  **Understand loop** (`debrief` ⇄ `research`, the `Knowns & Unknowns.md` ledger between them) and
  **`build`** (specs → agents → Canvas review → the round-closing gates).
- **Stage** — *exists only where an artifact must precede its consumers.* `structure` before
  `design-system` and `build`; `design-system` before `build`. A skill earns stage-hood by being a
  hard dependency in the spine — nothing else does.
- **Move or render** — *everything else, invoked on demand.* Research's moves (desk sweep,
  behavioral-data, pressure-test, directions, evaluate, reconcile), `compile-spec`'s renders, and
  the wiki utilities (`setup`, `harvest`, `wiki-lint`) are moves and renders, not stages.

**Nothing locks before production; every outcome is supersedable** ([[0023 nothing-locks-before-production]]) —
the only real lock is shipped code. **A new skill must justify which of the three it is** before it
joins the pipeline; if it can't, it doesn't belong on the spine.

---

## The vault & the design-projects home

- **Vault root — resolve, never assume:** read `~/.design-studio-vault` (one line, an absolute
  path; written by `design-studio-setup`). Pointer missing or stale → offer to run
  `design-studio-setup`, or accept a path the user states and write it to the pointer. Never
  hard-block.
- **All design projects live under one parent folder:** `<vault>/Design Studio/`
  (it sits beside whatever else the user keeps at their vault root).
- **Studio knowledge lives beside them** in `<vault>/Studio Wiki/` — one Obsidian graph across
  projects and knowledge. See *Studio Wiki — the compounding memory* below.
- One **subfolder per project** inside `Design Studio/`. That per-project folder is the only place
  nesting goes deep (one extra level for `Decisions/`, `02 Research/`, `_assets/`). Nothing deeper.
- Skills write markdown **directly** to disk — no REST API, no plugins required. Keep everything
  **native**: YAML frontmatter properties (not inline `::` fields, which need Dataview) and a
  hand-maintained project list. Include optional Dataview blocks that degrade gracefully if absent.
- Skills write files; only the main thread writes decisions (never a sub-agent — avoids id collisions).

## Active project pointer

- File: `<vault>/.design-studio-active` (dotfile, ignored by Obsidian).
- Contents: one line — the project slug (e.g. `acme-rebrand`). Full path is `<vault>/Design Studio/<slug>/`.
- Resolution order in every skill: (1) explicit name in the invocation, (2) `.design-studio-active`,
  (3) ask the user.
- Only `design-studio-debrief` creates a project and sets this pointer.

## Portfolio dashboard (uses Dataview)

- File: `<vault>/Design Studio/_Design Studio.md` — the home note for all design projects.
- `debrief` creates it if missing. It is a **Dataview** dashboard that **auto-discovers projects by
  frontmatter** — no manual row-keeping. Include an active table and a stalled-projects view:

````
```dataview
TABLE status, stage, client, started
FROM "Design Studio"
WHERE type = "design-project" AND status != "archived"
SORT started DESC
```
```dataview
TABLE status, stage, round(date(today) - file.mtime, 1) AS "Idle"
FROM "Design Studio"
WHERE type = "design-project" AND status = "active"
SORT file.mtime ASC
```
````

- `Home.md` at the vault root is the **Homepage**-plugin landing note and links here (and to
  `Studio Wiki/_index.md` once the wiki exists).
- **Bases** (core plugin, Obsidian 1.9+) reads the same `type: design-project` frontmatter — create
  a base filtered `type == "design-project"` with columns `status / stage / client / started`, and a
  second view grouped by `status` for a board. (Replaces the discontinued Projects plugin.)
- **Excalidraw** sketches (flows, wireframes, data-model diagrams) live in each project's `_assets/`.

## Project folder structure

```
<vault>/Design Studio/<slug>/
  00 Dashboard.md           ← project home note; YAML below; links every artifact + the repo. Its
                              Current stage line follows the closed colon grammar (state machine
                              below); it carries the status line + the utility standing lines only.
                              Parked 🔴 calls are NOT listed here: they render in What's Worth
                              Building's Parked decisions section (the single review surface)
  01 Brief & Problem.md     ← restated problem, rubric, principle, success criteria (provisional early)
  Knowns & Unknowns.md      ← THE LEDGER: the Understand loop's spine. Unknowns + Knowns in one
                              monotonic L<N> id space (each exhausted unknown keeps its ask: field),
                              the convergence block, Retired, an append-only round log, and an
                              append-only Review log region (the durable receipt every human verdict
                              cites; there is no Human agenda section). Machine-owned: debrief seeds
                              it, research runs rounds over it. Full contract in "The Understand loop
                              state machine" below. Absorbs the deleted Clarifications.md
  02 Research/              ← Company.md / Pain.md / Standards.md / Landscape.md
    _inbox/                ← fed-in data lands here; research's first move each round is to list
                              it, read each item, then move it to where it belongs in 02 Research/
                              with a provenance note (source, date fed in, round): fed-in data
                              becomes a file before it becomes evidence
    Synthesis.md           ← the living prose research report (findings, recommendation, standing
                              lines); kept, but its round log now lives in the ledger, not here
  03 Structure.md           ← user flows + information architecture, drafted by design-studio-structure
                              from the accepted recommendation + What's Worth Building.md's Build
                              section (fills the retired 03 slot; a directions move's data-model
                              sketch lives in the research report, not here). 04 Directions.md and
                              05 Validation.md are retired: testing folded into research's evaluate
                              move (see [[0027 validate-dissolves-6-stages]]).
  Spec.md                   ← audience-shaped render of the log (on demand; align / eng-handoff
                              modes may write Align.md / Handoff.md beside it)
  Decisions/                ← ADR log: NNNN <slug>.md, immutable, superseded-not-deleted; the only
                              verdict source (the ledger owns evidence, Decisions/ owns verdicts)
  What's Worth Building.md  ← THE COMPILE and the single human review surface (v2). A render of
                              Decisions/ (verdicts) annotated by the ledger (evidence), tiered:
                              Parked decisions / Questions for you / Proposed (tier 1, needs a ruling),
                              Build now / Backlog / Don't build (tier 2, standing rulings), Implied but
                              unruled / Open unknowns blocking a verdict (tier 3, context). Every
                              candidate carries a sticky W<N> id; downstream consumes Build now only.
                              Every reason carries a receipt or a literal ASSUMPTION: mark. A RENDER
                              only, never hand-authored; recompiled at every round close. Full
                              contract in "The Understand loop state machine" below
  Assumptions & Risks.md    ← living register (verified / partial / unverified / accepted), now a
                              RENDER of the ledger's load-bearing Knowns. Same filename and table
                              shape so build's register gate and the web parser stay untouched;
                              research owns it, build is the ONE gate (warn-never-block) on an
                              unverified load-bearing assumption, at build's door only
  DESIGN.md                 ← the visual contract (design.md format); moves to the prototype repo at build
  Harvest.md                ← flag inbox: one-line keepers for the Studio Wiki (project-local until harvest)
  Drift Ledger.md           ← on-demand: decision-log-vs-shipped-reality reconciliation, written by
                              research's reconcile move ([[0027 validate-dissolves-6-stages]])
  _assets/                  ← attachments scoped to this project (incl. boards/ specimen pages)
```

The **clickable prototype** is a separate code repo, NOT in the vault. `00 Dashboard.md` links to it.

`slug`: lowercase, hyphenated. Folder name = slug. Human-readable name lives in the dashboard YAML.

### Dashboard YAML contract (makes the portfolio queryable, native properties)
```yaml
---
type: design-project
status: active        # active | blocked | done | archived
stage: debrief        # debrief|research|structure|design-system|build
client:
route: full           # full | lite
started: YYYY-MM-DD
prototype_repo:       # filled when build starts
---
```

`stage` above is the enum token only. The dashboard body's **Current stage** line is a status string
both the loop controller and the web board parse. While the Understand loop runs it follows a
**closed, colon-delimited grammar** (first field the stage enum, then the loop sub-state), e.g.
`Current stage: research: researching: round 3, dry-streak 1, open 12, parked 1` or
`Current stage: debrief: seeded: round 1`. The full grammar and every terminal state live in "The
Understand loop state machine" below. No schema change, no new enum value.

The dashboard body also carries a **harvest-debt standing line** — free prose, kept current whenever
a skill closes ([[0030 utilities-push-dont-pull]]):

```
Harvest flags pending: N · last crossing: <date | none>
```

`N` is the count of undistilled flags in this project's `Harvest.md` (those not yet moved to its
Distilled section); the date is this project's last `harvest` crossing (`none` if never harvested).
It rides on `research`'s report contract too, so the debt a project has accrued is continuously
visible rather than discovered only at project close — the visibility half of the "utilities push,
don't pull" ruling below.

---

## Loose coupling — skills run independently (fix #1, #4)

The pipeline is a **default path, not a mandatory ritual.** Every skill must:

1. **Run standalone** — never require the previous skill ran this session; read the vault for state.
2. **Check preconditions, warn, allow override** — if an expected upstream artifact is missing, say
   so and offer to proceed or run the upstream skill first. Never hard-block.
3. **Update `00 Dashboard.md`** before finishing — set `stage`, the recommended next step, and link
   any new artifact. The dashboard is the one place that always answers "where is this project?"
4. **Be skippable** — a small project may run only `debrief → research → build`. Valid.
   Don't nag about skipped stages.

### Two routes
- **Full** — meaty, ambiguous, net-new problems: the whole pipeline.
- **Lite** — routine/scoped work: a **short Understand loop** (`debrief → research`, often a single
  round) → `build`, **inserting `design-system` before `build` whenever the look matters** (and
  `structure` whenever the flows aren't obvious), with `compile-spec` invoked on demand for a handoff
  render when one is needed. Which stages a Lite run keeps is a **judgment call** — the point of Lite
  is to skip the ceremony a routine brief doesn't need, not to fix a shorter list; `debrief` proposes
  the route from how ambiguous the brief is, and the user decides what to keep. Loose coupling (above)
  means any skipped stage can still be run later.

### Override receipts
Preconditions warn but never gate (rule 2 above). Whenever the user overrides a warned
precondition — proceeding without an upstream artifact — the skill appends one dated line to a
`## Overrides` section in `00 Dashboard.md` (create the section if missing), e.g.
`- 2026-07-10 — built without design-system`. Not a gate; a receipt.

### Utilities push, don't pull ([[0030 utilities-push-dont-pull]])
The wiki utilities don't wait to be remembered — remembering to run them was too much work to rely
on. They **push**: a skill checks vault state **at its own close** and acts on what it finds. There
is **no daemon** — the vault on disk stays the state, and a utility self-triggers only at a moment a
skill is already running. Two utilities push:

- **`harvest` is agent-initiated.** The agent judges harvest-worthiness — at a round close, a project
  going `done`, or a project's undistilled flag-debt crossing a threshold (~5 flags) — and drafts the
  candidate pages unprompted. Only the *remembering* is removed: the sole-writer law, the one-way
  membrane, and the page-by-page 🔴 crossing review are all unchanged — the agent decides *whether* to
  offer a crossing, the user still decides *what* crosses.
- **`wiki-lint`'s mechanical pass is self-triggering.** A closing skill checks `Studio Wiki/log.md`'s
  last `lint` date and runs the **mechanical** checks (and applies their fixes) when it's stale
  (~7 days). The **semantic** proposals (supersede, fork, age-out, retire, amend) are never
  auto-applied — they still queue for the user.

Harvest-debt visibility rides as the standing line on dashboards and reports (see the dashboard
contract above). Setup and compile-spec are unaffected — they already run only when invoked.

---

## The 🔴 ritual — never auto-decide a scaffold stage (fix #3)

🔴 moments (`debrief`'s framing lock and route call, `research`'s directions-move pick, `harvest`'s
crossing review) exist to make **the user** decide. The failure mode: being helpful, the skill
drafts the answer "to save time" — manufacturing a generic point of view, the exact thing this
pipeline exists to prevent.

**A two-phase protocol, spanning two turns — never one:**

*Phase 1 — ask, then end the turn.*
1. Lay out the structured inputs (evidence, options, costs) fully.
2. Ask the decision question. Then **STOP and end the turn.** Do NOT write the decision, reframe,
   spine, or cut — no decision file may be created in the same turn as the question.

*Phase 2 — record, in a later turn.*
3. Only after the user has replied in their own words, record their decision into the log —
   quoting them verbatim under `**In their words.**` and setting `authored_by: user` (see the
   decision-log Authorship rule).
4. If the user says "you decide," do not fold — **decompose.** Ask 2-3 narrow either/or questions
   (e.g. "if you could ship only one of these two, which?") whose answers reconstruct the verdict.
   If they still decline, record `status: proposed`, `authored_by: skill`; never silently promote
   to `decided`.

You may *sharpen* their thinking (name the trade-off, point out a fourth framing). You may not
*supply* the verdict.

**Headless park clause.** When the loop runs headless (a `research` spawn with no human in the turn)
there is no user reply to quote, so phase 2 cannot be satisfied. A headless spawn therefore NEVER
writes a 🔴 verdict itself. It **parks the decision** by writing a `proposed` 🔴 decision to
`Decisions/`: `status: proposed`, `authored_by: skill`, naming exactly what the 🔴 blocks (a framing
lock, a framing departure, a directions pick, or a route call), carrying the candidate verbatim with
both sides and the reframe-test legs, a `supersedes_if_taken:` target, a `blocks:` line, and its
receipts. Each fresh park **supersedes the skill's own prior parked proposal** for that same 🔴 rather
than accumulating a pile, so exactly one proposal is live per open call. **Parking a 🔴 no longer stops
the loop** ([[0036 one-continuous-cycle]]): the round records the `proposed` decision and the loop
CONTINUES its rounds to the dry streak or the round cap, exactly like any other round; the park is a
decision waiting for the human, not a halt. There is no `## Awaiting you` dashboard bullet anymore
(that convention is deleted): the
`proposed` 🔴 decisions ARE the render source for What's Worth Building's Parked decisions section
(tier 1), the single surface the human reviews. A headless spawn may write `authored_by: user` or
`status: decided` ONLY through the review-ingestion recorder under the amended headless-verdict law
(state machine below); the loop controller quarantines any other decision file in the run's window
that does. The verdict waits for the human's own words in a later turn: automation extends the
two-phase protocol, it never bypasses it.

---

## Decision log — the spine (ADR pattern)

Every skill that makes/records a decision appends ONE file to the project's `Decisions/`. Capture it
**at the moment it's made**, never reconstructed. The reasoning is the deliverable.

Filename: `NNNN <short-slug>.md` (zero-padded, monotonic — read the folder for the next id; ids are
never reused).

```markdown
---
id: 0000
stage: debrief            # which skill produced this
status: proposed          # proposed | decided | deferred | superseded
authored_by: user         # user | skill — who supplied the verdict
date: YYYY-MM-DD          # use the known current date; never invent one
rests_on:                 # [[link]] to the assumption this depends on, if any
supersedes:               # [[0000 ...]] if this replaces an earlier decision
superseded_by:            # filled in later when this gets replaced
tags: [decision]
---

# NNNN — <decision in one line>

**Decision.** What was chosen, concretely.

**Why.** Rationale, laddered to the guiding principle ([[01 Brief & Problem#Guiding principle]]).

**Rejected alternatives.**
- <option> — disqualified because <out-of-scope / wrong-persona / true-cost / API-can't>.

**True cost.** build: <effort> / support: <ongoing burden, weighted by team size>.

**Status note.** e.g. "Deferred to v3 until we learn X" / "Superseded by [[0007 ...]] after an evaluate round."
```

### Status semantics
- `proposed` — drafted/awaiting confirmation.
- `decided` — committed.
- `deferred` — deliberately not yet; Status note says what unblocks it.
- `superseded` — replaced. **Never delete a decision** (ADRs are immutable). Set `status: superseded`,
  fill `superseded_by`, link `supersedes` on the new entry. Keeps the real path visible (loop-backs).

### Authorship
- `authored_by` records who supplied the verdict: `user` or `skill`.
- For decisions produced by 🔴 stages, `authored_by: user` additionally REQUIRES the user's
  verbatim words in the body as a blockquote under a line `**In their words.**` — paraphrase is
  not acceptable for a 🔴 decision. A 🔴 decision with no quotation cannot be `authored_by: user`
  (record `authored_by: skill`, `status: proposed` instead).

### The recommendation's Candidates table and W-ids (entry identity law, [[0035 wwb-is-the-single-review-surface]])

`research`'s recommendation decision carries a **Candidates table**, the mint for every build
candidate's identity:

```
| W | title | lean | rests_on |
|---|---|---|---|
| W1 | <candidate title> | build | L4, L7 |
| W2 | <candidate title> | dont-build | L9 |
```

`lean` is `build` or `dont-build` (the engine's proposed direction, never a human verdict);
`rests_on` lists the ledger `L`-ids the candidate depends on. **`W<N>` ids are sticky**: minted here,
monotonic, they **survive supersession** (when a new recommendation supersedes an older one, surviving
candidates keep their ids) and are **retired, never reused** when a candidate is dropped. Questions
keep their ledger `L<N>` id; parked calls are referenced by their decision id. This is the identity
every What's Worth Building tier renders against (contract in the state machine below).

### The dispositions decision (the review recorder's output)

When the human reviews (the review protocol in the state machine below), the recorder writes ONE
**dispositions decision** per review batch: `status: decided`, `authored_by: user`, frontmatter
`review_batch: B` (the authorized batch id), citing the batch's review block
(`[[Knowns & Unknowns#review B]]`), listing every W-id ruling (build-now / backlog / dont-build), and
quoting the human per entry under **In their words.** For each 🔴 the human ruled, the recorder also
writes one **verdict decision** (a framing supersession, a directions pick, a route call), same
`review_batch: B`, citing the same block, with her verbatim words. These may carry `authored_by: user`
and `status: decided` because they satisfy the amended headless-verdict law; nothing else a headless
spawn writes may.

### Extra frontmatter (review and parked proposals)
- `review_batch:` sits on a dispositions or verdict decision the recorder wrote; it names the
  authorized batch id B. Its presence in FRONTMATTER is what lets a headless-written decision carry a
  human verdict (amended headless-verdict law); a body mention never counts.
- `supersedes_if_taken:` sits on a `proposed` 🔴 park decision; it names the decision (e.g.
  `[[0001 ...]]`) this proposal would supersede if the human takes it. Distinct from `supersedes:`,
  which fills only when a verdict actually lands.
- `blocks:` sits on a `proposed` 🔴 park decision; one line naming what the unresolved 🔴 blocks
  downstream.

---

## Success criteria — two registers

Success criteria are recorded in two registers, not one:
- **The shipped outcome** — how you'd know it worked in the world once shipped.
- **The in-session signal** — the observable behaviour a prototype test can actually measure in a
  room (a task completed unaided, a moment of recognition, a hesitation that doesn't come).

`debrief` sets both (provisional); research's **evaluate** move tests the **signal**, not the
outcome — the outcome is usually unmeasurable before ship, so a criterion with no in-session signal
gives an evaluate round nothing to check ([[0027 validate-dissolves-6-stages]]).

---

## DESIGN.md — the visual contract

Every prototype's visual language is codified in a `DESIGN.md`: **design tokens in YAML front
matter** (exact values) plus **rationale in the markdown body** (when and why to apply them). One
file both the user and coding agents read — it is what keeps a prototype consistent, especially
across parallel build agents.

- **Format — the studio owns it.** The authoritative definition is
  [`DESIGN-SPEC.md`](DESIGN-SPEC.md) beside this file — a fork of
  [google-labs-code/design.md](https://github.com/google-labs-code/design.md), provenance-pinned, no
  runtime fetch and no `npx`. Author against it, not memory. Token groups `colors` / `typography` /
  `spacing` / `rounded` / `components`, cross-referenced as `{colors.primary}`, state variants
  (hover/active/disabled) as separate named entries. Component sub-tokens are a fixed vocabulary
  (`backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`, `height`, `width`,
  and the owned `transition` — not arbitrary CSS). Body sections in fixed order: Overview, Colors,
  Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts. **Two studio
  extensions** over the base: a **`motion`** token group (`duration` / `easing` / `transition`) and
  **declarable accessibility floors** — minimum contrast ratios stated up front in the Colors
  section (`contrast:` block), a drafting constraint, not just a post-hoc check.
- **Single copy, moving home.** `design-studio-design-system` authors `<project>/DESIGN.md` in the
  vault — canonical while no repo exists. `build` **moves** it to the prototype repo root as its
  first committed act and leaves a link note in the vault. There is never a second copy to sync.
- **Token discipline.** Prototype UI takes every color / type / spacing / radius value from a token,
  directly or via the owned export
  (`node ~/.claude/skills/design-studio-shared/scripts/design-export.mjs <path>` → CSS custom
  properties, in any repo; or `npm run design:export -- <path>` from this repo's `web/`). A hardcoded
  value that bypasses the tokens is a defect, not a shortcut.
- **Lint gate — owned, runnable everywhere.** The zero-dependency `design-lint.mjs`
  (`node ~/.claude/skills/design-studio-shared/scripts/design-lint.mjs <path>` in any repo, or
  `npm run design:lint -- <path>` from this repo's `web/`) must
  pass before `build` consumes the file: structure (required sections in order, no duplicate
  heading), reference resolution, motion/floor syntax, and WCAG contrast against the declared floors.
  It replaces the old `npx @google/design.md lint`, which was blocked in every live run.
- **Export and drift diff — owned too.** The two other touchpoints run on the same zero-dependency
  toolchain, living in `design-studio-shared/scripts/` (installed to
  `~/.claude/skills/design-studio-shared/scripts/`) and sharing the lint's parser (`design-md.mjs`).
  `build`'s token export is `design-export.mjs` (`npm run design:export` from `web/`): `DESIGN.md` →
  CSS custom properties, references resolved, state variants and motion included. `build`'s
  round-closing drift diff is `design-diff.mjs` (`npm run design:diff` from `web/`): it compares two
  versions' **resolved**
  tokens — the repo's live file vs a git ref (the signed-off / build-start version) — and reports
  added / removed / changed; drift without a matching decision is a finding, run each round where
  drift actually happens ([[0027 validate-dissolves-6-stages]]). Together with the lint these retire the
  last of the upstream `@google/design.md` CLI (per vault decision `0025`) — nothing in the pipeline
  fetches alpha software at runtime anymore.
- **Changes are decisions.** Additive tokens are normal growth; reshaping the committed language
  supersedes the language decision like any other loop-back.
- No node handy to run the lint, export, or diff? Author against `DESIGN-SPEC.md`, hand-check the
  floors, hand-derive the export, and say so on the dashboard instead of silently skipping the gate.

---

## Studio Wiki — the compounding memory

One knowledge base for the whole studio, beside the projects: `<vault>/Studio Wiki/`. It
accumulates what projects *teach* — patterns, plays, traps, sparks, standards, taste — so project
N+1 starts smarter. **Projects are case files; the wiki is case law:** pages hold lessons stripped
of client particulars, each citing back to its source project. Follows Karpathy's LLM-wiki pattern
(flat markdown pages + thin indexes + append-only log + periodic lint; no RAG, no embeddings —
right at studio scale).

### Topology — hub-and-spoke, one-way membrane
- **Projects read the wiki freely.** Skills reach in at their natural moments (each skill names its
  hook). An empty result is honest, never an error: "no precedents yet — this project seeds them."
- **The wiki is written only through `design-studio-harvest`** — a reviewed distillation. Never
  directly from a working session, never by a sub-agent (single-writer, same rule as decisions).
  Two mechanical exceptions, neither of which crosses project material: `design-studio-setup`
  seeds the shipped starter pages at init, and `design-studio-wiki-lint` applies approved
  mechanical fixes.
- **Projects never read each other.** Not even "for reference." The only path between projects is
  a deliberately abstracted wiki page. This is what keeps unrelated client work unsmushed — and
  confidential.

### Capture vs distillation — two acts, different costs
- **Capture is free and continuous.** Every project has a `Harvest.md` flag inbox: one-liners with
  context links, zero processing, project-local (the membrane stays intact). Skills auto-flag their
  byproducts — rejected directions, the cut list, evaluation findings that generalize — and the
  user can flag anything: "that's a keeper."
- **Distillation is deliberate and reviewed (🔴).** At project close, at milestones on long
  engagements, or when flag-debt crosses a threshold, `harvest` drafts the crossing — new pages,
  edits, supersedes — de-clientified, and the user approves it like a PR. The agent now judges those
  moments and offers the crossing unprompted ([[0030 utilities-push-dont-pull]]); the review gate is
  unchanged. Nothing crosses the membrane any other way.

### Layout
```
<vault>/Studio Wiki/
  CLAUDE.md     ← the wiki's schema file: rules + read protocol for ANY session (ships in starter-wiki)
  _index.md     ← entity view: one line per page (maintained by harvest)
  _plays.md     ← problem-shaped view: plays & traps, matched by problem shape
  _sparks.md    ← the sparks shelf: orphaned ideas, browseable
  log.md        ← append-only, parseable: "## [YYYY-MM-DD] init|harvest|lint|ingest — <source>"
                  (a short summary may follow the source, e.g. ": 2 pages, 1 edit")
  raw/          ← immutable source captures (transcripts, excerpts, images; add-only)
  wiki/         ← the pages, flat (no deep nesting)
```

### Read protocol — index-first
Views first (`_index.md` by entity, `_plays.md` by problem shape, `_sparks.md`), then drill into
only the matched pages — never scan `wiki/` wholesale. Analyses worth keeping don't die in chat
history: capture the material to `raw/` and cross via `harvest` ingest — or, if project-specific,
flag them in that project's `Harvest.md` instead. If the wiki ever outgrows flat indexes
(hundreds of pages), bolt on a local markdown search tool (e.g. qmd) as a *reader* — the pages
and the membrane don't change.

### Page contract
```yaml
---
type: wiki-page
entity: pattern      # pattern|play|trap|spark|standard|craft|taste|client|tool|source
applies: mechanism   # mechanism = safe everywhere | taste = invited only (greenfield) | process
origin: harvest      # harvest | starter | manual
born:                # project slug the lesson/idea came from
sources: []          # [[links]] to project decisions / raw captures (plain strings when a page ships outside a vault)
status: live         # live | superseded | aged-out
last_confirmed: YYYY-MM-DD
---
```
Body shapes — **pattern**: Works when / Breaks when / Seen in. **play**: The move / When it
applies / Cost. **trap**: What happened / The decision shape that triggers it / Counter-move.
**spark**: The idea / Why it was cut / What it needs to live. **standard**: The primitive / Where
it applies / Source of truth. **taste**: The kept / The cut / Why (the user's own sentence, quoted
verbatim). A taste page records a judgment pair from a real cut (a directions-move pick, or any cut
darling in the loop); it is never authored from
description alone. Supersede, never overwrite — ADR semantics apply to wiki pages too.

### Write discipline — what keeps it alive
- **Few pages, each earns its place.** Prefer editing an existing page over minting a new one. A
  junk drawer serves everything in theory and nothing in practice.
- `applies: taste` is never applied to client-brand work uninvited; `mechanism` is always safe.
- `design-studio-wiki-lint` prunes: contradictions, orphans, duplicates, coverage gaps, stale
  pages, sparks that never got used, harvest debt (done projects with undistilled flags).
- No page without provenance: every page cites `sources` (raw captures, decisions) — synthesis is
  filed only after its material lands in `raw/`.
- Version the vault (or at least `Studio Wiki/`) in git once real pages exist — history, blame,
  and collaboration for free.

### Seeding — two user types, one mechanic
`harvest` seeds an empty wiki by input mode: **starter** (copy the shipped pages from
`design-studio-shared/starter-wiki/` — mechanism and process class only, plus one clearly-marked
taste example card that asks to be deleted), **backfill** (retro-harvest past projects — cap 3,
best-remembered first: the user's memory of what mattered is the curation signal), **derive**
(existing product → baseline pages describing what is). Taste pages are never shipped and never
backfilled from someone else's work — taste is grown; that's the point.

---

## Autonomy levels

- 🟢 **execute** — the skill does it (research, scaffolding, rendering).
- 🟡 **draft** — first version the user edits.
- 🔴 **scaffold** — the skill must NOT produce the answer; run the 🔴 ritual.

## The Understand loop state machine ([[0034 understand-loop-is-an-exhaustion-engine]])

The Understand loop is an **exhaustion engine**. `debrief` seeds a ledger of knowns and unknowns;
`research` runs rounds over it, attempting **every** open unknown and spawning new unknowns as it
answers old ones, until it provably runs dry. Only then do humans get questions: the ones
research could not answer. This section is the law both skills obey and the loop controller enforces;
`debrief` and `research` each do their own job against it.

### The ledger: `Knowns & Unknowns.md`

One file, one monotonic `L<N>` id space, holding every unknown and known plus the convergence block,
the Retired section, an append-only round log, and an append-only Review log region. There is no
Human agenda section: an exhausted unknown keeps its `ask:` field and renders straight into What's
Worth Building's Questions for you tier. Two-source model: `Decisions/` owns verdicts, this ledger
owns evidence; `What's Worth Building.md` and `Assumptions & Risks.md` are regenerated renders of the
two, never authored by hand.

Each entry is an H3 followed by labeled lines:

```
### L7: Does the current user base rely on CSV export?
kind: unknown              # unknown | known
state: research-exhausted  # unknown: open | researching | research-exhausted | answered | retired
                           # known:   verified | partial | unverified | accepted
load_bearing: true
assumption: true           # present + true when load-bearing and not verified (mechanical)
attempts: 2                # DERIVED by counting this L-id in the round log; never a stored counter
spawned_by: L3             # lineage: the unknown or known whose answer minted this one
answered_by:               # the round or answer-batch that answered it, once answered
receipts:                  # one per line: [[target#anchor]] "verbatim quoted span"
note:                      # free machine note
ask:                       # human-facing phrasing, filled only once an unknown latches exhausted
```

`attempts` is **derived**, always: count the entry's appearances in the round log, never trust a
stored number. Unknown states walk `open → researching → research-exhausted → answered` (or `retired`
when a superseding L-id takes over); known grades are `verified | partial | unverified | accepted`.

### Receipts: quote-plus-link, or it is an assumption

A **receipt** is a wikilink **plus** a verbatim quoted span: `[[target#anchor]]` followed by a quoted
span of **25 words maximum** that must occur **literally** in the target file (whitespace normalized).
A bare `[[wikilink]]` is **not** a receipt. A grade of `verified` or `partial` REQUIRES at least one
conforming receipt; without one the entry is mechanically downgraded and marked `assumption: true`.
`receipt-verify.mjs` (beside `design-lint.mjs`) checks that every receipt parses, that its target
resolves, and that the quoted span really occurs in the target, failing the round otherwise.

### Exhaustion and convergence (the termination guarantee)

Two independent latches, both configurable in the ledger's convergence block:

- **Per-question latch `M` (default 2).** After `M` attempts with no progress on a single unknown it
  flips to `research-exhausted`: human-eligible, and re-openable at most **1** more time (re-open cap).
- **Loop-level dry streak `K` (default 2).** After `K` committed rounds in a row with no progress the
  loop surfaces the exhausted questions (What's Worth Building's Questions for you tier) and parks.
  `C` (default 6) is a hard round cap per invocation, and `U_max` (default 40) caps total unknowns per
  human-cycle so a spawning storm cannot run forever.

Even an obviously human-only question ("what is the budget?") still gets its `M` attempts and **fails
fast**, recording `no research surface: <why>`; dryness is **proven, never pre-labeled**. The
convergence block lives in the ledger, verbatim, so both skills read the same defaults:

```
<!-- convergence -->
K: 2         # loop-level dry-streak rounds that trigger the questions surfacing + park
M: 2         # per-question no-progress attempts that latch research-exhausted
C: 6         # hard round cap per research invocation
U_max: 40    # total unknowns cap per human-cycle
reopen_cap: 1
<!-- /convergence -->
```

### Progress (strict, anti-gaming)

**Only a distinct unknown reaching `answered` WITH a conforming receipt counts as progress.** Grade
bumps, rewordings, and freshly spawned questions never count. `answered` is **sticky**: a later
contradiction does not edit the answer, it opens a **new superseding `L`-id** (the old one goes
`retired`, its `answered_by` points forward). A lineage may reopen at most **2** times; the third
contradiction **auto-escalates** to the human instead of spawning again.

### Round anatomy (the fixed order)

Every research round, in order:

1. **Rollback check.** First act: if the round log ends in an unclosed `<!-- round:N:begin -->` block
   (a crash mid-round), truncate it back to the last `<!-- round:N:end -->` before doing anything else.
2. **Intake.** Ingest `_inbox/` and any pending anchored human-answer batch (see file discipline
   below). A headless run reads the answer batch embedded in its own prompt; the app never writes the
   vault.
3. **Attempt every open unknown.** The default shape is one read-only investigator per open unknown,
   run in parallel a few at a time ([[0038 the-loop-survives-restarts-and-shows-its-work]]); the
   pressure-test rides the riskiest load-bearing entry. Sub-agents return findings, only the main
   thread writes and grades.
4. **Grade and record.** Mint Knowns from receipted evidence, latch exhausted unknowns, spawn new
   unknowns with `spawned_by` lineage. Run `receipt-verify.mjs`; any `verified`/`partial` without a
   conforming receipt downgrades and is marked `assumption: true`.
5. **Recompile the renders.** `What's Worth Building.md`, `Assumptions & Risks.md`, and `Synthesis.md`
   are regenerated wholesale from the ledger + `Decisions/`.
6. **Evaluate convergence.** Compute this round's progress, the dry streak, the open count, and the
   agenda; decide the terminal state.
7. **Write the round block, then the status line LAST.** Append the round's
   `<!-- round:N:begin -->` … `<!-- round:N:end -->` block, then write the dashboard Current stage
   line **last** as the commit fence: the status line's presence is what says the round committed.

### Crash idempotence

The round log is **append-only truth** inside anchored `<!-- round:N:begin -->` / `<!-- round:N:end -->`
blocks. Every other section of the ledger and every render is a **wholesale-rewritten projection** of
that log plus `Decisions/`, so a re-run rebuilds them deterministically. Human-answer batches are
anchored the same way (`<!-- answers:B:begin -->` / `<!-- answers:B:end -->`). The status line, written
last, is the fence that says a round fully committed; an unclosed block is truncated first (step 1).

### Status grammar (closed, colon-delimited)

While the loop runs, the dashboard **Current stage** line is exactly one of these (the controller and
the web board parse field 2 as the state keyword):

```
Current stage: research: researching: round N, dry-streak D, open Y, parked K
Current stage: research: converged-complete: round N
Current stage: research: converged-humans-needed: round N, agenda X, review R
Current stage: research: capped: round C, agenda X, open Y, review R
Current stage: debrief: seeded: round 1
Current stage: debrief: ingested: batch B
```

`researching` means keep looping; its `parked K` field is the count of live `proposed` 🔴 calls this
round carries (a 🔴 parks a decision and the loop keeps running, [[0036 one-continuous-cycle]], so a
park is now an in-flight field, not a stop). The three terminal states for the invocation are
`converged-complete`, `converged-humans-needed`, and `capped`. `review R` is the count of items
awaiting the human on the human-facing terminals, R = proposed candidates to triage + open questions +
parked calls (the same total What's Worth Building's summary line breaks out). `debrief: seeded: round 1`
is debrief's seed fence, and `debrief: ingested: batch B` is the recorder's fence after it ingests a
review batch (renamed from `answers-ingested`); the controller chains a fresh research invocation from
either. **Legacy parse (never emitted by a new round, read tolerantly):**
`research: parked-decision: <target>, review R` was the old terminal when a 🔴 stopped the loop;
`review: awaiting: R` was the old recorder fence after a partial triage; `debrief: answers-ingested: batch B`
was the old spelling of the ingested fence. All three still parse and never crash the parser. Other
legacy free-prose lines are read tolerantly too.

### File discipline: machine-owned vs human-append

- **Machine-owned, wholesale-rewritten:** `Knowns & Unknowns.md` (except its append-only round-log,
  answer-batch, and Review-log blocks), `What's Worth Building.md`, `Assumptions & Risks.md`, and
  `Synthesis.md` (except its round log, which moved to the ledger). Never hand-author these; edit the
  source (`Decisions/`, or answer a ledger unknown) and let the round recompile them.
- **Human-append:** answers and rulings arrive as anchored blocks in the ledger's Review log region,
  never as an in-place edit of a projection. `debrief` writes an interactive `<!-- answers:B -->`
  batch when it ingests a meeting's answers, or one rides embedded in a headless `research` prompt.
  The web app has **three bounded write exceptions**, none of them authorship: (1) it may
  append a `<!-- review:B -->` block to the ledger's Review log region, transcribing the human's own
  typed words as the durable receipt every verdict cites; (2) it may write a verbatim,
  provenance-headed input file into `02 Research/_inbox/` (the always-open door, "Fed-in input" below);
  and (3) its loop controller may append the `<!-- review:B:done -->` marker that closes a
  pure-duplicate review batch (definition in the review protocol), bookkeeping where the first two are
  transcription. None may ever write a render, a decision, or any machine section. The recorder reads the review
  block and re-renders; the human never edits a projection in place. Full mechanics in "The review
  protocol" and "Fed-in input (the always-open door)" below.

### Fed-in input (the always-open door)

A project accepts new text at any stage, including build. The app may write a verbatim,
provenance-headed input file into `02 Research/_inbox/` (its **second** bounded vault write, the same
transcription spirit as the review block: the app transcribes, it never authors) and start the loop.
The next round's intake reads that file, moves it into the sweep file it feeds with a provenance note,
and sorts what it says into the ledger, exactly as any fed-in data is handled. Every human submission is
just another brief ([[0036 one-continuous-cycle]]): the text sorts into the ledger and research runs
again, whether it arrives at debrief, mid-loop, or during build.

### What's Worth Building v2: the single review surface ([[0035 wwb-is-the-single-review-surface]])

`What's Worth Building.md` is where the human comes in: everything needing her ruling funnels here so
she never has to read the ledger, `Decisions/`, or the research docs (those stay click-through
receipts). It is a **render** of `Decisions/` (verdicts) plus the ledger (evidence), recompiled every
round, never hand-authored. Top matter: frontmatter (`type` / `stage` / `date` / `round`) and one
summary line, `Awaiting you: P to triage, Q questions, K parked calls` (P proposed candidates, Q open
questions, K live parked 🔴 calls; the same three that sum to `review R` on the status line). There is
no v1 warning banner: that convention is dead.

Eight `##` sections in three tiers, in this reading order:

**Tier 1, needs your ruling.**
- `## Parked decisions`: one entry per live 🔴, rendered from the `proposed` 🔴 decisions research
  writes (framing-departure, directions-pick, route-call). Each entry carries the candidate text
  **verbatim** (its both-sides material and reframe-test legs intact), a `supersedes_if_taken:` target,
  a `blocks:` line, and receipts. A decision only the human can make.
- `## Questions for you`: rendered straight from the research-exhausted L-entries' `ask:` fields plus
  their receipts. No separate agenda file or section exists anywhere; this section is it.
- `## Proposed`: untriaged `build`-lean candidates (each an `### W<N>: <title>` entry with receipts
  and ASSUMPTION marks), awaiting a triage ruling.

**Tier 2, standing rulings.**
- `## Build now`: **human-confirmed ONLY**, the single section downstream (`structure`,
  `design-system`, `build`) consumes. Each entry carries `ruled_by:` (the review batch + the recorder
  dispositions decision) and `in_their_words:` (the human's verbatim ruling).
- `## Backlog`: ruled-but-parked candidates, each with an `unblocks:` line. Supersedable; nothing
  locks.
- `## Don't build`: human-ruled rejections PLUS research's `dont-build`-lean proposals, each
  source-marked (`decided-by-human` or `proposed-by-AI`); a re-ruling can resurrect any of them.

**Tier 3, context.**
- `## Implied but unruled`: the full-vision confrontation the framing honestly implies, rebuilt every
  round.
- `## Open unknowns blocking a verdict`: the open ledger unknowns a verdict waits on.

**Entry markup (so the render parses deterministically).** A candidate is an H3 `### W<N>: <title>`
under Proposed / Build now / Backlog / Don't build, carrying its `lean`, receipts, and marks as
labeled lines; Build now adds `ruled_by:` and `in_their_words:`, Backlog adds `unblocks:`. A question
is an H3 `### L<N>: <ask>` under Questions for you. A parked decision is an H3 naming its decision id
under Parked decisions. W-ids are the sticky identity from the recommendation's Candidates table
(decision-log section above).

**Plain language in Tier 1 (hard rule).** Everything under Parked decisions, Questions for you, and
Proposed is written so a client could read it cold: everyday words, short sentences, what it means
and what happens if you take or reject it. No research vocabulary in the prose (refuted,
presupposition, reframe test, grades); that precision lives in the decision files, the ledger, and
the receipts, one click away. The labeled lines and receipt formats above stay exactly as specified
(they are parse targets, and the canvas renders them as friendly text); the rule governs the prose
between them. A Tier 1 entry a layperson cannot follow is a defect of the render, not a style
preference.

**Disposition resolution.** The newest review-batch recorder decision naming a W-id wins. An untriaged
candidate renders by its `lean` (a `build`-lean candidate under Proposed, a `dont-build`-lean one under
Don't build, source-marked `proposed-by-AI`); nothing silently promotes to Build now. A ruled entry
whose cited `L`-ids later retired or downgraded gets a mechanical **"confirmed, evidence moved:
re-rule"** flag (the evidence-moved cross-check against the ledger, run at recompile).

### The review protocol ([[0035 wwb-is-the-single-review-surface]])

How a human ruling gets from the review surface into `Decisions/` and back out as a render, without
ever letting a machine invent her verdict.

**The Review log region.** The ledger gains an append-only `## Review log` region, a sibling of the
round log, preserved verbatim across every wholesale rewrite of the ledger. It holds both legacy
`<!-- answers:B -->` answer batches and the new `<!-- review:B:begin -->` … `<!-- review:B:end -->`
review blocks. `B` is monotonic across both kinds. A review block's contents: date, reviewer, then
three machine-parseable lists:
- `<!-- dispositions -->`: one line per triaged candidate, `- W1: build-now, "her words"` (optional
  `unblocks:` on a backlog ruling).
- `<!-- rulings -->`: one line per 🔴 ruled, naming the target (framing / directions / route), the
  disposition, her words, and the supersede target.
- `<!-- answers -->`: one line per answered question, `- L7: "..."`. Once the recorder ingests a
block it appends `<!-- review:B:done -->` right after the block's end marker; a block with no done
marker (persisted while another run was live) is a queued batch. At loop entry the controller drains
the queue oldest-first: a pure duplicate closes on the spot with no spawn ("Pure duplicates" below),
and every batch still open after that sweep goes to ONE recorder invocation, before any research round
starts.

Each block also stamps the WWB `round` and the entry-set hash it reviewed (the stale-review guard).

**Pure duplicates close without a recorder** ([[0038 the-loop-survives-restarts-and-shows-its-work]]).
A queued batch is a pure duplicate only when its block carries dispositions alone (no answers, no typed
words, no reshape) and every verdict in it matches the newest recorded verdict for that same W id. Such
a batch says nothing new, so the controller appends its `<!-- review:B:done -->` marker itself and
never spawns for it. That marker append is the app's third bounded vault write, bookkeeping beside the
two transcription writes, and it may never grow past the one marker line. A batch carrying an answer,
typed words, an unknown W id, or a differing verdict always gets the recorder.

**The review block, a bounded app-write.** The web app may append a review block to the Review log
region and nothing else. It transcribes the human's own typed words; it is the durable receipt every
verdict cites. (The app's other bounded write is the fed-in input file, "Fed-in input (the always-open
door)" above.) The interactive Claude-session path (the two-turn 🔴 ritual) is unchanged and needs no
block.

**The recorder.** `design-studio-debrief`'s review-ingestion mode (its own numbered section in that
skill), headless-runnable. The controller spawns it with one or more authorized batch ids, each with
its block's content hash, passed **out of band** (process args, never via the vault); the recorder
takes the batches oldest first and completes each one, steps 1 through 6 and its fence, before opening
the next, so a crash mid-list leaves every earlier batch fully committed. Per batch it:
1. Reads block `B`. **Stale-review guard first, judged PER ENTRY:** a stamped round or
   entry-set hash that no longer matches the live WWB means the page moved and triggers a per-entry
   check, never a batch rejection. An entry is stale only when its own content changed since the
   stamp; exactly those entries are **rejected and re-surfaced**. An unchanged entry's click applies
   even when the rest of the page advanced. The block is marked done either way (done means
   processed; rejection is a processing outcome).
2. Writes ONE **dispositions decision** for the batch (`status: decided`, `authored_by: user`,
   `review_batch: B`, citing the block, quoting her per entry under **In their words.**).
3. Writes one **verdict decision** per 🔴 ruled (framing supersession, directions pick, route call),
   same `review_batch: B`, citing the same block, her verbatim words.
4. **Folds the answers** into the ledger (the existing ingestion: resolve the unknown to `answered`,
   mint knowns, spawn child unknowns with lineage).
5. **Re-renders** What's Worth Building and the register.
6. Writes the **status line LAST** as the fence: always `debrief: ingested: batch B`, whatever the
   batch contained (verdicts-only included).

**Bounded, and idempotent.** The recorder may ONLY: write decisions that cite the authorized block,
fold that block's answers, re-render, and fence. It may never invent a verdict; a ruling absent from
the block does not exist. A re-run is idempotent: skip any decision already carrying `review_batch: B`.

**Loop interplay.** The app persists a review block immediately, even mid-round, but the recorder is
gated behind the loop's single-flight lock (queued until the loop settles at a terminal state). The
controller also picks up unfinished work when the server starts
([[0038 the-loop-survives-restarts-and-shows-its-work]]): a queued batch, or an `ingested` or
`researching` fence a dead run left behind, resumes on its own; terminal fences never auto-resume, and
a still-live spawn from an old run blocks resume until it exits (one writer at a time). The
controller ALWAYS chains a fresh research invocation after a clean `debrief: ingested` fence, whatever
the batch contained ([[0036 one-continuous-cycle]]): a verdicts-only batch that adds no answers simply
converges again in one cheap round, since exhausted questions are not re-attempted. Review ingestion is
a human-cycle boundary: the round counter and `U_max` reset. Partial reviews are first-class: an
untriaged candidate stays Proposed, an unanswered question stays exhausted.

### Headless-verdict law (the integrity fence, amended)

A headless spawn NEVER writes a human's verdict on its own authority. The one amendment: a headless
spawn may write `authored_by: user` / `status: decided` **only** through the review-ingestion recorder,
and only when the decision's FRONTMATTER carries `review_batch: B` for the batch id the controller
authorized, the cited review block exists and is **unaltered** (its content hash matches what the
controller captured at write time), and the decision's In-their-words span occurs **literally** inside
that block. Everything else quarantines, loudly.

**What counts as the human's span (a click is a verdict too).** When the human typed words, the
recorder quotes them and those words are the span. When the human only clicked (a candidate verdict,
or an accept/reject ruling on a fully-written parked call), the block's own line for that action IS
the span: the app transcribed the click verbatim and timestamped it, so the recorder quotes that line
and marks it honestly ("chosen by click; no words typed") under **In their words.** A `reshape` ruling
changes content, so it always requires typed words that are not the candidate text; word-less
reshapes are refused at the route, and the recorder never invents them.

Both validators enforce this with ONE shared predicate, scoped to **frontmatter**: the runner's
`quarantineHeadlessVerdicts` and `receipt-verify.mjs`. A decision "claims a human verdict" iff its
frontmatter has `authored_by: user` or `status: decided` (a body mention of "decided" never trips it,
which fixes the old whole-file-regex divergence). In a plain research-round window (no batch
authorized) any such claim is quarantined. In the recorder's window (`--review B`, batch B authorized)
a claim is clean only when it carries `review_batch: B` and its quoted span is inside block B; anything
else quarantines.

Every 🔴 the loop reaches headlessly (a framing lock, a framing departure that passes the ported
reframe test, a directions pick, a route call) is still a **park**, not a self-made decision: the loop
writes a `proposed` 🔴 decision that renders into What's Worth Building's Parked decisions section (the
park clause in the 🔴 ritual above), and the verdict waits for the human's own words, carried back
through the recorder or the interactive ritual.

## The pipeline (5 stages)

**Understand is one loop, not two sequential stages** ([[0020
understand-is-one-loop-reframe-and-scope-fold]]). `debrief` (client/team conversation) and
`research` (evidence) are its two poles. Between them sits **one ledger**, `Knowns & Unknowns.md`:
debrief seeds it, and the seed chains straight into research with no approval gate between them
([[0036 one-continuous-cycle]]); research runs headless rounds over it attempting every open unknown
until the loop provably runs dry (the first stop is two dry rounds), and the questions research could
not answer become What's Worth Building's Questions
for you tier that debrief carries to the team. The loop is an **exhaustion engine** now, not a
two-party chat with a question list drafted up front ([[0034 understand-loop-is-an-exhaustion-engine]]); its full law is "The Understand loop state
machine" above. Reframes and honest full scope are *outcomes the loop produces*, not stages: a
research round whose framing check finds the evidence *departs* the debrief framing never decides that
itself; it records a `proposed` parked decision and keeps looping, and the departure routes back through
debrief's convergence loop to supersede the framing decision with the team's own words. The full-vision confrontation lives in `What's Worth Building.md`
(its *Implied but unruled* section), rebuilt every round rather than confronted once at a stage nobody
always reached.

**Nothing locks before production** ([[0023 nothing-locks-before-production]]). There is no commit
ceremony between the loop and build: the only real lock is shipped production code, so
`What's Worth Building.md` is always a living render, never a settled state, and moving on to
`structure`/`design-system`/`build` is the user deciding attention moves, reversible and recorded,
nothing more. `explore-directions` and `converge` are gone: directions became a **move inside
research** ([[0021 directions-fold-into-the-loop]]), and the register gate lives **only at build's
door**. **Validate is gone too** ([[0027 validate-dissolves-6-stages]]): testing the built thing
against the success criteria is research's **evaluate** move (users, or a Nielsen/walkthrough/a11y
expert review), the log-vs-reality check is its **reconcile** move (writing `Drift Ledger.md`), the
visual-drift diff moved into build's round-closing checklist where drift happens, and the supersede
back-edge (any finding from anywhere supersedes the decision it invalidates) is **universal law, not a
stage**. **Bones before skin**: `structure` ([[0024 structure-stage-flows-and-ia]]) drafts user flows
+ IA from the accepted recommendation so the visual language and the build are made for a known
structure.

**The pipeline ends at build** ([[0028 compile-spec-is-a-render-utility]]). `compile-spec` is **not a
terminal stage**: it is an **on-demand render utility**, invocable at any moment to shape the record
for an audience (an early align one-pager, a why-first stakeholder spec, an eng-handoff, the pre-build
PRD). A document is a projection of the decision log, not a milestone; the work ends at the built
thing, and the handoff is a render you ask for. Its law is unchanged (a render of the log, never a
second authored document), and `What's Worth Building.md` stays the living client-facing state that
compile-spec supplies audience-shaped projections of.

| Phase | Skill | Autonomy |
|---|---|---|
| Understand | `design-studio-debrief` | 🟡→🔴 (framing lock + route call); seeds the ledger (unknowns + load-bearing knowns, no client questions drafted) which chains straight into research with no gate, and ingests answer batches back into it |
|  | `design-studio-research` | 🟢 loop engine, 🔴 for the directions-move pick and a mid-loop framing departure (each recorded as a `proposed` parked decision the loop continues past, [[0036 one-continuous-cycle]], never a self-made verdict): runs headless rounds over the ledger, attempting every open unknown until per-question exhaustion (M-latch) and loop convergence (K dry-streak, the first stop; C round cap) terminate it; mints receipted Knowns, spawns child unknowns, recompiles `What's Worth Building.md` + `Assumptions & Risks.md` each round; owns the risk register; forced framing-check + migration-flag + standing primary-contact line + wiki trap-check every round; on-demand **evaluate** and **reconcile** (writing `Drift Ledger.md`) moves |
| Build | `design-studio-structure` | 🟡 (user flows + IA from the accepted recommendation + What's Worth Building.md) |
|  | `design-studio-design-system` | 🟡 + gate (lint + user sign-off) |
|  | `design-studio-build` | 🟢, runs in rounds (specs → parallel agents → Canvas review → the four gates close each round; the exported Canvas feedback is the next round's specs); gates: states/edge/a11y + content + DESIGN.md consistency & drift (owned design:diff vs the signed-off ref) + register — the pipeline's only register gate |

Any stage may loop back; loop-backs are recorded as superseded decisions.

**Utility skills (not pipeline stages):** `design-studio-setup` — first-run onboarding: vault
pointer, scaffold, starter wiki (🟡, once per machine); `design-studio-harvest` — the only writer
of the Studio Wiki (🟡 draft + 🔴 crossing review; agent-initiated per
[[0030 utilities-push-dont-pull]]); `design-studio-wiki-lint` — wiki health check
(🟢, report-first; mechanical pass self-triggers per [[0030 utilities-push-dont-pull]]);
`design-studio-compile-spec` — on-demand render of the decision log into an
audience-shaped document (🟢; modes: align / stakeholder / eng-handoff; the pre-build PRD is this,
invoked after design-system), invocable at any moment, not a stage ([[0028 compile-spec-is-a-render-utility]]).
