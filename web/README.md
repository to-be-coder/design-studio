# Design Studio Web

**The Canvas**: a schema-driven, pannable board over one project in the
[design-studio](../README.md) vault, an Obsidian markdown tree that is this app's only data
source. A project's whole design journey, research to running prototype, rendered as one readable
board instead of a stack of separate pages.

- **Projects index** (`/`) — every project as a card: name, client, route, current stage, and its
  restated problem line.
- **Canvas** (`/canvas/<slug>`) — each project's design journey as a **focus mode**: one board at a
  time (click a sidebar item to isolate it; the choice persists), opening on the first stage
  (Debrief, which reads as a document). The **Decision Stream** is its own standalone section (converge/explore-directions
  dissolved, so there's no "Decide" phase) that renders the entire decision log as one page, supersede
  chains drawn, with **In their words.** pull-quotes for 🔴 calls a human actually made. The
  **assumption graph** draws each assumption's blast radius — the decisions whose `rests_on` cites
  it. A **design-system board** shows living specimens generated straight from the project's design
  tokens, with color pairings' WCAG contrast ratios computed inline. A **component board** shows
  every reusable unit with live instance counts scanned from the running prototype frames, plus an
  "uncodified" row for anything used in code but never added to `DESIGN.md`. The board ends at the
  running prototype itself, in same-origin device frames.
- Prototype frames support three interaction modes beyond plain reading: **Comment** (propose a
  change at element or page granularity; the "Copy feedback" export routes it by smallest reusable
  unit — token, component, or instance — and becomes the next `design-studio-build` round's specs,
  the named round input build loops on, or — once the build is done — the input to
  `design-studio-research`'s evaluate/reconcile moves), **Tweak** (a token-constrained panel with a scope selector: this instance / every
  component / the token everywhere), and **Tokens** (live-edit the prototype's `DESIGN.md` values
  across every frame).

The stages, skills, autonomy, runnable flags, and the stage→artifact map all live in one place —
[`src/lib/schema.ts`](src/lib/schema.ts). The UI renders from it; nothing hardcodes the pipeline.

## Run it

```bash
npm install
npm run dev         # http://localhost:3000
```

The app finds the vault via `DESIGN_STUDIO_VAULT` (in `.env.local`), falling back to
`~/.design-studio-vault`, the same pointer every design-studio skill uses. Reading is read-only;
the only vault writes are three bounded inputs (`/api/projects` scaffolds a new project from a
brief, `/api/projects/review` records review verdicts, `/api/projects/input` drops added evidence
into the research inbox), each written as the same markdown the skills consume.
`/api/vault-events` watches the active project's folder and
streams change events over SSE; the board refetches just the affected card (via `/api/card`) and
swaps it in place — no full-page reload when a skill writes mid-session.

### Verify the data layer without installing

`scripts/sanity.mjs` is a zero-dependency check (plain `node`, no install) that exercises the
vault-parsing approach against your real vault:

```bash
node scripts/sanity.mjs      # or: npm run sanity
```

### Tests

```bash
npm run design:check # DESIGN.md validity plus component token discipline
npx tsc --noEmit
npm run build
npm run test:e2e    # Playwright, against a hermetic fixture vault
```

## Rendering a prototype

A project's clickable prototype is never in the vault. It embeds in the canvas through a
same-origin proxy (`/prototype/<slug>/*`, `src/app/prototype/[slug]/[[...path]]/route.ts`) rather
than a cross-origin iframe — that same-origin requirement is what lets Comment, Tweak, and Tokens
reach into the frame's real DOM. Where a project's prototype lives is resolved from
`prototypes.local.json` (or the path in `PROTOTYPE_CONFIG`) — never from the vault — mapping each
project slug to a `repo` (a local checkout; its `DESIGN.md` is the token source) and/or a `url` (a
running dev server the proxy forwards to). A static checkout with an `index.html` is served
straight off disk; a `direct: true` entry embeds a SPA at its own origin instead, view-only, for
routers with no basename.

If a project's config also supplies a pre-authored `run` command, the canvas can start that dev
server itself: the prototype frame shows a **Render** control (idle → starting, with a live log
tail → ready), backed by `POST /api/prototype-run`. The browser only ever sends a slug — the actual
command is looked up server-side from the local config file, never taken from the request body, so
a slug with no configured `run` can never spawn anything. This endpoint is dev-only by default:
outside `NODE_ENV=production` it always works, but in production it 404s unless
`DESIGN_STUDIO_ALLOW_RUN=1` explicitly opts in — a deployed canvas has no business spawning shell
processes on its host, and the env var is a deliberate, auditable escape hatch for a trusted
local/self-hosted box.

## Stack

Next.js 16 · React 19 · Tailwind v4 · shadcn (base-nova on Base UI) · gray-matter · marked. The
data layer and markdown rendering are lifted from careerbot's `web/`; the visual language is
editorial and paper-first — light is the canonical theme, dark is first-class too — with one
indigo accent spent only on live meaning (current stage, active selection, live prototype status),
and autonomy/state expressed through weight, fill-vs-outline, and labels, never colored dots.
