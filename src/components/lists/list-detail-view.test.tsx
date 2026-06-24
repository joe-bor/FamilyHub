import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListDetail } from "@/lib/types";
import {
  seedMockListPreferences,
  seedMockLists,
  setupMswServer,
} from "@/test/mocks/server";
import { renderWithUser, screen, waitFor, within } from "@/test/test-utils";
import { ListDetailView } from "./list-detail-view";

const viewport = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return {
    ...actual,
    useIsMobile: () => viewport.isMobile,
  };
});

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
      seeded: true,
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
  });
});
