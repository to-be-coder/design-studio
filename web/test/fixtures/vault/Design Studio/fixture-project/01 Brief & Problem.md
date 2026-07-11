---
type: design-brief
stage: debrief
date: 2026-01-10
tags: [brief]
---

# Brief & Problem

## Original brief

> Build us a dashboard that shows whether the design pipeline is working. Make it look modern.
> We keep shipping things that pass tests but look broken in the actual browser.

The brief as handed over: a task ("build a dashboard") with an implied, unstated ache underneath it.

## Restated problem

Fixture stakeholders need a way to verify that the dashboard renders real vault content — not just
that it returns HTTP 200. The true problem is not "a dashboard" but *trustworthy evidence*: a
reviewer must be able to see the right thing on screen and believe it.

## Hidden rubric

Judge success by whether a user can actually *see* the right thing on screen, not merely that the
server didn't error. A green test suite that hides a blank panel is a failure, not a pass.

## Guiding principle

Assert what users see.

## Success criteria — shipped outcome

- In the world: reviewers stop approving screens that look broken, because the canvas surfaced the
  breakage before sign-off.
- In the world: a new team member reads a project's whole flow without opening a single file.

## Success criteria — in-session signal

- In session: a reviewer, shown the board cold, reads brief → research → decisions unaided and can
  restate the reframe in their own words.
- In session: a deliberately-broken specimen pairing is noticed within thirty seconds, without
  prompting.

## Route — Full vs Lite

Full route. The problem is ambiguous and net-new (what does "trustworthy" even mean here?), so the
whole pipeline earns its place rather than the Lite shortcut. Reasoning recorded in the decision log.
