# How Design Studio fits together

A map of where every file lives, how the skills talk to each other, and which rules hold the whole
thing up. Read `README.md` first for *what* the pipeline is; this is *how it works*.

The single most important thing to understand: **the skills never call each other.** There is no
runtime, no daemon, no message bus. Every skill reads the vault, does its job, writes markdown, and
tells you what to run next. The vault on disk *is* the state. Everything below follows from that.

---

## The four places things live

| Place | What it is | Written by |
|---|---|---|
| **This repo** | Source of the skills. Nothing here is read at runtime. | You, editing |
| `~/.claude/skills/` | The installed copies Claude Code actually loads at session start. | `./install.sh` |
| **Your vault** | Every project, every decision, the Studio Wiki. The state of the world. | The skills |
| **Prototype repos** | One code repo per project, outside the vault. | `design-studio-build` |

`install.sh` copies each `skills/design-studio-*` folder into `~/.claude/skills/`. It matches by
glob, so a new skill folder needs no installer change. Skills load at session start, which is why
installing requires a **restart of Claude Code**.

`skills/design-studio-shared/` rides along in that same glob but is **not a skill** — it has no
`SKILL.md`, so Claude Code never loads it. It holds `CONVENTIONS.md` and the `starter-wiki/`, and
every skill reaches it by the relative path `../design-studio-shared/CONVENTIONS.md`. That relative
path is why the folders must stay siblings. Copy the whole set or none of it.

So: 10 folders, 9 skills, 5 pipeline stages, 4 utility skills.

---

## Finding your way: the two pointers

Nothing is hardcoded, and nothing is assumed. Skills resolve their way to your work through two
one-line files.

```
~/.design-studio-vault          one line: the absolute path to your vault
   └─ written once by design-studio-setup

<vault>/.design-studio-active   one line: the active project's slug (e.g. acme-rebrand)
   └─ written only by design-studio-debrief
```

Every skill resolves the project in this order: **(1)** a project named in your invocation,
**(2)** `.design-studio-active`, **(3)** ask you. If the vault pointer is missing or stale, the
skill offers to run `design-studio-setup` or accepts a path you state — it never hard-blocks.

The `web/` dashboard resolves the same vault, checking `DESIGN_STUDIO_VAULT` in the environment
first, then falling back to `~/.design-studio-vault`. It opens the vault **read-only** and never
writes to it.

---

## Inside the vault

```
<vault>/
  Home.md                        landing note; links to the two homes below
  .design-studio-active          active project slug (dotfile; Obsidian ignores it)

  Design Studio/                 all projects live here
    _Design Studio.md            portfolio dashboard (Dataview auto-discovers projects)
    <slug>/                      one folder per project — the only deep nesting
      00 Dashboard.md            ← the project's answer to "where is this?"
      01 Brief & Problem.md      restated problem, rubric, principle, success criteria
      02 Research/               Company.md · Pain.md · Standards.md · Landscape.md
      03 Structure.md            user flows + information architecture (drafted by structure)
      Spec.md                    on-demand audience-shaped render (compile-spec; may also write Align.md / Handoff.md)
      Decisions/                 ADR log: `NNNN <slug>.md`, immutable
      Agreements.md              the scoping ledger: Agreed / Decided against / Deferred / The full vision
      Assumptions & Risks.md     living register: verified / partial / unverified / accepted
      DESIGN.md                  the visual contract — until build moves it to the repo
      Harvest.md                 flag inbox: one-liners bound for the wiki
      Drift Ledger.md            on-demand: decision-log-vs-shipped-reality reconciliation (research's reconcile move)
      _assets/                   attachments, Excalidraw sketches, specimen boards/

  Studio Wiki/                   knowledge that outlives any one project
    CLAUDE.md                    the wiki's own schema + read protocol
    _index.md                    entity view — one line per page
    _plays.md                    problem-shaped view — plays & traps
    _sparks.md                   the sparks shelf — orphaned ideas
    log.md                       append-only: "## [date] init|harvest|lint|ingest — source"
    raw/                         immutable source captures (add-only)
    wiki/                        the pages, flat
```

The **clickable prototype is never in the vault.** It's a separate code repo; `00 Dashboard.md`
records its path in the `prototype_repo` frontmatter field.

---

## How the skills communicate

