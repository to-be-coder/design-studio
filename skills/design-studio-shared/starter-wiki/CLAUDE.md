# Studio Wiki — how to operate this folder

You are in the studio's compounding knowledge base (Karpathy's LLM-wiki pattern, adapted for a
design studio). This file is the wiki's **schema**: read it before touching anything here. The
full spec lives in the design-studio skills (`design-studio-shared/CONVENTIONS.md`, "Studio Wiki"
section); this file is the standalone summary so ANY session behaves correctly — even one without
the skills installed.

## The two rules that matter most

1. **One writer.** Pages are created and edited only through the `design-studio-harvest` skill —
   a distillation the user reviews before anything lands — an approved `wiki-lint` fix, or the
   one-time starter seeding by `design-studio-setup`. Main thread only, never a sub-agent. If
   you are not running one of those, you are a READER here.
2. **The membrane.** Pages hold de-clientified lessons — mechanisms, not client particulars.
   Project content lives in `Design Studio/<project>/` and never crosses into the wiki except
   through harvest's reviewed crossing. Projects never read each other; this wiki is the only
   shared surface, and it must stay safe to show any client.

## Read protocol — index-first

1. Open the views to find candidates: `_index.md` (by entity), `_plays.md` (by problem shape,
   including ⚠ traps), `_sparks.md` (orphaned ideas).
2. Drill into only the pages that matched. Never scan `wiki/` wholesale.
3. Respect `applies`: `mechanism` is always safe; `process` guides how you work; `taste` is
   **invited-only** — greenfield/unbranded work, never client-brand work uninvited.

## What lives where

- `wiki/` — flat markdown pages. Frontmatter contract: `type: wiki-page`, `entity`
  (pattern|play|trap|spark|standard|craft|client|tool|source), `applies`
  (mechanism|taste|process), `origin`, `born`, `sources`, `status` (live|superseded|aged-out),
  `last_confirmed`.
- `raw/` — immutable source captures: excerpts, transcripts, images. Add only, never edit. Read a
  capture's text first, then view its images separately (they don't come through in one pass);
  prefer locally saved images over hotlinked URLs.
- `_index.md` / `_plays.md` / `_sparks.md` — the views; harvest keeps them current on every
  crossing.
- `log.md` — append-only timeline: `## [YYYY-MM-DD] init|harvest|lint|ingest — <source>` (a
  short summary may follow the source). Parseable with unix tools: `grep "^## \[" log.md | tail -5`.

## Filing answers back

A good analysis or comparison produced while reading the wiki shouldn't die in chat history — but
it crosses like everything else: capture the underlying material to `raw/` first (no page without
provenance), then run `design-studio-harvest` in ingest mode so the user reviews the crossing. If
the analysis is project-specific, it belongs in that project's folder — flag it in the project's
`Harvest.md` instead of here.

## Health

`design-studio-wiki-lint` runs weekly-ish. Supersede, never overwrite; age out, never delete (ADR
semantics). Keep the wiki small: prefer extending an existing page over minting a new one — a
junk drawer serves everything in theory and nothing in practice.
