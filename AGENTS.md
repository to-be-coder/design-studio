# design-studio

Installable Codex skills: a 5-stage product-design pipeline plus a compounding Studio
Wiki. Two reasons someone opens this repo; figure out which applies and act accordingly.

**Output voice, hard rule: never use em dashes.** No em dashes (the "—" character) anywhere this
project or its agents generate: docs, skill files, decision entries, code comments, commit
messages, chat. Use a comma, a colon, parentheses, a semicolon, "to" or "through" for ranges, or
two sentences instead. Do not substitute an en dash ("–") either.

## Using this product (most visitors)

If the user cloned this to USE the skills:

1. Offer to install for them: run `./install.sh` (it copies every `skills/design-studio-*` folder
   into `~/.Codex/skills/`).
2. Then tell them, exactly: **restart Codex** (skills load at session start), then run
   `/design-studio-setup` — it finds or creates their vault and gets them to their first project.

Don't walk them through the pipeline from here; setup and the skills themselves do that in the
right order.

## Developing this repo

- **Docs map:** `README.md` — the user-facing story; `ARCHITECTURE.md` — where files live, how the
  skills communicate, and the invariants; `skills/design-studio-shared/CONVENTIONS.md`
  — the law every skill follows; `skills/design-studio-shared/starter-wiki/AGENTS.md` — the
  wiki's own schema; `web/README.md` — the dashboard; `CHANGELOG.md` —
  release history (update it with every user-visible change).
- `skills/design-studio-shared/CONVENTIONS.md` is the single source of truth every skill reads
  first. Change a convention there, nowhere else.
- Consistency rules to preserve when editing:
  - Stage ordinals ("First… Fifth stage of the design-studio pipeline") appear exactly once
    each across skill descriptions; the pipeline stays **5 stages** (debrief, research, structure,
    design-system, build) — setup, harvest, wiki-lint, compile-spec, and design-md are utility
    skills, not stages.
  - `install.sh` installs by the `design-studio-*` glob — new skill folders need no installer
    change; shared material lives inside `design-studio-shared/`.
  - Every `[[wikilink]]` in `design-studio-shared/starter-wiki/` must resolve to a page in its
    `wiki/` folder, and every starter page carries the full frontmatter contract from CONVENTIONS.
  - Each skill folder's name equals its SKILL.md frontmatter `name:`.
  - The README's pipeline table and utility-skill mentions stay in sync with the actual folders
    under `skills/`.
  - The web dashboard's visual values come ONLY from `web/DESIGN.md`: the tokens in
    `web/src/app/globals.css` derive from it, never the other way round. A raw hex or `oklch()`
    literal in a component is a defect.
  - Before changing app UI, classify the design impact. A change has contract impact when it adds or
    reshapes a shared component, interaction, state, layout rule, responsive behavior, color, type,
    spacing, shape, hierarchy, or motion. Read and follow
    `skills/design-studio-design-md/SKILL.md` for contract-impacting work, update `web/DESIGN.md`
    with the code, and run `npm run design:check`. Copy changes, data wiring,
    and fixes that only restore an existing documented rule may be classified as implementation-only;
    say why in the handoff. Never use change size or line count as the test.
  - The pipeline is defined once, in `web/src/lib/schema.ts` — stages, skills, autonomy, runnable
    flags, and the stage→artifact map. The UI renders from it; nothing hardcodes the pipeline.
    Add a stage there and nowhere else.
  - After any web change, `cd web && npm run design:check`, `npx tsc --noEmit`, AND
    `npm run build` must pass (CI runs all three via `.github/workflows/web-checks.yml`).
