import { getGraph, VaultNotConfiguredError } from "@/lib/vault";
import { GraphView } from "@/components/graph-view";
import { VaultError } from "@/components/vault-error";
import type { GraphGroup, VaultGraph } from "@/lib/types";

export const dynamic = "force-dynamic";

const LEGEND: { group: GraphGroup; label: string; color: string }[] = [
  { group: "project", label: "Projects", color: "#5b8def" },
  { group: "decision", label: "Decisions", color: "#c9cdd6" },
  { group: "wiki", label: "Studio Wiki", color: "#8b909a" },
  { group: "learning", label: "Learning", color: "#7fa8d8" },
  { group: "note", label: "Notes", color: "#5f656e" },
];

export default async function GraphHome() {
  let graph: VaultGraph;
  try {
    graph = await getGraph();
  } catch (err) {
    if (err instanceof VaultNotConfiguredError) return <VaultError message={err.message} />;
    throw err;
  }

  return (
    <div className="relative h-full min-h-[82dvh] w-full overflow-hidden">
      <GraphView data={graph} />

      {/* Title */}
      <div className="pointer-events-none absolute left-5 top-5 md:left-8 md:top-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Knowledge graph</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {graph.nodes.length} notes · {graph.links.length} links — hover to trace, drag to explore, click a project to open
        </p>
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-5 left-5 md:bottom-8 md:left-8">
        <div className="panel flex flex-col gap-1.5 p-3">
          {LEGEND.map((l) => (
            <div key={l.group} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
