#!/usr/bin/env node
// The studio's owned DESIGN.md lint — zero-dependency, runs with plain `node`
// (no install), so the design-system stage's gate is real everywhere instead of
// depending on `npx @google/design.md lint` (which was blocked in both live runs).
//
// It validates a DESIGN.md against skills/design-studio-shared/DESIGN-SPEC.md:
//   • structure   — required sections present appear in the fixed order; no
//                   duplicate section heading; front matter parses.
//   • references  — every {group.key} resolves to an existing token.
//   • motion      — [studio extension] duration/easing/transition syntax.
//   • floors      — [studio extension] contrast floors are well-formed…
//   • contrast    — …and every declared pair meets its min ratio (WCAG math),
//                   plus an advisory sweep of likely text-on-ground pairings.
//
// The contrast computation (hex/rgb/oklch → sRGB, relative luminance, WCAG
// ratio) is the same math the Canvas uses inline on its design-system board —
// see web/src/lib/color.ts. Mirrors scripts/sanity.mjs in style and reporting.
//
// The DESIGN.md front-matter parser and {group.key} reference resolution are
// shared with the token export and drift diff — see scripts/design-md.mjs.
//
// Usage:  node scripts/design-lint.mjs <path/to/DESIGN.md>
//    or:  npm run design:lint -- <path/to/DESIGN.md>

import { promises as fs } from "node:fs";
import path from "node:path";
import { parseFrontmatter, resolveValue, collectUnresolvedRefs } from "./design-md.mjs";

