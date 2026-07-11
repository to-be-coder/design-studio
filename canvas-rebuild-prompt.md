# Build: Design Studio Canvas — the entire design flow as one board

Replace `web/` in this repo from scratch. The new app is a single idea executed
well: **a project's whole design journey — research to prototype — rendered as
one pannable, zoomable canvas**, like a Figma board where the frames are the
real artifacts and, at the end of the flow, the real running prototype. The
reviewer reads the flow left-to-right, then marks up the live prototype with
feedback constrained to its design tokens, and exports an AI-actionable block
that feeds a `design-studio-validate` loop-back.

## Discovery first (read-only, before any code)

1. Resolve the vault: `~/.design-studio-vault` (one line, absolute path).
   Projects live in `<vault>/Design Studio/<slug>/`.
2. Read `skills/design-studio-shared/CONVENTIONS.md` — the vault contract:
   folder layout, dashboard YAML, decision frontmatter (including
   `authored_by` and the **In their words.** quote block on 🔴 decisions,
   `rests_on`, `supersedes`/`superseded_by`), the stage list.
3. Read the old `web/src/lib/schema.ts` before deleting it — the pipeline
   definition (stages, phases, autonomy, stage→artifact map) is law and must
   be carried over into the new app's single schema module. The pipeline is
   defined ONCE; every surface renders from it; nothing hardcodes it.
4. For prototype embedding: each project's `00 Dashboard.md` frontmatter has
   `prototype_repo`. A prototype's design tokens live in the YAML front
   matter of the `DESIGN.md` at that repo's root (google-labs design.md
   format: `colors` / `typography` / `spacing` / `rounded` / `components`).
   Parse those — they are the ONLY values the tweak system may ever offer.
   `prototype_repo` may be a local path or a remote URL: parse tokens from
   the local checkout when one exists; when only a remote URL is present,
   frames may still embed a reachable dev server but Comment/Tweak/Tokens
   degrade honestly (no token source → say so in the frame strip).

## 0. Ground rules carried over from the old app

- Vault access is **read-only**. The app never writes vault content.
- Every visual value in the app derives from a new `web/DESIGN.md` you author
  as your first act (see §1). A raw hex or `oklch()` literal in a component
  is a defect.
- Parse frontmatter with gray-matter **always passing explicit options**
  (`matter(raw, {})`): its content-keyed cache stores half-built objects for
  malformed YAML, so bare `matter(raw)` silently returns broken objects after
  the first read. Malformed files are skipped with a warning, never crash.
- CI contract: `npx tsc --noEmit` and `npm run build` must pass, plus a
  Playwright smoke suite against a hermetic fixture vault in which every
  assertion that can be a visibility assertion is one (`toBeVisible`, not
  status codes) — hidden-but-present UI has shipped here before.
- **"From scratch" means the surface, not the substrate.** The old app's
  vault data layer (`web/src/lib/vault.ts` patterns: gray-matter with
  explicit options, skip-on-malformed, React `cache()`, pointer/env
  resolution) is proven and recently bug-fixed — lift it and extend it;
  do not re-derive it. Same for the existing fixture vault under
  `web/test/fixtures/vault/` if present: extend, don't recreate. Derive
  before invent; the rebuild's newness budget is spent on the canvas.
- **The board is live.** Watch the vault (fs.watch or chokidar) and push
  changes to the client (SSE or a websocket): when a skill writes a new
  decision or artifact mid-session, the affected card updates in place
  within a few seconds — run `converge` in the terminal, watch the
  decision land on the board. Full-page reloads don't count.

## Build order — eight verified slices, each one a working app

Do not attempt this spec breadth-first. Build in this order; after every
slice, `tsc` + build + the smoke tests for everything built so far are
green, and the app is usable at that depth before the next slice starts:

1. **Substrate** — data layer lifted and extended (all artifact types,
   decisions with `authored_by`/`rests_on`/supersede links, the register,
   DESIGN.md token parsing), fixture vault extended, `web/DESIGN.md`
   authored and linted. No UI yet beyond a debug dump.
