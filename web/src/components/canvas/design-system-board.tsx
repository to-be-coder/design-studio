"use client";

import type { DesignSystemModel, ColorPairing } from "@/lib/design-system";
import type { PrototypeInfo } from "@/lib/types";

/**
 * The design-system board (§6): the project's DESIGN.md rendered as living
 * specimens generated from the tokens themselves. Color pairings show their
 * computed WCAG ratio inline (the lint gate made visible; a failing pair is
 * flagged in the §1 idiom — a designed mark + word, never a bare red dot),
 * the type scale rides realistic content, components render every state variant,
 * and candidate/rejected boards from _assets/boards/ sit alongside with the
 * chosen one marked.
 *
 * NOTE: the SPECIMENS legitimately render the prototype's own token values
 * inline (that is the specimen's whole purpose — to show the real colors/sizes).
 * The app chrome around them still derives entirely from web/DESIGN.md.
 */
export function DesignSystemBoard({
  model,
  prototype,
  id,
}: {
  model: DesignSystemModel;
  prototype: PrototypeInfo;
  id: string;
}) {
  if (!model.hasTokens) {
    return (
      <article id={id} className="card-sheet w-[34rem] max-w-[88vw] px-8 py-6" data-card-kind="design-system">
        <p className="eyebrow mb-2">Design system</p>
        <p className="text-[0.9375rem] italic text-ink-faint">
          No DESIGN.md tokens found for this project yet. Running{" "}
          <span className="font-mono">design-studio-design-system</span> writes the visual language
          here as living specimens.
        </p>
      </article>
    );
  }

  return (
    <article
      id={id}
      className="card-sheet w-[60rem] max-w-[94vw] px-8 py-7"
      data-card-kind="design-system"
      data-testid="design-system-board"
    >
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Design system · living specimens</p>
          <p className="text-[0.8125rem] text-ink-faint">
            Generated from the tokens — never hand-drawn. Contrast is computed inline.
          </p>
        </div>
        <HomeLabel prototype={prototype} />
      </header>

      <ColorSection pairings={model.colorPairings} swatches={model.colors} />
      <TypeSection typography={model.typography} />
      <ScaleSection title="Spacing" tokens={model.spacing} kind="space" />
      <ScaleSection title="Radii" tokens={model.rounded} kind="radius" />
      <ComponentsSection components={model.components} />
      {model.dosDonts.length ? <DosDontsSection items={model.dosDonts} /> : null}
      {model.boards.length ? <BoardsSection boards={model.boards} /> : null}
    </article>
  );
}

function HomeLabel({ prototype }: { prototype: PrototypeInfo }) {
  const where =
    prototype.tokenHome === "prototype"
      ? "in the prototype repo"
      : prototype.tokenHome === "vault"
        ? "in the vault"
        : "not found";
  return (
    <span
      className="rounded-pill border border-rule px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-muted"
      title={prototype.tokenSource ?? undefined}
      data-testid="design-system-home"
    >
      DESIGN.md lives {where}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule py-6 first:border-t-0 first:pt-0">
      <h3 className="eyebrow mb-4 text-ink">{title}</h3>
      {children}
    </section>
  );
}

