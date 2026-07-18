import Link from "next/link";
import { listProjects, VaultNotConfiguredError } from "@/lib/vault";
import { HIDDEN_SLUGS } from "@/lib/hidden-projects";
import { shortProjectName } from "@/lib/project-name";
import { VaultError } from "@/components/vault-error";
import { NewProjectButton } from "@/components/new-project-button";
import type { Project } from "@/lib/types";

/** Human label for a stage token: "design-system" → "Design system". */
function stageLabel(stage: string | null): string {
  if (!stage) return "—";
  const s = stage.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * The loop badge for a project card, read from its cheaply-parsed status line:
 * an accent "Review: N" pill when items await the human (converged-humans-needed
 * or a parked ruling), a quiet "Paused" when the loop hit its round cap. Nothing
 * else earns a badge, and the badge sits inline beside the stage label rather
 * than under it, so no card ever grows a second status row: every card keeps
 * the same height.
 */
function LoopBadge({ project }: { project: Project }) {
  const t = project.loopTerminal;
  if (t === "converged-humans-needed" || t === "parked") {
    const n = project.reviewCount;
    return (
      <span
        data-testid="home-badge"
        data-badge="review"
        className="rounded-pill px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
        style={{ background: "var(--accent-wash)", color: "var(--accent)" }}
      >
        {n != null ? `Review: ${n}` : "Review"}
      </span>
    );
  }
  if (t === "capped") {
    return (
      <span data-testid="home-badge" data-badge="capped" className="text-[0.75rem] text-ink-muted">
        Paused
      </span>
    );
  }
  return null;
}

export const dynamic = "force-dynamic";

export default async function ProjectsIndex() {
  let projects: Project[];
  try {
    projects = (await listProjects()).filter((p) => !HIDDEN_SLUGS.has(p.slug));
  } catch (err) {
    if (err instanceof VaultNotConfiguredError) return <VaultError message={err.message} />;
    throw err;
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-8 py-16">
      <header className="mb-12 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Design Studio</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">Projects</h1>
        </div>
        <NewProjectButton />
      </header>

      {projects.length === 0 ? (
        <p className="reading text-ink-muted">
          No projects yet. Run <code className="font-mono text-ink">/design-studio-debrief</code>{" "}
          to start one.
        </p>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/canvas/${p.slug}`}
                className="group flex min-h-20 flex-col justify-between gap-1 rounded-card border border-rule bg-paper px-4 py-3 transition-colors hover:bg-paper-raised/60"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-serif text-xl font-semibold text-ink group-hover:text-accent">
                    {shortProjectName(p.name)}
                  </h2>
                  <div className="flex shrink-0 items-baseline gap-2">
                    <LoopBadge project={p} />
                    <span className="eyebrow">{stageLabel(p.stage)}</span>
                  </div>
                </div>
                <div className="mt-1 text-[0.8125rem] text-ink-muted">
                  {p.client ? <span>{p.client}</span> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