let failures = 0;
let warnings = 0;
const ok = (msg) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
const bad = (msg) => {
  failures++;
  console.log(`  \x1b[31m✗ ${msg}\x1b[0m`);
};
const warn = (msg) => {
  warnings++;
  console.log(`  \x1b[33m⚠\x1b[0m ${msg}`);
};
const info = (msg) => console.log(`  \x1b[2m·\x1b[0m ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : bad(msg));

// ─────────────────────────────────────────────────────────────────────────────
// Colour parsing + WCAG contrast (ported from web/src/lib/color.ts, untyped).
// ─────────────────────────────────────────────────────────────────────────────
const clamp01 = (n) => Math.max(0, Math.min(1, n));

function parseHex(s) {
  let h = s.trim().replace(/^#/, "");
  if (h.length === 3 || h.length === 4) {
    h = h.slice(0, 3).split("").map((c) => c + c).join("");
  } else if (h.length === 6 || h.length === 8) {
    h = h.slice(0, 6);
  } else return null;
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function parseRgb(s) {
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(/[,/]/).map((p) => p.trim());
  if (parts.length < 3) return null;
  const comp = (p) => (p.endsWith("%") ? (parseFloat(p) / 100) * 255 : parseFloat(p));
  const r = comp(parts[0]), g = comp(parts[1]), b = comp(parts[2]);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

function parseOklch(s) {
  const m = s.match(/oklch\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(/[/\s]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const L = parts[0].endsWith("%") ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
  const C = parseFloat(parts[1]);
  const H = parseFloat(parts[2]);
  if ([L, C, H].some((n) => Number.isNaN(n))) return null;
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3;
  const lr = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
  const toSrgb = (c) => {
    const x = clamp01(c);
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return Math.round(clamp01(v) * 255);
  };
  return { r: toSrgb(lr), g: toSrgb(lg), b: toSrgb(lb) };
}

const NAMED = { white: "#ffffff", black: "#000000", transparent: "#ffffff" };

function parseColor(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  const named = NAMED[s.toLowerCase()];
  if (named) return parseHex(named);
  if (s.startsWith("#")) return parseHex(s);
  if (/^oklch\(/i.test(s)) return parseOklch(s);
  if (/^rgba?\(/i.test(s)) return parseRgb(s);
  if (/^[0-9a-fA-F]{3,8}$/.test(s)) return parseHex(s);
  return null;
}

const channelLum = (c) => {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};
const relativeLuminance = (rgb) => 0.2126 * channelLum(rgb.r) + 0.7152 * channelLum(rgb.g) + 0.0722 * channelLum(rgb.b);

function contrastRatio(fg, bg) {
  const a = parseColor(fg), b = parseColor(bg);
  if (!a || !b) return null;
  const la = relativeLuminance(a), lb = relativeLuminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// ─────────────────────────────────────────────────────────────────────────────
// Body section-order check.
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  ["Overview", ["overview", "brand & style", "brand and style"]],
  ["Colors", ["colors", "color"]],
  ["Typography", ["typography"]],
  ["Layout", ["layout", "layout & spacing", "layout and spacing"]],
  ["Elevation & Depth", ["elevation & depth", "elevation and depth", "elevation"]],
  ["Shapes", ["shapes", "shape"]],
  ["Components", ["components", "component"]],
  ["Do's and Don'ts", ["do's and don'ts", "dos and don'ts", "do and don't", "do's & don'ts", "guidelines"]],
];
function canonicalIndex(heading) {
  const h = heading.trim().toLowerCase().replace(/[’]/g, "'");
  for (let i = 0; i < SECTIONS.length; i++) {
    if (SECTIONS[i][1].some((a) => h === a)) return i;
  }
  return -1;
}
function h2Headings(body) {
  const out = [];
  let inFence = false;
  for (const line of body.split("\n")) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = line.match(/^##(?!#)\s+(.+?)\s*$/);
    if (m) out.push(m[1]);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Motion syntax [studio extension].
// ─────────────────────────────────────────────────────────────────────────────
const EASING_KEYWORDS = new Set(["linear", "ease", "ease-in", "ease-out", "ease-in-out", "step-start", "step-end"]);
const isDuration = (v) => /^-?\d*\.?\d+(ms|s)$/.test(String(v).trim());
function isEasing(v, tree) {
  const s = resolveValue(v, tree).trim();
  if (EASING_KEYWORDS.has(s)) return true;
  return /^(cubic-bezier|steps)\s*\(/i.test(s);
}
function checkMotion(tree) {
  const motion = tree.motion;
  if (motion == null) { info("no motion tokens declared (optional extension)"); return; }
  if (typeof motion !== "object") { bad("motion: must be a map of duration/easing/transition"); return; }
  const { duration, easing, transition } = motion;
  if (duration && typeof duration === "object") {
    for (const [k, v] of Object.entries(duration)) {
      assert(isDuration(v), `motion.duration.${k} is a time value (got "${v}")`);
    }
  }
  if (easing && typeof easing === "object") {
    for (const [k, v] of Object.entries(easing)) {
      assert(isEasing(v, tree), `motion.easing.${k} is a valid timing function (got "${v}")`);
    }
  }
  if (transition && typeof transition === "object") {
    for (const [k, v] of Object.entries(transition)) {
      const resolved = resolveValue(v, tree);
      const hasDuration = resolved.split(/\s+/).some((tok) => isDuration(tok));
      assert(hasDuration, `motion.transition.${k} composes a duration (got "${resolved}")`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contrast floors [studio extension] + WCAG enforcement + advisory sweep.
// ─────────────────────────────────────────────────────────────────────────────
function checkFloors(tree) {
  const c = tree.contrast;
  const globalNormal = c && typeof c.normalText === "number" ? c.normalText : 4.5;
  const globalLarge = c && typeof c.largeText === "number" ? c.largeText : 3.0;

  if (c == null) {
    info("no contrast floors declared — applying WCAG AA defaults (normal 4.5, large 3.0) for the advisory sweep");
  } else {
    if (c.normalText != null) assert(typeof c.normalText === "number", `contrast.normalText is a number (got ${JSON.stringify(c.normalText)})`);
    if (c.largeText != null) assert(typeof c.largeText === "number", `contrast.largeText is a number (got ${JSON.stringify(c.largeText)})`);
    const pairs = c.pairs;
    if (pairs != null) {
      if (!Array.isArray(pairs)) {
        bad("contrast.pairs must be a sequence");
      } else {
        pairs.forEach((pr, idx) => {
          const at = `contrast.pairs[${idx}]`;
          if (!pr || typeof pr !== "object") { bad(`${at} must be a map with fg/bg/min`); return; }
          const okShape = typeof pr.fg === "string" && typeof pr.bg === "string" && typeof pr.min === "number";
          if (!okShape) { bad(`${at} needs string fg, string bg, and numeric min`); return; }
          const fg = resolveValue(pr.fg, tree);
          const bg = resolveValue(pr.bg, tree);
          const ratio = contrastRatio(fg, bg);
          const label = pr.note ? ` (${pr.note})` : "";
          if (ratio == null) {
            bad(`${at}: cannot compute contrast — unresolved/unparseable colour (fg="${fg}", bg="${bg}")`);
            return;
          }
          assert(ratio >= pr.min, `${at}: ${pr.fg} on ${pr.bg} = ${ratio.toFixed(2)}:1 ≥ ${pr.min}:1${label}`);
        });
      }
    }
  }
  return { globalNormal, globalLarge };
}

/** Advisory sweep — mirrors the Canvas design-system board's buildPairings. */
function contrastSweep(tree, floor) {
  const colors = tree.colors;
  if (!colors || typeof colors !== "object") return;
  const keys = Object.keys(colors);
  const has = (k) => keys.includes(k);
  const colorVal = (k) => resolveValue(colors[k], tree);

  const grounds = keys.filter((k) => /^(bg|background|surface|paper|desk|ground|base|card)/i.test(k));
  const actionKeys = keys.filter((k) => /(primary|accent|action|danger|success|warn|cta|brand)/i.test(k));
  const groundList = grounds.length ? grounds : keys.filter((k) => k === "bg" || k === "surface");

  // The on-fill text colours (e.g. accentInk, primaryText) belong on their fill,
  // not on a page ground — pair them text-on-fill only, never text-on-ground.
  const onKeyFor = (a) =>
    keys.find((k) => new RegExp(`^${a}text$`, "i").test(k))
      ?? (has("primaryText") ? "primaryText" : has("accentInk") ? "accentInk" : has("bg") ? "bg" : null);
  const onFillKeys = new Set(actionKeys.map(onKeyFor).filter(Boolean));
  const textKeys = keys.filter((k) => /(text|ink|fg|foreground|muted|faint|body|heading)/i.test(k) && !onFillKeys.has(k));

  let swept = 0, low = 0;
  const consider = (fgKey, bgKey, kind) => {
    if (fgKey === bgKey) return;
    const ratio = contrastRatio(colorVal(fgKey), colorVal(bgKey));
    if (ratio == null) return;
    swept++;
    if (ratio < floor) {
      low++;
      warn(`advisory: ${fgKey} on ${bgKey} = ${ratio.toFixed(2)}:1 < ${floor}:1 (${kind}) — confirm it is large/non-text or paired with a non-colour mark`);
    }
  };
  for (const t of textKeys) for (const g of groundList) consider(t, g, "text-on-ground");
  for (const a of actionKeys) {
    const onKey = onKeyFor(a);
    if (onKey) consider(onKey, a, "text-on-fill");
  }
  info(`advisory contrast sweep: ${swept} likely pairings checked against the ${floor}:1 floor, ${low} below (warnings only — declared floors are the gate)`);
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: node scripts/design-lint.mjs <path/to/DESIGN.md>");
    process.exit(2);
  }
  const abs = path.resolve(process.cwd(), target);
  let raw;
  try {
    raw = await fs.readFile(abs, "utf8");
  } catch {
    console.error(`\x1b[31mcannot read\x1b[0m ${abs}`);
    process.exit(2);
  }

  console.log(`\nDESIGN.md lint: ${abs}\n`);

  const { data, body, hadFrontmatter, error } = parseFrontmatter(raw);

  console.log("Front matter");
  if (error) { bad(error); }
  assert(hadFrontmatter && data != null, "front matter present and parses");
  const tree = data && typeof data === "object" ? data : {};

  console.log("\nStructure — section order");
  const headings = h2Headings(body);
  let lastIdx = -1;
  const seen = new Set();
  let orderOk = true;
  for (const h of headings) {
    const idx = canonicalIndex(h);
    if (idx === -1) continue; // unknown section: allowed, ignored
    if (seen.has(idx)) { bad(`duplicate section heading "${SECTIONS[idx][0]}" — the file is rejected`); orderOk = false; continue; }
    seen.add(idx);
    if (idx < lastIdx) { bad(`section "${SECTIONS[idx][0]}" is out of order (must precede the section before it)`); orderOk = false; }
    lastIdx = Math.max(lastIdx, idx);
  }
  if (orderOk) ok(`known sections in the fixed order (${[...seen].sort((a, b) => a - b).map((i) => SECTIONS[i][0]).join(" → ") || "none present"})`);
  const required = ["Colors"]; // at minimum a token contract needs its palette
  for (const r of required) {
    const idx = SECTIONS.findIndex((s) => s[0] === r);
    if (!seen.has(idx)) warn(`recommended section "${r}" is absent`);
  }

  console.log("\nToken references");
  const unresolved = collectUnresolvedRefs(tree);
  if (unresolved.length === 0) ok("every {group.key} reference resolves");
  else for (const u of unresolved) bad(`unresolved reference {${u.ref}} at ${u.loc}`);

  console.log("\nMotion [studio extension]");
  checkMotion(tree);

  console.log("\nAccessibility floors [studio extension]");
  const { globalNormal } = checkFloors(tree);

  console.log("\nContrast");
  contrastSweep(tree, globalNormal);

  console.log(
    failures === 0
      ? `\n\x1b[32mPASS\x1b[0m — 0 failures, ${warnings} warning(s).\n`
      : `\n\x1b[31mFAIL\x1b[0m — ${failures} failure(s), ${warnings} warning(s).\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\x1b[31mdesign-lint error:\x1b[0m", err.stack || err.message);
  process.exit(2);
});
