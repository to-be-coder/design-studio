import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { DESIGN_DIR, getVaultRoot, VaultNotConfiguredError } from "@/lib/vault";
import { HIDDEN_SLUGS } from "@/lib/hidden-projects";
import { autorunEnabled, researchLoopLive, startResearchLoop } from "@/lib/debrief-runner";

export const dynamic = "force-dynamic";

const LEDGER_FILE = "Knowns & Unknowns.md";
const VERDICTS = new Set(["build-now", "backlog", "dont-build"]);
const DISPOSITIONS = new Set(["accept", "reshape", "reject", "pick"]);

interface Verdict {
  id: string;
  verdict: string;
  note?: string;
  unblocks?: string;
}
interface Answer {
  id: string;
  text: string;
}
interface Ruling {
  id: string;
  kind?: string;
  disposition: string;
  words: string;
}

/** Whitespace-normalize for the "words must differ from the candidate" check. */
function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Record a human review batch, the ONE place this app writes the vault. It
 * appends an `<!-- review:B:begin/end -->` block (the human's verbatim words) to
 * the ledger's `## Review log` region and NOTHING else, captures the block's
 * sha256 out-of-band, then hands the batch id + hash to the recorder via
 * startResearchLoop. A live loop still persists the block but does not spawn (the
 * human can resubmit once it parks). Same opt-in gate as every headless run.
 */
export async function POST(req: Request) {
  if (!autorunEnabled()) {
    return NextResponse.json(
      { error: "Skill runs are off. Set DESIGN_STUDIO_AUTORUN_DEBRIEF=1 to enable." },
      { status: 403 },
    );
  }

  let body: {
    slug?: unknown;
    wwbRound?: unknown;
    entriesHash?: unknown;
    verdicts?: unknown;
    answers?: unknown;
    ruling?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!slug || HIDDEN_SLUGS.has(slug)) {
    return NextResponse.json({ error: "A slug is required." }, { status: 400 });
  }

  // verdicts: drop any invalid row (unknown verdict, empty id).
  const verdicts: Verdict[] = Array.isArray(body.verdicts)
    ? body.verdicts
        .map((v) => {
          const r = v as { id?: unknown; verdict?: unknown; note?: unknown; unblocks?: unknown };
          const id = typeof r.id === "string" ? r.id.trim() : "";
          const verdict = typeof r.verdict === "string" ? r.verdict.trim() : "";
          const note = typeof r.note === "string" ? r.note.trim() : "";
          const unblocks = typeof r.unblocks === "string" ? r.unblocks.trim() : "";
          return { id, verdict, note: note || undefined, unblocks: unblocks || undefined };
        })
        .filter((v) => v.id && VERDICTS.has(v.verdict))
    : [];

  // answers: keep only the non-empty ones.
  const answers: Answer[] = Array.isArray(body.answers)
    ? body.answers
        .map((a) => {
          const r = a as { id?: unknown; text?: unknown };
          return {
            id: typeof r.id === "string" ? r.id.trim() : "",
            text: typeof r.text === "string" ? r.text.trim() : "",
          };
        })
        .filter((a) => a.id && a.text)
    : [];

  // ruling: only with confirmed === true. Accepting or rejecting the candidate
  // as written is a complete ruling with no words needed; a reshape requires
  // words that are not the candidate text verbatim (an unedited candidate is
  // not a reshape). A pick carries the chosen drafted option as its words:
  // selected by click, never typed, so the block has a quotable span.
  let ruling: Ruling | null = null;
  if (body.ruling && typeof body.ruling === "object") {
    const r = body.ruling as {
      id?: unknown;
      kind?: unknown;
      disposition?: unknown;
      words?: unknown;
      confirmed?: unknown;
      candidate?: unknown;
    };
    const id = typeof r.id === "string" ? r.id.trim() : "";
    const disposition = typeof r.disposition === "string" ? r.disposition.trim() : "";
    const words = typeof r.words === "string" ? r.words.trim() : "";
    const candidate = typeof r.candidate === "string" ? r.candidate : "";
    const wordsOk =
      disposition === "reshape"
        ? Boolean(words) && norm(words) !== norm(candidate)
        : disposition === "pick"
          ? Boolean(words)
          : true;
    if (r.confirmed === true && id && DISPOSITIONS.has(disposition) && wordsOk) {
      ruling = {
        id,
        kind: typeof r.kind === "string" ? r.kind.trim() : undefined,
        disposition,
        // The UI shows no words field on accept/reject; drop anything stale.
        words: disposition === "reshape" || disposition === "pick" ? words : "",
      };
    }
  }

  if (verdicts.length === 0 && answers.length === 0 && !ruling) {
    return NextResponse.json({ error: "At least one verdict, answer, or ruling is required." }, { status: 400 });
  }

  const wwbRound = typeof body.wwbRound === "number" && Number.isFinite(body.wwbRound) ? body.wwbRound : null;
  const entriesHash = typeof body.entriesHash === "string" ? body.entriesHash.trim() : null;

  let root: string;
  try {
    root = await getVaultRoot();
  } catch (err) {
    if (err instanceof VaultNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }

  const dir = path.join(root, DESIGN_DIR, slug);
  try {
    await fs.access(dir);
  } catch {
    return NextResponse.json({ error: `No project "${slug}".` }, { status: 404 });
  }

  // THE ONE VAULT WRITE: append the review block to the ledger's Review log
  // region, atomically (temp + rename). The block is the durable receipt every
  // recorded verdict cites; its sha256 is the tamper fence the controller holds.
  const ledgerPath = path.join(dir, LEDGER_FILE);
  let ledgerRaw = "";
  try {
    ledgerRaw = await fs.readFile(ledgerPath, "utf8");
  } catch {
    ledgerRaw = "";
  }
  const batchId = nextBatchId(ledgerRaw);
  const reviewer = process.env.DESIGN_STUDIO_REVIEWER?.trim() || "canvas";
  const block = buildBlock({ batchId, reviewer, wwbRound, entriesHash, verdicts, answers, ruling });
  // Hash convention (everywhere): the INNER text between the markers, trimmed.
  const inner = block
    .replace(new RegExp(`^\\s*<!--\\s*review:${batchId}:begin\\s*-->`), "")
    .replace(new RegExp(`<!--\\s*review:${batchId}:end\\s*-->\\s*$`), "")
    .trim();
  const blockHash = createHash("sha256").update(inner).digest("hex");

  let out = ledgerRaw.replace(/\s*$/, "\n");
  if (!/^##\s+Review log\b/im.test(out)) out += "\n## Review log\n";
  out += "\n" + block + "\n";
  const tmp = `${ledgerPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await fs.writeFile(tmp, out, "utf8");
    await fs.rename(tmp, ledgerPath);
  } catch (err) {
    return NextResponse.json({ error: `Could not write the review block: ${(err as Error).message}` }, { status: 500 });
  }

  const reviewOpts = {
    review: {
      batchId: String(batchId),
      blockHash,
      wwbRound: wwbRound ?? undefined,
      entriesHash: entriesHash ?? undefined,
      verdicts,
      answers,
      ruling: ruling ?? undefined,
    },
  };

  // A live loop: the block is persisted, but do not spawn the recorder now (no
  // background queue, the human resubmits/resumes once the round parks).
  if (await researchLoopLive(slug, dir)) {
    return NextResponse.json({ batchId, queued: true }, { status: 202 });
  }

  startResearchLoop({ slug, vaultRoot: root, projectDir: dir }, reviewOpts);
  return NextResponse.json({ batchId, running: true }, { status: 202 });
}

/** B is monotonic across every existing `<!-- kind:N: -->` block in the ledger. */
function nextBatchId(ledgerRaw: string): number {
  let max = 0;
  const re = /<!--\s*\w+:(\d+):(?:begin|end)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(ledgerRaw)) !== null) {
    const n = parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return max + 1;
}

/** Build the verbatim review block. Its exact text is what the sha256 covers. */
function buildBlock(args: {
  batchId: number;
  reviewer: string;
  wwbRound: number | null;
  entriesHash: string | null;
  verdicts: Verdict[];
  answers: Answer[];
  ruling: Ruling | null;
}): string {
  const { batchId, reviewer, wwbRound, entriesHash, verdicts, answers, ruling } = args;
  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push(`<!-- review:${batchId}:begin -->`);
  lines.push(`- date: ${date}`);
  lines.push(`- reviewer: ${reviewer}`);
  if (wwbRound != null) lines.push(`- wwb_round: ${wwbRound}`);
  if (entriesHash) lines.push(`- entries_hash: ${entriesHash}`);
  if (verdicts.length) {
    lines.push(`- dispositions:`);
    for (const v of verdicts) {
      const bits = [`${v.id}: ${v.verdict}`];
      if (v.unblocks) bits.push(`unblocks: "${v.unblocks}"`);
      if (v.note) bits.push(`"${v.note}"`);
      lines.push(`  - ${bits.join(", ")}`);
    }
  }
  if (ruling) {
    lines.push(`- rulings:`);
    // A wordless accept/reject records the disposition alone; no empty quote.
    lines.push(
      `  - ${ruling.id}: ${ruling.disposition}${ruling.kind ? ` (${ruling.kind})` : ""}${ruling.words ? `, "${ruling.words}"` : ""}`,
    );
  }
  if (answers.length) {
    lines.push(`- answers:`);
    for (const a of answers) lines.push(`  - ${a.id}: "${a.text}"`);
  }
  lines.push(`<!-- review:${batchId}:end -->`);
  return lines.join("\n");
}
