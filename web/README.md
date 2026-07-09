# Design Studio Web

A schema-driven dashboard over the [design-studio](https://) vault. Review the output of every
pipeline stage, see which stage each project is in, and run a Claude skill with a click.

- **Portfolio** (`/`) — every project with its status, current stage, route, and a pipeline strip.
- **Project** (`/project/<slug>`) — the pipeline rail (per-stage state from the dashboard's
  `## Pipeline log`), each stage's rendered output, and the decision log with supersede chains.
- **Skills** (`/skills`) — the whole pipeline, rendered straight from the schema.

The stages, skills, autonomy, runnable flags, and the stage→artifact map all live in one place —
[`src/lib/schema.ts`](src/lib/schema.ts). The UI renders from it; nothing hardcodes the pipeline.

## Run it

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

The app finds the vault via `DESIGN_STUDIO_VAULT` (in `.env.local`), falling back to
`~/.design-studio-vault` — the same pointer every design-studio skill uses. It reads the vault
read-only; the only write is the run mechanism below.

### Verify the data layer without installing

`scripts/sanity.mjs` is a zero-dependency check (plain `node`, no install) that exercises the
vault-parsing approach against your real vault:

```bash
node scripts/sanity.mjs      # or: pnpm sanity
```

## The Hybrid run mechanism

Many design-studio skills are 🔴 human-gated — they need your decisions mid-run — so:

- **Runnable** skills (🟢/🟡, no mid-run gate: research, verify, build, validate, compile-spec,
  wiki-lint) show a **Run** button. It points `.design-studio-active` at the project, spawns
  `claude -p "/<skill>"` in the vault via `POST /api/run`, and streams the output into the UI.
- **Gated** skills (🔴: debrief, reframe, scope, directions, converge, design-system, harvest,
  setup) show **Copy command** — paste it into Claude Code and stay in the loop.

Runs are local-only (the app runs on your machine, where `claude` is installed and authenticated).
Override the binary with `CLAUDE_BIN`. The allowlist lives in `RUNNABLE_SKILLS`
([`src/lib/schema.ts`](src/lib/schema.ts)); nothing outside it can be spawned.

## Stack

Next.js 16 · React 19 · Tailwind v4 · shadcn (base-nova on Base UI) · gray-matter · marked. The
data layer and markdown rendering are lifted from careerbot's `web/`; the theme is dark-first,
monotone with a single hint of blue.
