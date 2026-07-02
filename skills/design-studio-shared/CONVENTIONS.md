# Design Studio — Shared Conventions

Single source of truth for the **design-studio** pipeline. Every `design-studio-*` skill
reads this file first, then does its own job. Change a convention here, nowhere else.

Structure follows researched Obsidian best practice: **few folders by lifecycle, classification
in YAML; one dedicated parent folder for design projects; one subfolder per project (the only deep
nesting); number-prefixed stage files; an immutable ADR decision log.**

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
  01 Brief & Problem.md    ← restated problem, rubric, principle, deviation thesis, success criteria (provisional early)
  02 Research/             ← Company.md / Pain.md / Standards.md / Landscape.md
  03 Scope.md              ← full scope + staged sequence + migration plan
  04 Directions.md         ← directions + data-model comparison
  05 Validation.md         ← prototype test findings
  06 Spec.md               ← stakeholder / eng render of the log (on demand)
  Decisions/               ← ADR log: NNNN <slug>.md, immutable, superseded-not-deleted
  Assumptions & Risks.md   ← living register (verified / partial / unverified / accepted)
  DESIGN.md                ← the visual contract (design.md format); moves to the prototype repo at build
  Harvest.md               ← flag inbox: one-line keepers for the Studio Wiki (project-local until harvest)
  _assets/                 ← attachments scoped to this project (incl. boards/ specimen pages)
```

The **clickable prototype** is a separate code repo, NOT in the vault. `00 Dashboard.md` links to it.

`slug`: lowercase, hyphenated. Folder name = slug. Human-readable name lives in the dashboard YAML.

### Dashboard YAML contract (makes the portfolio queryable, native properties)
```yaml
---
type: design-project
status: active        # active | blocked | done | archived
stage: debrief        # debrief|research|verify|reframe|scope|directions|converge|design-system|build|validate|spec
client:
route: full           # full | lite
started: YYYY-MM-DD
prototype_repo:       # filled when build starts
---
```

---

## Loose coupling — skills run independently (fix #1, #4)

The pipeline is a **default path, not a mandatory ritual.** Every skill must:

1. **Run standalone** — never require the previous skill ran this session; read the vault for state.
2. **Check preconditions, warn, allow override** — if an expected upstream artifact is missing, say
   so and offer to proceed or run the upstream skill first. Never hard-block.
3. **Update `00 Dashboard.md`** before finishing — set `stage`, the recommended next step, and link
   any new artifact. The dashboard is the one place that always answers "where is this project?"
4. **Be skippable** — a small project may run only `debrief → explore-directions → build`. Valid.
   Don't nag about skipped stages.

### Two routes
- **Full** — meaty, ambiguous, net-new problems: the whole pipeline.
- **Lite** — routine/scoped work: `debrief → explore-directions → build → compile-spec`
  (insert `design-system` before `build` whenever the look matters and no client system exists).
  `debrief` proposes the route from how ambiguous the brief is; the user decides.

---

## The 🔴 ritual — never auto-decide a scaffold stage (fix #3)

🔴 skills (`reframe`, `converge`, and the decision moments in `scope-and-sequence` /
`explore-directions`) exist to make **the user** decide. The failure mode: being helpful, the skill
drafts the answer "to save time" — manufacturing a generic point of view, the exact thing this
pipeline exists to prevent.

**Mandatory for every 🔴 moment:**
1. Lay out the structured inputs (evidence, options, costs) fully.
2. Ask the decision question. Then **stop.**
3. **Do NOT write the decision, reframe, spine, or cut yourself.** Wait for the user's actual words.
4. Only after the user commits, record their decision into the log.
5. If the user says "you decide," push back once — surface the trade-off and ask them to choose. If
   they still decline, record `status: proposed` needing sign-off; never silently promote to `decided`.

You may *sharpen* their thinking (name the trade-off, point out a fourth framing). You may not
*supply* the verdict.

---

## Deviations — off-script is legal, and recorded

Gates here check that decisions are deliberate and owned — never which choice was made. So any
rationale gate can be set aside; setting one aside trips a wire: say why, on the record, with
your name on it.

- **Drift** is *unrecorded* divergence — a defect. `validate` treats a bypass with no matching
  decision entry as a finding.
- A **deviation** is the same act *with its decision entry*: an ordinary ADR in `Decisions/`,
  `tags: [decision, deviation]`, `owner` filled, the **Why** naming the rule being set aside.
  Also flag it as one line in `Harvest.md` (capture is free).
- **Tripwire moments** (a closed list — grow it reluctantly): overriding a precondition warning
  to proceed; a knowing token-discipline exception; reshaping a signed-off visual language
  mid-build.
- **Only the user pulls the wire.** A skill never records a deviation to route around a 🔴
  stop. Hard floor-checks (lint, WCAG contrast, states/edge/a11y) are not tripwire-able — you
  don't get to ship a broken focus state.
- Deviations are the studio's R&D: one that **recurs** across projects is a pattern/play
  candidate; one that **fails** (gets superseded) is a trap candidate. `harvest` gathers both.
- An **accepted risk** (`verify`) is a different species — proceeding *without evidence*, not
  *against a rule*. It keeps its own register and is **not** tagged `deviation`.
- Zero deviations on one project is fine. Zero across many projects is a corridor problem
  wearing the mask of discipline — the Wall surfaces the count for exactly this reason.

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
date: YYYY-MM-DD          # use the known current date; never invent one
owner:                    # the accountable approver — whose call this records (not the proposer)
rests_on:                 # [[link]] to the assumption this depends on, if any
relates_to:               # [[links]] to related decisions — lateral edges between entries
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

**Status note.** e.g. "Deferred to v3 until we learn X" / "Superseded by [[0007 ...]] after validation."
```

