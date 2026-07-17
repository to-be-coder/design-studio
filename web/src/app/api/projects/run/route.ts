import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DESIGN_DIR, getVaultRoot, VaultNotConfiguredError } from "@/lib/vault";
import { HIDDEN_SLUGS } from "@/lib/hidden-projects";
import {
  autorunEnabled,
  isRunnableStage,
  researchLoopLive,
  startResearchLoop,
  startStructureDraft,
} from "@/lib/debrief-runner";

export const dynamic = "force-dynamic";

/**
 * Run a stage's skill headless for a project (the board's "Run <stage>"
 * control). `research` starts the spawn-per-round Understand loop; `structure`
 * scaffolds the clickable skeleton prototype repo (the skill creates it, outside
 * the vault, and records its path as prototype_repo). Same opt-in gate as the
 * debrief autorun: spawning a real agent that writes the vault is never on by
 * default. A live research loop 409s either request (one vault writer at a time).
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
  if (!slug || HIDDEN_SLUGS.has(slug)) {
    return NextResponse.json({ error: "A slug is required." }, { status: 400 });
  }
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

  if (stage === "structure") {
    if (await researchLoopLive(slug, dir)) {
      return NextResponse.json(
        { error: "Research is still running. The structure draft can start once it finishes." },
        { status: 409 },
      );
    }
    startStructureDraft({ slug, vaultRoot: root, projectDir: dir });
    return NextResponse.json({ slug, stage, running: true }, { status: 202 });
  }

  if (await researchLoopLive(slug, dir)) {
    return NextResponse.json({ error: "A research loop is already running." }, { status: 409 });
  }

  startResearchLoop({ slug, vaultRoot: root, projectDir: dir });
  return NextResponse.json({ slug, stage, running: true }, { status: 202 });
}
