# design-studio

Installable Claude Code skills: an 11-stage product-design pipeline plus a compounding Studio
Wiki. Two reasons someone opens this repo — figure out which applies and act accordingly.

## Using this product (most visitors)

If the user cloned this to USE the skills:

1. Offer to install for them: run `./install.sh` (it copies every `skills/design-studio-*` folder
   into `~/.claude/skills/`).
2. Then tell them, exactly: **restart Claude Code** (skills load at session start), then run
   `/design-studio-setup` — it finds or creates their vault and gets them to their first project.

Don't walk them through the pipeline from here; setup and the skills themselves do that in the
right order.

## Developing this repo

- **Docs map:** `README.md` — the user-facing story; `ARCHITECTURE.md` — where files live, how the
  skills communicate, and the invariants; `skills/design-studio-shared/CONVENTIONS.md`
  — the law every skill follows; `skills/design-studio-shared/starter-wiki/CLAUDE.md` — the
  wiki's own schema; `web/README.md` — the dashboard; `CHANGELOG.md` —
  release history (update it with every user-visible change).
- `skills/design-studio-shared/CONVENTIONS.md` is the single source of truth every skill reads
  first. Change a convention there, nowhere else.
- Consistency rules to preserve when editing:
  - Stage ordinals ("First… Eleventh stage of the design-studio pipeline") appear exactly once
    each across skill descriptions; the pipeline stays **11 stages** — setup, harvest, and
    wiki-lint are utility skills, not stages.
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
  - The pipeline is defined once, in `web/src/lib/schema.ts` — stages, skills, autonomy, runnable
    flags, and the stage→artifact map. The UI renders from it; nothing hardcodes the pipeline.
    Add a stage there and nowhere else.
  - After any web change, `cd web && npx tsc --noEmit` AND `npm run build` must pass
    (CI runs both via `.github/workflows/web-checks.yml`).
