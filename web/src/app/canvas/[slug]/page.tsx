import Link from "next/link";
import { notFound } from "next/navigation";
import { getBoard } from "@/lib/board";
import { VaultNotConfiguredError } from "@/lib/vault";
import { VaultError } from "@/components/vault-error";
import type { BoardModel } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Slice 1 (substrate): a debug dump proving the whole board model parses from
 * the vault — every stage with its marker state, the consolidated decision
 * stream (malformed files skipped), and the assumption graph. Slice 2 replaces
 * this with the readable board.
 */
export default async function CanvasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let board: BoardModel | null;
  try {
    board = await getBoard(slug);
  } catch (err) {
    if (err instanceof VaultNotConfiguredError) return <VaultError message={err.message} />;
    throw err;
  }
  if (!board) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-8 py-12" data-testid="canvas-debug">
      <Link href="/" className="eyebrow text-accent">
        ← Projects
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink">
        {board.project.name}
      </h1>
      <p className="mt-1 text-[0.8125rem] text-ink-faint">
        Substrate debug dump — the readable board lands in slice 2.
      </p>

      <Section title="Header">
        <dl className="text-[0.9375rem] text-ink-muted">
          <Row k="Current stage" v={board.header.currentStage ?? "—"} />
          <Row k="Next step" v={board.header.nextStep ?? "—"} />
          <Row k="Overrides" v={board.header.overrides.join(" · ") || "none"} />
        </dl>
      </Section>

      <Section title={`Spine — ${board.stages.length} stages`}>
        <ul data-testid="spine-dump" className="space-y-1 text-[0.9375rem]">
          {board.stages.map((s) => (
            <li key={s.stage} className="flex items-baseline gap-3">
              <span className="w-36 font-mono text-[0.8125rem] text-ink">{s.stage}</span>
              <span className="w-24 text-ink-muted">{s.markerState}</span>
              <span className="text-ink-faint">
                {s.isDecisionStage
                  ? `decisions: ${s.decisionSlice.join(", ") || "none"}`
                  : `${s.cards.length} card(s)`}
                {s.framing ? " · framing present" : ""}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Decision stream — ${board.decisionStream.length} entries`}>
        <ul data-testid="stream-dump" className="space-y-2 text-[0.9375rem]">
          {board.decisionStream.map((d) => (
            <li key={d.id} className="text-ink-muted">
              <span className="font-mono text-[0.8125rem] text-ink">{d.id}</span> — {d.title}{" "}
              <span className="text-ink-faint">
                [{d.status ?? "?"}
                {d.authoredBy ? `, by ${d.authoredBy}` : ""}
                {d.restsOnId ? `, rests on ${d.restsOnId}` : ""}
                {d.supersededBy ? `, superseded` : ""}
                {d.inTheirWords ? `, quoted` : ""}]
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Assumptions — ${board.assumptions.length}`}>
        <ul data-testid="assumptions-dump" className="space-y-1 text-[0.9375rem]">
          {board.assumptions.map((a) => (
            <li key={a.id} className="text-ink-muted">
              <span className="font-mono text-[0.8125rem] text-ink">{a.id}</span> — {a.title}{" "}
              <span className="text-ink-faint">
                [{a.state}
                {a.riskiest ? ", riskiest" : ""}
                {a.accepted ? ", accepted" : ""}
                {a.dependents.length ? `, blast: ${a.dependents.join("/")}` : ""}]
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="eyebrow mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3 py-0.5">
      <dt className="w-32 shrink-0 text-ink-faint">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
