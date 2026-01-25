import { defineConfig, devices } from "@playwright/test";

// Full browser matrix - runs on all CI builds and locally
const projects = [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  { name: "webkit", use: { ...devices["Desktop Safari"] } },
  {
    name: "mobile-chrome",
    use: {
      ...devices["iPhone 14"],
      // Extended action timeout for mobile - touch interactions can be slower
      actionTimeout: 20000,
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
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_E2E: "true",
    },
  },
});
