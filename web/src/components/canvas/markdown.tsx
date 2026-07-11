import type { InlineSegment, RenderableBlock } from "@/lib/types";

/**
 * The reading surface. Renders markdown blocks as a designed, genuinely
 * readable page — serif body at a real measure and type scale (DESIGN.md §1).
 * This is the product's gate: a card is a page you read at 100% zoom, not a
 * thumbnail. No dangerouslySetInnerHTML.
 *
 * SPEC-CALL: §4 asks wikilinks to resolve to in-canvas navigation. parse-markdown
 * flattens [[wikilinks]] to plain text (they render readably as-is), and
 * fly-to navigation is a pan/zoom concern. Clickable in-canvas wikilinks are
 * deferred to a later slice consistent with "readable first, navigation later".
 */
export function Reading({ blocks }: { blocks: RenderableBlock[] }) {
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

  if (groups.length === 0) {
    return <p className="text-[0.9375rem] italic text-ink-faint">No content yet.</p>;
  }

  return (
    <div className="reading space-y-[0.9em]">
      {groups.map((g, i) => {
        if (g.kind === "ul") {
          return (
            <ul key={i} className="ml-5 list-disc space-y-1.5 marker:text-ink-faint">
              {g.items.map((it, j) => (
                <li key={j}>
                  <Inline segments={"text" in it ? it.text : []} />
                </li>
              ))}
            </ul>
          );
        }
        if (g.kind === "ol") {
          return (
            <ol key={i} className="ml-5 list-decimal space-y-1.5 marker:text-ink-faint">
              {g.items.map((it, j) => (
                <li key={j}>
                  <Inline segments={"text" in it ? it.text : []} />
                </li>
              ))}
            </ol>
          );
        }
        return <Block key={i} block={g.block} />;
      })}
    </div>
  );
}

function Block({ block }: { block: RenderableBlock }) {
  switch (block.kind) {
    case "heading_1":
      return (
        <h3 className="mt-[1.2em] font-serif text-[1.6rem] font-semibold leading-tight tracking-[-0.015em] text-ink first:mt-0">
          <Inline segments={block.text} />
        </h3>
      );
    case "heading_2":
      return (
        <h4 className="mt-[1.1em] font-serif text-[1.25rem] font-semibold leading-snug text-ink first:mt-0">
          <Inline segments={block.text} />
        </h4>
      );
    case "heading_3":
      return (
        <h5 className="mt-[1em] font-serif text-[1.05rem] font-semibold text-ink first:mt-0">
          <Inline segments={block.text} />
        </h5>
      );
    case "paragraph":
      if (block.text.length === 0) return null;
      return (
        <p>
          <Inline segments={block.text} />
        </p>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-inset border border-rule bg-paper-raised p-4 font-mono text-[0.8125rem] text-ink">
          <code>{block.text.map((s) => s.text).join("")}</code>
        </pre>
      );
    case "callout":
      return (
        <div className="rounded-inset border-l-2 border-rule-strong bg-paper-raised px-4 py-3">
          <div className="flex items-start gap-2.5">
            {block.emoji ? <span className="leading-tight">{block.emoji}</span> : null}
            <div className="italic text-ink-muted">
              <Inline segments={block.text} />
            </div>
          </div>
        </div>
      );
    case "divider":
      return <hr className="my-[1.2em] border-rule" />;
    default:
      return null;
  }
}

export function Inline({ segments }: { segments: InlineSegment[] }) {
  if (segments.length === 0) return null;
  return (
    <>
      {segments.map((seg, i) => {
        let node: React.ReactNode = seg.text;
        if (seg.code) {
          node = (
            <code className="rounded-[3px] bg-ink/8 px-1 py-0.5 font-mono text-[0.85em] text-ink">
              {node}
            </code>
          );
        }
        const cls: string[] = [];
        if (seg.bold) cls.push("font-semibold text-ink");
        if (seg.italic) cls.push("italic");
        if (seg.underline) cls.push("underline underline-offset-2");
        if (seg.strikethrough) cls.push("line-through opacity-70");
        const className = cls.join(" ") || undefined;

        if (seg.href) {
          return (
            <a
              key={i}
              href={seg.href}
              target="_blank"
              rel="noreferrer"
              className={`text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent ${className ?? ""}`}
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
