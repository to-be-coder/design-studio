"use client";

import type { BoardHeader, Project } from "@/lib/types";
import { stageName } from "./util";

/**
 * The slim project header above the spine (§3): current stage, recommended
 * next step, and the Overrides receipts when present — skipped-gate receipts
 * are part of the honest flow, not dirty laundry to hide.
 */
export function ProjectHeader({
  project,
  header,
}: {
  project: Project;
  header: BoardHeader;
}) {
  return (
    <header className="mb-2 w-[52rem] max-w-[92vw]">
      <p className="eyebrow mb-1">
        {project.client ? `${project.client} · ` : ""}
        {project.route ? `${project.route} route` : "design project"}
      </p>
      <h1 className="font-serif text-[2.4rem] font-semibold leading-tight tracking-[-0.02em] text-ink">
        {project.name}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.875rem]">
        {header.currentStage ? (
          <span className="text-ink-muted">
            Now:{" "}
            <span className="font-semibold text-accent">{stageName(header.currentStage)}</span>
          </span>
        ) : null}
        {header.nextStep ? (
          <span className="max-w-xl text-ink-muted">
            <span className="text-ink-faint">Next —</span> {header.nextStep}
          </span>
        ) : null}
      </div>

      {header.overrides.length ? (
        <div className="mt-4 rounded-inset border border-rule bg-paper-raised px-4 py-3" data-testid="overrides">
          <p className="eyebrow mb-1.5">Override receipts</p>
          <ul className="space-y-1 text-[0.8125rem] text-ink-muted">
            {header.overrides.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
