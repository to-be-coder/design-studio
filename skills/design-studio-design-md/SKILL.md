---
name: design-studio-design-md
description: Safely update or validate a DESIGN.md — the studio's owned visual-contract format — in ANY project, not just the design-studio repo. Runs the amend ritual: author against the vendored spec (never from memory), edit the single canonical file, classify additive growth vs a reshape of a committed value (drift — flagged, and a reshape wants sign-off before code consumes it), lint it, re-export the tokens so code stays in sync, diff it against the prior git ref, and note it. Enforces no hardcoded hex/oklch in components, one canonical copy, and growing the contract rather than bypassing it — with the zero-dependency toolchain installed beside it so it runs in a client's prototype repo too. Use whenever a DESIGN.md needs changing or checking, in any repo. Utility skill, not a pipeline stage.
---

# design-studio-design-md

A DESIGN.md is the most load-bearing artifact a prototype has — one file both the user and the
coding agents read, so every screen draws from one visual language. Hand-editing it fails two ways:
the export gets forgotten (the code silently drifts from the contract) and the token rules get
re-explained every time. This skill bakes the **amend ritual** in and makes it runnable
**anywhere** — the zero-dependency toolchain installs beside it, so a client's prototype repo (no
design-studio checkout in sight) can still lint, export, and diff.

**Read `../design-studio-shared/CONVENTIONS.md` first** — its "DESIGN.md — the visual contract"
section is the law. The authoritative format definition is `../design-studio-shared/DESIGN-SPEC.md`.
Autonomy: 🟡 (drafts the amend; a **reshape** gates on user sign-off before code consumes it).

## When to use
- **Update** a DESIGN.md — add a token / component / rule, or reshape an existing committed value.
- **Validate** one — run the lint (and the drift diff) without changing anything.
- In **any** repo: a design-studio vault project, this repo's `web/`, or a standalone client
  prototype. Not tied to a stage; invoke whenever a DESIGN.md needs to change or be checked.

Runs standalone. When there is **no** DESIGN.md yet and it's a fresh design-studio project, authoring
one from scratch is `design-studio-design-system`'s job (specimen boards, sign-off gate); this skill
**amends and validates an existing** one, anywhere. During a `build` round the same discipline lives
in build's DESIGN.md-consistency gate — this is the standalone door to it.

## Preconditions
- A DESIGN.md to act on (or the intent to validate one). **No Node** to run the toolchain? Author
  against the spec, hand-check the floors, hand-derive the export, and say so — the same honest
  degradation the rest of the pipeline uses, never a silent skip.

## The amend ritual — the process

1. **Read the spec, not your memory.** Open `../design-studio-shared/DESIGN-SPEC.md` (installed at
   `~/.claude/skills/design-studio-shared/DESIGN-SPEC.md`) — the studio's owned format definition
   (forked from google-labs design.md, provenance-pinned). Token groups, the fixed section order,
   the component sub-token vocabulary, references, and the two studio extensions (motion, contrast
   floors) are all defined there. **Never edit the format from memory.**
2. **Locate the single canonical copy.** Exactly one DESIGN.md is the source code consumes — the
   prototype repo root once `build` has moved it there, or `<project>/DESIGN.md` in the vault before
   that. Edit **that** one. If you find two, that's the defect: reconcile to one and note which won.
   Never create a second copy to "sync later".
3. **Classify the change — additive vs reshape.**
   - **Additive** — a new token, a new component entry, a new rule / contrast pairing — is **normal
     growth**: the contract getting bigger to cover a case it didn't. Grow it freely.
   - **Reshape** — a *changed committed value* (a color swapped, a spacing step moved, a contrast
     floor lowered) — is **drift**. Call it out explicitly: what the value was, what it's becoming,
     and what already consumes it. A reshape **wants sign-off before code consumes it** — surface it
     and get the go-ahead; never fold a reshape into an additive edit silently.
4. **Edit the file.** Front matter is the source of truth (exact token values); the body is the
   rationale (when and why to apply each). Keep the body sections in the spec's fixed order; a
   component takes its values from tokens (`{colors.primary}`), never an inline literal.
5. **Lint it** — the zero-dependency gate must pass:
   `node ~/.claude/skills/design-studio-shared/scripts/design-lint.mjs <path-to-DESIGN.md>`
   (repo-dev alternative: `npm run design:lint <path>` from `web/`). It checks structure (required
   sections in order, no duplicate heading), that every `{ref}` resolves, motion / floor syntax, and
   WCAG contrast against the declared floors. A declared pair below its `min` is a design problem to
   fix, not a warning to mute.
6. **Export the tokens — the step hand-edits forget.** Regenerate the CSS custom properties so
   `tokens.css` / the code stays in sync with the contract:
   `node ~/.claude/skills/design-studio-shared/scripts/design-export.mjs <path-to-DESIGN.md> > tokens.css`
   (repo-dev alternative: `npm run design:export <path>` from `web/`). Every leaf token becomes a
   `--group-key` variable, references resolved, state variants and motion included. This is the exact
   step that gets skipped by hand and lets code drift — **do not skip it.**
7. **Show the diff — so a reshape can't hide.** Compare the edited file against its prior version:
   `node ~/.claude/skills/design-studio-shared/scripts/design-diff.mjs <prior-git-ref> <path-to-DESIGN.md>`
   (repo-dev alternative: `npm run design:diff <prior-git-ref> <path>` from `web/`). Either side can
   be a filesystem path, a `<ref>:<path>` read via `git show`, or a bare `<ref>` reusing the other
   side's path. It compares **resolved** tokens and reports added / removed / changed (exit 1 on
   drift) — so a pairing that resolves the same isn't spurious noise, while a lowered floor or a
   removed token a consumer still references is caught. Present added / removed as growth; present
   changed as the reshape to confirm.
8. **Note it.** In a design-studio project: an additive edit is a one-liner, and a reshape
   **supersedes** the language decision like any other loop-back (append a `Decisions/` entry) — then
   refresh `00 Dashboard.md`. In a bare client repo: a commit message plus the diff output is the
   record. Either way the change leaves a trail.

## Rules it enforces
- **No hardcoded hex / oklch in a component.** A raw color / type / spacing / radius value in code is
  a defect, not a shortcut — it comes from a token, via the export.
- **Grow the contract, not the component.** A missing value means the DESIGN.md gains a token (edit,
  re-lint, re-export) — never an inline one-off that bypasses it.
- **One canonical copy.** Exactly one DESIGN.md is the source of truth; there is never a second to
  drift against.

## Handoff
A utility, not a stage — return to wherever you were. In a design-studio project, a reshape that
wants the full sign-off ritual is `design-studio-design-system`'s territory; an open `build` round
resumes at its DESIGN.md-consistency gate. In a standalone repo you're done once the lint passes, the
export is regenerated, and the change is noted.
