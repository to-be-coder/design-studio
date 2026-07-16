#!/usr/bin/env node
// The studio's owned DESIGN.md drift diff — zero-dependency, runs with plain
// `node` (no install), so build's round-closing drift check never depends on
// `npx @google/design.md diff` (blocked in the live runs, like the lint gate).
//
// It compares two versions of a DESIGN.md by their RESOLVED tokens (references
// inlined, so a pairing that resolves to the same value is not spurious drift)
// and reports what was added, removed, or changed between them. Either side can
// be a working file or a version from git history (read via `git show`), which
// is exactly build's case: the prototype's DESIGN.md at the signed-off build
// start vs. the current file (decision 0027 moved the check here from validate).
//
// The front-matter parser, reference resolution, and token flattening are
// shared with the lint and the token export — see scripts/design-md.mjs.
//
// A version is named by one of:
//   • a path:            path/to/DESIGN.md
//   • a git ref + path:  <ref>:path/to/DESIGN.md      (e.g. HEAD~1:web/DESIGN.md)
//   • a git ref alone:   <ref>                          (reuses the other side's path)
//
// Usage:  node scripts/design-diff.mjs <old> <new>
//    or:  npm run design:diff -- <old> <new>
// e.g.:   node scripts/design-diff.mjs <signed-off-sha> DESIGN.md   (build's drift check)
//         node scripts/design-diff.mjs HEAD~1:web/DESIGN.md web/DESIGN.md
//
// Exit: 0 when the resolved tokens are identical, 1 when there is drift (so it
// is scriptable as a gate), 2 on a usage/read error.

import { promises as fs } from "node:fs";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseFrontmatter, flattenTokens } from "./design-md.mjs";

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

function git(args) {
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${(r.stderr || "").trim()}`);
  return r.stdout;
}

/** A filesystem path (cwd-relative or absolute) → the path git show expects (repo-root-relative). */
function repoRelative(p) {
  const root = git(["rev-parse", "--show-toplevel"]).trim();
  return path.relative(root, path.resolve(process.cwd(), p));
}

/** The path portion of a version spec, for use as the other side's fallback. */
function pathOf(spec) {
  const c = spec.indexOf(":");
  return c > 0 && !existsSync(spec) ? spec.slice(c + 1) : spec;
}

/** Resolve a version spec to its raw text. `fallbackPath` serves a bare git ref. */
async function loadSource(spec, fallbackPath) {
  if (existsSync(spec) && statSync(spec).isFile()) {
    return { label: spec, raw: await fs.readFile(path.resolve(process.cwd(), spec), "utf8") };
  }
  const colon = spec.indexOf(":");
  if (colon > 0) {
    // Explicit <ref>:<path>. Pass the path verbatim — git interprets it as
    // repo-root-relative (or cwd-relative with a leading `./`), matching git show.
    const ref = spec.slice(0, colon), p = spec.slice(colon + 1);
    return { label: `${ref}:${p}`, raw: git(["show", `${ref}:${p}`]) };
  }
  if (fallbackPath && fallbackPath !== spec) {
    // Bare <ref> reusing the other side's filesystem path — that path is
    // cwd-relative, so convert it to the repo-root-relative form git show wants.
    const rel = repoRelative(fallbackPath);
    return { label: `${spec}:${rel}`, raw: git(["show", `${spec}:${rel}`]) };
  }
  throw new Error(`cannot resolve "${spec}" — not a file, not <ref>:<path>, and no path to pair a bare ref with`);
}

function tokenMap(raw, label) {
  const { data, hadFrontmatter, error } = parseFrontmatter(raw);
  if (error) throw new Error(`${label}: ${error}`);
  if (!hadFrontmatter || !data || typeof data !== "object") {
    throw new Error(`${label}: no DESIGN.md front matter to compare`);
  }
  // Keep `contrast` floors in the comparison — a lowered floor is real drift.
  const m = new Map();
  for (const { path: p, value } of flattenTokens(data)) m.set(p, value);
  return m;
}

async function main() {
  const [oldSpec, newSpec] = process.argv.slice(2, 4);
  if (!oldSpec || !newSpec) {
    console.error("usage: node scripts/design-diff.mjs <old> <new>");
    console.error("  <old>/<new>: a path, a <ref>:path, or a bare <ref> (reuses the other side's path)");
    process.exit(2);
  }

  let a, b;
  try {
    a = await loadSource(oldSpec, pathOf(newSpec));
    b = await loadSource(newSpec, pathOf(oldSpec));
  } catch (e) {
    console.error(red("cannot load:"), e.message);
    process.exit(2);
  }

  let oldMap, newMap;
  try {
    oldMap = tokenMap(a.raw, a.label);
    newMap = tokenMap(b.raw, b.label);
  } catch (e) {
    console.error(red("cannot parse:"), e.message);
    process.exit(2);
  }

  const added = [], removed = [], changed = [];
  for (const [k, v] of newMap) {
    if (!oldMap.has(k)) added.push([k, v]);
    else if (oldMap.get(k) !== v) changed.push([k, oldMap.get(k), v]);
  }
  for (const [k, v] of oldMap) if (!newMap.has(k)) removed.push([k, v]);

  const sortByKey = (x, y) => x[0].localeCompare(y[0]);
  added.sort(sortByKey); removed.sort(sortByKey); changed.sort(sortByKey);

  console.log(`\nDESIGN.md drift`);
  console.log(dim(`  old: ${a.label}`));
  console.log(dim(`  new: ${b.label}`));

  const total = added.length + removed.length + changed.length;
  if (total === 0) {
    console.log(green(`\n  ✓ no token drift — ${newMap.size} resolved token(s) identical\n`));
    process.exit(0);
  }

  if (added.length) {
    console.log(green(`\n  + added (${added.length})`));
    for (const [k, v] of added) console.log(green(`      ${k} = ${v}`));
  }
  if (removed.length) {
    console.log(red(`\n  - removed (${removed.length})`));
    for (const [k, v] of removed) console.log(red(`      ${k} = ${v}`));
  }
  if (changed.length) {
    console.log(yellow(`\n  ~ changed (${changed.length})`));
    for (const [k, was, now] of changed) console.log(yellow(`      ${k}: ${was} → ${now}`));
  }
  console.log(
    `\n  ${total} token(s) drifted ` +
      dim(`(+${added.length} / -${removed.length} / ~${changed.length}) — capture as a build-round finding if unexplained.`) +
      "\n",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(red("design-diff error:"), err.stack || err.message);
  process.exit(2);
});
