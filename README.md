# Design Studio Skills

Design Studio is a complete product-design process, from a messy brief all the way to a working
prototype, packaged as installable [Claude Code](https://claude.com/claude-code)
[skills](https://docs.claude.com/en/docs/claude-code/skills). Five stages carry the work. AI does
the heavy lifting; the decisions that matter stop and wait for you. A web dashboard, the Canvas,
shows each project as one board. And everything the process produces is plain markdown in an
[Obsidian](https://obsidian.md) vault: the files on disk are the project, for the skills and the
dashboard alike. What each project teaches gets saved into a studio-wide wiki, so the next project
starts smarter.

## The pipeline

The skills are meant to run roughly in order, though several can be used on demand:

| # | Skill | What it does |
|---|-------|--------------|
| 1 | `design-studio-debrief` | Reads the brief and restates it as the problem to solve, not the task as handed over. Surfaces the choices hidden in the wording, sets up the project folder, and starts `Knowns & Unknowns.md`: the running list of what we know and what we still don't. This is also where you meet the client and feed their answers back in. |
| 2 | `design-studio-research` | Runs itself, round after round. Every open question gets attempted every round, and every answer carries a quote plus a link to where it came from. Each round rewrites `What's Worth Building.md`, the one place you review: the calls only you can make, the questions only you can answer, and the build ideas to sort with Accept, Backlog, or Don't build. It stops when two rounds in a row add nothing new. It never makes the big calls for you. |
| 3 | `design-studio-structure` | Creates the prototype repo as a clickable skeleton: one stub page per screen, wired with real links, drawn from what you accepted. You walk the flows instead of reading them, and build fills the same repo in. |
| 4 | `design-studio-design-system` | Writes the visual rules into one linted `DESIGN.md`: the exact colors, type, and spacing, plus the reasoning behind them. Pulled from the client's brand when there is one, or picked from rendered sample boards when there isn't. |
| 5 | `design-studio-build` | Builds the clickable prototype in rounds. Each feature starts from a short written spec, and every screen is built against `DESIGN.md`. Each round closes with checks: empty, loading, and error states; edge cases; accessibility; real content instead of placeholders; and a drift check against the signed-off `DESIGN.md`. The pipeline ends here. |

Five utility skills sit outside the numbered pipeline. `design-studio-setup` is the first-run
onboarding. `design-studio-compile-spec` turns the decision log into a document shaped for whoever
is reading it: a one-pager for stakeholders, a handoff for engineers, or the pre-build PRD. Run it
whenever you need one. `design-studio-design-md` safely changes or checks a `DESIGN.md` in any
repo: it lints the file, re-exports the tokens so code stays in sync, and diffs against the last
signed-off version. It also runs as the design-impact review whenever app work adds or reshapes a
shared visual rule. `design-studio-harvest` and `design-studio-wiki-lint` care for the wiki (see
*Studio memory* below).

`design-studio-shared/CONVENTIONS.md` is shared reference material every skill reads first. It is
not a skill itself. Leave it in place alongside the others.

The visual-language stage uses the [design.md format](https://github.com/google-labs-code/design.md)
from Google Labs: the design tokens in the front matter, the reasoning in prose, one file AI can
read. `design-studio-design-system` writes and lints it, color contrast included, straight at the
prototype repo's root (the repo exists from the structure stage on), so every screen and every
parallel build agent draws from the same rules, and build's closing checks diff it against the
signed-off version to catch drift.

## How a project runs

- **One continuous cycle.** Give it a brief and the rest is automatic: the brief is sorted into
  `Knowns & Unknowns.md` and research starts. A hard call along the way (a change of framing, a
  direction to pick) gets parked for you without stopping the rounds. You review everything in
  What's Worth Building, and anything you record there (an answer, a verdict, more input at any
  stage, including build) is sorted in and research runs again. The first stop is two rounds with
  no progress.
- **Two routes.** `debrief` proposes one based on how ambiguous the brief is. **Full** is the whole
  pipeline, for meaty, new problems. **Lite** is a short understanding pass straight to `build`,
  adding `design-system` when the look matters and `structure` when the flows aren't obvious. For
  routine, well-scoped work.
- **You own the hard calls.** Every skill carries a mark for how much it does on its own:
  🟢 it just does it, 🟡 it drafts and you edit, 🔴 it lays out the evidence, asks the question,
  and stops. It never supplies the verdict.
- **Everything lands in your vault.** Each project gets a dashboard, a decision log where nothing
  is deleted (a reversed decision stays visible, marked superseded), the research files, a
  `DESIGN.md` that moves into the prototype repo when build starts, and a `Harvest.md` inbox that
  feeds the Studio Wiki. The skills write the vault; the dashboard reads it.
- **The prototype is a separate code repo, born at the structure stage.** The skeleton appears at ~/dev/<project>-prototype the moment you press Create structure, and the project dashboard links to it.
- **Want the wiring?** [`ARCHITECTURE.md`](ARCHITECTURE.md) maps where every file lives, how the
  skills communicate (entirely through markdown on disk, nothing calls anything), and the rules
  that hold it together.

## Studio memory

What one project teaches, the next project should get for free. Beside the projects lives a
**`Studio Wiki/`**: a knowledge base the AI maintains and you review, collecting what projects
teach. Patterns that worked, traps to avoid, ideas that didn't fit anywhere, standards, taste.
Projects read it freely: `debrief` checks for precedents, `research` pulls patterns and checks the
known traps against the decisions piling up, `design-system` pulls craft. Writing is another
matter: the wiki is written only through a reviewed harvest, so one client's work never leaks into
another's.

| Skill | What it does |
|---|---|
| `design-studio-harvest` | The wiki's only writer. It distills a finished project into pages with the client details stripped out, and you review every page before it crosses. It can also seed an empty wiki: starter pages, a backfill of up to 3 past projects, or pages derived from an existing product. |
| `design-studio-wiki-lint` | A health check: contradictions, orphan pages, stale claims, aging ideas, projects that finished without a harvest. Run it weekly-ish. |

A **starter wiki** ships in `skills/design-studio-shared/starter-wiki/` so the first project has
something to read. General how-to pages only, plus one clearly marked *example* of a taste note
that asks to be deleted once you have your own. Real taste is never shipped. It grows out of your
own projects; that's the point.

## The dashboard

The product includes its own dashboard, **the Canvas**, built with this same pipeline, as proof.
It shows every project as one board: the stages from understanding to build, the decision stream
with its replaced-by trail, the risk register, the design system, and the running prototype in
live device frames.

```sh
cd web && npm install && npm run dev   # http://localhost:3000
```

### Obsidian is the data source

There is no database behind any of this. Every skill reads the vault, writes plain markdown with
YAML front matter, and stops. Whatever is in the vault is the project. The Canvas reads those same
files, finds the vault the same way the skills do (`DESIGN_STUDIO_VAULT` in the environment, else
the `~/.design-studio-vault` pointer), and renders its boards from the very files you open in
Obsidian. It watches the active project's folder, so when a skill writes mid-session, or you edit
a note in Obsidian, the affected card refreshes in place. The app itself writes the vault in
exactly three places: a new project from a brief, your review verdicts, and added evidence. Each
lands in the same markdown the skills read, and each one sets research running again.

The pipeline is defined exactly once, in [`web/src/lib/schema.ts`](web/src/lib/schema.ts): the
stages, the skills, the autonomy marks, and which files each stage produces. The UI renders from
it; nothing hardcodes the pipeline. Every visual value derives from
[`web/DESIGN.md`](web/DESIGN.md).

The big conversations still happen in Claude Code. The Canvas structures the review and records
your verdicts, but the talking stages stay conversations.

## Install

These skills are user-level: they live in `~/.claude/skills/`. Every skill folder must stay a
sibling of the others (they reference `../design-studio-shared/CONVENTIONS.md` by relative path),
so copy the whole set.

```sh
git clone https://github.com/to-be-coder/design-studio.git
cd design-studio
./install.sh
```

(Or open the cloned folder in Claude Code and ask it to install the skills. The repo knows how.)

Then:

1. **Restart Claude Code.** Skills load at session start.
2. Run `/design-studio-setup` once. It finds or creates your vault, writes the pointer every
   skill resolves, and seeds the starter wiki.
3. Bring a brief and run `/design-studio-debrief`.

## Requirements

- Claude Code
- **[Obsidian](https://obsidian.md), recommended.** The workspace is an Obsidian vault: the graph
  view ties projects to the Studio Wiki, and the Dataview community plugin makes the portfolio
  dashboards live. Everything is plain markdown, so a bare folder works too;
  `/design-studio-setup` handles either.
- Node.js, recommended. The `DESIGN.md` tools run on plain Node with no dependencies: the lint
  (`node ~/.claude/skills/design-studio-shared/scripts/design-lint.mjs` in any repo, or
  `npm run design:lint` from this repo's `web/`; it checks structure and color contrast), the
  token export (`design-export.mjs`, `DESIGN.md` to CSS custom properties), and the drift diff
  (`design-diff.mjs`, comparing resolved tokens across versions), plus the component source gate
  (`design-source-lint.mjs`, rejecting color literals that bypass tokens). The skills degrade gracefully
  without it.

## Updating

```sh
cd design-studio
git pull
./install.sh
```

Updates replace the skills only. Your vault, projects and wiki included, is never touched.
User-visible changes are listed in [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
