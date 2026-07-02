# Design Studio Skills

A spec-first product-design pipeline for [Claude Code](https://claude.com/claude-code), delivered as
a set of installable [skills](https://docs.claude.com/en/docs/claude-code/skills). It takes a design
brief from first framing all the way to a validated, handoff-ready prototype spec — one stage at a
time, with the human in the loop at every hard decision — and compounds what every project teaches
into a studio-wide wiki.

## The pipeline

The skills are meant to be run roughly in order, though several can be used on demand:

| # | Skill | What it does |
|---|-------|--------------|
| 1 | `design-studio-debrief` | Restate the brief as a *problem*, extract the hidden rubric, set up the project workspace. |
| 2 | `design-studio-research` | Fan out parallel research across the product spine, user pain, prior art, and competitors. |
| 3 | `design-studio-verify` | Adversarially fact-check the single riskiest assumption before committing. |
| 4 | `design-studio-reframe` | Decide whether you're solving the small or the big version of the problem. |
| 5 | `design-studio-scope-and-sequence` | Scope the full vision, then stage it into releases that each ship something real. |
| 6 | `design-studio-explore-directions` | Generate structurally-different directions and compare their true build cost. |
| 7 | `design-studio-converge` | Commit scope: build-deeply / build-lightly / design-only / cut, and record every cut. |
| 8 | `design-studio-design-system` | Codify the visual language into a linted `DESIGN.md` — tokens + rationale — derived from the client's brand or chosen from rendered specimen boards. |
| 9 | `design-studio-build` | Build the clickable prototype spec-first against `DESIGN.md`, with a gate for states, edge cases, and a11y. |
| 10 | `design-studio-validate` | Test the built prototype against the success criteria; loop back if a finding invalidates a decision. |
| — | `design-studio-compile-spec` | Render the decision log into an audience-shaped spec (align / stakeholder / engineering). Use on demand. |

Three utility skills sit outside the numbered pipeline: `design-studio-setup` (first-run
onboarding), and `design-studio-harvest` / `design-studio-wiki-lint` (see *Studio memory* below).

`design-studio-shared/CONVENTIONS.md` is shared reference material every skill reads first. It is not
a skill itself — leave it in place alongside the others.

The visual-language stage uses the [design.md format](https://github.com/google-labs-code/design.md)
from Google Labs: design tokens in YAML front matter plus design rationale in prose, in one
AI-readable file. `design-studio-design-system` authors and lints it (WCAG contrast included),
`design-studio-build` moves it into the prototype repo so every screen — and every parallel build
agent — draws from the same language, and `design-studio-validate` diffs it for drift.

## How a project runs

- **Two routes.** `debrief` proposes one from how ambiguous the brief is: **Full** — the whole
  pipeline, for meaty, net-new problems — or **Lite** (`debrief → explore-directions → build →
  compile-spec`, inserting `design-system` when the look matters) for routine, scoped work.
- **The human owns the hard calls.** Every skill carries an autonomy level: 🟢 execute, 🟡 draft
  for your edit, 🔴 scaffold-only. At 🔴 moments — the reframe, the spine, the cuts — the skill
  structures the evidence, asks the question, and stops. It never supplies the verdict.
- **Everything lands in your vault.** Each project gets a dashboard, an immutable ADR decision log
  (superseded, never deleted — loop-backs stay visible), research files, a `DESIGN.md` visual
  contract that moves into the prototype repo when build starts, and a `Harvest.md` flag inbox
  that feeds the Studio Wiki.
- **The prototype is a separate code repo**, built spec-first against `DESIGN.md`; the project
  dashboard links to it.

## Studio memory

The pipeline compounds. Beside the projects lives a **`Studio Wiki/`** — an LLM-maintained
knowledge base (Karpathy's wiki pattern: flat markdown pages, thin indexes, an append-only log,
a periodic lint) that accumulates what projects *teach*: patterns, plays, traps, orphaned ideas,
standards, taste. Projects read it freely — `debrief` checks precedents, `explore-directions`
pulls patterns and sparks, `converge` checks traps, `design-system` pulls craft. It is written
**only** through a reviewed harvest, so unrelated client projects never bleed into each other.

| Skill | What it does |
|---|---|
| `design-studio-harvest` | The wiki's only writer: distills a finished project — or seeds an empty wiki (starter pages / backfill up to 3 past projects / derive from an existing product) — into de-clientified pages you review before anything crosses. |
| `design-studio-wiki-lint` | Health check: contradictions, orphans, stale claims, aging sparks, harvest debt. Run it weekly-ish. |

A **starter wiki** ships in `skills/design-studio-shared/starter-wiki/` so day-one reaches return
something — mechanism- and process-class pages only, plus one clearly-marked taste *example* card
that asks to be deleted once your own exists. Real taste is never shipped — it's grown from your
own projects; that's the point.

## Install

These skills are user-level: they live in `~/.claude/skills/`. Every skill folder must stay a sibling
of the others (they reference `../design-studio-shared/CONVENTIONS.md` by relative path), so copy the
whole set.

```sh
git clone https://github.com/<your-username>/design-studio.git
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
- Node.js — `npx @google/design.md` lints `DESIGN.md` (structure + WCAG contrast), diffs versions,
  and exports tokens (Tailwind / DTCG). Recommended; the skills degrade gracefully without it.

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
