---
name: design-studio-research
description: Accelerated problem-space research for a design project. Fans out parallel sweeps across the product/company spine, cited user pain points, prior art and industry standards, and the competitive landscape decomposed into patterns. Use after debrief, before deciding on a direction, to understand the problem and the world around it. Second stage of the design-studio pipeline.
---

# design-studio-research

Uses AI as a research accelerator — not to generate UI, but to survey prior art, standards,
competitors, and real pain fast. The output is understanding, not a design.

**Read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🟡 (draft — the user corrects).

## When to use
After `debrief`. Runs standalone (resolve the project from `.design-studio-active`).

## Preconditions
- Expects `01 Brief & Problem.md`. If missing, warn and offer to run `debrief` first or proceed
  with whatever the user describes.

## Process

**Wiki first:** before researching, check `Studio Wiki/` for existing standard/pattern pages that
already answer part of the question — cite them and research only the gaps.

Run four sweeps **in parallel** (spawn sub-agents; only the main thread writes files/decisions).
Every claim must carry a source; a claim with no source is flagged `unverified` for `verify`.

1. **Product / company spine** — who builds this, their strategy, public language and vocabulary
   to echo later. → `02 Research/Company.md`.
2. **Pain points** — real, cited friction (app-store reviews, forums, support, HCI research). Tag
   each pain to the rubric question it touches. Split verified / partial / unverified. → `02 Research/Pain.md`.
3. **Prior art & standards** — has the industry converged on a standard or primitive for this
   problem? (The highest-leverage finding — Thunderbolt's "the standard already exists" moment.)
   → `02 Research/Standards.md`.
4. **Competitive landscape** — decompose the best tools into **interaction patterns with lineage**
   (not feature lists); map tools × rubric; note gaps nobody fills well. → `02 Research/Landscape.md`.

5. **Flag — don't decide.** If research surfaces a possible reframe ("these three things are one
   primitive") or a load-bearing assumption, note it at the top of the relevant file and tell the
   user. Deciding the reframe is `reframe`'s job; verifying is `verify`'s. Findings that
   generalize beyond this project — a pattern with lineage, a standard, a trap — also get a
   one-line flag in `Harvest.md` (capture is free; distillation comes later).

6. **Update the risk register** with any new assumptions, and update `00 Dashboard.md` (stage = research,
   next = verify).

## Handoff
Point to `design-studio-verify`.
