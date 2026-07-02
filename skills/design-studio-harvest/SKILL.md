---
name: design-studio-harvest
description: The only writer of the Studio Wiki. Distills what a project taught — patterns, plays, traps, sparks, standards, taste — into de-clientified wiki pages the user reviews before anything crosses. Also seeds an empty wiki (starter pages, backfill of up to 3 past projects, or derive-from-product) and ingests external sources. Use at project close, at milestones on long engagements, or to seed or feed the wiki. Utility skill, not a pipeline stage.
---

# design-studio-harvest

Projects are case files; the wiki is case law. This skill is the **membrane crossing** — the one
place project experience becomes studio knowledge. Capture is free (flags land in each project's
`Harvest.md` as work happens); distillation is deliberate: drafted by the skill, reviewed by the
user, written once.

**Read `../design-studio-shared/CONVENTIONS.md` first** — its "Studio Wiki" section is this
skill's spec (layout, page contract, membrane rules). Autonomy: 🟡 draft + 🔴 crossing review.

## When to use
- **Close-out** (default): a project is done — distill its record.
- **Milestone**: long engagement accumulating undistilled flags — distill mid-flight.
- **Seed**: no `Studio Wiki/` exists yet — initialize it (starter / backfill / derive).
- **Ingest**: an external source (article, transcript, talk) has studio-worthy material.

Runs standalone. The ONLY skill that writes the wiki; main thread only, never a sub-agent.

## Preconditions
- For close-out/milestone: a project with a record (`Harvest.md`, `Decisions/`, stage artifacts).
  A thin record is workable — say so and harvest what exists.

## Process

1. **Resolve the wiki.** If `<vault>/Studio Wiki/` is missing, offer to initialize it per the
   CONVENTIONS layout — always including the wiki's `CLAUDE.md` schema file from
   `../design-studio-shared/starter-wiki/`, whatever the seed mode (it's what keeps sessions
   without these skills behaving) — and ask which seed mode fits:
   - **starter** — copy `../design-studio-shared/starter-wiki/` in: mechanism- and process-class
     pages that make day-one reaches return something and teach the page format by example. (The
     one taste-class card in it is a format example — it says so, and says to delete it once the
     user's own exists. Real taste never ships.)
   - **backfill** — the user picks **up to 3 past projects, best-remembered first**. Their memory
     of what mattered IS the curation signal — never offer bulk ingestion. Read whatever exists
     per project (files, docs, repos, Figma via MCP); interview the user briefly for what the
     record misses.
   - **derive** — an existing product but no project history: read it (repo, live app, Figma) and
     draft baseline pattern/standard/craft pages describing what *is*, which later feeds
     `design-system`'s derive mode.
   Log the init in `log.md`.
2. **Gather the source.** Close-out/milestone: the project's `Harvest.md` flags, `Decisions/`
   (cuts and supersedes especially), rejected directions in `04 Directions.md`, findings in
   `05 Validation.md`. Ingest mode: capture the excerpt into `raw/` first (immutable; save images
   locally rather than hotlinking, and read a capture's text before viewing its images — they
   don't come through in one pass), then work from the capture. An ingest crossing includes one
   brief **source page** (`entity: source`): a paragraph of what it says, a link to the raw
   capture, and what it changed in the wiki.
3. **Draft the crossing** (🟡). For each candidate lesson:
   - **De-clientify** — strip names, numbers, strategy; keep the mechanism. Test: the page must be
     safe to show any other client.
   - **Type it** — entity + `applies` per the page contract; body in that entity's shape.
   - **Check existing pages first** — prefer extending a page over minting one; a contradiction
     proposes a supersede or grows a "Breaks when", never a silent overwrite.
   - **Cite** — `born:` project slug; `sources:` links to decisions / raw captures.
   Small is the goal: a crossing of two great pages beats ten plausible ones.
4. **🔴 The crossing review.** Walk the user through every proposed page, edit, and supersede;
   they approve, edit, or reject each. Do NOT write an unreviewed crossing — this gate is what
   keeps the wiki small and the membrane real.
5. **Write** (main thread): pages into `wiki/`, then the three views (`_index.md` one-liners,
   `_plays.md` problem shapes, `_sparks.md` cards), then append `log.md`:
   `## [YYYY-MM-DD] harvest — <project or source>: N pages, M edits`.
6. **Close the loop on the project:** move distilled flags in its `Harvest.md` to a "Distilled"
   section (so `wiki-lint` can spot real harvest debt), and note the harvest in `00 Dashboard.md`
   if this was a close-out.

## Handoff
Close-out → `design-studio-compile-spec` if a handoff doc is still owed; otherwise done. After a
large crossing (backfill/derive), suggest `design-studio-wiki-lint`.
