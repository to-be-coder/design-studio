---
name: design-studio-build
description: Build the clickable prototype spec-first — write per-feature specs in plain language before building, then build against them in Claude Code, with a gate for empty/error/loading states, edge cases, accessibility, and token-level consistency against the project's DESIGN.md. Refuses to run until the upstream understanding exists. Ninth stage of the design-studio pipeline.
---

# design-studio-build

The Figma/code is the last 20%. Build with intent: write the spec first so the intent lives in
writing and you can defend every decision — never vibe-code. The prototype is a **Claude Code
clickable prototype** in a separate repo, not in the vault.

**Read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🟢 (executes against the user's spec).

## When to use
After `design-system` (Full) or after `debrief`+`explore-directions` (Lite — ideally with
`design-system` in between). Runs standalone.

## Preconditions — enforce the front-load (fix #1, gap #4)
Check the vault for: a restated problem, a committed spine, a linted `DESIGN.md`, and (Full route)
a verified load-bearing assumption + chosen direction. **If the thinking is missing, stop and say
so** — building cheap UI before the understanding exists is the exact junior failure this pipeline
prevents. If only `DESIGN.md` is missing, offer `design-studio-design-system` first — one shared
visual contract is what keeps parallel agents from each inventing their own UI. The user may
override, but make the gap explicit.

## Process

1. **Spec-first.** For each feature write a short plain-language spec (problem / behavior / decisions)
   before any code — use plan mode. The spec serves the design; the code serves the spec.
2. **Wire in the visual contract.** Move the vault `DESIGN.md` into the repo root as the first
   committed act, leaving a link note in its place in the vault — the repo file is the only copy
   from here on (CONVENTIONS). Export the tokens into the stack's format and consume them from code
   (`npx @google/design.md export --format css-tailwind` for Tailwind, `--format dtcg` otherwise):
   components take values from tokens, never inline.
3. **Build against the spec** in Claude Code. Once the structure exists, run parallel agents for
   detail work across different parts of the prototype — and start every agent's prompt with: read
   `DESIGN.md` first; every visual value comes from its tokens.
4. **States / edge / a11y gate** (gap #5): before calling anything done, pass over empty, loading,
   error, and edge-case states, plus accessibility (focus, contrast, labels, keyboard). AI-built UI
   defaults to the happy path — this gate exists to break that default.
5. **DESIGN.md consistency gate** (gap #5): audit the UI for hardcoded colors, type, spacing, or
   radii that bypass the tokens. A missing token means `DESIGN.md` grows (edit it, re-lint,
   re-export) — never an inline value. Additive tokens are normal growth; reshaping the committed
   language gets a decision entry. If the client has an existing product system, reuse its
   components and patterns: `DESIGN.md` codifies that system; don't invent divergent ones.
6. **Provenance honesty** (if starting from a starter app): track kept-vs-built; every "I built this"
   claim must be literally true against the source.
7. **Record** build-shaping decisions (what the spec cut or reshaped, what was inherited). Link
   `00 Dashboard.md` to the repo path.
8. **Update `00 Dashboard.md`** (stage = build, next = validate).

## Handoff
Point to `design-studio-validate`.
