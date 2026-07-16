import { test, expect, type Page } from "@playwright/test";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Smoke suite over the hermetic fixture vault (test/fixtures/vault). The rule
 * this suite enforces: assert what a user actually SEES (toBeVisible), never
 * just a 200 or that text exists somewhere in the DOM — hidden-but-present UI
 * has shipped here before. Every assertion that can be a visibility assertion
 * is one, and every page is checked for zero console/page errors.
 *
 * The suite grows one block per canvas slice (§14). Slices present: 1
 * (substrate), 2 (the readable board), 3 (decision stream + assumption graph),
 * 4 (pan & zoom + sidebar index).
 */

const STAGE_LABELS = [
  "Debrief",
  "Research",
  "Structure",
  "Design system",
  "Build",
];

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

// ── Slice 1: substrate ──────────────────────────────────────────────────────

test.describe("projects index (/)", () => {
  test("lists the fixture project with its client", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

    const card = page.getByRole("link", { name: /Fixture Project/i });
    await expect(card).toBeVisible();
    await expect(card.getByText("Acme Fixtures Co.")).toBeVisible();

    expect(errors, `console/page errors on /:\n${errors.join("\n")}`).toEqual([]);
  });
});

// ── Create a project: the dashboard's one write action ───────────────────────

test.describe("new project (/)", () => {
  const SLUG = "modal-test-project";
  const DIR = path.resolve(__dirname, "fixtures/vault/Design Studio", SLUG);

  test("the + modal seeds a project and hands off to the debrief skill", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    try {
      await page.goto("/");
      await page.getByTestId("new-project").click();
      await expect(page.getByTestId("new-project-modal")).toBeVisible();

      await page.getByTestId("new-project-name").fill("Modal Test Project");
      await page
        .getByTestId("new-project-brief")
        .fill("Make the thing quicker to use for busy people.");
      await page.getByTestId("new-project-submit").click();

      // Success is a handoff, not a navigation: the modal names the next step
      // (run the debrief skill) and stays on the dashboard.
      const created = page.getByTestId("new-project-created");
      await expect(created).toBeVisible();
      await expect(created).toContainText("/design-studio-debrief");
      await expect(page).toHaveURL(/\/$/);

      // The project is really in the vault — Open project resolves its canvas,
      // and the sidebar names it.
      await page.getByTestId("new-project-open").click();
      await expect(page).toHaveURL(new RegExp(`/canvas/${SLUG}$`));
      await expect(page.getByTestId("sidebar")).toContainText("Modal Test Project");
    } finally {
      await fs.rm(DIR, { recursive: true, force: true });
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── Slice 2: the readable board ──────────────────────────────────────────────

test.describe("canvas board (/canvas/fixture-project)", () => {
  test("the sidebar index lists all 5 stages, build current", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const response = await page.goto("/canvas/fixture-project");
    expect(response?.ok()).toBeTruthy();

    // The sidebar index is the whole-flow overview now (the comb is gone): every
    // stage listed, in the §1 idiom (weight/label, no dots, no status words).
    const sidebar = page.getByTestId("sidebar");
    for (const label of STAGE_LABELS) {
      await expect(sidebar.getByRole("option", { name: label, exact: true })).toBeVisible();
    }

    // compile-spec is an on-demand render utility now (decision 0028), off the
    // spine — no spec stage appears in the index.
    await expect(sidebar.getByRole("option", { name: /spec/i })).toHaveCount(0);

    // Open Build → its board renders (the region exists) and the override
    // receipts show. (The board no longer repeats run-state / autonomy / the
    // stage blurb + gate — those were removed from the stage meta.)
    await sidebar.getByRole("option", { name: "Build", exact: true }).click();
    await expect(page.locator("#region-build")).toBeVisible();
    await expect(page.getByTestId("overrides")).toBeVisible();
    await expect(page.getByTestId("overrides").getByText(/skipped reframe/i)).toBeVisible();

    expect(errors, `console/page errors on canvas board:\n${errors.join("\n")}`).toEqual([]);
  });

  test("debrief reads as a document: brief, restated problem, guiding principle", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // Debrief is the default board and reads off the canvas as a document. Its
    // document list is folded into the sidebar as an accordion (no separate
    // contents column): the brief, the restated problem, and the guiding
    // principle are each their own sub-row that swaps the reading pane.
    const sidebar = page.getByTestId("sidebar");
    const pane = page.getByTestId("doc-view");
    await expect(pane).toBeVisible();
    await expect(page.getByTestId("doc-contents")).toHaveCount(0);

    await sidebar.getByRole("option", { name: "Original brief" }).click();
    await expect(pane.getByText(/look modern/i)).toBeVisible();
    await sidebar.getByRole("option", { name: "Problem statement" }).click();
    await expect(pane.getByText(/trustworthy evidence/i)).toBeVisible();
    await sidebar.getByRole("option", { name: "Guiding principle" }).click();
    await expect(pane.getByText("Assert what users see.", { exact: false })).toBeVisible();

    expect(errors, `console/page errors on framing:\n${errors.join("\n")}`).toEqual([]);
  });

  test("an artifact card renders readable markdown text", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // The structure stage's screen inventory is a readable card on its board.
    await page.getByRole("option", { name: "Structure", exact: true }).click();
    await expect(page.locator("#card-structure-0")).toBeVisible();
    await expect(page.getByText(/screen inventory/i).first()).toBeVisible();

    // Research reads as documents: the synthesis is a readable page, not a thumbnail.
    await page.getByRole("option", { name: "Research", exact: true }).click();
    await page.getByTestId("sidebar").getByRole("option", { name: "Synthesis" }).click();
    await expect(
      page.getByText("the artifact and the decision that shaped it live", { exact: false }),
    ).toBeVisible();

    // The malformed decision never surfaces on the decision stream.
    await page.getByRole("option", { name: "Decision stream", exact: true }).click();
    await expect(page.getByText("malformed frontmatter fixture")).toHaveCount(0);

    expect(errors, `console/page errors on artifact cards:\n${errors.join("\n")}`).toEqual([]);
  });
});

// ── Slice 3: decision stream + assumption graph ──────────────────────────────

test.describe("decision stream + assumption graph (/canvas/fixture-project)", () => {
  test("supersede chain is drawn, not just linked", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    await page.getByRole("option", { name: "Decision stream", exact: true }).click();

    // The consolidated stream is one page; the retired entry stays in place.
    const superseded = page.locator("#d-0008");
    const superseding = page.locator("#d-0009");
    await expect(superseded).toBeVisible();
    await expect(superseding).toBeVisible();
    await expect(superseded).toHaveAttribute("data-superseded", "true");
    await expect(superseded.getByText("superseded", { exact: true })).toBeVisible();

    // The supersede connector is DRAWN between them (both endpoints on this board).
    await expect(page.locator('[data-edge="d-0008->d-0009"]')).toBeVisible();

    expect(errors, `console/page errors on connectors:\n${errors.join("\n")}`).toEqual([]);
  });

  test("an In-their-words quote gets pull-quote treatment", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    await page.getByRole("option", { name: "Decision stream", exact: true }).click();

    const quote = page.locator("#d-0009").getByTestId("in-their-words");
    await expect(quote).toBeVisible();
    await expect(quote).toContainText("I don't want another dashboard with tabs");
    await expect(quote.getByText("In their words")).toBeVisible();

    expect(errors, `console/page errors on pull-quote:\n${errors.join("\n")}`).toEqual([]);
  });

  test("lighting an assumption's blast radius; unverified reads at-risk", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    await page.getByRole("option", { name: "Decision stream", exact: true }).click();

    // A1 is unverified, so decisions resting on it read at-risk up front.
    await expect(page.locator("#d-0009").getByTestId("at-risk")).toBeVisible();

    // Clicking the rests-on reference (A1) inside a decision lights every
    // decision standing on it (the register lives on the research board now, so
    // the blast radius is triggered from the stream's own rests_on link).
    await page.locator("#d-0009").getByRole("button", { name: "A1", exact: true }).click();
    await expect(page.locator("#d-0009")).toHaveAttribute("data-highlighted", "true");
    await expect(page.locator("#d-0011")).toHaveAttribute("data-highlighted", "true");
    // A decision that does NOT rest on A1 stays un-highlighted.
    await expect(page.locator("#d-0008")).not.toHaveAttribute("data-highlighted", "true");

    // The stream filter defaults to All and can hide retired entries.
    await expect(page.getByTestId("stream-filter")).toBeVisible();
    await page.getByRole("button", { name: "Live only" }).click();
    await expect(page.locator("#d-0008")).toHaveCount(0);
    await expect(page.locator("#d-0009")).toBeVisible();

    expect(errors, `console/page errors on blast radius:\n${errors.join("\n")}`).toEqual([]);
  });
});

