import { notFound } from "next/navigation";
import { getBoard } from "@/lib/board";
import { VaultNotConfiguredError } from "@/lib/vault";
import { HIDDEN_SLUGS } from "@/lib/hidden-projects";
import { autorunEnabled } from "@/lib/debrief-runner";
import { VaultError } from "@/components/vault-error";
import { Canvas } from "@/components/canvas/canvas";
import type { BoardModel } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * The canvas — a project's whole design journey as one readable board. The
 * server assembles the board model (schema-driven, JSON-serialisable) and hands
 * it to the client <Canvas>, which owns pan/zoom and interaction.
 */
export default async function CanvasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // The studio's own dogfooding projects are hidden from the web UI — not just
  // dropped from the index, but unreachable by direct URL too.
  if (HIDDEN_SLUGS.has(slug)) notFound();
  let board: BoardModel | null;
  try {
    board = await getBoard(slug);
  } catch (err) {
    if (err instanceof VaultNotConfiguredError) return <VaultError message={err.message} />;
    throw err;
  }
  if (!board) notFound();

  // Whether the canvas may spawn headless skill runs (the Research "Run" control).
  return <Canvas model={board} runsEnabled={autorunEnabled()} />;
}
