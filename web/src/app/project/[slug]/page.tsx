import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/vault";
import { STAGES } from "@/lib/schema";
import type { Stage } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { PipelineRail } from "@/components/pipeline-rail";
import { StagePane } from "@/components/stage-pane";
import { DecisionList } from "@/components/decision-list";
import { MarkdownBlocks } from "@/components/markdown-blocks";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ stage?: string; tab?: string }>;
}

const VALID_STAGES = new Set<string>(STAGES.map((s) => s.stage));

export default async function ProjectPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { stage, tab } = await searchParams;

  const detail = await getProject(slug);
  if (!detail) notFound();

  const selectedStage: Stage | null =
    stage && VALID_STAGES.has(stage) ? (stage as Stage) : null;
  const showDecisions = tab === "decisions";

  const base = `/project/${slug}`;
  // view precedence: decisions tab > selected stage > overview
  const view: "decisions" | "stage" | "overview" = showDecisions
    ? "decisions"
    : selectedStage
      ? "stage"
      : "overview";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 lg:flex-row">
      {/* Mid panel: pipeline rail */}
      <div className="flex min-h-0 shrink-0 lg:w-[23rem]">
        <PipelineRail
          project={detail.project}
          pipeline={detail.pipeline}
          selectedStage={selectedStage}
        />
      </div>

      {/* Right panel: title + tabs + content */}
      <div className="panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border px-5 py-4">
          <PageHeader
            title={detail.project.name}
            subtitle={detail.project.client ?? undefined}
            href={detail.project.prototypeRepo ?? undefined}
          />
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-border px-4 py-2">
          <TabLink href={base} active={view === "overview"}>
            Overview
          </TabLink>
          <TabLink href={`${base}?tab=decisions`} active={view === "decisions"}>
            Decisions
            <span className="ml-1 text-[10px] text-muted-foreground/70">
              {detail.decisions.length}
            </span>
          </TabLink>
          {view === "stage" && selectedStage ? (
            <span className="ml-1 rounded-md bg-foreground/[0.06] px-2.5 py-1 text-sm font-medium accent-text">
              {selectedStage}
            </span>
          ) : null}
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          {view === "decisions" ? (
            <DecisionList decisions={detail.decisions} />
          ) : view === "stage" && selectedStage ? (
            <StagePane project={detail.project} stage={selectedStage} />
          ) : (
            <MarkdownBlocks blocks={detail.dashboardBlocks} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-foreground/[0.06] text-foreground"
          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
