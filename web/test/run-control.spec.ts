import { test, expect, type Page } from "@playwright/test";

/**
 * Slice: the Render control (§9) — the canvas starting a project's own dev
 * server. Hermetic: the fixture-runnable project's `run` command boots the
 * trivial test/fixtures/tiny-server.mjs (argv, no shell), NOT real thunderbolt.
 *
 * Proven here:
 *   - a runnable project shows a Render button and does NOT auto-start;
 *   - clicking it starts the server, transitions to ready, and the live frame
 *     mounts (the real proxied page);
 *   - Stop tears it back down to the Render control;
 *   - a non-runnable project shows no Render button (frames mount directly).
 *
 * Serial: all these tests drive the one shared server process for this slug, so
 * they must run in declaration order (stopped → started → stopped).
 */
test.describe.configure({ mode: "serial" });

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

async function flyToBuild(page: Page) {
  await page.getByRole("option", { name: "Build", exact: true }).click();
}

test.describe("render control (/canvas/fixture-runnable)", () => {
  test.afterAll(async ({ request }) => {
    // Never leak the spawned dev server across runs.
    await request.post("/api/prototype-run", { data: { slug: "fixture-runnable", action: "stop" } });
  });

  test("a runnable project shows Render and never auto-starts", async ({ page, request }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-runnable");
    await flyToBuild(page);

    // The Render control is shown — not the empty state, not live frames yet.
    const control = page.getByTestId("prototype-render");
    await expect(control).toBeVisible();
    await expect(page.getByTestId("render-start")).toBeVisible();
    await expect(page.getByTestId("prototype-frames")).toHaveCount(0);

    // No auto-start: the server-side status is still stopped after load.
    const status = await request.get("/api/prototype-run?slug=fixture-runnable");
    expect(status.ok()).toBeTruthy();
    expect((await status.json()).state).toBe("stopped");

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("clicking Render starts the server, reaches ready, and mounts the live frame", async ({
    page,
  }) => {
    await page.goto("/canvas/fixture-runnable");
    await flyToBuild(page);

    await page.getByTestId("render-start").click();

    // The live frames replace the control once the server reports ready.
    await expect(page.getByTestId("prototype-frames")).toBeVisible({ timeout: 40_000 });

    // The mounted frame is the real proxied page from the tiny dev server.
    const desktop = page.frameLocator('[data-frame-device="desktop"][data-route=""]');
    await expect(desktop.getByRole("heading", { name: "Runnable Fixture Home" })).toBeVisible({
      timeout: 15_000,
    });

    // A Stop control is present while the server runs.
    await expect(page.getByTestId("render-stop")).toBeVisible();
  });

  test("Stop tears the server back down to the Render control", async ({ page, request }) => {
    // The previous test left the server ready; opening the board hands straight
    // to the live frames (status persists in the one server process).
    await page.goto("/canvas/fixture-runnable");
    await flyToBuild(page);
    await expect(page.getByTestId("render-stop")).toBeVisible({ timeout: 40_000 });

    await page.getByTestId("render-stop").click();

    // Back to the Render control, with a fresh Render button.
    await expect(page.getByTestId("prototype-render")).toBeVisible();
    await expect(page.getByTestId("render-start")).toBeVisible();

    // Server-side confirms it's stopped.
    const status = await request.get("/api/prototype-run?slug=fixture-runnable");
    expect((await status.json()).state).toBe("stopped");
  });
});

test.describe("non-runnable project shows no Render control (/canvas/fixture-project)", () => {
  test("the static fixture mounts frames directly, with no Render button", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    await flyToBuild(page);

    // Frames mount directly (no server to start) and there is no Render control.
    await expect(page.getByTestId("prototype-frames")).toBeVisible();
    await expect(page.getByTestId("prototype-render")).toHaveCount(0);
    await expect(page.getByTestId("render-start")).toHaveCount(0);

    expect(errors, errors.join("\n")).toEqual([]);
  });
});
