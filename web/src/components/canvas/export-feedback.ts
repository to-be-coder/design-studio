import type { Annotation } from "./session-context";

/**
 * "Copy feedback" export (§12), shaped as a design-studio-validate loop-back.
 * The preamble is addressed to a coding agent and carries, non-optional, the
 * ROUTING PROTOCOL verbatim in spirit: fix the smallest reusable unit that owns
 * the change (token → component → instance), and treat the reviewer's scope as a
 * starting claim the agent verifies, not a verdict. The close situates it in the
 * pipeline so findings that invalidate a decision become superseding entries.
 */

const SCOPE_CLAIM: Record<Annotation["scope"], string> = {
  token: "the underlying token, everywhere it is used",
  component: "every instance of the component",
  instance: "this instance only",
};

export function buildPrototypeExport(project: string, annotations: Annotation[]): string {
  const lines: string[] = [];
  lines.push(`# Validation feedback — ${project}`);
  lines.push("");
  lines.push(
    "You are a coding agent applying reviewer feedback to the prototype repo. For each entry:",
  );
  lines.push(
    "- Locate the element by its selector / quoted text / position; resolve any \"@N\" references first.",
  );
  lines.push(
    "- Apply the tweak lines exactly, using ONLY the prototype's existing DESIGN.md tokens — never a hand-rolled value. If a needed value is not a token, STOP and flag it as a DESIGN.md growth decision instead of improvising.",
  );
  lines.push("");
  lines.push("## Routing protocol (do this before touching code, every entry)");
  lines.push(
    "Ask: what is the smallest unit that is reusable here? — and update THAT unit first. Classify the change:",
  );
  lines.push(
    "1. **Token** — the value is wrong everywhere it is used. Fix it in DESIGN.md (additive edit, or a reshaping supersede per the design-system rules). Do not restyle components to compensate for a wrong token.",
  );
  lines.push(
    "2. **Component** — every instance of this component should change. Fix the component definition (its code, and its `components` entry in DESIGN.md if the changed property is encoded there). Do not patch instances one by one; ten instance patches are a forked component.",
  );
  lines.push(
    "3. **Instance** — only this occurrence, for a contextual reason the reviewer stated. Only then is a selector-addressed change correct.",
  );
  lines.push(
    "The reviewer's scope below is the starting CLAIM, not the verdict: verify it against the codebase (is this element really that component? does the change actually generalize?). On disagreement, flag the conflict in your response instead of silently complying. Never patch an instance for a problem the component owns; never fork a component for a problem a token owns.",
  );
  lines.push("");
  lines.push("## Findings");

  if (annotations.length === 0) {
    lines.push("");
    lines.push("_No annotations yet._");
  }

  annotations.forEach((a, i) => {
    lines.push("");
    lines.push(`### ${i + 1}. ${a.granularity === "page" ? "(full page)" : a.selector ?? "(element)"}`);
    lines.push(`- Frame / route: ${a.device} · ${a.route === "" ? "/" : "/" + a.route.replace(/\.html?$/i, "")}`);
    lines.push(`- Device: ${a.device}`);
    if (a.box) {
      lines.push(
        `- Box: ${Math.round(a.box.w)}×${Math.round(a.box.h)} at (${Math.round(a.box.x)}, ${Math.round(a.box.y)})`,
      );
    }
    if (a.granularity === "element") {
      lines.push(`- Element: ${a.classification} · ${a.selector ?? "(no selector)"}`);
      if (a.text) lines.push(`- Text: "${a.text}"`);
    }
    // Scope — the reviewer's starting claim.
    if (a.component) {
      lines.push(
        `- Scope: **${SCOPE_CLAIM[a.scope]}** — this is a \`${a.component}\` (${a.instanceCount} instance${a.instanceCount === 1 ? "" : "s"} across ${a.routeCount} route${a.routeCount === 1 ? "" : "s"}).`,
      );
    } else {
      lines.push(`- Scope: **${SCOPE_CLAIM[a.scope]}** (no matched component).`);
    }
    if (a.tweaks.length) {
      lines.push(`- Tweaks:`);
      for (const t of a.tweaks) lines.push(`  - ${t.spec}`);
    }
    if (a.note.trim()) lines.push(`- Note: ${a.note.trim()}`);
  });

  lines.push("");
  lines.push("---");
  lines.push(
    `These are validation findings for ${project}. Apply via the prototype repo; record findings that invalidate a decision as superseding entries per design-studio-validate.`,
  );
  return lines.join("\n");
}

// ── Design-system board export — a DESIGN.md change proposal (§6), distinct ──

export interface TokenProposal {
  id: number;
  tokenPath: string;
  current: string;
  proposed: string;
  affectedPairs: string[];
  reshaping: boolean;
  note: string;
}

export function buildDesignProposalExport(project: string, proposals: TokenProposal[]): string {
  const lines: string[] = [];
  lines.push(`# DESIGN.md change proposal — ${project}`);
  lines.push("");
  lines.push(
    "You are applying proposed changes to the project's DESIGN.md. Each entry states a token path, its current and proposed value, the contrast pairs it affects, and — critically — whether it is ADDITIVE or RESHAPING. Route each accordingly:",
  );
  lines.push(
    "- **Additive** — normal growth: edit the token, re-lint (structure + WCAG), and sign off. No decision entry required.",
  );
  lines.push(
    "- **Reshaping** — this supersedes the committed visual language: record a decision entry (ADR semantics — supersedes the prior value) before editing, because downstream work rests on the old value.",
  );
  lines.push("");
  lines.push("## Proposals");

  if (proposals.length === 0) {
    lines.push("");
    lines.push("_No proposals yet._");
  }

  proposals.forEach((p, i) => {
    lines.push("");
    lines.push(`### ${i + 1}. \`${p.tokenPath}\` — ${p.reshaping ? "RESHAPING" : "ADDITIVE"}`);
    lines.push(`- Current: ${p.current}`);
    lines.push(`- Proposed: ${p.proposed}`);
    if (p.affectedPairs.length) lines.push(`- Affected contrast pairs: ${p.affectedPairs.join("; ")}`);
    if (p.note.trim()) lines.push(`- Note: ${p.note.trim()}`);
  });

  lines.push("");
  lines.push("---");
  lines.push(
    `These are design-system findings for ${project}. Apply to DESIGN.md; a reshaping change is a superseding decision, an additive change is growth — do not conflate them.`,
  );
  return lines.join("\n");
}

/** Copy to clipboard with a boolean success signal (feedback handled by caller). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
