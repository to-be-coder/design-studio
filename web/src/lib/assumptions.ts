import { parseMarkdownBody } from "./parse-markdown";
import { readProjectFile } from "./vault";
import { blockText } from "./blocks";
import type { AssumptionNode, AssumptionState, RenderableBlock } from "./types";

const REGISTER_FILE = "Assumptions & Risks.md";

/**
 * Parse `Assumptions & Risks.md` into the register / assumption-graph nodes.
 * Each `### <id> — <claim>` is one entry; its state (verified / partial /
 * unverified / accepted) is read from the body, and an entry under an
 * "Accepted risks" H2 is an accepted-risk admission (as visible as any
 * artifact). `dependents` is filled in later by the board, by matching
 * decisions whose rests_on cites the entry's id.
 */
export async function getAssumptions(slug: string): Promise<AssumptionNode[]> {
  const file = await readProjectFile(slug, REGISTER_FILE);
  if (!file) return [];
  const blocks = await parseMarkdownBody(file.body);

  const nodes: AssumptionNode[] = [];
  let current: AssumptionNode | null = null;
  let underAccepted = false;

  for (const b of blocks) {
    if (b.kind === "heading_2") {
      underAccepted = /accepted|risk/i.test(blockText(b));
      continue;
    }
    if (b.kind === "heading_3") {
      const { id, title } = splitHeading(blockText(b));
      current = {
        id,
        title,
        state: underAccepted ? "accepted" : "unverified",
        riskiest: false,
        accepted: underAccepted,
        blocks: [],
        dependents: [],
      };
      nodes.push(current);
      continue;
    }
    if (current) current.blocks.push(b);
  }

  // Fallback: some registers are written as a markdown TABLE (# | Assumption |
  // Load-bearing? | Status | notes) rather than H3 sections. Parse the raw body
  // for it when no H3 entries were found, so a table register still renders.
  if (nodes.length === 0) return parseTableRegister(file.body);

  // Resolve state + riskiest from each entry's body text.
  for (const n of nodes) {
    const text = n.blocks.map(blockText).join(" ");
    const detected = detectState(text);
    if (detected) n.state = detected;
    if (n.accepted) n.state = "accepted";
    n.riskiest = /riskiest|load-bearing/i.test(text);
  }

  return nodes;
}

/** "| a | b | c |" → ["a", "b", "c"]. */
function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

function columnIndex(header: string[], ...patterns: RegExp[]): number | null {
  const i = header.findIndex((h) => patterns.some((p) => p.test(h)));
  return i >= 0 ? i : null;
}

/**
 * Parse a register written as a markdown table. Maps `#`→id, `Assumption`→claim,
 * `Load-bearing?`→riskiest, `Status`→state; the remaining "how we'd test / found"
 * column becomes the entry body.
 */
async function parseTableRegister(body: string): Promise<AssumptionNode[]> {
  const lines = body.split(/\r?\n/);
  const isRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
  const isSep = (l: string) => /^\s*\|[\s:|-]+\|\s*$/.test(l);

  // A header row (naming an Assumption column) directly above a |---| separator.
  let headerIdx = -1;
  for (let i = 0; i < lines.length - 1; i++) {
    if (isRow(lines[i]) && isSep(lines[i + 1]) && /assumption|claim/i.test(lines[i])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const header = tableCells(lines[headerIdx]);
  const idIdx = columnIndex(header, /^#$/, /\bid\b/) ?? 0;
  const claimIdx = columnIndex(header, /assumption|claim/i) ?? 1;
  const loadIdx = columnIndex(header, /load.?bearing/i);
  const stateIdx = columnIndex(header, /status|state/i);
  const notesIdx = columnIndex(header, /how|found|test|note|evidence/i) ?? header.length - 1;

  const nodes: AssumptionNode[] = [];
  for (let i = headerIdx + 2; i < lines.length && isRow(lines[i]); i++) {
    const cells = tableCells(lines[i]);
    const id = (cells[idIdx] ?? "").trim();
    const title = (cells[claimIdx] ?? "").trim();
    if (!id || !title) continue;
    const state = (stateIdx != null && detectState(cells[stateIdx] ?? "")) || "unverified";
    const notes = notesIdx != null ? (cells[notesIdx] ?? "").trim() : "";
    nodes.push({
      id,
      title,
      state,
      riskiest: loadIdx != null && /\byes\b/i.test(cells[loadIdx] ?? ""),
      accepted: state === "accepted",
      blocks: notes ? await parseMarkdownBody(notes) : [],
      dependents: [],
    });
  }
  return nodes;
}

function splitHeading(h: string): { id: string; title: string } {
  const m = h.match(/^\s*([A-Za-z]+\d+)\s*[—–-]\s*(.+)$/);
  if (m) return { id: m[1], title: m[2].trim() };
  const first = h.trim().split(/\s+/)[0] || h.trim();
  return { id: first, title: h.trim() };
}

function detectState(text: string): AssumptionState | null {
  const t = text.toLowerCase();
  if (/\bunverified\b/.test(t)) return "unverified";
  if (/\baccepted\b/.test(t)) return "accepted";
  if (/\bpartial\b/.test(t)) return "partial";
  if (/\bverified\b/.test(t)) return "verified";
  return null;
}

/** Does a decision's rests_on string cite this assumption id? */
export function restsOnMatches(restsOn: string | null, node: AssumptionNode): boolean {
  if (!restsOn) return false;
  const r = restsOn.toLowerCase();
  const id = node.id.toLowerCase();
  // Match "#A1", "A1", or the id as a whole word / heading fragment.
  return (
    r.includes("#" + id) ||
    new RegExp(`(^|[^a-z0-9])${id}([^a-z0-9]|$)`).test(r)
  );
}

export type { RenderableBlock };
