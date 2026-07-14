#!/usr/bin/env node
// The studio's owned DESIGN.md token export — zero-dependency, runs with plain
// `node` (no install), so `build`'s "wire in the visual contract" step never
// depends on `npx @google/design.md export` (which was blocked in the live runs
// the lint gate was too).
//
// It reads a DESIGN.md's front matter and emits CSS custom properties on stdout:
// every leaf token becomes a `--group-key` variable, references ({group.key})
// are resolved to their effective value, and state variants (buttonHover,
// spineMarkerCurrent, …) and motion (duration / easing / transition) come along
// like any other token. Metadata (name/description/version) and the a11y
// `contrast` floors are config, not renderable values, so they are left out.
//
// The front-matter parser and reference resolution are shared with the lint and
// the drift diff — see scripts/design-md.mjs. Mirrors scripts/design-lint.mjs
// in style.
//
// Usage:  node scripts/design-export.mjs <path/to/DESIGN.md>  > tokens.css
//    or:  npm run design:export -- <path/to/DESIGN.md>  > tokens.css

import { promises as fs } from "node:fs";
import path from "node:path";
import { parseFrontmatter, flattenTokens, cssVarName, collectUnresolvedRefs } from "./design-md.mjs";

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: node scripts/design-export.mjs <path/to/DESIGN.md>  > tokens.css");
    process.exit(2);
  }
  const abs = path.resolve(process.cwd(), target);
  let raw;
  try {
    raw = await fs.readFile(abs, "utf8");
  } catch {
    console.error(`${red("cannot read")} ${abs}`);
    process.exit(2);
  }

  const { data, hadFrontmatter, error } = parseFrontmatter(raw);
  if (error) {
    console.error(`${red("front matter")} ${error}`);
    process.exit(2);
  }
  if (!hadFrontmatter || !data || typeof data !== "object") {
    console.error(`${red("no DESIGN.md front matter")} — nothing to export from ${abs}`);
    process.exit(2);
  }
  const tree = data;

  // Unresolved refs are emitted verbatim ({ref} left in place) so the defect
  // stays visible in the output, never silently blanked — but warn on stderr.
  const unresolved = collectUnresolvedRefs(tree);

  // `contrast` floors are a11y config, not CSS values; metadata is skipped by flattenTokens.
  const tokens = flattenTokens(tree, { skipGroups: ["contrast"] });

  const lines = [];
  lines.push(`/* DESIGN.md tokens → CSS custom properties.`);
  lines.push(` * Generated from ${abs}`);
  lines.push(` * by design-export.mjs — references resolved, state variants and motion included.`);
  lines.push(` * The DESIGN.md is the source of truth: regenerate on change, do not hand-edit. */`);
  lines.push(`:root {`);
  let lastGroup = null;
  for (const { path: dotted, value } of tokens) {
    const group = dotted.split(".")[0];
    if (group !== lastGroup) {
      if (lastGroup !== null) lines.push("");
      lines.push(`  /* ${group} */`);
      lastGroup = group;
    }
    lines.push(`  ${cssVarName(dotted)}: ${value};`);
  }
  lines.push(`}`);
  process.stdout.write(lines.join("\n") + "\n");

  if (unresolved.length) {
    console.error(
      yellow(`\n⚠ ${unresolved.length} unresolved reference(s) left verbatim in the output:`),
    );
    for (const u of unresolved) console.error(dim(`    {${u.ref}} at ${u.loc}`));
  }
  console.error(dim(`exported ${tokens.length} token(s) from ${path.basename(abs)}`));
  process.exit(0);
}

main().catch((err) => {
  console.error(red("design-export error:"), err.stack || err.message);
  process.exit(2);
});