// ── Slice 4: pan & zoom + sidebar index ──────────────────────────────────────

test.describe("pan & zoom (/canvas/fixture-project)", () => {
  test("zoom is a CSS transform on one world container; the HUD drives it", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    // Land on a canvas board (the default Debrief reads as a document — no zoom).
    await page.getByRole("option", { name: "Structure", exact: true }).click();

    const world = page.getByTestId("canvas-world");
    // Zoom is a transform on the single world container (perf law), set on load.
    await expect(world).toHaveAttribute("style", /scale\(/);

    const hud = page.getByTestId("zoom-hud");
    await expect(hud).toBeVisible();
    // Focusing a board fits it to the viewport; click-to-reset returns to 100%.
    await page.getByTestId("zoom-pct").click();
    await expect(page.getByTestId("zoom-pct")).toHaveText("100%");

    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(page.getByTestId("zoom-pct")).not.toHaveText("100%");
    await expect(world).toHaveAttribute("style", /scale\((?!1\))/); // scale != 1

    // Click-to-reset returns to 100%.
    await page.getByTestId("zoom-pct").click();
    await expect(page.getByTestId("zoom-pct")).toHaveText("100%");

    expect(errors, `console/page errors on pan/zoom:\n${errors.join("\n")}`).toEqual([]);
  });

  test("view state persists per project across reloads", async ({ page }) => {
    await page.goto("/canvas/fixture-project");
    // A canvas board (not the default document view) so there's a zoom to persist;
    // the focused board persists across the reload too.
    await page.getByRole("option", { name: "Structure", exact: true }).click();
    // Focusing fits the board; reset to a known 100% baseline before zooming.
    await page.getByTestId("zoom-pct").click();
    await expect(page.getByTestId("zoom-pct")).toHaveText("100%");
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.getByRole("button", { name: "Zoom in" }).click();
    // Let the rAF-throttled HUD readout settle before capturing it.
    await expect(page.getByTestId("zoom-pct")).not.toHaveText("100%");
    await page.waitForTimeout(150);
    const zoomed = await page.getByTestId("zoom-pct").textContent();
    expect(zoomed).not.toBe("100%");

    // Give the debounced localStorage write time to flush, then reload.
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.getByTestId("zoom-pct")).toHaveText(zoomed!);
  });

  test("the sidebar is a keyboard-navigable index that flies the canvas", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toBeVisible();

    // Land on a canvas board (Structure) so there is a world to fly.
    await sidebar.getByRole("option", { name: "Structure", exact: true }).click();
    const world = page.getByTestId("canvas-world");
    await expect(world).toBeVisible();
    const before = await world.getAttribute("style");

    // Arrow to another stage and fly with Enter — reachable without a drag.
    await sidebar.getByRole("option", { name: "Structure", exact: true }).focus();
    await page.keyboard.press("ArrowDown"); // Design system
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    const after = await world.getAttribute("style");
    expect(after).not.toBe(before); // the canvas flew somewhere

    // Sidebar can hide (via the in-sidebar collapse icon) and show (via the
    // chrome reopen icon that appears only while it's hidden).
    await page.getByRole("button", { name: /hide index/i }).click();
    await expect(page.getByTestId("sidebar")).toHaveCount(0);
    await page.getByRole("button", { name: /show index/i }).click();
    await expect(page.getByTestId("sidebar")).toBeVisible();

    expect(errors, `console/page errors on sidebar index:\n${errors.join("\n")}`).toEqual([]);
  });
});

