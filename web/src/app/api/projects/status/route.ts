import { NextResponse } from "next/server";
import { getRunState } from "@/lib/debrief-runner";

export const dynamic = "force-dynamic";

/**
 * Poll target for the sidebar's "generating" indicator: reports whether a
 * headless skill run is in flight for a slug, and which stage (`{ stage, state }`
 * with state `drafting` | `done` | `error`), or `{ state: null }` when none was
 * started this server lifetime.
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  const run = getRunState(slug);
  return NextResponse.json({ stage: run?.stage ?? null, state: run?.state ?? null });
}
