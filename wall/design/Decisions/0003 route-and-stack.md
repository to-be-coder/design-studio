---
id: 0003
stage: debrief
status: decided
date: 2026-07-02
rests_on: "[[Brief & Problem#Assumptions & risks (seeded)]]"
supersedes:
superseded_by:
tags: [decision]
---

# 0003 — Lite route with design-system; zero-dependency stack; record kept in-repo

**Decision.**
1. **Route:** Lite with `design-system` inserted — the look is the point; the full Understand/
   Decide arc was effectively run in the working session and is captured in the brief.
2. **Stack:** Node 18+ server with **zero npm dependencies** (`node:http`, `fs.watch`,
   `child_process`), zero-build vanilla front end (ES modules), CSS custom properties generated
   from `wall/DESIGN.md` via `npx @google/design.md export`. No framework, no bundler.
3. **Record in-repo** (`wall/design/`), not in a vault: this repo is the client, and the public
   design trail is part of the product's proof. One-off adaptation, not a new convention.

**Why.** Zero-dep matches the product's own values (native, degrade gracefully, nothing to
maintain), matches the field's best precedent (the zero-dependency command center), and keeps
the run instruction to one line. Laddered to the principle: the artifact proves the claim.

**Rejected alternatives.**
- React/Vite/Next front end — build tooling for users, dependency surface, no gain at this size.
- Vault-based project record — the artifacts would be invisible to product users; the trail is
  worth more public.

**True cost.** build: hand-rolled SSE/palette (~150 lines) / support: near-zero — no
dependency updates forever.

**Status note.** Stage numbering in the product is untouched; the wall is a product surface,
not a pipeline stage.
