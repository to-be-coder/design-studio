---
name: design-studio-wiki-lint
description: Health check for the Studio Wiki — finds contradictions, orphan pages, stale claims, sparks ready to age out, harvest debt in finished projects, and view drift. Applies mechanical fixes directly; proposes semantic ones for user approval. Use weekly-ish or after any large harvest (backfill, derive). Utility skill, not a pipeline stage.
---

# design-studio-wiki-lint

A wiki that serves everything only stays useful if it stays **small and true**. This is the
pruning pass — Karpathy's lint idea with this pipeline's ADR semantics: nothing is deleted; pages
are superseded, aged out, or re-verified.

**Read `../design-studio-shared/CONVENTIONS.md` first** (Studio Wiki section). Autonomy: 🟢
report-first; semantic changes need the user.

## When to use
Weekly-ish, after a big crossing (backfill/derive), or whenever the wiki feels stale. Runs
standalone.

**Self-triggering — push, don't pull ([[0030 utilities-push-dont-pull]]).** The mechanical pass no
longer waits to be remembered. Any skill, at its own close, reads `Studio Wiki/log.md`'s most recent
`lint` entry; if it's stale — older than **~7 days** — the skill runs this lint's **mechanical**
checks, applies their fixes directly (missing view rows, one-liner sync, log formatting — step 3),
and appends the `lint` log line. The **semantic** proposals (supersede, fork, age-out, retire, amend
a claim) are never auto-applied — they still queue for the user exactly as below. **No daemon:** the
check rides on a skill already running, and `log.md` on disk is the only state it reads.

## Preconditions
- A `Studio Wiki/` with pages. None → suggest `design-studio-harvest` to seed one.

## Process

1. **Read the wiki whole**: every page in `wiki/`, the three views, `log.md`. For harvest-debt
   detection, also read each project's dashboard `status` and its `Harvest.md` **flag counts
   only** — never flag content. Lint reports that debt exists; the content stays behind the
   membrane until `harvest` crosses it properly.
2. **Checks:**
   - **Schema integrity** — every page carries the full frontmatter contract with valid values;
     `raw/` untouched-since-added; `CLAUDE.md` present and current.
   - **Contradictions** — two pages making opposing claims → propose a supersede or a fork (one
     page's "Breaks when" grows).
   - **Duplicates** — two pages that are one lesson wearing two names → propose a merge (the
     merged-away page gets `status: superseded`, pointing at the survivor).
   - **Orphans** — live pages missing from every view, or with no inbound links → propose the
     missing index line, or retirement (`status` change) if the page never earned its place.
   - **Coverage gaps** — a concept several pages reference that has no page of its own → propose
     it; **missing cross-references** between pages that clearly relate → propose the links.
   - **Fillable gaps** — thin pages and open questions the web could answer → suggest the next
     questions to investigate and sources to look for (a `design-studio-research` sweep can
     execute); proposals only, never auto-ingested.
   - **Stale claims** — `last_confirmed` older than ~12 months on `mechanism`/`standard` pages →
     re-verify against the primary source, adversarially (same spirit as `design-studio-research`'s
     pressure-test move), then bump the date or amend the page.
   - **Aging sparks** — untouched for ~6 months → propose `status: aged-out` (kept, moved to a
     greyed section of `_sparks.md`, never deleted).
   - **Harvest debt** — projects marked done/archived whose `Harvest.md` still holds undistilled
     flags → recommend a close-out `harvest`.
   - **Decision provenance** — scan each project's `Decisions/` for 🔴 decisions (a `debrief` framing
     lock, or a `research` directions-move pick) marked `status: decided` but missing
     `authored_by: user` or missing an **In their words.** quotation → report as integrity findings
     (report-first, like the rest; the fix stays the user's).
   - **View drift** — every live page in exactly the right views; one-liners still matching page
     content; `log.md` still append-only and parseable.
3. **Fix:** mechanical (missing view rows, one-liner sync, log formatting) — apply directly.
   Semantic (supersede, fork, age-out, retire, amend a claim) — propose; the user approves; writes
   then follow the same main-thread-only rule as harvest.
4. **Report + log.** What was fixed, what's proposed, and the size trend (page count over time,
   from `log.md`). Append `## [YYYY-MM-DD] lint — N fixed, M proposed`.

## Handoff
Debt found → `design-studio-harvest`. Otherwise done until next week.
