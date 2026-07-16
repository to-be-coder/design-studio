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
        <ul className="divide-y divide-rule border-y border-rule">
          {projects.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/canvas/${p.slug}`}
                className="group block rounded-inset px-6 py-6 transition-colors hover:bg-paper-raised/60"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-serif text-xl font-semibold text-ink group-hover:text-accent">
                    {shortProjectName(p.name)}
                  </h2>
                  <span className="eyebrow shrink-0">{stageLabel(p.stage)}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-ink-faint">
                  {p.client ? <span className="text-ink-muted">{p.client}</span> : null}
                  {p.route ? <span>· {p.route} route</span> : null}
                  {p.status ? <span>· {p.status}</span> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