Six channels, all of them files. No skill invokes another.

**1. `CONVENTIONS.md` — the law.** Every skill reads it before doing anything else. It defines the
folder layout, the frontmatter contracts, the decision-log format, the 🔴 ritual, and the wiki
rules. Change a convention there and nowhere else; the skills inherit it.

**2. `00 Dashboard.md` — the state handoff.** Every skill updates it before finishing: the current
`stage`, the recommended next step, and a link to whatever it just produced. It's the one file that
always answers "where is this project?" — for you, for the next skill, and for the dashboard.

```yaml
---
type: design-project      # this is what makes the portfolio queryable
status: active            # active | blocked | done | archived
stage: debrief            # debrief|research|structure|design-system|build
client:
route: full               # full | lite
started: YYYY-MM-DD
prototype_repo:           # filled when build starts
---
```

**3. `Decisions/` — the spine.** Each decision is one immutable file, captured at the moment it's
made and never reconstructed. Status moves `proposed → decided`, or to `deferred`, or to
`superseded` — but a decision is **never deleted**. When a finding invalidates something and you
loop back, the new decision links `supersedes:` and the old one gets `superseded_by:`. The real
path stays visible, loop-backs and all. `compile-spec` reads the whole folder and renders it for
whichever audience needs it.

Only the **main thread** writes decisions — never a sub-agent. Parallel agents would collide on
the monotonic `NNNN` id.

**4. Artifacts — each stage's output.** Downstream skills read them as input, warn when they're
missing, and offer to proceed anyway.

| Stage | Skill | Writes |
|---|---|---|
| 1 | `debrief` | `01 Brief & Problem.md` (+ scaffolds the whole project folder); the conversation pole of the Understand loop |
| 2 | `research` | `02 Research/`, `Assumptions & Risks.md` (owns the register; runs the directions + pressure-test moves on demand; forced framing-check + migration-flag + primary-contact line + trap-check per report); the evidence pole of the Understand loop |
| 3 | `structure` | `03 Structure.md` (user flows + information architecture) |
| 4 | `design-system` | `DESIGN.md` |
| 5 | `build` | *the prototype repo* (outside the vault); round-closing checklist runs the `design:diff` drift check |

The pipeline ends at `build` ([[0028 compile-spec-is-a-render-utility]]). `compile-spec` is a **utility,
not a stage**: on demand it renders the decision log into an audience-shaped document — `Spec.md`,
or `Align.md` / `Handoff.md` — which are therefore **on-demand artifacts**, produced when you ask for a
render, not milestones the project walks through.

Reframes and honest full scope are no longer stages of their own — they're outcomes the
Understand loop produces. `Agreements.md` is the scoping ledger: it's where a reframe's superseded
framing decision, every deferred decision (with what unblocks it), and the full, unscoped vision
all live, refreshed at the close of every debrief round instead of confronted once at a stage
nobody always reached ([[0020 understand-is-one-loop-reframe-and-scope-fold]]).

**5. `DESIGN.md` — the visual contract, single copy.** `design-system` authors it in the vault,
where it stays canonical until a repo exists. `build`'s first committed act is to **move** it to
the prototype repo root, leaving a link note behind. There is never a second copy to drift.
Everything visual in the prototype — every color, type size, spacing step, radius — comes from its
tokens; a hardcoded value is a defect, not a shortcut. `build`'s round-closing checklist diffs the
signed-off (build-start) version out of git history against the current one, and drift without a
matching decision entry is a finding.

**6. `Harvest.md` — the flag inbox.** Skills drop one-liners here as they go: rejected directions,
cut darlings, findings that generalize. You can flag anything too. It's project-local and costs
nothing, which is the point — see the membrane below.

**Handoffs are suggestions, not calls.** Each `SKILL.md` ends with a `## Handoff` line pointing at
the next skill. It tells *you* what to run. Nothing executes automatically.

---

## The two rules that make it work

### The 🔴 ritual — the skill must not supply the verdict

Every skill carries an autonomy level: **🟢 execute** (it does the thing), **🟡 draft** (a first
version you edit), **🔴 scaffold** (it must *not* produce the answer).

At 🔴 moments — the reframe, the spine, the cuts — the skill lays out the evidence, asks the
question, and **stops**. If you say "you decide," it pushes back once; if you still decline, it
records `status: proposed` rather than silently promoting to `decided`. It may sharpen your
thinking — name a trade-off, point out a fourth framing — but it may not hand you a verdict.

