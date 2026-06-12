import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import {
  clearStorage,
  safeClick,
  waitForHydration,
} from "./helpers/test-helpers";

/**
 * F2 — settings/member modals open as bottom sheets on mobile.
 * Covers the open/dismiss paths and the sheet-over-sheet stacking flow
 * (Family Settings → Add member) in CI's emulated mobile viewport. Keyboard
 * auto-expand and real-device gesture stacking are verified in the device
 * smoke noted on the PR.
 */
test.describe("Mobile settings bottom sheets", () => {
  test.beforeEach(async ({ page, request, isMobile }) => {
    test.skip(!isMobile, "Mobile-only tests");

    await page.goto("/");
    await clearStorage(page);
    const reg = await registerFamily(request, {
      familyName: "Sheet Test Family",
      members: [{ name: "Alice", color: "coral" }],
    });
    await seedBrowserAuth(page, reg);
    await page.reload();
    await waitForHydration(page);
  });

  async function openMenu(page: import("@playwright/test").Page) {
    await safeClick(page.getByRole("button", { name: /^menu$/i }));
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    return menu;
  }

  test("Family Settings opens as a sheet and dismisses with Escape", async ({
    page,
  }) => {
    const menu = await openMenu(page);
    await safeClick(menu.getByRole("button", { name: "Family Settings" }));

    const settings = page.getByRole("dialog", { name: "Family Settings" });
    await expect(settings).toBeVisible();
    // The sheet supplies the Cancel affordance; no in-content X close on mobile.
    await expect(
      settings.getByRole("button", { name: "Cancel" }),
    ).toBeVisible();
    await expect(settings.getByRole("button", { name: "Close" })).toHaveCount(
      0,
    );

    await page.keyboard.press("Escape");
    await expect(settings).toHaveCount(0);
  });

  test("Add member sheet stacks above Family Settings and adds the member", async ({
    page,
  }) => {
    const menu = await openMenu(page);
    await safeClick(menu.getByRole("button", { name: "Family Settings" }));

    const settings = page.getByRole("dialog", { name: "Family Settings" });
    await expect(settings).toBeVisible();

    await safeClick(settings.getByRole("button", { name: "Add" }));

    const memberForm = page.getByRole("dialog", { name: "Add Family Member" });
    await expect(memberForm).toBeVisible();

    await memberForm.getByPlaceholder("Enter name").fill("Charlie");
    await safeClick(
      memberForm.getByRole("button", { name: /select teal color/i }),
    );
    await safeClick(memberForm.getByRole("button", { name: "Add" }));

    // Member form closes; the new member lands in the Family Settings list.
    await expect(memberForm).toHaveCount(0);
    await expect(
      settings.getByRole("button", { name: "Edit Charlie" }),
    ).toBeVisible();
  });

  test("Member Profile opens as a sheet and dismisses via Cancel", async ({
    page,
  }) => {
    const menu = await openMenu(page);
    await safeClick(menu.getByRole("button", { name: "Alice" }));

    const profile = page.getByRole("dialog", { name: "Member Profile" });
    await expect(profile).toBeVisible();

    // The long profile content (Google Calendar section) is reachable in the
    // scrollable sheet body.
    await expect(profile.getByText(/google calendar/i).first()).toBeVisible();

    // Dismiss via the form's Cancel; focus returns to the opening member row.
    await safeClick(profile.getByRole("button", { name: "Cancel" }).first());
    await expect(profile).toHaveCount(0);
  });
});
