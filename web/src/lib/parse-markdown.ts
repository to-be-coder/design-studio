import { Marked, type Token, type Tokens } from "marked";
import type { InlineSegment, RenderableBlock } from "./types";

const marked = new Marked({ gfm: true, breaks: false });

/**
 * Parse a markdown string into the RenderableBlock[] shape consumed by the
 * MarkdownBlocks component. Lifted from careerbot's web/ with one addition:
 * Obsidian `[[wikilinks]]` and `![[embeds]]` are flattened to plain text
 * (this vault uses them heavily; careerbot's did not).
 */
export async function parseMarkdownBody(md: string): Promise<RenderableBlock[]> {
  const tokens = marked.lexer(stripWikiSyntax(md));
  const blocks: RenderableBlock[] = [];
  walk(tokens, blocks);
  return blocks;
}

/**
 * Turn Obsidian link syntax into plain text before tokenizing.
 *   [[Note]]          -> Note
 *   [[Note|Alias]]    -> Alias
 *   ![[Embed]]        -> (drop — we don't inline embeds)
 *   ```dataview ...``` -> a friendly placeholder (queries don't run outside Obsidian)
 */
function stripWikiSyntax(md: string): string {
  return md
    .replace(/```dataview[\s\S]*?```/g, "> 📊 *(Dataview query — view in Obsidian for the live table.)*")
    .replace(/!\[\[[^\]]*\]\]/g, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1");
}

function walk(tokens: Token[], out: RenderableBlock[]): void {
  for (const tok of tokens) {
    switch (tok.type) {
      case "heading": {
        const h = tok as Tokens.Heading;
        const depth = h.depth as 1 | 2 | 3 | 4 | 5 | 6;
        if (depth === 1) out.push({ kind: "heading_1", text: inline(h.tokens ?? []) });
        else if (depth === 2) out.push({ kind: "heading_2", text: inline(h.tokens ?? []) });
        else out.push({ kind: "heading_3", text: inline(h.tokens ?? []) });
        break;
      }
      case "paragraph": {
        const p = tok as Tokens.Paragraph;
        out.push({ kind: "paragraph", text: inline(p.tokens ?? []) });
        break;
      }
      case "blockquote": {
        const bq = tok as Tokens.Blockquote;
        const flat: Token[] = [];
        for (const child of bq.tokens ?? []) {
          if (child.type === "paragraph") {
            const p = child as Tokens.Paragraph;
            flat.push(...(p.tokens ?? []));
          }
        }
        out.push({
          kind: "callout",
          text: inline(flat),
          emoji: detectEmojiPrefix(flat),
        });
        break;
      }
      case "list": {
        const l = tok as Tokens.List;
        for (const item of l.items) {
          const itemFlat: Token[] = [];
          for (const c of item.tokens ?? []) {
            if (c.type === "text") {
              const t = c as Tokens.Text;
              if (t.tokens) itemFlat.push(...t.tokens);
              else itemFlat.push(c);
            } else if (c.type === "paragraph") {
              const p = c as Tokens.Paragraph;
              itemFlat.push(...(p.tokens ?? []));
            }
          }
          out.push({
            kind: l.ordered ? "numbered_list_item" : "bulleted_list_item",
            text: inline(itemFlat),
          });
        }
        break;
      }
      case "code": {
        const c = tok as Tokens.Code;
        out.push({
          kind: "code",
          text: [{
            text: decodeEntities(c.text),
            bold: false, italic: false, code: false,
            underline: false, strikethrough: false, href: null,
          }],
          language: c.lang || null,
        });
        break;
      }
      case "hr":
        out.push({ kind: "divider" });
        break;
      case "html":
      case "space":
        break;
      default:
        break;
    }
  }
}

interface InlineCtx {
  bold: boolean;
  italic: boolean;
  code: boolean;
  underline: boolean;
  strikethrough: boolean;
  href: string | null;
}

const BASE_CTX: InlineCtx = {
  bold: false, italic: false, code: false,
  underline: false, strikethrough: false, href: null,
};

function inline(tokens: Token[], ctx: InlineCtx = BASE_CTX): InlineSegment[] {
  const out: InlineSegment[] = [];
  for (const t of tokens) {
    switch (t.type) {
      case "text": {
        const tt = t as Tokens.Text;
        if (tt.tokens && tt.tokens.length > 0) {
          out.push(...inline(tt.tokens, ctx));
        } else {
          out.push(toSegment(tt.text, ctx));
        }
        break;
      }
      case "escape": {
        const tt = t as Tokens.Escape;
        out.push(toSegment(tt.text, ctx));
        break;
      }
      case "strong": {
        const tt = t as Tokens.Strong;
        out.push(...inline(tt.tokens ?? [], { ...ctx, bold: true }));
        break;
      }
      case "em": {
        const tt = t as Tokens.Em;
        out.push(...inline(tt.tokens ?? [], { ...ctx, italic: true }));
        break;
      }
      case "codespan": {
        const tt = t as Tokens.Codespan;
        out.push(toSegment(tt.text, { ...ctx, code: true }));
        break;
      }
      case "del": {
        const tt = t as Tokens.Del;
        out.push(...inline(tt.tokens ?? [], { ...ctx, strikethrough: true }));
        break;
      }
      case "link": {
        const tt = t as Tokens.Link;
        out.push(...inline(tt.tokens ?? [], { ...ctx, href: tt.href || null }));
        break;
      }
      case "br":
        out.push(toSegment("\n", ctx));
        break;
      case "image":
        out.push(toSegment((t as Tokens.Image).text, ctx));
        break;
      case "html":
        break;
      default:
        if ("raw" in t && typeof (t as { raw?: string }).raw === "string") {
          out.push(toSegment((t as { raw: string }).raw, ctx));
        }
        break;
    }
  }
  return out;
}

function toSegment(text: string, ctx: InlineCtx): InlineSegment {
  return { text: decodeEntities(text), ...ctx };
}

function decodeEntities(s: string): string {
  if (!s.includes("&")) return s;
  return s
    .replace(/&#x([\da-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function detectEmojiPrefix(tokens: Token[]): string | null {
  if (tokens.length === 0) return null;
  const first = tokens[0];
  if (first.type !== "text") return null;
  const t = first as Tokens.Text;
  const raw = t.text ?? "";
  const m = raw.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}])\s+/u);
  return m ? m[1] : null;
}
