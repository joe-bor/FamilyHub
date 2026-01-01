import { defineConfig, devices } from "@playwright/test";

// Full browser matrix for thorough testing
const allBrowsers = [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  { name: "webkit", use: { ...devices["Desktop Safari"] } },
  { name: "mobile-chrome", use: { ...devices["iPhone 14"] } },
];

// Chromium-only for fast PR checks
const chromiumOnly = [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
];

// Use full matrix on main branch, chromium-only on PRs
const isMainBranch = process.env.GITHUB_REF === "refs/heads/main";
const projects = process.env.CI && !isMainBranch ? chromiumOnly : allBrowsers;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
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
