/**
 * DOM helpers that reach INTO a same-origin prototype frame: the injected hover
 * overlay and numbered pins (§10), the stable-selector capture and text/container
 * classification, live tweak application (§11), CSS-var token overrides (§13),
 * and instance scanning (§7). Everything is injected into the frame's own
 * document so it pans and zooms with the frame as one unit — no parent-side
 * coordinate math under transform.
 */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const OVERLAY_ID = "__ds_hover_overlay";
const PIN_LAYER_ID = "__ds_pin_layer";

/** A box in the frame's document coordinate space (viewport rect + scroll). */
export function elementBox(el: Element, win: Window): Box {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + win.scrollX,
    y: r.top + win.scrollY,
    w: r.width,
    h: r.height,
  };
}

export function ensureOverlay(doc: Document): HTMLElement {
  let el = doc.getElementById(OVERLAY_ID) as HTMLElement | null;
  if (!el) {
    el = doc.createElement("div");
    el.id = OVERLAY_ID;
    el.setAttribute("data-ds-overlay", "");
    el.style.cssText = [
      "position:absolute",
      "z-index:2147483646",
      "pointer-events:none",
      "border:2px solid #3b5bdb",
      "background:rgba(59,91,219,0.10)",
      "border-radius:3px",
      "transition:all 40ms linear",
      "display:none",
    ].join(";");
    doc.body.appendChild(el);
  }
  return el;
}

export function moveOverlay(doc: Document, win: Window, el: Element): void {
  const o = ensureOverlay(doc);
  const b = elementBox(el, win);
  o.style.display = "block";
  o.style.left = b.x + "px";
  o.style.top = b.y + "px";
  o.style.width = b.w + "px";
  o.style.height = b.h + "px";
}

export function hideOverlay(doc: Document): void {
  const o = doc.getElementById(OVERLAY_ID) as HTMLElement | null;
  if (o) o.style.display = "none";
}

export function removeInjected(doc: Document): void {
  doc.getElementById(OVERLAY_ID)?.remove();
  doc.getElementById(PIN_LAYER_ID)?.remove();
}

