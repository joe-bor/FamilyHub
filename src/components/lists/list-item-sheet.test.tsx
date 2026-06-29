/**
 * Tests for ListItemSheet — Task 12: inline category create-and-select + 404 recovery.
 *
 * Coverage:
 *   - Category selection for every list kind (grocery, to-do, general)
 *   - Inline "New category" expands inside sheet; does NOT open a new overlay
 *   - Successful create selects returned ID without touching text/other draft fields
 *   - Create failure (400/409) preserves draft + category name + shows error adjacent
 *   - Later item-save failure keeps the created category and selection
 *   - Offline: hides/disables New Category with explanatory copy
 *   - Item-save 404 recovery (4 branches in order):
 *       1. refetch returns list 404  → list-not-found message
 *       2. refetch ok, edited item missing (edit mode only) → item-not-found message
 *       3. selected category missing → null categoryId, save-again message, text preserved
 *       4. list/item/category all present → preserve draft, show original error
 */

import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListDetail } from "@/lib/types";
import {
  API_BASE,
  seedMockLists,
  server,
  setupMswServer,
} from "@/test/mocks/server";
import { renderWithUser, screen, waitFor } from "@/test/test-utils";
import { ListItemSheet } from "./list-item-sheet";

// ---------------------------------------------------------------------------
// Mock online status — tests override `online` before each test.
// vi.mock is hoisted to the top of the file automatically.
// ---------------------------------------------------------------------------

let online = true;
vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return { ...actual, useOnlineStatus: () => online };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const LIST_ID = "00000000-0000-4000-8000-000000000101";
const ITEM_ID = "00000000-0000-4000-8000-000000000201";
const CAT_A_ID = "00000000-0000-4000-8000-000000000301";
const CAT_B_ID = "00000000-0000-4000-8000-000000000302";

function makeList(overrides: Partial<ListDetail> = {}): ListDetail {
  return {
    id: LIST_ID,
    name: "My List",
    kind: "grocery",
    categoryDisplayMode: "grouped",
    showCompletedOverride: null,
    categories: [
      { id: CAT_A_ID, kind: "grocery", name: "Produce", sortOrder: 0 },
      { id: CAT_B_ID, kind: "grocery", name: "Dairy", sortOrder: 1 },
    ],
    items: [],
    createdAt: "2026-05-06T09:00:00",
    updatedAt: "2026-05-06T09:00:00",
    ...overrides,
  };
}

const baseItem = {
  id: ITEM_ID,
  text: "Bananas",
  completed: false,
  completedAt: null as null,
  categoryId: CAT_A_ID,
  createdAt: "2026-05-06T09:05:00",
  updatedAt: "2026-05-06T09:05:00",
};

setupMswServer();

