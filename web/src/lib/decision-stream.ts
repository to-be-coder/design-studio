import { parseMarkdownBody } from "./parse-markdown";
import { restsOnMatches } from "./assumptions";
import { blockText } from "./blocks";
import type {
  AssumptionNode,
  Decision,
  DecisionStreamEntry,
  RenderableBlock,
} from "./types";

/**
 * Consolidate all `Decisions/*.md` into one chronological stream. Each entry's
 * In-their-words quote is pulled out for pull-quote treatment (the human's
 * verbatim voice, visually distinct from the tool's prose), and its rests_on
 * is matched to an assumption node so the assumption graph can draw the edge.
 */
export async function buildDecisionStream(
  decisions: Decision[],
  assumptions: AssumptionNode[],
): Promise<DecisionStreamEntry[]> {
  return Promise.all(
    decisions.map(async (d): Promise<DecisionStreamEntry> => {
      const inTheirWords = extractInTheirWords(d.body);
      const blocks = stripInTheirWords(await parseMarkdownBody(d.body));
      const match = assumptions.find((a) => restsOnMatches(d.restsOn, a));
      return {
        id: d.id,
        title: d.title,
        stage: d.stage,
        status: d.status,
        authoredBy: d.authoredBy,
        date: d.date,
        restsOnId: match?.id ?? null,
        restsOnLabel: d.restsOn,
        supersedes: d.supersedes,
        supersededBy: d.supersededBy,
        inTheirWords,
        blocks,
        file: d.file,
      };
    }),
  );
}

/** Pull the verbatim blockquote following an `**In their words.**` marker. */
function extractInTheirWords(body: string): string | null {
  const m = body.match(/\*\*In their words\.?\*\*\s*\n+((?:[ \t]*>.*\n?)+)/i);
  if (!m) return null;
  const quote = m[1]
    .split("\n")
    .map((l) => l.replace(/^[ \t]*>\s?/, "").trim())
    .join(" ")
    .trim();
  return quote || null;
}

/** Remove the "In their words." marker paragraph + its callout from the body. */
function stripInTheirWords(blocks: RenderableBlock[]): RenderableBlock[] {
  const out: RenderableBlock[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.kind === "paragraph" && /^in their words\.?$/i.test(blockText(b).trim())) {
      // Skip the marker and a directly-following callout (the quote block).
      if (blocks[i + 1]?.kind === "callout") i += 1;
      continue;
    }
    out.push(b);
  }
  return out;
}
