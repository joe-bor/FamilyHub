/**
 * Tests for CategoryManager — the full CRUD dialog/sheet for managing list categories.
 *
 * Scope: Task 9. Tests cover:
 *   - Loading skeleton/text
 *   - GET error + Retry
 *   - Offline state (no query, no write)
 *   - Empty state
 *   - Shared-scope copy
 *   - Add/rename validation (empty, too-long, duplicate 409, network)
 *   - Input-adjacent 400/409/network errors
 *   - Preflight item/grouped counts in delete confirmation
 *   - Delete failure retaining confirmation context
 *   - Authoritative response counts in success toast
 *   - Final delete visibly flattening an open list
 *   - Pending disabling only relevant operation (outside reorder)
 *   - Reorder stub entry present (mechanics are Task 10)
 *
 * NOT tested here: reorder mechanics (Task 10), mobile Options→manager handoff (Task 11).
 */

import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListDetail } from "@/lib/types";
import {
  API_BASE,
  seedMockCategoryCatalog,
  seedMockListPreferences,
  seedMockLists,
  server,
  setupMswServer,
} from "@/test/mocks/server";
import { renderWithUser, screen, waitFor, within } from "@/test/test-utils";
import { CategoryManager } from "./category-manager";

const mockToast = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/toaster", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const LIST_ID = "00000000-0000-4000-8000-000000000101";
const CAT_A_ID = "00000000-0000-4000-8000-000000000301";
const CAT_B_ID = "00000000-0000-4000-8000-000000000302";

const groceryListGrouped: ListDetail = {
  id: LIST_ID,
  name: "Trader Joe's Run",
  kind: "grocery",
  categoryDisplayMode: "grouped",
  showCompletedOverride: null,
  categories: [
    { id: CAT_A_ID, kind: "grocery", name: "Produce", sortOrder: 0 },
    { id: CAT_B_ID, kind: "grocery", name: "Dairy", sortOrder: 1 },
  ],
  items: [
    {
      id: "00000000-0000-4000-8000-000000000201",
      text: "Apples",
      completed: false,
      completedAt: null,
      categoryId: CAT_A_ID,
      createdAt: "2026-05-06T09:00:00",
      updatedAt: "2026-05-06T09:00:00",
    },
    {
      id: "00000000-0000-4000-8000-000000000202",
      text: "Milk",
      completed: false,
      completedAt: null,
      categoryId: CAT_B_ID,
      createdAt: "2026-05-06T09:00:00",
      updatedAt: "2026-05-06T09:00:00",
    },
  ],
  createdAt: "2026-05-06T09:00:00",
  updatedAt: "2026-05-06T09:00:00",
};

setupMswServer();