2. **The readable board, static** — §2 index + §3 geometry + §4 cards +
   the framing pane, no pan/zoom (plain scroll). "Every step visible,
   readable" must already be true here; if the board isn't worth reading
   at this slice, panning won't save it.
3. **Decision Stream + assumption graph** (§5) — connectors drawn.
4. **Pan & zoom** (§8) — with the performance laws; the sidebar's keyboard
   index lands here too.
5. **Design-system board** (§6) — specimens, contrast, candidate boards.
6. **Prototype frames** (§9) — proxy, isolation, live board updates.
7. **Comment + tweak + export** (§10–§12) — including scope + routing.
8. **Component board** (§7) + Tokens mode (§13) — instance scanning last;
   it depends on everything before it.

If time or context runs out mid-build, a finished slice N is the
deliverable — never a half of slice N+1.

## Acceptance — the golden path, on the real vault

Final verification, read-only, against the user's actual vault: open the
`careerbot` project's canvas; read the flow left to right — framing pane,
research, register, scope, directions, decision stream with its supersede
chains — without opening a single file; expand the design-system board;
if its prototype dev server is running, annotate one element at component
scope with a token tweak and copy the export; confirm the export names
the component, the instance count, the scope, and the routing protocol.
Then the same walkthrough on the fixture vault, automated, as the final
smoke test.

## 1. First act: author `web/DESIGN.md` (a fresh visual language)

- Deliberately NOT the old app's language, and explicitly retire the
  🟢🟡🔴 traffic-light idiom: autonomy and stage state are expressed through
  a designed system — typographic weight, fill vs. outline shape, label —
  never red/yellow/green dots.
- Design intent: **editorial and calm — a reading surface first.** The
  artifacts are documents; typography does the heavy lifting (a real reading
  measure ~65–75ch on cards, a deliberate type scale, generous line-height).
  The canvas chrome recedes; the work is the hero. Dark and light themes.
- One accent color maximum, spent only on meaning (current stage, active
  selection, live prototype status). Semantic status colors stay separate
  from the accent.
- Tokens in YAML front matter + rationale in prose; every component token
  used by the app must exist here. Lint if the CLI is available
  (`npx @google/design.md lint`), hand-check contrast if not, and say which.

## 2. App shape

Two surfaces only:
- **Projects** — a quiet index of every project (auto-discovered by
  `type: design-project` frontmatter): name, client, stage, route, one-line
  problem statement pulled from `01 Brief & Problem.md`. Click → its canvas.
- **Canvas** — `/canvas/<slug>`: the whole app. Everything below is this.

## 3. Canvas geometry — the journey as a comb

