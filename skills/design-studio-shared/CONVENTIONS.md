# Design Studio — Shared Conventions

Single source of truth for the **design-studio** pipeline. Every `design-studio-*` skill
reads this file first, then does its own job. Change a convention here, nowhere else.

Structure follows researched Obsidian best practice: **few folders by lifecycle, classification
in YAML; one dedicated parent folder for design projects; one subfolder per project (the only deep
nesting); number-prefixed stage files; an immutable ADR decision log.**

---

## The pipeline's grammar — loops, stages, moves ([[0031 loops-are-law]])

The law that shapes everything below. Three shapes, and every skill is exactly one of them — the
stage-by-stage rethink discovered this grammar empirically before it had a name (every ruling from
0016 to 0028 was an instance of it).

- **Loop** — *work that converges with a human in the middle.* Rounds of AI work → artifact →
  human review → sharpen, **closed only by the human** as risk-acceptor. There are two: the
  **Understand loop** (`debrief` ⇄ `research`, `Agreements.md` the ledger between them) and
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
  00 Dashboard.md          ← project home note; YAML below; links every artifact + the repo
  01 Brief & Problem.md    ← restated problem, rubric, principle, success criteria (provisional early)
  Clarifications.md        ← debrief's per-round clarification agenda: open questions (client-friendly
                             phrasing) plus a retired section (question, answer, who, round), never deleted
  02 Research/             ← Company.md / Pain.md / Standards.md / Landscape.md
    _inbox/                ← fed-in data lands here; research's first move each round is to list
                             it, read each item, then move it to where it belongs in 02 Research/
                             with a provenance note (source, date fed in, round) — fed-in data
                             becomes a file before it becomes evidence
  03 Structure.md          ← user flows + information architecture, drafted by design-studio-structure
                             from the accepted recommendation + Agreements.md (fills the retired 03
                             slot; a directions move's data-model sketch lives in the research report,
                             not here). 04 Directions.md and 05 Validation.md are retired — testing
                             folded into research's evaluate move (see [[0027 validate-dissolves-6-stages]]).
  Spec.md                  ← audience-shaped render of the log (on demand; align / eng-handoff
                             modes may write Align.md / Handoff.md beside it)
  Decisions/               ← ADR log: NNNN <slug>.md, immutable, superseded-not-deleted
  Agreements.md            ← living render of the decision log, four sections: Agreed (building now) / Decided
                             against / Deferred (each with what unblocks it) / The full vision (everything the
                             solved problem implies, acknowledged but not yet ruled) — clean one-liners +
                             [[wikilinks]] into Decisions/; sequencing is human-authored and recorded here too
                             (see the Understand-loop section below); refreshed at the close of every debrief
                             round; a RENDER only — never hand-authored, never a second source of truth
  Assumptions & Risks.md   ← living register (verified / partial / unverified / accepted);
                             research's responsibility — sorted every round, pressure-tested on
                             demand; build is the ONE gate (warn-never-block) on an unverified
                             load-bearing assumption — the register gate lives only at build's door
  DESIGN.md                ← the visual contract (design.md format); moves to the prototype repo at build
  Harvest.md               ← flag inbox: one-line keepers for the Studio Wiki (project-local until harvest)
  Drift Ledger.md          ← on-demand: decision-log-vs-shipped-reality reconciliation, written by
                             research's reconcile move ([[0027 validate-dissolves-6-stages]])
  _assets/                 ← attachments scoped to this project (incl. boards/ specimen pages)
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

`stage` above is the enum token only. The dashboard body's **Current stage** line is free prose and
may carry a round sub-state while `debrief` loops with a client (see that skill), e.g.
"debrief — round 2, awaiting meeting" — no schema change, no new enum value.

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
  directly or via the owned export (`web/scripts/design-export.mjs` → CSS custom properties;
  `npm run design:export -- <path>` from `web/`). A hardcoded value that bypasses the tokens is a
  defect, not a shortcut.
