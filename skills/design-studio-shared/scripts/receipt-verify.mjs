#!/usr/bin/env node
// The studio's owned receipt verifier: zero-dependency, plain `node`, so the
// Understand loop's receipt contract is enforceable in any project vault (see
// CONVENTIONS, "The Understand loop state machine"). Reads one project folder:
//   (a) every receipt in "Knowns & Unknowns.md" + "What's Worth Building.md" is
//       a wikilink [[t]] / [[t#a]] plus a quoted span (25 words max) whose target
//       resolves Obsidian-style (exact rel path, then basename) and whose quote
//       occurs literally in the target (whitespace normalized). A bare wikilink
//       is not a receipt.
//   (b) every ledger entry graded verified/partial carries a conforming receipt.
//   (c) a grade tag cited beside an L<N> ref in the compile never exceeds that
//       entry's ledger state (the doc cannot out-grade the register).
//   (d) every Build now / Don't build reason bullet carries a receipt or ASSUMPTION:.
//   (e) What's Worth Building v2 (when the newest recommendation decision carries a
//       Candidates table): candidate W-ids are unique across the Proposed / Build now /
//       Backlog / Don't build entries and each is minted in that Candidates table, and
//       every `## Build now` entry carries a ruled_by: line (human-confirmed only).
//   (f) the verdict scan is FRONTMATTER-scoped (the frontmatter is the text between the
//       first `---` pair) and shares ONE predicate with the runner's quarantine:
//       "claims a human verdict" == frontmatter authored_by: user OR status: decided
//       (a body mention never trips it). Two modes:
//       --since <iso-date>: strict research-round quarantine. Any decision touched
//         on/after the date that claims a human verdict is a headless-verdict violation
//         (no batch is authorized in a research window).
//       --review <B> --review-hash <sha256>: review-authentication. The ledger block
//         <!-- review:B:begin --> ... <!-- review:B:end --> must exist and its inner
//         content (trimmed) must sha256 to the passed hash (tamper check). Pair with
//         --since <capture-time> to scope the scan to the recorder's run: there every
//         decision claiming a human verdict must carry review_batch: B AND have an
//         In-their-words / quoted span occurring literally inside block B, and anything
//         else (a bare or wrong-batch verdict sneaked into the window) quarantines.
//         Unscoped, it authenticates only the review_batch: B decisions and leaves prior
//         interactive rulings alone (those are the strict --since scan's concern).
// Exit 0 with a summary when clean, 1 with one line per violation. Mirrors
// scripts/design-lint.mjs in style.
// Usage: node scripts/receipt-verify.mjs <project-dir> [--since <iso-date>]
//        node scripts/receipt-verify.mjs <project-dir> --review <B> --review-hash <sha256> [--since <iso-date>]

import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const LEDGER = "Knowns & Unknowns.md";
const WWB = "What's Worth Building.md";
const GRADE_RANK = { verified: 3, partial: 2, unverified: 1, accepted: 1 };
const LEDGER_LABELS = new Set([
  "kind", "state", "load_bearing", "assumption", "attempts",
  "spawned_by", "answered_by", "receipts", "note", "ask",
]);

const violations = [];
const violation = (where, msg) => violations.push(`${where}: ${msg}`);
let receiptsChecked = 0;
let entriesGraded = 0;

const norm = (s) => s.replace(/\s+/g, " ").trim();
const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const readFileSafe = async (p) => {
  try { return await fs.readFile(p, "utf8"); } catch { return null; }
};

async function walkMd(dir) {
  const out = [];
  const rec = async (d) => {
    let ents;
    try { ents = await fs.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name === "_assets") continue; await rec(p); }
      else if (e.name.endsWith(".md")) out.push(p);
    }
  };
  await rec(dir);
  return out;
}

// A receipt is a wikilink plus a quoted span. Returns { target, anchor, quote, raw }
// or null when the line carries no wikilink at all.
function parseReceipt(line) {
  const link = line.match(/\[\[([^\]]+)\]\]/);
  if (!link) return null;
  let target = link[1].trim(), anchor = null;
  const pipe = target.indexOf("|"); // Obsidian alias: [[target|display]]
  if (pipe >= 0) target = target.slice(0, pipe).trim();
  const h = target.indexOf("#");
  if (h >= 0) { anchor = target.slice(h + 1).trim(); target = target.slice(0, h).trim(); }
  const after = line.slice(link.index + link[0].length);
  const q = after.match(/"([^"]+)"|“([^”]+)”/);
  const quote = q ? (q[1] ?? q[2]) : null;
  return { target, anchor, quote, raw: line.trim() };
}