This is the whole thesis. A skill that drafts the answer "to save time" isn't saving you anything;
it's substituting the average of everything it has read for your point of view, which was the only
part of the stage with value. A button cannot run a ritual — which is also why the dashboard
renders the pipeline read-only, with nothing to click that would run a skill on your behalf.

### The membrane — one way into the wiki

```
   projects  ──────read──────▶  Studio Wiki
       │                             ▲
       │                             │
       └──▶ Harvest.md ──▶ harvest ──┘   (reviewed, de-clientified, 🔴)

   project ──✗── project        never, not even "for reference"
```

**Projects read the wiki freely.** `debrief` checks precedents, `research` checks existing standards,
pulls patterns and unprompted sparks in its directions move, and checks traps against the
accumulating decisions; `design-system` pulls craft.

**The wiki is written only through `design-studio-harvest`** — a reviewed distillation you approve
like a PR. (Two mechanical exceptions, neither crossing project material: `setup` seeds the shipped
starter pages, `wiki-lint` applies approved mechanical fixes.)

**Projects never read each other.** The only path between two projects is a deliberately abstracted
wiki page. That single rule is doing two jobs at once: unrelated client work can't bleed together,
and a lesson only becomes studio knowledge after a human strips it of particulars. Projects are case
files; the wiki is case law.

The economics follow: **capture is free and continuous** (`Harvest.md`, one-liners, zero
processing), **distillation is deliberate and reviewed**. `wiki-lint` then keeps the thing alive —
contradictions, orphans, stale claims, sparks aging out, and *harvest debt* (finished projects with
undistilled flags).

---

## The dashboard

```sh
cd web && npm install && npm run dev   # http://localhost:3000
```

It reads your vault read-only and renders what the skills wrote: the portfolio index, and per
project the Canvas — the Understand → Build spine, the Decision Stream (a standalone section,
consolidating the whole log) with its supersede chains, the assumption graph, design-system and
component boards, and the running prototype in same-origin device frames.

Two invariants a contributor must not break:

- **The pipeline is defined exactly once**, in `web/src/lib/schema.ts` — stages, skills, autonomy,
  the runnable flag, and the stage→artifact map. Every screen renders from it. Adding a stage means
  editing that file and nothing else.
- **Every visual value derives from `web/DESIGN.md`.** The tokens in `web/src/app/globals.css` come
  from it, never the other way round. A raw hex or `oklch()` literal in a component is a defect.

After any change under `web/`, both `npx tsc --noEmit` and `npm run build` must pass. CI runs both.

---

## Invariants worth knowing

- **Loose coupling.** Every skill runs standalone. None requires that the previous one ran this
  session — they read the vault for state. Missing upstream artifact? Warn, offer to proceed or to
  run the upstream skill. **Never hard-block.**
- **Skippable by design.** A small project may run only `debrief → research → build`. That's the
  **Lite** route (a short Understand loop → `build` → `compile-spec`, inserting `design-system` when
  the look matters and `structure` when the flows aren't obvious). `debrief` proposes Full or Lite
  from how ambiguous the brief is; you decide which stages to keep. Nothing nags about skipped stages.
- **Any stage may loop back.** Loop-backs are recorded as superseded decisions, never as edits.
- **Single writers.** Decisions: main thread only. The wiki: `harvest` only.
- **Supersede, never overwrite.** True of decisions and of wiki pages alike.
- **Native markdown throughout.** YAML frontmatter properties, not Dataview inline fields. Dataview
  blocks are included where useful but degrade gracefully when the plugin is absent. A bare folder
  works; Obsidian just makes it better.
- **Updates never touch your vault.** `git pull && ./install.sh` replaces the skills only.

---

## Where to read next

| File | What it holds |
|---|---|
| `README.md` | The user-facing story and the install steps |
| `skills/design-studio-shared/CONVENTIONS.md` | The law every skill reads first |
| `skills/design-studio-shared/starter-wiki/CLAUDE.md` | The wiki's own schema |
| `web/README.md` | The dashboard |
| `web/src/lib/schema.ts` | The pipeline, defined once |
| `CHANGELOG.md` | Release history |
