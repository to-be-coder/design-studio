# Changelog

All notable, user-visible changes to the design-studio skills are documented here.

## Unreleased

### Changed

- **A parked call leads with its ask.** The Needs-you ruling card was burying its own question
  under the full case. Each parked entry in What's Worth Building now opens with an `ask:` line (one
  plain sentence naming the decision and what a yes takes), the canvas leads with it, the accept and
  reject buttons sit right below it with a one-line explainer, and the proposal's full case (its
  verbatim words, both sides, receipts) folds behind a "Show the full case" toggle.
- **The loop survives restarts and shows its work** (vault decision 0038). The state model is
  untouched; the runtime around it grows up. The server now resumes unfinished work when it starts:
  stale locks clear, queued review batches and interrupted loops pick themselves back up, and a
  still-writing spawn from an old run blocks resume until it exits. The controller closes a queued
  batch itself when it says nothing new (dispositions only, every one matching the recorded verdict):
  no spawn, just the done marker, the app's third bounded vault write. Everything else drains in one
  recorder invocation, oldest first, each batch fully committed before the next opens. A
  `.loop-progress` heartbeat rides beside the lock: the banner shows what is running and for how long,
  and What's Worth Building refreshes itself when the fence moves, so a recorded card can no longer
  sit looking clickable. And inside a research round the default shape is one read-only investigator
  per open question in parallel, the main thread staying the only writer and grader.
- **A click is a verdict, and every card records itself** (vault decision 0037). The review
  surface loses its last batch ceremony: the bottom "Record review" bar is gone, and each candidate
  card gets its own Record verdict button (select a verdict, optionally add words, record), the
  same immediate pattern as Record answer and Record ruling. The headless-verdict law is amended to
  match: when the human typed words those are the quotable span; when she only clicked, the review
  block's own transcribed line is the span and the recorder quotes it marked "chosen by click; no
  words typed". A reshape ruling still requires her typed words. This unsticks click-only review
  blocks the recorder previously (and correctly, under the old wording) refused to transcribe.
- **One continuous cycle** (vault decision 0036). Three pauses die. Creating a project now chains
  the debrief seed straight into the research loop (no Run button; the first stop is two dry
  rounds or the round cap). A 🔴 moment (framing lock, framing departure, directions pick) still
  never gets decided headlessly, but it no longer stops the loop: it is recorded as a `proposed`
  parked decision, rendered in What's Worth Building's Parked section, and the rounds continue
  (the in-flight status line now carries `parked K`; `parked-decision` and `review: awaiting` are
  legacy-parse-only). Every review submission, verdicts-only included, chains a fresh research
  invocation (a batch that adds nothing converges again in one cheap round). And every project
  accepts new input at any stage, including build: an "Add input" control in the canvas writes the
  text verbatim (with a provenance header) into `02 Research/_inbox/` via a new
  `/api/projects/input` route, the app's second bounded vault write, and the loop runs, sorting it
  into the ledger like any other evidence. The floating loop banner is removed: the canvas lands on
  What's worth building anyway, so the sidebar's review pill and the home-card badge carry the
  needs-you signal without a third overlay.
