import { test, expect, type Page } from "@playwright/test";

/**
 * The empty Structure board's centered call-to-action (Create structure).
 * A project with no 03 Structure.md gets a dead-middle button that drafts the
 * flows and screens headlessly; with runs off it shows the read-only command
 * line instead; a project that already has structure shows no layer at all.
 * Hermetic: the run + status routes are intercepted, so nothing real spawns.
 */

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

async function focusStructure(page: Page) {
  await page.getByTestId("sidebar").getByRole("option", { name: "Structure", exact: true }).click();
}

test.describe("empty structure board (/canvas/fixture-minimal)", () => {
  test("with runs: the centered CTA posts the structure run and flips to its running label", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    let runBody: unknown = null;
    await page.route("**/api/projects/run", async (route) => {
      runBody = route.request().postDataJSON();
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ slug: "fixture-minimal", stage: "structure", running: true }),
      });
    });
    // Once the run is posted, the status poll reports a drafting structure
    // pass, so an idle poll can never race the optimistic running label away.
    await page.route("**/api/projects/status*", async (route) => {
      await route.fulfill({
        json: runBody
          ? { stage: "structure", state: "drafting", round: null, fence: null, progress: null }
          : { stage: null, state: null, fence: null, progress: null },
      });
    });

    await page.goto("/canvas/fixture-minimal?runs=1");
    await focusStructure(page);

    const cta = page.getByTestId("structure-cta");
    await expect(cta).toBeVisible();
    await expect(cta).toContainText("No structure yet");

    const button = page.getByTestId("structure-cta-run");
    await expect(button).toHaveText("Create structure");
    await button.click();

    // The click posts exactly {slug, stage} to the run route.
    await expect.poll(() => runBody).toEqual({ slug: "fixture-minimal", stage: "structure" });

    // While the draft generates, the button reads as running and is disabled.
    await expect(button).toHaveText("Drafting structure…");
    await expect(button).toBeDisabled();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("without runs: the read-only line shows and there is no button", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-minimal");
    await focusStructure(page);

    const cta = page.getByTestId("structure-cta");
    await expect(cta).toBeVisible();
    await expect(cta).toContainText("No structure yet");
    await expect(cta.getByTestId("structure-cta-readonly")).toContainText(
      "/design-studio-structure",
    );
    await expect(page.getByTestId("structure-cta-run")).toHaveCount(0);

    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("structure board with content (/canvas/fixture-project)", () => {
  test("no CTA layer when 03 Structure.md exists", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    await focusStructure(page);

    // The board shows the doc as before, with no call-to-action overlay.
    await expect(page.getByTestId("canvas-viewport")).toBeVisible();
    await expect(page.getByTestId("structure-cta")).toHaveCount(0);

    expect(errors, errors.join("\n")).toEqual([]);
  });
});
