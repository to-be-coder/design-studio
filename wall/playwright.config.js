// @ts-check
// Config for the wall smoke suite (test/wall.spec.js). One worker: the suite
// starts a single real server in beforeAll and every test shares it.

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  reporter: 'list',
  use: {
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  },
});
