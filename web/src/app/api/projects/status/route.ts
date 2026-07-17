import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getRunState, readLoopProgress } from "@/lib/debrief-runner";
import { findStatusLine } from "@/lib/loop-status";
import { projectDir } from "@/lib/vault";

export const dynamic = "force-dynamic";

/**
 * Poll target for the canvas: whether a headless skill run is in flight for a
 * slug (stage, `drafting` | `done` | `error`, round), plus two reads straight
 * off disk so the client can watch the vault's truth: `fence`, the dashboard's
 * committed `Current stage:` line (the board refetches when it changes), and
 * `progress`, the `.loop-progress` heartbeat the banner renders with elapsed
 * time. `{ state: null }` when no run was started this server lifetime; fence
 * and progress are null when unreadable.
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  const run = getRunState(slug);

  let fence: string | null = null;
  let progress: Awaited<ReturnType<typeof readLoopProgress>> = null;
  try {
    const dir = await projectDir(slug);
    try {
      fence = findStatusLine(await fs.readFile(path.join(dir, "00 Dashboard.md"), "utf8"));
    } catch {
      /* no dashboard yet */
    }
    progress = await readLoopProgress(dir);
  } catch {
    /* vault not configured: the registry fields still answer */
  }

  return NextResponse.json({
    stage: run?.stage ?? null,
    state: run?.state ?? null,
    round: run?.round ?? null,
    fence,
    progress,
  });
}
