// Shared DESIGN.md helpers — zero-dependency, plain `node` (no install).
// The one place the studio's owned DESIGN.md tooling parses the format, so the
// lint, the token export, and the drift diff all read a DESIGN.md the same way
// instead of each carrying its own copy of the YAML-subset parser.
//
// Exports:
//   • parseFrontmatter(raw)      — split `---` front matter, parse the token tree.
//   • getPath / resolveValue     — token {group.key} reference resolution.
//   • collectUnresolvedRefs      — every {ref} that fails to resolve, with its location.
//   • flattenTokens(tree, opts)  — resolved leaf tokens as [{ path, value }, …].
//   • kebab / cssVarName         — a dotted token path → a `--group-key` CSS variable.
//
// The parser is exactly the subset a DESIGN.md front matter uses: block maps
// nested by indentation, block sequences, inline flow maps/seqs, `>`/`|` block
// scalars, `#` comments, quoted scalars, numbers/bools. No js-yaml, no deps.
// Consumers that also need colour/WCAG math (the lint) keep that alongside.

// ─────────────────────────────────────────────────────────────────────────────
// Minimal YAML-subset parser.
// ─────────────────────────────────────────────────────────────────────────────
const isBlank = (l) => l.trim() === "";
const isFullComment = (l) => l.trim().startsWith("#");
const indentOf = (l) => l.replace(/\t/g, "  ").match(/^ */)[0].length;

function stripInlineComment(s) {
  let inS = false, inD = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === "#" && !inS && !inD && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i).trimEnd();
  }
  return s;
}

function findColon(s) {
  let inS = false, inD = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === ":" && !inS && !inD && (i + 1 >= s.length || /\s/.test(s[i + 1]))) return i;
  }
  return -1;
}

// -- flow (inline) collections --
function parseFlow(s) {
  const p = { s, i: 0 };
  return parseFlowValue(p);
}
function skipWsF(p) { while (p.i < p.s.length && /\s/.test(p.s[p.i])) p.i++; }
function parseFlowValue(p) {
  skipWsF(p);
  const c = p.s[p.i];
  if (c === "{") return parseFlowMap(p);
  if (c === "[") return parseFlowSeq(p);
  return parseFlowScalar(p);
}
function readQuoted(p) {
  const q = p.s[p.i]; p.i++;
  let out = "";
  while (p.i < p.s.length && p.s[p.i] !== q) { out += p.s[p.i]; p.i++; }
  p.i++;
  return out;
}
function parseFlowMap(p) {
  p.i++; // {
  const obj = {};
  skipWsF(p);
  if (p.s[p.i] === "}") { p.i++; return obj; }
  while (p.i < p.s.length) {
    skipWsF(p);
    let key;
    if (p.s[p.i] === '"' || p.s[p.i] === "'") key = readQuoted(p);
    else {
      key = "";
      while (p.i < p.s.length && p.s[p.i] !== ":" && p.s[p.i] !== "," && p.s[p.i] !== "}") { key += p.s[p.i]; p.i++; }
      key = key.trim();
    }
    skipWsF(p);
    if (p.s[p.i] === ":") p.i++;
    obj[key] = parseFlowValue(p);
    skipWsF(p);
    if (p.s[p.i] === ",") { p.i++; continue; }
    if (p.s[p.i] === "}") { p.i++; break; }
    break;
  }
  return obj;
}
function parseFlowSeq(p) {
  p.i++; // [
  const arr = [];
  skipWsF(p);
  if (p.s[p.i] === "]") { p.i++; return arr; }
  while (p.i < p.s.length) {
    arr.push(parseFlowValue(p));
    skipWsF(p);
    if (p.s[p.i] === ",") { p.i++; continue; }
    if (p.s[p.i] === "]") { p.i++; break; }
    break;
  }
  return arr;
}
function parseFlowScalar(p) {
  skipWsF(p);
  if (p.s[p.i] === '"' || p.s[p.i] === "'") return readQuoted(p);
  let tok = "";
  while (p.i < p.s.length && !",}]".includes(p.s[p.i])) { tok += p.s[p.i]; p.i++; }
  return coerceScalar(tok.trim());
}