// ── Slice 5: the design-system board ─────────────────────────────────────────

test.describe("design-system board (/canvas/fixture-project)", () => {
  test("renders living specimens with visible contrast ratios and flags the failing pair", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    await page.getByRole("option", { name: "Design system", exact: true }).click();

    const board = page.getByTestId("design-system-board");
    await expect(board).toBeVisible();

    // Moving-home label: the fixture's DESIGN.md lives in the prototype repo.
    await expect(page.getByTestId("design-system-home")).toContainText(/prototype repo/i);

    // Contrast ratios are computed inline and visible (the lint gate made visible).
    const ratios = page.getByTestId("contrast-ratio");
    expect(await ratios.count()).toBeGreaterThan(0);
    await expect(ratios.first()).toBeVisible();

    // The deliberately-failing fixture pair (faint on surface) is flagged.
    const fails = page.getByTestId("contrast-fail");
    expect(await fails.count()).toBeGreaterThan(0);
    await expect(fails.first()).toBeVisible();

    // Type presets on realistic content, and component specimens in state variants.
    await expect(page.getByTestId("type-preset").first()).toBeVisible();
    await expect(board.locator('[data-component-base="button"]')).toBeVisible();
    await expect(board.locator('[data-component-base="card"]')).toBeVisible();

    // Candidate boards ride alongside, with the chosen one marked.
    const chosen = page.locator('[data-testid="candidate-board"][data-chosen="true"]');
    await expect(chosen).toBeVisible();
    await expect(chosen.getByText("Chosen")).toBeVisible();
    await expect(page.locator('[data-testid="candidate-board"][data-chosen="false"]').first()).toBeVisible();

    expect(errors, `console/page errors on design-system board:\n${errors.join("\n")}`).toEqual([]);
  });
});

