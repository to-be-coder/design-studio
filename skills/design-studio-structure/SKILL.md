---
name: design-studio-structure
description: Scaffold the product's bones as a clickable skeleton app, not a document. From the accepted recommendation and What's Worth Building's Build now set, it creates the prototype repo (static stub screens wired with real navigation, one page per screen, states stubbed visibly) plus a flows.json manifest, so you walk the flows instead of reading them. design-system and build work in the same repo from here on. Re-running refreshes a still-pristine skeleton (regenerating it from the latest decisions) and refuses to clobber one build has taken over. 🟡 draft the user edits; supersedable like everything else, since nothing locks before production. Creates ~/dev/<slug>-prototype and writes no vault page. Third stage of the design-studio pipeline.
---

# design-studio-structure

Bones before skin. Once the Understand loop has landed on a recommendation the team accepts, the
next question is not "what does it look like" but "what are the pieces and how do you move between
them": the user flows and the screens they pass through. This skill answers that question with a
thing you can click, not a thing you must read: it creates the prototype repo and fills it with a
static skeleton, one stub page per screen, wired together with real links. Walking the skeleton IS
reading the structure. The visual language (`design-studio-design-system`) then lands on a known
set of screens, and `build` fills in the same repo instead of drawing the map as it goes.

**Read `../design-studio-shared/CONVENTIONS.md` first**, especially "The skeleton contract": the
page conventions, the flows.json schema, and the collision rule live there once. Autonomy: 🟡 (a
draft the user edits; the skeleton proposes, the user reshapes). Per
[[0023 nothing-locks-before-production]] nothing here locks: the skeleton is supersedable, and a
build reality that contradicts it supersedes it.

## When to use
After the Understand loop has produced an **accepted recommendation** (a research recommendation
the user has ruled on: a `decided` decision), before `design-system`. Runs standalone (resolve the
project from `.design-studio-active`) and headless (the canvas's Create structure button spawns it).
On a Lite run the skeleton still earns its place: a few stub pages are cheaper than discovering the
screens mid-build. Come back whenever a later finding reshapes the flows; the skeleton reshapes
with it (build keeps routes and flows.json current once it takes over).

## Preconditions
- Expects the **accepted recommendation** and `What's Worth Building.md`. Read the leading
  recommendation decision in `Decisions/` (the one the user ruled `decided`), What's Worth
  Building's **Build now** section (human-confirmed only), the recorded picks in `Decisions/` (a
  container pick, an arrival-form pick, a full-depth pick shape the screens directly), and any
  directions-move data-model sketch in the research report. If the recommendation is still only
  `proposed`, warn and offer another research round, or proceed from what the user states, naming
  the anchor.
- **Empty Build now?** Warn: no human-confirmed entries; the candidates in What's Worth Building
  want triage first. Warn, never block.
- **Target path check, three ways.** The repo goes to `~/dev/<slug>-prototype` (or the exact path a
  headless spawn passes in). Decide before writing anything:
  1. **Path absent** -> scaffold fresh (the Process below), the normal create path.
  2. **Path present AND a pristine skeleton** -> **refresh it**. Pristine means all three hold: the
     git working tree is clean (`git -C <repo> status --porcelain` empty), there is exactly one
     commit and it is the skeleton scaffold (`git -C <repo> log --oneline` is a single
     `Skeleton scaffold` line), and `<repo>/flows.json`'s `source` is `"structure"`. A pristine
     skeleton is disposable studio scaffolding no later stage has touched, so regenerate every
     skeleton file from the CURRENT inputs (the latest Build now set, all decisions, any fed-in
     starter app), commit `Skeleton re-scaffold`, and keep `source: "structure"`. Leave
     `prototype_repo` as is (it already points here).
  3. **Path present but NOT pristine** (dirty tree, more than the one scaffold commit, or
     `flows.json` `source: "build"`) -> **TOUCH NOTHING**: `source: "build"` means build owns the
     repo, and a dirty tree or extra commits mean real work is in flight. Append one dated plain
     line to `00 Dashboard.md` naming the conflict (for example `- 2026-07-17: structure did not
     run: ~/dev/forma-prototype has work in it (source build / uncommitted changes); refresh would
     clobber it, so nothing was touched`) and stop. Re-scaffolding a repo build owns is the user's
     explicit call (they move it aside or point `prototype_repo` at a fresh path).

## Process

1. **Gather the inputs.** The accepted recommendation and its assumptions, the **Build now** scope
   (human-confirmed only), the recorded picks, the as-is journey / provisional persona carried in
   the research report, and any data-model sketch from a directions move. Pull the Studio Wiki too:
   `applies: mechanism` pattern/play pages for flows and IA that already solved this problem shape;
   cite and reuse rather than re-derive.