Edges: `rests_on` points at an *assumption*; a dependency on another *decision* is
`relates_to`; temporal replacement is `supersedes`/`superseded_by`. Both new fields are
optional — existing entries are never rewritten.

### Status semantics
- `proposed` — drafted/awaiting confirmation.
- `decided` — committed.
- `deferred` — deliberately not yet; Status note says what unblocks it.
- `superseded` — replaced. **Never delete a decision** (ADRs are immutable). Set `status: superseded`,
  fill `superseded_by`, link `supersedes` on the new entry. Keeps the real path visible (loop-backs).

---

## DESIGN.md — the visual contract

Every prototype's visual language is codified in a `DESIGN.md` using the
[google-labs-code/design.md](https://github.com/google-labs-code/design.md) format: **design tokens
in YAML front matter** (exact values) plus **rationale in the markdown body** (when and why to apply
them). One file both the user and coding agents read — it is what keeps a prototype consistent,
especially across parallel build agents.

- **Format** (alpha — get the spec before authoring: `npx @google/design.md spec`, or since that's
  broken in v0.3.0, the repo's `docs/spec.md`; trust it over memory): token groups
  `colors` / `typography` / `spacing` / `rounded` / `components`, cross-referenced as
  `{colors.primary}`, state variants (hover/active/disabled) as separate named entries. Component
  sub-tokens are a fixed vocabulary (`backgroundColor`, `textColor`, `typography`, `rounded`,
  `padding`, `size`, `height`, `width` — not arbitrary CSS). Body sections in fixed order:
  Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts.
- **Single copy, moving home.** `design-studio-design-system` authors `<project>/DESIGN.md` in the
  vault — canonical while no repo exists. `build` **moves** it to the prototype repo root as its
  first committed act and leaves a link note in the vault. There is never a second copy to sync.
- **Token discipline.** Prototype UI takes every color / type / spacing / radius value from a token,
  directly or via an export (`npx @google/design.md export --format css-tailwind|json-tailwind|dtcg`).
  A hardcoded value that bypasses the tokens is a defect, not a shortcut.
- **Gates.** `npx @google/design.md lint DESIGN.md` must pass (structure + WCAG contrast) before
  `build` consumes the file. `validate` diffs the build-start version (from the repo's git history)
  against the current file (`npx @google/design.md diff`); drift without a matching decision entry
  is a finding.
- **Changes are decisions.** Additive tokens are normal growth; reshaping the committed language
  supersedes the language decision like any other loop-back.
- No `npx`? Author against the format summary above, hand-check contrast, and say so on the
  dashboard instead of silently skipping the gate.

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
- **Projects never read each other.** Not even "for reference." The only path between projects is
  a deliberately abstracted wiki page. This is what keeps unrelated client work unsmushed — and
  confidential.

### Capture vs distillation — two acts, different costs
- **Capture is free and continuous.** Every project has a `Harvest.md` flag inbox: one-liners with
  context links, zero processing, project-local (the membrane stays intact). Skills auto-flag their
  byproducts — rejected directions, the cut list, validation findings that generalize — and the
  user can flag anything: "that's a keeper."
- **Distillation is deliberate and reviewed (🔴).** At project close (or at milestones on long
  engagements), `harvest` drafts the crossing — new pages, edits, supersedes — de-clientified, and
  the user approves it like a PR. Nothing crosses the membrane any other way.

### Layout
```
<vault>/Studio Wiki/
  CLAUDE.md     ← the wiki's schema file: rules + read protocol for ANY session (ships in starter-wiki)
  _index.md     ← entity view: one line per page (maintained by harvest)
  _plays.md     ← problem-shaped view: plays & traps, matched by problem shape
  _sparks.md    ← the sparks shelf: orphaned ideas, browseable
  log.md        ← append-only, parseable: "## [YYYY-MM-DD] init|harvest|lint|ingest — <source>"
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
entity: pattern      # pattern|play|trap|spark|standard|craft|client|tool|source
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
it applies / Source of truth. Supersede, never overwrite — ADR semantics apply to wiki pages too.

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

## The pipeline (11 skills)

| Stage | Skill | Autonomy |
|---|---|---|
| Understand | `design-studio-debrief` | 🟡→🔴 |
|  | `design-studio-research` | 🟡 |
|  | `design-studio-verify` | 🟡 + gate |
| Decide | `design-studio-reframe` | 🔴 (gate: may conclude "no reframe needed") |
|  | `design-studio-scope-and-sequence` | 🟡→🔴 (gate: existing-user migration) |
|  | `design-studio-explore-directions` | 🟡→🔴 (includes data-model comparison) |
|  | `design-studio-converge` | 🔴 + records |
| Build | `design-studio-design-system` | 🟡 + gate (lint + user sign-off) |
|  | `design-studio-build` | 🟢 (gate: states/edge/a11y + DESIGN.md) |
|  | `design-studio-validate` | 🟡 (users OR expert review; back-edge) |
|  | `design-studio-compile-spec` | 🟢 (modes: align / stakeholder / eng-handoff) |

Any stage may loop back; loop-backs are recorded as superseded decisions.

**Utility skills (not pipeline stages):** `design-studio-setup` — first-run onboarding: vault
pointer, scaffold, starter wiki (🟡, once per machine); `design-studio-harvest` — the only writer
of the Studio Wiki (🟡 draft + 🔴 crossing review); `design-studio-wiki-lint` — wiki health check
(🟢, report-first).
