# Design Studio Skills

Design Studio is a personal project that grew into more than one. It's a complete product-design
process, the whole thing, from a messy brief all the way to a working prototype, packaged as
installable [Claude Code](https://claude.com/claude-code)
[skills](https://docs.claude.com/en/docs/claude-code/skills). Five stages carry a brief from first
framing to a validated, clickable prototype, with the human in the loop at every hard decision. A
web dashboard, the Canvas, renders each project as one pannable board. And everything the process
produces lives as plain markdown in an Obsidian vault: the vault is the only data source, for the
skills and the dashboard alike. What every project teaches compounds into a studio-wide wiki.

## The pipeline

The skills are meant to be run roughly in order, though several can be used on demand:

| # | Skill | What it does |
|---|-------|--------------|
| 1 | `design-studio-debrief` | Restate the brief as a *problem*, extract the hidden rubric, set up the project workspace, and seed `Knowns & Unknowns.md` (no question pre-labeled "ask a human"). The human pole of the Understand loop: the framing 🔴 and answer-batch ingestion. |
| 2 | `design-studio-research` | The loop engine: run headless rounds over the ledger, attempting every open unknown per round (desk sweeps, plus **directions** / **pressure-test** / **evaluate** / **reconcile** moves on demand), spawning new unknowns as it answers old ones, until it provably runs dry (dry-streak convergence, round cap, 🔴 parks). Each round recompiles `What's Worth Building.md`, the **single review surface**: parked 🔴 calls, exhausted questions, and candidates to triage (Build now / Backlog / Don't build), a receipt on every reason. You rule there; a recorder transcribes your verdicts into the decision log; downstream stages consume only what you confirmed Build now. |
| 3 | `design-studio-structure` | Draft user flows + information architecture from the accepted recommendation — bones before skin, so design-system and build build against a known structure. |
| 4 | `design-studio-design-system` | Codify the visual language into a linted `DESIGN.md` — tokens + rationale — derived from the client's brand or chosen from rendered specimen boards. |
| 5 | `design-studio-build` | Build the clickable prototype spec-first against `DESIGN.md` and the structure's flows/IA, in rounds — with round-closing gates for states, edge cases, and a11y; real content; DESIGN.md consistency plus the owned `design:diff` drift check against the signed-off ref; and the pipeline's only register gate. The pipeline ends here. |

Five utility skills sit outside the numbered pipeline: `design-studio-setup` (first-run onboarding),
`design-studio-compile-spec` (render the decision log into an audience-shaped spec — align /
stakeholder / engineering; the pre-build PRD is this, invoked after design-system — on demand, at any
point), `design-studio-design-md` (safely amend or validate a `DESIGN.md` in any project — the
amend ritual: lint, token export, drift diff, and the additive-vs-reshape discipline), and
`design-studio-harvest` / `design-studio-wiki-lint` (see *Studio memory* below).

`design-studio-shared/CONVENTIONS.md` is shared reference material every skill reads first. It is not
a skill itself — leave it in place alongside the others.

The visual-language stage uses the [design.md format](https://github.com/google-labs-code/design.md)
from Google Labs: design tokens in YAML front matter plus design rationale in prose, in one
AI-readable file. `design-studio-design-system` authors and lints it (WCAG contrast included),
`design-studio-build` moves it into the prototype repo so every screen — and every parallel build
agent — draws from the same language, and build's round-closing checklist diffs it for drift against
the signed-off version.

## How a project runs

- **One continuous cycle.** Submit a brief and the rest is automatic: it is sorted into
  `Knowns & Unknowns.md`, research starts immediately, and the first stop is two rounds with no
  progress (or the round cap). A 🔴 moment along the way (framing lock or departure, a directions
  pick) is parked as a `proposed` decision without stopping the rounds. You review everything in
  What's Worth Building; anything you submit (answers, verdicts, a new brief at any stage,
  including build) is just another input: sorted into the ledger, and research runs again.
- **Two routes.** `debrief` proposes one from how ambiguous the brief is: **Full** — the whole
  pipeline, for meaty, net-new problems — or **Lite** (a short Understand loop → `build`, inserting
  `design-system` when the look matters and `structure` when the flows aren't obvious, with
  `compile-spec` on demand for a handoff render) for routine, scoped work. Which stages a Lite run
  keeps is a judgment call.
- **The human owns the hard calls.** Every skill carries an autonomy level: 🟢 execute, 🟡 draft
  for your edit, 🔴 scaffold-only. At 🔴 moments — the reframe, the spine, the cuts — the skill
  structures the evidence, asks the question, and stops. It never supplies the verdict.
- **Everything lands in your vault.** Each project gets a dashboard, an immutable ADR decision log
  (superseded, never deleted — loop-backs stay visible), research files, a `DESIGN.md` visual
  contract that moves into the prototype repo when build starts, and a `Harvest.md` flag inbox
  that feeds the Studio Wiki. The vault is the single data source: the skills write it, the
  dashboard reads it.
- **The prototype is a separate code repo**, built spec-first against `DESIGN.md`; the project
  dashboard links to it.
- **Want the wiring?** [`ARCHITECTURE.md`](ARCHITECTURE.md) maps where every file lives, how the
  skills communicate (entirely through markdown on disk — nothing calls anything), and the
  invariants that hold it together.

## Studio memory

The pipeline compounds. Beside the projects lives a **`Studio Wiki/`** — an LLM-maintained
knowledge base (Karpathy's wiki pattern: flat markdown pages, thin indexes, an append-only log,
a periodic lint) that accumulates what projects *teach*: patterns, plays, traps, orphaned ideas,
standards, taste. Projects read it freely — `debrief` checks precedents, `research` pulls patterns
and sparks and checks traps against the accumulating decisions, `design-system` pulls craft. It is
written **only** through a reviewed harvest, so unrelated client projects never bleed into each other.

| Skill | What it does |
|---|---|
| `design-studio-harvest` | The wiki's only writer: distills a finished project — or seeds an empty wiki (starter pages / backfill up to 3 past projects / derive from an existing product) — into de-clientified pages you review before anything crosses. |
| `design-studio-wiki-lint` | Health check: contradictions, orphans, stale claims, aging sparks, harvest debt. Run it weekly-ish. |

A **starter wiki** ships in `skills/design-studio-shared/starter-wiki/` so day-one reaches return
something — mechanism- and process-class pages only, plus one clearly-marked taste *example* card
that asks to be deleted once your own exists. Real taste is never shipped — it's grown from your
own projects; that's the point.

## The dashboard

The product includes its own dashboard, **the Canvas**, built through this very pipeline, as
proof. It renders every project as one pannable board: the Understand → Build spine, the Decision
Stream with its supersede chains, the assumption graph, design-system and component boards, and
the running prototype in live device frames.

```sh
cd web && npm install && npm run dev   # http://localhost:3000
```

### Obsidian is the data source

There is no database behind any of this. Every skill reads the vault, writes plain markdown with
YAML frontmatter, and stops: the vault on disk is the state of the world. The Canvas reads that
same vault, resolving it exactly the way the skills do (`DESIGN_STUDIO_VAULT` in the environment,
falling back to the `~/.design-studio-vault` pointer), parsing the frontmatter, and rendering its
boards from the very files you open in Obsidian. It watches the active project's folder and
streams change events to the browser, so when a skill writes mid-session, or you edit a note in
Obsidian, the affected card refreshes in place. Reading is read-only; the app's only vault writes
are three bounded inputs (a new project from a brief, review verdicts, added evidence), each
dropped into the same markdown the skills consume, and each one chains the research loop so the
cycle keeps moving.

The pipeline is defined exactly once, in [`web/src/lib/schema.ts`](web/src/lib/schema.ts):
stages, skills, autonomy, and the stage→artifact map. The UI renders from it; nothing hardcodes
the pipeline. Every visual value derives from [`web/DESIGN.md`](web/DESIGN.md).

The conversational 🔴 rituals still happen in Claude Code: the Canvas structures the review and
records your verdicts, but a button cannot run a ritual.

## Install

These skills are user-level: they live in `~/.claude/skills/`. Every skill folder must stay a sibling
of the others (they reference `../design-studio-shared/CONVENTIONS.md` by relative path), so copy the
whole set.

```sh
git clone https://github.com/to-be-coder/design-studio.git
cd design-studio
./install.sh
```

(Or open the cloned folder in Claude Code and ask it to install the skills — the repo knows how.)

Then:

1. **Restart Claude Code** — skills load at session start.
2. Run `/design-studio-setup` once. It finds or creates your vault, writes the pointer every
   skill resolves, and seeds the starter wiki.
3. Bring a brief and run `/design-studio-debrief`.

## Requirements

- Claude Code
- **[Obsidian](https://obsidian.md) — recommended; this runs most efficiently with it.** The
  workspace is an Obsidian vault: the graph view ties projects to the Studio Wiki, and the
  Dataview community plugin makes the portfolio dashboards live. Everything is plain markdown, so
  a bare folder works too — `/design-studio-setup` handles either.
- Node.js — the studio's owned, zero-dependency `DESIGN.md` tooling runs on plain Node: the lint
  (`node ~/.claude/skills/design-studio-shared/scripts/design-lint.mjs` in any repo, or
  `npm run design:lint` from this repo's `web/`; structure + WCAG contrast against the declared
  floors), the token export (`design-export.mjs`, `DESIGN.md` → CSS custom properties), and the
  drift diff (`design-diff.mjs`, a resolved-token comparison across versions). Recommended; the skills
  degrade gracefully without it.

## Updating

```sh
cd design-studio
git pull
./install.sh
```

Updates replace the skills only — your vault (projects and wiki) is never touched. User-visible
changes are listed in [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
