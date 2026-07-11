"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { AssumptionState, BoardModel } from "@/lib/types";
import { BoardView } from "./board-view";
import { ThemeToggle } from "@/components/theme-toggle";

export type StreamFilter = "all" | "live" | "scaffold";

export interface RestsOnState {
  assumptionId: string;
  state: AssumptionState;
  riskiest: boolean;
}

/**
 * The canvas controller. Owns cross-region interaction: selecting an assumption
 * lights its blast radius (every decision standing on it) across the register
 * and the stream, and the drawn connectors restyle live. Slice 4 adds the
 * pan/zoom engine on top of this same world container.
 */
export function Canvas({ model }: { model: BoardModel }) {
  const worldRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<StreamFilter>("all");

  const highlighted = useMemo(() => {
    if (!selected) return null;
    const a = model.assumptions.find((x) => x.id === selected);
    return a ? new Set(a.dependents) : null;
  }, [selected, model.assumptions]);

  // Every decision that stands on an assumption, with that assumption's state —
  // so a decision resting on an unverified assumption renders visibly at-risk.
  const restsOnState = useMemo(() => {
    const m: Record<string, RestsOnState> = {};
    for (const a of model.assumptions) {
      for (const dep of a.dependents) {
        m[dep] = { assumptionId: a.id, state: a.state, riskiest: a.riskiest };
      }
    }
    return m;
  }, [model.assumptions]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-desk">
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

      {/* Slice 2/3: plain-scroll viewport over the world container. */}
      <div className="h-full w-full overflow-auto">
        <BoardView
          model={model}
          worldRef={worldRef}
          selectedAssumption={selected}
          onSelectAssumption={setSelected}
          highlightedDecisions={highlighted}
          restsOnState={restsOnState}
          filter={filter}
          onFilter={setFilter}
        />
      </div>
    </div>
  );
}
