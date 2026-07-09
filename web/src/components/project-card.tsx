import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/lib/types";
import { STAGES, stageDef } from "@/lib/schema";
import { formatRelativeDays, humanizeSlug } from "@/lib/format";
import { StageDot, type DotVariant } from "./stage-dot";
import { StatusBadge, RouteBadge } from "./badges";

/** Portfolio card. The pipeline strip is derived from the current `stage`
 *  field (per-stage detail lives on the project page's Pipeline log). */
export function ProjectCard({ project }: { project: Project }) {
  const currentIndex = project.stage
    ? STAGES.findIndex((s) => s.stage === project.stage)
    : -1;
  const def = project.stage ? stageDef(project.stage) : undefined;

  return (
    <Link
      href={`/project/${project.slug}`}
      className="panel group block p-5 transition-colors hover:border-[color-mix(in_oklab,var(--accent-solid)_40%,var(--border))]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
            {project.name}
          </h3>
          {project.client ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.client}</p>
          ) : null}
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition group-hover:accent-text group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <StatusBadge status={project.status} />
        <RouteBadge route={project.route} />
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground/70">
          {formatRelativeDays(project.mtime)}
        </span>
      </div>

      {/* Pipeline strip */}
      <div className="mt-5 flex items-center gap-1.5">
        {STAGES.map((s, i) => {
          let v: DotVariant = "todo";
          if (currentIndex >= 0) {
            if (i < currentIndex) v = "done";
            else if (i === currentIndex) v = "current";
          }
          return <StageDot key={s.stage} variant={v} />;
        })}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {def ? (
          <>
            <span className="text-foreground/80">{humanizeSlug(project.stage!)}</span>
            <span className="text-muted-foreground/60"> · {def.phase}</span>
          </>
        ) : (
          "No stage set"
        )}
      </div>
    </Link>
  );
}
