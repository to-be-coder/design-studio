import { cn } from "@/lib/utils";
import type { InlineSegment, RenderableBlock } from "@/lib/types";

function Inline({ segments }: { segments: InlineSegment[] }) {
  if (segments.length === 0) return null;
  return (
    <>
      {segments.map((seg, i) => {
        let node: React.ReactNode = seg.text;
        if (seg.code) {
          node = (
            <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.85em]">
              {node}
            </code>
          );
        }
        const classes: string[] = [];
        if (seg.bold) classes.push("font-semibold text-foreground");
        if (seg.italic) classes.push("italic");
        if (seg.underline) classes.push("underline underline-offset-2");
        if (seg.strikethrough) classes.push("line-through opacity-70");
        const className = classes.join(" ") || undefined;

        if (seg.href) {
          return (
            <a
              key={i}
              href={seg.href}
              className={cn(
                "text-[var(--accent-solid)] underline decoration-[var(--accent-solid)]/40 underline-offset-2 hover:decoration-[var(--accent-solid)]",
                className,
              )}
              target="_blank"
              rel="noreferrer"
            >
              {node}
            </a>
          );
        }
        return (
          <span key={i} className={className}>
            {node}
          </span>
        );
      })}
    </>
  );
}

/**
 * Render a list of markdown blocks as static HTML (no dangerouslySetInnerHTML).
 * Groups consecutive list items into <ul>/<ol>. Lifted from careerbot's web/,
 * restyled to the design-studio monotone tokens.
 */
export function MarkdownBlocks({ blocks }: { blocks: RenderableBlock[] }) {
  type Group =
    | { kind: "ul"; items: RenderableBlock[] }
    | { kind: "ol"; items: RenderableBlock[] }
    | { kind: "single"; block: RenderableBlock };

  const groups: Group[] = [];
  for (const block of blocks) {
    const last = groups[groups.length - 1];
    if (block.kind === "bulleted_list_item") {
      if (last && last.kind === "ul") last.items.push(block);
      else groups.push({ kind: "ul", items: [block] });
    } else if (block.kind === "numbered_list_item") {
      if (last && last.kind === "ol") last.items.push(block);
      else groups.push({ kind: "ol", items: [block] });
    } else {
      groups.push({ kind: "single", block });
    }
  }

  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
      {groups.map((g, i) => {
        if (g.kind === "ul") {
          return (
            <ul key={i} className="ml-5 list-disc space-y-1.5 marker:text-foreground/30">
              {g.items.map((it, j) =>
                it.kind === "bulleted_list_item" ? (
                  <li key={j}>
                    <Inline segments={it.text} />
                  </li>
                ) : null,
              )}
            </ul>
          );
        }
        if (g.kind === "ol") {
          return (
            <ol key={i} className="ml-5 list-decimal space-y-1.5 marker:text-foreground/30">
              {g.items.map((it, j) =>
                it.kind === "numbered_list_item" ? (
                  <li key={j}>
                    <Inline segments={it.text} />
                  </li>
                ) : null,
              )}
            </ol>
          );
        }
        return <SingleBlock key={i} block={g.block} />;
      })}
      {groups.length === 0 ? (
        <p className="text-sm italic text-muted-foreground/70">No content yet.</p>
      ) : null}
    </div>
  );
}

function SingleBlock({ block }: { block: RenderableBlock }) {
  switch (block.kind) {
    case "heading_1":
      return (
        <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          <Inline segments={block.text} />
        </h2>
      );
    case "heading_2":
      return (
        <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
          <Inline segments={block.text} />
        </h3>
      );
    case "heading_3":
      return (
        <h4 className="mt-4 text-base font-semibold tracking-tight text-foreground">
          <Inline segments={block.text} />
        </h4>
      );
    case "paragraph":
      if (block.text.length === 0) return <div className="h-2" />;
      return (
        <p>
          <Inline segments={block.text} />
        </p>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-xl border border-border bg-foreground/[0.03] p-4 font-mono text-[13px] text-foreground/90">
          <code>{block.text.map((s) => s.text).join("")}</code>
        </pre>
      );
    case "callout":
      return (
        <div className="rounded-xl border border-border bg-foreground/[0.03] p-4">
          <div className="flex items-start gap-3">
            <div className="text-base leading-none">{block.emoji ?? "💡"}</div>
            <div>
              <Inline segments={block.text} />
            </div>
          </div>
        </div>
      );
    case "divider":
      return <hr className="my-6 border-border" />;
    case "unsupported":
      return (
        <p className="text-xs italic text-muted-foreground/60">
          (unsupported block: {block.type})
        </p>
      );
    default:
      return null;
  }
}
