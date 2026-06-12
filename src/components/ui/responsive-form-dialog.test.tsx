import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { ResponsiveFormDialog } from "./responsive-form-dialog";

let mockIsMobile = false;
vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return { ...actual, useIsMobile: () => mockIsMobile };
});

describe("ResponsiveFormDialog", () => {
  it("renders a centered dialog with the title on desktop", () => {
    mockIsMobile = false;
    render(
      <ResponsiveFormDialog open onOpenChange={vi.fn()} title="Family Settings">
        <p>content</p>
      </ResponsiveFormDialog>,
    );
    expect(
      screen.getByRole("dialog", { name: "Family Settings" }),
    ).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
    // Sheet chrome (Cancel affordance) is absent on desktop.
    expect(screen.queryByRole("button", { name: /cancel/i })).toBeNull();
  });

  it("renders desktop header-right content when provided", () => {
    mockIsMobile = false;
    render(
      <ResponsiveFormDialog
        open
        onOpenChange={vi.fn()}
        title="Member Profile"
        desktopHeaderRight={
          <button type="button" aria-label="Close">
            x
          </button>
        }
      >
        <p>content</p>
      </ResponsiveFormDialog>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("renders the mobile sheet with Cancel and no in-content close on mobile", () => {
    mockIsMobile = true;
    render(
      <ResponsiveFormDialog
        open
        onOpenChange={vi.fn()}
        title="Family Settings"
        desktopHeaderRight={
          <button type="button" aria-label="Close">
            x
          </button>
        }
      >
        <p>content</p>
      </ResponsiveFormDialog>,
    );
    expect(
      screen.getByRole("dialog", { name: "Family Settings" }),
    ).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    // Desktop-only header-right (X close) is not rendered inside the sheet.
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });
});
