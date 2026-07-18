import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DESIGN_DIR, getVaultRoot, VaultNotConfiguredError } from "@/lib/vault";
import { HIDDEN_SLUGS } from "@/lib/hidden-projects";
import { autorunEnabled, researchLoopLive, startResearchLoop } from "@/lib/debrief-runner";
import { saveAttachment, attachmentInboxNote, type AttachmentFile } from "@/lib/attachments";

export const dynamic = "force-dynamic";

const INBOX_DIR = path.join("02 Research", "_inbox");

async function pathExists(abs: string): Promise<boolean> {
  try {
    await fs.access(abs);
    return true;
  } catch {
    return false;
  }
}

/** Filename-safe slug of a label: lowercased, non-alphanumerics to hyphens. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * The `files` entries of a multipart form as attachment bytes. The client sends
 * each file with its webkitRelativePath as the filename (so `file.name` holds
 * the folder-relative path); we fall back to the plain name when it is absent.
 */
async function filesFromForm(form: FormData): Promise<AttachmentFile[]> {
  const out: AttachmentFile[] = [];
  for (const entry of form.getAll("files")) {
    if (entry instanceof File) {
      out.push({ relPath: entry.name || "file", bytes: Buffer.from(await entry.arrayBuffer()) });
    }
  }
  return out;
}

/**
 * Add input to a project, anytime (decision 0036: any submission is another
 * brief). This is the app's SECOND bounded vault write: it drops the text
 * verbatim as a dated file in the project's `02 Research/_inbox/` (the designed
 * fed-in-data channel), then starts the research loop, which sorts it into the
 * ledger next round. Works at every stage, including build (design briefs keep
 * arriving). Same opt-in gate + gate order as the review route; a live loop
 * still persists the file but does not spawn (the human's input is picked up on
 * the next round it runs).
 */
export async function POST(req: Request) {
  if (!autorunEnabled()) {
    return NextResponse.json(
      { error: "Skill runs are off. Set DESIGN_STUDIO_AUTORUN_DEBRIEF=1 to enable." },
      { status: 403 },
    );
  }

  // Two shapes: pure JSON (text only, as before) or multipart/form-data (a
  // folder, optionally with a title and text). A folder alone is valid input.
  let slug = "";
  let title = "";
  let text = "";
  let attachFiles: AttachmentFile[] = [];
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.startsWith("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    slug = (form.get("slug") ?? "").toString().trim();
    title = (form.get("title") ?? "").toString().trim();
    text = (form.get("text") ?? "").toString().trim();
    attachFiles = await filesFromForm(form);
  } else {
    let body: { slug?: unknown; title?: unknown; text?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    slug = typeof body.slug === "string" ? body.slug.trim() : "";
    title = typeof body.title === "string" ? body.title.trim() : "";
    text = typeof body.text === "string" ? body.text.trim() : "";
  }

  if (!slug || HIDDEN_SLUGS.has(slug)) {
    return NextResponse.json({ error: "A slug is required." }, { status: 400 });
  }
  // Text is required only when no folder was attached.
  if (!text && attachFiles.length === 0) {
    return NextResponse.json({ error: "Some input text is required." }, { status: 400 });
  }

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

  // A folder, when attached, is copied verbatim into the project's `_assets/`
  // first (caps + path safety enforced there); the inbox note then points at it.
  // The copy makes no filesystem changes when a cap is exceeded, so a rejected
  // attachment is a clean 400.
  let attached: string | null = null;
  let content: string;
  let base: string;
  if (attachFiles.length > 0) {
    let saved;
    try {
      saved = await saveAttachment(dir, attachFiles, { label: title || "attachment" });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
    attached = saved.assetDir.split("/").pop() ?? null;
    content = attachmentInboxNote({
      title: title || undefined,
      text: text || undefined,
      assetDir: saved.assetDir,
      manifest: saved.manifest,
      skipped: saved.skipped,
    });
    base = slugify(title || attached || "attachment") || "attachment";
  } else {
    const heading = title ? `# ${title}\n\n` : "";
    content = `---\ntype: fed-in\ndate: ${new Date().toISOString()}\nsource: canvas\n---\n\n${heading}${text}\n`;
    base = slugify(title || text) || "input";
  }

  // THE SECOND VAULT WRITE: a dated inbox file (the text VERBATIM, or the
  // attachment note), written atomically (temp + rename). The name dedupes with
  // a numeric suffix so two same-day inputs never collide.
  const date = new Date().toISOString().slice(0, 10);
  const inboxDir = path.join(dir, INBOX_DIR);
  let rel: string;
  try {
    await fs.mkdir(inboxDir, { recursive: true });
    let name = `${date} ${base}`;
    for (let n = 2; await pathExists(path.join(inboxDir, `${name}.md`)); n++) {
      name = `${date} ${base} ${n}`;
    }
    rel = path.join(INBOX_DIR, `${name}.md`);
    const abs = path.join(inboxDir, `${name}.md`);
    const tmp = `${abs}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmp, content, "utf8");
    await fs.rename(tmp, abs);
  } catch (err) {
    return NextResponse.json(
      { error: `Could not write the input: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  // A live loop (or recorder): the file is persisted, but do not spawn now. The
  // next research round it runs will sort the inbox in (same policy as review).
  if (await researchLoopLive(slug, dir)) {
    return NextResponse.json({ file: rel, queued: true, attached }, { status: 202 });
  }

  startResearchLoop({ slug, vaultRoot: root, projectDir: dir });
  return NextResponse.json({ file: rel, running: true, attached }, { status: 202 });
}
