import { getProject } from "@/lib/vault";
import { resolvePrototypeConfig } from "@/lib/prototype-config";
import { startPrototype, stopPrototype, getStatus } from "@/lib/prototype-runner";

export const dynamic = "force-dynamic";

/**
 * The Render control's backend (§9): start / stop / status for a project's dev
 * server. This is the ONE place the security model is enforced end-to-end —
 * mirror the studio's own decision "guardrails in code, not prompts":
 *
 *   - The browser sends only a SLUG. The command is looked up server-side from
 *     the local config file (resolvePrototypeConfig → cfg.run), never from the
 *     request body. A slug with no configured `run` → 400, nothing spawns.
 *   - DEV-ONLY by default. This spawns processes, so it must never be reachable
 *     on a deployed instance: in production it 404s unless DESIGN_STUDIO_ALLOW_RUN=1
 *     explicitly opts in. Rationale: a deployed canvas has no business starting
 *     shell processes on its host, and there's no per-user auth here — the opt-in
 *     is a deliberate, auditable escape hatch for a trusted local/self-hosted box.
 */

function runAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DESIGN_STUDIO_ALLOW_RUN === "1";
}

const disabled = () =>
  new Response("Prototype run API is disabled on this instance.", { status: 404 });

const noStore = { "cache-control": "no-store" } as const;

async function resolveRun(slug: string) {
  const project = await getProject(slug);
  if (!project) return null;
  const cfg = await resolvePrototypeConfig(slug, project.project.prototypeRepo);
  return cfg.run;
}

export async function GET(req: Request): Promise<Response> {
  if (!runAllowed()) return disabled();
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return Response.json({ error: "slug is required" }, { status: 400 });
  return Response.json(getStatus(slug), { headers: noStore });
}

export async function POST(req: Request): Promise<Response> {
  if (!runAllowed()) return disabled();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const slug = typeof (body as { slug?: unknown })?.slug === "string" ? (body as { slug: string }).slug : null;
  const action = (body as { action?: unknown })?.action === "stop" ? "stop" : "start";
  if (!slug) return Response.json({ error: "slug is required" }, { status: 400 });

  if (action === "stop") {
    return Response.json(stopPrototype(slug), { headers: noStore });
  }

  // START: the command is resolved from server config, never the request.
  const run = await resolveRun(slug);
  if (!run) {
    return Response.json({ error: `No run command configured for "${slug}".` }, { status: 400 });
  }
  const status = await startPrototype(slug, run);
  return Response.json(status, { headers: noStore });
}
