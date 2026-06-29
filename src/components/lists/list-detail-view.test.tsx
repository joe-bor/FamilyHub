import { QueryClient } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { useRef, useState } from "react";
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
import { ListDetailView } from "./list-detail-view";

const viewport = vi.hoisted(() => ({ isMobile: false }));
const mockToast = vi.hoisted(() => vi.fn());

vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return {
    ...actual,
    useIsMobile: () => viewport.isMobile,
  };
});

vi.mock("@/components/ui/toaster", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

const LIST_ID = "00000000-0000-4000-8000-000000000101";

const groceryList: ListDetail = {
  id: LIST_ID,
  name: "Trader Joe's Run",
  kind: "grocery",
  categoryDisplayMode: "grouped",
  showCompletedOverride: null,
  categories: [
    {
      id: "00000000-0000-4000-8000-000000000301",
      kind: "grocery",
      name: "Produce",
      sortOrder: 0,
    },
  ],
  items: [
    {
      id: "00000000-0000-4000-8000-000000000201",
      text: "Bananas",
      completed: false,
      completedAt: null,
      categoryId: "00000000-0000-4000-8000-000000000301",
      createdAt: "2026-05-06T09:05:00",
      updatedAt: "2026-05-06T09:05:00",
    },
    {
      id: "00000000-0000-4000-8000-000000000202",
      text: "Spinach",
      completed: true,
      completedAt: "2026-05-06T10:00:00",
      categoryId: "00000000-0000-4000-8000-000000000301",
      createdAt: "2026-05-06T09:10:00",
      updatedAt: "2026-05-06T10:00:00",
    },
  ],
  createdAt: "2026-05-06T09:00:00",
  updatedAt: "2026-05-06T10:00:00",
};

setupMswServer();

function renderDetail() {
  return renderWithUser(
    <ListDetailView
      listId={LIST_ID}
      preferences={{ showCompletedByDefault: true }}
      preferencesStatus="ready"
      onBack={() => {}}
    />,
  );
}

beforeEach(() => {
  mockToast.mockClear();
  seedMockLists([groceryList]);
  seedMockListPreferences({ showCompletedByDefault: true });
});

describe("ListDetailView options placement", () => {
  describe("mobile (<768px)", () => {
    beforeEach(() => {
      viewport.isMobile = true;
    });

    it("keeps the options controls out of the header and behind a trigger", async () => {
      const { user } = renderDetail();

      await screen.findByRole("heading", { name: "Trader Joe's Run" });

      // Options controls are not rendered in the always-visible header.
      expect(
        screen.queryByLabelText("Completed items"),
      ).not.toBeInTheDocument();
      // On mobile, "Add item" is the floating action button, not a header button.
      expect(
        screen.getByRole("button", { name: "Add item" }),
      ).toBeInTheDocument();

      // Trigger opens the half sheet with the controls inside.
      await user.click(screen.getByRole("button", { name: "List options" }));
      const sheet = await screen.findByRole("dialog", {
        name: "List options",
      });
      expect(
        within(sheet).getByLabelText("Completed items"),
      ).toBeInTheDocument();
      expect(within(sheet).getByLabelText("Categories")).toBeInTheDocument();
    });

    it("updates the visible list when an option changes in the sheet", async () => {
      const { user } = renderDetail();

      await screen.findByRole("heading", { name: "Trader Joe's Run" });
      // Completed item is visible with the family default (show).
      expect(screen.getByText("Spinach")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "List options" }));
      const sheet = await screen.findByRole("dialog", {
        name: "List options",
      });
      await user.selectOptions(
        within(sheet).getByLabelText("Completed items"),
        "Hide completed",
      );

      // The list behind the sheet re-renders and hides the completed item.
      await waitFor(() =>
        expect(screen.queryByText("Spinach")).not.toBeInTheDocument(),
      );
    });

    it("shows an Add item FAB and removes the header Add item button", async () => {
      renderDetail();
      const addItem = await screen.findByRole("button", { name: "Add item" });
      // On mobile, "Add item" is the floating action button (fixed-positioned),
      // not the header-card button — this distinguishes the FAB from the old one.
      expect(addItem).toHaveClass("fixed");
      // The options control remains available on mobile.
      expect(
        screen.getByRole("button", { name: "List options" }),
      ).toBeInTheDocument();
    });
  });

  describe("desktop (>=768px)", () => {
    beforeEach(() => {
      viewport.isMobile = false;
    });

    it("renders the controls inline with no options trigger", async () => {
      renderDetail();

      await screen.findByRole("heading", { name: "Trader Joe's Run" });

      expect(screen.getByLabelText("Completed items")).toBeInTheDocument();
      expect(screen.getByLabelText("Categories")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "List options" }),
      ).not.toBeInTheDocument();
    });

    it("keeps the inline Add item button and shows no extra FAB", async () => {
      renderDetail();
      const addItem = await screen.findAllByRole("button", {
        name: "Add item",
      });
      expect(addItem).toHaveLength(1); // header button only, no separate FAB
      // Desktop keeps the inline header button, never the floating action button.
      expect(addItem[0]).not.toHaveClass("fixed");
    });

    it("shows category control for a General list when it has categories", async () => {
      const generalList: ListDetail = {
        id: LIST_ID,
        name: "Movie Night",
        kind: "general",
        categoryDisplayMode: "grouped",
        showCompletedOverride: null,
        categories: [
          {
            id: "00000000-0000-4000-8000-000000000301",
            kind: "general",
            name: "Watchlist",
            sortOrder: 0,
          },
        ],
        items: [],
        createdAt: "2026-05-06T09:00:00",
        updatedAt: "2026-05-06T09:00:00",
      };
      seedMockLists([generalList]);
      renderDetail();

      await screen.findByRole("heading", { name: "Movie Night" });

      expect(screen.getByLabelText("Categories")).toBeInTheDocument();
      expect(screen.getByLabelText("Categories")).toHaveValue("grouped");
    });

    it("shows category control for a General list even when catalog is empty, but disables grouped option", async () => {
      const generalList: ListDetail = {
        id: LIST_ID,
        name: "Movie Night",
        kind: "general",
        categoryDisplayMode: "flat",
        showCompletedOverride: null,
        categories: [],
        items: [],
        createdAt: "2026-05-06T09:00:00",
        updatedAt: "2026-05-06T09:00:00",
      };
      seedMockLists([generalList]);
      renderDetail();

      await screen.findByRole("heading", { name: "Movie Night" });

      const categorySelect = screen.getByLabelText("Categories");
      expect(categorySelect).toBeInTheDocument();

      // The grouped option should be disabled since there are no categories
      const groupedOption = screen
        .getAllByRole("option", { name: "Show categories" })
        .find((opt) => opt.closest("select") === categorySelect);
      expect(groupedOption).toBeDisabled();

      // Explanatory helper text appears
      expect(screen.getByText("Create a category first.")).toBeInTheDocument();
    });

    it("toasts the backend message when a stale grouped-mode save rolls back", async () => {
      const flatList: ListDetail = {
        ...groceryList,
        categoryDisplayMode: "flat",
      };
      seedMockLists([flatList]);
      server.use(
        http.patch(`${API_BASE}/lists/${LIST_ID}`, () =>
          HttpResponse.json(
            { message: "Create a category first." },
            { status: 409 },
          ),
        ),
      );

      const { user } = renderDetail();
      await screen.findByRole("heading", { name: "Trader Joe's Run" });

      const categorySelect = screen.getByLabelText("Categories");
      await user.selectOptions(categorySelect, "Show categories");

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "List options not saved",
            description: "Create a category first.",
            variant: "destructive",
          }),
        );
      });
      expect(categorySelect).toHaveValue("flat");
    });
  });

  // ---------------------------------------------------------------------------
  // Task 11: mobile Options→manager handoff
  // ---------------------------------------------------------------------------

  describe("mobile Options→manager handoff (Task 11)", () => {
    beforeEach(() => {
      viewport.isMobile = true;
      seedMockCategoryCatalog("grocery", [
        {
          id: "00000000-0000-4000-8000-000000000301",
          kind: "grocery",
          name: "Produce",
          sortOrder: 0,
        },
      ]);
    });

    it("Options and manager are never both open at the same time during the handoff", async () => {
      const { user } = renderDetail();
      await screen.findByRole("heading", { name: "Trader Joe's Run" });

      // Open the Options sheet
      await user.click(screen.getByRole("button", { name: "List options" }));
      await screen.findByRole("dialog", { name: "List options" });

      // At this point only Options is open; manager is not mounted at all
      expect(
        screen.queryByRole("dialog", { name: /grocery categories/i }),
      ).toBeNull();

      // Click "Manage categories" inside the Options sheet
      await user.click(
        screen.getByRole("button", { name: /manage categories/i }),
      );

      // Immediately after the click: Options starts closing but manager is NOT yet open.
      // The manager opens only after the animation completes (onAnimationEnd(false)).
      // Assert: grocery categories dialog is absent right now.
      expect(
        screen.queryByRole("dialog", { name: /grocery categories/i }),
      ).toBeNull();
    });

    it("clicking Manage categories immediately closes Options without opening the manager", async () => {
      // Test the FIRST half of the handoff: clicking Manage Categories closes
      // Options and does NOT immediately open the manager.
      // (The second half — manager opens after animation — requires vaul's
      // onAnimationEnd setTimeout to fire, which is unreliable in jsdom.
      // We assert that sequencing is correct as far as the click itself goes.)
      const { user } = renderDetail();
      await screen.findByRole("heading", { name: "Trader Joe's Run" });

      await user.click(screen.getByRole("button", { name: "List options" }));
      await screen.findByRole("dialog", { name: "List options" });

      // Click Manage categories — sets handoffPending=true and calls setOptionsOpen(false)
      await user.click(
        screen.getByRole("button", { name: /manage categories/i }),
      );

      // Manager is NOT open yet — the handoff defers it until close animation completes.
      // This is the key invariant: never two dialogs at once.
      expect(
        screen.queryByRole("dialog", { name: /grocery categories/i }),
      ).toBeNull();

      // The Options dialog starts closing (vaul animates out; we don't assert it
      // is gone yet since animation takes ~500ms real time in jsdom).
      // What we CAN assert: the grocery categories manager is still absent.
    });

    it("desktop opens manager directly and returns focus to Manage categories on close", async () => {
      viewport.isMobile = false;
      const { user } = renderDetail();
      await screen.findByRole("heading", { name: "Trader Joe's Run" });

      // Desktop has no Options sheet trigger
      expect(screen.queryByRole("button", { name: "List options" })).toBeNull();

      // Clicking Manage categories directly opens the manager
      const manageButton = screen.getByRole("button", {
        name: /manage categories/i,
      });
      await user.click(manageButton);
      const managerDialog = await screen.findByRole("dialog", {
        name: /grocery categories/i,
      });

      // Close the manager via its X button — desktop uses the real Radix Dialog,
      // so this exercises the real desktopManageButtonRef wiring (returnFocusRef
      // honoured in DialogContent's onCloseAutoFocus).
      await user.click(
        within(managerDialog).getByRole("button", { name: "Close" }),
      );

      // Focus returns to the real "Manage categories" button.
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /manage categories/i }),
        ).toHaveFocus();
      });
    });

    it("manager returnFocusRef is wired to List options trigger on mobile", async () => {
      // Test the focus invariant: CategoryManager receives returnFocusRef pointing
      // to the "List options" trigger button, so when the manager closes, focus
      // returns there. We test this by directly opening the manager (bypassing the
      // handoff animation) and checking focus restoration.
      //
      // jsdom limitation: vaul's onAnimationEnd fires after a 500ms setTimeout which
      // is unreliable in test environments, so we can't fully drive the end-to-end
      // handoff sequence here. The handoff timing is covered by the test above which
      // asserts the manager is absent immediately after clicking Manage Categories.

      // Use a simplified harness that opens the manager directly (as if handoff
      // animation already completed) to test the returnFocusRef → focus on close.
      // The mobile "List options" trigger is the SlidersHorizontal button.
      function MobileManagerDirectHarness() {
        const [managerOpen, setManagerOpen] = useState(false);
        const optionsButtonRef = useRef<HTMLButtonElement | null>(null);
        return (
          <>
            <button
              ref={optionsButtonRef}
              type="button"
              aria-label="List options"
              onClick={() => {}}
            >
              <span>List options icon</span>
            </button>
            <button type="button" onClick={() => setManagerOpen(true)}>
              Open manager
            </button>
            <CategoryManager
              open={managerOpen}
              onOpenChange={setManagerOpen}
              kind="grocery"
              returnFocusRef={optionsButtonRef}
            />
          </>
        );
      }

      const { user } = renderWithUser(<MobileManagerDirectHarness />);
      await user.click(screen.getByRole("button", { name: "Open manager" }));
      await screen.findByRole("dialog", { name: /grocery categories/i });

      // Close the manager via Cancel
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      // Focus should return to the List options trigger via returnFocusRef
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "List options" }),
        ).toHaveFocus();
      });
    });
  });

  describe("category manager — final delete flattens an open list (desktop)", () => {
    beforeEach(() => {
      viewport.isMobile = false;
    });

    it("re-renders the open list flat after the final category is deleted via the manager", async () => {
      // The shared catalog for this kind must hold exactly the ONE category the
      // list uses, so deleting it is the final delete that empties the catalog
      // and flattens every grouped list of this kind.
      seedMockCategoryCatalog("grocery", [
        {
          id: "00000000-0000-4000-8000-000000000301",
          kind: "grocery",
          name: "Produce",
          sortOrder: 0,
        },
      ]);

      // gcTime: Infinity so the list-detail cache survives the delete → invalidate
      // → refetch convergence we assert against.
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
          mutations: { retry: false },
        },
      });

      // Single-category grouped list: deleting "Produce" must flatten it.
      const { user } = renderWithUser(
        <ListDetailView
          listId={LIST_ID}
          preferences={{ showCompletedByDefault: true }}
          preferencesStatus="ready"
          onBack={() => {}}
        />,
        { queryClient },
      );

      await screen.findByRole("heading", { name: "Trader Joe's Run" });

      // While grouped, the single category renders a titled section heading.
      expect(
        screen.getByRole("heading", { name: "Produce" }),
      ).toBeInTheDocument();
      // The assigned item is visible under that category.
      expect(screen.getByText("Bananas")).toBeInTheDocument();

      // Open the manager from the desktop options controls.
      await user.click(
        screen.getByRole("button", { name: /manage categories/i }),
      );

      // The manager dialog opens (titled "Grocery categories"); delete the
      // single category from within it.
      const managerDialog = await screen.findByRole("dialog", {
        name: /grocery categories/i,
      });
      const deleteBtn = await within(managerDialog).findByRole("button", {
        name: /delete produce/i,
      });
      await user.click(deleteBtn);

      // Confirm the delete in the confirmation dialog.
      const confirmDialog = await screen.findByRole("dialog", {
        name: /delete "produce"\?/i,
      });
      await user.click(
        within(confirmDialog).getByRole("button", { name: /delete/i }),
      );

      // After the final-category delete, the open list converges to flat:
      // the "Produce" category heading disappears…
      await waitFor(() =>
        expect(
          screen.queryByRole("heading", { name: "Produce" }),
        ).not.toBeInTheDocument(),
      );
      // …and the previously-categorized item still shows in the now-flat list.
      expect(screen.getByText("Bananas")).toBeInTheDocument();

      // The Categories control now reflects flat mode (grouped becomes unavailable
      // once the catalog is empty).
      const categorySelect = screen.getByLabelText("Categories");
      expect(categorySelect).toHaveValue("flat");
    });
  });
});