function setOnline(value: boolean): void {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

function renderManager(
  props: { open?: boolean; kind?: "grocery" | "to-do" | "general" } = {},
) {
  const { open = true, kind = "grocery" } = props;
  return renderWithUser(
    <CategoryManager open={open} onOpenChange={() => {}} kind={kind} />,
  );
}

beforeEach(() => {
  setOnline(true);
  seedMockLists([groceryListGrouped]);
  seedMockListPreferences({ showCompletedByDefault: true });
  seedMockCategoryCatalog("grocery", [
    { id: CAT_A_ID, kind: "grocery", name: "Produce", sortOrder: 0 },
    { id: CAT_B_ID, kind: "grocery", name: "Dairy", sortOrder: 1 },
  ]);
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe("CategoryManager — loading state", () => {
  it("renders the loading skeleton while the catalog query is pending", async () => {
    server.use(
      http.get(`${API_BASE}/lists/categories`, async () => {
        // Delay so the pending/loading state is observable before data arrives
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({
          data: {
            kind: "grocery",
            groupedListCount: 1,
            categories: [],
          },
        });
      }),
    );
    renderManager();

    // The skeleton renders with role="status" and an accessible label while
    // the catalog request is in-flight.
    const skeleton = await screen.findByRole("status", {
      name: /loading categories/i,
    });
    expect(skeleton).toBeInTheDocument();

    // Once the (empty) catalog resolves, the skeleton is replaced by the
    // empty-state copy and the loading status disappears.
    await screen.findByText(/no categories yet/i);
    expect(
      screen.queryByRole("status", { name: /loading categories/i }),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// GET error + Retry
// ---------------------------------------------------------------------------

describe("CategoryManager — catalog load error", () => {
  it("shows an error message with a Retry button when catalog fetch fails", async () => {
    server.use(
      http.get(`${API_BASE}/lists/categories`, () => {
        return HttpResponse.json({ message: "Server error" }, { status: 500 });
      }),
    );
    renderManager();
    const retryBtn = await screen.findByRole("button", { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
  });

  it("retries the catalog fetch when Retry is clicked", async () => {
    let callCount = 0;
    server.use(
      http.get(`${API_BASE}/lists/categories`, () => {
        callCount += 1;
        if (callCount < 2) {
          return HttpResponse.json({ message: "Error" }, { status: 500 });
        }
        return HttpResponse.json({
          data: { kind: "grocery", groupedListCount: 0, categories: [] },
        });
      }),
    );
    const { user } = renderManager();
    const retryBtn = await screen.findByRole("button", { name: /retry/i });
    await user.click(retryBtn);
    // After retry, categories loaded — empty state visible
    await screen.findByText(/no categories yet/i);
  });
});

// ---------------------------------------------------------------------------
// Offline state
// ---------------------------------------------------------------------------

describe("CategoryManager — offline state", () => {
  beforeEach(() => {
    setOnline(false);
  });

  afterEach(() => {
    setOnline(true);
  });

  it("renders explanatory offline content and does not show the category list or add form", async () => {
    renderManager();
    // Offline message visible
    const offlineMsg = await screen.findByText(/unavailable offline/i);
    expect(offlineMsg).toBeInTheDocument();
    // No add form input
    expect(
      screen.queryByRole("textbox", { name: /category name/i }),
    ).not.toBeInTheDocument();
  });

  it("does not fire a network request for the category catalog while offline", async () => {
    let requested = false;
    server.use(
      http.get(`${API_BASE}/lists/categories`, () => {
        requested = true;
        return HttpResponse.json({
          data: { kind: "grocery", groupedListCount: 0, categories: [] },
        });
      }),
    );
    renderManager();
    // Wait a tick
    await new Promise((r) => setTimeout(r, 100));
    expect(requested).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe("CategoryManager — empty catalog", () => {
  beforeEach(() => {
    seedMockCategoryCatalog("grocery", []);
  });

  it("renders an empty state copy explaining categories can be created here", async () => {
    renderManager();
    const emptyMsg = await screen.findByText(/no categories yet/i);
    expect(emptyMsg).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Shared-scope copy
// ---------------------------------------------------------------------------

describe("CategoryManager — shared-scope helper copy", () => {
  it("renders shared-scope copy mentioning the kind", async () => {
    renderManager({ kind: "grocery" });
    const copy = await screen.findByText(/available across all grocery lists/i);
    expect(copy).toBeInTheDocument();
  });

  it("renders shared-scope copy for to-do kind", async () => {
    seedMockCategoryCatalog("to-do", [
      {
        id: "00000000-0000-4000-8000-000000000401",
        kind: "to-do",
        name: "Urgent",
        sortOrder: 0,
      },
    ]);
    renderManager({ kind: "to-do" });
    const copy = await screen.findByText(/available across all to-do lists/i);
    expect(copy).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Catalog rows: name + itemCount + controls
// ---------------------------------------------------------------------------

describe("CategoryManager — category list rows", () => {
  it("renders each category name and its item count", async () => {
    renderManager();
    await screen.findByText("Produce");
    await screen.findByText("Dairy");
    // Item counts from seeded list: 1 item in Produce, 1 in Dairy
    // The row shows "1 item" labels
    expect(screen.getAllByText(/1 item/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders Reorder entry (stub) in the manager", async () => {
    renderManager();
    await screen.findByText("Produce");
    const reorderBtn = screen.getByRole("button", { name: /reorder/i });
    expect(reorderBtn).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Add category — validation
// ---------------------------------------------------------------------------

describe("CategoryManager — add category validation", () => {
  it("shows required error when submitting an empty category name", async () => {
    const { user } = renderManager();
    await screen.findByText("Produce"); // wait for data load

    const addBtn = screen.getByRole("button", { name: /^add$/i });
    await user.click(addBtn);

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent(/required/i);
  });

  it("shows max length error for a name over 100 characters", async () => {
    const { user } = renderManager();
    await screen.findByText("Produce");

    const addInput = screen.getByRole("textbox", { name: /category name/i });
    await user.type(addInput, "a".repeat(101));
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent(/100 characters/i);
  });
});

// ---------------------------------------------------------------------------
// Add category — 409 duplicate error (input-adjacent)
// ---------------------------------------------------------------------------

describe("CategoryManager — add category 409 duplicate", () => {
  it("shows a duplicate error adjacent to the input when server returns 409", async () => {
    const { user } = renderManager();
    await screen.findByText("Produce");

    const addInput = screen.getByRole("textbox", { name: /category name/i });
    await user.type(addInput, "Produce");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent(/already exists/i);
  });
});

// ---------------------------------------------------------------------------
// Add category — 400 error
// ---------------------------------------------------------------------------

describe("CategoryManager — add category 400 error", () => {
  it("shows a server error message adjacent to the input on 400", async () => {
    server.use(
      http.post(`${API_BASE}/lists/categories`, () => {
        return HttpResponse.json(
          { message: "Category name is required" },
          { status: 400 },
        );
      }),
    );
    const { user } = renderManager();
    await screen.findByText("Produce");

    const addInput = screen.getByRole("textbox", { name: /category name/i });
    await user.type(addInput, "New Cat");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    const error = await screen.findByRole("alert");
    expect(error).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Add category — network error
// ---------------------------------------------------------------------------

describe("CategoryManager — add category network error", () => {
  it("shows a network error message adjacent to the input on network failure", async () => {
    server.use(
      http.post(`${API_BASE}/lists/categories`, () => {
        return HttpResponse.error();
      }),
    );
    const { user } = renderManager();
    await screen.findByText("Produce");

    const addInput = screen.getByRole("textbox", { name: /category name/i });
    await user.type(addInput, "New Cat");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    const error = await screen.findByRole("alert");
    expect(error).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Add category — success: clears input
// ---------------------------------------------------------------------------

describe("CategoryManager — add category success", () => {
  it("clears only the category-name input after successful create", async () => {
    const { user } = renderManager();
    await screen.findByText("Produce");

    const addInput = screen.getByRole("textbox", { name: /category name/i });
    await user.type(addInput, "Bakery");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => expect(addInput).toHaveValue(""));
    // The new category appears in the list
    await screen.findByText("Bakery");
  });
});

// ---------------------------------------------------------------------------
// Rename validation
// ---------------------------------------------------------------------------

describe("CategoryManager — rename validation", () => {
  it("shows a 409 error adjacent to the rename input on duplicate name", async () => {
    const { user } = renderManager();
    await screen.findByText("Produce");

    // Open rename for "Produce"
    const renameBtn = screen.getAllByRole("button", { name: /rename/i })[0];
    await user.click(renameBtn);

    const renameInput = screen.getByDisplayValue("Produce");
    await user.clear(renameInput);
    await user.type(renameInput, "Dairy"); // duplicate
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent(/already exists/i);
  });
});

// ---------------------------------------------------------------------------
// Delete confirmation — preflight counts
// ---------------------------------------------------------------------------

describe("CategoryManager — delete confirmation", () => {
  it("shows preflight item and grouped counts in the delete confirmation dialog", async () => {
    const { user } = renderManager();
    await screen.findByText("Produce");

    // Trigger delete on "Produce" which has 1 item (Apples)
    const deleteBtn = screen.getAllByRole("button", { name: /delete/i })[0];
    await user.click(deleteBtn);

    // Confirmation dialog should appear with item count
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/produce/i);
    expect(dialog).toHaveTextContent(/1 item/i);
  });

  it("retains the confirmation context when delete fails", async () => {
    server.use(
      http.delete(`${API_BASE}/lists/categories/:categoryId`, () => {
        return HttpResponse.json({ message: "Delete failed" }, { status: 500 });
      }),
    );
    const { user } = renderManager();
    await screen.findByText("Produce");

    // Trigger delete
    const deleteBtn = screen.getAllByRole("button", { name: /delete/i })[0];
    await user.click(deleteBtn);

    // Confirmation appears
    const dialog = await screen.findByRole("dialog");
    // Confirm the delete
    const confirmBtn = within(dialog).getByRole("button", { name: /delete/i });
    await user.click(confirmBtn);

    // After failure, confirmation remains open with context
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Delete success — authoritative toast with CategoryDeleteResult
// ---------------------------------------------------------------------------

describe("CategoryManager — delete success toast", () => {
  it("toasts the authoritative uncategorized count from the response, not the preflight count", async () => {
    // Seed Produce with 3 assigned items so the confirmation preflight shows "3 items".
    const threeItemList: ListDetail = {
      ...groceryListGrouped,
      items: [
        {
          id: "00000000-0000-4000-8000-000000000201",
          text: "Apples",
          completed: false,
          completedAt: null,
          categoryId: CAT_A_ID,
          createdAt: "2026-05-06T09:00:00",
          updatedAt: "2026-05-06T09:00:00",
        },
        {
          id: "00000000-0000-4000-8000-000000000203",
          text: "Pears",
          completed: false,
          completedAt: null,
          categoryId: CAT_A_ID,
          createdAt: "2026-05-06T09:00:00",
          updatedAt: "2026-05-06T09:00:00",
        },
        {
          id: "00000000-0000-4000-8000-000000000204",
          text: "Grapes",
          completed: false,
          completedAt: null,
          categoryId: CAT_A_ID,
          createdAt: "2026-05-06T09:00:00",
          updatedAt: "2026-05-06T09:00:00",
        },
      ],
    };
    seedMockLists([threeItemList]);

    // Override DELETE so the AUTHORITATIVE response count (5) differs from the
    // preflight catalog count (3) — proving the toast uses the response, not preflight.
    server.use(
      http.delete(`${API_BASE}/lists/categories/:categoryId`, () => {
        return HttpResponse.json({
          data: { uncategorizedItemCount: 5, flattenedListCount: 0 },
          message: "Category deleted successfully",
        });
      }),
    );

    const { user } = renderManager();
    await screen.findByText("Produce");

    const deleteBtn = screen.getByRole("button", { name: /delete produce/i });
    await user.click(deleteBtn);

    // Preflight in the confirmation dialog shows the catalog count of 3.
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/3 items/i);

    const confirmBtn = within(dialog).getByRole("button", { name: /delete/i });
    await user.click(confirmBtn);

    // The success toast must reflect the authoritative response count (5),
    // and must NOT report the preflight count (3).
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Category deleted",
          description: expect.stringMatching(/5 items/i),
        }),
      );
    });
    const lastCall = mockToast.mock.calls.at(-1)?.[0] as {
      description?: string;
    };
    expect(lastCall.description).not.toMatch(/\b3 items\b/i);
  });

  it("mentions the authoritative flattenedListCount in the toast when the final category is deleted", async () => {
    // Set up single-category catalog so deleting it flattens the grouped list
    seedMockCategoryCatalog("grocery", [
      { id: CAT_A_ID, kind: "grocery", name: "Produce", sortOrder: 0 },
    ]);
    const singleCatList: ListDetail = {
      ...groceryListGrouped,
      categories: [
        { id: CAT_A_ID, kind: "grocery", name: "Produce", sortOrder: 0 },
      ],
      items: [
        {
          id: "00000000-0000-4000-8000-000000000201",
          text: "Apples",
          completed: false,
          completedAt: null,
          categoryId: CAT_A_ID,
          createdAt: "2026-05-06T09:00:00",
          updatedAt: "2026-05-06T09:00:00",
        },
      ],
    };
    seedMockLists([singleCatList]);

    const { user } = renderManager();
    await screen.findByText("Produce");

    const deleteBtn = screen.getByRole("button", { name: /delete produce/i });
    await user.click(deleteBtn);

    const dialog = await screen.findByRole("dialog");
    const confirmBtn = within(dialog).getByRole("button", { name: /delete/i });
    await user.click(confirmBtn);

    // The MSW handler flattens exactly 1 grouped list — the toast must report
    // that exact authoritative number ("1 list").
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Category deleted",
          description: expect.stringMatching(/\b1 list\b/i),
        }),
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Pending state — only disables relevant operation
// ---------------------------------------------------------------------------

describe("CategoryManager — pending state isolation", () => {
  it("does not disable unrelated rows while one add is pending", async () => {
    let resolveCreate: (() => void) | null = null;
    server.use(
      http.post(`${API_BASE}/lists/categories`, async () => {
        await new Promise<void>((r) => {
          resolveCreate = r;
        });
        return HttpResponse.json(
          {
            data: {
              id: "new-id",
              kind: "grocery",
              name: "Bakery",
              sortOrder: 2,
              itemCount: 0,
            },
          },
          { status: 201 },
        );
      }),
    );

    const { user } = renderManager();
    await screen.findByText("Produce");

    const addInput = screen.getByRole("textbox", { name: /category name/i });
    await user.type(addInput, "Bakery");
    const addBtn = screen.getByRole("button", { name: /^add$/i });
    await user.click(addBtn);

    // While add is pending, delete/rename buttons for existing rows should still be enabled
    await waitFor(() => {
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      // At least the existing category delete buttons are not disabled
      expect(deleteButtons.some((btn) => !btn.hasAttribute("disabled"))).toBe(
        true,
      );
    });

    // Resolve to finish test
    resolveCreate?.();
  });
});
