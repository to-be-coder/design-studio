import Link from "next/link";
import { CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { humanizeSlug } from "@/lib/format";
import { STAGES, UTILITIES } from "@/lib/schema";
import type { Project, Stage, StageState, Utility } from "@/lib/types";
import { StageDot, type DotVariant } from "./stage-dot";
import { CopyButton } from "./copy-button";
import { AutonomyChip } from "./badges";

interface PipelineRailProps {
  project: Project;
  pipeline: StageState[];
  selectedStage: Stage | null;
}

export function PipelineRail({
  project,
  pipeline,
  selectedStage,
}: PipelineRailProps) {
  const stateOf = new Map<string, StageState>();
  for (const s of pipeline) stateOf.set(s.stage, s);

  return (
    <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Pipeline</h2>
        <p className="text-xs text-muted-foreground">
          {pipeline.length ? "State from the dashboard's log." : "No pipeline log — showing the stage order."}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ol className="divide-y divide-border">
        {STAGES.map((def) => {
          const st = stateOf.get(def.stage);
          const isCurrent = project.stage === def.stage;
          const selected = selectedStage === def.stage;
          const variant: DotVariant = st ? st.state : isCurrent ? "current" : "none";

          return (
            <li
              key={def.stage}
              className={cn(
                "flex items-start gap-3 px-3 py-2.5 transition-colors",
                selected ? "row-selected" : "hover:bg-foreground/[0.03]",
              )}
            >
              <Link
                href={`?stage=${def.stage}`}
                scroll={false}
                className="min-w-0 flex-1"
              >
                <div className="flex items-center gap-2">
                  <StageDot variant={variant} />
                  <span
                    className={cn(
                      "truncate text-sm tracking-tight",
                      isCurrent ? "font-semibold text-foreground" : "text-foreground/90",
                    )}
                  >
                    {humanizeSlug(def.stage)}
                  </span>
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider accent-text">
                      <CircleDot className="h-2.5 w-2.5" /> current
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <code className="font-mono">{def.skill}</code>
                  <CopyButton
                    text={`/${def.skill}`}
                    toastMessage="Copied — paste into Claude Code"
                    className="h-5 w-5"
                  />
                </div>
              </Link>

              <AutonomyChip autonomy={def.autonomy} className="shrink-0" />
            </li>
          );
        })}
      </ol>

      <div className="border-t border-border px-4 py-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Utilities
        </h3>
      </div>
      <ul className="divide-y divide-border">
        {UTILITIES.map((u) => {
          const st = stateOf.get(u.utility as Utility);
          return (
            <li key={u.utility} className="flex items-start gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <StageDot variant={st ? st.state : "none"} />
                  <span className="text-sm tracking-tight text-foreground/90">
                    {humanizeSlug(u.utility)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <code className="font-mono">{u.skill}</code>
                  <CopyButton
                    text={`/${u.skill}`}
                    toastMessage="Copied — paste into Claude Code"
                    className="h-5 w-5"
                  />
                </div>
              </div>
              <AutonomyChip autonomy={u.autonomy} className="shrink-0" />
            </li>
          );
        })}
      </ul>
      </div>
    </div>
  );
}
