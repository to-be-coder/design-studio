# Design Studio Skills

A spec-first product-design pipeline for [Claude Code](https://claude.com/claude-code), delivered as
a set of installable [skills](https://docs.claude.com/en/docs/claude-code/skills). It takes a design
brief from first framing all the way to a validated, handoff-ready prototype spec — one stage at a
time, with the human in the loop at every hard decision.

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
| 8 | `design-studio-build` | Build the clickable prototype spec-first, with a gate for states, edge cases, and a11y. |
| 9 | `design-studio-validate` | Test the built prototype against the success criteria; loop back if a finding invalidates a decision. |
| — | `design-studio-compile-spec` | Render the decision log into an audience-shaped spec (align / stakeholder / engineering). Use on demand. |

`design-studio-shared/CONVENTIONS.md` is shared reference material every skill reads first. It is not
a skill itself — leave it in place alongside the others.

## Install

These skills are user-level: they live in `~/.claude/skills/`. Every skill folder must stay a sibling
of the others (they reference `../design-studio-shared/CONVENTIONS.md` by relative path), so copy the
whole set.

**Option A — install script (macOS / Linux):**

```sh
git clone https://github.com/<your-username>/design-studio-skills.git
cd design-studio-skills
./install.sh
```

**Option B — manual copy:**

```sh
git clone https://github.com/<your-username>/design-studio-skills.git
cp -R design-studio-skills/skills/design-studio-* ~/.claude/skills/
```

Then restart Claude Code (or start a new session) and the skills appear. Kick things off with:

```
/design-studio-debrief
```

## Requirements

- Claude Code
- The pipeline writes its project workspace into an **Obsidian vault** under a `Design Studio/`
  folder. Any Obsidian vault works; the debrief stage sets up the folder structure on first run.

## Updating

```sh
cd design-studio-skills
git pull
./install.sh
```

## License

Add a license of your choosing (e.g. MIT) before publishing.
