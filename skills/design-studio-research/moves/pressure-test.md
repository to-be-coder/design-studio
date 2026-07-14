# Research move — pressure-test

Loaded only when a round is pointed at **refutation** instead of gathering
([[0018 verify-folds-into-research]]). By default a round gathers evidence toward a recommendation;
the user can instead direct a round (or part of one) at *breaking* it. This is the adversarial
stance the retired `verify` stage carried — actively trying to kill a claim is a different act from
gathering evidence for it, and it is what catches the recommendation-producing loop grading its own
homework.

## The move

1. **Take a named target** — a specific assumption from `Assumptions & Risks.md`, or the current
   recommendation itself.
2. **Spawn subagents on a refute mission.** Their mission is to *break* the claim against **primary
   sources** — the actual docs, the actual API, the actual data — never to confirm it. (Sub-agents
   return findings; only the main thread writes files or decisions.)
3. **Default to `unverified` when unsure.** A claim earns `verified` / `partial` only by surviving a
   real attempt to break it; a claim nobody tried to break stays `unverified` no matter how
   confident it reads. Don't round an unclear result up to `partial`.
4. **When the target needs humans rather than sources**, use the **targeted-evaluative interview
   variant** (see `interviews.md`): a Mom Test guide aimed at one load-bearing assumption, same
   on-demand trigger, same three-named-goals rule.
5. **Feed the register.** Results are the same shape as any other round's findings and update
   `Assumptions & Risks.md` the same way — the only difference is the stance: every other move
   gathers, this one hunts.

## Trap-check rides here too
Checking the wiki's **traps** (`Studio Wiki/_plays.md`) against the accumulating decisions is
research work ([[0023 nothing-locks-before-production]]). Run it as part of rounds — and **always**
in directions rounds — and log any surfaced trap **even when it changes nothing** (that is what
makes trap efficacy measurable later). This reach is implicit; the user won't know to ask.

Return to `../SKILL.md` for the register-sort and report contract.
