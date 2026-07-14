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
| 1 | `design-studio-debrief` | Restate the brief as a *problem*, extract the hidden rubric, set up the project workspace. Client/team pole of the Understand loop. |
| 2 | `design-studio-research` | Fan out parallel research across the product spine, user pain, prior art, and competitors — one orchestrator running named moves, including a **directions** move for hard decisions, a **pressure-test** move to refute a claim, an **evaluate** move to test the prototype against the success criteria (users or expert review), and a **reconcile** move that checks the decision log against shipped reality — and flag whether findings follow, subtract from, or depart the debrief framing. Evidence pole of the Understand loop. |
| 3 | `design-studio-structure` | Draft user flows + information architecture from the accepted recommendation — bones before skin, so design-system and build build against a known structure. |
| 4 | `design-studio-design-system` | Codify the visual language into a linted `DESIGN.md` — tokens + rationale — derived from the client's brand or chosen from rendered specimen boards. |
| 5 | `design-studio-build` | Build the clickable prototype spec-first against `DESIGN.md` and the structure's flows/IA, in rounds — with round-closing gates for states, edge cases, and a11y; real content; DESIGN.md consistency plus the owned `design:diff` drift check against the signed-off ref; and the pipeline's only register gate. The pipeline ends here. |

Four utility skills sit outside the numbered pipeline: `design-studio-setup` (first-run onboarding),
`design-studio-compile-spec` (render the decision log into an audience-shaped spec — align /
stakeholder / engineering; the pre-build PRD is this, invoked after design-system — on demand, at any
point), and `design-studio-harvest` / `design-studio-wiki-lint` (see *Studio memory* below).

`design-studio-shared/CONVENTIONS.md` is shared reference material every skill reads first. It is not
a skill itself — leave it in place alongside the others.

The visual-language stage uses the [design.md format](https://github.com/google-labs-code/design.md)
from Google Labs: design tokens in YAML front matter plus design rationale in prose, in one
AI-readable file. `design-studio-design-system` authors and lints it (WCAG contrast included),
`design-studio-build` moves it into the prototype repo so every screen — and every parallel build
agent — draws from the same language, and build's round-closing checklist diffs it for drift against
the signed-off version.

## How a project runs

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
  that feeds the Studio Wiki.
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

The product includes its own dashboard, **the Canvas** — built through this very pipeline, as
proof. It reads your vault read-only and renders every project as one pannable board: the
Understand → Build spine, the Decision Stream with its supersede chains, the assumption
graph, design-system and component boards, and the running prototype in live device frames.

```sh
cd web && npm install && npm run dev   # http://localhost:3000
```

The pipeline is defined exactly once, in [`web/src/lib/schema.ts`](web/src/lib/schema.ts) —
stages, skills, autonomy, and the stage→artifact map. The UI renders from it; nothing hardcodes
the pipeline. Every visual value derives from [`web/DESIGN.md`](web/DESIGN.md).

The dashboard doesn't run skills for you: the conversational 🔴 stages are rituals, and a button
cannot run a ritual — so the Canvas renders what the skills wrote and leaves running them to
Claude Code.

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
  (`npm run design:lint` / `node web/scripts/design-lint.mjs`, structure + WCAG contrast against the
  declared floors), the token export (`design:export`, `DESIGN.md` → CSS custom properties), and the
  drift diff (`design:diff`, a resolved-token comparison across versions). Recommended; the skills
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
