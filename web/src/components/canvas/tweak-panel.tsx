"use client";

import type { DesignTokens } from "@/lib/types";
import { flattenScalars, typographyPresets, tokenToCssVar, resolveRefs } from "@/lib/tokens";
import type { Tweak } from "./session-context";

/**
 * The tweak panel (§11): every option is parsed live from the PROTOTYPE's
 * DESIGN.md — never this app's tokens, never invented values. Typography presets
 * apply as the full property bag; color is scoped by classification (text targets
 * → text tokens, containers → surface tokens); spacing comes from the real scale
 * (padding + a separate gap); layout is flex. Each choice appends a
 * human-readable spec line carried verbatim into the export. This is the DESIGN.md
 * contract enforced in a UI: a wanted value that isn't a token can't be offered —
 * which is exactly the signal DESIGN.md must grow via a recorded decision.
 */

let seq = 0;
function mkId(): string {
  return `tw-${Date.now()}-${seq++}`;
}

const TEXT_RE = /(text|ink|fg|foreground|muted|faint|body|heading|primary|danger|accent|link)/i;
const SURFACE_RE = /(bg|background|surface|paper|desk|ground|base|card)/i;

export function TweakPanel({
  tokens,
  classification,
  onAdd,
}: {
  tokens: DesignTokens;
  classification: "text" | "container";
  onAdd: (t: Tweak) => void;
}) {
  const scalars = flattenScalars(tokens);
  const colors = scalars.filter((s) => s.group === "colors");
  const spacing = scalars.filter((s) => s.group === "spacing");
  const presets = typographyPresets(tokens);

  const colorChoices = colors.filter((c) =>
    classification === "text" ? TEXT_RE.test(c.key) : SURFACE_RE.test(c.key),
  );
  const colorProp = classification === "text" ? "color" : "backgroundColor";

  return (
    <div className="space-y-3" data-testid="tweak-panel">
      <p className="eyebrow">Tweak — only DESIGN.md tokens</p>

      {presets.length ? (
        <Field label="Typography">
          <select
            className="tw-select"
            data-testid="tweak-typography"
            defaultValue=""
            onChange={(e) => {
              const p = presets.find((x) => x.key === e.target.value);
              if (!p) return;
              const props = presetToCss(p.props);
              onAdd({
                id: mkId(),
                kind: "typography",
                label: `Type · ${p.key}`,
                tokenPath: `typography.${p.key}`,
                props,
                spec: `Set typography to ${p.key} (${Object.entries(p.props)
                  .map(([k, v]) => `${k} ${v}`)
                  .join(", ")})`,
              });
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              preset…
            </option>
            {presets.map((p) => (
              <option key={p.key} value={p.key}>
                {p.key}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {colorChoices.length ? (
        <Field label={classification === "text" ? "Text color" : "Surface color"}>
          <select
            className="tw-select"
            data-testid="tweak-color"
            defaultValue=""
            onChange={(e) => {
              const c = colorChoices.find((x) => x.key === e.target.value);
              if (!c) return;
              onAdd({
                id: mkId(),
                kind: "color",
                label: `${colorProp} · ${c.key}`,
                tokenPath: c.path,
                props: { [colorProp]: c.value },
                spec: `Set ${colorProp} to colors.${c.key} (${c.value})`,
              });
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              color…
            </option>
            {colorChoices.map((c) => (
              <option key={c.key} value={c.key}>
                {c.key} ({c.value})
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {spacing.length ? (
        <div className="flex gap-2">
          <Field label="Padding">
            <select
              className="tw-select"
              data-testid="tweak-padding"
              defaultValue=""
              onChange={(e) => {
                const s = spacing.find((x) => x.key === e.target.value);
                if (!s) return;
                onAdd({
                  id: mkId(),
                  kind: "spacing",
                  label: `padding · ${s.key}`,
                  tokenPath: s.path,
                  props: { padding: s.value },
                  spec: `Set padding to spacing.${s.key} (${s.value})`,
                });
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                pad…
              </option>
              {spacing.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.key} ({s.value})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Gap">
            <select
              className="tw-select"
              data-testid="tweak-gap"
              defaultValue=""
              onChange={(e) => {
                const s = spacing.find((x) => x.key === e.target.value);
                if (!s) return;
                onAdd({
                  id: mkId(),
                  kind: "gap",
                  label: `gap · ${s.key}`,
                  tokenPath: s.path,
                  props: { gap: s.value },
                  spec: `Set gap to spacing.${s.key} (${s.value})`,
                });
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                gap…
              </option>
              {spacing.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.key} ({s.value})
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : null}

      <Field label="Layout (flex)">
        <div className="flex flex-wrap gap-1.5">
          <LayoutSelect
            testid="tweak-direction"
            prop="flexDirection"
            options={["row", "column"]}
            onAdd={onAdd}
          />
          <LayoutSelect
            testid="tweak-justify"
            prop="justifyContent"
            options={["flex-start", "center", "space-between", "flex-end"]}
            onAdd={onAdd}
          />
          <LayoutSelect
            testid="tweak-align"
            prop="alignItems"
            options={["stretch", "center", "flex-start", "flex-end"]}
            onAdd={onAdd}
          />
        </div>
      </Field>

      <p className="text-[0.6875rem] leading-relaxed text-ink-faint">
        A value you want that isn&rsquo;t here is the signal DESIGN.md must grow — via a recorded
        decision, not a loophole.
      </p>
    </div>
  );
}

function LayoutSelect({
  testid,
  prop,
  options,
  onAdd,
}: {
  testid: string;
  prop: string;
  options: string[];
  onAdd: (t: Tweak) => void;
}) {
  return (
    <select
      className="tw-select"
      data-testid={testid}
      defaultValue=""
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return;
        onAdd({
          id: mkId(),
          kind: "layout",
          label: `${prop} · ${v}`,
          tokenPath: null,
          props: { [prop]: v, display: "flex" },
          spec: `Set ${prop} to ${v} (display flex)`,
        });
        e.target.value = "";
      }}
    >
      <option value="" disabled>
        {prop.replace("flex", "").replace(/([A-Z])/g, " $1").trim().toLowerCase() || prop}…
      </option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

/** Map a typography preset's property bag to CSS props. */
function presetToCss(props: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  if (props.size) out.fontSize = props.size;
  if (props.weight) out.fontWeight = String(props.weight);
  if (props.leading) out.lineHeight = props.leading;
  if (props.tracking) out.letterSpacing = props.tracking;
  if (props.style) out.fontStyle = props.style;
  if (props.family) out.fontFamily = props.family;
  return out;
}

/** The CSS variable a color/spacing tweak targets for token-everywhere scope. */
export function tweakCssVar(t: Tweak): string | null {
  if (!t.tokenPath) return null;
  return tokenToCssVar(t.tokenPath);
}

export { resolveRefs };
