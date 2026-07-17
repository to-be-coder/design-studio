# Research move — evaluate

Loaded only when a round is pointed at **testing the built (or drafted) thing** rather than
gathering fresh evidence ([[0027 validate-dissolves-6-stages]]). The old `validate` stage folds into
research as this move: the craft is ported intact, the ceremony is gone. Testing the prototype
against the in-session success criteria is an **evaluative round** — the same convergence loop as any
other, just aimed at the artifact instead of the problem space. Runs most often **after `build`**,
but early evaluation (a concept, a flow, the skeleton repo's stub screens) is far cheaper than post-build — prefer
catching a broken flow before it is coded.

## Preconditions
- The **success criteria** from `01 Brief & Problem.md`. A test measures the **in-session signal**
  register, not the shipped outcome (see CONVENTIONS' two-registers section) — a criterion with no
  in-session signal gives this move nothing to check. If the criteria are still `PROVISIONAL`, firm
  them up first.
- The artifact under test: **late** — the running prototype (repo path in `00 Dashboard.md`);
  **early** — the concept or the flows/IA layer.

## Pick the branch (either mode)

1. **Users available** → draft a small, **open-ended usability test** against the success criteria:
   **tasks, not leading questions** — "when you pick X, how do you know it's right?", never "would
   you use a feature that does X?". Same Mom Test discipline as `interviews.md` (compliments and
   hypotheticals are bad data; open with at least three named learning goals, each traced to a
   success criterion it exists to check). **The user runs the sessions; the skill never simulates
   users.** Capture what held and what broke, against which criterion.
2. **No users yet** (common for early/client work) → run a **structured expert review**, and mark
   every finding **expert-judgment, not user-validated**:
   - **Heuristic evaluation** — walk the interface against **Nielsen's heuristics** (visibility of
     system status, match to the real world, user control, consistency, error prevention,
     recognition over recall, flexibility, minimalist design, error recovery, help).
   - **Cognitive walkthrough** — step the **core task** as a first-time user: at each step, is the
     right action visible, will they recognize it advances them, will they know it worked?
   - **Accessibility pass** — focus order, visible focus, contrast against the declared floors,
     labels/roles, keyboard reachability, reduced-motion.

## Feed the register and the log
- Findings are the same shape as any other round's — sort each into `Assumptions & Risks.md`
  (verified / partial / unverified / accepted) and fold them into the round's research report under
  a **Findings** heading that names what held, what broke, and against which criterion. An
  unverified assumption a session was meant to test but couldn't stays `unverified` — never round it
  up.
- Findings that generalize beyond this project — a pattern that broke, a newly discovered trap —
  also get a one-line flag in `Harvest.md`.

## The back-edge is universal law, not this move's alone
A finding that **invalidates a prior decision** does not get patched silently: make the new decision
and **supersede** the old entry (`status: superseded`, link `superseded_by`/`supersedes`), looping
back into whichever surface owns it — the Understand loop (`design-studio-debrief`/
`design-studio-research`), `design-studio-structure` for a broken flow, or
`design-studio-design-system` for the visual language. Any finding from anywhere supersedes the
decision it invalidates ([[0023 nothing-locks-before-production]]) — that is the law of the whole
pipeline, not a step this move performs.

Return to `../SKILL.md` for the register-sort and report contract. The **visual drift check** is not
here — it moved to `build`'s round-closing checklist, where drift actually happens
([[0027 validate-dissolves-6-stages]]).
