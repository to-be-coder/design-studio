import { test, expect, type Page } from "@playwright/test";

/**
 * The empty Structure board's centered call-to-action (Create structure).
 * A project with no scaffolded prototype repo gets a dead-middle button that
 * scaffolds the clickable skeleton headlessly; with runs off it shows the
 * read-only command line instead; a project whose repo is present shows the
 * skeleton frames and no layer at all.
 *
 * When the repo IS present, the chrome row grows a "Refresh structure" control,
 * but only while flows.json is still source "structure" (a pristine skeleton the
 * stage owns). A repo whose flows.json is source "build" (build has taken over)
 * shows no refresh affordance at all, even with runs enabled.
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

test.describe("structure board with a scaffolded repo (/canvas/fixture-project)", () => {
  test("no CTA layer, and the skeleton frames render, when the prototype repo is present", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    await focusStructure(page);

    // The prototype repo is present (config points at the fixture prototype), so
    // structure renders the skeleton device frames, not the call-to-action.
    await expect(page.getByTestId("canvas-viewport")).toBeVisible();
    await expect(page.getByTestId("structure-cta")).toHaveCount(0);
    await expect(page.getByTestId("prototype-frames")).toBeVisible();
    const desktop = page.frameLocator('[data-frame-device="desktop"][data-route=""]');
    await expect(desktop.getByRole("heading", { name: "Overview" })).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("source structure + runs: the chrome shows a Refresh control and no empty CTA", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    // Post the refresh through the same run route the CTA uses; the status poll
    // reports a drafting structure pass so the running label can't be raced away.
    let runBody: unknown = null;
    await page.route("**/api/projects/run", async (route) => {
      runBody = route.request().postDataJSON();
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ slug: "fixture-project", stage: "structure", running: true }),
      });
    });
    await page.route("**/api/projects/status*", async (route) => {
      await route.fulfill({
        json: runBody
          ? { stage: "structure", state: "drafting", round: null, fence: null, progress: null }
          : { stage: null, state: null, fence: null, progress: null },
      });
    });

    await page.goto("/canvas/fixture-project?runs=1");
    await focusStructure(page);

    // The repo is present (flows.json source "structure"), so there is no empty
    // CTA, and the chrome offers a Refresh control instead of a Run one.
    await expect(page.getByTestId("structure-cta")).toHaveCount(0);
    const refresh = page.getByTestId("structure-refresh");
    await expect(refresh).toHaveText("Refresh structure");
    await refresh.click();

    // The click posts exactly {slug, stage} to the run route (reuses runStage).
    await expect.poll(() => runBody).toEqual({ slug: "fixture-project", stage: "structure" });

    // While it regenerates the button reads as refreshing and is disabled.
    await expect(refresh).toHaveText("Refreshing structure…");
    await expect(refresh).toBeDisabled();

    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("structure board whose repo build has taken over (/canvas/fixture-build)", () => {
  test("source build: no refresh affordance and no empty CTA, even with runs on", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-build?runs=1");
    await focusStructure(page);

    // The repo is present (so no empty CTA), but flows.json is source "build":
    // build owns the repo, so the board offers no refresh, even with runs on.
    await expect(page.getByTestId("canvas-viewport")).toBeVisible();
    await expect(page.getByTestId("structure-cta")).toHaveCount(0);
    await expect(page.getByTestId("structure-refresh")).toHaveCount(0);

    expect(errors, errors.join("\n")).toEqual([]);
  });
});
