"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ArtifactCard as CardModel } from "@/lib/types";
import { Reading } from "./markdown";
import { obsidianHref } from "./util";

const COLLAPSED_MAX = 420; // px — the measured excerpt height before "expand"

/**
 * An artifact sheet: a designed title strip + the artifact rendered as a
 * readable page (§4). Excerpt-first with a measured max height, expanding to
 * full height in place so one overgrown document can't distort the board.
 */
export function ArtifactCard({
  card,
  slug,
  stageLabel,
  expanded: expandedProp,
  onToggleExpand,
}: {
  card: CardModel;
  slug: string;
  stageLabel: string;
  /** Controlled expand (persisted at the canvas level) — falls back to local. */
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = expandedProp ?? localExpanded;
  const toggle = onToggleExpand ?? (() => setLocalExpanded((v) => !v));
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el) setOverflows(el.scrollHeight > COLLAPSED_MAX + 24);
  }, [card]);

  const href = obsidianHref(slug, card.file);

  if (card.kind === "design-system-placeholder" || card.kind === "prototype-placeholder") {
    return (
      <PlaceholderCard card={card} stageLabel={stageLabel} />
    );
  }

  return (
    <article
      id={card.id}
      className="card-sheet flex w-[38rem] max-w-[88vw] flex-col"
      data-card-kind={card.kind}
    >
      <TitleStrip title={card.title} stageLabel={stageLabel} file={card.file} href={href} />
      <div className="relative px-8 py-6">
        <div
          ref={bodyRef}
          className="overflow-hidden"
          style={{ maxHeight: expanded || !overflows ? "none" : COLLAPSED_MAX }}
        >
          <Reading blocks={card.blocks} />
        </div>
        {overflows && !expanded ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
            style={{ background: "linear-gradient(to bottom, transparent, var(--paper))" }}
            aria-hidden
          />
        ) : null}
        {overflows ? (
          <button
            type="button"
            onClick={toggle}
            className="relative mt-3 rounded-pill border border-rule px-3 py-1 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function TitleStrip({
  title,
  stageLabel,
  file,
  href,
}: {
  title: string;
  stageLabel: string;
  file: string | null;
  href: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-rule px-8 pb-4 pt-6">
      <div className="min-w-0">
        <p className="eyebrow mb-1">{stageLabel}</p>
        <h3 className="truncate font-sans text-[0.9375rem] font-semibold tracking-[-0.005em] text-ink">
          {title}
        </h3>
      </div>
      {href ? (
        <a
          href={href}
          className="shrink-0 rounded-pill border border-rule px-2.5 py-1 text-[0.75rem] text-ink-muted transition-colors hover:text-accent"
          title={file ?? undefined}
        >
          Open
        </a>
      ) : null}
    </div>
  );
}

function PlaceholderCard({ card, stageLabel }: { card: CardModel; stageLabel: string }) {
  return (
    <article
      id={card.id}
      className="card-sheet flex w-[24rem] max-w-[88vw] flex-col"
      data-card-kind={card.kind}
    >
      <TitleStrip title={card.title} stageLabel={stageLabel} file={card.file} href={null} />
      <div className="px-8 py-6">
        <div className="rounded-inset border border-dashed border-rule-strong px-4 py-6 text-center">
          <p className="eyebrow mb-2">
            {card.kind === "prototype-placeholder" ? "Running thing" : "Living specimens"}
          </p>
          <p className="text-[0.875rem] leading-relaxed text-ink-muted">{card.note}</p>
        </div>
      </div>
    </article>
  );
}
