import { test, expect, type Page } from "@playwright/test";

/**
 * Smoke suite over the hermetic fixture vault (test/fixtures/vault). The rule
 * this suite enforces: assert what a user actually SEES (toBeVisible), never
 * just a 200 or that text exists somewhere in the DOM — hidden-but-present UI
 * has shipped here before. Every assertion that can be a visibility assertion
 * is one, and every page is checked for zero console/page errors.
 *
 * The suite grows one block per canvas slice (§14). Slices present: 1
 * (substrate), 2 (the readable board).
 */

const STAGE_LABELS = [
  "Debrief",
  "Research",
  "Verify",
  "Reframe",
  "Scope",
  "Directions",
  "Converge",
  "Design system",
  "Build",
  "Validate",
  "Spec",
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
  test("lists the fixture project with client and problem line", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

    const card = page.getByRole("link", { name: /Fixture Project/i });
    await expect(card).toBeVisible();
    await expect(card.getByText("Acme Fixtures Co.")).toBeVisible();
    await expect(card.getByText(/trustworthy evidence/i)).toBeVisible();

    expect(errors, `console/page errors on /:\n${errors.join("\n")}`).toEqual([]);
  });
});

// ── Slice 2: the readable board ──────────────────────────────────────────────

test.describe("canvas board (/canvas/fixture-project)", () => {
  test("the spine shows all 11 stages, including the skipped one", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const response = await page.goto("/canvas/fixture-project");
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { level: 1, name: "Fixture Project", exact: true }),
    ).toBeVisible();

    // Every stage appears on the spine, in the §1 idiom (weight/label, no dots).
    for (const label of STAGE_LABELS) {
      await expect(page.locator("p", { hasText: new RegExp(`^${label}$`) }).first()).toBeVisible();
    }

    // The skipped stage (reframe) reads honestly as "not run".
    const reframe = page.locator("#region-reframe");
    await expect(reframe).toBeVisible();
    await expect(reframe.getByText("Not run", { exact: false }).first()).toBeVisible();

    // The current stage is marked as such.
    await expect(page.locator("#region-validate").getByText("Current", { exact: false }).first()).toBeVisible();

    // The override receipts are shown, not hidden.
    await expect(page.getByTestId("overrides")).toBeVisible();
    await expect(page.getByTestId("overrides").getByText(/skipped reframe/i)).toBeVisible();

    expect(errors, `console/page errors on canvas board:\n${errors.join("\n")}`).toEqual([]);
  });

  test("the framing pane shows brief and restated problem side by side", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    const transform = page.getByTestId("framing-transform");
    await expect(transform).toBeVisible();

    const original = page.getByTestId("facet-original");
    const restated = page.getByTestId("facet-restated");
    await expect(original).toBeVisible();
    await expect(restated).toBeVisible();
    await expect(original.getByText(/look modern/i)).toBeVisible();
    await expect(restated.getByText(/trustworthy evidence/i)).toBeVisible();

    // Genuinely side by side: the restated facet sits to the right of the brief.
    const a = await original.boundingBox();
    const b = await restated.boundingBox();
    expect(a && b && b.x > a.x + a.width / 2).toBeTruthy();

    // The guiding principle is set large.
    await expect(page.getByText("Assert what users see.", { exact: false }).first()).toBeVisible();

    expect(errors, `console/page errors on framing:\n${errors.join("\n")}`).toEqual([]);
  });

  test("an artifact card renders readable markdown text", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // The research synthesis card is a readable page, not a thumbnail.
    await expect(
      page.getByText("the artifact and the decision that shaped it live", { exact: false }),
    ).toBeVisible();
    // The scope cut list is readable.
    await expect(page.getByText(/Cross-project knowledge graph/i)).toBeVisible();

    // The malformed decision never surfaces.
    await expect(page.getByText("malformed frontmatter fixture")).toHaveCount(0);

    expect(errors, `console/page errors on artifact cards:\n${errors.join("\n")}`).toEqual([]);
  });
});
