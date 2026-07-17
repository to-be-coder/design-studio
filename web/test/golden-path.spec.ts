import { test, expect, type Page } from "@playwright/test";

/**
 * The golden path (Acceptance section of the spec), automated against the
 * hermetic fixture vault as ONE test: open the canvas → read the whole flow
 * (framing → research → register → scope → directions → decision stream with a
 * supersede chain) using the keyboard sidebar index ALONE, focus visibly moving
 * → expand the design-system board → annotate a prototype element at component
 * scope with a token tweak → copy the export → assert it names the component,
 * the instance count, the scope, and the routing protocol.
 *
 * This is the reviewer's real walkthrough, keyboard-first for the reading half
 * (§14 a11y: every card reachable without a drag), pointer for the markup half.
 */

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("golden path (/canvas/fixture-project)", () => {
  test.use({ viewport: { width: 1600, height: 1000 } });

  test("read the flow via the sidebar, expand the DS board, annotate + export", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // The default board is Debrief (a document); the sidebar names the project.
    // The full h1 project header appears on the canvas boards below.
    await expect(page.getByTestId("sidebar")).toContainText("Fixture Project");

    // ── Reading half: the sidebar index (stages + folded-in documents) ────────
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toBeVisible();
    const pane = page.getByTestId("doc-view");

    // Keyboard reachability: the index is arrow-navigable (first item focusable).
    await sidebar.getByRole("option").first().focus();
    await expect(sidebar.getByRole("option").first()).toBeFocused();

    // The canvas lands on What's Worth Building (the compiled verdict).
    await expect(page.getByTestId("wwb-pane")).toBeVisible();

    // 0 · Debrief → the document reader (off the canvas). Its documents are folded
    // into the sidebar as an accordion (no middle contents column). Selecting the
    // reframe swaps the pane; the guiding principle reads large.
    await sidebar.getByRole("option", { name: "Debrief", exact: true }).click();
    await expect(pane).toBeVisible();
    await expect(page.getByTestId("doc-contents")).toHaveCount(0);
    await expect(page.getByTestId("framing-transform")).toHaveCount(0);
    await sidebar.getByRole("option", { name: "Problem statement" }).click();
    await expect(pane).toContainText(/trustworthy evidence/i);
    await sidebar.getByRole("option", { name: "Guiding principle" }).click();
    await expect(pane).toContainText("Assert what users see.");

    // 1 · Research → also a reader: each artifact is its own document, and — since
    // verify folded into research (decision 0018) — the assumption register is a
    // document too. Selecting the synthesis, then the register, swaps the pane.
    await sidebar.getByRole("option", { name: "Research", exact: true }).click();
    await expect(pane).toBeVisible();
    await sidebar.getByRole("option", { name: "Synthesis" }).click();
    await expect(
      page.getByText("the artifact and the decision that shaped it live", { exact: false }),
    ).toBeVisible();
    await sidebar.getByRole("option", { name: "Assumptions & risks" }).click();
    await expect(page.locator("#assumption-A1")).toBeVisible();

    // 2 · Structure → the scaffolded skeleton renders as device frames; a nav
    // link inside a frame clicks through to a sibling page (same frameLocator
    // idiom as the build step below).
    await sidebar.getByRole("option", { name: "Structure", exact: true }).click();
    const structureDesktop = page.frameLocator('[data-frame-device="desktop"][data-route=""]');
    await expect(structureDesktop.getByRole("heading", { name: "Overview" })).toBeVisible();
    await structureDesktop.getByRole("link", { name: "Reports" }).click();
    await expect(structureDesktop.getByRole("heading", { name: "Reports" })).toBeVisible();

    // 3 · Design system → its living-specimen board.
    await sidebar.getByRole("option", { name: "Design system", exact: true }).click();
    const dsBoard = page.getByTestId("design-system-board");
    await expect(dsBoard).toBeVisible();
    await expect(dsBoard.locator('[data-component-base="button"]')).toBeVisible();
    await expect(page.getByTestId("contrast-ratio").first()).toBeVisible();

    // 5 · Decision stream → reads as a scrollable document; the supersede chain is
    // an in-page link, the retired entry stays in place.
    await sidebar.getByRole("option", { name: "Decision stream", exact: true }).click();
    const superseded = page.locator("#d-0008");
    await expect(superseded).toBeVisible();
    await expect(superseded).toHaveAttribute("data-superseded", "true");
    await expect(superseded.getByRole("link", { name: /superseded by 0009/i })).toBeVisible();

    // ── Markup half: annotate a real component at component scope, then export ─
    await page.getByRole("option", { name: "Build", exact: true }).click();
    const desktop = page.frameLocator('[data-frame-device="desktop"][data-route=""]');
    await expect(desktop.getByRole("heading", { name: "Overview" })).toBeVisible();
    await page.getByRole("button", { name: "Zoom to fit" }).click();
    await page.waitForTimeout(500);

    await page.getByTestId("mode-comment").click();
    await desktop.getByTestId("cta-primary").click();

    const draft = page.getByTestId("comment-draft");
    await expect(draft).toBeVisible();
    // A matched component defaults to component scope, with a live instance count.
    await expect(draft.getByTestId("scope-component")).toBeChecked();
    await expect(draft.getByTestId("scope-instance-count")).toContainText(/instance/i);

    await draft.getByTestId("comment-note").fill("Primary action wants a calmer color");
    await draft.getByTestId("tweak-color").selectOption({ index: 1 });
    await expect(draft.getByTestId("tweak-specs")).toBeVisible();

    await draft.getByTestId("comment-save").click();
    await expect(page.getByTestId("comment-draft")).toHaveCount(0);
    await expect(desktop.locator('[data-testid="pin"]').first()).toBeVisible();

    await page.getByTestId("export-feedback").click();
    await expect(page.getByTestId("export-status")).toContainText("Copied");
    const clip = await page.evaluate(() => navigator.clipboard.readText());

    // The export names the component, the instance count, the scope, and the
    // routing protocol — the four things the acceptance test demands.
    expect(clip).toContain("button"); // the component
    expect(clip).toMatch(/\d+ instances? across \d+ routes?/i); // the instance count
    expect(clip).toMatch(/Scope:/); // the scope
    expect(clip).toContain("Routing protocol"); // the routing protocol
    expect(clip).toMatch(/smallest unit that is reusable/i);
    // The close names both consumers: build's next round, or — after build —
    // research's evaluate/reconcile moves (validate dissolved, decision 0027).
    expect(clip).toContain("design-studio-build");
    expect(clip).toContain("design-studio-research");

    expect(errors, `console/page errors on golden path:\n${errors.join("\n")}`).toEqual([]);
  });
});
