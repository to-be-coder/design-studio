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
| **Prototype repos** | One code repo per project, outside the vault. | `design-studio-structure` scaffolds, `design-studio-build` fills |

`install.sh` copies each `skills/design-studio-*` folder into `~/.claude/skills/`. It matches by
glob, so a new skill folder needs no installer change. Skills load at session start, which is why
installing requires a **restart of Claude Code**.

`skills/design-studio-shared/` rides along in that same glob but is **not a skill** — it has no
`SKILL.md`, so Claude Code never loads it. It holds `CONVENTIONS.md`, the `DESIGN-SPEC.md` format
definition, the `starter-wiki/`, and the owned zero-dependency `DESIGN.md` toolchain in `scripts/`
(lint / source lint / export / diff, installed to `~/.claude/skills/design-studio-shared/scripts/`, so the skills
run it from any repo, not just this one). Every skill reaches it by the relative path
`../design-studio-shared/CONVENTIONS.md`. That relative path is why the folders must stay siblings.
Copy the whole set or none of it.

So: 11 folders, 10 skills, 5 pipeline stages, 5 utility skills.

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
first, then falling back to `~/.design-studio-vault`. It renders what the skills wrote, and it writes
the vault in exactly three bounded places: the review block it appends when you record a verdict or an
answer, the input file it drops into `02 Research/_inbox/` when you add material, and the done marker
its loop controller appends to close a review batch that says nothing new. It never writes a render, a
decision, or any machine section.

---

## Inside the vault

```
<vault>/
  Home.md                        landing note; links to the two homes below
  .design-studio-active          active project slug (dotfile; Obsidian ignores it)

  Design Studio/                 all projects live here
    _Design Studio.md            portfolio dashboard (Dataview auto-discovers projects)
    <slug>/                      one folder per project — the only deep nesting
      00 Dashboard.md            ← the project's answer to "where is this?" (the status line is the loop's commit fence)
      01 Brief & Problem.md      restated problem, rubric, principle, success criteria
      Knowns & Unknowns.md       the ledger: every unknown and known, receipts, round log + review log (the loop's spine)
      02 Research/               Company.md · Pain.md · Standards.md · Landscape.md · Synthesis.md
      Spec.md                    on-demand audience-shaped render (compile-spec; may also write Align.md / Handoff.md)
      Decisions/                 ADR log: `NNNN <slug>.md`, immutable
      What's Worth Building.md   THE review surface: parked 🔴 calls, questions, and candidates to triage
                                 (Build now / Backlog / Don't build), every reason receipted; a render, never hand-authored
      Assumptions & Risks.md     render of the ledger's load-bearing knowns: verified / partial / unverified / accepted
      DESIGN.md                  legacy slot: the visual contract lives at the prototype repo root now
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

The **clickable prototype is never in the vault.** It's a separate code repo, created by the
structure stage at `~/dev/<slug>-prototype` as the clickable skeleton it scaffolds (one static stub
page per screen, wired with real links, plus a `flows.json` manifest; vault decision 0039).
`00 Dashboard.md` records its absolute path in the `prototype_repo` frontmatter field, and
design-system and build work in that same repo from then on. Re-running structure **refreshes** a
still-pristine skeleton (git tree clean, only the scaffold commit, `flows.json` `source: structure`)
by regenerating it from the latest decisions; once design-system or build has touched the repo
(`source: build`, or extra commits) a re-run refuses so their work is never clobbered (vault
decision 0040).

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
prototype_repo:           # absolute path; filled by structure when it scaffolds the skeleton
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
| 1 | `debrief` | `01 Brief & Problem.md` + seeds `Knowns & Unknowns.md` (+ scaffolds the whole project folder); the human pole of the Understand loop: framing 🔴 and answer-batch ingestion |
| 2 | `research` | `02 Research/`, and each round recompiles `What's Worth Building.md` + `Assumptions & Risks.md` from the ledger; the loop engine: attempts every open unknown per round until exhaustion (forced framing-check + migration-flag + primary-contact line + trap-check per report) |
| 3 | `structure` | *the skeleton prototype repo* (stub screens + `flows.json`, at `~/dev/<slug>-prototype`) |
| 4 | `design-system` | `DESIGN.md` + `tokens.css` at the prototype repo root |
| 5 | `build` | *the prototype repo* (outside the vault); round-closing checklist runs the `design:diff` drift check |

