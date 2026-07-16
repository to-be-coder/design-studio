import { readProjectFile } from "./vault";
import { webReceipt, type Receipt } from "./wikilinks";

/**
 * Resolve the web origin of a receipted quote. Ledger and WWB receipts carry
 * `[[doc]] "quote"` with no URL, but the receipt law makes the quote verbatim
 * in the cited doc, and that doc records where the evidence came from (a
 * `[domain/path]` citation or a bare URL next to the quote). So when a receipt
 * set has a quote but no web receipt, this pass finds the quote inside the
 * cited docs and harvests the citation sitting beside it.
 */

/** A doc-body getter, whitespace-normalized, cached for the life of one request. */
export type DocBodies = (target: string) => Promise<string | null>;

export function docBodyCache(slug: string): DocBodies {
  const cache = new Map<string, Promise<string | null>>();
  return (target: string) => {
    const key = target.toLowerCase();
    let hit = cache.get(key);
    if (!hit) {
      hit = readProjectFile(slug, `${target}.md`).then((f) => (f ? norm(f.body) : null));
      cache.set(key, hit);
    }
    return hit;
  };
}

const norm = (s: string) => s.replace(/\s+/g, " ");

/** Quotes worth resolving; the length floor skips incidental quoted words. */
const QUOTE = /[“"]([^”"]{12,}?)[”"]/g;
/**
 * A citation as the docs actually write one: the `[domain/path]` shorthand, a
 * full URL, or a bare domain-with-path attribution ("community.openai.com/t/…",
 * no protocol, no brackets). The bare form requires a path so ordinary prose
 * ("node.js") can't match.
 */
const CITE =
  /(?<!\[)\[((?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\]\s]*)?)\](?!\])|https?:\/\/[^\s\])"'>]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s\])"'>,]+/i;
/** How far past the quote a citation still counts as "beside it". */
const CITE_WINDOW = 500;

/**
 * Append web receipts resolved from the text's quotes. Each quote is looked up
 * in the cited docs in order, at every occurrence (a doc can quote the same
 * line twice, once with a citation and once without, and punctuation drifts, so
 * a trailing-punctuation-trimmed variant is tried too). The first citation
 * found within the window after an occurrence wins. Existing receipts are
 * never removed or reordered.
 */
export async function withWebSources(
  receipts: Receipt[],
  text: string,
  bodies: DocBodies,
): Promise<Receipt[]> {
  const quotes = [...text.matchAll(QUOTE)].map((m) => norm(m[1]));
  if (quotes.length === 0) return receipts;
  const docs = receipts.filter((r) => r.kind !== "web");
  if (docs.length === 0) return receipts;

  const seen = new Set(receipts.filter((r) => r.kind === "web").map((r) => r.target));
  const out = [...receipts];
  for (const quote of quotes) {
    const variants = [...new Set([quote, quote.replace(/[.?!,;:]+$/, "")])];
    let url: string | null = null;
    for (const r of docs) {
      const body = await bodies(r.target);
      if (!body) continue;
      for (const v of variants) {
        url = citeNearQuote(body, v);
        if (url) break;
      }
      if (url) break;
    }
    // An ellipsis means the doc abbreviated the URL; it cannot link anywhere.
    if (url && !url.includes("…")) {
      const rec = webReceipt(url);
      if (!seen.has(rec.target)) {
        seen.add(rec.target);
        out.push(rec);
      }
    }
  }
  return out;
}

/** The first citation within the window after any occurrence of the quote. */
function citeNearQuote(body: string, quote: string): string | null {
  if (!quote) return null;
  let from = 0;
  for (let hop = 0; hop < 8; hop++) {
    const at = body.indexOf(quote, from);
    if (at < 0) return null;
    const after = body.slice(at + quote.length, at + quote.length + CITE_WINDOW);
    const m = after.match(CITE);
    if (m) return (m[1] ?? m[0]).replace(/[.,;:]+$/, "");
    from = at + quote.length;
  }
  return null;
}
