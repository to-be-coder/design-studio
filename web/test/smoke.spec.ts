import { test, expect, type Page } from "@playwright/test";

/**
 * Smoke suite over the hermetic fixture vault (test/fixtures/vault). The rule
 * this suite enforces: assert what a user actually SEES (toBeVisible), never
 * just a 200 or that text exists somewhere in the DOM — hidden-but-present UI
 * has shipped here before. Every assertion that can be a visibility assertion
 * is one, and every page is checked for zero console/page errors.
 *
 * The suite grows one block per canvas slice (§14). Slices present: 1
 * (substrate), 2 (the readable board), 3 (decision stream + assumption graph).
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

// ── Slice 3: decision stream + assumption graph ──────────────────────────────

test.describe("decision stream + assumption graph (/canvas/fixture-project)", () => {
  test("supersede chain and rests_on edges are drawn, not just linked", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // The consolidated stream is one page; the retired entry stays in place.
    const superseded = page.locator("#d-0008");
    const superseding = page.locator("#d-0009");
    await expect(superseded).toBeVisible();
    await expect(superseding).toBeVisible();
    await expect(superseded).toHaveAttribute("data-superseded", "true");
    await expect(superseded.getByText("superseded", { exact: true })).toBeVisible();

    // The supersede connector is DRAWN between them.
    await expect(page.locator('[data-edge="d-0008->d-0009"]')).toBeVisible();

    // The rests_on edges are drawn from the assumption to each dependent decision.
    await expect(page.locator('[data-edge="assumption-A1->d-0009"]')).toBeVisible();
    await expect(page.locator('[data-edge="assumption-A1->d-0011"]')).toBeVisible();

    expect(errors, `console/page errors on connectors:\n${errors.join("\n")}`).toEqual([]);
  });

  test("an In-their-words quote gets pull-quote treatment", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    const quote = page.locator("#d-0009").getByTestId("in-their-words");
    await expect(quote).toBeVisible();
    await expect(quote).toContainText("I don't want another dashboard with tabs");
    await expect(quote.getByText("In their words")).toBeVisible();

    expect(errors, `console/page errors on pull-quote:\n${errors.join("\n")}`).toEqual([]);
  });

  test("selecting an assumption lights its blast radius; unverified reads at-risk", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // A1 is unverified, so decisions resting on it read at-risk up front.
    await expect(page.locator("#d-0009").getByTestId("at-risk")).toBeVisible();

    // Selecting A1 in the register lights every decision standing on it.
    await page.locator("#assumption-A1 button").first().click();
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
