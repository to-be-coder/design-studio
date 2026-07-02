# Changelog

All notable, user-visible changes to the design-studio skills are documented here.

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
