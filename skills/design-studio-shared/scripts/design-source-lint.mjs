#!/usr/bin/env node
// Find color literals inside UI component source. DESIGN.md owns visual values,
// so components consume tokens instead of creating local color systems.
//
// Usage: node design-source-lint.mjs <file-or-directory> [...]
//        node design-source-lint.mjs --self-test

import { promises as fs } from "node:fs";
import path from "node:path";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte"]);
const IGNORED_DIRECTORIES = new Set([".git", ".next", "dist", "build", "node_modules"]);
const ALLOW_MARKER = "design-source-lint: allow";
const COLOR_PATTERNS = [
  { kind: "hex color", pattern: /#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])/g },
  { kind: "color function", pattern: /\b(?:oklch|oklab|rgba?|hsla?|lab|lch|color)\s*\(/gi },
];

function executablePart(line, state) {
  let output = "";
  let quote = null;
  let escaped = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (state.inBlockComment) {
      if (char === "*" && next === "/") {
        state.inBlockComment = false;
        index++;
      }
      continue;
    }

    if (quote) {
      output += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      output += char;
      continue;
    }
    if (char === "/" && next === "/") break;
    if (char === "/" && next === "*") {
      state.inBlockComment = true;
      index++;
      continue;
    }
    output += char;
  }

  return output;
}

export function findColorLiterals(source) {
  const violations = [];
  const state = { inBlockComment: false };
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (line.includes(ALLOW_MARKER)) return;
    const executable = executablePart(line, state);
    for (const { kind, pattern } of COLOR_PATTERNS) {
      pattern.lastIndex = 0;
      for (const match of executable.matchAll(pattern)) {
        violations.push({ line: index + 1, column: match.index + 1, kind, value: match[0] });
      }
    }
  });

  return violations;
}

async function collectFiles(target, output) {
  const absolute = path.resolve(target);
  const stat = await fs.stat(absolute);
  if (stat.isFile()) {
    if (SOURCE_EXTENSIONS.has(path.extname(absolute))) output.push(absolute);
    return;
  }
  if (!stat.isDirectory()) return;

  const entries = await fs.readdir(absolute, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    await collectFiles(path.join(absolute, entry.name), output);
  }
}

function runSelfTest() {
  const cases = [
    ["token reference", 'const style = { color: "var(--accent)" };', 0],
    ["comment", "// oklch(0.5 0.2 270)", 0],
    ["hex literal", 'const style = { color: "#ffffff" };', 1],
    ["function literal", 'const style = { color: "oklch(0.5 0.2 270)" };', 1],
    ["documented exception", 'const preview = "#ffffff"; // design-source-lint: allow', 0],
  ];
  const failures = cases.filter(([name, source, count]) => {
    const actual = findColorLiterals(source).length;
    if (actual === count) return false;
    console.error(`${name}: expected ${count}, got ${actual}`);
    return true;
  });
  if (failures.length) process.exit(1);
  console.log(`design-source-lint self-test: PASS (${cases.length} cases)`);
}

async function main() {
  const targets = process.argv.slice(2);
  if (targets.length === 1 && targets[0] === "--self-test") {
    runSelfTest();
    return;
  }
  if (!targets.length) {
    console.error("usage: node design-source-lint.mjs <file-or-directory> [...]");
    process.exit(2);
  }

  const files = [];
  try {
    for (const target of targets) await collectFiles(target, files);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }

  let failures = 0;
  for (const file of files.sort()) {
    const source = await fs.readFile(file, "utf8");
    for (const violation of findColorLiterals(source)) {
      failures++;
      const shown = path.relative(process.cwd(), file) || path.basename(file);
      console.error(
        `${shown}:${violation.line}:${violation.column} raw ${violation.kind} ${violation.value}; add or reuse a DESIGN.md token`,
      );
    }
  }

  if (failures) {
    console.error(`design-source-lint: FAIL (${failures} violation${failures === 1 ? "" : "s"})`);
    process.exit(1);
  }
  console.log(`design-source-lint: PASS (${files.length} source files checked)`);
}

await main();
