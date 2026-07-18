---
type: design-project
status: active
stage: build
client: Build Fixtures Co.
route:
started: 2026-04-01
prototype_repo:
---

# Fixture Build

A hermetic fixture whose prototype repo has been taken over by build: its flows.json is marked
source "build". The Structure board must read that marker and show no Refresh control, since the
skeleton is no longer pristine for structure to own.

## Current stage

Current stage: build: building: round 1

Build owns the repo now. Structure can still be walked as device frames, but refreshing the
skeleton in place would clobber build's work, so the board offers no refresh.

## Recommended next step

Run `design-studio-build` to keep growing the prototype in the same repo.
