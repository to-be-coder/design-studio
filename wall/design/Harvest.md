# Harvest — flag inbox (studio-wall)

One-liners for the Studio Wiki; distilled at project close by `design-studio-harvest`.

- Raycast's DESIGN.md as prior art: "no second primary color" + surface-ladder elevation adapts
  perfectly to single-hue instrument UIs — pattern candidate. (design-system stage)
- Instrument-lights rule: in a one-color language, semantic states live ONLY as size-capped dots
  (green/amber/red ≤ 8px, never fills or text) — aviation-panel precedent. — craft candidate.
- Dual-mode surface: "ambient by default, operator on intent" resolves calm-vs-drama when one
  artifact serves daily use and social presence. — pattern candidate.
- Trap seen in the field: dashboards with overview tiles and no drill-down die as tools;
  pagination past ~dozens of items is forgotten by every clone. — trap candidate.
- A button cannot run a ritual: conversational 🔴 skills must hand off, not execute. — process
  candidate.
- Precompose alpha tints into solid tokens: contrast becomes contract-verifiable (design.md lint
  can't composite transparency) and CSS stops depending on stacking order. — craft candidate.
- design.md's css-tailwind export emits an `@theme` block — pipe through `sed 's/^@theme {/:root {/'`
  for zero-build vanilla CSS. — tool candidate (design-md essentials page edit).
- Give every external-CLI integration a binary-override env seam (WALL_CLAUDE_BIN): it's the test
  harness AND the odd-install escape hatch. — craft candidate.
- Trap: a test that strips PATH can still find the real binary — the real `claude` hung a
  90-second harness. Stub external CLIs explicitly; never assume absence. — trap candidate.
- Wells step to `surface`, never `canvas`: a canvas-dark input inside an overlay reads as a hole
  punched through the interface — encode "canvas is the page and nothing else" as a ladder law.
  — craft candidate (from user feedback on the run modal).
- Typed JS (JSDoc + tsc --noEmit against a shared types.d.ts) = the type contract without the
  build step — the checker is a lint gate, the medium stays native. Gotcha: JSDoc import() paths
  need explicit .js extensions under NodeNext resolution. — craft candidate.
- Trap: author CSS silently defeats the `hidden` attribute (any `display` rule on a togglable
  container beats the UA's `[hidden]{display:none}`) — pair such rules with a `[hidden]` reset.
  Shipped broken since day one; invisible to keyboard-driven demos; caught by an end-to-end
  preview clicking with a mouse. — trap candidate.
