import { parseMarkdownBody } from "./parse-markdown";
import { readProjectFile } from "./vault";
import { blockText, findSection, splitByH2, type Section } from "./blocks";
import type { FramingModel, RenderableBlock } from "./types";

const BRIEF_FILE = "01 Brief & Problem.md";
const CLARIFICATIONS_FILE = "Clarifications.md";
const AGREEMENTS_FILE = "Agreements.md";

/**
 * Read a companion vault file that reads as a debrief document (Clarifications,
 * Agreements). Drops its leading "# …" heading — the reader labels the doc.
 */
async function readDocFile(slug: string, file: string): Promise<RenderableBlock[] | null> {
  const f = await readProjectFile(slug, file);
  if (!f) return null;
  const blocks = await parseMarkdownBody(f.body);
  return blocks.length && blocks[0].kind === "heading_1" ? blocks.slice(1) : blocks;
}

/**
 * Parse `01 Brief & Problem.md` into the framing model behind the board's
 * opening view. The debrief's central move — task → problem — is made visible
 * by placing the original brief beside the restated problem, so we pull those
 * two sections out explicitly, plus the rubric, guiding principle, the two
 * success-criteria registers, and the Full/Lite route decision.
 */
export async function getFraming(slug: string): Promise<FramingModel | null> {
  const file = await readProjectFile(slug, BRIEF_FILE);
  if (!file) return null;
  const blocks = await parseMarkdownBody(file.body);
  const sections = splitByH2(blocks);

  const original = findSection(sections, "original brief", "original", "the brief", "brief as handed");
  const restated = findSection(sections, "restated problem", "restated", "the problem");
  const rubric = findSection(sections, "hidden rubric", "rubric");
  const principle = findSection(sections, "guiding principle", "principle");
  const route = findSection(sections, "route", "full vs lite", "full or lite");

  // Success criteria: two registers. Prefer explicit sub-registers; fall back
  // to a single "success criteria" section rendered whole.
  const outcome = findSection(sections, "shipped outcome", "outcome register", "in the world");
  const signal = findSection(sections, "in-session signal", "session signal", "signal register");
  const successAll = findSection(sections, "success criteria", "success");

  // The guiding principle is set large — take its first non-empty paragraph.
  const principleText = principle
    ? firstParagraph(principle.blocks)
    : null;

  const used = new Set<Section>(
    [original, restated, rubric, principle, route, outcome, signal, successAll].filter(
      (s): s is Section => s != null,
    ),
  );
  const extras = sections.filter((s) => s.title && !used.has(s));

  // The agenda and the agreements ledger live in their own files but read as
  // debrief documents.
  const clarifications = await readDocFile(slug, CLARIFICATIONS_FILE);
  const agreements = await readDocFile(slug, AGREEMENTS_FILE);

  return {
    originalBrief: original?.blocks ?? null,
    restatedProblem: restated?.blocks ?? null,
    hiddenRubric: rubric?.blocks ?? null,
    guidingPrinciple: principleText,
    successOutcome: outcome?.blocks ?? (successAll && !signal ? successAll.blocks : null),
    successSignal: signal?.blocks ?? null,
    routeDecision: route?.blocks ?? null,
    extras,
    clarifications,
    agreements,
  };
}

function firstParagraph(blocks: RenderableBlock[]): string | null {
  for (const b of blocks) {
    if (b.kind === "paragraph") {
      const t = blockText(b).trim();
      if (t) return t;
    }
  }
  return null;
}
