import Link from "next/link";
import { FileText, GitBranch, ExternalLink } from "lucide-react";
import { getStageOutput } from "@/lib/vault";
import { stageDef } from "@/lib/schema";
import { humanizeSlug } from "@/lib/format";
import type { Project, Stage } from "@/lib/types";
import { MarkdownBlocks } from "./markdown-blocks";
import { CopyButton } from "./copy-button";
import { AutonomyChip } from "./badges";

export async function StagePane({
  project,
  stage,
}: {
  project: Project;
  stage: Stage;
}) {
  const def = stageDef(stage);
  if (!def) return null;
  const outputs = await getStageOutput(project.slug, stage);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {humanizeSlug(stage)}
        </h2>
        <AutonomyChip autonomy={def.autonomy} />
        <span className="text-xs text-muted-foreground">{def.phase}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <code className="font-mono text-xs text-muted-foreground">/{def.skill}</code>
          <CopyButton text={`/${def.skill}`} toastMessage="Copied — paste into Claude Code" />
        </div>
      </div>

      <p className="pt-4 text-sm text-muted-foreground">{def.blurb}</p>

      <div className="mt-4 min-h-0 flex-1 space-y-8">
        {outputs.length > 0 ? (
          outputs.map((o) => (
            <section key={o.file}>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                <FileText className="h-3.5 w-3.5" />
                {o.file}
              </div>
              <MarkdownBlocks blocks={o.blocks} />
            </section>
          ))
        ) : (
          <EmptyOutput project={project} stage={stage} />
        )}
      </div>
    </div>
  );
}

function EmptyOutput({ project, stage }: { project: Project; stage: Stage }) {
  const def = stageDef(stage)!;

  // Stages that never write a numbered artifact.
  if (def.outputs.length === 0) {
    if (stage === "build") {
      return (
        <div className="rounded-xl border border-border bg-foreground/[0.02] p-6 text-sm text-muted-foreground">
          <GitBranch className="mb-2 h-5 w-5 opacity-70" />
          The prototype is built in a separate repo, not the vault.
          {project.prototypeRepo ? (
            <div className="mt-3">
              <a
                href={project.prototypeRepo}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 accent-text hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                {project.prototypeRepo.replace(/^https?:\/\//, "")}
              </a>
            </div>
          ) : (
            <span className="mt-1 block text-muted-foreground/70">
              No prototype_repo set yet.
            </span>
          )}
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-border bg-foreground/[0.02] p-6 text-sm text-muted-foreground">
        This stage records <span className="text-foreground">decisions only</span> — see the{" "}
        <Link href="?tab=decisions" scroll={false} className="accent-text hover:underline">
          decision log
        </Link>
        .
      </div>
    );
  }

  // Has an artifact defined, but it isn't on disk yet.
  return (
    <div className="rounded-xl border border-border bg-foreground/[0.02] p-6 text-sm text-muted-foreground">
      <FileText className="mb-2 h-5 w-5 opacity-70" />
      <span className="text-foreground">{def.outputs.join(", ")}</span> hasn&apos;t been produced yet.
      <div className="mt-3 flex items-center gap-2">
        <code className="font-mono text-foreground">/{def.skill}</code>
        <CopyButton text={`/${def.skill}`} toastMessage="Copied — paste into Claude Code" />
      </div>
    </div>
  );
}
