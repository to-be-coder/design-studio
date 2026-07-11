import { getCardBlocks } from "@/lib/vault";

export const dynamic = "force-dynamic";

/**
 * Refetch one artifact card's rendered blocks (the live-board update path §0).
 * The client hits this when the vault watcher reports a change to the card's
 * source file, then swaps the blocks in place — no reload. Read-only.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const file = url.searchParams.get("file");
  if (!slug || !file) {
    return Response.json({ error: "slug and file are required" }, { status: 400 });
  }
  try {
    const blocks = await getCardBlocks(slug, file);
    if (!blocks) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ blocks }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
