import { notFound } from "next/navigation";
import { getBoard } from "@/lib/board";
import { VaultNotConfiguredError } from "@/lib/vault";
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
  let board: BoardModel | null;
  try {
    board = await getBoard(slug);
  } catch (err) {
    if (err instanceof VaultNotConfiguredError) return <VaultError message={err.message} />;
    throw err;
  }
  if (!board) notFound();

  return <Canvas model={board} />;
}
