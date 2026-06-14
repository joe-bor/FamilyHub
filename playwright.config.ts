import { defineConfig, devices } from "@playwright/test";

// Offline persistence (Option C) runs against the production build + preview
// server (service worker + IndexedDB persistence), not the dev server. It lives
// in its own project/port; the dev-server projects below skip it.
const OFFLINE_SPEC = "**/offline-persistence.spec.ts";

// Full browser matrix - runs on all CI builds and locally (dev server, 5173).
const projects = [
  {
    name: "chromium",
    testIgnore: OFFLINE_SPEC,
    use: { ...devices["Desktop Chrome"] },
  },
  {
    name: "firefox",
    testIgnore: OFFLINE_SPEC,
    use: { ...devices["Desktop Firefox"] },
  },
  {
    name: "webkit",
    testIgnore: OFFLINE_SPEC,
    use: { ...devices["Desktop Safari"] },
  },
  {
    name: "Mobile Chrome",
    testIgnore: OFFLINE_SPEC,
    use: {
      ...devices["iPhone 14"],
      // Extended action timeout for mobile - touch interactions can be slower
      actionTimeout: 20000,
    },
  },
  // Offline reads: production build served by `vite preview` on port 4173.
  {
    name: "offline-persistence",
    testMatch: OFFLINE_SPEC,
    use: {
      ...devices["Desktop Chrome"],
      baseURL: "http://localhost:4173",
    },
  },
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "html",
  timeout: process.env.CI ? 60000 : 30000,
  expect: {
    timeout: process.env.CI ? 10000 : 5000,
  },
  use: {
    baseURL: "http://localhost:5173",
    // Always use reduced motion for consistent behavior locally and in CI
    reducedMotion: "reduce",
    // Global action timeout for individual actions (click, fill, etc.)
    actionTimeout: process.env.CI ? 15000 : 10000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects,
  webServer: [
    {
      command: "npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_E2E: "true",
      },
    },
    {
      // Build then preview so the offline spec exercises the real service worker
      // and IndexedDB persistence. `--strictPort` fails fast if 4173 is taken.
      command: "npm run build && npm run preview -- --port 4173 --strictPort",
      url: "http://localhost:4173",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        VITE_E2E: "true",
      },
    },
  ],
});