- Vertical spine down the left: the pipeline's three phases (Understand /
  Decide / Build) as sections, each stage a tick on the spine, ordered by
  the schema. **Every stage appears** — including skipped ones (rendered
  honestly as "not run", per the pipeline's loose-coupling law) — so the
  shape of what happened vs. what was skipped is visible at a glance.
- Off each stage tick, its artifacts run horizontally as cards (the
  stage→artifact map from the schema).
- Stages whose only output is decisions (`reframe`, `converge`) are not
  empty: their column is their slice of the Decision Stream (§5), so the
  thinking stages read as substantial as the artifact stages — that's the
  product's thesis made spatial.
- The Build phase terminates in the live prototype frames (§9): the flow
  literally ends at the running thing.
- Row heights driven by tallest column; title strip per card (artifact name,
  stage, open-in-Obsidian / open-raw affordance).
- A slim project header above the spine, from `00 Dashboard.md`: current
  stage, recommended next step, and the `## Overrides` receipts when
  present — skipped-gate receipts are part of the honest flow, not dirty
  laundry to hide.

## 4. Artifact cards — readable, not thumbnails

- Cards render markdown as designed, fully readable pages at 100% zoom —
  real typography per §1, wikilinks resolved to in-canvas navigation where
  the target is on the board, frontmatter rendered as a designed header
  (never raw YAML).
- Cards, in flow order: `01 Brief & Problem.md`, which expands into **the
  framing pane** — the board's opening view: the original brief verbatim
  beside the restated problem, side by side, so the debrief's central move
  — the transformation from task to problem — is *visible*, not narrated;
  the hidden rubric and embedded scope decisions as designed callouts; the
  guiding principle set large (every decision's Why ladders to it — make
  the ladder literal: selecting the principle highlights every Decision
  Stream entry that cites it); success criteria in both registers; the
  Full vs Lite route decision with its reasoning. Then: every file in
  `02 Research/` including `Interviews.md` and `Synthesis.md` when present;
  `Assumptions & Risks.md` rendered as a designed register (each assumption
  with its verified / partial / unverified / accepted state expressed in the
  §1 idiom — including accepted-risk entries like "no primary user contact,"
  which must be as visible as any artifact: the admissions are part of the
  flow), expanding into the assumption graph (§5); `03 Scope.md` with the
  cut list called out as its own readable
  block; `04 Directions.md`; the design-system column: a compact specimen
  card that expands into the full design-system board (§6) PLUS every board
  in `_assets/boards/` (chosen and rejected alike — the rejected boards are
  the visible exploration); `05 Validation.md`; `06 Spec.md` / `Align.md` /
  `Handoff.md`.
- DESIGN.md has a moving home: canonical in the vault until `build`, then
  moved to the prototype repo leaving a link note. Render whichever copy is
  live (follow the link note; fall back to the vault copy) and label the
  card with where it currently lives — never render both as if two exist.
- Cards are excerpt-first with a measured max height and "expand" to full
  height in place; one overgrown document must not distort the board.
- A reviewer should be able to read the entire flow — brief, research,
  synthesis, risks, scope, directions, cuts, validation — without ever
  opening a file. "Every step visible, readable" is the acceptance test.

## 5. The Decision Stream — the log consolidated into ONE readable page

- All of `Decisions/*.md` merged into a single continuous, chronological
  page — one card (wide, the board's centerpiece under the Decide phase),
  not ninety file tiles.
- Each entry: id, title, date, stage, status, then Decision / Why / Rejected
  alternatives / True cost rendered as designed prose. **In their words.**
  quotes get pull-quote treatment — the human's verbatim voice is visually
  distinct from the tool's prose. `authored_by` is shown plainly.
- Supersede chains drawn, not just linked: superseded entries stay in place,
  visibly retired (not hidden — the real path is the point), with a drawn
  connector to their replacement; `rests_on` renders as a marginal link to
  the assumption. A small filter (all / live only / 🔴-stage only) — default
  is **all**, because loop-backs staying visible is the product's law.
- **The assumption graph — verify's view.** The register and the stream
  share their data: render each `Assumptions & Risks.md` entry as a node
  carrying its verified / partial / unverified / accepted state, with an
  edge drawn to every decision whose `rests_on:` cites it (already parsed
  for the stream). Selecting an assumption lights its **blast radius** —
  every decision standing on it, highlighted in the stream; an assumption
  that is unverified or has fallen renders its dependent decisions visibly
  at-risk. The single riskiest load-bearing assumption — verify's whole
  focus — is flagged as exactly that, and staleness shows through the
  register's dates. This is the same blast-radius idea as the component
  board (§7), applied to reasoning instead of UI: before trusting a
  decision, see what it stands on.
- The same stream powers the per-stage slices in §3 (filtered by `stage:`),
  so the data is parsed once.

## 6. The design-system board — review the language, not the YAML

- The design-system stage tick expands into its own board region: the
  project's `DESIGN.md` rendered as **living specimens**, generated from the
  tokens themselves (never hand-drawn, never screenshots), pannable and
  zoomable like everything else:
  - **Color** — every semantic token shown in real use: text on each
    background pairing, the primary button in every state, borders on
    surfaces. Each pairing shows its computed WCAG contrast ratio inline,
    pass/fail rendered in the §1 idiom — the lint gate made visible. (A
    below-AA pairing has shipped here before; the board is where it should
    have been caught.)
  - **Typography** — the real type-scale presets on realistic content
    lengths, each labeled with its name and full property bag.
  - **Spacing & radii** — the scales rendered visually, name + literal value.
  - **Components** — each component token entry rendered in all its named
    state variants (hover/active/disabled are separate entries in the
    format; show them all, side by side).
  - **Do's and Don'ts** — the prose body's rules rendered beside the
    specimens they govern.
- When `_assets/boards/` holds candidate or rejected boards, render them as
  siblings beside the live specimen — the choose-by-eye comparison the
  `design-system` skill runs, preserved on the canvas. Mark the chosen one.
- **Comment mode works here.** Pins on specimen elements, same mechanics as
  §10 — but on this board a tweak is a **proposed token change**: edit the
  value, watch every specimen (and any loaded prototype frames) restyle
  live, and watch the contrast ratios recompute immediately, failures
  flagged as you type.
- **Its export is a DESIGN.md change proposal**, distinct from §12's
  prototype feedback: each entry states the token path, current value,
  proposed value, affected contrast pairs, and — critically — whether the
  change is **additive** (normal growth: edit, re-lint, sign off) or
  **reshaping** (supersedes the committed language: a decision entry per
  ADR semantics). The preamble says exactly that, so the receiving agent
  routes it correctly.
- The specimen renders whichever DESIGN.md copy is live per §4's
  moving-home rule, and says which.

## 7. The component board — every reusable unit, visible

- A dedicated board region beside the design-system board: a grid with one
  cell per component in the prototype's DESIGN.md `components` token group,
  rendered as a live specimen from its token bag — every named state
  variant (default / hover / active / disabled) side by side, labeled with
  the component name and its token entries.
- Beneath each specimen, its **real instances**: scan the loaded prototype
  frames' DOMs for occurrences (prefer `data-component` / test-id
  attributes; fall back to stable class signatures) and show the live
  count and routes — "Button · 14 instances · 6 routes" — each entry
  clickable to fly the canvas to that frame and flash the element.
- This board is the app's **reusability map**: the tweak panel's scope
  selector (§11) and the export's routing protocol (§12) read their
  component matches and instance counts from here.
- Recurring DOM signatures that match NO DESIGN.md component (the same
  structure appearing on 3+ routes) surface in a separate **"uncodified"**
  row — candidates for promotion into the `components` token group,
  exportable as an additive DESIGN.md proposal per §6's semantics. A
  reusable unit that exists in the code but not in the contract is drift
  waiting to happen; this row makes it visible.
- Comment mode works on component cells; a tweak made here defaults to
  **component scope**.

## 8. Pan & zoom engine

- Wheel = pan; Ctrl/Cmd+wheel and pinch = zoom-to-cursor; Shift+wheel =
  horizontal; drag / space+drag = pan. Range ~5%–500%.
- Rolling velocity multiplier: rapid consecutive wheel events (<~40ms apart)
  ramp a multiplier (cap ~3×); a pause (>~150ms) resets — applied to pan and
  zoom both.
- Floating HUD: −, click-to-reset %, +, zoom-to-fit (bounding box of visible
  content, padded). Sidebar: per-stage and per-phase show/hide, a compact
  cheatsheet, collapse that compensates pan offset so content doesn't jump.
- **Performance laws.** Zoom is a CSS transform on one world container —
  never a re-layout or re-render of cards; card content renders once and
  scales. Prototype iframes mount lazily (only when their region nears the
  viewport) and unmount when far off-canvas. Long content virtualizes
  (§14). Pan/zoom must hold 60fps on a board with 30 cards and 4 live
  frames.
- **View state persists** per project (localStorage): pan/zoom position,
  sidebar visibility, expanded cards, chosen mode — reopening a project's
  canvas lands you where you left it.
- Embedded prototype frames don't bubble wheel events — forward from inside
  each frame into canvas world-space (§9's same-origin requirement).

## 9. Prototype frames — live, at the end of the flow

- If the project's prototype dev server is reachable (URL configured per
  project; default from a `PROTOTYPE_URL` env or a small local config file —
  NOT written to the vault), render it as live device frames: desktop
  (~1440px native, uniformly scaled) + optional mobile frame beneath,
  sharing one scale factor so mobile is genuinely narrower.
- **Same-origin is required** for everything in §7 and §10–§11 and §13 (height measurement,
  instance scanning,
  hover overlays, click capture, wheel forwarding, live token overrides).
  Prototypes run on their own ports, so proxy them through this app's own
  server (Next.js rewrites: `/prototype/<slug>/*` → the prototype origin) to
  make them same-origin. If a prototype can't be proxied cleanly, degrade
  honestly: render the frame, disable Comment/Tokens on it, and say why in
  the frame's title strip — never silently drop the mechanics.
- Per-frame load status isolated: inline "didn't load — Retry", header-level
  reload-all and a conditional "N down · Retry". One dead prototype never
  blocks the board. No prototype at all → a designed empty state that says
  what running `design-studio-build` would put here.

## 10. Comment mode (hotkey C) — on prototype frames and the design-system board

- Granularity toggle: Element (hover highlights the precise element via an
  overlay injected into the frame's document — absolute, max z-index,
  pointer-events none, tracking the real bounding box incl. scroll) vs Page.
- Click opens a floating draft near the click, viewport-clamped, flipping
  above when there's more room: note textarea, "@N" mention autocomplete
  over existing pins, the token tweak panel (§11) when an element was
  targeted, Save/Cancel (Enter saves, Shift+Enter newline, Esc cancels).
- Saved annotation records: route/frame, device, bounding box, a stable CSS
  selector (walk ~6 ancestors, prefer test-id/id, else tag + nth-of-type),
  trimmed visible text (≤60 chars), text-vs-container classification, the
  tweak. Numbered pins render on every frame with annotations.
- Annotations are session-only, in memory — intentionally not persisted.
  The persistence path is the export (§12) into the vault via `validate`,
  because the vault has exactly one write path and this app isn't it.

## 11. Tweak panel — only the prototype's real DESIGN.md tokens

- Every option list is parsed live from the PROTOTYPE's `DESIGN.md` front
  matter — never this app's tokens, never invented values:
  typography presets (applied as the full property bag, live, inline);
  color scoped by classification (text targets → text tokens, containers →
  surface tokens); spacing from the real scale (linked pairs, expandable,
  separate gap); layout (flex direction/wrap/justify/align).
- Every change re-applies live via the saved selector and appends a
  human-readable spec line carried verbatim into the export. "Clear" wipes
  an annotation's tweaks at once.
- **Scope selector.** When the tweaked element matches a component on the
  component board (§7), the panel shows the match and its live instance
  count ("this is a Button — 14 instances across 6 routes") and asks the
  reviewer to set scope: **this instance only / every <Component> / the
  underlying token, everywhere**. Default to component scope when a match
  exists, instance scope when none does. Scoping to "every <Component>"
  live-previews the tweak on ALL visible instances across all loaded
  frames, not just the clicked one — the reviewer sees the blast radius
  before saving. The chosen scope is recorded on the annotation and
  carried into the export.
- This panel is the DESIGN.md contract enforced in a UI: if a wanted value
  isn't a token, the reviewer feels that gap — which is exactly the signal
  that DESIGN.md needs to grow via a recorded decision, not that the UI
  should offer a loophole.

## 12. "Copy feedback" export — shaped as a validate loop-back

- Fixed preamble addressed to a coding agent: locate each element by
  selector/text/position in the prototype repo, apply tweak lines exactly,
  resolve "@N" references first, use only the prototype's existing DESIGN.md
  tokens — never a hand-rolled value; if a needed token doesn't exist, stop
  and flag it as a DESIGN.md growth decision instead of improvising.
- **The routing protocol** — the preamble's second, non-optional half. For
  every entry, before touching code, the receiving agent asks: *what is the
  smallest unit that is reusable here?* — and updates that reusable unit
  first. Classify the change as one of three levels:
  1. **Token** — the value is wrong everywhere it's used (a gray that fails
     contrast on every surface). Fix it in DESIGN.md, routed through §6's
     semantics (additive vs reshaping-supersede). Do not restyle components
     to compensate for a wrong token.
  2. **Component** — every instance of this component should change (all
     Cards need more padding). Fix the component definition — its code and
     its `components` entry in DESIGN.md if the changed property is encoded
     there. Do not patch instances one by one; ten instance patches are a
     forked component.
  3. **Instance** — only this occurrence, for a contextual reason the
     reviewer can state. Only then is a selector-addressed change correct.
  The reviewer's scope choice (§11) is the starting claim, not the verdict:
  the agent verifies it against the codebase (is this element really that
  component? does the change actually generalize?) and, on disagreement,
  flags the conflict in its response instead of silently complying either
  way. Never patch an instance for a problem the component owns; never fork
  a component for a problem a token owns.