// ── Slice 6: prototype frames + live board ───────────────────────────────────

test.describe("prototype frames (/canvas/fixture-project)", () => {
  test("every route is its own live column, embedded same-origin", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // Fly the canvas to the Build region so the region activates (lazy) and the
    // mount queue starts booting columns one at a time.
    await page.getByRole("option", { name: "Build", exact: true }).click();

    const frames = page.getByTestId("prototype-frames");
    await expect(frames).toBeVisible();

    // One column per route — root + page2 + page3 — not a single rail-switched
    // frame. Every column is present (mounted or still queued).
    await expect(page.locator('[data-testid="route-column"]')).toHaveCount(3);

    // The columns are grouped into rows by domain (§1 comb): the route's first
    // path segment, root "" → "/". The fixture's three routes ("", page2.html,
    // page3.html) each live in their own domain, so three labelled rows appear —
    // each with a big canvas-legible domain header and a muted page count.
    for (const key of ["/", "/page2", "/page3"]) {
      const row = page.locator(`[data-testid="domain-row"][data-domain="${key}"]`);
      await expect(row.getByTestId("domain-label")).toBeVisible();
      await expect(row.getByTestId("domain-label")).toHaveText(key);
      await expect(row.getByTestId("domain-count")).toBeVisible();
      await expect(row.getByTestId("domain-count")).toHaveText("1 page");
    }

    // The root row ("/") holds the root column, and that column carries the
    // desktop AND the (root-only) mobile frame — plus a per-column title strip
    // whose humanized page label ("" → "Home") reads at canvas distance.
    const rootRow = page.locator('[data-testid="domain-row"][data-domain="/"]');
    const rootColumn = rootRow.locator('[data-testid="route-column"][data-route=""]');
    await expect(rootColumn.getByTestId("page-title")).toBeVisible();
    await expect(rootColumn.getByTestId("page-title")).toHaveText("Home");
    await expect(rootColumn.getByTestId("frame-desktop")).toBeVisible();
    await expect(rootColumn.getByTestId("frame-mobile")).toBeVisible();

    // The embedded root frame is the real running prototype (same-origin proxy).
    const desktop = page.frameLocator('[data-frame-device="desktop"][data-route=""]');
    await expect(desktop.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(desktop.locator('[data-component="button"]').first()).toBeVisible();

    expect(errors, `console/page errors on frames:\n${errors.join("\n")}`).toEqual([]);
  });

  // Regression (frame lazy-mount): a wider board must not leave flown-to frames
  // dead behind the sidebar, and they must stay mounted at any zoom. Two seams
  // were fixed here: (1) a stage row stretched to the full board width, so
  // flyToRegion centered the middle of an empty stretch and pushed the Build
  // frames off-screen — the wider the board (this fixture grew), the further
  // off; (2) the lazy-mount observer honored the sidebar-offset viewport's clip,
  // so an off-viewport frame never mounted. This test would have caught both.
  test("frames land inside the visible viewport when flown to, and stay mounted through zoom-to-fit", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    await page.getByRole("option", { name: "Build", exact: true }).click();

    const desktop = page.frameLocator('[data-frame-device="desktop"][data-route=""]');
    await expect(desktop.getByRole("heading", { name: "Overview" })).toBeVisible();

    // The root desktop frame must come to rest inside the canvas viewport, not
    // tucked entirely behind the index sidebar (the pre-fix failure: it landed
    // at a negative x, fully occluded, and never mounted).
    const sidebar = await page.getByTestId("sidebar").boundingBox();
    const frame = await page
      .locator('[data-testid="route-column"][data-route=""] [data-testid="frame-desktop"]')
      .boundingBox();
    expect(sidebar && frame, "sidebar + frame must have a box").toBeTruthy();
    const sidebarRight = sidebar!.x + sidebar!.width;
    const viewportRight = page.viewportSize()!.width;
    // A real slice of the frame is past the sidebar and within the viewport.
    expect(frame!.x + frame!.width).toBeGreaterThan(sidebarRight + 40);
    expect(frame!.x).toBeLessThan(viewportRight);

    // Scale-independent mount: fit the whole board (a small scale) — the frame
    // shrinks but must not unmount or blank.
    await page.getByRole("button", { name: "Zoom to fit" }).click();
    await expect(desktop.getByRole("heading", { name: "Overview" })).toBeVisible();

    expect(errors, `console/page errors on frame mount:\n${errors.join("\n")}`).toEqual([]);
  });
});

