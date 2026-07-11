# Changelog

All notable, user-visible changes to the design-studio skills are documented here.

## Unreleased

### Added

- **Decision provenance for 🔴 stages.** Decisions carry `authored_by: user | skill`; a 🔴 decision
  is only `authored_by: user` when it quotes the user's verbatim words under **In their words.**
  The 🔴 ritual is now an explicit two-phase, two-turn protocol (ask and end the turn; record only
  after the user replies), and "you decide" is answered by decomposing into narrow either/or
  questions rather than repeating. `wiki-lint` gains a decision-provenance integrity check, and
  skipped precondition warnings now leave dated **override receipts** on the project dashboard.
- **Humans enter earlier.** `research` gains an optional **Primary (generative)** sweep (the skill
  drafts the interview guide; the user runs the conversations) and a closing **Synthesise** beat
  (provisional persona/JTBD + as-is journey) feeding `reframe`. `converge` gains a primary-contact
  gate: zero user contact must be recorded as an accepted risk — a receipt, never a block.
  `validate` gains an **early mode** for testing the concept or flows before build. `build` now
  leads spec-first with a flows/IA layer, adds a **content gate** (placeholder text is a defect)
  and a **craft-divergence** beat (2–3 takes on the core interaction). `debrief` splits success
  criteria into shipped outcome vs the in-session signal a prototype test can measure.
- **Taste as knowledge.** The wiki page contract gains a `taste` entity — a kept/cut pair with the
  user's quoted why — and `converge` flags cut darlings as taste-pair candidates. `harvest`'s
  write discipline now states the measured power law: a handful of pages do the cross-project
  work, so the discipline is refusal.
- **`ARCHITECTURE.md`** — a map of how the product actually works: the four places files live, the
  two pointers skills resolve, the six file-based channels skills communicate through, the
  stage→artifact table, the 🔴 ritual, the wiki membrane, and the invariants a contributor must
  not break. Linked from the docs map in `CLAUDE.md`.

### Changed

- **The Studio Wall is replaced by the `web/` dashboard.** The Next.js dashboard supersedes the
  zero-dependency wall: it renders every stage's output, a knowledge graph, and the decision log
  with its supersede chains, all from a single pipeline definition in `web/src/lib/schema.ts`.
  `.github/workflows/web-checks.yml` runs the type check and production build on every change
  under `web/`.

### Removed

- **`wall/`** — the ambient dashboard, its `⌘K` control surface for running non-interactive
  skills from the browser, its Playwright smoke suite, and its public design record
  (`wall/design/`). Skills are now copied into Claude Code rather than run from the browser.
  Recoverable from history at the commit preceding this change.

### Added

- **Committed wall smoke suite + CI** — `wall/test/wall.spec.js` (Playwright, contributor
  tooling only; runtime dependencies stay zero) drives the real server and UI against a
  throwaway vault with a stubbed CLI: the token gate with *visibility* assertions (the class of
  bug that shipped), ambient render, ⌘K palette, drill-ins, the confirm-to-run stream, and the
  API refusals. `.github/workflows/wall-checks.yml` runs the type check and the suite on every
  change under `wall/`.

### Fixed

- **Wall overlays now actually dismiss** — the token gate, ⌘K palette, drill-ins, and toasts
  toggle the `hidden` attribute, but the stylesheet's own `display` rules overrode the
  browser's `[hidden]` default, so the token gate never left the screen and overlays rendered
  permanently. One reset rule (`[hidden]{display:none!important}`) restores the intended
  behavior everywhere. Also hardened the server: static-file prefix guard now requires a path
  separator, and the run stream no longer writes to a response the client already closed.
- **`explore-directions` wrote an out-of-enum dashboard value** — it told the dashboard
  `stage = explore-directions`; the CONVENTIONS enum (which the portfolio Dataview/Bases
  queries filter on) says `directions`.

### Changed

- **Typed JS for the wall** — shapes in `wall/types.d.ts`, JSDoc annotations enforced by
  `tsc --noEmit` (strict) as a contributor check gate. Zero runtime dependencies and the
  zero-build `node wall/server.js` promise unchanged (decision 0006).
