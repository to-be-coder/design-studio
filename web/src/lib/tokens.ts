import type { DesignTokens } from "./types";

/**
 * Pure, isomorphic helpers over a prototype's DESIGN.md tokens. Shared by the
 * server (design-system specimen board §6) and the client (live token overrides
 * §13, tweak panel §11) so the token→CSS-variable convention and the reference
 * resolver are defined exactly once.
 *
 * Convention (prototype CSS must follow it for live overrides to bite):
 *   colors.X  -> --color-X      spacing.X -> --space-X     rounded.X -> --radius-X
 */

export const SCALAR_GROUPS = ["colors", "spacing", "rounded"] as const;
export type ScalarGroup = (typeof SCALAR_GROUPS)[number];

const VAR_PREFIX: Record<ScalarGroup, string> = {
  colors: "--color-",
  spacing: "--space-",
  rounded: "--radius-",
};

/** `colors.primary` -> `--color-primary`, etc. Null for non-scalar paths. */
export function tokenToCssVar(path: string): string | null {
  const [group, ...rest] = path.split(".");
  if (!rest.length) return null;
  if ((SCALAR_GROUPS as readonly string[]).includes(group)) {
    return VAR_PREFIX[group as ScalarGroup] + rest.join(".");
  }
  return null;
}

function leaf(tokens: DesignTokens, group: string, key: string): unknown {
  const g = (tokens as unknown as Record<string, unknown>)[group];
  if (g && typeof g === "object") return (g as Record<string, unknown>)[key];
  return undefined;
}

/**
 * Resolve `{group.key}` references in a token value against the token tree.
 * Follows one level of indirection repeatedly (cap to avoid cycles). A value
 * with no reference is returned unchanged; an unresolved reference is left
 * verbatim so the defect is visible, never silently blanked.
 */
export function resolveRefs(value: unknown, tokens: DesignTokens, depth = 0): string {
  if (value == null) return "";
  let s = String(value);
  if (depth > 8) return s;
  const m = s.match(/^\{([a-zA-Z]+)\.([a-zA-Z0-9_-]+)\}$/);
  if (m) {
    const target = leaf(tokens, m[1], m[2]);
    if (target != null) return resolveRefs(target, tokens, depth + 1);
    return s;
  }
  // Inline references inside a larger string (e.g. shorthand).
  s = s.replace(/\{([a-zA-Z]+)\.([a-zA-Z0-9_-]+)\}/g, (whole, g, k) => {
    const target = leaf(tokens, g, k);
    return target != null ? resolveRefs(target, tokens, depth + 1) : whole;
  });
  return s;
}

export interface FlatToken {
  path: string; // "colors.primary"
  group: ScalarGroup;
  key: string;
  raw: string; // as written (may be a {ref})
  value: string; // fully resolved
  cssVar: string; // "--color-primary"
}

/** Flatten the scalar groups (colors / spacing / rounded) into an editable list. */
export function flattenScalars(tokens: DesignTokens): FlatToken[] {
  const out: FlatToken[] = [];
  for (const group of SCALAR_GROUPS) {
    const g = (tokens as unknown as Record<string, unknown>)[group] as Record<string, unknown>;
    if (!g) continue;
    for (const [key, raw] of Object.entries(g)) {
      if (raw == null || typeof raw === "object") continue;
      const path = `${group}.${key}`;
      out.push({
        path,
        group,
        key,
        raw: String(raw),
        value: resolveRefs(raw, tokens),
        cssVar: tokenToCssVar(path)!,
      });
    }
  }
  return out;
}

/** A typography preset is a bag of CSS-ish props. */
export interface TypePreset {
  key: string;
  props: Record<string, string>;
}

export function typographyPresets(tokens: DesignTokens): TypePreset[] {
  const out: TypePreset[] = [];
  for (const [key, val] of Object.entries(tokens.typography)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const props: Record<string, string> = {};
      for (const [p, v] of Object.entries(val as Record<string, unknown>)) {
        props[p] = resolveRefs(v, tokens);
      }
      out.push({ key, props });
    }
  }
  return out;
}

const STATE_SUFFIXES = ["Hover", "Active", "Disabled", "Focus", "Selected"] as const;

/** Split a component entry name into its base + state variant. */
export function splitComponentName(name: string): { base: string; state: string } {
  for (const suf of STATE_SUFFIXES) {
    if (name.endsWith(suf) && name.length > suf.length) {
      return { base: name.slice(0, name.length - suf.length), state: suf.toLowerCase() };
    }
  }
  return { base: name, state: "default" };
}

export interface ComponentVariant {
  /** "default" | "hover" | "active" | "disabled" | ... */
  state: string;
  /** Entry name as written ("button" / "buttonHover"). */
  entry: string;
  props: Record<string, string>;
}

export interface ComponentSpec {
  base: string;
  variants: ComponentVariant[];
}

/** Group the `components` token group into base components with state variants. */
export function componentSpecs(tokens: DesignTokens): ComponentSpec[] {
  const byBase = new Map<string, ComponentSpec>();
  const order: string[] = [];
  for (const [name, val] of Object.entries(tokens.components)) {
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const { base, state } = splitComponentName(name);
    const props: Record<string, string> = {};
    for (const [p, v] of Object.entries(val as Record<string, unknown>)) {
      props[p] = resolveRefs(v, tokens);
    }
    let spec = byBase.get(base);
    if (!spec) {
      spec = { base, variants: [] };
      byBase.set(base, spec);
      order.push(base);
    }
    spec.variants.push({ state, entry: name, props });
  }
  // Default variant first, then a stable state order.
  const stateRank = (s: string) =>
    ({ default: 0, hover: 1, focus: 2, active: 3, selected: 4, disabled: 5 })[s] ?? 9;
  for (const spec of byBase.values()) {
    spec.variants.sort((a, b) => stateRank(a.state) - stateRank(b.state));
  }
  return order.map((b) => byBase.get(b)!);
}

/** The set of base component names (for matching DOM data-component values). */
export function componentBaseNames(tokens: DesignTokens): string[] {
  return componentSpecs(tokens).map((c) => c.base);
}
