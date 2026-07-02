---
type: wiki-page
entity: play
applies: process
origin: starter
born: design-studio
sources: ["design-studio PR #1 — design.md integration, 2026-07"]
status: live
last_confirmed: 2026-07-02
---

# Single copy, moving home

**The move.** When an artifact must be authoritative in two phases of its life, don't mirror it —
**move** it, and leave a link at the old home. Canonical is wherever the artifact is *enforced*,
not wherever it was born.

**When it applies**
- A spec that starts as thinking and becomes law: DESIGN.md is authored in the vault (where
  thinking lives), then moves to the prototype repo root (where agents obey it) as build's first
  committed act. The vault keeps a link note.
- Any document tempted toward a "master copy + synced copy" arrangement.

**Cost**
- Readers at the old home must follow a link.
- History checks move to the new home's git — drift detection becomes "diff against the version at
  move time," which is usually *better* than diffing two live copies.

**Why not mirror?** A mirror needs a sync rule, and sync rules get skipped exactly when things are
busiest. Two live copies of a contract means two contracts. The move-plus-link version has one
failure mode (a stale link) instead of a silent one (divergent truths).
