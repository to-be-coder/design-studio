# Design Studio — Shared Conventions

Single source of truth for the **design-studio** pipeline. Every `design-studio-*` skill
reads this file first, then does its own job. Change a convention here, nowhere else.

Structure follows researched Obsidian best practice: **few folders by lifecycle, classification
in YAML; one dedicated parent folder for design projects; one subfolder per project (the only deep
nesting); number-prefixed stage files; an immutable ADR decision log.**

---

## The vault & the design-projects home

- Vault root: `/Users/topherscoffeeshop/Desktop/hermes/`
- **All design projects live under one parent folder:** `<vault>/Design Studio/`
  (it sits beside the user's other top-level homes — `Notes/`, `Memory/`, `Daily/`, `careerbot/`, `Cron/`).
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

- `Home.md` at the vault root is the **Homepage**-plugin landing note and links here.
- **Bases** (core plugin, Obsidian 1.9+) reads the same `type: design-project` frontmatter — create
  a base filtered `type == "design-project"` with columns `status / stage / client / started`, and a
  second view grouped by `status` for a board. (Replaces the discontinued Projects plugin.)
- **Excalidraw** sketches (flows, wireframes, data-model diagrams) live in each project's `_assets/`.

## Project folder structure

```
<vault>/Design Studio/<slug>/
  00 Dashboard.md          ← project home note; YAML below; links every artifact + the repo
  01 Brief & Problem.md    ← restated problem, rubric, principle, success criteria (provisional early)
  02 Research/             ← Company.md / Pain.md / Standards.md / Landscape.md
  03 Scope.md              ← full scope + staged sequence + migration plan
  04 Directions.md         ← directions + data-model comparison
  05 Validation.md         ← prototype test findings
  06 Spec.md               ← stakeholder / eng render of the log (on demand)
  Decisions/               ← ADR log: NNNN <slug>.md, immutable, superseded-not-deleted
  Assumptions & Risks.md   ← living register (verified / partial / unverified / accepted)
  DESIGN.md                ← the visual contract (design.md format); moves to the prototype repo at build
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

**Status note.** e.g. "Deferred to v3 until we learn X" / "Superseded by [[0007 ...]] after validation."
```

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
