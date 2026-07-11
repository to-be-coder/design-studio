import { test, expect, type Page } from "@playwright/test";

/**
 * Smoke suite over the fixture vault (test/fixtures/vault). The rule this
 * suite exists to enforce: assert what a user actually SEES (toBeVisible),
 * never just that a route returned 200 or that some text exists somewhere in
 * the DOM. The dashboard this repo replaced ("the Wall") shipped a
 * day-one bug — overlays that never dismissed because a stylesheet display
 * rule overrode the `[hidden]` attribute — that survived until a suite with
 * visibility assertions caught it. Every assertion below that can be a
 * visibility assertion is one.
 */

/** Collect browser console errors + uncaught page errors for a page. */
function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    errors.push(err.message);
  });
  return errors;
}

test.describe("home / knowledge graph (/)", () => {
  test("renders and the main nav is visible", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();

    // The desktop side nav (aside) is the app's main nav at desktop viewport
    // sizes. Assert the actual links are visible, not merely present.
    const nav = page.locator("aside nav");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Graph" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Portfolio" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Skills" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Knowledge graph" })).toBeVisible();

    expect(errors, `console/page errors on /:\n${errors.join("\n")}`).toEqual([]);
  });
});

test.describe("portfolio (/portfolio)", () => {
  test("shows the fixture project card", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const response = await page.goto("/portfolio");
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();

    const card = page.getByRole("link", { name: /Fixture Project/i });
    await expect(card).toBeVisible();
    await expect(card.getByText("Acme Fixtures Co.")).toBeVisible();

    expect(errors, `console/page errors on /portfolio:\n${errors.join("\n")}`).toEqual([]);
  });
});

test.describe("project detail (/project/fixture-project)", () => {
  test("renders the dashboard overview content", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const response = await page.goto("/project/fixture-project");
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { level: 1, name: "Fixture Project", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("A hermetic fixture used only by the Playwright smoke suite"),
    ).toBeVisible();

    // Pipeline rail renders straight from the schema — spot-check a couple of
    // stage rows are actually on screen.
    await expect(page.getByText("Debrief", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Build", { exact: true }).first()).toBeVisible();

    expect(errors, `console/page errors on project overview:\n${errors.join("\n")}`).toEqual([]);
  });

  test("decision list shows the supersede relationship", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const response = await page.goto("/project/fixture-project?tab=decisions");
    expect(response?.ok()).toBeTruthy();

    // Exactly the two well-formed decisions render — the malformed third file
    // (Decisions/0003 malformed.md) must be skipped, not crash the page. Scope
    // to the decision list itself: the pipeline rail (always on screen beside
    // it) is its own <ol>, so a bare "ol > li" count would be a false signal.
    const items = page.getByTestId("decision-list").locator("> li");
    await expect(items).toHaveCount(2);

    const superseded = page.locator("#d-0008");
    const superseding = page.locator("#d-0009");
    await expect(superseded).toBeVisible();
    await expect(superseding).toBeVisible();

    await expect(superseded.getByText("Ship a single unified dashboard view")).toBeVisible();
    await expect(superseded.getByText("superseded", { exact: true })).toBeVisible();

    await expect(
      superseding.getByText("Split into a portfolio grid and a per-project detail page"),
    ).toBeVisible();
    await expect(superseding.getByText("decided", { exact: true })).toBeVisible();

    // The supersede chain itself: 0009's "supersedes" reference links back to
    // 0008, and 0008's "superseded by" reference points at 0009.
    const supersedesLink = superseding.getByRole("link", { name: /0008/ });
    await expect(supersedesLink).toBeVisible();
    const supersededByLink = superseded.getByRole("link", { name: /0009/ });
    await expect(supersededByLink).toBeVisible();

    // The malformed decision must never surface anywhere on the page.
    await expect(page.getByText("0003", { exact: false })).toHaveCount(0);
    await expect(page.getByText("malformed frontmatter fixture")).toHaveCount(0);

    expect(errors, `console/page errors on decisions tab:\n${errors.join("\n")}`).toEqual([]);
  });
});

test.describe("skills (/skills)", () => {
  test("renders the full 11-stage pipeline from the schema", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const response = await page.goto("/skills");
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible();

    const stageTitles = [
      "1. Debrief",
      "2. Research",
      "3. Verify",
      "4. Reframe",
      "5. Scope",
      "6. Directions",
      "7. Converge",
      "8. Design System",
      "9. Build",
      "10. Validate",
      "11. Spec",
    ];
    for (const title of stageTitles) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }

    // Utility skills render in their own section, distinct from the 11 stages.
    await expect(page.getByText("Harvest", { exact: true })).toBeVisible();
    await expect(page.getByText("Wiki Lint", { exact: true })).toBeVisible();
    await expect(page.getByText("Setup", { exact: true })).toBeVisible();

    expect(errors, `console/page errors on /skills:\n${errors.join("\n")}`).toEqual([]);
  });
});