test.describe("live board — vault SSE (/canvas/fixture-project)", () => {
  const STRUCTURE = path.resolve(
    __dirname,
    "fixtures/vault/Design Studio/fixture-project/03 Structure.md",
  );

  test("a changed vault file updates the affected card in place, no reload", async ({ page }) => {
    const original = await fs.readFile(STRUCTURE, "utf8");
    const marker = `LIVE-SSE-${Date.now()}`;
    try {
      await page.goto("/canvas/fixture-project");
      await page.getByRole("option", { name: "Structure", exact: true }).click();
      const card = page.locator("#card-structure-0");
      await expect(card).toBeVisible();
      // Give the EventSource a moment to connect before we touch the file.
      await page.waitForTimeout(600);

      // Touch the vault file (the app never writes the vault; the test does).
      const changed = original.replace(
        /# Structure/,
        `# Structure\n\n${marker}`,
      );
      await fs.writeFile(STRUCTURE, changed, "utf8");

      // The card refetches and swaps its blocks in place — no navigation.
      await expect(card).toHaveAttribute("data-live-updated", "true", { timeout: 8000 });
      await expect(card.getByText(marker)).toBeVisible();
    } finally {
      await fs.writeFile(STRUCTURE, original, "utf8");
    }
  });
});

// ── Slice 7: comment + tweak + export ────────────────────────────────────────

