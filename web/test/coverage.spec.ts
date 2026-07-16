import { test, expect, type Page } from "@playwright/test";

/**
 * Systematic surface coverage (QA mandate 2): every route, every mode, both
 * themes, prefers-reduced-motion, two viewport sizes, the proxy + API routes
 * directly, and a second (mid-pipeline / empty) fixture project. Zero console /
 * page errors asserted everywhere; visibility assertions over status codes.
 */

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

// ── Second fixture: a mid-pipeline project renders empty/partial honestly ─────

test.describe("second fixture — mid-pipeline / empty states", () => {
  test("index lists both projects, each with its client", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Fixture Project/i })).toBeVisible();
    const minimal = page.getByRole("link", { name: /Fixture Minimal/i });
    await expect(minimal).toBeVisible();
    await expect(minimal.getByText("Minimal Fixtures Co.")).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("mid-pipeline canvas: pending stages, zero decisions, empty prototype — no crash", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    const res = await page.goto("/canvas/fixture-minimal");
    expect(res?.ok()).toBeTruthy();

    // The sidebar index still lists every stage (un-run ones are not hidden).
    // Build is the pipeline's last stage now (compile-spec became an on-demand
    // render utility off the spine — decision 0028), still un-run here since this
    // project is only in research. Run-state isn't spelled out in the index.
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar.getByRole("option", { name: "Research", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("option", { name: "Build", exact: true })).toBeVisible();

    // Build board: no prototype configured → the designed empty state, not a dead frame.
    await sidebar.getByRole("option", { name: "Build", exact: true }).click();
    await expect(page.getByTestId("prototype-empty")).toBeVisible();
    await expect(page.getByTestId("prototype-empty")).toContainText(/design-studio-build/i);

    // Decision stream: zero decisions leak in; it renders its empty state rather
    // than a broken card.
    await sidebar.getByRole("option", { name: "Decision stream", exact: true }).click();
    await expect(page.locator("#d-0008")).toHaveCount(0);

    // No DESIGN.md tokens → comment/tokens chrome is absent (degrades honestly).
    await expect(page.getByTestId("comment-toolbar")).toHaveCount(0);

    expect(errors, `console/page errors on minimal canvas:\n${errors.join("\n")}`).toEqual([]);
  });

  test("a table-format register renders its entries (not just H3 sections)", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-minimal");

    // The minimal fixture's register is a markdown TABLE, not H3 sections. It
    // must still parse into entries rather than reading "No register yet."
    await page.getByRole("option", { name: "Research", exact: true }).click();
    await page.getByTestId("sidebar").getByRole("option", { name: "Assumptions & risks" }).click();

    const r1 = page.locator("#assumption-R1");
    await expect(r1).toBeVisible();
    await expect(r1).toContainText(/mid-pipeline checkpoint/i); // the claim (col 2)
    await expect(r1).toContainText(/riskiest|load-bearing/i); // Load-bearing? = Yes → riskiest
    await expect(page.locator("#assumption-R2")).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── Understand loop: ledger, What's Worth Building, banner, badges, tolerance ─

test.describe("understand loop: ledger + What's Worth Building", () => {
  test("the ledger groups escalated/open/retired, chips + attempts, and the review pill rides the WWB row", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    const sidebar = page.getByTestId("sidebar");
    // PROJECT collapses to two rows; the agenda root doc is gone, and the count
    // pill moved to the WWB row (review = proposed + questions + parked = 5).
    await expect(sidebar.getByRole("option", { name: "What's worth building" })).toBeVisible();
    await expect(sidebar.getByRole("option", { name: "Knowns & unknowns", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("option", { name: /Questions for you/ })).toHaveCount(0);
    await expect(page.getByTestId("review-pill")).toHaveText("5");

    // Open the full ledger.
    await sidebar.getByRole("option", { name: "Knowns & unknowns", exact: true }).click();
    await expect(page.getByTestId("ledger-pane")).toBeVisible();

    // Escalated group holds exactly the two research-exhausted unknowns, first.
    const escalated = page.getByTestId("ledger-group-escalated");
    await expect(escalated).toBeVisible();
    await expect(escalated.locator('[data-ledger="L1"]')).toBeVisible();
    await expect(escalated.locator('[data-ledger="L3"]')).toBeVisible();

    // L1 reads as an escalated, load-bearing assumption with its ask + attempts +
    // a receipt link, and carries the "Needs you" state word (never colour alone).
    const l1 = page.locator("#ledger-L1");
    await expect(l1.getByTestId("ledger-ask")).toBeVisible();
    await expect(l1).toContainText(/Needs you/i);
    await expect(l1).toContainText(/2 attempts/);
    await expect(l1.getByText("Assumption", { exact: true })).toBeVisible();
    await expect(l1.getByTestId("receipt-link").first()).toBeVisible();

    // A verified known carries its grade; the retired entry recedes but stays.
    await expect(page.locator("#ledger-L5")).toContainText(/Verified/i);
    const retired = page.getByTestId("ledger-group-retired");
    await expect(retired.locator('[data-ledger="L6"]')).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("What's Worth Building v2: tabs default to Parked (ruling-first); tiers + ASSUMPTION + blocking reachable by tab", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // Default landing: the tabs open on Parked (ruling-first, since a 🔴 is parked).
    const wwb = page.getByTestId("wwb-pane");
    await expect(wwb).toBeVisible();
    await expect(page.getByTestId("wwb-review")).toBeVisible();
    await expect(page.getByTestId("wwb-tab-parked")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("wwb-ruling")).toBeVisible();

    // Proposed tab: the entries, the mechanical ASSUMPTION mark on the unevidenced
    // reason, and the receipt link chips (scoped to the tab, since inactive panels
    // stay mounted-but-hidden).
    await page.getByTestId("wwb-tab-proposed").click();
    const proposed = page.getByTestId("wwb-proposed");
    await expect(proposed).toBeVisible();
    await expect(proposed.getByTestId("wwb-assumption").first()).toBeVisible();
    await expect(proposed.getByTestId("receipt-link").first()).toBeVisible();

    // Rulings tab: the standing tiers.
    await page.getByTestId("wwb-tab-rulings").click();
    await expect(page.getByTestId("wwb-build-now")).toBeVisible();
    await expect(page.getByTestId("wwb-dont-build")).toBeVisible();

    // Context tab: the blocking band links into the ledger, and a receipt focuses it.
    await page.getByTestId("wwb-tab-context").click();
    const blockingReceipt = page.getByTestId("wwb-blocking").getByTestId("receipt-link").first();
    await expect(blockingReceipt).toBeVisible();
    await blockingReceipt.click();
    await expect(page.getByTestId("ledger-pane")).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("WWB after-states render from the fixture: Decided + her words, Backlog + evidence-moved, Won't build", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // Build now / Backlog / Don't build all live on the Rulings tab.
    await page.getByTestId("wwb-tab-rulings").click();

    // Build now: the Decided pill + the human's verbatim words as a pull-quote.
    const buildNow = page.getByTestId("wwb-build-now");
    await expect(buildNow.getByTestId("wwb-decided")).toBeVisible();
    await expect(buildNow.getByTestId("wwb-words")).toBeVisible();

    // Backlog: the receded outline pill + the evidence-moved chip (cited L7 is a
    // load-bearing known that is still unverified, so the ruling wants re-checking).
    const backlog = page.getByTestId("wwb-backlog");
    await expect(backlog.getByTestId("wwb-backlog-pill")).toBeVisible();
    await expect(backlog.getByTestId("wwb-evidence-moved")).toBeVisible();

    // Don't build: a human-ruled entry reads "Won't build".
    await expect(page.getByTestId("wwb-dont-build").getByTestId("wwb-wont-build")).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("a review terminal surfaces through the sidebar pill and the WWB band (no floating banner)", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // The review count rides the sidebar's WWB row; there is no floating banner.
    await expect(page.getByTestId("review-pill")).toContainText("5");
    await expect(page.getByTestId("loop-banner")).toHaveCount(0);

    // The band itself is the landing surface.
    await expect(page.getByTestId("wwb-review")).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("a live (researching) project shows the round counter + dry-streak meter, no banner", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-minimal");

    // Mid-loop: the sidebar footer carries the round + dry-streak pips.
    const footer = page.getByTestId("loop-footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(/round 2/);
    await expect(footer.getByTestId("dry-streak")).toBeVisible();

    // A 🔴 recorded mid-loop (the status line's `parked 1`) shows as a
    // word-carried sub-line (decision 0036: a park never stops the loop).
    await expect(footer.getByTestId("loop-parked")).toContainText(
      /1 decision parked for your review/i,
    );

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("a legacy parked-decision line still renders tolerantly: a ruling banner, no crash", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    // fixture-parked is pinned to the legacy `parked-decision` terminal (forma
    // shape). Nothing new emits it, but it must still parse to the parked
    // terminal and invite a ruling, without crashing.
    await page.goto("/canvas/fixture-parked");

    // The parked terminal parses and the sidebar summary invites a ruling.
    await expect(page.getByTestId("sidebar")).toContainText(/needs your ruling|Parked/i);

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("a legacy free-prose status line renders without crashing (tolerant fall-through)", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-runnable");

    // The legacy line parses to all-null: the canvas renders, no banner, no crash.
    await expect(page.getByTestId("sidebar")).toContainText("Fixture Runnable");
    await expect(page.getByTestId("loop-footer")).toHaveCount(0);

    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("home badges", () => {
  test("the index badges each project from its loop status", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");

    // Fixture Project converged needing humans → an accent "Review: 5" badge.
    const project = page.getByRole("link", { name: /Fixture Project/i });
    await expect(project.getByTestId("home-badge")).toContainText("Review: 5");

    // Fixture Minimal is mid-loop → a quiet "round 2" badge.
    const minimal = page.getByRole("link", { name: /Fixture Minimal/i });
    await expect(minimal.getByTestId("home-badge")).toContainText("round 2");

    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── WWB review band: gating, triage, ruling two-step, batch payload ───────────

test.describe("WWB review band", () => {
  test("verdict buttons are gated on runs: read-only when autorun is off", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    // fixture-minimal has a v1 WWB with one proposed candidate (triage mode, no
    // parked). With server autorun off, the band is read-only.
    await page.goto("/canvas/fixture-minimal");
    const band = page.getByTestId("wwb-review");
    await expect(band).toBeVisible();
    await expect(band.getByTestId("review-readonly")).toBeVisible();
    await expect(band).toContainText("Review runs from Claude Code.");
    await expect(page.getByTestId("verdict-build-now")).toHaveCount(0);
    await expect(page.getByTestId("submit-review")).toHaveCount(0);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("v1 WWB tolerance: a plain Build splits by source into Build now + Proposed, no crash", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-minimal");
    // The v1 file renders in the v2 UI: the proposed bucket is populated (the
    // proposed-by-AI Build entry), and the decided one lands in Build now.
    await expect(page.getByTestId("wwb-pane")).toBeVisible();
    // No parked / no questions → the tabs open on Proposed.
    const proposed = page.getByTestId("wwb-proposed");
    await expect(proposed).toBeVisible();
    await expect(proposed).toContainText(/single interrupt signal/i);
    // The decided half lands in Build now, on the Rulings tab.
    await page.getByTestId("wwb-tab-rulings").click();
    await expect(page.getByTestId("wwb-build-now")).toContainText(/one-glance team checkpoint/i);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("triage (runs on): selecting a verdict updates the summary; submit posts the exact batch", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    let captured: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    await page.route("**/api/projects/review", async (route) => {
      captured = route.request().postDataJSON();
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ batchId: 1, running: true }),
      });
    });
    // ?runs=1 enables the band's controls for a preview (the API still gates the
    // real recording, so this never spawns an agent on its own).
    await page.goto("/canvas/fixture-minimal?runs=1");

    const build = page.getByTestId("verdict-build-now").first();
    await expect(build).toBeVisible();
    await expect(build).toHaveAttribute("aria-pressed", "false");
    await build.click();
    await expect(build).toHaveAttribute("aria-pressed", "true");

    // The destination-split summary reflects the pending verdict live.
    await expect(page.getByTestId("review-summary")).toContainText(/1 build now/i);

    // Two-step submit posts the exact batch.
    await page.getByTestId("submit-review").click();
    await page.getByTestId("submit-review").click();
    await expect(page.getByTestId("review-submitted")).toBeVisible();
    // The done copy always says research is resuming: under decision 0036 even a
    // verdicts-only batch re-runs research (every submission is another brief).
    await expect(page.getByTestId("review-submitted")).toContainText(/research is resuming/i);
    expect(captured.verdicts).toHaveLength(1);
    expect(captured.verdicts[0].verdict).toBe("build-now");
    expect(captured.answers).toEqual([]);
    expect(captured.ruling ?? null).toBeNull();
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("ruling-first (runs on): verdict buttons hidden; the two-step ruling + an answer post confirmed", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    let captured: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    await page.route("**/api/projects/review", async (route) => {
      captured = route.request().postDataJSON();
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ batchId: 6, running: true }),
      });
    });
    await page.goto("/canvas/fixture-project?runs=1");

    // Ruling-first: the tabs open on Parked; proposed entries stay read-only (no
    // verdict buttons anywhere), and the Proposed tab carries the re-scope note.
    await expect(page.getByTestId("wwb-tab-parked")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("wwb-ruling")).toBeVisible();
    await expect(page.getByTestId("verdict-build-now")).toHaveCount(0);
    await page.getByTestId("wwb-tab-proposed").click();
    await expect(page.getByTestId("proposed-rescope-note")).toBeVisible();

    // Back on Parked, the ruling two-step: Confirm appears only after a disposition + own words.
    await page.getByTestId("wwb-tab-parked").click();
    await expect(page.getByTestId("ruling-confirm")).toHaveCount(0);
    await page.getByTestId("ruling-accept").click();
    await page.getByTestId("ruling-words").fill("Yes, rule the framing first before we scope anything.");
    await page.getByTestId("ruling-record").click();
    await expect(page.getByTestId("ruling-confirm")).toBeVisible();
    await page.getByTestId("ruling-confirm").click();

    // Switch to the Questions tab and answer one; the ruling draft persists across the switch.
    await page.getByTestId("wwb-tab-questions").click();
    await page.getByTestId("answer-L1").fill("I act on the restated problem.");

    // The sticky submit bar rides the review tabs; two-step submit posts the batch.
    await page.getByTestId("submit-review").click();
    await page.getByTestId("submit-review").click();
    await expect(page.getByTestId("review-submitted")).toBeVisible();
    expect(captured.ruling).not.toBeNull();
    expect(captured.ruling.id).toBe("W7");
    expect(captured.ruling.disposition).toBe("accept");
    expect(captured.ruling.confirmed).toBe(true);
    expect(captured.answers).toEqual([{ id: "L1", text: "I act on the restated problem." }]);
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── WWB tabs: counts, default tab, and batch state across switches ────────────

test.describe("WWB tabs", () => {
  test("tab counts match the model and the default tab follows ruling-first; Proposed is one click away", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // Counts on the tabs match the model: 1 parked, 2 questions, 2 proposed.
    await expect(page.getByTestId("wwb-tab-parked")).toContainText("(1)");
    await expect(page.getByTestId("wwb-tab-questions")).toContainText("(2)");
    await expect(page.getByTestId("wwb-tab-proposed")).toContainText("(2)");

    // Default tab: fixture-project has a parked 🔴, so it lands on Parked.
    await expect(page.getByTestId("wwb-tab-parked")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("wwb-ruling")).toBeVisible();

    // Proposed is reachable by a click, and Parked yields the selection.
    await page.getByTestId("wwb-tab-proposed").click();
    await expect(page.getByTestId("wwb-tab-proposed")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("wwb-proposed")).toBeVisible();
    await expect(page.getByTestId("wwb-tab-parked")).toHaveAttribute("aria-selected", "false");

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("tab switching preserves a selected verdict and a typed note (triage)", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    // fixture-minimal has no parked / no questions, so it opens on Proposed in triage mode.
    await page.goto("/canvas/fixture-minimal?runs=1");

    await expect(page.getByTestId("wwb-tab-proposed")).toHaveAttribute("aria-selected", "true");
    const build = page.getByTestId("verdict-build-now").first();
    await build.click();
    await expect(build).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("verdict-note").first().fill("Ship the cheap early signal.");

    // Switch away (Rulings) and back: the panel only hides, so the selection + note survive.
    await page.getByTestId("wwb-tab-rulings").click();
    await expect(page.getByTestId("wwb-proposed")).toBeHidden();
    await page.getByTestId("wwb-tab-proposed").click();
    await expect(page.getByTestId("verdict-build-now").first()).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("verdict-note").first()).toHaveValue("Ship the cheap early signal.");

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("tab switching preserves a typed answer and the ruling draft (ruling-first)", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project?runs=1");

    // Draft a ruling on Parked.
    await page.getByTestId("ruling-accept").click();
    await page.getByTestId("ruling-words").fill("Rule the framing first.");

    // Type an answer on Questions.
    await page.getByTestId("wwb-tab-questions").click();
    await page.getByTestId("answer-L1").fill("I act on the restated problem.");

    // Back on Parked, the ruling disposition + words survive the round-trip.
    await page.getByTestId("wwb-tab-parked").click();
    await expect(page.getByTestId("ruling-accept")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("ruling-words")).toHaveValue("Rule the framing first.");

    // And the typed answer survives too.
    await page.getByTestId("wwb-tab-questions").click();
    await expect(page.getByTestId("answer-L1")).toHaveValue("I act on the restated problem.");

    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── Add input, anytime (decision 0036: every submission is another brief) ─────

test.describe("Add input", () => {
  test("the Add input modal posts {slug, title, text} and confirms research is running", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    let captured: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    await page.route("**/api/projects/input", async (route) => {
      captured = route.request().postDataJSON();
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ file: "02 Research/_inbox/2026-07-16 kickoff-notes.md", running: true }),
      });
    });
    // ?runs=1 reveals the control for a preview; the route is intercepted, so no
    // agent spawns and the server autorun gate is never reached.
    await page.goto("/canvas/fixture-project?runs=1");

    await page.getByTestId("add-input").click();
    await expect(page.getByTestId("add-input-modal")).toBeVisible();

    await page.getByTestId("add-input-title").fill("Kickoff notes");
    await page
      .getByTestId("add-input-text")
      .fill("The client wants a calmer palette and fewer steps.");
    await page.getByTestId("add-input-submit").click();

    // The done state names research running; the payload carried the exact fields.
    await expect(page.getByTestId("add-input-done")).toContainText(
      /Input recorded\. Research is running\./i,
    );
    expect(captured.slug).toBe("fixture-project");
    expect(captured.title).toBe("Kickoff notes");
    expect(captured.text).toBe("The client wants a calmer palette and fewer steps.");

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("the Add input control is hidden when runs are off", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    await expect(page.getByTestId("add-input")).toHaveCount(0);
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── Both themes: chrome contrast must not collapse ────────────────────────────

test.describe("theme contrast (light + dark)", () => {
  // Read a CSS color through a canvas so any format (oklch, rgb) resolves to
  // real painted RGB, then compute the WCAG contrast ratio in-page.
  async function inkOnPaper(page: Page): Promise<{ ink: number; muted: number }> {
    return page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const rgb = (v: string): [number, number, number] => {
        ctx.fillStyle = "#000000";
        ctx.fillStyle = v.trim();
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2]];
      };
      const lum = ([r, g, b]: [number, number, number]) => {
        const f = (c: number) => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a: [number, number, number], b: [number, number, number]) => {
        const la = lum(a) + 0.05;
        const lb = lum(b) + 0.05;
        return la > lb ? la / lb : lb / la;
      };
      const paper = rgb(cs.getPropertyValue("--paper"));
      return {
        ink: ratio(rgb(cs.getPropertyValue("--ink")), paper),
        muted: ratio(rgb(cs.getPropertyValue("--ink-muted")), paper),
      };
    });
  }

  test("dark (default) keeps body + muted text readable", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    // The default board (Debrief) reads as a document; the sidebar names the
    // project — enough to confirm the canvas page rendered.
    await expect(page.getByTestId("sidebar")).toContainText("Fixture Project");
    // Default theme is dark (layout.tsx).
    await expect(page.locator("html")).toHaveClass(/dark/);
    const { ink, muted } = await inkOnPaper(page);
    expect(ink).toBeGreaterThanOrEqual(4.5); // body text — AA
    expect(muted).toBeGreaterThanOrEqual(3); // muted text — AA large / UI
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("light keeps body + muted text readable after toggle", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    await page.getByRole("button", { name: /switch to light theme/i }).click();
    await expect(page.locator("html")).toHaveClass(/light/);
    const { ink, muted } = await inkOnPaper(page);
    expect(ink).toBeGreaterThanOrEqual(4.5);
    expect(muted).toBeGreaterThanOrEqual(3);
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── Viewport sizes: narrow laptop + large display ─────────────────────────────

for (const vp of [
  { name: "narrow laptop", width: 1280, height: 800 },
  { name: "large display", width: 1920, height: 1080 },
]) {
  test.describe(`viewport ${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    test("index + canvas render with no horizontal body overflow, no errors", async ({ page }) => {
      const errors = trackConsoleErrors(page);

      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

      await page.goto("/canvas/fixture-project");
      // A canvas board (Structure) exercises the pannable viewport + zoom HUD;
      // the default Debrief reads as a document with neither.
      await page.getByRole("option", { name: "Structure", exact: true }).click();
      await expect(page.getByTestId("zoom-hud")).toBeVisible();
      await expect(page.getByTestId("sidebar")).toBeVisible();

      // The page body itself must never scroll horizontally (the world pans; the
      // chrome does not blow out the viewport).
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      );
      expect(overflow, "body must not overflow horizontally").toBeTruthy();

      expect(errors, `console/page errors at ${vp.name}:\n${errors.join("\n")}`).toEqual([]);
    });
  });
}

// ── prefers-reduced-motion disables the canvas fly animation (§14) ────────────

test.describe("prefers-reduced-motion", () => {
  test("a keyboard fly jumps instantly (no transition), no errors", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/canvas/fixture-project");
    const world = page.getByTestId("canvas-world");

    // Fly to a canvas board from the keyboard (focus the option, activate with
    // Enter) — a build-phase stage so there's a world to fly.
    const sidebar = page.getByTestId("sidebar");
    await sidebar.getByRole("option", { name: "Structure", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(world).toBeVisible();

    // Under reduced motion, applyView writes transition:none even for a fly, so
    // the transform must never carry the 380ms cubic-bezier animation.
    const style = (await world.getAttribute("style")) ?? "";
    expect(style).not.toContain("380ms");
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── All four canvas modes reachable, no errors ────────────────────────────────

test.describe("canvas modes", () => {
  test.use({ viewport: { width: 1600, height: 1000 } });
  test("read → comment (element/page) → tokens all mount without errors", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    await page.getByRole("option", { name: "Build", exact: true }).click();
    const desktop = page.frameLocator('[data-frame-device="desktop"][data-route=""]');
    await expect(desktop.getByRole("heading", { name: "Overview" })).toBeVisible();

    // Comment mode + both granularities.
    await page.getByTestId("mode-comment").click();
    await expect(page.getByTestId("granularity-element")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("granularity-page").click();
    await expect(page.getByTestId("granularity-page")).toHaveAttribute("aria-pressed", "true");

    // Tokens mode.
    await page.getByTestId("mode-tokens").click();
    await expect(page.getByTestId("tokens-panel")).toBeVisible();

    // Back to read (toggle tokens off).
    await page.getByTestId("mode-tokens").click();
    await expect(page.getByTestId("tokens-panel")).toHaveCount(0);

    expect(errors, `console/page errors across modes:\n${errors.join("\n")}`).toEqual([]);
  });
});

// ── Proxy routes (/prototype/<slug>/*) directly ───────────────────────────────

test.describe("prototype proxy (/prototype/<slug>/*)", () => {
  test("serves the static prototype same-origin with an injected <base>", async ({ request }) => {
    const res = await request.get("/prototype/fixture-project/");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/text\/html/);
    const html = await res.text();
    expect(html).toContain('<base href="/prototype/fixture-project/">');
    expect(html).toContain("Overview");
  });

  test("serves prototype assets with correct MIME", async ({ request }) => {
    const res = await request.get("/prototype/fixture-project/styles.css");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/text\/css/);
  });

  test("404s a missing file, an unknown project, and a traversal attempt", async ({ request }) => {
    expect((await request.get("/prototype/fixture-project/does-not-exist.html")).status()).toBe(404);
    expect((await request.get("/prototype/no-such-project/")).status()).toBe(404);
    // Path traversal must never escape the repo root.
    const trav = await request.get("/prototype/fixture-project/..%2f..%2fpackage.json");
    expect(trav.status()).not.toBe(200);
  });
});

// ── API routes (/api/card, /api/vault-events) directly ────────────────────────

test.describe("api routes", () => {
  test("/api/card returns rendered blocks, guards missing params + bad slug", async ({ request }) => {
    const ok = await request.get("/api/card?slug=fixture-project&file=" + encodeURIComponent("03 Structure.md"));
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(Array.isArray(body.blocks)).toBeTruthy();
    expect(body.blocks.length).toBeGreaterThan(0);

    expect((await request.get("/api/card?slug=fixture-project")).status()).toBe(400);
    expect(
      (await request.get("/api/card?slug=fixture-project&file=" + encodeURIComponent("Nope.md"))).status(),
    ).toBe(404);
  });

  test("/api/projects/review is gated off when autorun is disabled (403), before any vault write", async ({
    request,
  }) => {
    // Autorun is off in the test env → the review route refuses at its first gate
    // (403), never appending the review block or spawning the recorder.
    const off = await request.post("/api/projects/review", {
      data: { slug: "fixture-project", verdicts: [{ id: "W2", verdict: "build-now" }] },
    });
    expect(off.status()).toBe(403);

    // The autorun gate is first, so an empty batch is refused with the same 403
    // while runs are off (the empty-batch 400 only fires once autorun is on).
    const empty = await request.post("/api/projects/review", {
      data: { slug: "fixture-project" },
    });
    expect(empty.status()).toBe(403);
  });

  test("/api/projects/input is gated off when autorun is disabled (403), before any vault write", async ({
    request,
  }) => {
    // Autorun is off in the test env → the input route refuses at its first gate
    // (403), never writing the inbox file or spawning research.
    const off = await request.post("/api/projects/input", {
      data: { slug: "fixture-project", title: "Kickoff", text: "Some new context." },
    });
    expect(off.status()).toBe(403);

    // The autorun gate is first, so empty text is also 403 while runs are off
    // (the empty-text 400 only fires once autorun is on).
    const empty = await request.post("/api/projects/input", {
      data: { slug: "fixture-project", text: "" },
    });
    expect(empty.status()).toBe(403);
  });

  test("/api/vault-events opens an SSE stream and emits ready; guards missing slug", async ({
    page,
    request,
  }) => {
    expect((await request.get("/api/vault-events")).status()).toBe(400);

    // The client connects via EventSource; assert it opens and receives a frame.
    await page.goto("/canvas/fixture-project");
    const got = await page.evaluate(async () => {
      return new Promise<string>((resolve) => {
        const es = new EventSource("/api/vault-events?slug=fixture-project");
        const done = (v: string) => {
          es.close();
          resolve(v);
        };
        es.addEventListener("ready", () => done("ready"));
        es.onopen = () => done("open");
        es.onerror = () => done("error");
        setTimeout(() => done("timeout"), 5000);
      });
    });
    expect(["ready", "open"]).toContain(got);
  });
});

// ── Focus mode: one board per sidebar item ───────────────────────────────────

test.describe("focus mode — one board per sidebar item", () => {
  test("the canvas opens on What's Worth Building; each sidebar item isolates its board", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // Default landing is What's Worth Building, the compiled verdict, read off
    // the canvas as a document. No decision stream, no zoom in doc mode.
    await expect(page.getByTestId("doc-view")).toBeVisible();
    await expect(page.getByTestId("wwb-pane")).toBeVisible();
    await expect(page.locator("#region-decision-stream")).toHaveCount(0);
    await expect(page.getByTestId("zoom-hud")).toHaveCount(0);

    // Debrief is one click away: its documents fold into the sidebar accordion,
    // and the pane shows the first document (Original brief). No framing pane.
    await page.getByRole("option", { name: "Debrief", exact: true }).click();
    await expect(page.getByTestId("doc-view")).toBeVisible();
    await expect(page.getByTestId("doc-contents")).toHaveCount(0);
    await expect(
      page.getByTestId("sidebar").getByRole("option", { name: "Original brief" }),
    ).toBeVisible();
    await expect(page.getByTestId("doc-view")).toContainText(/look modern/i); // the original brief
    await expect(page.getByTestId("framing-transform")).toHaveCount(0);
    await expect(page.locator("#region-decision-stream")).toHaveCount(0);

    // Click Research → the other prose stage reads off the canvas as a document,
    // and there is nothing to zoom, so the zoom HUD is hidden.
    await page.getByRole("option", { name: "Research", exact: true }).click();
    await expect(page.getByRole("option", { name: "Research", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByTestId("doc-view")).toBeVisible();
    await expect(page.getByTestId("framing-transform")).toHaveCount(0);
    await expect(page.locator("#region-decision-stream")).toHaveCount(0);
    await expect(page.getByTestId("zoom-hud")).toHaveCount(0);

    // A build-phase stage isolates on the canvas (not a document): the zoom HUD
    // returns and the reading view is gone.
    await page.getByRole("option", { name: "Structure", exact: true }).click();
    await expect(page.getByTestId("doc-view")).toHaveCount(0);
    await expect(page.getByTestId("zoom-hud")).toBeVisible();

    // The decision stream is reachable as its own reading pane (doc mode now):
    // its cards read off the canvas, so there is nothing to zoom.
    await page.getByRole("option", { name: "Decision stream", exact: true }).click();
    await expect(page.locator("#region-decision-stream")).toBeVisible();
    await expect(page.getByTestId("doc-view")).toBeVisible();
    await expect(page.getByTestId("zoom-hud")).toHaveCount(0);

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("the research reader: the sidebar accordion shows one document at a time", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // Research opens the reader; its documents fold into the sidebar, and the
    // pane shows the FIRST document by default.
    await page.getByRole("option", { name: "Research", exact: true }).click();
    const pane = page.getByTestId("doc-view");
    const sidebar = page.getByTestId("sidebar");
    await expect(pane).toBeVisible();
    await expect(page.getByTestId("doc-contents")).toHaveCount(0);
    // First research artifact (alphabetical) is "Company & product".
    await expect(pane).toContainText(/twelve-person design team/i);
    // Only one document is mounted — the register isn't stacked below it.
    await expect(page.locator("#assumption-A1")).toHaveCount(0);

    // Selecting the register sub-row REPLACES the pane: the register appears, and
    // the previously shown document is gone (not scrolled past — unmounted).
    await sidebar.getByRole("option", { name: "Assumptions & risks" }).click();
    await expect(page.locator("#assumption-A1")).toBeVisible();
    await expect(pane).not.toContainText(/twelve-person design team/i);
    await expect(sidebar.getByRole("option", { name: "Assumptions & risks" })).toHaveAttribute(
      "aria-current",
      "true",
    );

    // Debrief's reader works the same: its first document is the Original brief;
    // selecting "Problem statement" swaps the pane to the reframe.
    await page.getByRole("option", { name: "Debrief", exact: true }).click();
    await expect(pane).toContainText(/look modern/i); // original brief, shown first
    await sidebar.getByRole("option", { name: "Problem statement" }).click();
    await expect(pane).toContainText(/trustworthy evidence/i);
    await expect(pane).not.toContainText(/look modern/i); // the brief is gone

    expect(errors, errors.join("\n")).toEqual([]);
  });
});
