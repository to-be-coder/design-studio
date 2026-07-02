# Studio Wall

The visible face of your design-studio OS: an ambient, single-hue dashboard over your vault,
with a small, safe control surface for running non-interactive skills from the browser.

Built through the design-studio pipeline itself — the design record (brief, decisions, specimen
boards) is public in [`design/`](design/), and every visual value derives from
[`DESIGN.md`](DESIGN.md) (Bloom: sci-fi pink on warm plum-black; it superseded Ember in decision
0005 with a single token edit — which is the thesis working). This dashboard is the product's
own proof that agent-built UI under a visual contract comes out designed, not generated.

## Run

```sh
node wall/server.js
```

Requires Node 18+, zero npm dependencies. The server prints the URL
(`http://127.0.0.1:4411`) and a **token** on first start — paste the token into the wall once
(stored in your browser only). The vault is resolved from `~/.design-studio-vault`
(set by `/design-studio-setup`); override with `DESIGN_STUDIO_VAULT=/path` for testing.

## How it behaves

- **Ambient by default.** No buttons. Tiles for Portfolio, Studio Wiki, Prototypes, Activity;
  status as 8px instrument dots; at most one filled primary action, computed from real state.
- **Operator on intent.** `⌘K` opens the command palette — every secondary action lives there:
  allowlisted runs (with press-Enter-again confirm and live streamed output), project drill-ins,
  and **handoff cards** for conversational 🔴 stages (they copy the slash command; a button
  cannot run a ritual).
- **Honest states.** No vault → setup card. No `claude` CLI → runs disabled with a hint.
  Empty portfolio/wiki → told plainly, with the command that fixes it.

## Security model

The control surface is deliberately boring:

- Binds **127.0.0.1 only** — never exposed to the network.
- **Bearer token** required on every API call (generated once, `0600`, at
  `~/.design-studio-wall-token`); Origin headers from foreign sites are rejected, so drive-by
  browser pages can't reach the API.
- **Server-side allowlist** — exactly two runnable skills in v1: `wiki-lint` (report-only) and
  `harvest-draft` (crossing preview; never writes the wiki). Argv arrays, no shell.
- One run at a time, 5-minute timeout, killed if you close the page; every run is appended to
  `~/.design-studio-wall.log` and shown in the Activity panel.
- No arbitrary prompt passthrough, by design. Anything conversational belongs in Claude Code.

## Type safety

The wall is **typed JS**: the code stays `.js` and zero-build, but every shape lives in
[`types.d.ts`](types.d.ts) and JSDoc annotations are enforced by TypeScript's checker —

```sh
cd wall && npm install && npm run check   # tsc --noEmit, strict
```

This is contributor tooling only: `dependencies` is empty and users never install anything —
`node wall/server.js` stays the whole story. Why not `.ts` source? The browser can't run it, so
full TypeScript means a build step or committed compiled output — both break the zero-build
promise (decision 0006 has the full reasoning). The checker is a gate, like the design.md lint:
same rigor, medium unchanged.

## Files

- `server.js` — zero-dependency Node server (static + read APIs + SSE + run API)
- `public/` — zero-build front end; `public/tokens.css` is **generated** from `DESIGN.md`
  (`npx @google/design.md export --format css-tailwind DESIGN.md | sed 's/^@theme {/:root {/'`)
  — regenerate it after any token change; hand-editing it is a defect
- `DESIGN.md` — the visual contract (lints clean, incl. WCAG contrast)
- `design/` — the project record: brief, decisions 0001–0004, specimen boards, harvest flags