// Obsidian-style resolution: exact relative path first, then basename match.
function resolveTarget(target, projectDir, mdFiles) {
  const want = target.replace(/\\/g, "/").replace(/\.md$/i, "");
  for (const f of mdFiles) {
    const rel = path.relative(projectDir, f).replace(/\\/g, "/").replace(/\.md$/i, "");
    if (rel === want) return f;
  }
  const base = want.split("/").pop();
  const hit = mdFiles.find((f) => path.basename(f).replace(/\.md$/i, "") === base);
  return hit ?? null;
}

const fileCache = new Map();
async function loadTarget(file) {
  if (fileCache.has(file)) return fileCache.get(file);
  const c = (await readFileSafe(file)) ?? "";
  fileCache.set(file, c);
  return c;
}

// Returns a violation message, or null when the receipt conforms.
async function validateReceipt(rec, projectDir, mdFiles) {
  if (!rec.quote) return `bare wikilink is not a receipt (no quoted span): ${rec.raw}`;
  const words = rec.quote.trim().split(/\s+/);
  if (words.length > 25) return `receipt quote exceeds 25 words (${words.length}): ${rec.raw}`;
  const file = resolveTarget(rec.target, projectDir, mdFiles);
  if (!file) return `receipt target [[${rec.target}]] does not resolve to a file: ${rec.raw}`;
  const content = await loadTarget(file);
  if (!norm(content).includes(norm(rec.quote)))
    return `receipt quote not found verbatim in ${path.basename(file)}: ${rec.raw}`;
  return null;
}

