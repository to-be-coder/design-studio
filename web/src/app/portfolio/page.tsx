import { listProjects, getActiveProject, VaultNotConfiguredError } from "@/lib/vault";
import { PageHeader } from "@/components/page-header";
import { ProjectCard } from "@/components/project-card";
import { VaultError } from "@/components/vault-error";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  let projects: Project[];
  let active: string | null = null;
  try {
    [projects, active] = await Promise.all([listProjects(), getActiveProject()]);
  } catch (err) {
    if (err instanceof VaultNotConfiguredError) return <VaultError message={err.message} />;
    throw err;
  }

  void active;
  const live = projects.filter((p) => p.status !== "archived");
  const archived = projects.filter((p) => p.status === "archived");

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-6 md:px-8 md:pt-8">
        <PageHeader
          title="Portfolio"
          subtitle={`${projects.length} project${projects.length === 1 ? "" : "s"} in the design-studio vault`}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-10 pt-6 md:px-8">
        {live.length === 0 && archived.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No projects yet. Run{" "}
            <code className="rounded bg-foreground/[0.06] px-1 py-0.5">/design-studio-debrief</code>{" "}
            to start one.
          </p>
        ) : null}

        {live.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {live.map((p) => (
              <ProjectCard key={p.slug} project={p} />
            ))}
          </div>
        ) : null}

        {archived.length > 0 ? (
          <div className="mt-10">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Archived
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {archived.map((p) => (
                <ProjectCard key={p.slug} project={p} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