- One numbered entry per annotation: frame/route, device, selector or
  "(full page)", box size+position, quoted pinned text, tweak spec lines,
  the free-text note.
- A closing line that situates it in the pipeline: "These are validation
  findings for <project>. Apply via the prototype repo; record findings that
  invalidate a decision as superseding entries per design-studio-validate."
- Clipboard copy with success/failure feedback.

## 13. Tokens mode — the prototype's DESIGN.md, live

- Right sidebar lists every token from the prototype's DESIGN.md: label,
  token path (e.g. `colors.primary`), live swatch, editable value, per-token
  reset. Editing restyles every loaded frame of that prototype immediately;
  overrides persist in localStorage across reloads (unlike annotations);
  "Reset all" clears. Newly loaded frames pick up current overrides.
- Overrides are an experiment surface, not an edit path: a visible banner in
  Tokens mode states that real token changes are DESIGN.md edits in the
  prototype repo (additive = growth, reshaping = a superseding decision).

## 14. States and hard cases (all designed, all smoke-tested)

- **The canvas itself must pass its own validate.** Accessibility is not
  exempted by being a canvas: every card's content is reachable and
  readable without drag gestures (the sidebar doubles as a linear,
  keyboard-navigable index of everything on the board — arrow through it,
  Enter to fly the canvas there); comment drafts trap focus and restore it
  on close; `prefers-reduced-motion` disables canvas fly-to animations;
  all chrome meets the contrast the DESIGN.md lint enforces on tokens.
