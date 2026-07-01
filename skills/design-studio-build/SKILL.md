---
name: design-studio-build
description: Build the clickable prototype spec-first — write per-feature specs in plain language before building, then build against them in Claude Code, with a gate for empty/error/loading states, edge cases, accessibility, and design-system consistency. Refuses to run until the upstream understanding exists. Eighth stage of the design-studio pipeline.
---

# design-studio-build

The Figma/code is the last 20%. Build with intent: write the spec first so the intent lives in
writing and you can defend every decision — never vibe-code. The prototype is a **Claude Code
clickable prototype** in a separate repo, not in the vault.

**Read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🟢 (executes against the user's spec).

## When to use
After `converge` (Full) or after `debrief`+`explore-directions` (Lite). Runs standalone.

## Preconditions — enforce the front-load (fix #1, gap #4)
Check the vault for: a restated problem, a committed spine, and (Full route) a verified load-bearing
assumption + chosen direction. **If the thinking is missing, stop and say so** — building cheap UI
before the understanding exists is the exact junior failure this pipeline prevents. Offer to run the
upstream skills first. The user may override, but make the gap explicit.

## Process

1. **Spec-first.** For each feature write a short plain-language spec (problem / behavior / decisions)
   before any code — use plan mode. The spec serves the design; the code serves the spec.
2. **Build against the spec** in Claude Code. Once the structure exists, run parallel agents for
   detail work across different parts of the prototype.
3. **States / edge / a11y gate** (gap #5): before calling anything done, pass over empty, loading,
   error, and edge-case states, plus accessibility (focus, contrast, labels, keyboard). AI-built UI
   defaults to the happy path — this gate exists to break that default.
4. **Design-system consistency** (gap #5): reuse the product's existing components and patterns;
   don't invent divergent ones. If there's no system, note it.
5. **Provenance honesty** (if starting from a starter app): track kept-vs-built; every "I built this"
   claim must be literally true against the source.
6. **Record** build-shaping decisions (what the spec cut or reshaped, what was inherited). Link
   `00 Dashboard.md` to the repo path.
7. **Update `00 Dashboard.md`** (stage = build, next = validate).

## Handoff
Point to `design-studio-validate`.
