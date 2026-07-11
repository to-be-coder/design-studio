import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { Decision } from "@/lib/types";

/** Extract a leading zero-padded id, e.g. "0012 foo" -> "0012". */
function refId(ref: string | null): string | null {
  if (!ref) return null;
  const m = ref.match(/^(\d{3,})/);
  return m ? m[1] : null;
}

const STATUS_STYLE: Record<string, string> = {
  decided: "text-emerald-600 dark:text-emerald-400",
  proposed: "accent-text",
  deferred: "text-amber-500 dark:text-amber-400",
  superseded: "text-muted-foreground",
};

export function DecisionList({ decisions }: { decisions: Decision[] }) {
  if (decisions.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-foreground/[0.02] p-6 text-sm text-muted-foreground">
        No decisions recorded yet.
      </p>
    );
  }

  return (
    <ol className="space-y-2.5" data-testid="decision-list">
      {decisions.map((d) => {
        const superseded = d.status === "superseded";
        return (
          <li
            key={d.file}
            id={`d-${d.id}`}
            className={cn(
              "scroll-mt-6 rounded-xl border border-border p-4 transition-colors",
              superseded ? "bg-transparent opacity-60" : "bg-foreground/[0.02]",
            )}
          >
            <div className="flex items-start gap-3">
              <code className="mt-0.5 shrink-0 rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                {d.id}
              </code>
              <div className="min-w-0 flex-1">
                <h4
                  className={cn(
                    "text-sm font-semibold tracking-tight text-foreground",
                    superseded && "line-through decoration-muted-foreground/50",
                  )}
                >
                  {d.title}
                </h4>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
                  {d.status ? (
                    <span className={cn("font-medium", STATUS_STYLE[d.status] ?? "")}>
                      {d.status}
                    </span>
                  ) : null}
                  {d.stage ? <span>· {d.stage}</span> : null}
                  {d.date ? <span>· {formatDate(d.date)}</span> : null}
                  {d.tags
                    .filter((t) => t !== "decision")
                    .map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-border px-1.5 py-px text-[10px] tracking-tight"
                      >
                        {t}
                      </span>
                    ))}
                </div>

                {(d.supersedes || d.supersededBy || d.restsOn) && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                    <Ref label="supersedes" value={d.supersedes} />
                    <Ref label="superseded by" value={d.supersededBy} />
                    <Ref label="rests on" value={d.restsOn} />
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Ref({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  const id = refId(value);
  return (
    <span className="text-muted-foreground">
      <span className="text-muted-foreground/60">{label} </span>
      {id ? (
        <a href={`#d-${id}`} className="accent-text hover:underline">
          {value}
        </a>
      ) : (
        <span className="text-foreground/80">{value}</span>
      )}
    </span>
  );
}
