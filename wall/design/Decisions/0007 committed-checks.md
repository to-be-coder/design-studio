---
id: 0007
stage: build
status: decided
date: 2026-07-02
owner: jess
rests_on:
relates_to: "[[0006 typed-js]]"
supersedes:
superseded_by:
tags: [decision]
---

# 0007 — Commit the regression suite: behavior gets a gate like shapes do

**Decision.** The wall's end-to-end Playwright checks live in the repo (`wall/test/wall.test.js`,
run by `npm test`): a plain node script — no test framework — that builds a temp fixture vault,
stubs the CLI through the `WALL_CLAUDE_BIN` seam, spawns real server instances, and asserts
auth, security responses, overlay visibility, mouse click-through, deviation counts, and
streamed runs. `playwright` joins `typescript`/`@types/node` as a contributor devDependency;
runtime `dependencies` stays empty and `node wall/server.js` remains the whole user story.

**Why.** The `[hidden]`-overlay defect shipped in v1.1.0 and survived because the checks that
would have caught it ran once at build time and were never committed — the changelog claimed
"Playwright-tested (16 checks)" while the repo held zero tests. The type checker (0006) gates
shapes at check time; this suite gates behavior the same way, through the same seam: a lint,
not a framework. The test file is typed JS in tsconfig's `include`, so `npm run check` covers
it too.

**Rejected alternatives.**
- **Keep tests ad hoc** — the overlay defect is the documented cost of this option.
- **A test framework (vitest/jest)** — a dependency tree to gate ~20 assertions; a plain script
  with `node:assert` does the job and keeps the zero-runtime-dependency story legible.

**True cost.** build: one script / support: contributors run `npm test` (first run may need
`npx playwright install chromium`); one more version-pinned devDependency.

**Status note.** Suite born from the CTO preview's scripts — the ones that caught the defect by
clicking with a mouse.