test.describe("comment + tweak + export (/canvas/fixture-project)", () => {
  test.use({ viewport: { width: 1600, height: 1000 } });

  test("annotate a frame element: pin, scope with instance count, export routing protocol", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // Bring the frames onto the board and wait for the real prototype.
    await page.getByRole("option", { name: "Build", exact: true }).click();
    const desktop = page.frameLocator('[data-frame-device="desktop"][data-route=""]');
    await expect(desktop.getByRole("heading", { name: "Overview" })).toBeVisible();
    // Fit the whole board so the frame content is on-screen and clickable
    // (a transformed canvas can't be scrolled into view by the test runner).
    await page.getByRole("button", { name: "Zoom to fit" }).click();
    await page.waitForTimeout(500);

    // Enter comment mode (the toolbar toggle mirrors the C hotkey).
    await page.getByTestId("mode-comment").click();

    // Click a real component instance inside the frame.
    await desktop.getByTestId("cta-primary").click();

    const draft = page.getByTestId("comment-draft");
    await expect(draft).toBeVisible();

    // The scope selector shows the matched component's live instance count (§11).
    await expect(draft.getByTestId("scope-selector")).toBeVisible();
    await expect(draft.getByTestId("scope-instance-count")).toContainText(/instance/i);
    // Default scope is component when a match exists.
    await expect(draft.getByTestId("scope-component")).toBeChecked();

    // Add a note and a token tweak (only DESIGN.md tokens are offered).
    await draft.getByTestId("comment-note").fill("Primary action needs a calmer color");
    await draft.getByTestId("tweak-color").selectOption({ index: 1 });
    await expect(draft.getByTestId("tweak-specs")).toBeVisible();

    // Save → a numbered pin renders inside the frame.
    await draft.getByTestId("comment-save").click();
    await expect(page.getByTestId("comment-draft")).toHaveCount(0);
    await expect(desktop.locator('[data-testid="pin"]').first()).toBeVisible();
    await expect(page.getByTestId("annotation-count")).toContainText("1 pin");

    // Export carries the routing protocol + the chosen scope, to the clipboard.
    await page.getByTestId("export-feedback").click();
    await expect(page.getByTestId("export-status")).toContainText("Copied");
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain("Routing protocol");
    expect(clip).toMatch(/smallest unit that is reusable/i);
    expect(clip).toMatch(/Scope:/);
    // The close names both consumers: build's next round, or — after build —
    // research's evaluate/reconcile moves (validate dissolved, decision 0027).
    expect(clip).toContain("design-studio-build");
    expect(clip).toContain("design-studio-research");

    expect(errors, `console/page errors on comment/tweak/export:\n${errors.join("\n")}`).toEqual([]);
  });

  test("design-system comment: propose a token change and export a DESIGN.md proposal", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/canvas/fixture-project");

    await page.getByRole("option", { name: "Design system", exact: true }).click();
    await page.getByRole("button", { name: "Zoom to fit" }).click();
    await page.waitForTimeout(500);
    await page.getByTestId("mode-comment").click();

    const board = page.getByTestId("design-system-board");
    await expect(board.getByTestId("ds-comment-hint")).toBeVisible();

    // Propose a token change on the first pairing; contrast recomputes live.
    await board.getByTestId("propose-token").first().click();
    // The editor floats via portal (viewport-fixed escapes the scaled world),
    // so it lives at document level, not inside the board's subtree.
    const editor = page.getByTestId("proposal-editor");
    await expect(editor).toBeVisible();
    await editor.getByTestId("proposal-value").fill("#111111");
    await expect(editor.getByTestId("proposal-recompute")).toBeVisible();
    await editor.getByTestId("proposal-reshaping").click();
    await editor.getByTestId("proposal-save").click();
    await expect(board.getByTestId("proposal-recorded").first()).toBeVisible();

    // Export is a DESIGN.md change proposal, distinct from the prototype export.
    await board.getByTestId("export-proposal").click();
    await expect(board.getByTestId("proposal-status")).toContainText("Copied");
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain("DESIGN.md change proposal");
    expect(clip).toMatch(/RESHAPING|ADDITIVE/);
    expect(clip).toContain("superseding");
  });
});