- **Docs consistency pass** — README numbers `compile-spec` as stage 11 (matching its
  "Eleventh stage" description) and uses the repo's real clone URL; the wall README lists
  decisions through 0006, explains why the specimen boards show candidate palettes rather than
  the shipped pink, and carries the `tokens.css` regeneration recipe — which now stamps a
  do-not-hand-edit provenance header into the generated file; CONVENTIONS documents
  compile-spec's `Align.md`/`Handoff.md` outputs, the wiki log-line summary suffix, and the two
  mechanical wiki writers beside harvest (setup's starter seeding, wiki-lint's approved fixes),
  with the starter wiki's `CLAUDE.md` aligned; `build`'s description now says it warns and asks
  (never hard-blocks) when upstream understanding is missing; the wall's design record gains
  the citable "Guiding principle" section its decisions ladder to.

## v1.1.0 — 2026-07-02

### Added

- **Studio Wall** — an ambient dashboard and control surface over the vault, built through the
  pipeline itself: public design record in `wall/design/` (brief, decisions 0001–0005 including
  a superseded language pick, the two specimen boards), visual contract in `wall/DESIGN.md`
  (Bloom — single sci-fi-pink hue, warm plum-black, no pure white/black; lints clean including
  WCAG contrast, with the 8px instrument-dot cap encoded as component tokens). Zero-dependency Node server (127.0.0.1 +
  bearer token + Origin check; two-skill allowlist — `wiki-lint` report and `harvest` draft
  preview; one run at a time, streamed live, logged). Zero-build front end: ambient by default
  (no visible buttons), ⌘K command palette for every secondary action with press-Enter-again
  confirm, project drill-ins, handoff cards for 🔴 stages, designed empty/offline/no-CLI states,
  20+-project overflow. Playwright-tested end to end (16 checks + security curls).

## v1.0.0 — 2026-07-02

First shippable release: the full pipeline, the visual contract, studio memory, and onboarding.

### Added

- **design-system stage** (#1) — new eighth pipeline stage codifying each project's visual
  language as a `DESIGN.md` ([google-labs-code format](https://github.com/google-labs-code/design.md)):
  derived from the client's brand or chosen from rendered HTML specimen boards; lint gate
  (structure + WCAG contrast) plus user sign-off. `build` consumes it token-first (export to
  Tailwind/DTCG; every parallel agent reads it before touching UI), `validate` diffs it for drift,
  and `compile-spec` hands it to engineering with a token export. Pipeline renumbered to 11 stages.
- **Studio Wiki** (#2) — compounding studio memory beside the projects: hub-and-spoke with a
  one-way membrane (projects read the wiki freely, write to it only through a reviewed harvest,
  and never read each other). Per-project `Harvest.md` flag inboxes capture continuously;
  `design-studio-harvest` distills deliberately (close-out / milestone / backfill / derive /
  ingest modes) and is the wiki's only writer; `design-studio-wiki-lint` prunes contradictions,
  duplicates, orphans, stale claims, coverage gaps, aging sparks, and harvest debt. Six pipeline
  skills gained read/write hooks; a starter wiki (seeded from this repo's own build) plus a
  wiki-local `CLAUDE.md` schema file ship in `design-studio-shared/starter-wiki/`.
- **MIT license** (#3).
- **First-run onboarding** (#4) — `design-studio-setup`: idempotent vault find-or-create (searches
  for existing Obsidian vaults), writes the `~/.design-studio-vault` pointer every skill resolves,
  scaffolds the Design Studio home, seeds the starter wiki, and hands off to the first project.
  CONVENTIONS gained the vault-resolution rule (no more hardcoded paths), the repo gained a root
  `CLAUDE.md` so it onboards itself when opened in Claude Code, and the README quickstart became
  three steps.
- **Release workflow** — `.github/workflows/release.yml`: creates a tag + GitHub release from the
  Actions tab, with notes extracted from the matching CHANGELOG section.
