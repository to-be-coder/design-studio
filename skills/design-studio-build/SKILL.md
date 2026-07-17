---
name: design-studio-build
description: Build the clickable prototype spec-first, in rounds — per-feature specs against the skeleton repo's flows.json → parallel agents build in Claude Code (every prompt opens "read DESIGN.md first") → run the prototype for review in the Canvas (comment/tweak) → the five round-closing gates: empty/error/loading states, edge cases, and accessibility; real content; token-level consistency against DESIGN.md plus the owned design:diff drift check against the signed-off ref; a prototype-review pass that drives the running prototype (every screen captured across states and both themes, read against DESIGN.md, real affordance verified, no console errors); and the register receipt at the door. The exported Canvas feedback becomes the next round's specs, and rounds repeat until the user calls enough. Gates on the upstream understanding existing — warns and asks before building without it, and holds the pipeline's only register gate (an unverified load-bearing assumption is a receipt, not a block). Fifth stage of the design-studio pipeline.
---

# design-studio-build

The Figma/code is the last 20%. Build with intent: write the spec first so the intent lives in
writing and you can defend every decision — never vibe-code. The prototype is a **Claude Code
clickable prototype** in a separate repo, not in the vault.

**Build runs in rounds** ([[0026 build-is-a-loop]]): per-feature specs → parallel agents build (every
prompt opens "read `DESIGN.md` first") → the prototype runs live in the Canvas for review
(comment/tweak) → the five gates close the round → the exported Canvas feedback becomes the next
round's specs. Rounds repeat until the user calls enough — the same sufficiency rule as `research`,
the human is the risk-acceptor. Nothing here "locks": "done" is the user moving attention on — to
`compile-spec`, or an **evaluate round** back in `research` to test the prototype against the success
criteria — fluid and supersedable per [[0023 nothing-locks-before-production]].

