import Link from "next/link";
import { listProjects, VaultNotConfiguredError } from "@/lib/vault";
import { getProblemLine } from "@/lib/brief";
import { VaultError } from "@/components/vault-error";
import { ThemeToggle } from "@/components/theme-toggle";
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
    projects = await listProjects();
  } catch (err) {
    if (err instanceof VaultNotConfiguredError) return <VaultError message={err.message} />;
    throw err;
  }

  const lines = await Promise.all(
    projects.map(async (p) => [p.slug, await getProblemLine(p.slug)] as const),
  );
  const problemBySlug = new Map(lines);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-8 py-16">
      <header className="mb-12 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Design Studio</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">Projects</h1>
          <p className="mt-2 max-w-md text-[0.9375rem] text-ink-muted">
            Each project&rsquo;s whole design journey, research to prototype, rendered as one
            readable canvas.
          </p>
        </div>
        <ThemeToggle />
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
                className="group block py-6 transition-colors hover:bg-paper-raised/60"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-serif text-xl font-semibold text-ink group-hover:text-accent">
                    {p.name}
                  </h2>
                  <span className="eyebrow shrink-0">{stageLabel(p.stage)}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-ink-faint">
                  {p.client ? <span className="text-ink-muted">{p.client}</span> : null}
                  {p.route ? <span>· {p.route} route</span> : null}
                  {p.status ? <span>· {p.status}</span> : null}
                </div>
                {problemBySlug.get(p.slug) ? (
                  <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted">
                    {problemBySlug.get(p.slug)}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
