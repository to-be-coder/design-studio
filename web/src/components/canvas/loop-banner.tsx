"use client";

import { useEffect, useState } from "react";
import type { LoopProgress } from "@/lib/types";

/**
 * One plain line for the loop's `.loop-progress` heartbeat: what is running and
 * for how long, so a twenty-minute spawn reads as work instead of silence. The
 * polling parent owns fetching; elapsed time is computed client-side from
 * spawnedAt and re-rendered on a slow tick. Renders nothing without a
 * heartbeat. Reuses the chrome's existing quiet-text idiom, no new visual
 * treatment.
 */
export function LoopBanner({ progress }: { progress: LoopProgress | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!progress) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [progress]);
  if (!progress) return null;
  const line = progressLine(progress, now);
  if (!line) return null;
  return (
    <span className="text-[0.75rem] text-ink-muted" data-testid="loop-banner">
      {line}
    </span>
  );
}

function progressLine(p: LoopProgress, now: number): string | null {
  if (p.phase === "drain") return "Closing duplicate review batches.";
  const since = elapsedPhrase(now - p.spawnedAt);
  if (p.phase === "recorder") {
    return `Recording your review${p.batch != null ? ` (batch ${p.batch})` : ""}. ${since}`;
  }
  if (p.phase === "research") {
    return `Researching${p.round != null ? `, round ${p.round}` : ""}. ${since}`;
  }
  return null;
}

function elapsedPhrase(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return "Under a minute in.";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} in.`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} in.`;
}
