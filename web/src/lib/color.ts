/**
 * Colour parsing + WCAG contrast. Pure, dependency-free, isomorphic (used by the
 * design-system board §6 to show computed contrast ratios inline, and by the
 * tokens/tweak slices to recompute contrast live as a value is edited).
 *
 * Supports the value forms a DESIGN.md token may hold: hex (#rgb / #rrggbb /
 * #rrggbbaa), rgb()/rgba(), and oklch(). Anything unparseable returns null and
 * the caller degrades honestly (shows "—", never a fabricated ratio).
 */

export interface RGB {
  r: number; // 0..255
  g: number;
  b: number;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function parseHex(s: string): RGB | null {
  let h = s.trim().replace(/^#/, "");
  if (h.length === 3 || h.length === 4) {
    h = h
      .slice(0, 3)
      .split("")
      .map((c) => c + c)
      .join("");
  } else if (h.length === 6 || h.length === 8) {
    h = h.slice(0, 6);
  } else {
    return null;
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function parseRgb(s: string): RGB | null {
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(/[,/]/).map((p) => p.trim());
  if (parts.length < 3) return null;
  const comp = (p: string): number => {
    if (p.endsWith("%")) return (parseFloat(p) / 100) * 255;
    return parseFloat(p);
  };
  const r = comp(parts[0]);
  const g = comp(parts[1]);
  const b = comp(parts[2]);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

/** oklch(L C H) → sRGB. L in 0..1 (or %), C ≥ 0, H in degrees. */
function parseOklch(s: string): RGB | null {
  const m = s.match(/oklch\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(/[/\s]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const L = parts[0].endsWith("%") ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
  const C = parseFloat(parts[1]);
  const H = parseFloat(parts[2]);
  if ([L, C, H].some((n) => Number.isNaN(n))) return null;

  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);

  // OKLab → LMS → linear sRGB (Björn Ottosson's matrices).
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const lr = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const toSrgb = (c: number): number => {
    const x = clamp01(c);
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return Math.round(clamp01(v) * 255);
  };
  return { r: toSrgb(lr), g: toSrgb(lg), b: toSrgb(lb) };
}

const NAMED: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  transparent: "#ffffff", // treat as its ground for contrast purposes
};

/** Parse any supported CSS colour string to sRGB, or null if unparseable. */
export function parseColor(input: string | null | undefined): RGB | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  const named = NAMED[s.toLowerCase()];
  if (named) return parseHex(named);
  if (s.startsWith("#")) return parseHex(s);
  if (/^oklch\(/i.test(s)) return parseOklch(s);
  if (/^rgba?\(/i.test(s)) return parseRgb(s);
  // bare hex without #
  if (/^[0-9a-fA-F]{3,8}$/.test(s)) return parseHex(s);
  return null;
}

function channelLum(c: number): number {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(rgb: RGB): number {
  return 0.2126 * channelLum(rgb.r) + 0.7152 * channelLum(rgb.g) + 0.0722 * channelLum(rgb.b);
}

/** WCAG 2.x contrast ratio (1..21), or null if either colour is unparseable. */
export function contrastRatio(fg: string, bg: string): number | null {
  const a = parseColor(fg);
  const b = parseColor(bg);
  if (!a || !b) return null;
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export type WcagLevel = "AAA" | "AA" | "AA Large" | "Fail";

/** WCAG level for a ratio at normal (default) or large text size. */
export function wcagLevel(ratio: number, large = false): WcagLevel {
  if (large) {
    if (ratio >= 4.5) return "AAA";
    if (ratio >= 3) return "AA";
    return "Fail";
  }
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

/** Does a normal-text pairing meet AA (4.5:1)? */
export function passesAA(ratio: number | null): boolean {
  return ratio != null && ratio >= 4.5;
}
