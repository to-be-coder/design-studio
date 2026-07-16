# Research move — reconcile

Loaded only when a round is pointed at **the decision log vs. shipped reality**
([[0027 validate-dissolves-6-stages]]). Not a stage, not calendared — the recurring ceremony of the
**"production is truth" law** ([[0013 built-reality-is-canonical]]), invoked **when it matters**: a
prototype has moved fast and you suspect the record and the built thing have drifted apart. It writes
one artifact, **`Drift Ledger.md`**, to the project folder.

## The move

1. **Take both sides.**
   - **The record**: `Decisions/` (what was decided and why), `What's Worth Building.md` (Build now /
     Backlog / Don't build / Implied but unruled), `03 Structure.md` (the flows/IA the build was supposed to realize).
   - **The shipped reality** — the running prototype and its repo (the `prototype_repo` path in
     `00 Dashboard.md`). Where they disagree, **the built thing wins** ([[0013
     built-reality-is-canonical]]): the code is the fact, the record is the claim.
2. **Fan out to compare, not to judge.** Spawn sub-agents to walk each decided/agreed item against
   what the prototype actually does. (Sub-agents return their comparison; only the main thread writes
   files or decisions.) For each item, one of:
   - **matches** — record still true (no entry needed unless the confirmation is load-bearing);
   - **drifted** — the build diverged from a decision without a superseding entry (the interesting
     case);
   - **undecided-but-shipped** — the prototype does something no decision covers (a silent choice
     that should become an explicit one);
   - **decided-but-absent** — a decision the build never realized (deferred-in-fact, or dropped).
3. **Write `Drift Ledger.md`** to the project folder — a dated table, one row per divergence: *item ·
   what the record says · what shipped · classification · proposed reconciliation*. This ledger is
   the deliverable; it does not itself change the log.
4. **Reconcile through the normal channels — never a quiet edit.** Each divergence routes to its
   owner: a `drifted` or `undecided-but-shipped` item that should stand becomes a **new decision that
   supersedes** the stale one (or a fresh `proposed` one where none existed) — the record catches up
   to reality, in the open, with the trail intact. An item where the *record* was right and the build
   wrong is a **build finding** (loops back as a build round). Nothing is reconciled by editing a past
   decision in place — the drift, and its correction, both stay visible.

## Byproduct
- A recurring drift pattern — a kind of decision the build keeps quietly overriding — is a wiki
  candidate; flag it one line in `Harvest.md`.

Return to `../SKILL.md` for the register-sort and report contract. Reconciliation obeys the same
back-edge law as everything else: any finding supersedes the decision it invalidates, never patches
it silently ([[0023 nothing-locks-before-production]]).
