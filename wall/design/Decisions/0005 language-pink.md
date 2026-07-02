---
id: 0005
stage: design-system
status: decided
date: 2026-07-02
rests_on:
supersedes: "[[0004 language]]"
superseded_by:
tags: [decision]
---

# 0005 — The wall speaks Bloom (sci-fi pink), superseding Ember

**Decision.** At the release gate, the user redirected the language: sci-fi **pink** instead of
amber. New language **Bloom**: pink phosphor (`#FF5C8A`) on warm plum-black (`#170B12`),
pink-tinted inks, same laws as before — one hue, no pure white/black, four-step surface ladder,
one filled primary action, 8px instrument-dot cap. `wall/DESIGN.md` updated; `tokens.css`
regenerated; nothing else in the build changes.

**Why.** The user's call, made looking at the real rendered wall — which is the point of the
gate. Pink is rarer still than amber in this genre; the instrument discipline is what keeps it
technical rather than candy.

**Rejected alternatives.**
- **Ember (amber)** — superseded, not deleted; boards and decision 0004 remain the record.
- Re-running a full board round — unnecessary: the shipped wall + fixture screenshots are now a
  better decision surface than boards.

**True cost.** build: one token edit + re-export + re-screenshot / support: unchanged.

**Status note.** Demonstrates the product thesis in one move: a full visual re-skin with zero
component changes, because every pixel derives from the contract.
