import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ListDetail } from "@/lib/types";
import {
  seedMockCategoryCatalog,
  seedMockListPreferences,
  seedMockLists,
  setupMswServer,
} from "@/test/mocks/server";
import { act, renderWithUser, screen, waitFor } from "@/test/test-utils";
import { CategoryManager } from "./category-manager";

const dialogControls = vi.hoisted(() => ({
  onOpenChange: null as ((open: boolean) => void) | null,
}));

vi.mock("@/components/ui/responsive-form-dialog", () => ({
  ResponsiveFormDialog: ({
    open,
    onOpenChange,
    title,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    children: ReactNode;
  }) => {
    dialogControls.onOpenChange = onOpenChange;
    if (!open) return null;
    return (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    );
  },
}));

vi.mock("@/components/ui/toaster", () => ({
  toast: vi.fn(),
}));

const CAT_A_ID = "00000000-0000-4000-8000-000000000301";
const CAT_B_ID = "00000000-0000-4000-8000-000000000302";

const groceryListGrouped: ListDetail = {
  id: "00000000-0000-4000-8000-000000000101",
  name: "Trader Joe's Run",
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
};

setupMswServer();

describe("CategoryManager nested confirmation close handling", () => {
  it("allows a stale parent sheet close callback after delete confirmation settles", async () => {
    seedMockLists([groceryListGrouped]);
    seedMockListPreferences({ showCompletedByDefault: true });
    seedMockCategoryCatalog("grocery", [
      { id: CAT_A_ID, kind: "grocery", name: "Produce", sortOrder: 0 },
      { id: CAT_B_ID, kind: "grocery", name: "Dairy", sortOrder: 1 },
    ]);

    const onOpenChange = vi.fn();
    const { user } = renderWithUser(
      <CategoryManager
        open={true}
        onOpenChange={onOpenChange}
        kind="grocery"
      />,
    );

    await screen.findByText("Dairy");
    await user.click(screen.getByRole("button", { name: /delete dairy/i }));
    await screen.findByRole("dialog", { name: /delete "dairy"\\?/i });
    const staleParentClose = dialogControls.onOpenChange;

    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /delete "dairy"\\?/i }),
      ).toBeNull();
    });

    act(() => {
      staleParentClose?.(false);
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not convert a reorder Cancel discard into a manager close when the parent sheet reports close", async () => {
    seedMockLists([groceryListGrouped]);
    seedMockListPreferences({ showCompletedByDefault: true });
    seedMockCategoryCatalog("grocery", [
      { id: CAT_A_ID, kind: "grocery", name: "Produce", sortOrder: 0 },
      { id: CAT_B_ID, kind: "grocery", name: "Dairy", sortOrder: 1 },
    ]);

    const onOpenChange = vi.fn();
    const { user } = renderWithUser(
      <CategoryManager
        open={true}
        onOpenChange={onOpenChange}
        kind="grocery"
      />,
    );

    await screen.findByText("Produce");
    await user.click(screen.getByRole("button", { name: /reorder/i }));
    await user.click(
      screen.getByRole("button", { name: /move produce down/i }),
    );
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    await screen.findByRole("dialog", { name: "Discard order?" });

    act(() => {
      dialogControls.onOpenChange?.(false);
    });

    await user.click(screen.getByRole("button", { name: /discard order/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /^save$/i })).toBeNull();
    });
    expect(
      screen.getByRole("button", { name: /reorder categories/i }),
    ).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("ignores a late parent sheet close after confirming a reorder Cancel discard", async () => {
    seedMockLists([groceryListGrouped]);
    seedMockListPreferences({ showCompletedByDefault: true });
    seedMockCategoryCatalog("grocery", [
      { id: CAT_A_ID, kind: "grocery", name: "Produce", sortOrder: 0 },
      { id: CAT_B_ID, kind: "grocery", name: "Dairy", sortOrder: 1 },
    ]);

    const onOpenChange = vi.fn();
    const { user } = renderWithUser(
      <CategoryManager
        open={true}
        onOpenChange={onOpenChange}
        kind="grocery"
      />,
    );

    await screen.findByText("Produce");
    await user.click(screen.getByRole("button", { name: /reorder/i }));
    await user.click(
      screen.getByRole("button", { name: /move produce down/i }),
    );
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    await screen.findByRole("dialog", { name: "Discard order?" });

    await user.click(screen.getByRole("button", { name: /discard order/i }));

    act(() => {
      dialogControls.onOpenChange?.(false);
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /^save$/i })).toBeNull();
    });
    expect(
      screen.getByRole("button", { name: /reorder categories/i }),
    ).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
