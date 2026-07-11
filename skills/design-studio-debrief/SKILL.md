---
name: design-studio-debrief
description: Start a new product-design project from a brief. Restates the brief as a problem (not a task), extracts the hidden rubric and guiding principle, sets provisional success criteria, seeds the risk register, and initializes the Obsidian project folder under Design Studio/ with a dashboard and decision log. Use at the very start of a design project, when handed a brief, spec, or feature request to design. First stage of the design-studio pipeline.
---

# design-studio-debrief

The front door of the design-studio pipeline. Turns a brief into a clear problem and sets up the
project workspace every later skill reads from. **Front-load understanding, not answers** — most
outputs here are provisional and explicitly marked for revisit after research.

**Always read `../design-studio-shared/CONVENTIONS.md` first.** Autonomy: 🟡→🔴.

## When to use
At the start of a design project. Runs standalone. The only skill that creates a project folder
(under `<vault>/Design Studio/`) and sets `.design-studio-active`.

## Preconditions
- No vault pointer (`~/.design-studio-vault`)? Suggest `/design-studio-setup` first — or accept a
  vault path from the user and proceed; this skill stays the safety net for skipped setup.
- If a folder for this project already exists under `Design Studio/`, do NOT clobber it — ask
  whether to resume.

## Process

1. **Get the inputs.** Ask for: the project/client name, the raw brief (paste / file path / link),
   and who the stakeholders are. If a link or file, read it. Derive the `slug` (lowercase-hyphenated).

2. **Read the brief literally, word by word.** Extract two things juniors miss:
   - **Embedded scope decisions** — wording that quietly decides scope (Forma: "image" → video out).
   - **The hidden rubric** — the sub-questions or criteria you'll actually be judged against.

3. **Restate the brief as a problem, not a task** (🔴 moment). Draft a one-paragraph restatement,
   then run the 🔴 ritual: present it, ask the user to confirm or correct the framing, and don't
   finalize until they agree. The framing is theirs. Once agreed, run the **precedent check**:
   query the Studio Wiki (`_plays.md`, then `_index.md`) with the restated problem *shape* and
   bring back anything relevant. An empty wiki is honest — "no precedents yet; this project seeds
   them." No `Studio Wiki/` at all → suggest `design-studio-harvest` to seed one.

4. **Capture the guiding principle / product spine** — the one idea everything ladders back to. If
   the brief/stakeholders state it, record it. If not, write `PROVISIONAL — confirm in research`.
   Do not invent a principle to look complete.

5. **Set provisional success criteria** (gap #4) in **two registers** (see CONVENTIONS): the
   shipped outcome (how you'd know it worked in the world once shipped) AND the in-session signal
   that would predict it — the observable behaviour a prototype test can actually measure, so
   `validate` has something to check. Mark `PROVISIONAL — revisit after research`; rough is fine now.

6. **Seed the risk register** (gap #8) — the assumptions the framing already rests on, status `untested`.

7. **Recommend a route** (fix #1): based on how ambiguous/net-new the brief is, suggest **Full** or
   **Lite** (`debrief → explore-directions → build → compile-spec`). Let the user decide; record it.

8. **Write the workspace** under `<vault>/Design Studio/<slug>/`:
   - `00 Dashboard.md` — project home note. YAML per the CONVENTIONS dashboard contract
     (`type: design-project`, `status: active`, `stage: debrief`, `client`, `route`, `started`,
     `prototype_repo:` empty). Body: Current stage, Next step, Artifacts list (links), and a
     Dataview table of this project's decisions:
     ````
     ```dataview
     TABLE status, stage, date FROM "Design Studio/<slug>/Decisions" SORT id ASC
     ```
     ````
   - `01 Brief & Problem.md` — original brief verbatim, the restated problem, the rubric as a
     checklist, the guiding principle, success criteria. Mark provisional items clearly.
   - `Assumptions & Risks.md` — the seeded register.
   - `Harvest.md` — empty flag inbox for Studio Wiki keepers (capture is free; see CONVENTIONS).
   - `Decisions/0001 <framing-slug>.md` — the framing decision (status `decided` once confirmed,
     else `proposed`).
   - Create empty `02 Research/` and `_assets/` so later skills have a home.
   - Set `<vault>/.design-studio-active` to the slug.

9. **Ensure the portfolio dashboard exists.** If `<vault>/Design Studio/_Design Studio.md` is
   missing, create it with the Dataview portfolio queries from CONVENTIONS. It auto-discovers this
   and all future projects by frontmatter — no row to append. Ensure a `Home.md` exists at the vault
   root (Homepage landing note) linking to the portfolio — and to `Studio Wiki/_index.md` if the
   wiki exists.

10. **Update `00 Dashboard.md`** with stage = debrief done, next step = research (or per route).

## Handoff
Point to `design-studio-research` (Full) or `design-studio-explore-directions` (Lite).
