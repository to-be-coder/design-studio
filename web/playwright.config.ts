import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

/**
 * E2E smoke suite for the design-studio dashboard.
 *
 * Fixture vault: a hermetic, contract-correct vault under test/fixtures/vault
 * (shape mirrors skills/design-studio-shared/CONVENTIONS.md) so these tests
 * never touch a developer's real Obsidian vault. It's wired in via
 * DESIGN_STUDIO_VAULT, which src/lib/vault.ts resolves before falling back to
 * ~/.design-studio-vault.
 *
 * webServer choice: `next build && next start` (production server), not
 * `next dev`. This is the same build web-checks.yml already runs (so a
 * broken build fails there before Playwright even starts), and a built
 * server starts deterministically — no dev-mode HMR/on-demand-compile
 * timing to make the suite flaky in CI. The cost is a slower local loop
 * (a full build per run); that's an acceptable trade for CI reliability.
 *
 * DESIGN_STUDIO_VAULT: honors an already-set env var (same precedence as
 * vault.ts itself) so CI can set it explicitly; otherwise defaults to the
 * fixture vault checked in beside this config.
 */
const FIXTURE_VAULT = path.resolve(__dirname, "test/fixtures/vault");
const VAULT = process.env.DESIGN_STUDIO_VAULT?.trim() || FIXTURE_VAULT;
const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./test",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DESIGN_STUDIO_VAULT: VAULT,
    },
  },
});
