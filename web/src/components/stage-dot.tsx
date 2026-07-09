import { cn } from "@/lib/utils";
import type { StageState } from "@/lib/types";

export type DotVariant =
  | StageState["state"] // "ran" | "derived" | "pending" | "skipped" | "unknown"
  | "current"
  | "done"
  | "todo"
  | "none";

/** A single pipeline node. The one blue is reserved for live/current states. */
export function StageDot({ variant, className }: { variant: DotVariant; className?: string }) {
  const base = "h-2.5 w-2.5 shrink-0 rounded-full";
  switch (variant) {
    case "ran":
    case "current":
      return (
        <span
          className={cn(base, "accent-glow", className)}
          style={{ background: "var(--accent-solid)" }}
        />
      );
    case "pending":
      return (
        <span
          className={cn(base, className)}
          style={{ boxShadow: "inset 0 0 0 1.5px var(--accent-solid)" }}
        />
      );
    case "derived":
    case "done":
      return (
        <span
          className={cn(base, className)}
          style={{ background: "color-mix(in oklab, var(--foreground) 55%, transparent)" }}
        />
      );
    case "skipped":
      return (
        <span
          className={cn(base, className)}
          style={{ border: "1.5px dotted var(--accent-solid)" }}
        />
      );
    default:
      return (
        <span
          className={cn(base, className)}
          style={{ background: "color-mix(in oklab, var(--foreground) 14%, transparent)" }}
        />
      );
  }
}