beforeEach(() => {
  online = true;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSheet(
  props: {
    open?: boolean;
    mode?: "create" | "edit";
    list?: ListDetail;
    item?: typeof baseItem | null;
    onOpenChange?: (open: boolean) => void;
  } = {},
) {
  const {
    open = true,
    mode = "create",
    list = makeList(),
    item = null,
    onOpenChange = vi.fn(),
  } = props;
  seedMockLists([list]);
  return renderWithUser(
    <ListItemSheet
      open={open}
      mode={mode}
      list={list}
      item={item}
      onOpenChange={onOpenChange}
    />,
  );
}

// ---------------------------------------------------------------------------
// Category selection for all list kinds
// ---------------------------------------------------------------------------

describe("category selection for all list kinds", () => {
  it("shows the category combobox for a grocery list", async () => {
    renderSheet({ list: makeList({ kind: "grocery" }) });
    const select = await screen.findByRole("combobox", { name: /category/i });
    expect(select).toBeInTheDocument();
  });

  it("shows the category combobox for a to-do list", async () => {
    renderSheet({
      list: makeList({
        kind: "to-do",
        categories: [
          { id: CAT_A_ID, kind: "to-do", name: "Urgent", sortOrder: 0 },
        ],
      }),
    });
    const select = await screen.findByRole("combobox", { name: /category/i });
    expect(select).toBeInTheDocument();
  });

  it("shows the category combobox for a general list", async () => {
    renderSheet({
      list: makeList({
        kind: "general",
        categories: [],
        categoryDisplayMode: "flat",
      }),
    });
    const select = await screen.findByRole("combobox", { name: /category/i });
    expect(select).toBeInTheDocument();
  });

  it("includes Uncategorized option and list categories", async () => {
    renderSheet();
    const select = await screen.findByRole("combobox", { name: /category/i });
    const options = Array.from(select.querySelectorAll("option")).map(
      (o) => o.textContent,
    );
    expect(options).toContain("Uncategorized");
    expect(options).toContain("Produce");
    expect(options).toContain("Dairy");
  });
});

// ---------------------------------------------------------------------------
// Inline New Category
// ---------------------------------------------------------------------------

describe("inline New Category expand/collapse", () => {
  it("renders a '+ New category' button when online", async () => {
    renderSheet();
    expect(
      await screen.findByRole("button", { name: /new category/i }),
    ).toBeInTheDocument();
  });

  it("expands an inline name input inside the sheet (no second sheet/overlay opened)", async () => {
    const { user } = renderSheet();
    await user.click(
      await screen.findByRole("button", { name: /new category/i }),
    );
    // Inline input should appear inside the existing form
    const nameInput = await screen.findByRole("textbox", {
      name: /category name/i,
    });
    expect(nameInput).toBeInTheDocument();
    // Only ONE dialog (the vaul sheet itself) exists — not a second overlay
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("successful create selects returned category ID and clears inline field without touching item text", async () => {
    const { user } = renderSheet();
    // Type item text first
    const textInput = screen.getByRole("textbox", { name: /item text/i });
    await user.type(textInput, "Spinach");

    // Expand inline create
    await user.click(
      await screen.findByRole("button", { name: /new category/i }),
    );
    const nameInput = await screen.findByRole("textbox", {
      name: /category name/i,
    });
    await user.type(nameInput, "Bulk");

    // Submit the inline create
    await user.click(screen.getByRole("button", { name: /create category/i }));

    // Wait for the category to appear in the select (after cache update)
    await waitFor(() => {
      const select = screen.getByRole("combobox", { name: /category/i });
      const options = Array.from(select.querySelectorAll("option")).map(
        (o) => o.textContent,
      );
      expect(options).toContain("Bulk");
    });

    // The select should have the new category selected
    await waitFor(() => {
      const select = screen.getByRole("combobox", { name: /category/i });
      const selectedOption = select.querySelector("option:checked");
      expect(selectedOption?.textContent).toBe("Bulk");
    });

    // Item text should be untouched
    expect(screen.getByRole("textbox", { name: /item text/i })).toHaveValue(
      "Spinach",
    );

    // Inline name field should be gone (collapsed)
    expect(
      screen.queryByRole("textbox", { name: /category name/i }),
    ).not.toBeInTheDocument();
  });

  it("create failure (409 duplicate) preserves item draft and category name with error adjacent", async () => {
    const { user } = renderSheet();
    // Type item text
    const textInput = screen.getByRole("textbox", { name: /item text/i });
    await user.type(textInput, "Avocado");

    // Open inline create and type a duplicate category name
    await user.click(
      await screen.findByRole("button", { name: /new category/i }),
    );
    const nameInput = await screen.findByRole("textbox", {
      name: /category name/i,
    });
    await user.type(nameInput, "Produce"); // already exists → 409

    await user.click(screen.getByRole("button", { name: /create category/i }));

    // Error should appear adjacent to the name field
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /already exists|duplicate/i,
      );
    });

    // Inline field stays open with the typed name preserved
    expect(screen.getByRole("textbox", { name: /category name/i })).toHaveValue(
      "Produce",
    );

    // Item text preserved
    expect(screen.getByRole("textbox", { name: /item text/i })).toHaveValue(
      "Avocado",
    );
  });

  it("create failure (400) preserves item draft and category name with error adjacent", async () => {
    server.use(
      http.post(`${API_BASE}/lists/categories`, () =>
        HttpResponse.json(
          { message: "Category name is required" },
          { status: 400 },
        ),
      ),
    );
    const { user } = renderSheet();
    const textInput = screen.getByRole("textbox", { name: /item text/i });
    await user.type(textInput, "Pears");

    await user.click(
      await screen.findByRole("button", { name: /new category/i }),
    );
    const nameInput = await screen.findByRole("textbox", {
      name: /category name/i,
    });
    await user.type(nameInput, "Fruit");

    await user.click(screen.getByRole("button", { name: /create category/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/required|name/i);
    });

    // Draft preserved
    expect(screen.getByRole("textbox", { name: /item text/i })).toHaveValue(
      "Pears",
    );
    expect(screen.getByRole("textbox", { name: /category name/i })).toHaveValue(
      "Fruit",
    );
  });

  it("inline name state resets when a NEW item cycle opens but not on re-render within cycle", async () => {
    // We test that opening a fresh item (open becomes true again) resets the inline name.
    // Simulate a full open → close → open cycle.
    const onOpenChange = vi.fn();
    const list = makeList();
    seedMockLists([list]);

    const { user, rerender } = renderWithUser(
      <ListItemSheet
        open={true}
        mode="create"
        list={list}
        item={null}
        onOpenChange={onOpenChange}
      />,
    );

    // Expand inline and type something
    await user.click(
      await screen.findByRole("button", { name: /new category/i }),
    );
    const nameInput = await screen.findByRole("textbox", {
      name: /category name/i,
    });
    await user.type(nameInput, "Partial");

    // Re-render with open=false (close)
    rerender(
      <ListItemSheet
        open={false}
        mode="create"
        list={list}
        item={null}
        onOpenChange={onOpenChange}
      />,
    );

    // Re-render with open=true (new cycle)
    rerender(
      <ListItemSheet
        open={true}
        mode="create"
        list={list}
        item={null}
        onOpenChange={onOpenChange}
      />,
    );

    // Inline field should not exist (collapsed on new open cycle)
    expect(
      screen.queryByRole("textbox", { name: /category name/i }),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Offline: New Category disabled
// ---------------------------------------------------------------------------

describe("offline: New Category affordance", () => {
  it("hides or disables New Category with explanatory copy when offline", async () => {
    online = false;
    renderSheet();
    // Either the button is absent or disabled
    const newCatButton = screen.queryByRole("button", {
      name: /new category/i,
    });
    if (newCatButton) {
      expect(newCatButton).toBeDisabled();
    }
    // Explanatory copy about needing connectivity
    expect(
      await screen.findByText(/connect|internet|online/i),
    ).toBeInTheDocument();
  });

  it("category select itself remains usable when offline (existing options still work)", async () => {
    online = false;
    renderSheet();
    const select = await screen.findByRole("combobox", { name: /category/i });
    // Should not be disabled
    expect(select).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Item-save 404 recovery — 4 ordered branches
// ---------------------------------------------------------------------------

describe("item-save 404 recovery", () => {
  /**
   * Helper: render in edit mode with the base item, force the item PATCH to
   * return a 404, override what GET /lists/:id returns in the recovery step.
   */
  async function setupEditWithPatch404(
    recoveryListResponse: HttpResponse | null, // null → also 404 for list
    listForRender?: ListDetail,
  ) {
    const list = listForRender ?? makeList();
    const itemWithCategory = { ...baseItem, categoryId: CAT_A_ID };
    list.items.push(itemWithCategory);
    seedMockLists([list]);

    // Force item PATCH to 404
    server.use(
      http.patch(`${API_BASE}/lists/${LIST_ID}/items/${ITEM_ID}`, () =>
        HttpResponse.json({ message: "Item not found" }, { status: 404 }),
      ),
    );

    // Force GET /lists/:id to return our recovery response
    if (recoveryListResponse === null) {
      server.use(
        http.get(`${API_BASE}/lists/${LIST_ID}`, () =>
          HttpResponse.json({ message: "List not found" }, { status: 404 }),
        ),
      );
    } else {
      server.use(
        http.get(`${API_BASE}/lists/${LIST_ID}`, () => recoveryListResponse),
      );
    }

    const result = renderSheet({
      mode: "edit",
      list,
      item: itemWithCategory,
    });

    return result;
  }

  it("branch 1: refetch returns list 404 → shows list-not-found message, never drops text", async () => {
    const { user } = await setupEditWithPatch404(null);

    // Submit the edit
    const saveBtn = screen.getByRole("button", { name: /save item/i });
    await user.click(saveBtn);

    // List-gone error should appear
    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      const messages = alerts.map((a) => a.textContent ?? "");
      expect(
        messages.some((m) => /list|no longer available|deleted/i.test(m)),
      ).toBe(true);
    });

    // Text still in the field
    expect(screen.getByRole("textbox", { name: /item text/i })).toHaveValue(
      "Bananas",
    );
  });

  it("branch 2 (edit mode): refetch ok but edited item is absent → shows item-not-found message", async () => {
    // Recovery list: list is present but the item is gone
    const recoveryList: ListDetail = makeList({
      items: [], // item absent
    });
    const recoveryResponse = HttpResponse.json({
      data: recoveryList,
    });

    const { user } = await setupEditWithPatch404(recoveryResponse);

    const saveBtn = screen.getByRole("button", { name: /save item/i });
    await user.click(saveBtn);

    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      const messages = alerts.map((a) => a.textContent ?? "");
      expect(
        messages.some((m) => /item|no longer available|deleted/i.test(m)),
      ).toBe(true);
    });

    expect(screen.getByRole("textbox", { name: /item text/i })).toHaveValue(
      "Bananas",
    );
  });

  it("branch 3: selected category is absent in refetched list → nulls categoryId and asks user to save again", async () => {
    // Recovery list: list and item both present, but CAT_A_ID is gone from categories
    const recoveryItem = { ...baseItem, categoryId: CAT_A_ID };
    const recoveryList: ListDetail = makeList({
      categories: [
        // only CAT_B_ID remains; CAT_A_ID (the selected one) is gone
        { id: CAT_B_ID, kind: "grocery", name: "Dairy", sortOrder: 0 },
      ],
      items: [recoveryItem],
    });
    const recoveryResponse = HttpResponse.json({ data: recoveryList });

    const { user } = await setupEditWithPatch404(recoveryResponse);

    const saveBtn = screen.getByRole("button", { name: /save item/i });
    await user.click(saveBtn);

    // Should show a message asking the user to save again
    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      const messages = alerts.map((a) => a.textContent ?? "");
      expect(
        messages.some((m) =>
          /save again|category.*removed|category.*deleted/i.test(m),
        ),
      ).toBe(true);
    });

    // Category select should be reset to Uncategorized
    await waitFor(() => {
      const select = screen.getByRole("combobox", { name: /category/i });
      expect((select as HTMLSelectElement).value).toBe("");
    });

    // Text must be preserved
    expect(screen.getByRole("textbox", { name: /item text/i })).toHaveValue(
      "Bananas",
    );
  });

  it("branch 4: list, item, and category all present → preserves draft and shows original error", async () => {
    // Recovery list: everything still there
    const recoveryItem = { ...baseItem, categoryId: CAT_A_ID };
    const recoveryList: ListDetail = makeList({ items: [recoveryItem] });
    const recoveryResponse = HttpResponse.json({ data: recoveryList });

    const { user } = await setupEditWithPatch404(recoveryResponse);

    const saveBtn = screen.getByRole("button", { name: /save item/i });
    await user.click(saveBtn);

    // Original error should be surfaced (the PATCH 404 message)
    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      const messages = alerts.map((a) => a.textContent ?? "");
      // It shows the original PATCH error message
      expect(messages.some((m) => m.length > 0)).toBe(true);
    });

    // It does NOT show "list is no longer available" (list-gone branch)
    const alerts = screen.getAllByRole("alert");
    const messages = alerts.map((a) => a.textContent ?? "");
    expect(
      messages.some((m) =>
        /no longer available|may have been deleted/i.test(m),
      ),
    ).toBe(false);
    // It does NOT show "save again" (category-missing branch)
    expect(messages.some((m) => /save again|category.*removed/i.test(m))).toBe(
      false,
    );

    // Text preserved
    expect(screen.getByRole("textbox", { name: /item text/i })).toHaveValue(
      "Bananas",
    );
  });
});

// ---------------------------------------------------------------------------
// Item-save failure keeps created category and selection
// ---------------------------------------------------------------------------

describe("item-save failure after inline category create", () => {
  it("keeps the created category and selection when the item-save fails", async () => {
    // After inline create succeeds, item PATCH fails with 500
    const { user } = renderSheet({
      mode: "edit",
      item: { ...baseItem, categoryId: null },
      list: makeList({ items: [{ ...baseItem, categoryId: null }] }),
    });

    // Expand inline create
    await user.click(
      await screen.findByRole("button", { name: /new category/i }),
    );
    const nameInput = await screen.findByRole("textbox", {
      name: /category name/i,
    });
    await user.type(nameInput, "Snacks");
    await user.click(screen.getByRole("button", { name: /create category/i }));

    // Wait for category to be selected
    await waitFor(() => {
      const select = screen.getByRole("combobox", { name: /category/i });
      const selectedOption = select.querySelector("option:checked");
      expect(selectedOption?.textContent).toBe("Snacks");
    });

    // Now make item save fail
    server.use(
      http.patch(`${API_BASE}/lists/${LIST_ID}/items/${ITEM_ID}`, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    );

    await user.click(screen.getByRole("button", { name: /save item/i }));

    // Wait for error — category selection should still be Snacks
    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });

    // Selection preserved
    const select = screen.getByRole("combobox", { name: /category/i });
    const selectedOption = select.querySelector("option:checked");
    expect(selectedOption?.textContent).toBe("Snacks");
  });
});
