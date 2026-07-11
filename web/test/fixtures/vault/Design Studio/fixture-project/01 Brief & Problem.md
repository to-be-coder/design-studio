---
type: design-brief
stage: debrief
date: 2026-01-10
tags: [brief]
---

# Brief & Problem

## Restated problem

Fixture stakeholders need a way to verify that the dashboard renders real vault content —
not just that it returns HTTP 200.

## Hidden rubric

Judge success by whether a user can actually *see* the right thing on screen, not merely that
the server didn't error.

## Guiding principle

Assert what users see.

## Provisional success criteria

- The portfolio lists this fixture project by name.
- The project page renders this brief and the decision log's supersede chain.
- A malformed file elsewhere in the vault does not take down the page.