function coerceScalar(s) {
  if (s === "" || s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  return s;
}
function parseScalar(s) {
  s = s.trim();
  if (s === "") return null;
  if (s[0] === '"' || s[0] === "'") {
    const q = s[0];
    return s[s.length - 1] === q ? s.slice(1, -1) : s.slice(1);
  }
  if (s[0] === "{" || s[0] === "[") return parseFlow(s);
  return coerceScalar(s);
}

// -- block collections --
function consumeBlockScalar(lines, i, parentIndent) {
  const parts = [];
  while (i < lines.length) {
    const raw = lines[i];
    if (isBlank(raw)) { parts.push(""); i++; continue; }
    if (indentOf(raw) <= parentIndent) break;
    parts.push(raw.trim());
    i++;
  }
  return { value: parts.join(" ").trim(), next: i };
}

function nextSignificant(lines, i) {
  while (i < lines.length && (isBlank(lines[i]) || isFullComment(lines[i]))) i++;
  return i;
}

function parseNestedAfter(lines, i, parentIndent) {
  const j = nextSignificant(lines, i);
  if (j >= lines.length) return { value: null, next: j };
  const ind = indentOf(lines[j]);
  if (ind <= parentIndent) return { value: null, next: i };
  const content = stripInlineComment(lines[j].trim());
  if (content === "-" || content.startsWith("- ")) return parseSeq(lines, i, ind);
  return parseMap(lines, i, ind);
}

function parseMap(lines, i, indent) {
  const obj = {};
  while (i < lines.length) {
    const raw = lines[i];
    if (isBlank(raw) || isFullComment(raw)) { i++; continue; }
    const ind = indentOf(raw);
    if (ind < indent) break;
    if (ind > indent) { i++; continue; }
    const content = stripInlineComment(raw.trim());
    if (content === "-" || content.startsWith("- ")) break; // a sequence, not a map
    const colon = findColon(content);
    if (colon === -1) { i++; continue; }
    const key = content.slice(0, colon).trim();
    const rest = content.slice(colon + 1).trim();
    if (rest === "") {
      const child = parseNestedAfter(lines, i + 1, indent);
      obj[key] = child.value;
      i = child.next;
    } else if (/^[>|][+-]?$/.test(rest)) {
      const bs = consumeBlockScalar(lines, i + 1, indent);
      obj[key] = bs.value;
      i = bs.next;
    } else {
      obj[key] = parseScalar(rest);
      i++;
    }
  }
  return { value: obj, next: i };
}

function parseSeq(lines, i, indent) {
  const arr = [];
  while (i < lines.length) {
    const raw = lines[i];
    if (isBlank(raw) || isFullComment(raw)) { i++; continue; }
    const ind = indentOf(raw);
    if (ind < indent) break;
    if (ind > indent) { i++; continue; }
    const content = stripInlineComment(raw.trim());
    if (!content.startsWith("-")) break;
    const item = content.slice(1).trim();
    if (item === "") {
      const child = parseNestedAfter(lines, i + 1, indent);
      arr.push(child.value);
      i = child.next;
    } else if (item[0] === "{" || item[0] === "[") {
      arr.push(parseScalar(item));
      i++;
    } else if (findColon(item) !== -1) {
      // block-map sequence item: "- key: val" (+ deeper continuation lines).
      const keyIndent = raw.match(/^(\s*-\s+)/)[1].length;
      const patched = lines.slice();
      patched[i] = " ".repeat(keyIndent) + raw.slice(keyIndent);
      const sub = parseMap(patched, i, keyIndent);
      arr.push(sub.value);
      i = sub.next;
    } else {
      arr.push(parseScalar(item));
      i++;
    }
  }
  return { value: arr, next: i };
}

export function parseFrontmatter(raw) {
  const norm = raw.replace(/\r\n/g, "\n");
  if (!/^---\s*\n/.test(norm)) return { data: null, body: norm, hadFrontmatter: false };
  const lines = norm.split("\n");
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") { end = i; break; }
  }
  if (end === -1) return { data: null, body: norm, hadFrontmatter: false, error: "unterminated front matter (`---`)" };
  const fmLines = lines.slice(1, end);
  const body = lines.slice(end + 1).join("\n");
  let data;
  try {
    data = parseMap(fmLines, 0, 0).value;
  } catch (e) {
    return { data: null, body, hadFrontmatter: true, error: `front matter parse error: ${e.message}` };
  }
  return { data, body, hadFrontmatter: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Token reference resolution.
// ─────────────────────────────────────────────────────────────────────────────
export const REF = /\{([a-zA-Z][\w.-]*)\}/g;
export const REF_FULL = /^\{([a-zA-Z][\w.-]*)\}$/;

export function getPath(tree, dotted) {
  const parts = dotted.split(".");
  let cur = tree;
  for (const p of parts) {
    if (cur && typeof cur === "object" && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
    else return undefined;
  }
  return cur;
}

export function resolveValue(v, tree, depth = 0) {
  if (v == null) return "";
  let s = String(v);
  if (depth > 8) return s;
  const full = s.match(REF_FULL);
  if (full) {
    const t = getPath(tree, full[1]);
    return t != null ? resolveValue(t, tree, depth + 1) : s;
  }
  return s.replace(REF, (whole, dotted) => {
    const t = getPath(tree, dotted);
    return t != null ? resolveValue(t, tree, depth + 1) : whole;
  });
}

/**
 * Resolve a value to its effective TOKEN, which may be a composite object.
 * A full reference (`{typography.label}`) returns the referenced node itself —
 * so a component sub-token that points at a whole type level yields the level's
 * object, not the string "[object Object]". Partial/literal strings resolve
 * their embedded refs to a string; non-strings pass through.
 */
export function resolveToken(v, tree, depth = 0) {
  if (depth > 8 || typeof v !== "string") return v;
  const full = v.match(REF_FULL);
  if (full) {
    const t = getPath(tree, full[1]);
    return t === undefined ? v : resolveToken(t, tree, depth + 1);
  }
  return resolveValue(v, tree, depth);
}

/** Walk the tree; return every unresolved {ref} with the location it sits in. */
export function collectUnresolvedRefs(tree) {
  const bad = [];
  const walk = (node, loc) => {
    if (node == null) return;
    if (typeof node === "string") {
      let m;
      REF.lastIndex = 0;
      while ((m = REF.exec(node)) !== null) {
        if (getPath(tree, m[1]) == null) bad.push({ ref: m[1], loc });
      }
    } else if (Array.isArray(node)) {
      node.forEach((v, idx) => walk(v, `${loc}[${idx}]`));
    } else if (typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, loc ? `${loc}.${k}` : k);
    }
  };
  walk(tree, "");
  return bad;
}

// ─────────────────────────────────────────────────────────────────────────────
// Token flattening + CSS variable naming (used by export and diff).
// ─────────────────────────────────────────────────────────────────────────────

// Front-matter keys that are metadata, not visual tokens — never flattened.
export const METADATA_KEYS = ["name", "description", "version"];

/**
 * Flatten a parsed DESIGN.md token tree to resolved leaf tokens, in document
 * order: [{ path: "colors.desk", value: "<resolved>" }, …]. Nested groups
 * (typography levels, motion sub-groups, component sub-tokens) yield dotted
 * paths; sequence entries yield numeric path segments. References ({group.key})
 * are resolved against the whole tree, so the value is the effective token.
 * Metadata keys are always skipped; pass more top-level group names in
 * `skipGroups` (e.g. `contrast` for a CSS export, where a11y floors are config,
 * not renderable values).
 */
export function flattenTokens(tree, { skipGroups = [] } = {}) {
  const skip = new Set([...METADATA_KEYS, ...skipGroups]);
  const out = [];
  const walk = (node, parts) => {
    if (node == null) {
      out.push({ path: parts.join("."), value: "" });
    } else if (Array.isArray(node)) {
      node.forEach((v, idx) => walk(v, [...parts, String(idx)]));
    } else if (typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, [...parts, k]);
    } else {
      // A leaf may be a full reference to a composite (a component's `typography`
      // pointing at a whole type level) — expand it into that level's leaves
      // rather than stringify an object.
      const resolved = resolveToken(node, tree);
      if (resolved && typeof resolved === "object") walk(resolved, parts);
      else out.push({ path: parts.join("."), value: String(resolved ?? "") });
    }
  };
  if (tree && typeof tree === "object") {
    for (const [group, node] of Object.entries(tree)) {
      if (skip.has(group)) continue;
      walk(node, [group]);
    }
  }
  return out;
}

/** camelCase / arbitrary token key → kebab-case CSS-safe segment. */
export function kebab(s) {
  return String(s)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/** A dotted token path → a `--group-key` custom-property name (`colors.paperRaised` → `--colors-paper-raised`). */
export function cssVarName(dottedPath) {
  return "--" + dottedPath.split(".").map(kebab).filter(Boolean).join("-");
}
