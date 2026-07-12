/**
 * Tests for ListOptionsControls — the presentational options block shown on
 * desktop inline and inside the mobile options sheet.
 *
 * Scope: Task 9 review follow-up. Proves the "Manage categories" entry appears
 * for every list kind, and is disabled with explanatory copy while offline.
 */

import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ListDetail, ListKind } from "@/lib/types";
import { render, screen } from "@/test/test-utils";
import { ListOptionsControls } from "./list-options-controls";

function buildList(kind: ListKind): ListDetail {
  return {
    id: "00000000-0000-4000-8000-000000000101",
    name: `${kind} list`,
    kind,
    categoryDisplayMode: "flat",
    showCompletedOverride: null,
    categories: [
      {
        id: "00000000-0000-4000-8000-000000000301",
        kind,
        name: "Alpha",
        sortOrder: 0,
      },
    ],
    items: [],
    createdAt: "2026-05-06T09:00:00",
    updatedAt: "2026-05-06T09:00:00",
  };
}

function renderControls(
  overrides: Partial<ComponentProps<typeof ListOptionsControls>> = {},
) {
  const props: ComponentProps<typeof ListOptionsControls> = {
    list: buildList("grocery"),
    hasPreferences: true,
    familyShowCompletedDefault: true,
    completedControlsDisabled: false,
    completedOverrideValue: "family-default",
    completedFallbackMessage: "",
    clearCompletedDisabled: true,
    onManageCategories: vi.fn(),
    categoriesOnline: true,
    onUpdateList: vi.fn(),
    onUpdatePreferences: vi.fn(),
    onClearCompleted: vi.fn(),
    ...overrides,
  };
  return render(<ListOptionsControls {...props} />);
}

describe("ListOptionsControls — Manage categories entry", () => {
  const kinds: ListKind[] = ["grocery", "to-do", "general"];

  for (const kind of kinds) {
    it(`renders the Manage categories button for a ${kind} list`, () => {
      renderControls({ list: buildList(kind), categoriesOnline: true });
      expect(
        screen.getByRole("button", { name: /manage categories/i }),
      ).toBeInTheDocument();
    });

    it(`shows shared-scope copy mentioning the ${kind} kind`, () => {
      const labels: Record<ListKind, RegExp> = {
        grocery: /available across all grocery lists/i,
        "to-do": /available across all to-do lists/i,
        general: /available across all general lists/i,
      };
      renderControls({ list: buildList(kind), categoriesOnline: true });
      expect(screen.getByText(labels[kind])).toBeInTheDocument();
    });
  }

  it("disables Manage categories and shows explanatory copy while offline", () => {
    renderControls({ categoriesOnline: false });

    const button = screen.getByRole("button", { name: /manage categories/i });
    expect(button).toBeDisabled();
    expect(
      screen.getByText(/category management is unavailable while offline/i),
    ).toBeInTheDocument();
  });

  it("does not render the Manage categories button when onManageCategories is omitted", () => {
    renderControls({ onManageCategories: undefined });
    expect(
      screen.queryByRole("button", { name: /manage categories/i }),
    ).not.toBeInTheDocument();
  });
});

describe("ListOptionsControls — large-screen touch targets", () => {
  it("sizes every interactive option control to at least 44px at lg", () => {
    renderControls({ clearCompletedDisabled: false });

    expect(screen.getByLabelText("Categories")).toHaveClass("lg:min-h-11");
    expect(screen.getByLabelText("Completed items")).toHaveClass("lg:min-h-11");
    expect(
      screen.getByRole("button", { name: /manage categories/i }),
    ).toHaveClass("lg:min-h-11");

    const familyDefaultCheckbox = screen.getByRole("checkbox", {
      name: /show completed by default/i,
    });
    expect(familyDefaultCheckbox.closest("label")).toHaveClass("lg:min-h-11");

    expect(
      screen.getByRole("button", { name: /remove all completed/i }),
    ).toHaveClass("lg:min-h-11");
  });
});