- **What's Worth Building is the single human review surface** (vault decision 0035). Everything
  needing the human funnels into `What's Worth Building.md`: parked 🔴 calls (framing departure,
  directions pick, route call: research now parks them as `proposed` decisions, and the dashboard's
  Awaiting-you section is gone), the research-exhausted questions (the ledger's Human agenda
  section is gone; the render pulls each entry's ask: field), and every candidate, each carrying a
  sticky `W<N>` id minted in the recommendation decision's new Candidates table. The human triages
  each candidate Build now / Backlog (with what unblocks it) / Don't build; structure,
  design-system, build, and compile-spec consume ONLY the human-confirmed Build now set (empty set
  warns and points back to review, never blocks). In the canvas, the WWB pane grows a review band:
  verdict buttons per proposed entry, answer boxes per question, and a ruling card for a parked
  framing departure that requires your own words plus an explicit confirm; one batch submits to a
  new `/api/projects/review` route (the answers-only route is retired). The app's one bounded vault
  write appends the batch verbatim as an anchored block in the ledger's new Review log region; a
  headless recorder (debrief's review-ingestion mode) transcribes it into the decision log, citing
  the block. The headless-verdict law is amended precisely: a headless spawn may claim a human
  verdict only when the decision cites the authorized, present, unaltered block (content hash held
  by the controller) and quotes words that occur literally inside it; both validators share one
  frontmatter-scoped predicate and quarantine everything else. Reviews are stamped with the WWB
  round they reviewed (a stale batch is rejected and re-surfaced), partial reviews are first-class,
  Backlog stays supersedable, and a ruled entry whose evidence later moves gets a mechanical
  "confirmed, evidence moved: re-rule" flag.
- **The Understand loop is an exhaustion engine** (vault decision 0034). The loop is rebuilt around
  two artifacts and one inversion. `Knowns & Unknowns.md` is the new per-project ledger (one
  monotonic `L<N>` id space): debrief seeds it from the framing, and no question is pre-labeled
  "ask a human". Research attempts every open unknown, round after headless round, spawning new
  unknowns as it answers old ones, until it provably runs dry: per-question latch after M=2
  no-progress attempts, loop-level convergence after K=2 dry rounds, hard cap C=6 rounds per
  invocation, and the loop parks (never proceeds) on any 🔴 (framing lock, framing departure,
  directions pick), writing an "Awaiting you" list on the dashboard. Only exhaustion hands humans
  an agenda. `What's Worth Building.md` replaces `Agreements.md` at the project root: a render of
  `Decisions/` annotated by the ledger (Build / Don't build / Implied but unruled / open unknowns
  blocking a verdict), recompiled every round; every reason carries a quote-plus-link receipt (a
  verbatim span that must occur literally in its target, checked by the new
  `receipt-verify.mjs`), and a clause resting on a non-verified load-bearing known gets a
  mechanical `ASSUMPTION:` prefix. `Clarifications.md` is absorbed into the ledger;
  `Assumptions & Risks.md` becomes a render of the ledger's load-bearing knowns (same filename and
  table shape, so build's register gate is untouched). Progress is strict: only a distinct unknown
  reaching answered with a conforming receipt counts; answered is sticky, contradictions open a
  superseding id. Rounds commit through anchored round-log blocks with the dashboard status line
  written last as the crash fence, in a closed colon grammar
  (`Current stage: research: researching: round N, ...`). A headless spawn may never write
  `authored_by: user` or `status: decided`. The web Canvas lands on What's Worth Building as the
  hero doc, adds a Questions-for-you queue and the ledger with state/grade chips and receipt
  links, shows loop telemetry (round counter, dry-streak pips, terminal banners, home-card
  badges), and the runner becomes a single-flight spawn-per-round loop controller with an
  answer-and-resume route so human answers re-enter the loop without the app ever writing the
  vault.
- **A prototype-review gate in `build`** (vault decision 0033). Build's round close gains a fifth
  round-closing gate that drives the *running* prototype in the Canvas instead of only reading the
  code: capture every screen across its states (empty, loading, error) and both themes (light and
  dark) and read them against `DESIGN.md` as the written register (approve on "it belongs," not on
  "it renders"), then verify real affordance (every interactive element reachable and clickable, not
  clipped, not zero height, not covered) and no console or runtime errors, because screens can lie
  about interactivity. Scoped deliberately to prototype quality, not production hardening: no soak
  tests, no load tests, no formal proofs; concurrency, a real backend, and scale stay the engineer's
  after handoff. `design-system`'s specimen review picks up the same state-matrix discipline,
  rendering each candidate language across light, dark, and the key states and critiquing before the
  language is committed, not just the default view.
- **Create a project from the dashboard.** A "+" in the Projects header opens a modal to seed a
  project from its first brief (name, optional client, the brief text). Saving `POST`s to a new
  `/api/projects` route that scaffolds the vault folder — `00 Dashboard.md` (the design-project
  record) and `01 Brief & Problem.md`. By default the modal then hands off explicitly — "Run
  `/design-studio-debrief` to frame this" — with an Open-project shortcut. **Opt-in auto-run:** set
  `DESIGN_STUDIO_AUTORUN_DEBRIEF=1` and Create additionally fires `design-studio-debrief` **round 1**
  as a headless background pass (`claude --print`, gated behind the flag so it never fires in tests):
  it enriches the seeded folder in place with the restated problem (kept `proposed`), the rubric,
  provisional success criteria, the seeded risk register, and the clarification agenda — round 1 is
  autonomous, so the *client* loop (rounds 2+) still happens interactively. Runnable stages also get
  an on-demand **"Run <stage>"** control on their board (same opt-in flag) — currently `research` and
  `structure` — that fires that stage's skill headless via `/api/projects/run`. While any run is in
  flight, the canvas sidebar **pulses a dot** on the running stage's row (polled via
  `/api/projects/status`), independent of which board is focused, and the board refreshes once it
  lands so the new docs appear. Output logs to `<project>/.<stage>-run.log`. This is the web app's
  first vault *write*; the rest stays the skills' job.
- **The Canvas is focus-only, and the studio no longer lists itself.** The dashboard hides the
  studio's own dogfooding projects (`design-studio` — the meta-project — and `design-studio-web` —
  the Canvas dashboard it was built through) from the web UI: dropped from the projects index and
  their canvas routes 404. The hidden set lives in one place (`lib/hidden-projects.ts`); the vault
  reader stays faithful and still lists them, so this is a presentation decision. Every project now
  displays by its **short name** — the part before the " — " subtitle in its dashboard H1
  ("Thunderbolt — Agent Access & Workspace Rethink" → "Thunderbolt") — across the index, canvas
  header, and sidebar; the full name stays intact in the vault and in exports. The projects index is
  now a compact list — name + stage + client · route · status per row, with each project's
  description paragraph dropped. The doc reader's separate contents column is folded into the sidebar:
  a doc-mode stage (debrief/research) is an **accordion** whose documents nest under it, and picking
  one shows it in the reading pane, which now fills the freed width. The Canvas
  also loses the "All stages" comb overview and its sidebar button — it now shows one board at a time,
  opening on the first stage (Debrief, which reads as a document). Chrome tidy-up: the **Tokens**
  live-editor button rides only on the Build board (its overrides restyle the prototype frames, which
  only exist there), and the light/dark toggle moved from the top-right into the sidebar footer. Web/UI
  only — no skill, schema, or pipeline change; the pipeline stays five stages.
