import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import {
  clearStorage,
  waitForCalendarReady,
  waitForHydration,
} from "./helpers/test-helpers";

test.describe("Google Calendar Integration", () => {
  test.beforeEach(async ({ page, request }) => {
    await page.goto("/");
    await clearStorage(page);

    const reg = await registerFamily(request, {
      familyName: "Test Family",
      members: [{ name: "Alice", color: "coral" }],
    });
    await seedBrowserAuth(page, reg);

    await page.reload();
    await waitForHydration(page);
    await waitForCalendarReady(page);
  });

  test("member profile shows Google Calendar section", async ({ page }) => {
    // Open sidebar
    await page.getByRole("button", { name: "Menu" }).click();
    const sidebar = page.getByRole("dialog", { name: "Menu" });
    await expect(sidebar).toBeVisible();

    // Click on member name to open profile
    await sidebar.getByText("Alice").click();

    // Verify Google Calendar section is visible
    await expect(
      page.getByText("Google Calendar", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /connect google calendar/i }),
    ).toBeVisible();
  });

  test("connect button is disabled without email", async ({ page }) => {
    await page.getByRole("button", { name: "Menu" }).click();
    const sidebar = page.getByRole("dialog", { name: "Menu" });
    await expect(sidebar).toBeVisible();
    await sidebar.getByText("Alice").click();

    const connectButton = page.getByRole("button", {
      name: /connect google calendar/i,
    });
    await expect(connectButton).toBeDisabled();
    await expect(page.getByText(/add an email/i)).toBeVisible();
  });

  test("event form has collapsible details field", async ({ page }) => {
    // Open add event modal
    await page.getByRole("button", { name: /add event/i }).click();

    // Details should be collapsed
    await expect(page.getByText(/add details/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).not.toBeVisible();

    // Expand it
    await page.getByText(/add details/i).click();
    await expect(page.getByLabel(/description/i)).toBeVisible();
  });
});
