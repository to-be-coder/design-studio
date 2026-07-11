import type { RenderableBlock } from "./types";

/** Flatten a block's inline segments to plain text. */
export function blockText(block: RenderableBlock): string {
  if ("text" in block && Array.isArray(block.text)) {
    return block.text.map((s) => s.text).join("");
  }
  return "";
}

export interface Section {
  /** The H2 heading text (or "" for content before the first H2). */
  title: string;
  blocks: RenderableBlock[];
}

/**
 * Split a rendered markdown body into sections at each `## heading`. The
 * heading block itself is dropped from the section's blocks (the title carries
 * it). Content before the first H2 lands in a leading section with title "".
 */
export function splitByH2(blocks: RenderableBlock[]): Section[] {
  const sections: Section[] = [{ title: "", blocks: [] }];
  for (const b of blocks) {
    if (b.kind === "heading_2") {
      sections.push({ title: blockText(b).trim(), blocks: [] });
    } else {
      sections[sections.length - 1].blocks.push(b);
    }
  }
  return sections.filter((s) => s.title !== "" || s.blocks.length > 0);
}

/** Find the first section whose title matches (case-insensitive substring). */
export function findSection(sections: Section[], ...needles: string[]): Section | null {
  for (const n of needles) {
    const ln = n.toLowerCase();
    const hit = sections.find((s) => s.title.toLowerCase().includes(ln));
    if (hit) return hit;
  }
  return null;
}
