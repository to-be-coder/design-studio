"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { BoardModel } from "@/lib/types";

/**
 * The drawn edges (§5). Supersede chains are drawn, not just linked —
 * superseded entries stay in place with a connector to their replacement — and
 * every assumption's rests_on is drawn as an edge to each decision standing on
 * it. The SVG lives inside the world container, so it pans and zooms with the
 * board as one unit (slice 4). Coordinates are measured in world-local space
 * (element rect − world rect), stable under viewport scroll and re-measured on
 * layout change via a ResizeObserver.
 */

interface Edge {
  from: string;
  to: string;
  kind: "supersede" | "rests";
  assumptionId?: string;
}

interface Anchor {
  x: number;
  y: number;
  w: number;
  h: number;
}

function edgesOf(model: BoardModel): Edge[] {
  const edges: Edge[] = [];
  for (const e of model.decisionStream) {
    if (e.supersededBy) {
      const to = e.supersededBy.match(/^\s*(\S+)/)?.[1];
      if (to) edges.push({ from: `d-${e.id}`, to: `d-${to}`, kind: "supersede" });
    }
  }
  for (const a of model.assumptions) {
    for (const dep of a.dependents) {
      edges.push({ from: `assumption-${a.id}`, to: `d-${dep}`, kind: "rests", assumptionId: a.id });
    }
  }
  return edges;
}

export function Connectors({
  worldRef,
  model,
  selectedAssumption,
}: {
  worldRef: RefObject<HTMLDivElement | null>;
  model: BoardModel;
  selectedAssumption: string | null;
}) {
  const edges = useRef(edgesOf(model));
  const [anchors, setAnchors] = useState<Map<string, Anchor>>(new Map());

  // useEffect (not useLayoutEffect): a child's layout effect runs BEFORE the
  // parent's ref is attached, so worldRef.current would be null at mount.
  // Passive effects run after all refs attach.
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;

    const measure = () => {
      const wr = world.getBoundingClientRect();
      const map = new Map<string, Anchor>();
      const ids = new Set<string>();
      for (const e of edges.current) {
        ids.add(e.from);
        ids.add(e.to);
      }
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        map.set(id, { x: r.left - wr.left, y: r.top - wr.top, w: r.width, h: r.height });
      }
      setAnchors(map);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(world);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [worldRef]);

  const paths = edges.current
    .map((e, i) => {
      const a = anchors.get(e.from);
      const b = anchors.get(e.to);
      if (!a || !b) return null; // filtered-out endpoint → skip, never dangle
      const live = e.kind === "rests" && e.assumptionId === selectedAssumption;
      const d =
        e.kind === "supersede"
          ? supersedePath(a, b)
          : restsPath(a, b);
      return (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={live ? "var(--accent)" : "var(--rule-strong)"}
          strokeWidth={live ? 2 : 1.25}
          strokeDasharray={e.kind === "rests" && !live ? "3 4" : undefined}
          markerEnd={
            e.kind === "rests"
              ? live
                ? "url(#arrow-live)"
                : "url(#arrow)"
              : "url(#arrow)"
          }
          opacity={live ? 1 : 0.7}
          data-edge={`${e.from}->${e.to}`}
        />
      );
    })
    .filter(Boolean);

  return (
    <svg
      // inset-0 + 100% sizes to the world's CLIENT box (set by the board's own
      // children), never its scroll size — otherwise sizing to scrollWidth feeds
      // back and keeps the world huge, flooring fit-to-content at MIN_SCALE.
      // overflow-visible still paints paths that reach past the client box.
      className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
      aria-hidden
      data-testid="connectors"
    >
      <defs>
        <marker id="arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--rule-strong)" />
        </marker>
        <marker id="arrow-live" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6.5" markerHeight="6.5" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {paths}
    </svg>
  );
}

/** Supersede: a bracket in the left margin linking retired → replacement. */
function supersedePath(a: Anchor, b: Anchor): string {
  const x0 = a.x;
  const y0 = a.y + a.h / 2;
  const x1 = b.x;
  const y1 = b.y + b.h / 2;
  const bow = Math.min(48, 24 + Math.abs(y1 - y0) * 0.1);
  return `M ${x0} ${y0} C ${x0 - bow} ${y0} ${x1 - bow} ${y1} ${x1} ${y1}`;
}

/** rests_on: assumption right edge → decision left edge. */
function restsPath(a: Anchor, b: Anchor): string {
  const x0 = a.x + a.w;
  const y0 = a.y + a.h / 2;
  const x1 = b.x;
  const y1 = b.y + b.h / 2;
  const dx = Math.max(60, Math.abs(x1 - x0) * 0.4);
  return `M ${x0} ${y0} C ${x0 + dx} ${y0} ${x1 - dx} ${y1} ${x1} ${y1}`;
}