- **Lint gate — owned, runnable everywhere.** The zero-dependency `web/scripts/design-lint.mjs`
  (`npm run design:lint -- <path>` from `web/`, or `node web/scripts/design-lint.mjs <path>`) must
  pass before `build` consumes the file: structure (required sections in order, no duplicate
  heading), reference resolution, motion/floor syntax, and WCAG contrast against the declared floors.
  It replaces the old `npx @google/design.md lint`, which was blocked in every live run.
- **Export and drift diff — owned too.** The two other touchpoints run on the same zero-dependency
  toolchain, sharing the lint's parser (`web/scripts/design-md.mjs`). `build`'s token export is
  `web/scripts/design-export.mjs` (`npm run design:export`): `DESIGN.md` → CSS custom properties,
  references resolved, state variants and motion included. `build`'s round-closing drift diff is
  `web/scripts/design-diff.mjs` (`npm run design:diff`): it compares two versions' **resolved**
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

## The pipeline (5 stages)

**Understand is one loop, not two sequential stages** ([[0020
understand-is-one-loop-reframe-and-scope-fold]]). `debrief` (client/team conversation) and
`research` (evidence) are its two poles; `Agreements.md` is the ledger between them — framing locks
with the team, research runs against it, findings return to the team, the agreement updates,
research continues. Reframes and honest full scope are *outcomes the loop produces*, not stages:
a research round whose framing check finds the evidence *departs* the debrief framing never decides
that itself — it routes back through debrief's convergence loop and supersedes the framing decision
with the team's own words; the full-vision confrontation lives in `Agreements.md`, rebuilt every
round rather than confronted once at a stage nobody always reached.

**Nothing locks before production** ([[0023 nothing-locks-before-production]]). There is no commit
ceremony between the loop and build — the only real lock is shipped production code, so `Agreements.md`
is always a living ledger, never a settled state, and moving on to `structure`/`design-system`/`build`
is the user deciding attention moves, reversible and recorded, nothing more. `explore-directions` and
`converge` are gone: directions became a **move inside research** ([[0021 directions-fold-into-the-loop]]),
and the register gate lives **only at build's door**. **Validate is gone too**
([[0027 validate-dissolves-6-stages]]): testing the built thing against the success criteria is
research's **evaluate** move (users, or a Nielsen/walkthrough/a11y expert review), the log-vs-reality
check is its **reconcile** move (→ `Drift Ledger.md`), the visual-drift diff moved into build's
round-closing checklist where drift happens, and the supersede back-edge — any finding from anywhere
supersedes the decision it invalidates — is **universal law, not a stage**. **Bones before skin**:
`structure` ([[0024 structure-stage-flows-and-ia]]) drafts user flows + IA from the accepted
recommendation so the visual language and the build are made for a known structure.

**The pipeline ends at build** ([[0028 compile-spec-is-a-render-utility]]). `compile-spec` is **not a
terminal stage** — it is an **on-demand render utility**, invocable at any moment to shape the record
for an audience (an early align one-pager, a why-first stakeholder spec, an eng-handoff, the pre-build
PRD). A document is a projection of the decision log, not a milestone; the work ends at the built
thing, and the handoff is a render you ask for. Its law is unchanged — a render of the log, never a
second authored document — and `Agreements.md` stays the living client-facing state that compile-spec
supplies audience-shaped projections of.

| Phase | Skill | Autonomy |
|---|---|---|
| Understand | `design-studio-debrief` | 🟡→🔴 (framing lock + route call) |
|  | `design-studio-research` | 🟡 (🔴 for the directions-move pick); owns the risk register; forced framing-check + migration-flag + standing primary-contact line + wiki trap-check every report; on-demand **evaluate** (test the prototype — users or expert review) and **reconcile** (log vs. shipped reality → `Drift Ledger.md`) moves |
| Build | `design-studio-structure` | 🟡 (user flows + IA from the accepted recommendation + Agreements.md) |
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
