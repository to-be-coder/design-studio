/**
 * Vault markdown is often hard-wrapped at a column width, and per CommonMark a
 * single newline inside a paragraph, bullet, or labeled line is a soft break,
 * not a new block. The structured parsers (the ledger, What's Worth Building)
 * read line by line, so without this pass a wrapped sentence parses as several
 * fragments and the Canvas renders it broken mid-sentence.
 *
 * A line is glued onto the previous one unless either side says no: the
 * previous line cannot take a continuation (blank, heading, divider, table
 * row), or the line itself starts a new block (blank, bullet, numbered item,
 * blockquote, heading, divider, table row, a snake-case `key:` line, or
 * anything the caller flags via `startsBlock`). Label lines are matched
 * generically rather than against each parser's known keys, so metadata the
 * parser does not recognize still keeps its own line instead of being glued
 * into a neighbour's sentence.
 *
 * One asymmetry, taken from how the skills actually write these files: a
 * wrapped label VALUE continues on an indented line (`caveat: ...` then two
 * spaces), while an unindented line after a label is a new paragraph even
 * without a blank line between. Paragraph and bullet prose joins either way,
 * per CommonMark lazy continuation.
 */
export function joinSoftWraps(
  lines: string[],
  startsBlock?: (line: string) => boolean,
): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const prev = out.length > 0 ? out[out.length - 1] : null;
    if (
      prev != null &&
      canContinue(prev) &&
      !opensBlock(line) &&
      !(startsBlock?.(line) ?? false) &&
      (!LABEL_LINE.test(prev) || /^\s{2,}/.test(line))
    ) {
      out[out.length - 1] = `${prev.replace(/\s+$/, "")} ${line.trim()}`;
    } else {
      out.push(line);
    }
  }
  return out;
}

const HEADING = /^\s*#{1,6}\s/;
const DIVIDER = /^\s*([-*_])\s*(?:\1\s*){2,}$/;
const TABLE_ROW = /^\s*\|/;
// A lowercase snake-case key at line start reads as a label (`kind:`,
// `rests_on:`, `lean:`), never as a wrapped sentence fragment; capitalized
// words before a colon ("Your call: ...") stay joinable prose.
const LABEL_LINE = /^\s*[a-z][a-z0-9_-]*:(\s|$)/;

function canContinue(prev: string): boolean {
  return (
    Boolean(prev.trim()) && !HEADING.test(prev) && !DIVIDER.test(prev) && !TABLE_ROW.test(prev)
  );
}

function opensBlock(line: string): boolean {
  if (!line.trim()) return true;
  if (/^\s*[-*+]\s+/.test(line)) return true;
  if (/^\s*\d+[.)]\s+/.test(line)) return true;
  if (/^\s*>/.test(line)) return true;
  if (HEADING.test(line)) return true;
  if (DIVIDER.test(line)) return true;
  if (TABLE_ROW.test(line)) return true;
  return LABEL_LINE.test(line);
}
