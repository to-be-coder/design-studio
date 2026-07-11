import { test, expect, type Page } from "@playwright/test";

/**
 * Smoke suite over the hermetic fixture vault (test/fixtures/vault). The rule
 * this suite enforces: assert what a user actually SEES (toBeVisible), never
 * just a 200 or that text exists somewhere in the DOM — hidden-but-present UI
 * has shipped here before. Every assertion that can be a visibility assertion
 * is one, and every page is checked for zero console/page errors.
 *
 * The suite grows one block per canvas slice (§14). Slices present: 1 (substrate).
 */

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

test.describe("canvas substrate dump (/canvas/fixture-project)", () => {
  test("the whole board model parses from the vault", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const response = await page.goto("/canvas/fixture-project");
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { level: 1, name: "Fixture Project", exact: true }),
    ).toBeVisible();

    // The spine carries all 11 stages, in schema order, each with a marker state.
    const spine = page.getByTestId("spine-dump");
    await expect(spine.locator("> li")).toHaveCount(11);
    // The skipped stage (reframe, no artifact) reads honestly as "not run".
    await expect(spine.locator("> li", { hasText: "reframe" })).toContainText("skipped");
    // The current stage.
    await expect(spine.locator("> li", { hasText: "validate" })).toContainText("current");
    // Debrief carries the framing model.
    await expect(spine.locator("> li", { hasText: "debrief" })).toContainText("framing present");

    // Decision stream: the three well-formed decisions, malformed 0003 skipped.
    const stream = page.getByTestId("stream-dump");
    await expect(stream.locator("> li")).toHaveCount(3);
    await expect(stream.getByText(/^0008/)).toBeVisible();
    await expect(stream.getByText(/^0009/)).toBeVisible();
    await expect(stream.getByText(/^0011/)).toBeVisible();
    await expect(page.getByText("0003", { exact: false })).toHaveCount(0);
    // 0009 is a 🔴 user decision carrying an In-their-words quote, and rests on A1.
    await expect(stream.locator("> li", { hasText: "0009" })).toContainText("by user");
    await expect(stream.locator("> li", { hasText: "0009" })).toContainText("quoted");
    await expect(stream.locator("> li", { hasText: "0009" })).toContainText("rests on A1");

    // Assumption graph: A1 is the riskiest, unverified, load-bearing assumption
    // with a blast radius; R1 is an accepted-risk admission.
    const assumptions = page.getByTestId("assumptions-dump");
    await expect(assumptions.locator("> li", { hasText: "A1" })).toContainText("riskiest");
    await expect(assumptions.locator("> li", { hasText: "A1" })).toContainText("blast:");
    await expect(assumptions.locator("> li", { hasText: "R1" })).toContainText("accepted");

    expect(errors, `console/page errors on canvas:\n${errors.join("\n")}`).toEqual([]);
  });
});
