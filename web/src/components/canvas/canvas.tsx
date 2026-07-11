"use client";

import Link from "next/link";
import type { BoardModel } from "@/lib/types";
import { BoardView } from "./board-view";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The canvas. Slice 2 renders the whole readable board in a plain-scroll
 * viewport — "every step visible, readable" must already be true here. Slice 4
 * replaces the scroll with the pan/zoom engine on this same world container.
 */
export function Canvas({ model }: { model: BoardModel }) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-desk">
      {/* Top-left: return to the index. */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-3">
        <Link
          href="/"
          className="rounded-pill border border-rule bg-paper px-3 py-1.5 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink"
        >
          ← Projects
        </Link>
      </div>
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      {/* Slice 2: plain-scroll viewport over the world container. */}
      <div className="h-full w-full overflow-auto">
        <BoardView model={model} />
      </div>
    </div>
  );
}
