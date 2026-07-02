---
name: design-studio-setup
description: First-run onboarding for the design-studio pipeline. Finds or creates the user's vault (Obsidian recommended, plain markdown works), writes the ~/.design-studio-vault pointer every skill resolves, scaffolds the Design Studio home (portfolio dashboard + Home note), seeds the Studio Wiki with the starter pages, and hands off to the first project. Idempotent — safe to re-run, adopts existing vaults, never clobbers. Use once after installing the skills, or later to repair or move the vault. Utility skill, not a pipeline stage.
---

# design-studio-setup

The front door for a fresh install. One job: leave the user with a working vault, a valid
pointer, a seeded wiki, and exactly one next action. Neutral tone; no tour beyond a paragraph.

**Read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🟡 (asks, then executes).
Run once per machine; safe to re-run.

## When to use
Right after installing the skills (the README sends people here), on a new machine, or to repair
a broken or moved vault pointer. Runs standalone.

## Preconditions
- None. This skill creates the preconditions everything else checks.

## Process

1. **Detect prior state — never clobber.**
   - `~/.design-studio-vault` exists and its path is a real folder → say "already set up," show
     the path, offer keep / move / repair. Keep → stop here, ending on the next-action line.
   - Pointer exists but the path is gone → say so and continue as a first run (rewrite it at
     step 3).
   - No pointer → first run; continue.
2. **Find or create the vault.** Search common locations for existing Obsidian vaults
   (`.obsidian` folders under `~/Documents`, `~/Desktop`, and the iCloud Obsidian folder
   `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/`) and present what's found as a pick
   list — never ask a designer to type a filesystem path cold. Nothing found or nothing wanted →
   create a folder (suggest `~/Documents/design-studio-vault`; let them rename). One line of
   positioning: Obsidian is the most efficient way to run this (the graph ties projects to the
   wiki; Dataview makes the dashboards live), but everything is plain markdown and works without
   it.
3. **Write the pointer:** `~/.design-studio-vault` — one line, the absolute path. This is the
   file every skill resolves the vault from (CONVENTIONS).
4. **Scaffold, create-if-missing** — same specs `debrief` uses. If the chosen vault already
   contains a `Design Studio/` (second machine, re-run), **adopt it**; don't re-scaffold. Create:
   `Design Studio/`, the `_Design Studio.md` Dataview portfolio, and `Home.md` linking the
   portfolio (and the wiki index once it exists).
5. **Two one-line practical warnings, then move on:** the first writes into the vault will
   trigger Claude Code permission prompts — normal; approve the vault folder. Installing the
   Dataview community plugin turns the portfolio dashboards live — everything degrades gracefully
   without it.
6. **Seed the Studio Wiki — starter only, now.** If `Studio Wiki/` is missing, initialize it per
   the CONVENTIONS layout and copy `../design-studio-shared/starter-wiki/` in (including its
   `CLAUDE.md`); log the init in `log.md`. Ask whether they have past projects or an existing
   product to seed from — if yes, point them at `design-studio-harvest` (backfill / derive modes)
   **for after their first pipeline run**, not now: reaching a first real project beats depth on
   day one, and the wiki is built to grow.
7. **Finish verified, with one next action.** Re-read the pointer, list what now exists (vault
   path; `Design Studio/`; `Studio Wiki/` with its page count; a footnote that the optional
   dashboard is one command away — `node wall/server.js` from the cloned repo), and end with
   exactly one instruction: **"Bring a brief and run `/design-studio-debrief`."**

## Handoff
`design-studio-debrief` for the first project. Re-run this skill anytime the vault moves.