// Parse the ledger into entries, skipping append-only round/answer/review blocks.
function parseLedger(body) {
  const entries = [];
  let cur = null, inBlock = false;
  for (const line of body.split("\n")) {
    if (/<!--\s*(round|answers|review):\S*:begin/i.test(line)) { inBlock = true; cur = null; continue; }
    if (/<!--\s*(round|answers|review):\S*:end/i.test(line)) { inBlock = false; continue; }
    if (inBlock) continue;
    const head = line.match(/^###\s+(L\d+)\s*:?\s*(.*)$/);
    if (head) { cur = { id: head[1], title: head[2].trim(), fields: {}, f: null }; entries.push(cur); continue; }
    if (!cur) continue;
    if (/^#{1,3}\s/.test(line) || /^\s*<!--/.test(line)) { cur = null; continue; }
    const m = line.match(/^(\s*)([A-Za-z_][\w-]*)\s*:\s?(.*)$/);
    if (m && LEDGER_LABELS.has(m[2])) {
      cur.f = m[2];
      cur.fields[m[2]] = { value: (m[3] || "").trim(), lines: [] };
      if ((m[3] || "").trim()) cur.fields[m[2]].lines.push(m[3].trim());
    } else if (cur.f && line.trim()) {
      cur.fields[cur.f].lines.push(line.trim());
    }
  }
  return entries;
}

// Parse What's Worth Building into its v1 four sections. Capability sub-headings
// (level 3+) stay as section content; unknown level 1-2 headings end a section.
// "Build now" maps to build; the v2-only sections (Proposed / Backlog / Parked /
// Questions) are not reason-bullet sections and end the current one.
function parseWwb(body) {
  const sections = { build: [], dontbuild: [], implied: [], open: [] };
  let cur = null;
  for (const line of body.split("\n")) {
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length, name = h[2].trim().toLowerCase();
      let next = null;
      if (/^build\b/.test(name)) next = "build";
      else if (/^don'?t\s*build\b/.test(name)) next = "dontbuild";
      else if (/implied/.test(name)) next = "implied";
      else if (/open unknowns|blocking a verdict/.test(name)) next = "open";
      if (next) { cur = next; continue; }
      if (level <= 2) { cur = null; continue; }
    }
    if (cur) sections[cur].push(line);
  }
  return sections;
}

// Group a section's lines into bullet units (a bullet plus its wrapped lines).
function bulletUnits(arr) {
  const units = [];
  let cur = null;
  for (const line of arr) {
    if (/^\s*[-*]\s+/.test(line)) { cur = [line]; units.push(cur); }
    else if (cur && line.trim() && !/^#{1,6}\s/.test(line)) cur.push(line);
    else if (!line.trim()) cur = null;
  }
  return units.map((u) => u.join(" "));
}

// --- Shared frontmatter-scoped verdict predicate (runner + receipt-verify) ---
// The frontmatter is the text between the first `---` pair, exactly as the --since
// scan has always split it.
const extractFrontmatter = (content) => (content || "").split(/^---\s*$/m)[1] || "";
const hasUserAuthor = (fm) => /^\s*authored_by\s*:\s*user\b/mi.test(fm);
const hasDecidedStatus = (fm) => /^\s*status\s*:\s*decided\b/mi.test(fm);
const claimsHumanVerdict = (fm) => hasUserAuthor(fm) || hasDecidedStatus(fm);
const reviewBatchOf = (fm) => {
  const m = fm.match(/^\s*review_batch\s*:\s*(\S+)/mi);
  return m ? m[1].trim() : null;
};

// Quoted spans from a decision body: the In-their-words blockquote plus any "..." spans.
function extractQuotedSpans(content) {
  const spans = [];
  const afterMarker = content.split(/\*\*In their words\.?\*\*/i)[1];
  if (afterMarker != null) {
    const bq = [];
    let started = false;
    for (const line of afterMarker.split("\n")) {
      if (/^\s*>/.test(line)) { bq.push(line.replace(/^\s*>\s?/, "")); started = true; }
      else if (!started && line.trim() === "") continue;
      else if (started) break;
    }
    if (bq.length) spans.push(bq.join(" "));
  }
  for (const m of content.matchAll(/"([^"]+)"|“([^”]+)”/g)) spans.push(m[1] ?? m[2]);
  return spans.map((s) => s.trim()).filter((s) => s.length > 0);
}

// The inner content of the ledger's review block B (between the begin/end markers),
// or null when the block is absent.
function findReviewBlock(ledger, B) {
  const b = escRe(B);
  const re = new RegExp(`<!--\\s*review:${b}:begin\\s*-->([\\s\\S]*?)<!--\\s*review:${b}:end\\s*-->`);
  const m = ledger.match(re);
  return m ? m[1] : null;
}

// A Candidates table header row: | W | title | lean | rests_on |
const CANDIDATES_HEADER = /^\|\s*W\s*\|\s*title\s*\|\s*lean\s*\|\s*rests_on\s*\|/im;

// The W-ids listed in a decision's Candidates table (in order, with duplicates kept).
function parseCandidatesTable(content) {
  const wids = [];
  let inTable = false;
  for (const line of content.split("\n")) {
    if (/^\|\s*W\s*\|\s*title\s*\|\s*lean\s*\|\s*rests_on\s*\|/i.test(line)) { inTable = true; continue; }
    if (!inTable) continue;
    if (/^\|\s*:?-+:?\s*\|/.test(line)) continue;          // separator row
    const m = line.match(/^\|\s*(W\d+)\s*\|/i);
    if (m) wids.push(m[1]);
    else if (!/^\s*\|/.test(line)) break;                   // table ended
  }
  return wids;
}

// What's Worth Building v2 candidate entries: `### W<N>: ...` under Proposed /
// Build now / Backlog / Don't build. Returns { wid, section, lines }[].
function parseWwbV2(body) {
  const sectionOf = (name) => {
    const n = name.toLowerCase();
    if (/^build\s*now\b/.test(n)) return "build-now";
    if (/^backlog\b/.test(n)) return "backlog";
    if (/^don'?t\s*build\b/.test(n)) return "dont-build";
    if (/^proposed\b/.test(n)) return "proposed";
    return null;
  };
  const entries = [];
  let section = null, entry = null;
  for (const line of body.split("\n")) {
    const h3 = line.match(/^###\s+(.*)$/);
    const h2 = line.match(/^##\s+(.*)$/);
    if (h3) {
      const wid = h3[1].match(/^(W\d+)\b/i);
      entry = wid ? { wid: wid[1].toUpperCase(), section, lines: [] } : null;
      if (entry) entries.push(entry);
      continue;
    }
    if (h2) { section = sectionOf(h2[1].trim()); entry = null; continue; }
    if (entry) entry.lines.push(line);
  }
  return entries;
}

async function main() {
  const args = process.argv.slice(2);
  let projectDir = null, since = null, review = null, reviewHash = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--since") since = args[++i];
    else if (args[i] === "--review") review = args[++i];
    else if (args[i] === "--review-hash") reviewHash = args[++i];
    else if (!projectDir) projectDir = args[i];
  }
  if (!projectDir) {
    console.error("usage: node scripts/receipt-verify.mjs <project-dir> [--since <iso-date>]");
    console.error("       node scripts/receipt-verify.mjs <project-dir> --review <B> --review-hash <sha256> [--since <iso-date>]");
    process.exit(2);
  }
  projectDir = path.resolve(process.cwd(), projectDir);
  const mdFiles = await walkMd(projectDir);

  const decDir = path.join(projectDir, "Decisions");
  let decFiles = [];
  try {
    decFiles = (await fs.readdir(decDir)).filter((f) => f.endsWith(".md")).sort().map((f) => path.join(decDir, f));
  } catch {}

  // Ledger: receipts (a) + grade-requires-receipt (b).
  const ledgerRaw = await readFileSafe(path.join(projectDir, LEDGER));
  const entries = ledgerRaw == null ? [] : parseLedger(ledgerRaw);
  if (ledgerRaw == null) console.error(`  · no ${LEDGER}, skipping ledger checks`);
  for (const e of entries) {
    const state = (e.fields.state?.value || "").split(/[\s#]/)[0].toLowerCase();
    let conforming = 0;
    for (const rl of e.fields.receipts?.lines || []) {
      const rec = parseReceipt(rl);
      if (!rec) continue;
      receiptsChecked++;
      const err = await validateReceipt(rec, projectDir, mdFiles);
      if (err) violation(`${LEDGER} ${e.id}`, err);
      else conforming++;
    }
    if (state === "verified" || state === "partial") {
      entriesGraded++;
      if (conforming === 0) violation(`${LEDGER} ${e.id}`, `graded ${state} but carries no conforming receipt`);
    }
  }

  // What's Worth Building: receipts (a), out-grade (c), reason-has-receipt (d).
  const wwbRaw = await readFileSafe(path.join(projectDir, WWB));
  if (wwbRaw == null) {
    console.error(`  · no ${WWB}, skipping compile checks`);
  } else {
    for (const line of wwbRaw.split("\n")) {
      const rec = parseReceipt(line);
      if (rec && rec.quote) {
        receiptsChecked++;
        const err = await validateReceipt(rec, projectDir, mdFiles);
        if (err) violation(WWB, err);
      }
    }
    const ledgerRank = {};
    for (const e of entries) {
      const s = (e.fields.state?.value || "").split(/[\s#]/)[0].toLowerCase();
      if (s in GRADE_RANK) ledgerRank[e.id] = GRADE_RANK[s];
    }
    const gradeTag = /[[(`]\s*(verified|partial|unverified|accepted)\s*[\])`]/i;
    const sections = parseWwb(wwbRaw);
    for (const sec of ["build", "dontbuild", "implied", "open"]) {
      for (const line of sections[sec]) {
        const g = line.match(gradeTag), lid = line.match(/\bL(\d+)\b/);
        if (g && lid) {
          const id = "L" + lid[1], claimed = GRADE_RANK[g[1].toLowerCase()];
          if (id in ledgerRank && claimed > ledgerRank[id])
            violation(WWB, `claims '${g[1]}' for ${id} but the ledger grades it lower (the doc cannot out-grade the register): ${line.trim()}`);
        }
      }
    }
    for (const sec of ["build", "dontbuild"]) {
      for (const unit of bulletUnits(sections[sec])) {
        const rec = parseReceipt(unit);
        if (/ASSUMPTION:/.test(unit) || (rec && rec.quote)) continue;
        violation(`${WWB} [${sec}]`, `reason bullet lacks a receipt or ASSUMPTION: mark: ${unit.trim().slice(0, 120)}`);
      }
    }

    // Reviewable candidates must be skimmable: every Proposed entry, and every
    // Don't build entry that is an AI proposal, carries a one-line what:, for:,
    // and against:. The receipted bullets stay as the folded evidence.
    {
      for (const secName of ["Proposed", "Don't build"]) {
        const sec = wwbRaw.match(new RegExp(`^## ${secName.replace(/'/g, "'")}\\s*$([\\s\\S]*?)(?=^## |\\n*$(?![\\s\\S]))`, "m"));
        if (!sec) continue;
        const entries = sec[1].split(/^### /m).slice(1);
        for (const entry of entries) {
          const title = entry.split("\n", 1)[0].trim();
          if (secName === "Don't build" && !/proposed-by-AI/i.test(entry)) continue;
          for (const need of ["what", "for", "against"]) {
            const m = entry.match(new RegExp(`^${need}:\\s*(\\S.*)$`, "m"));
            if (!m) {
              violation(`${WWB} [${secName === "Proposed" ? "proposed" : "dontbuild"}]`, `candidate lacks a one-line ${need}: ${title.slice(0, 80)}`);
              continue;
            }
            // Each summary line must stand alone: an opening pronoun points at
            // another line the skimming reader did not read.
            if (/^(they|it|that|these|those)\b/i.test(m[1].trim()))
              violation(`${WWB} [${secName === "Proposed" ? "proposed" : "dontbuild"}]`, `${need}: line leans on another line (opens with a pronoun): ${m[1].trim().slice(0, 80)}`);
          }
        }
      }
    }

    // Parked directions picks must be clickable: an ask: line, and the drafted
    // options as an options: list (two lines minimum). Prose alone leaves the
    // reviewer a card with nothing to press.
    {
      const parkedSec = wwbRaw.match(/^## Parked decisions\s*$([\s\S]*?)(?=^## |\n*$(?![\s\S]))/m);
      if (parkedSec) {
        const entries = parkedSec[1].split(/^### /m).slice(1);
        for (const entry of entries) {
          const title = entry.split("\n", 1)[0].trim();
          if (!/^kind:\s*directions-pick/m.test(entry)) continue;
          if (!/^ask:\s*\S/m.test(entry))
            violation(`${WWB} [parked]`, `directions pick lacks an ask: line: ${title.slice(0, 80)}`);
          const optHeader = entry.match(/^options:\s*$/m);
          const optCount = optHeader
            ? (entry.slice(optHeader.index).match(/^\s+-\s+[A-Za-z0-9]{1,3}:\s+\S/gm) || []).length
            : 0;
          if (optCount < 2)
            violation(`${WWB} [parked]`, `directions pick needs an options: list with at least two drafted options: ${title.slice(0, 80)}`);
        }
      }
    }
  }

  // What's Worth Building v2 (e): W-ids + Build now ruled_by, gated on a Candidates
  // table existing in the newest recommendation decision (v1 renders skip this).
  let candidatesWids = null, candidatesFile = null;
  {
    let newestId = -1;
    for (const f of decFiles) {
      const content = (await readFileSafe(f)) || "";
      if (!CANDIDATES_HEADER.test(content)) continue;
      const idm = path.basename(f).match(/^(\d+)/);
      const id = idm ? parseInt(idm[1], 10) : 0;
      if (id >= newestId) { newestId = id; candidatesFile = f; candidatesWids = parseCandidatesTable(content); }
    }
  }
  if (candidatesWids == null) {
    console.error(`  · no Candidates table in Decisions/, skipping the What's Worth Building v2 W-id checks`);
  } else {
    const tableSet = new Set();
    for (const w of candidatesWids) {
      if (tableSet.has(w)) violation(`Decisions/${path.basename(candidatesFile)}`, `Candidates table reuses W-id ${w} (W-ids must be unique, never reused)`);
      tableSet.add(w);
    }
    if (wwbRaw != null) {
      const wwbEntries = parseWwbV2(wwbRaw);
      const seen = new Map();
      for (const e of wwbEntries) {
        if (!e.section) continue; // only Proposed / Build now / Backlog / Don't build carry candidates
        seen.set(e.wid, (seen.get(e.wid) || 0) + 1);
        if (!tableSet.has(e.wid))
          violation(WWB, `candidate ${e.wid} is not minted in the recommendation's Candidates table (${path.basename(candidatesFile)})`);
        if (e.section === "build-now" && !e.lines.some((l) => /^\s*ruled_by\s*:/i.test(l)))
          violation(WWB, `Build now entry ${e.wid} carries no ruled_by: (Build now is human-confirmed only)`);
      }
      for (const [wid, n] of seen)
        if (n > 1) violation(WWB, `W-id ${wid} appears on ${n} candidate entries (must be unique across candidates)`);
    }
  }

  // Verdict scan: review-authentication (f) or the strict --since quarantine.
  if (review != null) {
    const B = String(review);
    const ledgerContent = ledgerRaw ?? "";
    if (reviewHash == null) console.error("  · --review given without --review-hash; the tamper check cannot run");
    const inner = ledgerContent ? findReviewBlock(ledgerContent, B) : null;
    if (inner == null) {
      violation(LEDGER, `review-authentication: block <!-- review:${B}:begin/end --> not found in the ledger`);
    } else {
      const innerTrimmed = inner.trim();
      const gotHash = crypto.createHash("sha256").update(innerTrimmed, "utf8").digest("hex");
      if (reviewHash != null && gotHash.toLowerCase() !== String(reviewHash).toLowerCase())
        violation(LEDGER, `review-authentication: block ${B} content hash mismatch (tampered or wrong batch): expected ${reviewHash}, got ${gotHash}`);
      const blockNorm = norm(innerTrimmed);
      const sinceMs = since != null ? Date.parse(since) : NaN;
      const scoped = since != null && !Number.isNaN(sinceMs); // window scoped to the recorder's run
      for (const f of decFiles) {
        if (scoped) {
          let st; try { st = await fs.stat(f); } catch { continue; }
          if (st.mtimeMs < sinceMs) continue;
        }
        const content = (await readFileSafe(f)) || "";
        const fm = extractFrontmatter(content);
        if (!claimsHumanVerdict(fm)) continue;
        const batch = reviewBatchOf(fm);
        if (batch === B) {
          const spans = extractQuotedSpans(content);
          if (!spans.some((s) => blockNorm.includes(norm(s))))
            violation(`Decisions/${path.basename(f)}`, `review-authentication: review_batch ${B} but no In-their-words / quoted span occurs literally inside block ${B}`);
        } else if (scoped) {
          // Inside the recorder's scoped window, anything not carrying review_batch: B is a sneaked
          // verdict (a bare headless verdict, or one stamped for a different batch): quarantine it.
          violation(`Decisions/${path.basename(f)}`, batch == null
            ? `review-authentication: verdict in the batch ${B} window carries no review_batch (bare headless verdict)`
            : `review-authentication: verdict in the batch ${B} window carries review_batch ${batch}, not ${B}`);
        }
        // Unscoped whole-folder run: decisions outside batch B (interactive rulings, other batches)
        // are not this batch's concern and are authenticated by --since or their own --review run.
      }
    }
  } else if (since != null) {
    const sinceMs = Date.parse(since);
    if (Number.isNaN(sinceMs)) { console.error(`  · --since "${since}" is not a parseable date, skipping the verdict scan`); }
    else {
      for (const f of decFiles) {
        let st; try { st = await fs.stat(f); } catch { continue; }
        if (st.mtimeMs < sinceMs) continue;
        const fm = extractFrontmatter((await readFileSafe(f)) || "");
        if (hasUserAuthor(fm))
          violation(`Decisions/${path.basename(f)}`, "headless-verdict violation: authored_by: user written in the run window");
        if (hasDecidedStatus(fm))
          violation(`Decisions/${path.basename(f)}`, "headless-verdict violation: status: decided written in the run window");
      }
    }
  }

  if (violations.length === 0) {
    console.log(`receipt-verify: PASS: 0 violations (${receiptsChecked} receipt(s) checked, ${entriesGraded} graded entr(ies))`);
    process.exit(0);
  }
  for (const v of violations) console.log(v);
  console.log(`receipt-verify: FAIL: ${violations.length} violation(s) (${receiptsChecked} receipt(s) checked)`);
  process.exit(1);
}

main().catch((err) => {
  console.error("receipt-verify error:", err.stack || err.message);
  process.exit(2);
});