**Read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🟢 (executes against the user's spec).

## When to use
After `design-system` (Full) or after a short `debrief`+`research` loop (Lite — ideally with
`design-system` in between whenever the look matters). Runs standalone. Also the skill to come back
to for another round — check `00 Dashboard.md`'s Current stage line first; "build — round 2" means
resume the loop from the round's specs (step 1) with the last round's exported feedback in hand, not
start over.

## Preconditions — enforce the front-load (fix #1, gap #4)
Check the vault for: a restated problem, the accepted recommendation, the flows/IA in
the skeleton repo with its `flows.json`, and a linted `DESIGN.md` at the repo root. **If the thinking is missing, stop and say so** —
building cheap UI before the understanding exists is the exact junior failure this pipeline
prevents. If the prototype repo or its `flows.json` is missing, offer `design-studio-structure` first — build consumes
the flows/IA, it no longer authors them ([[0024 structure-stage-flows-and-ia]]). If only `DESIGN.md`
is missing, offer `design-studio-design-system` first — one shared visual contract is what keeps
parallel agents from each inventing their own UI. The user may override, but make the gap explicit.
Build consumes only the **human-confirmed Build now** set: if `What's Worth Building.md`'s Build now
section is empty, warn (no human-confirmed Build now entries; triage the Proposed candidates in What's
Worth Building first), warn-never-block.

**Register gate** (warn, never block — a receipt; the pipeline's *only* register gate now lives here,
at build's door, per [[0023 nothing-locks-before-production]]). Before starting the build, read
`Assumptions & Risks.md`. If a load-bearing assumption under the leading decision is `unverified`,
surface it by name and offer two ways forward: pressure-test it first (`design-studio-research`), or
record a conscious acceptance — a **"we accept this risk because…"** line in the register, plus a
dated receipt in `00 Dashboard.md`'s `## Overrides` section (CONVENTIONS' override-receipt pattern),
e.g. `- 2026-07-12 — built on an unverified assumption (A3), accepted because <user's reason>`.
Never block on this; the receipt is the point.

## Process

**The round, in one line:** specs (round 1: the flows/IA + per-feature specs; later rounds: the
previous round's exported Canvas feedback) → parallel agents build, `DESIGN.md` first → run the
prototype live in the Canvas for review (comment/tweak) → the five round-closing gates → another
round on the exported feedback, or close. Every round runs the gates; the **first** round also does
the one-time craft-divergence and the `DESIGN.md` move (steps 2–3).

1. **Spec the round — spec-first, always.** Never vibe-code; the intent lives in writing before the
   code, so every decision is defensible. **Round 1:** read the **flows/IA** from the repo's `flows.json` and walk the skeleton pages
   (authored by `design-studio-structure`) — task flows for the core journeys, the screen/state
   inventory, and the navigation model. If it's missing, warn and offer to run `design-studio-structure`
   first, or map a lightweight flow inline on a Lite run — but prose specs alone are not a flow. Then,
   for each feature, write a short plain-language spec (problem / behavior / decisions) — use plan
   mode. **Round 2+:** the round's specs come from the previous round's **exported Canvas feedback**
   (step 5) plus anything the four gates surfaced — turn each into a short spec the same way before
   any code. The spec serves the design; the code serves it.
2. **Craft divergence** (first round). For the core interaction, sketch 2-3 genuinely different takes
   (layout and interaction model, not variations on one) and have the user pick before building — the
   same anti-first-idea discipline `research`'s directions move runs at strategy altitude, applied
   here at craft altitude.
3. **Wire in the visual contract.** `DESIGN.md` already lives at the repo root (design-system
   authored it there; the repo was born at structure). The drift-diff ref is design-system's commit
   in the repo's own history. A legacy project whose DESIGN.md still sits in the vault moves it in
   as the first committed act, leaving a link note. Export the tokens with the studio's owned,
   zero-dependency script and consume them from code —
   `node ~/.claude/skills/design-studio-shared/scripts/design-export.mjs DESIGN.md > tokens.css` (or
   `npm run design:export -- DESIGN.md` from the design-studio repo's `web/`): every leaf token becomes a
   `--group-key` CSS custom property, references resolved, state variants and motion included. **No
   node to run it?** Hand-derive the variables from the front matter (each `group.key` → `--group-key:
   <resolved value>`) and note on the dashboard that the export was done by hand — exactly the fallback
   the lint gate uses. Either way, components take values from tokens, never inline.
4. **Build against the spec with parallel agents.** The skeleton is the map: drive it screen by
   screen from `flows.json`, replace the static pages with the real app, keep the route names, and
   keep `flows.json` current (`source: "build"`). Run parallel agents for
   detail work across different parts of the prototype — and start every agent's prompt with: read
   `DESIGN.md` first; every visual value comes from its tokens.
5. **Run the prototype in the Canvas for review.** The Canvas embeds the running prototype in
   same-origin device frames; run it there and review with **Comment** (propose a change at element or
   page granularity) and **Tweak** (a token-constrained panel with a scope selector — this instance /
   every component / the token everywhere). The **"Copy feedback"** export is the **named round input
   for the next round**: it carries the smallest-reusable-unit routing protocol (token → component →
   instance) and each annotation as a finding. Export that document and hand it to step 1 of the next
   round — that file, not loose memory, is what the next round's specs are written from.
6. **The five gates — the round's checklist, run each round, not once at the end** ([[0026
   build-is-a-loop]]). The **register receipt** is the door-check that opens the round (Preconditions);
   the other four close it. Together they are what "done for this round" means:
   - **States / edge / a11y** (gap #5): pass over empty, loading, error, and edge-case states, plus
     accessibility (focus, contrast, labels, keyboard). AI-built UI defaults to the happy path — this
     gate exists to break that default.
   - **Content**: every state's words — labels, empty / error / loading text, microcopy — are designed
     and laddered to the vocabulary research collected. Placeholder text ("Lorem", "TODO", "Button") is
     a defect, exactly like a hardcoded hex.
   - **DESIGN.md consistency + drift** (gap #5): audit the UI for hardcoded colors, type, spacing, or
     radii that bypass the tokens. A missing token means `DESIGN.md` grows (edit it, re-lint,
     re-export) — never an inline value. Additive tokens are normal growth; reshaping the committed
     language gets a decision entry. If the client has an existing product system, reuse its
     components and patterns: `DESIGN.md` codifies that system; don't invent divergent ones. **Then
     run the owned drift check** — compare the repo's live `DESIGN.md` against the **signed-off ref**
     (the design-system-signed-off version as moved in at build start, from git history):
     `node ~/.claude/skills/design-studio-shared/scripts/design-diff.mjs <signed-off-ref> DESIGN.md`
     (or `npm run design:diff -- <signed-off-ref> DESIGN.md` from the design-studio repo's `web/`). It
     compares the two versions' **resolved** tokens and
     reports what was added, removed, or changed (a lowered contrast floor or a value swap included).
     Drift with no matching decision entry is a finding like any other — the drift check moved here,
     to the round where drift actually happens ([[0027 validate-dissolves-6-stages]]). No node to run
     it? Eyeball the two front matters instead, and say so on the dashboard.
   - **Prototype-review** (drive it, don't just read it, per [[0033 prototype-review-gate-in-build]]):
     the code gates check that the code looks right; this one drives the *running* prototype in the
     Canvas to confirm it is coherent and actually works. Two checks. **Coherence**: capture every
     screen across its states (empty, loading, error) and both themes (light and dark), and read them
     against `DESIGN.md` as the written register. The bar is "it looks like it was always part of this
     product"; approve on "it belongs," not on "it renders." **Affordance and runtime**: confirm every
     interactive element is actually reachable and clickable (not clipped, not zero height, not
     covered), and the prototype runs with no console or runtime errors. Screens can lie about
     interactivity: a button can render perfectly and still be unclickable. **Scope, held
     deliberately**: this raises prototype quality, not production quality. No soak tests, no load
     tests, no formal proofs; production hardening (concurrency, real backend, scale) stays the
     engineer's after handoff, per [[0023 nothing-locks-before-production]].
   - **Register receipt at the door**: the Preconditions register gate, re-run at the start of each
     round — a newly load-bearing `unverified` assumption gets pressure-tested first or a
     conscious-acceptance receipt on the dashboard. Warn, never block; the receipt is the point.
7. **Provenance honesty** (if starting from a starter app): track kept-vs-built; every "I built this"
   claim must be literally true against the source.
8. **Record** build-shaping decisions (what the spec cut or reshaped, what was inherited, what a
   round's feedback superseded). Link `00 Dashboard.md` to the repo path.
9. **Update `00 Dashboard.md`** — round-aware, like `research`. While the loop is open, `stage = build`
   and the Current stage line names the round in free prose — "build — round 2" — no schema change and
   no new enum value (CONVENTIONS). Next step points at the current round's review or the next round's
   specs; flip next = compile-spec only at loop closure (step 10).

   **At this round's close, run the utility check** ([[0030 utilities-push-dont-pull]]): refresh the
   harvest-debt standing line (`Harvest flags pending: N · last crossing: <date | none>`) on
   `00 Dashboard.md`; if undistilled flag-debt has crossed ~5 — or the user is closing the build and
   the project is going `done` — **offer** a `design-studio-harvest` crossing; and if
   `Studio Wiki/log.md`'s last `lint` is older than ~7 days, **run** `design-studio-wiki-lint`'s
   mechanical pass (semantic proposals still queue for the user). Skip silently when no `Studio Wiki/`
   exists yet.
10. **Loop closure — the human's call.** Present the round: the running prototype, the exported
    feedback, and the gate results. The skill may *advise* sufficiency — "I believe this is enough; the
    open rough edges are X and Y" — but sufficiency is risk acceptance, which belongs to the user as
    the risk-acceptor (the same rule `research` closes on). Outcomes:
    - **Another round.** The exported "Copy feedback" (step 5) and any gate findings become the next
      round's specs — loop back to step 1.
    - **Close.** The user moves attention on — to `compile-spec` for the handoff render, or an
      **evaluate round** back in `research` to test the prototype against the success criteria.
      Nothing "locks" — this is the user deciding attention moves, reversible and recorded, per
      [[0023 nothing-locks-before-production]]. Update `00 Dashboard.md` (next = compile-spec, or an
      evaluate round).

## Handoff
**Build is where the pipeline ends** ([[0028 compile-spec-is-a-render-utility]]): "done" is the user
moving attention on, not advancing to a next stage. From here, on demand: `design-studio-compile-spec`
for the audience-shaped **handoff render** once the user calls the build enough (a render utility now,
invoked when you need it, not a stage the project walks into) — or, to test the built thing, back to
`design-studio-research`'s **evaluate** move (users or expert review) and its **reconcile** move
(decision log vs. shipped reality → `Drift Ledger.md`), per [[0027 validate-dissolves-6-stages]]. A
finding an evaluate round surfaces that a build round can fix loops straight back here; one that
invalidates a decision supersedes it.