function ColorSection({ pairings, swatches }: { pairings: ColorPairing[]; swatches: { key: string; value: string }[] }) {
  return (
    <Section title="Color">
      <div className="mb-5 flex flex-wrap gap-2">
        {swatches.map((s) => (
          <span
            key={s.key}
            className="inline-flex items-center gap-1.5 rounded-inset border border-rule px-2 py-1 text-[0.75rem] text-ink-muted"
          >
            <span
              className="inline-block h-3.5 w-3.5 rounded-[3px] border border-rule"
              style={{ background: s.value }}
              aria-hidden
            />
            <span className="font-mono">{s.key}</span>
          </span>
        ))}
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="contrast-pairings">
        {pairings.map((p) => (
          <li
            key={`${p.fgKey}/${p.bgKey}`}
            data-testid="contrast-pair"
            data-passes={p.passes ? "true" : "false"}
            className="flex items-center justify-between gap-3 rounded-inset border border-rule px-3 py-2"
          >
            <span
              className="min-w-0 flex-1 truncate rounded-[4px] px-3 py-2 text-[0.875rem]"
              style={{ background: p.bg, color: p.fg }}
            >
              {p.role === "action" ? "Action" : p.role === "border" ? "Border" : "Aa"} · {p.label}
            </span>
            <ContrastBadge pairing={p} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Pass/fail in the §1 idiom: a filled (pass) / hollow (fail) mark + a word + the ratio. */
function ContrastBadge({ pairing }: { pairing: ColorPairing }) {
  const fail = !pairing.passes;
  const color = fail ? "var(--unverified)" : "var(--verified)";
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[0.75rem] font-semibold"
      data-testid={fail ? "contrast-fail" : "contrast-pass"}
      style={{ color }}
    >
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={fail ? { border: `1.5px solid ${color}` } : { background: color }}
      />
      <span className="tabular-nums" data-testid="contrast-ratio">
        {pairing.ratio == null ? "—" : `${pairing.ratio.toFixed(2)}:1`}
      </span>
      <span>{fail ? "Fail" : pairing.level}</span>
    </span>
  );
}

function TypeSection({ typography }: { typography: { key: string; props: Record<string, string> }[] }) {
  if (!typography.length) return null;
  const sample = "The quick brown fox jumps — 0123456789";
  return (
    <Section title="Typography">
      <ul className="space-y-4">
        {typography.map((t) => (
          <li key={t.key} className="flex flex-col gap-1" data-testid="type-preset">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[0.75rem] text-ink-faint">{t.key}</span>
              <span className="text-[0.75rem] text-ink-faint">
                {Object.entries(t.props)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")}
              </span>
            </div>
            <p
              className="text-ink"
              style={{
                fontSize: t.props.size,
                fontWeight: t.props.weight ? Number(t.props.weight) : undefined,
                lineHeight: t.props.leading,
                fontStyle: t.props.style,
                letterSpacing: t.props.tracking,
              }}
            >
              {sample}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ScaleSection({
  title,
  tokens,
  kind,
}: {
  title: string;
  tokens: { key: string; value: string }[];
  kind: "space" | "radius";
}) {
  if (!tokens.length) return null;
  return (
    <Section title={title}>
      <ul className="flex flex-wrap gap-4">
        {tokens.map((t) => (
          <li key={t.key} className="flex flex-col items-start gap-1.5">
            {kind === "space" ? (
              <span className="block h-4 rounded-[2px] bg-accent/70" style={{ width: t.value }} aria-hidden />
            ) : (
              <span
                className="block h-10 w-10 border-2 border-accent/70"
                style={{ borderRadius: t.value }}
                aria-hidden
              />
            )}
            <span className="font-mono text-[0.75rem] text-ink-muted">
              {t.key} · {t.value}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Render one component specimen from its token bag, in every state variant. */
export function ComponentSpecimen({
  base,
  variants,
}: {
  base: string;
  variants: { state: string; props: Record<string, string> }[];
}) {
  return (
    <div className="rounded-inset border border-rule p-4" data-testid="component-specimen" data-component-base={base}>
      <p className="mb-3 font-sans text-[0.875rem] font-semibold text-ink">{base}</p>
      <div className="flex flex-wrap items-center gap-4">
        {variants.map((v) => (
          <div key={v.state} className="flex flex-col items-center gap-1.5">
            <span
              className="inline-flex items-center justify-center text-[0.8125rem] font-semibold"
              style={{
                background: v.props.backgroundColor,
                color: v.props.textColor,
                borderRadius: v.props.rounded,
                padding: v.props.padding || "8px 14px",
                border: v.props.border ? `1px solid ${v.props.border}` : undefined,
                opacity: v.state === "disabled" ? 0.7 : 1,
              }}
            >
              {base}
            </span>
            <span className="font-mono text-[0.6875rem] text-ink-faint">{v.state}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComponentsSection({
  components,
}: {
  components: { base: string; variants: { state: string; props: Record<string, string> }[] }[];
}) {
  if (!components.length) return null;
  return (
    <Section title="Components">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {components.map((c) => (
          <ComponentSpecimen key={c.base} base={c.base} variants={c.variants} />
        ))}
      </div>
    </Section>
  );
}

function DosDontsSection({ items }: { items: { kind: "do" | "dont"; text: string }[] }) {
  const dos = items.filter((i) => i.kind === "do");
  const donts = items.filter((i) => i.kind === "dont");
  return (
    <Section title="Do's & Don'ts">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ul className="space-y-2" data-testid="dos">
          {dos.map((d, i) => (
            <li key={i} className="flex gap-2 text-[0.875rem] text-ink">
              <span className="mt-0.5 font-semibold text-verified" aria-hidden>
                +
              </span>
              <span>{stripLead(d.text)}</span>
            </li>
          ))}
        </ul>
        <ul className="space-y-2" data-testid="donts">
          {donts.map((d, i) => (
            <li key={i} className="flex gap-2 text-[0.875rem] text-ink">
              <span className="mt-0.5 font-semibold text-unverified" aria-hidden>
                −
              </span>
              <span>{stripLead(d.text)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function stripLead(t: string): string {
  return t.replace(/^\**\s*(Do|Don['’]t)\b\**\s*/i, "").trim();
}

function BoardsSection({ boards }: { boards: { file: string; label: string; html: string; chosen: boolean }[] }) {
  return (
    <Section title="Explored boards">
      <p className="mb-4 text-[0.8125rem] text-ink-faint">
        The choose-by-eye comparison, preserved. Rejected boards are the visible exploration.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="candidate-boards">
        {boards.map((b) => (
          <figure
            key={b.file}
            className="overflow-hidden rounded-inset border"
            data-testid="candidate-board"
            data-chosen={b.chosen ? "true" : "false"}
            style={{ borderColor: b.chosen ? "var(--accent)" : "var(--rule)" }}
          >
            <div className="relative h-40 overflow-hidden bg-paper">
              <iframe
                title={`Board: ${b.label}`}
                srcDoc={b.html}
                className="pointer-events-none absolute left-0 top-0 origin-top-left"
                style={{ width: "200%", height: "200%", transform: "scale(0.5)", border: 0 }}
              />
            </div>
            <figcaption className="flex items-center justify-between gap-2 border-t border-rule px-3 py-2">
              <span className="truncate text-[0.8125rem] capitalize text-ink">{b.label}</span>
              {b.chosen ? (
                <span className="rounded-pill bg-accent px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-accent-ink">
                  Chosen
                </span>
              ) : (
                <span className="text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">Rejected</span>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
