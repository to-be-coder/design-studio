"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { GraphGroup, VaultGraph } from "@/lib/types";

/** Monotone-with-blue palette (dark theme). Projects glow blue; the rest is grayscale. */
const GROUP_COLOR: Record<GraphGroup, string> = {
  project: "#5b8def",
  decision: "#c9cdd6",
  wiki: "#8b909a",
  learning: "#7fa8d8",
  note: "#5f656e",
};
const ACCENT = "#5b8def";
const LINK_BASE = "rgba(170,185,215,0.10)";
const LABEL = "#c9cdd6";

/**
 * Obsidian-style force-directed knowledge graph over the vault. Built on
 * vasturiano's `force-graph` (canvas + d3-force). Hover highlights a node and
 * its neighbors; drag/zoom/pan are built in; clicking a project navigates.
 * `force-graph` is imported inside the effect so it never runs during SSR.
 */
export function GraphView({ data }: { data: VaultGraph }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let graph: { _destructor?: () => void } | undefined;
    let ro: ResizeObserver | undefined;
    let cancelled = false;

    // adjacency for hover highlight
    const neighbors = new Map<string, Set<string>>();
    for (const l of data.links) {
      if (!neighbors.has(l.source)) neighbors.set(l.source, new Set());
      if (!neighbors.has(l.target)) neighbors.set(l.target, new Set());
      neighbors.get(l.source)!.add(l.target);
      neighbors.get(l.target)!.add(l.source);
    }

    let hoverId: string | null = null;
    const hiNodes = new Set<string>();
    const hiLinks = new Set<object>();
    const idOf = (v: unknown) => (typeof v === "object" && v ? (v as { id: string }).id : (v as string));

    import("force-graph").then(({ default: ForceGraph }) => {
      if (cancelled || !el) return;
      // deep copy so force-graph can mutate node coords freely
      const gd = { nodes: data.nodes.map((n) => ({ ...n })), links: data.links.map((l) => ({ ...l })) };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fg: any = new ForceGraph(el);
      graph = fg;
      fg.graphData(gd)
        .nodeId("id")
        .nodeVal((n: any) => n.val)
        .nodeLabel(() => "")
        .backgroundColor("rgba(0,0,0,0)")
        .nodeRelSize(4)
        .cooldownTicks(140)
        .linkColor((l: object) => (hiLinks.has(l) ? ACCENT : LINK_BASE))
        .linkWidth((l: object) => (hiLinks.has(l) ? 1.4 : 0.6))
        .nodeCanvasObject((node: any, ctx: CanvasRenderingContext2D, scale: number) => {
          const active = hoverId !== null;
          const isHi = hiNodes.has(node.id);
          const dim = active && !isHi;
          const r = 2 + Math.sqrt(node.val) * 1.6;
          const base = GROUP_COLOR[node.group as GraphGroup] ?? "#5f656e";
          ctx.globalAlpha = dim ? 0.16 : 1;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = node.id === hoverId ? ACCENT : base;
          if (node.id === hoverId) {
            ctx.shadowColor = ACCENT;
            ctx.shadowBlur = 14;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
          // label only on the single hovered node
          if (node.id === hoverId) {
            const fs = Math.max(3, 9 / scale);
            ctx.font = `${fs}px ui-sans-serif, system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = node.id === hoverId ? ACCENT : LABEL;
            ctx.globalAlpha = dim ? 0.12 : node.id === hoverId ? 1 : 0.75;
            ctx.fillText(String(node.label).slice(0, 42), node.x, node.y + r + 1.5);
          }
          ctx.globalAlpha = 1;
        })
        .onNodeHover((node: any) => {
          hoverId = node ? node.id : null;
          hiNodes.clear();
          hiLinks.clear();
          if (node) {
            hiNodes.add(node.id);
            for (const nb of neighbors.get(node.id) ?? []) hiNodes.add(nb);
            for (const l of fg.graphData().links) {
              if (idOf(l.source) === node.id || idOf(l.target) === node.id) hiLinks.add(l);
            }
          }
          el.style.cursor = node ? (node.url ? "pointer" : "grab") : "default";
        })
        .onNodeClick((node: any) => {
          if (node?.url) router.push(node.url);
        });

      // looser, more legible spread (Obsidian-ish)
      fg.d3Force("charge")?.strength(-70).distanceMax(320);
      fg.d3Force("link")?.distance(34);

      const resize = () => fg.width(el.clientWidth).height(el.clientHeight);
      resize();
      ro = new ResizeObserver(resize);
      ro.observe(el);

      let fitted = false;
      fg.onEngineStop(() => {
        if (!fitted) {
          fg.zoomToFit(600, 64);
          fitted = true;
        }
      });
    });

    return () => {
      cancelled = true;
      ro?.disconnect();
      graph?._destructor?.();
      if (el) el.replaceChildren();
    };
  }, [data, router]);

  return <div ref={wrapRef} className="h-full w-full" />;
}
