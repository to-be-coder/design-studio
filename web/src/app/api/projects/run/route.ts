import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DESIGN_DIR, getVaultRoot, VaultNotConfiguredError } from "@/lib/vault";
import { autorunEnabled, isRunnableStage, startStageRun } from "@/lib/debrief-runner";

export const dynamic = "force-dynamic";

/**
 * Run a stage's skill headless for a project (the board's "Run <stage>"
 * control — research, structure). Same opt-in gate as the debrief autorun:
 * spawning a real agent that writes the vault is never on by default.
 */
export async function POST(req: Request) {
  if (!autorunEnabled()) {
    return NextResponse.json(
      { error: "Skill runs are off. Set DESIGN_STUDIO_AUTORUN_DEBRIEF=1 to enable." },
      { status: 403 },
    );
  }

  let body: { slug?: unknown; stage?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const stage = typeof body.stage === "string" ? body.stage.trim() : "";
  if (!slug) return NextResponse.json({ error: "A slug is required." }, { status: 400 });
  if (!isRunnableStage(stage)) {
    return NextResponse.json({ error: `Stage "${stage}" isn't runnable.` }, { status: 400 });
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

  startStageRun({ slug, stage, vaultRoot: root, projectDir: dir });
  return NextResponse.json({ slug, stage, running: true }, { status: 202 });
}
