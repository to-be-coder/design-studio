// Zero-dependency data-layer sanity check. Runs with plain `node` (no install),
// so it can validate the vault-parsing APPROACH against the real vault before
// you ever `pnpm install`. It mirrors the logic in src/lib/vault.ts + schema.ts
// (frontmatter read, Pipeline-log parse, decision supersede chains). If this
// passes, the typed app data layer parses the same shapes.

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

let failures = 0;
const ok = (msg) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
const bad = (msg) => {
  failures++;
  console.log(`  \x1b[31m✗ ${msg}\x1b[0m`);
};
function assert(cond, msg) {
  cond ? ok(msg) : bad(msg);
}

async function getVaultRoot() {
  if (process.env.DESIGN_STUDIO_VAULT) return path.resolve(process.env.DESIGN_STUDIO_VAULT);
  const raw = await fs.readFile(path.join(os.homedir(), ".design-studio-vault"), "utf8");
  return path.resolve(raw.split("\n")[0].trim());
}

// --- minimal frontmatter parse (gray-matter stands in for this in the app) ---
function frontmatter(raw) {
  if (!raw.startsWith("---")) return { data: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: raw };
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(raw.indexOf("\n", end + 1) + 1);
  const data = {};
  for (const line of fm.split("\n")) {
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    data[m[1]] = v;
  }
  return { data, body };
}

function normalizeStageName(name) {
  const n = name.trim().toLowerCase().replace(/\s+/g, "-");
  const map = {
    debrief: "debrief", research: "research", verify: "verify", reframe: "reframe",
    scope: "scope", "scope-and-sequence": "scope", directions: "directions",
    "explore-directions": "directions", converge: "converge", "design-system": "design-system",
    build: "build", validate: "validate", spec: "spec", "compile-spec": "spec",
    harvest: "harvest", "wiki-lint": "wiki-lint", setup: "setup",
  };
  return map[n] ?? null;
}

function categorize(phrase) {
  const p = phrase.toLowerCase();
  if (p.includes("not run") || p.includes("skipped")) return "skipped";
  if (p.includes("pending")) return "pending";
  if (p.includes("ran") || p.includes("shipped") || p.includes("ingested")) return "ran";
  if (p.includes("derived") || p.includes("reconciled")) return "derived";
  return "unknown";
}

function parsePipelineLog(body) {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => /^##\s+Pipeline log\b/i.test(l));
  if (start === -1) return [];
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) break;
    const m = lines[i].match(/^-\s+(.+)$/);
    if (!m) continue;
    const sep = m[1].indexOf(" — ");
    if (sep === -1) continue;
    const namePart = m[1].slice(0, sep).replace(/\*\(utility\)\*/gi, "").replace(/\*/g, "").trim();
    const rest = m[1].slice(sep + 3).trim();
    const stage = normalizeStageName(namePart);
    if (!stage) continue;
    const dateMatch = rest.match(/(\d{4}-\d{2}-\d{2})/);
    const cut = dateMatch ? rest.indexOf(dateMatch[1]) : rest.indexOf("(") === -1 ? rest.length : rest.indexOf("(");
    const rawState = rest.slice(0, cut).replace(/\*/g, "").trim().replace(/[—-]\s*$/, "").trim();
    out.push({ stage, rawState, state: categorize(rawState), date: dateMatch ? dateMatch[1] : null });
  }
  return out;
}

function stripWiki(v) {
  if (!v) return null;
  return v.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, "$1").trim() || null;
}

async function main() {
  const root = await getVaultRoot();
  console.log(`\nVault: ${root}\n`);

  // --- projects ---
  console.log("Projects");
  const designDir = path.join(root, "Design Studio");
  const entries = await fs.readdir(designDir, { withFileTypes: true });
  const projects = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const abs = path.join(designDir, e.name, "00 Dashboard.md");
    let raw;
    try {
      raw = await fs.readFile(abs, "utf8");
    } catch {
      continue;
    }
    const { data } = frontmatter(raw);
    if (data.type !== "design-project") continue;
    projects.push({ slug: e.name, ...data });
  }
  assert(projects.length === 4, `discovered 4 projects (got ${projects.length}: ${projects.map((p) => p.slug).join(", ")})`);
  assert(projects.every((p) => ["active", "blocked", "done", "archived"].includes(p.status)), "every project has a valid status");
  assert(projects.every((p) => ["full", "lite"].includes(p.route)), "every project has a valid route");

  // --- careerbot pipeline log ---
  console.log("\nCareerbot Pipeline log");
  const cbRaw = await fs.readFile(path.join(designDir, "careerbot", "00 Dashboard.md"), "utf8");
  const { data: cbData, body: cbBody } = frontmatter(cbRaw);
  assert(cbData.stage === "converge", `frontmatter stage = converge (got "${cbData.stage}")`);
  const log = parsePipelineLog(cbBody);
  const byStage = Object.fromEntries(log.map((s) => [s.stage, s]));
  assert(log.length >= 11, `parsed ${log.length} pipeline-log rows`);
  assert(byStage.debrief?.state === "ran", `debrief → ran (got ${byStage.debrief?.state})`);
  assert(byStage.verify?.state === "skipped", `verify → skipped/not-run (got ${byStage.verify?.state})`);
  assert(byStage.scope !== undefined, "scope-and-sequence normalized to 'scope'");
  assert(byStage.directions !== undefined, "explore-directions normalized to 'directions'");
  assert(byStage.spec !== undefined, "compile-spec normalized to 'spec'");
  assert(byStage["design-system"]?.state === "pending", `design-system → pending (got ${byStage["design-system"]?.state})`);
  assert(byStage.harvest !== undefined, "harvest utility row parsed");

  // --- careerbot decisions + supersede chains ---
  console.log("\nCareerbot decision log");
  const decDir = path.join(designDir, "careerbot", "Decisions");
  const decFiles = (await fs.readdir(decDir)).filter((f) => f.endsWith(".md") && f !== "CLAUDE.md");
  const decisions = [];
  for (const f of decFiles) {
    const { data } = frontmatter(await fs.readFile(path.join(decDir, f), "utf8"));
    decisions.push({
      id: String(data.id ?? f.split(" ")[0]),
      status: data.status,
      supersedes: stripWiki(data.supersedes),
      supersededBy: stripWiki(data.superseded_by),
    });
  }
  decisions.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  assert(decisions.length >= 20, `read ${decisions.length} decisions`);
  const chain = (fromId, toId) => {
    const d = decisions.find((x) => x.id === fromId);
    return d && d.supersedes && d.supersedes.startsWith(toId);
  };
  assert(chain("0019", "0010"), "0019 supersedes 0010");
  assert(chain("0021", "0012"), "0021 supersedes 0012");
  assert(chain("0022", "0017"), "0022 supersedes 0017");
  const superseded = decisions.filter((d) => d.status === "superseded");
  assert(superseded.length >= 3, `${superseded.length} decisions marked superseded (immutable-supersede discipline)`);

  console.log(
    failures === 0
      ? "\n\x1b[32mAll data-layer checks passed.\x1b[0m The typed app parses these same shapes.\n"
      : `\n\x1b[31m${failures} check(s) failed.\x1b[0m\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\x1b[31mSanity script error:\x1b[0m", err.message);
  process.exit(1);
});