// ── Slice 8: component board + tokens mode ───────────────────────────────────

test.describe("component board + tokens mode (/canvas/fixture-project)", () => {
  test.use({ viewport: { width: 1600, height: 1000 } });

  test("component board accumulates instance counts across every route column, no rail-clicking", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // Activate the region; every route is now its own always-alive column, so the
    // cross-route instance scan (§7) accumulates on its own — no rail switching.
    // Wait for all three columns' frames to boot (the mount queue is sequential).
    await page.getByRole("option", { name: "Build", exact: true }).click();
    await expect(
      page.frameLocator('[data-frame-device="desktop"][data-route=""]').getByRole("heading", { name: "Overview" }),
    ).toBeVisible();
    await expect(
      page
        .frameLocator('[data-frame-device="desktop"][data-route="page2.html"]')
        .getByRole("heading", { name: "Reports" }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page
        .frameLocator('[data-frame-device="desktop"][data-route="page3.html"]')
        .getByRole("heading", { name: "Settings" }),
    ).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Zoom to fit" }).click();
    await page.waitForTimeout(300);

    const board = page.getByTestId("component-board");
    await expect(board).toBeVisible();

    // Button: 3 + 2 + 1 = 6 instances across 3 routes — reached because all three
    // route columns are live simultaneously, not visited one at a time.
    const buttonCell = board.locator('[data-component-name="button"]');
    await expect(buttonCell).toBeVisible();
    await expect(buttonCell.getByTestId("instance-count")).toHaveText("6", { timeout: 12000 });
    await expect(buttonCell.getByTestId("component-instances")).toContainText("3 routes", {
      timeout: 12000,
    });

    // The recurring stat-tile signature is uncodified (3+ routes, no component).
    const uncodified = board.getByTestId("uncodified-row").filter({ hasText: "stat-tile" });
    await expect(uncodified).toBeVisible({ timeout: 12000 });

    expect(errors, `console/page errors on component board:\n${errors.join("\n")}`).toEqual([]);
  });

  test("tokens mode: editing a token restyles every loaded frame live", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    await page.getByRole("option", { name: "Build", exact: true }).click();
    const desktop = page.frameLocator('[data-frame-device="desktop"][data-route=""]');
    await expect(desktop.getByRole("heading", { name: "Overview" })).toBeVisible();

    await page.getByTestId("mode-tokens").click();
    const panel = page.getByTestId("tokens-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId("tokens-banner")).toContainText(/superseding decision/i);

    // Edit colors.primary → every loaded frame's primary restyles immediately.
    await panel
      .locator('[data-token="colors.primary"] [data-testid="token-input"]')
      .fill("#ff0000");
    await expect(desktop.locator('[data-component="button"]').first()).toHaveCSS(
      "background-color",
      "rgb(255, 0, 0)",
    );

    // Per-token reset returns it.
    await panel.locator('[data-token="colors.primary"]').getByRole("button").click();
    await expect(desktop.locator('[data-component="button"]').first()).not.toHaveCSS(
      "background-color",
      "rgb(255, 0, 0)",
    );

    expect(errors, `console/page errors on tokens mode:\n${errors.join("\n")}`).toEqual([]);
  });
});
