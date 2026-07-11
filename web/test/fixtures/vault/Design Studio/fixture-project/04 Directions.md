---
type: directions
stage: directions
date: 2026-01-18
tags: [directions]
---

# Directions

Three structurally-different ways to render the journey.

## Direction A — the tabbed dashboard

Side-nav + tabs, one artifact type per tab. Cheap to build, but it hides the *shape* of the flow:
you never see the whole journey at once, which is the entire point.

## Direction B — the scrolling document

One long page, sections stacked. Readable, but flat — no sense of parallel exploration, and
decisions sit far from the artifacts they shaped.

## Direction C — the spatial canvas

A pannable board: a spine of stages, artifact cards running off each, the decision stream as the
centerpiece. Expensive (pan/zoom engine, performance laws) but it is the only one that makes the
thesis — the whole design flow, seen — literally spatial.

## Data-model note

C forces a single board model assembled from the schema's stage→artifact map, with stable region
ids for fly-to. A and B need no such model, which is exactly why they can't deliver the view.
