import { cn } from "@/lib/utils";
import { humanizeSlug } from "@/lib/format";
import type { Autonomy, ProjectStatus, Route } from "@/lib/types";
import { AUTONOMY_SHORT, AUTONOMY_LABEL } from "@/lib/schema";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  active: "text-foreground",
  blocked: "text-amber-500 dark:text-amber-400",
  done: "text-emerald-600 dark:text-emerald-400",
  archived: "text-muted-foreground",
};

/** Project status pill — a hairline chip with a state dot. */
export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus | null;
  className?: string;
}) {
  const dot: Record<ProjectStatus, string> = {
    active: "var(--accent-solid)",
    blocked: "oklch(0.72 0.16 70)",
    done: "oklch(0.7 0.15 155)",
    archived: "color-mix(in oklab, var(--foreground) 35%, transparent)",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium tracking-tight",
        status ? STATUS_STYLES[status] : "text-muted-foreground",
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: status ? dot[status] : "var(--muted-foreground)" }}
      />
      {status ? humanizeSlug(status) : "—"}
    </span>
  );
}

/** Route chip (Full / Lite). */
export function RouteBadge({ route, className }: { route: Route | null; className?: string }) {
  if (!route) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {route}
    </span>
  );
}

/** Autonomy colors — the traffic-light meaning, carried by the label instead of an emoji. */
export const AUTONOMY_COLOR: Record<Autonomy, string> = {
  execute: "oklch(0.72 0.15 155)", // green — Auto
  draft: "oklch(0.78 0.14 80)", // amber — Review
  scaffold: "oklch(0.68 0.19 22)", // red — Action
};

/** Autonomy as a word label (Auto / Review / Action) — subtle gray pill. */
export function AutonomyChip({ autonomy, className }: { autonomy: Autonomy; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
      title={AUTONOMY_LABEL[autonomy]}
    >
      {AUTONOMY_SHORT[autonomy]}
    </span>
  );
}

/** Bare colored word — for dense metadata lines (the pipeline rail). */
export function AutonomyText({ autonomy, className }: { autonomy: Autonomy; className?: string }) {
  return (
    <span
      className={cn("font-medium", className)}
      style={{ color: AUTONOMY_COLOR[autonomy] }}
      title={AUTONOMY_LABEL[autonomy]}
    >
      {AUTONOMY_SHORT[autonomy]}
    </span>
  );
}
