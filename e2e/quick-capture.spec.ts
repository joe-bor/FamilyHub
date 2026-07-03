import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import {
  clearStorage,
  safeClick,
  waitForCalendarReady,
  waitForHydration,
  waitForSheetSettled,
} from "./helpers/test-helpers";

test.describe("Quick Capture Friction", () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only tests");
    await page.goto("/");
    await clearStorage(page);
  });

  test("adds three grocery items in one sheet session", async ({
    page,
    request,
  }) => {
    const registration = await registerFamily(request, {
      familyName: "QC Family",
      members: [{ name: "Joe", color: "teal" }],
    });
    await seedBrowserAuth(page, registration);

    await page.reload();
    await waitForHydration(page);

    const nav = page.getByRole("navigation", { name: /primary/i });
    await nav.getByRole("button", { name: "Lists" }).click();

    await expect(
      page.getByRole("heading", { name: "Lists", level: 1, exact: true }),
    ).toBeVisible();

    // Create a Grocery list — creating it navigates straight into its detail view.
    await page.getByRole("button", { name: "Create list" }).click();
    const createDialog = page.getByRole("dialog", { name: "New List" });
    await waitForSheetSettled(createDialog);
    await createDialog.getByLabel("List name").fill("Groceries");
    await createDialog.getByRole("radio", { name: "Grocery" }).click();
    await createDialog.getByRole("button", { name: "Create list" }).click();

    await expect(
      page.getByRole("heading", { name: "Groceries" }),
    ).toBeVisible();

    // Open the Add Item sheet and add three items in one session.
    await page.getByRole("button", { name: "Add item" }).click();
    const addItemSheet = page.getByRole("dialog", { name: "Add Item" });
    await waitForSheetSettled(addItemSheet);
    const itemTextInput = addItemSheet.getByLabel("Item text");

    for (const itemText of ["Milk", "Eggs", "Bananas"]) {
      await itemTextInput.fill(itemText);
      await addItemSheet.getByRole("button", { name: "Save item" }).click();
      // Multi-add sync point: the input clears and refocuses, and the sheet
      // stays open for the next item instead of closing.
      await expect(itemTextInput).toHaveValue("");
      await expect(addItemSheet).toBeVisible();
    }

    // After the first successful save the dismiss label flips to "Done".
    await addItemSheet.getByRole("button", { name: "Done" }).click();
    await expect(addItemSheet).toBeHidden();

    await expect(page.getByText("Milk")).toBeVisible();
    await expect(page.getByText("Eggs")).toBeVisible();
    await expect(page.getByText("Bananas")).toBeVisible();
  });

  test("creates an event with a location and shows it in the detail view", async ({
    page,
    request,
  }) => {
    const registration = await registerFamily(request, {
      familyName: "QC Family 2",
      members: [{ name: "Joe", color: "teal" }],
    });
    await seedBrowserAuth(page, registration);

    await page.reload();
    await waitForHydration(page);
    await waitForCalendarReady(page);

    // Create an event with a location revealed behind "Add details".
    await safeClick(page.getByRole("button", { name: "Add event" }));
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Event Name").fill("Swim class");
    await dialog.getByRole("button", { name: /add details/i }).click();
    await dialog.getByLabel("Location").fill("YMCA pool");

    await dialog.getByRole("button", { name: /^add event$/i }).click();
    await expect(dialog).toBeHidden();

    // Open the event's detail view and confirm the location renders.
    const eventCard = page.getByRole("button", { name: /swim class/i }).first();
    await safeClick(eventCard);
    await expect(page.getByRole("dialog")).toBeVisible();

    await expect(page.getByText("YMCA pool")).toBeVisible();
  });
});
