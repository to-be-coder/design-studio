import { STAGES, UTILITIES } from "@/lib/schema";
import { humanizeSlug } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { CopyButton } from "@/components/copy-button";
import { AutonomyChip } from "@/components/badges";
import type { Autonomy } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Row {
  key: string;
  title: string;
  skill: string;
  phase: string;
  autonomy: Autonomy;
  runnable: boolean;
  blurb: string;
}

export default function SkillsPage() {
  const stageRows: Row[] = STAGES.map((s, i) => ({
    key: s.stage,
    title: `${i + 1}. ${humanizeSlug(s.stage)}`,
    skill: s.skill,
    phase: s.phase,
    autonomy: s.autonomy,
    runnable: s.runnable,
    blurb: s.blurb,
  }));
  const utilRows: Row[] = UTILITIES.map((u) => ({
    key: u.utility,
    title: humanizeSlug(u.utility),
    skill: u.skill,
    phase: "Utility",
    autonomy: u.autonomy,
    runnable: u.runnable,
    blurb: u.blurb,
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-6 md:px-8 md:pt-8">
        <PageHeader
          title="Skills"
          subtitle="The design-studio pipeline, straight from the schema."
        />
      </div>

      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 pb-10 pt-6 md:px-8">
        <div className="panel p-5 text-sm text-muted-foreground">
          Each skill reads and writes the same markdown vault this dashboard renders. Copy a command
          and paste it into Claude Code to run it. The <span className="text-foreground">Auto</span> /{" "}
          <span className="text-foreground">Review</span> / <span className="text-foreground">Action</span>{" "}
          label tells you how much the skill decides versus how much you do.
        </div>

        <SkillTable title="Pipeline" rows={stageRows} />
        <SkillTable title="Utilities" rows={utilRows} />
      </div>
    </div>
  );
}

function SkillTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </h2>
      <div className="panel overflow-hidden">
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.key} className="flex items-start gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold tracking-tight text-foreground">
                    {r.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground/70">{r.phase}</span>
                  <AutonomyChip autonomy={r.autonomy} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{r.blurb}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <code className="rounded-md bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[12px] text-foreground">
                    /{r.skill}
                  </code>
                  <CopyButton text={`/${r.skill}`} toastMessage="Copied — paste into Claude Code" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