/** A stable-ish CSS selector: prefer test-id/id, else tag + nth-of-type, ≤6 deep. */
export function buildSelector(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  let depth = 0;
  while (node && node.nodeType === 1 && depth < 6) {
    const testid = node.getAttribute("data-testid") || node.getAttribute("data-test-id");
    if (testid) {
      parts.unshift(`[data-testid="${testid}"]`);
      break;
    }
    if (node.id) {
      parts.unshift(`#${cssEscape(node.id)}`);
      break;
    }
    const dc = node.getAttribute("data-component");
    let sel = node.tagName.toLowerCase();
    if (dc) sel += `[data-component="${dc}"]`;
    const parent: Element | null = node.parentElement;
    if (parent) {
      const current = node;
      const sameTag = Array.from(parent.children).filter((c) => c.tagName === current.tagName);
      if (sameTag.length > 1) {
        const idx = sameTag.indexOf(current) + 1;
        sel += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(sel);
    node = parent;
    depth++;
  }
  return parts.join(" > ");
}

function cssEscape(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

/** Trimmed visible text of an element, capped for pin labels/records (≤60 chars). */
export function visibleText(el: Element): string {
  const t = (el.textContent || "").replace(/\s+/g, " ").trim();
  return t.length > 60 ? t.slice(0, 57) + "…" : t;
}

/**
 * text vs container: a leaf-ish element that carries its own text (button, link,
 * heading, span, label, a card with only text) is a text target → text tokens;
 * a structural element with element children is a container → surface tokens.
 */
export function classify(el: Element): "text" | "container" {
  // A painted element is a surface first: a filled button/badge/card is tweaked
  // by its background token, not its text token — regardless of carrying text.
  // (§10 scoped color: containers see surface tokens.)
  const win = el.ownerDocument.defaultView;
  if (win) {
    const bg = win.getComputedStyle(el).backgroundColor;
    if (bg && bg !== "transparent" && !/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)$/.test(bg)) {
      return "container";
    }
  }
  const tag = el.tagName.toLowerCase();
  if (/^(p|span|a|button|h1|h2|h3|h4|h5|h6|label|li|strong|em|small|code)$/.test(tag)) return "text";
  const elementChildren = Array.from(el.children).filter((c) => c.nodeType === 1);
  const ownText = Array.from(el.childNodes).some(
    (n) => n.nodeType === 3 && (n.textContent || "").trim().length > 0,
  );
  if (elementChildren.length === 0 && ownText) return "text";
  return "container";
}

/** The nearest ancestor-or-self [data-component] whose value is a known component. */
export function componentOf(el: Element, names: string[]): string | null {
  let node: Element | null = el;
  while (node && node.nodeType === 1) {
    const dc = node.getAttribute("data-component");
    if (dc && names.includes(dc)) return dc;
    node = node.parentElement;
  }
  return null;
}

// ── Pins ─────────────────────────────────────────────────────────────────────

function ensurePinLayer(doc: Document): HTMLElement {
  let layer = doc.getElementById(PIN_LAYER_ID) as HTMLElement | null;
  if (!layer) {
    layer = doc.createElement("div");
    layer.id = PIN_LAYER_ID;
    layer.style.cssText = "position:absolute;left:0;top:0;z-index:2147483645;pointer-events:none";
    doc.body.appendChild(layer);
  }
  return layer;
}

export function renderPins(doc: Document, pins: { n: number; box: Box }[]): void {
  const layer = ensurePinLayer(doc);
  layer.innerHTML = "";
  for (const p of pins) {
    const pin = doc.createElement("div");
    pin.setAttribute("data-testid", "pin");
    pin.setAttribute("data-pin", String(p.n));
    pin.textContent = String(p.n);
    pin.style.cssText = [
      "position:absolute",
      `left:${p.box.x + p.box.w - 12}px`,
      `top:${p.box.y - 12}px`,
      "min-width:22px",
      "height:22px",
      "padding:0 4px",
      "border-radius:9999px",
      "background:#3b5bdb",
      "color:#fff",
      "font:600 12px/22px system-ui,sans-serif",
      "text-align:center",
      "box-shadow:0 1px 3px rgba(0,0,0,0.3)",
    ].join(";");
    layer.appendChild(pin);
  }
}

// ── Live application (§11 tweaks, §13 token overrides) ───────────────────────

/** A no-op undo. */
const NOOP = () => {};

/** Apply CSS props inline to elements, returning an undo that restores them. */
export function applyToElements(els: Element[], props: Record<string, string>): () => void {
  const restores: (() => void)[] = [];
  for (const el of els) {
    const style = (el as HTMLElement).style;
    for (const [k, v] of Object.entries(props)) {
      const prop = kebab(k);
      const prev = style.getPropertyValue(prop);
      const prevPri = style.getPropertyPriority(prop);
      restores.push(() =>
        prev ? style.setProperty(prop, prev, prevPri) : style.removeProperty(prop),
      );
      style.setProperty(prop, v, "important");
    }
  }
  return () => restores.forEach((r) => r());
}

/** Apply CSS props to every element matching a selector; returns an undo. */
export function applyToSelector(doc: Document, selector: string, props: Record<string, string>): () => void {
  let els: Element[] = [];
  try {
    els = Array.from(doc.querySelectorAll(selector));
  } catch {
    return NOOP;
  }
  return applyToElements(els, props);
}

/** Apply CSS props to every instance of a component (component-scope preview). */
export function applyToComponent(doc: Document, component: string, props: Record<string, string>): () => void {
  return applyToSelector(doc, `[data-component="${component}"]`, props);
}

function kebab(s: string): string {
  return s.startsWith("--") ? s : s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

/**
 * Whether a value is a renderable CSS value for the positions a design token
 * feeds (color / length / radius / typography). A custom property accepts ANY
 * token stream at set-time — the browser only rejects it later, when `var()`
 * resolves inside a real declaration, at which point the whole declaration
 * becomes invalid-at-computed-value-time and the styled element loses its
 * value. So a hand-typed malformed token would silently break the frame. We
 * validate up front and refuse to inject anything that isn't a real CSS value.
 */
export function isRenderableCssValue(value: string): boolean {
  if (typeof value !== "string" || value.trim() === "") return false;
  if (typeof CSS === "undefined" || !CSS.supports) return true; // SSR / old env — don't block
  return (
    CSS.supports("color", value) ||
    CSS.supports("width", value) ||
    CSS.supports("border-radius", value) ||
    CSS.supports("font-size", value) ||
    CSS.supports("font-weight", value) ||
    CSS.supports("line-height", value) ||
    CSS.supports("font-family", value)
  );
}

/** Set a token CSS variable on the frame's :root (token-everywhere); returns an undo. */
export function setVar(doc: Document, cssVar: string, value: string): () => void {
  const style = doc.documentElement.style;
  const prev = style.getPropertyValue(cssVar);
  // Guard (§11/§13): never inject broken CSS. A malformed hand-typed value falls
  // back to the prototype's own stylesheet default (remove the inline override)
  // instead of poisoning the var and blanking every element that reads it.
  if (isRenderableCssValue(value)) style.setProperty(cssVar, value);
  else style.removeProperty(cssVar);
  return () => (prev ? style.setProperty(cssVar, prev) : style.removeProperty(cssVar));
}
export function clearVar(doc: Document, cssVar: string): void {
  doc.documentElement.style.removeProperty(cssVar);
}

/** Shared device-frame scale so parent-side popover math matches the frames (§9). */
export const FRAME_SCALE = 0.5;

/** Briefly outline every instance of a component in a frame (click-to-flash §7). */
export function flashComponent(doc: Document, component: string): number {
  const els = Array.from(doc.querySelectorAll(`[data-component="${component}"]`));
  for (const el of els) {
    const h = el as HTMLElement;
    const prevOutline = h.style.outline;
    const prevOffset = h.style.outlineOffset;
    h.style.outline = "3px solid #3b5bdb";
    h.style.outlineOffset = "2px";
    setTimeout(() => {
      h.style.outline = prevOutline;
      h.style.outlineOffset = prevOffset;
    }, 1400);
  }
  return els.length;
}

// ── Instance scanning (§7) ───────────────────────────────────────────────────

export interface FrameScan {
  components: { base: string; count: number }[];
  /** Recurring class signatures with NO matching component (uncodified candidates). */
  signatures: { sig: string; count: number; sample: string }[];
}

export function scanFrame(doc: Document, componentNames: string[]): FrameScan {
  const components = componentNames.map((base) => ({
    base,
    count: doc.querySelectorAll(`[data-component="${base}"]`).length,
  }));

  const sigCounts = new Map<string, { count: number; sample: string }>();
  const all = doc.body ? Array.from(doc.body.querySelectorAll("*")) : [];
  for (const el of all) {
    if (el.closest("[data-component]")) continue; // inside a codified component
    if ((el as HTMLElement).id && (el as HTMLElement).id.startsWith("__ds")) continue;
    const classes = Array.from(el.classList).sort();
    if (classes.length === 0) continue;
    const sig = el.tagName.toLowerCase() + "." + classes.join(".");
    const prior = sigCounts.get(sig);
    if (prior) prior.count += 1;
    else sigCounts.set(sig, { count: 1, sample: visibleText(el) });
  }
  const signatures = Array.from(sigCounts.entries())
    .map(([sig, v]) => ({ sig, count: v.count, sample: v.sample }))
    .filter((s) => s.count >= 1);

  return { components, signatures };
}
