import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DESIGN_DIR, getVaultRoot, VaultNotConfiguredError } from "@/lib/vault";
import { HIDDEN_SLUGS } from "@/lib/hidden-projects";
import { autorunEnabled, startDebriefDraft } from "@/lib/debrief-runner";

export const dynamic = "force-dynamic";

/** "Acme — New Onboarding" → "acme-new-onboarding". */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Create a project from the dashboard: the one place the web app writes the
 * vault. It scaffolds the minimum a project needs to appear and open — a
 * `00 Dashboard.md` (the design-project record) and `01 Brief & Problem.md`
 * (the first brief) — matching CONVENTIONS.md's contract. Everything after is
 * still the skills' job (research, structure, …); this is just the front door.
 */
export async function POST(req: Request) {
  let body: { name?: unknown; brief?: unknown; client?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const brief = typeof body.brief === "string" ? body.brief.trim() : "";
  const client = typeof body.client === "string" ? body.client.trim() : "";

  if (!name) return NextResponse.json({ error: "A project name is required." }, { status: 400 });
  if (!brief) return NextResponse.json({ error: "A first brief is required." }, { status: 400 });

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "The name needs at least one letter or number." }, { status: 400 });
  }
  if (HIDDEN_SLUGS.has(slug)) {
    return NextResponse.json({ error: `"${slug}" is a reserved name.` }, { status: 409 });
  }

  let root: string;
  try {
    root = await getVaultRoot();
  } catch (err) {
    if (err instanceof VaultNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }

  const dir = path.join(root, DESIGN_DIR, slug);
  try {
    await fs.access(dir);
    return NextResponse.json({ error: `A project "${slug}" already exists.` }, { status: 409 });
  } catch {
    /* doesn't exist — good, proceed */
  }

  const today = new Date().toISOString().slice(0, 10);
  const dashboard = `---
type: design-project
status: active
stage: debrief
client: ${client}
route:
started: ${today}
prototype_repo:
---

# ${name}

## Recommended next step

Run \`design-studio-research\` to sweep the problem space, then pressure-test the riskiest
assumption before it locks in.
`;
  const briefDoc = `---
type: design-brief
stage: debrief
date: ${today}
tags: [brief]
---

# Brief & Problem

## Original brief

${brief}
`;

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "00 Dashboard.md"), dashboard, "utf8");
    await fs.writeFile(path.join(dir, "01 Brief & Problem.md"), briefDoc, "utf8");
  } catch (err) {
    return NextResponse.json(
      { error: `Could not create the project: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  // Opt-in: with the project seeded, fire `design-studio-debrief` round 1 as a
  // headless background pass to draft the framing + clarification agenda. Never
  // blocks — the project already exists whether or not the draft succeeds.
  let drafting = false;
  if (autorunEnabled()) {
    startDebriefDraft({ slug, name, brief, client, vaultRoot: root, projectDir: dir });
    drafting = true;
  }

  return NextResponse.json({ slug, drafting }, { status: 201 });
}
