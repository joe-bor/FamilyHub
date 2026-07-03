import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import {
  clearStorage,
  waitForHydration,
  waitForSheetSettled,
} from "./helpers/test-helpers";

test.describe("Mobile Lists", () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only tests");
    await page.goto("/");
    await clearStorage(page);
  });

  test("creates a grocery list, toggles categories, completes an item, and clears completed", async ({
    page,
    request,
  }) => {
    const registration = await registerFamily(request, {
      familyName: "Lists E2E Family",
      members: [{ name: "Alice", color: "coral" }],
    });
    await seedBrowserAuth(page, registration);

    await page.reload();
    await waitForHydration(page);

    const nav = page.getByRole("navigation", { name: /primary/i });
    await nav.getByRole("button", { name: "Lists" }).click();

    await expect(
      page.getByRole("heading", { name: "Lists", level: 1, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Create list" }).click();
    const createDialog = page.getByRole("dialog", { name: "New List" });
    await waitForSheetSettled(createDialog);
    await createDialog.getByLabel("List name").fill("Trader Joe's Run");
    await createDialog.getByRole("radio", { name: "Grocery" }).click();
    await createDialog.getByRole("button", { name: "Create list" }).click();

    await expect(
      page.getByRole("heading", { name: "Trader Joe's Run" }),
    ).toBeVisible();

    // On mobile the set-once controls live behind the "List options" sheet.
    const optionsSheet = page.getByRole("dialog", { name: "List options" });
    const openOptions = async () => {
      await page.getByRole("button", { name: "List options" }).click();
      await expect(optionsSheet).toBeVisible();
      return optionsSheet;
    };

    let options = await openOptions();
    await expect(
      options.getByRole("combobox", { name: "Categories", exact: true }),
    ).toHaveValue("grouped");
    await options.getByRole("button", { name: "Cancel" }).click();
    await expect(optionsSheet).toBeHidden();

    await page.getByRole("button", { name: "Add item" }).click();
    const addItemSheet = page.getByRole("dialog", { name: "Add Item" });
    await waitForSheetSettled(addItemSheet);
    const itemTextInput = addItemSheet.getByLabel("Item text");
    const itemCategorySelect = addItemSheet.getByRole("combobox", {
      name: "Category",
    });
    await itemCategorySelect.selectOption({ label: "Produce" });

    for (const itemText of ["Bananas", "Apples", "Carrots"]) {
      await itemTextInput.fill(itemText);
      await addItemSheet.getByRole("button", { name: "Save item" }).click();
      await expect(addItemSheet).toBeVisible();
      await expect(itemTextInput).toHaveValue("");
      await expect(itemTextInput).toBeFocused();
      await expect(itemCategorySelect.locator("option:checked")).toHaveText(
        "Produce",
      );
      await expect(
        addItemSheet.getByRole("button", { name: "Done" }),
      ).toBeVisible();
    }

    await addItemSheet.getByRole("button", { name: "Done" }).click();
    await expect(addItemSheet).toBeHidden();
    await expect(page.getByRole("heading", { name: "Produce" })).toBeVisible();
    await expect(page.getByText("Bananas")).toBeVisible();
    await expect(page.getByText("Apples")).toBeVisible();
    await expect(page.getByText("Carrots")).toBeVisible();

    // Switch the category mode immediately — the item create may still be in
    // flight, so the list-level PATCH response must not clobber the new item.
    options = await openOptions();
    await options
      .getByRole("combobox", { name: "Categories", exact: true })
      .selectOption("flat");
    await expect(page.getByRole("heading", { name: "Produce" })).toBeHidden();
    await options.getByRole("button", { name: "Cancel" }).click();
    await expect(optionsSheet).toBeHidden();
    await expect(page.getByText("Bananas")).toBeVisible();

    await page.getByRole("button", { name: /^Bananas$/ }).click();
    await expect(page.getByText("Bananas")).toHaveCSS(
      "text-decoration-line",
      "line-through",
    );

    // "Remove all completed" runs from inside the sheet, which stays open.
    options = await openOptions();
    await options.getByRole("button", { name: "Expand sheet" }).click();
    await waitForSheetSettled(options);
    await options.getByRole("button", { name: "Remove all completed" }).click();
    await expect(page.getByText("Bananas")).toBeHidden();
  });

  // ---------------------------------------------------------------------------
  // General list — managed categories full flow (Task 13, released BE 1.7.0)
  // ---------------------------------------------------------------------------

  test("General list: managed categories full flow against released BE", async ({
    page,
    request,
  }) => {
    // This intentionally exercises the full released-BE managed-category
    // workflow. It creates, renames, reorders, reloads, groups, deletes, and
    // recreates categories, so CI runners need more than the global e2e budget.
    test.setTimeout(120_000);

    const registration = await registerFamily(request, {
      familyName: "General Cat Family",
      members: [{ name: "Alice", color: "coral" }],
    });
    await seedBrowserAuth(page, registration);

    await page.reload();
    await waitForHydration(page);

    const nav = page.getByRole("navigation", { name: /primary/i });

    // Helper: navigate to Lists (needed after reload which drops SPA state)
    const goToLists = async () => {
      await nav.getByRole("button", { name: "Lists" }).click();
      await expect(
        page.getByRole("heading", { name: "Lists", level: 1, exact: true }),
      ).toBeVisible();
    };

    await goToLists();

    // -------------------------------------------------------------------------
    // 1. Create General list and confirm flat/empty catalog
    // -------------------------------------------------------------------------
    await page.getByRole("button", { name: "Create list" }).click();
    const createDialog = page.getByRole("dialog", { name: "New List" });
    await waitForSheetSettled(createDialog);
    await createDialog.getByLabel("List name").fill("My General List");
    await createDialog.getByRole("radio", { name: "General" }).click();
    await createDialog.getByRole("button", { name: "Create list" }).click();

    await expect(
      page.getByRole("heading", { name: "My General List" }),
    ).toBeVisible();

    // Open Options and verify the flat/empty catalog state:
    // General lists have no built-in categories (unlike Grocery),
    // so "Show categories" is disabled until the user creates one.
    const optionsSheet = page.getByRole("dialog", { name: "List options" });
    const openOptions = async () => {
      await page.getByRole("button", { name: "List options" }).click();
      await expect(optionsSheet).toBeVisible();
      return optionsSheet;
    };

    let options = await openOptions();
    const categoriesSelect = options.getByRole("combobox", {
      name: "Categories",
      exact: true,
    });
    await expect(categoriesSelect).toHaveValue("flat");
    // "Show categories" is disabled because no categories exist yet
    await expect(
      options.getByRole("option", { name: /Show categories/i }),
    ).toBeDisabled();

    // -------------------------------------------------------------------------
    // 2. Open Add Item, create "Documents" inline, keep draft, save assigned item
    // -------------------------------------------------------------------------
    // Close Options first by tapping outside / Cancel
    await options.getByRole("button", { name: "Cancel" }).click();
    await expect(optionsSheet).toBeHidden();

    // Open Add Item sheet
    const addItemFab = page.getByRole("button", { name: "Add item" });
    await expect(addItemFab).toBeVisible();
    await addItemFab.click();

    const addItemSheet = page.getByRole("dialog", { name: "Add Item" });
    await waitForSheetSettled(addItemSheet);

    // Fill item text — keep the draft alive while creating the category
    await addItemSheet.getByLabel("Item text").fill("Tax Returns");

    // Expand inline create
    await addItemSheet.getByRole("button", { name: "+ New category" }).click();
    await addItemSheet.getByLabel("Category name").fill("Documents");
    await addItemSheet.getByRole("button", { name: "Create category" }).click();

    // After inline create the new category should be auto-selected in the combobox.
    // Wait for the category to appear (mutation async)
    await expect(
      addItemSheet.locator("option", { hasText: "Documents" }),
    ).toBeAttached();

    // Save the item (draft text still present)
    await addItemSheet.getByRole("button", { name: "Save item" }).click();
    await expect(addItemSheet).toBeHidden();

    // Item is visible
    await expect(page.getByText("Tax Returns")).toBeVisible();

    // -------------------------------------------------------------------------
    // 3. Open Options → Manage categories → verify handoff + hardware back
    // -------------------------------------------------------------------------
    options = await openOptions();

    // The "Manage categories" button should now appear (categories exist)
    const manageCategoriesBtn = options.getByRole("button", {
      name: "Manage categories",
    });
    await expect(manageCategoriesBtn).toBeVisible();
    await manageCategoriesBtn.click();

    // Options sheet closes (handoff); manager opens after animation
    await expect(optionsSheet).toBeHidden();

    // Manager opens as a full-height mobile sheet
    const managerSheet = page.getByRole("dialog", {
      name: "General categories",
    });
    const closeManager = async () => {
      const closeButton = managerSheet
        .getByRole("button", { name: "Cancel" })
        .first();
      await expect(closeButton).toBeVisible();
      await closeButton.click();
      await expect(managerSheet).toBeHidden();
    };
    await waitForSheetSettled(managerSheet);
    await expect(managerSheet).toBeVisible();

    // Options is gone, manager is visible — verify Options has closed
    await expect(optionsSheet).toBeHidden();

    // Hardware back (Android back gesture / Escape) dismisses ONLY the manager
    await page.keyboard.press("Escape");
    await expect(managerSheet).toBeHidden();

    // The list detail view (heading) is still visible
    await expect(
      page.getByRole("heading", { name: "My General List" }),
    ).toBeVisible();

    // -------------------------------------------------------------------------
    // 4. Reopen manager, create 2nd category, reorder with arrows (zero PUTs),
    //    Save (one PUT), reload, verify order
    // -------------------------------------------------------------------------
    options = await openOptions();
    await options.getByRole("button", { name: "Manage categories" }).click();
    await expect(optionsSheet).toBeHidden();

    await waitForSheetSettled(managerSheet);

    // Add a second category
    await managerSheet.getByLabel("Category name").fill("Work");
    await managerSheet.getByRole("button", { name: "Add" }).click();

    // Wait for "Work" to appear in the list
    await expect(managerSheet.getByText("Work")).toBeVisible();

    // Enter reorder mode
    await managerSheet
      .getByRole("button", { name: "Reorder categories" })
      .click();

    // --- Reorder: assert zero PUTs to the order endpoint while moving ---
    let putCount = 0;
    const trackPut = (req: import("@playwright/test").Request) => {
      if (
        req.method() === "PUT" &&
        req.url().includes("/lists/categories/order")
      ) {
        putCount++;
      }
    };
    page.on("request", trackPut);

    // Move "Work" up (to position 1, before "Documents")
    // aria-label: "Move Work up"
    const moveWorkUp = managerSheet.getByRole("button", {
      name: "Move Work up",
    });
    await moveWorkUp.click();

    // Verify live-region position announcement
    const liveRegion = managerSheet.locator(
      '[role="status"][aria-live="polite"]',
    );
    await expect(liveRegion).toHaveText(/Work moved to position 1 of 2/i);

    // No PUT fired during arrow moves
    expect(putCount).toBe(0);
    page.off("request", trackPut);

    // --- Save sends exactly one PUT ---
    let savePutCount = 0;
    const trackSavePut = (req: import("@playwright/test").Request) => {
      if (
        req.method() === "PUT" &&
        req.url().includes("/lists/categories/order")
      ) {
        savePutCount++;
      }
    };
    page.on("request", trackSavePut);

    const saveBtn = managerSheet.getByRole("button", { name: "Save" });
    await saveBtn.click();

    // Wait for reorder mode to exit (Save button disappears)
    await expect(saveBtn).toBeHidden();

    // Exactly one PUT was sent
    expect(savePutCount).toBe(1);
    page.off("request", trackSavePut);

    // Close manager
    await closeManager();

    // Reload and re-navigate to Lists (mobile reload drops SPA to Home)
    await page.reload();
    await waitForHydration(page);
    await goToLists();

    // Re-open the list
    await page.getByRole("button", { name: "My General List" }).click();
    await expect(
      page.getByRole("heading", { name: "My General List" }),
    ).toBeVisible();

    // Re-open manager to verify persisted order (Work first, Documents second)
    options = await openOptions();
    await options.getByRole("button", { name: "Manage categories" }).click();
    await expect(optionsSheet).toBeHidden();

    await waitForSheetSettled(managerSheet);

    // Verify the saved order persisted: each category row exposes a
    // "Rename {name}" button, so the sequence of those accessible names reflects
    // row order. Reading the order by role/name proves persistence without
    // coupling to layout classes. A wrong order (or a degenerate empty match)
    // fails this assertion.
    const orderedCategoryNames = await managerSheet
      .getByRole("button", { name: /^Rename / })
      .evaluateAll((buttons) =>
        buttons.map((b) =>
          (b.getAttribute("aria-label") ?? "").replace(/^Rename /, ""),
        ),
      );
    expect(orderedCategoryNames).toEqual(["Work", "Documents"]);

    await closeManager();

    // -------------------------------------------------------------------------
    // 5. Keyboard accessibility: focus a move control, activate, assert focus +
    //    live announcement
    // -------------------------------------------------------------------------
    options = await openOptions();
    await options.getByRole("button", { name: "Manage categories" }).click();
    await expect(optionsSheet).toBeHidden();
    await waitForSheetSettled(managerSheet);

    // Enter reorder mode
    await managerSheet
      .getByRole("button", { name: "Reorder categories" })
      .click();

    // Measure move controls — both must be >= 44 CSS pixels in width and height
    const moveWorkUpBtn = managerSheet.getByRole("button", {
      name: "Move Work up",
    });
    const moveWorkDownBtn = managerSheet.getByRole("button", {
      name: "Move Work down",
    });

    const upBox = await moveWorkUpBtn.boundingBox();
    const downBox = await moveWorkDownBtn.boundingBox();

    expect(upBox).not.toBeNull();
    expect(downBox).not.toBeNull();
    // Work is first — up button is disabled but still measurable
    if (upBox) {
      expect(upBox.width).toBeGreaterThanOrEqual(44);
      expect(upBox.height).toBeGreaterThanOrEqual(44);
    }
    if (downBox) {
      expect(downBox.width).toBeGreaterThanOrEqual(44);
      expect(downBox.height).toBeGreaterThanOrEqual(44);
    }

    // Focus the Down button for Work (Work is first, so Down is enabled)
    // and activate via keyboard
    await moveWorkDownBtn.focus();
    await expect(moveWorkDownBtn).toBeFocused();
    await moveWorkDownBtn.press("Enter");

    // After pressing Enter, focus should move to the Up button (Work is now last,
    // so focus redirects to Up per the component's focusDir logic)
    const moveWorkUpAfterMove = managerSheet.getByRole("button", {
      name: "Move Work up",
    });
    await expect(moveWorkUpAfterMove).toBeFocused();

    // Live announcement reflects new position
    await expect(liveRegion).toHaveText(/Work moved to position 2 of 2/i);

    // Discard reorder changes
    await managerSheet.getByRole("button", { name: "Cancel" }).last().click();
    const discardDialog = page.getByRole("dialog", { name: "Discard order?" });
    await expect(discardDialog).toBeVisible();
    await discardDialog.getByRole("button", { name: "Discard order" }).click();
    await expect(discardDialog).toBeHidden();
    await expect(
      managerSheet.getByRole("button", { name: "Reorder categories" }),
    ).toBeVisible();
    await closeManager();

    // -------------------------------------------------------------------------
    // 6. Opt list into grouped mode; verify empty groups hidden, assigned item visible
    // -------------------------------------------------------------------------
    options = await openOptions();
    // "Show categories" is now enabled (categories exist)
    const catSelect = options.getByRole("combobox", {
      name: "Categories",
      exact: true,
    });
    await catSelect.selectOption("grouped");
    await options.getByRole("button", { name: "Cancel" }).click();
    await expect(optionsSheet).toBeHidden();

    // The list should now show the category heading for the item's category
    // (item "Tax Returns" is in "Documents")
    await expect(
      page.getByRole("heading", { name: "Documents" }),
    ).toBeVisible();
    await expect(page.getByText("Tax Returns")).toBeVisible();
    // "Work" has no items — its heading should not appear (empty groups hidden)
    await expect(page.getByRole("heading", { name: "Work" })).toBeHidden();

    // -------------------------------------------------------------------------
    // 7. Create a second General list and verify shared category catalog
    // -------------------------------------------------------------------------
    await page.getByRole("button", { name: "Back to Lists" }).click();
    await expect(
      page.getByRole("heading", { name: "Lists", level: 1, exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Create list" }).click();
    const createDialog2 = page.getByRole("dialog", { name: "New List" });
    await waitForSheetSettled(createDialog2);
    await createDialog2.getByLabel("List name").fill("Second General");
    await createDialog2.getByRole("radio", { name: "General" }).click();
    await createDialog2.getByRole("button", { name: "Create list" }).click();

    await expect(
      page.getByRole("heading", { name: "Second General" }),
    ).toBeVisible();

    // Open Add Item on the second list — the shared categories should be available
    await addItemFab.click();
    const addItemSheet2 = page.getByRole("dialog", { name: "Add Item" });
    await waitForSheetSettled(addItemSheet2);

    // Both categories from the first list are present
    await expect(
      addItemSheet2.locator("option", { hasText: "Work" }),
    ).toBeAttached();
    await expect(
      addItemSheet2.locator("option", { hasText: "Documents" }),
    ).toBeAttached();

    // The second list starts without grouped mode automatically.
    await addItemSheet2.getByRole("button", { name: "Cancel" }).click();
    await expect(addItemSheet2).toBeHidden();

    // -------------------------------------------------------------------------
    // 8. Rename a category and verify both list details converge
    // -------------------------------------------------------------------------
    // Open manager from the second list
    options = await openOptions();
    await options.getByRole("button", { name: "Manage categories" }).click();
    await expect(optionsSheet).toBeHidden();
    await waitForSheetSettled(managerSheet);

    // Rename "Documents" to "Docs"
    await managerSheet
      .getByRole("button", { name: "Rename Documents" })
      .click();
    const renameInput = managerSheet.getByLabel("Rename category");
    await renameInput.clear();
    await renameInput.fill("Docs");
    await managerSheet.getByRole("button", { name: "Save" }).click();

    // "Docs" should now appear in the manager
    await expect(managerSheet.getByText("Docs")).toBeVisible();

    await closeManager();

    // Navigate to the first list and verify rename is reflected
    await page.getByRole("button", { name: "Back to Lists" }).click();
    await page.getByRole("button", { name: "My General List" }).click();
    await expect(
      page.getByRole("heading", { name: "My General List" }),
    ).toBeVisible();

    // In grouped mode, the section heading should now say "Docs"
    await expect(page.getByRole("heading", { name: "Docs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Documents" })).toBeHidden();

    // -------------------------------------------------------------------------
    // 9. Delete a used category and verify authoritative success count + Uncategorized
    // -------------------------------------------------------------------------
    options = await openOptions();
    await options.getByRole("button", { name: "Manage categories" }).click();
    await expect(optionsSheet).toBeHidden();
    await waitForSheetSettled(managerSheet);

    await managerSheet.getByRole("button", { name: "Delete Docs" }).click();

    // Confirm dialog appears
    const confirmDialog = page.getByRole("dialog", {
      name: /Delete "Docs"\?/i,
    });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Delete" }).click();

    // Success toast with correct item count — "Tax Returns" (1 item) became Uncategorized
    await expect(
      page.getByText("Category deleted", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('"Docs" was deleted. 1 item became uncategorized.', {
        exact: true,
      }),
    ).toBeVisible();

    await closeManager();

    // The item now appears as Uncategorized (flat/no heading visible)
    await expect(page.getByText("Tax Returns")).toBeVisible();

    // -------------------------------------------------------------------------
    // 10. Delete final category → grouped General lists become flat; recreate and
    //     verify they remain flat
    // -------------------------------------------------------------------------
    options = await openOptions();
    await options.getByRole("button", { name: "Manage categories" }).click();
    await expect(optionsSheet).toBeHidden();
    await waitForSheetSettled(managerSheet);

    await managerSheet.getByRole("button", { name: "Delete Work" }).click();

    const confirmDialog2 = page.getByRole("dialog", {
      name: /Delete "Work"\?/i,
    });
    await expect(confirmDialog2).toBeVisible();
    await confirmDialog2.getByRole("button", { name: "Delete" }).click();

    // Toast mentions "lists switched to flat view" because this was the last
    // category for the General kind (both lists had grouped mode)
    await expect(
      page.getByText("Category deleted", { exact: true }),
    ).toBeVisible();

    await closeManager();

    // Both General lists now have no categories — grouping is moot.
    // The options select should show "flat" is now the effective mode (or
    // "grouped" is disabled since no categories remain)
    options = await openOptions();
    await expect(
      options.getByRole("option", { name: /Show categories/i }),
    ).toBeDisabled();
    await options.getByRole("button", { name: "Cancel" }).click();
    await expect(optionsSheet).toBeHidden();

    // Recreate a category and verify lists stay flat until the user opts in
    options = await openOptions();
    await options.getByRole("button", { name: "Manage categories" }).click();
    await expect(optionsSheet).toBeHidden();
    await waitForSheetSettled(managerSheet);

    await managerSheet.getByLabel("Category name").fill("Personal");
    await managerSheet.getByRole("button", { name: "Add" }).click();
    await expect(managerSheet.getByText("Personal")).toBeVisible();

    await closeManager();

    // Now "Show categories" is available but not auto-enabled for the list
    // The list should still be showing flat (no "Personal" heading visible)
    await expect(page.getByRole("heading", { name: "Personal" })).toBeHidden();
    await expect(page.getByText("Tax Returns")).toBeVisible();
  });
});