The pipeline ends at `build` ([[0028 compile-spec-is-a-render-utility]]). `compile-spec` is a **utility,
not a stage**: on demand it renders the decision log into an audience-shaped document — `Spec.md`,
or `Align.md` / `Handoff.md` — which are therefore **on-demand artifacts**, produced when you ask for a
render, not milestones the project walks through.

Reframes and honest full scope are no longer stages of their own: they're outcomes the
Understand loop produces. The loop itself is an **exhaustion engine**
([[0034 understand-loop-is-an-exhaustion-engine]]): `debrief` seeds `Knowns & Unknowns.md`, and
`research` runs headless rounds over it, attempting every open unknown (no question is pre-labeled
"ask a human") until it provably runs dry; only then do humans get an agenda. The cycle is
continuous ([[0036 one-continuous-cycle]]): creating a project chains the seed straight into the
loop, a 🔴 moment parks a `proposed` decision without stopping the rounds, every review submission
chains a fresh research invocation, and new input (a design brief, notes, feedback, at any stage
including build) drops verbatim into `02 Research/_inbox/` and runs the same cycle. `What's Worth
Building.md` is the **single review surface** ([[0035 wwb-is-the-single-review-surface]]): parked 🔴
calls, the exhausted questions, and every candidate (a sticky `W<N>` id minted in the
recommendation's Candidates table) funnel there, and the human triages each one Build now, Backlog,
or Don't build. A canvas review is persisted verbatim as an anchored block in the ledger's Review
log, then a headless recorder transcribes it into `Decisions/` citing the block (the amended
headless-verdict law: no citation, no verdict). Downstream stages consume only the human-confirmed
Build now set. The full unscoped vision stays confronted every round in Implied but unruled
([[0020 understand-is-one-loop-reframe-and-scope-fold]]).

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
part of the stage with value. A button cannot run a ritual. The dashboard's buttons transcribe: a
click lands verbatim in the ledger's Review log, and a headless recorder carries it into `Decisions/`
under the headless-verdict law (a click is a verdict, vault decision 0037). Nothing on the dashboard
invents a verdict on your behalf.

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
- **Every UI change gets a design-impact classification.** Contract changes update `web/DESIGN.md`
  in the same change through `design-studio-design-md`. Implementation-only changes state which
  existing rule they preserve. `npm run design:check` lints the contract and scans component source
  for token bypasses.

After any change under `web/`, `npm run design:check`, `npx tsc --noEmit`, and `npm run build` must pass.
CI runs all three.

### The loop runtime

The loop controller lives inside the dev server. Three files beside each project's markdown keep it
honest, all dotfiles Obsidian ignores:

- `.loop.lock`: the single-flight lock. One run per project. It holds the controller pid, the current
  spawn's pid, the round, and the start time. Two writers on one ledger is the unforgivable state;
  this file is what prevents it.
- `.loop-progress`: the heartbeat. What is running (a recorder batch or a research round) and since
  when. The banner renders it with elapsed time, and the review page refetches when the fence moves,
  so a twenty-minute spawn looks like work instead of looking broken.
- `.loop-validator.log`: what the post-run validator quarantined and why.

On boot the server checks every project before taking new work: a dead run's stale lock is cleared,
queued review batches and an interrupted `ingested` or `researching` fence resume on their own, and a
project whose old spawn is still alive is left alone until that spawn exits (it may still be writing).
Terminal fences never auto-resume. Draining the queue, the controller closes pure-duplicate batches
itself (the third bounded write: one done marker) and hands everything else to a single recorder
invocation, oldest first; after any clean ingestion it always chains a fresh research invocation. All
of this is vault decision 0038: the files were always right, and the promises now live where a restart
cannot kill them.

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
