# Studio Wall — Brief & Problem

Project record for the wall, kept in-repo (deliberate adaptation of the vault convention: this
product repo is the client, and the public design trail is part of the product's proof).

## The brief (verbatim, from the working session, 2026-07-02)

> "Web UI for the agentic OS… one color. Futuristic sci-fi blue or sci-fi orange. No pure white
> or pure black background… for better user experience and also for social media post."
> "Also, users should be able to control the skills through the dashboard on the web."
> "Consider primary action and secondary action and progressive disclosure, hiding secondary
> action. Make it clean and modern."

Scope settled in debrief Q&A: **product feature now** (ships to design-studio users, not a
personal tool) · **buttons + handoff** (non-interactive skills run one-click with live output;
conversational 🔴 stages hand off to Claude Code) · **localhost only** (127.0.0.1 + token).

## Embedded scope decisions the wording already made

- "One color" — monochrome language, single hue ramp, tinted neutrals; blue vs amber are the two
  candidates; "no pure white or pure black" is already a Don't.
- "Control the skills" — reverses the earlier read-only cut; recorded as [[0002 control-surface]]
  with the security requirements that decision carries.
- "UX **and** social media" — two jobs, one artifact; ambient wants calm, social wants drama.
  Resolved by the dual-mode interaction model (ambient by default, operator on intent).

## The problem (restated — not a task)

The studio's operating system has no visible face. The real work — projects moving through
stages, a wiki compounding, prototypes shipping — is locked in a vault only its owner sees,
while the public conversation about "agentic OS dashboards" is dominated by interchangeable
neon demo-ware that performs system-ness without substance. The problem is not "build a
dashboard"; it is **make the studio's actual state visible and operable — glanceable at the
desk, publishable to the feed, able to run the OS's non-interactive skills safely — in a form
that is itself the proof of the product's core claim: agent-built UI under a visual contract
comes out designed, not generated.** The artifact is a shop window as much as a tool, and its
DESIGN.md is deliberately the first stroke of the house language.

## The hidden rubric (what this is actually judged on)

1. Unmistakably NOT the neon mission-control clones — differentiation is the point.
2. Passes the thumbnail test: one screenshot, no caption, and it reads as designed.
3. Visibly proves the thesis: pipeline-built, DESIGN.md-governed, record public.
4. Honest: real data from the real vault, never staged.
5. Survives as a daily ambient display without becoming a maintenance pet.

## Guiding principle

**The artifact must prove the claim it makes.** Every decision ladders here: if a choice can't
be defended as making the wall better evidence that agent-built UI under a visual contract comes
out designed — not generated — it loses. (Decisions cite this section by its heading.)

## Success criteria (PROVISIONAL — firm up at validate)

- The ambient view answers "where is everything?" in one glance (portfolio stages, wiki growth,
  activity) with zero interaction.
- A wiki-lint run can be triggered, watched live, and found in the activity log — from the
  browser, with confirm, under token auth.
- A 🔴 stage is reachable in ≤2 actions as a handoff (copy command → Claude Code).
- The two release screenshots (ambient + operator) are postable as-is.
- Setup for a product user: `node wall/server.js` after `/design-studio-setup` — nothing else.

## Assumptions & risks (seeded)

- **A1 (accepted):** users running the wall have Claude Code + the skills installed and a vault
  pointer — guaranteed by the product's own onboarding.
- **A2 (untested):** headless `claude -p` runs of wiki-lint/harvest-draft behave usefully
  non-interactively. Validate exercises this with a stub; first real run is the true test.
- **R1:** a control surface over an agent with credentials — mitigated by localhost bind, token,
  server-side allowlist, confirm-before-run, visible run log ([[0002 control-surface]]).
- **R2:** dual audience pulls apart (calm vs drama) — mitigated by the dual-mode model; watch it
  at validate.
- **R3:** vault variance across users (empty, huge, malformed frontmatter) — designed states +
  overflow behavior are build-gate items.

## Route

**Lite, with `design-system` inserted** (the look is the point), per CONVENTIONS. Stage order:
debrief (this record) → design-system (boards → DESIGN.md) → build → validate → ship.