- **New `design-studio-design-md` utility skill; the DESIGN.md toolchain is now portable** (vault
  decision 0032). A standalone skill to safely amend or validate a DESIGN.md in *any* repo (not just
  this one): read the vendored spec, edit the one canonical file, classify additive-growth vs a
  reshape (drift, wants sign-off), lint, re-export tokens so code can't drift, diff, note it. The
  four zero-dependency scripts moved `web/scripts/` → `skills/design-studio-shared/scripts/` so they
  install beside the skills and run in a client's prototype repo; every skill reference and
  `web/package.json` repointed. Utilities go from four to five (setup, harvest, wiki-lint,
  compile-spec, design-md); the pipeline stays five stages.
- **The pipeline's grammar is now law in CONVENTIONS** (vault decision 0031 — rethink close-out).
  Named once, up front, as a prominent early section: every skill is exactly one of three shapes. A
  **loop** is work that converges with a human in the middle (the Understand loop `debrief` ⇄
  `research`, and `build`), closed only by the human as risk-acceptor. A **stage** exists only where
  an artifact must precede its consumers (`structure`, then `design-system`, before `build`).
  **Everything else is a move or a render**, invoked on demand (research's moves, `compile-spec`'s
  renders, the wiki utilities). Nothing locks before production; every outcome is supersedable, and a
  new skill must justify which of the three it is before joining the spine. The rethink (0011–0031)
  closes with this entry.

- **Utilities push, don't pull — agent-initiated harvest, self-triggering wiki-lint** (vault decision
  0030). Remembering to run the wiki utilities was too much work to rely on, so they now act on vault
  state at their own close instead of waiting to be invoked. **No daemon** — the vault on disk stays
  the state; a utility self-triggers only at a moment a skill is already running.
  - **`harvest` is agent-initiated, human-reviewed.** The agent judges harvest-worthiness — a round
    close, a project going `done`, or undistilled flag-debt crossing a threshold (~5 flags in
    `Harvest.md`) — and drafts the candidate pages unprompted, then brings the user the existing
    page-by-page 🔴 crossing review. Only the *remembering* is removed: the sole-writer law, the
    one-way membrane, and the review gate are all unchanged (the agent decides *whether* to offer a
    crossing; the user still decides *what* crosses).
  - **`wiki-lint`'s mechanical pass is self-triggering.** A closing skill checks `Studio Wiki/log.md`'s
    last `lint` date and runs the mechanical checks — applying their fixes directly — when it's stale
    (~7 days). Semantic proposals (supersede, fork, age-out, retire, amend) still queue for the user.
  - **Harvest-debt visibility is a standing line.** `Harvest flags pending: N · last crossing:
    <date | none>` rides on `00 Dashboard.md` and on `research`'s report, kept current whenever a
    skill closes — the debt a project accrues is continuously visible, not discovered at close.
  - **The five pipeline stages each gained a closing utility-check line** (`debrief` / `research` /
    `structure` / `design-system` / `build`): at close, refresh the harvest-debt line, offer a harvest
    when flag-debt has crossed the threshold, and run wiki-lint's mechanical pass when stale — skipped
    silently when no `Studio Wiki/` exists yet. Setup and compile-spec are unaffected (already
    invoke-only). Docs only — no `web/` change (the standing line is free prose in the dashboard body,
    like the Current-stage line, not a schema field).