- No vault / bad pointer → a designed state that explains the pointer file.
- Empty vault, project with zero decisions, project mid-pipeline, skipped
  stages, huge decision logs (90+ entries must stay smooth — virtualize the
  stream if needed), malformed frontmatter (skip-not-crash, warned),
  prototype down, prototype cross-origin.
- Smoke suite covers: project index visible, canvas spine shows all 11
  stages, an artifact card's text readable, the Decision Stream renders a
  supersede connector, the design-system board renders specimens with
  contrast ratios visible (and flags a deliberately-failing fixture pair),
  the component board shows a fixture component with a visible instance
  count and an "uncodified" row entry, the framing pane shows brief and
  restated problem side by side, an assumption's `rests_on` edge renders
  to its dependent decision,
  a malformed file didn't take anything down, pins visible after annotating
  a fixture frame. Visibility assertions, zero console errors, hermetic
  fixture vault.

## 15. Non-negotiables

- The pipeline is defined once, in the schema module; the spine, the
  stage→artifact map, and every label render from it.
- Vault read-only. Annotations ephemeral. Token overrides localStorage-only.
  The only route from this app's insights into the vault is the exported
  feedback block passing through the pipeline's own skills.
- Every visual value from `web/DESIGN.md`. No traffic-light dots anywhere.
- **Changes cascade token → component → instance.** Every exported change
  is routed to the smallest reusable unit that owns it; an instance patch
  for a component-owned problem is a defect, same as a hardcoded hex.
- Frames are the real running prototype — never screenshots or mocks.
- Local, single-user, dev-oriented; no auth, no hosting assumptions.

---

*Out of scope, deliberately: `Harvest.md` and the Studio Wiki (this board is
"research to prototype"; the wiki is cross-project memory — a different
surface). When this rebuild replaces `web/`, record the replacement as a
decision in the design-studio project's log, the way `0007` recorded the
Wall → web transition — the dashboard story should stay honest three
surfaces deep.*