2. **Draft the core task flows** (🟡). For each core journey the confirmed set implies, map the
   steps a user actually takes: entry point, the decisions and actions along the way, the success
   state, and the branches that matter (the load-bearing ones, not every edge). Name the emotional
   lows the as-is journey marked and show how the flow answers them.

3. **Inventory the screens and their states.** From the flows, derive every screen a flow passes
   through, and for each, the states it must carry: not just the happy path but empty, loading,
   error, and the edge states the branches force. This inventory is what `design-system` sizes its
   component set against and what `build`'s states/edge/a11y gate checks against.

4. **Fix the information architecture.** How the screens group and how you move between them. Keep
   it as flat as the flows allow; the skeleton's shared nav IS the model, so every page carries it.

5. **Trace it back to the rubric and assumptions.** Each flow should answer a rubric question from
   `01 Brief & Problem.md`; a screen that exists only because of an assumption names it in its stub
   copy. A flow that answers no rubric question is a candidate cut: surface it, don't quietly keep
   it.

6. **Scaffold (or re-scaffold) the skeleton repo.** Fill the repo at the target path exactly per
   CONVENTIONS' skeleton contract:
   - One flat html file per screen, `index.html` as the entry. Zero JS, zero dependencies,
     relative links only.
   - Every page repeats the same nav block (one link per screen, `aria-current="page"` on itself),
     and every flow edge is a real labeled link, so click-through navigation is genuine.
   - Each page marks itself: `data-screen`, `data-serves` (the W-ids it serves), a visible
     fidelity badge (`data-fidelity="full"` for the one confirmed full-depth screen, `"stub"` for
     the rest), and a visible labeled block per required state (empty, loading, error, edges).
   - **The full-fidelity screen models a fed-in starter app when one exists.** If the project was
     given a starter app (a `_assets/starter-app/` copy plus a research note; the owner said "this
     is where the project starts"), the `full`-fidelity screen's static markup is modeled on the
     starter's real surface (its controls, its main affordances, its layout) so the prototype opens
     looking like the actual product, not a generic stub. The skeleton stays static and zero-JS: do
     NOT copy the starter's runtime code (React, API calls) in; that is build's job, and the
     README/flows.json note the starter as the base build inherits. No starter fed in: the
     full-fidelity screen is a plain designed stub like the rest.
   - Every page links `tokens.css` (a placeholder with neutral fallbacks; design-system fills it)
     then `styles.css` (consumes only `var(...)` with fallbacks).
   - `flows.json` at the root: the machine-readable structure (screens, states, serves, fidelity,
     edges) per the schema in CONVENTIONS, `source: "structure"`. Exactly one screen carries
     `fidelity: "full"`.
   - A one-paragraph `README.md` (what this repo is; build replaces the skeleton keeping routes
     and flows.json). On a fresh scaffold, `git init` and one `Skeleton scaffold` commit; on a
     refresh (target-path case 2 above), overwrite the files in place and add one
     `Skeleton re-scaffold` commit, so build's drift diff keeps a lineage either way.
   Write NO `03 Structure.md`: the repo is the structure. That vault slot is retired.

7. **Record and close.** Fill `prototype_repo` in `00 Dashboard.md` with the repo's ABSOLUTE path
   (never `~`); on a refresh it already points here, leave it. Where the skeleton makes a real call
   (a flow chosen over an alternative, a screen cut), record it as a decision entry so the reasoning
   is kept. Close the dashboard with `Current stage: structure: scaffolded. Next: design-system.`
   (`re-scaffolded` on a refresh). If a flow contradicts something in What's Worth Building, route
   it back into the loop rather than silently diverging.

   **At close, run the utility check** ([[0030 utilities-push-dont-pull]]): refresh the
   harvest-debt standing line on `00 Dashboard.md`; offer a `design-studio-harvest` crossing if
   flag-debt crossed ~5; run `design-studio-wiki-lint`'s mechanical pass if the wiki's last lint is
   older than ~7 days. Skip silently when no `Studio Wiki/` exists yet.

## Handoff
Point to `design-studio-design-system` (it reads `flows.json`, walks the skeleton, and authors
`DESIGN.md` at the repo root; its `tokens.css` export restyles the skeleton in place), or straight
to `design-studio-build` on a Lite run. Build gates on the repo and `flows.json` existing, drives
the skeleton screen by screen, and replaces the static pages with the real app while keeping the
route names and the manifest current.