- **The pipeline is now 5 stages — `debrief → research → structure → design-system → build`.**
  `compile-spec` is an **on-demand render utility**, not a terminal stage. The stage-by-stage rethink
  closed out six rulings (vault decisions 0020, 0021, 0023, 0024, 0027, 0028):
  - **Understand is one loop, not two sequential stages** (0020). `debrief` (client/team
    conversation) and `research` (evidence) are the two poles of a single **Understand loop**, with
    `Agreements.md` the ledger between them. `reframe` and `scope-and-sequence` are gone: the reframe
    question is a forced section of every research report (a departure routes back through debrief's
    loop and supersedes the framing with the team's own words), and honest full scope lives in
    `Agreements.md` (four sections: Agreed / Decided against / Deferred / The full vision). `03 Scope.md`
    is retired; sequencing is human-authored, recorded in `Agreements.md`.
  - **`explore-directions` folded into `research` as a directions move** (0021). Research is now one
    orchestrator running **named moves** — desk sweeps, behavioral-data, pressure-test, interviews,
    and a **directions** move (fan out one subagent per candidate, sketch each data model, price
    build-AND-support cost so cost can disqualify, watch for the dissolving reframe, and let the
    **user** pick, 🔴). The heavier moves live in per-move reference files loaded only when the move
    runs (`moves/directions.md`, `moves/pressure-test.md`, `moves/interviews.md`), so the SKILL.md
    stays an index, not a junk drawer. `04 Directions.md` is retired — the menu lives in the research
    report, the pick in the decision entry, the settled state in `Agreements.md`.
  - **`converge` dissolves — nothing locks before production** (0023). The only real lock is shipped
    production code, so there is no commit ceremony: `Agreements.md` is always a living ledger, and
    moving on is the user deciding attention moves, reversible and recorded. Trap-check and the
    primary-contact standing line move into `research`; cut-recording and taste-pair capture ride on
    cuts wherever they happen in the loop; the **register gate now lives only at `build`'s door**.
  - **New `structure` stage — bones before skin** (0024). Between the loop and `design-system`,
    `design-studio-structure` drafts user flows + information architecture (🟡) from the accepted
    recommendation and `Agreements.md`, into `03 Structure.md` (filling the retired `03` slot).
    `design-system` and `build` both consume it; build's old flows/IA first step relocated here. The
    pre-build **PRD is a `compile-spec` render** invoked after design-system, not a stage.
  - **`compile-spec` becomes an on-demand render utility — 6 stages to 5** (0028). Reclassified from
    terminal stage to a **utility**, invocable at any moment to render the decision log for an audience
    (an early align one-pager, a why-first stakeholder spec, an eng-handoff, the pre-build PRD). A
    document is a projection of the record, not a milestone — **the pipeline ends at `build`**, and the
    handoff is a render you ask for. Its law is unchanged (a render of the log, never a second authored
    document), and `Agreements.md` stays the living client-facing state it projects. In `web/`,
    `compile-spec` moves from `STAGES` to `UTILITIES` in `schema.ts` (its `Spec.md` / `Align.md` /
    `Handoff.md` become on-demand artifacts, off the board spine); the `Stage` union drops `spec` and
    the `Utility` union gains `compile-spec`; and legacy `Compile spec` pipeline-log rows are tolerated
    as a utility mapping (kept, like `harvest`), not dropped.
  - **`validate` dissolves — 7 stages to 6** (0027). The stage that ran zero times in six projects is
    gone; testing lives where it actually happens. Its organs relocate: the visual-**drift check**
    becomes a **round-closing item in `build`** (the owned `design:diff` against the signed-off ref,
    run every round); **user testing and expert/heuristic review** become an on-demand **evaluate**
    move in `research` (open-ended usability test the user runs, or a Nielsen + cognitive-walkthrough
    + a11y expert review when no users exist); a new **reconcile** move in `research` checks the
    decision log against shipped reality and writes `Drift Ledger.md`; and the supersede **back-edge**
    is ratified as universal law — any finding from anywhere supersedes the decision it invalidates —
    not a stage. `05 Validation.md` leaves the artifact contract. The Canvas's feedback export, its
    comment toolbar, and `web/README.md` re-point their post-build consumer from a `validate`
    loop-back to research's evaluate/reconcile moves.
  - **Docs, schema, and the Canvas track the new shape.** CONVENTIONS/CLAUDE/README/ARCHITECTURE go
    to 5 stages with a `structure` row, `compile-spec` moved into the utility list, and a redefined Lite
    route (a short Understand loop → build, inserting design-system when the look matters, with
    compile-spec on demand — a judgment call). `web/src/lib/schema.ts` drops the
    `directions`/`converge`/`validate` StageDefs and gains `structure` (output `03 Structure.md`), then
    moves `compile-spec` from `STAGES` to `UTILITIES`; the `Stage` union and `normalizeStageName` follow,
    so legacy `directions`/`explore-directions`/`converge`/`validate` pipeline-log rows drop silently
    (same tolerance as `verify`) while `compile-spec`/`spec` rows are kept as a utility mapping. The
    Canvas's three-phase grouping loses its Decide members and becomes **Understand → Build**, with the
    **Decision Stream** rendered as its own standalone section.

- **On-demand renders lose their numbers** (vault decision 0029 — rethink close-out). Numbering now
  belongs to the pipeline's spine artifacts only — `00 Dashboard` · `01 Brief & Problem` ·
  `02 Research/` · `03 Structure.md`, contiguous. The compile-spec render `06 Spec.md` becomes
  **`Spec.md`**, consistent with the already-unnumbered `Align.md` / `Handoff.md` / `Drift Ledger.md`.
  Swept across `skills/` (compile-spec SKILL.md), CONVENTIONS' folder contract, ARCHITECTURE, and the
  `compile-spec` utility output in `web/src/lib/schema.ts`. Retired-artifact names
  (`03 Scope.md` / `04 Directions.md` / `05 Validation.md`) keep their numbers as history.

- **`build` runs as a loop** (vault decision 0026 — build stage walk). Build was the last one-shot act
  in a pipeline whose every other working surface became a convergence loop, so it now runs in
  **rounds**: per-feature specs → parallel agents build (every prompt opens "read `DESIGN.md` first")
  → the prototype runs live in the Canvas for review (comment/tweak) → the **four gates close the
  round** (empty/error/loading states + edge cases + accessibility; real content; `DESIGN.md` token
  consistency; the register receipt at the door) → the Canvas's **"Copy feedback" export becomes the
  next round's specs**. Rounds repeat until the user calls enough — sufficiency is the human's, the
  risk-acceptor, the same rule `research` closes on; the dashboard names the round in free prose
  ("build — round 2"). The **content gate is ratified as a defect class** (placeholder text is a bug
  like a hardcoded hex); spec-first, craft-divergence, the single-copy `DESIGN.md` move,
  provenance-honesty, and the register gate (the pipeline's only one, warn-never-block) are all kept.
  `web/README.md` now names build's next round as the "Copy feedback" export's consumer (it read as a
  `design-studio-validate` loop-back only); no `web/` source change is needed — the export document
  already serves both consumers.

- **The DESIGN.md format is now the studio's own** (vault decision 0025 — design-system stage walk).
  The visual contract no longer depends on alpha software fetched at runtime (a dependency that
  failed three ways: a broken `spec` command, `npx` blocked in both live runs so the lint gate never
  fired, and a vocabulary that could not express motion). The stage is otherwise kept whole —
  derive-before-invent, specimen boards, user sign-off, single-copy-moving-home all intact.
  - **Vendored spec.** `skills/design-studio-shared/DESIGN-SPEC.md` — the owned format definition,
    forked from [google-labs-code/design.md](https://github.com/google-labs-code/design.md)
    (`docs/spec.md`, provenance-pinned). Skills read it beside `CONVENTIONS.md`; the design-system
    stage's step-1 runtime spec-fetch (`npx @google/design.md spec` + fallback URL) is gone.
  - **Owned lint.** `web/scripts/design-lint.mjs` (zero-dependency, `npm run design:lint`) replaces
    the `npx @google/design.md lint` gate — real everywhere for the first time. It checks structure
    (required sections in the fixed order, no duplicate heading), token-reference resolution,
    motion/floor syntax, and WCAG contrast against the declared floors (borrowing the Canvas's inline
    contrast math from `web/src/lib/color.ts`).
  - **Motion vocabulary** — the first deliberate extension: a `motion` token group (`duration` /
    `easing` / `transition`) plus a component `transition` sub-token. Retires expert finding **V9**.
  - **Accessibility as an input** — contrast floors are declarable up front in the Colors section
    (`contrast:` block), so candidate token sets are drafted *inside* the constraint rather than
    checked after. Retires **V8**.
  - **Owned export + diff** (0025 clause 5 — the last two CLI touchpoints, now retired). `build`'s
    token export is `web/scripts/design-export.mjs` (`npm run design:export`): `DESIGN.md` → CSS
    custom properties, every leaf a `--group-key` variable, references resolved, state variants and
    motion included, with a documented hand-derive fallback when no node is available. `validate`'s
    drift check is `web/scripts/design-diff.mjs` (`npm run design:diff`): it compares two versions'
    resolved tokens — a working file vs a `git show` ref — and reports added/removed/changed. Both
    share the lint's parser via a new `web/scripts/design-md.mjs`. With these, the pipeline no longer
    invokes `npx @google/design.md` anywhere; the whole `lint` / `export` / `diff` toolchain is owned
    and runs on plain node.

### Removed

- **`verify` is no longer an ordinal stage — folded into `research`; the pipeline is now 10
  stages.** Per vault decision 0018 (following 0017's research-as-a-loop ruling): the adversarial
  act survives as an on-demand **pressure-test** move inside `research` (refute-missioned
  subagents against primary sources, defaulting to `unverified` when unsure), targeted evaluative
  Mom Test studies merge into research's existing on-demand interview guide (aimed at one
  load-bearing assumption instead of the open unknowns broadly), and the register gate (four
  states + a "we accept this risk because…" acceptance rationale) relocates downstream to
  `converge` and `build` as a warn-never-block receipt before locking the spine / starting the
  build. Every stage after research shifts down one ordinal (`reframe` 4→3 … `compile-spec`
  11→10). `skills/design-studio-verify/` is deleted. The Canvas's assumption register and
  `rests_on` blast-radius graph are **not** deleted — they re-home into research's region, still
  fed by `Assumptions & Risks.md`; the dashboard parser keeps tolerating legacy `verify`
  pipeline-log lines from projects that ran the old pipeline (dropped silently, never crashed or
  mis-attributed).

### Added

- **The Canvas: `web/` rebuilt from scratch as one pannable board.** A project's whole design
  flow — framing pane (brief beside restated problem), research, the assumptions register with a
  drawn `rests_on` blast-radius graph, scope, directions, the Decision Stream (the entire log as
  one readable page, supersede chains drawn, **In their words.** pull-quotes), a design-system
  board of living specimens with inline WCAG ratios, a component board with live instance counts
  and an "uncodified" row, and live prototype device frames behind a same-origin proxy — ends at
  the running prototype. Comment mode with element/page granularity, a token-constrained tweak
  panel with a scope selector (this instance / every component / the token everywhere), and a
  Copy-feedback export carrying the smallest-reusable-unit routing protocol
  (token → component → instance) shaped as a `design-studio-validate` loop-back. Tokens mode
  edits the prototype's DESIGN.md values live across every frame. The board updates in place via
  SSE when a skill writes the vault. Fresh editorial visual language in `web/DESIGN.md` (the
  traffic-light dots are retired); the pipeline still renders from the single schema module; the
  vault stays read-only. Built in eight verified slices (from a one-shot build spec, since
  removed) plus an adversarial QA pass; 43 E2E tests, visibility-asserted, green twice consecutively.

- **Decision provenance for 🔴 stages.** Decisions carry `authored_by: user | skill`; a 🔴 decision
  is only `authored_by: user` when it quotes the user's verbatim words under **In their words.**
  The 🔴 ritual is now an explicit two-phase, two-turn protocol (ask and end the turn; record only
  after the user replies), and "you decide" is answered by decomposing into narrow either/or
  questions rather than repeating. `wiki-lint` gains a decision-provenance integrity check, and
  skipped precondition warnings now leave dated **override receipts** on the project dashboard.
- **Humans enter earlier.** `research` gains an optional **Primary (generative)** sweep (the skill
  drafts the interview guide; the user runs the conversations) and a closing **Synthesise** beat
  (provisional persona/JTBD + as-is journey) feeding `reframe`. `converge` gains a primary-contact
  gate: zero user contact must be recorded as an accepted risk — a receipt, never a block.
  `validate` gains an **early mode** for testing the concept or flows before build. `build` now
  leads spec-first with a flows/IA layer, adds a **content gate** (placeholder text is a defect)
  and a **craft-divergence** beat (2–3 takes on the core interaction). `debrief` splits success
  criteria into shipped outcome vs the in-session signal a prototype test can measure.
- **Taste as knowledge.** The wiki page contract gains a `taste` entity — a kept/cut pair with the
  user's quoted why — and `converge` flags cut darlings as taste-pair candidates. `harvest`'s
  write discipline now states the measured power law: a handful of pages do the cross-project
  work, so the discipline is refusal.
- **E2E smoke suite for `web/`.** Playwright tests against a hermetic fixture vault, wired into
  `web-checks.yml` — visibility assertions throughout (the Wall's `[hidden]` lesson, re-learned on
  purpose): nav, portfolio card, project record, the decision supersede chain, and the 10-stage
  pipeline, each with zero-console-error checks.

- **`ARCHITECTURE.md`** — a map of how the product actually works: the four places files live, the
  two pointers skills resolve, the six file-based channels skills communicate through, the
  stage→artifact table, the 🔴 ritual, the wiki membrane, and the invariants a contributor must
  not break. Linked from the docs map in `CLAUDE.md`.

### Fixed

- **Hard-wrapped vault markdown no longer renders broken mid-sentence.** The ledger and What's
  Worth Building parsers read line by line, so a sentence wrapped at a column width parsed as
  several fragments, each rendered as its own paragraph. A shared soft-wrap pass
  (`web/src/lib/soft-wrap.ts`) now glues continuation lines back onto their bullet, label, or
  paragraph before parsing: indented lines continue a label's value, an unindented line after a
  label starts a new paragraph, and unknown `key:` metadata keeps its own line. The body
  collectors also keep blank lines, so separate paragraphs stay separate instead of fusing.
- **Malformed vault files no longer reappear as blank decisions.** `gray-matter`'s content-keyed
  cache stores its file object *before* parsing completes, so a frontmatter YAML error was only
  skipped on the first read per server lifetime — later reads silently returned the half-built
  cached object. All parse sites now bypass the cache (explicit options) and the previously
  unguarded stage-output reads got the same skip-not-crash guard. Caught by the new smoke suite.

### Changed

- **The Studio Wall is replaced by the `web/` dashboard.** The Next.js dashboard supersedes the
  zero-dependency wall: it renders every stage's output, a knowledge graph, and the decision log
  with its supersede chains, all from a single pipeline definition in `web/src/lib/schema.ts`.
  `.github/workflows/web-checks.yml` runs the type check and production build on every change
  under `web/`.

### Removed

- **`wall/`** — the ambient dashboard, its `⌘K` control surface for running non-interactive
  skills from the browser, its Playwright smoke suite, and its public design record
  (`wall/design/`). Skills are now copied into Claude Code rather than run from the browser.
  Recoverable from history at the commit preceding this change.

### Added

- **Committed wall smoke suite + CI** — `wall/test/wall.spec.js` (Playwright, contributor
  tooling only; runtime dependencies stay zero) drives the real server and UI against a
  throwaway vault with a stubbed CLI: the token gate with *visibility* assertions (the class of
  bug that shipped), ambient render, ⌘K palette, drill-ins, the confirm-to-run stream, and the
  API refusals. `.github/workflows/wall-checks.yml` runs the type check and the suite on every
  change under `wall/`.

### Fixed

- **Wall overlays now actually dismiss** — the token gate, ⌘K palette, drill-ins, and toasts
  toggle the `hidden` attribute, but the stylesheet's own `display` rules overrode the
  browser's `[hidden]` default, so the token gate never left the screen and overlays rendered
  permanently. One reset rule (`[hidden]{display:none!important}`) restores the intended
  behavior everywhere. Also hardened the server: static-file prefix guard now requires a path
  separator, and the run stream no longer writes to a response the client already closed.
- **`explore-directions` wrote an out-of-enum dashboard value** — it told the dashboard
  `stage = explore-directions`; the CONVENTIONS enum (which the portfolio Dataview/Bases
  queries filter on) says `directions`.

### Changed

- **Typed JS for the wall** — shapes in `wall/types.d.ts`, JSDoc annotations enforced by
  `tsc --noEmit` (strict) as a contributor check gate. Zero runtime dependencies and the
  zero-build `node wall/server.js` promise unchanged (decision 0006).
- **Docs consistency pass** — README numbers `compile-spec` as stage 11 (matching its
  "Eleventh stage" description) and uses the repo's real clone URL; the wall README lists
  decisions through 0006, explains why the specimen boards show candidate palettes rather than
  the shipped pink, and carries the `tokens.css` regeneration recipe — which now stamps a
  do-not-hand-edit provenance header into the generated file; CONVENTIONS documents
  compile-spec's `Align.md`/`Handoff.md` outputs, the wiki log-line summary suffix, and the two
  mechanical wiki writers beside harvest (setup's starter seeding, wiki-lint's approved fixes),
  with the starter wiki's `CLAUDE.md` aligned; `build`'s description now says it warns and asks
  (never hard-blocks) when upstream understanding is missing; the wall's design record gains
  the citable "Guiding principle" section its decisions ladder to.
- **Docs reconciled to the shipped Canvas.** `web/README.md` and root `ARCHITECTURE.md` still
  described the pre-Canvas dashboard — `/project/<slug>`, `/skills`, a knowledge graph,
  `POST /api/run` spawning skills behind copy-command buttons — none of which exist in the app.
  Both now describe it as built: the Canvas board (`/canvas/<slug>`, the Understand/Decide/Build
  spine, focus mode, the Decision Stream, the assumption graph, design-system and component
  boards, and Comment/Tweak/Tokens prototype frames behind a same-origin proxy),
  `prototypes.local.json` plus the Render control gated by `DESIGN_STUDIO_ALLOW_RUN`, vault
  resolution, and `npm` throughout (matching the committed `package-lock.json`, not `pnpm`). Per
  the project's decision that shipped code is canonical, the docs reconcile to the app — not the
  other way round.
- **`debrief` reshaped as a client-convergence loop.** The surfacing core (embedded scope decisions
  + hidden rubric) is unchanged, but its confirmation loop now spans 1..N meetings instead of one
  self-directed pass: each round drafts a **clarification agenda** (`Clarifications.md`) — every
  surfaced unknown phrased as a client-friendly question to carry into the next client/PM meeting —
  then retires answered questions with their answers recorded, sharpens the restatement, and
  surfaces what's newly unknown. The framing decision (`0001`) stays `proposed` across rounds and
  flips to `decided` only when both sides agree, quoting the client's verbatim confirming words
  (relayed by the user) under **In their words.**; projects with no client are a one-round loop
  confirmed by the user, so nothing hard-blocks. A living `Agreements.md` — everything
  agreed-to-build and decided-against in one-liners linking into `Decisions/` — refreshes at the
  close of every round; it's an explicit render of the decision log, never a second source of
  truth. Implements vault decision 0016 from the pipeline stage-by-stage rethink.
- **`research` reshaped as a convergence loop ending in a recommendation.** The four desk sweeps
  are unchanged, but each round now opens with **intake** — list `02 Research/_inbox/`, read what's
  there, move it to where it belongs in `02 Research/` with a provenance note, chat-pasted material
  written to a file before it's used as evidence — and gains an optional **behavioral-data sweep**
  that drafts specific, fetchable requests keyed to open questions rather than fetching itself.
  `Synthesis.md` becomes the round's **living research report**: findings, a "what should we be
  building?" recommendation, the named assumptions it rests on, a what's-lacking section with
  concrete data requests, contradiction flags routed by flavor (vs. an earlier finding / vs. a
  recommendation assumption / vs. something the client said — the last routed into
  `Clarifications.md`'s agenda), and an append-only dated round log. The recommendation is recorded
  as a `proposed` decision, `authored_by: skill` — research never promotes it to `decided` itself —
  and a changed recommendation supersedes the prior one rather than editing it in place; per
  CONVENTIONS, only the main thread writes the decision file, never a sweep sub-agent. Interview
  guides now draft only on explicit user request, in Mom Test format (past behavior and specifics,
  never a pitch, compliments/hypotheticals treated as bad data), opening with at least three named
  learning goals each traced to a specific unknown. Loop closure stays the user's call — the skill
  may advise sufficiency by naming the open unknowns and their closing cost, and on close, residual
  unknowns are marked consciously accepted in the register or handed to `verify`. Implements vault
  decision 0017 from the pipeline stage-by-stage rethink.

## v1.1.0 — 2026-07-02

### Added

- **Studio Wall** — an ambient dashboard and control surface over the vault, built through the
  pipeline itself: public design record in `wall/design/` (brief, decisions 0001–0005 including
  a superseded language pick, the two specimen boards), visual contract in `wall/DESIGN.md`
  (Bloom — single sci-fi-pink hue, warm plum-black, no pure white/black; lints clean including
  WCAG contrast, with the 8px instrument-dot cap encoded as component tokens). Zero-dependency Node server (127.0.0.1 +
  bearer token + Origin check; two-skill allowlist — `wiki-lint` report and `harvest` draft
  preview; one run at a time, streamed live, logged). Zero-build front end: ambient by default
  (no visible buttons), ⌘K command palette for every secondary action with press-Enter-again
  confirm, project drill-ins, handoff cards for 🔴 stages, designed empty/offline/no-CLI states,
  20+-project overflow. Playwright-tested end to end (16 checks + security curls).

## v1.0.0 — 2026-07-02

First shippable release: the full pipeline, the visual contract, studio memory, and onboarding.

### Added

- **design-system stage** (#1) — new eighth pipeline stage codifying each project's visual
  language as a `DESIGN.md` ([google-labs-code format](https://github.com/google-labs-code/design.md)):
  derived from the client's brand or chosen from rendered HTML specimen boards; lint gate
  (structure + WCAG contrast) plus user sign-off. `build` consumes it token-first (export to
  Tailwind/DTCG; every parallel agent reads it before touching UI), `validate` diffs it for drift,
  and `compile-spec` hands it to engineering with a token export. Pipeline renumbered to 11 stages.
- **Studio Wiki** (#2) — compounding studio memory beside the projects: hub-and-spoke with a
  one-way membrane (projects read the wiki freely, write to it only through a reviewed harvest,
  and never read each other). Per-project `Harvest.md` flag inboxes capture continuously;
  `design-studio-harvest` distills deliberately (close-out / milestone / backfill / derive /
  ingest modes) and is the wiki's only writer; `design-studio-wiki-lint` prunes contradictions,
  duplicates, orphans, stale claims, coverage gaps, aging sparks, and harvest debt. Six pipeline
  skills gained read/write hooks; a starter wiki (seeded from this repo's own build) plus a
  wiki-local `CLAUDE.md` schema file ship in `design-studio-shared/starter-wiki/`.
- **MIT license** (#3).
- **First-run onboarding** (#4) — `design-studio-setup`: idempotent vault find-or-create (searches
  for existing Obsidian vaults), writes the `~/.design-studio-vault` pointer every skill resolves,
  scaffolds the Design Studio home, seeds the starter wiki, and hands off to the first project.
  CONVENTIONS gained the vault-resolution rule (no more hardcoded paths), the repo gained a root
  `CLAUDE.md` so it onboards itself when opened in Claude Code, and the README quickstart became
  three steps.
- **Release workflow** — `.github/workflows/release.yml`: creates a tag + GitHub release from the
  Actions tab, with notes extracted from the matching CHANGELOG section.
