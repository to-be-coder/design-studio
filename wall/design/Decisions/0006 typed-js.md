---
id: 0006
stage: build
status: decided
date: 2026-07-02
rests_on:
relates_to: "[[0003 route-and-stack]]"
supersedes:
superseded_by:
tags: [decision]
---

# 0006 — Typed JS: TypeScript's checker without TypeScript's build

**Decision.** The wall's code stays `.js` and zero-build, but gains the type contract: JSDoc
annotations against a shared `types.d.ts`, checked by `tsc --noEmit` (`strict`, `checkJs`) as a
gate — `npm run check`. Runtime dependencies remain **zero**; `typescript`/`@types/node` are
contributor devDependencies only. Users still run `node wall/server.js` with no install.

**Why.** The user asked for TypeScript as modern practice; the type *contract* is the modern
practice worth having — it catches drift at check time, the same role design.md lint plays for
the visual contract. But `.ts` syntax requires transformation: the browser can't run it at all,
so full TS means a build toolchain or committing compiled output (mirror-and-sync — the wiki has
a play against exactly that). Typed JS gets ~90% of the safety across both server and browser
code with zero change to how the product runs.

**Rejected alternatives.**
- **Full TypeScript + esbuild** — supersedes the zero-build promise (0003) for modest safety gain
  at ~650 lines; clean future move if the wall grows into a multi-view app.
- **Plain JS** — leaves rigor on the table; the checker is nearly free.

**True cost.** build: annotations + null-guard hardening once / support: contributors run one
check command; a version-pinned devDependency pair.

**Status note.** Precedent: webpack and Preact ship this pattern. Revisit only on real growth.
