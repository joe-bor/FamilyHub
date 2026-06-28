import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, renderWithUser, screen, waitFor } from "@/test/test-utils";
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

  // ---------------------------------------------------------------------------
  // Task 11: focusTitleOnOpen and returnFocusRef forwarding
  // ---------------------------------------------------------------------------

  describe("focusTitleOnOpen — mobile", () => {
    it("forwards focusTitleOnOpen to MobileSheet so the title is focused on open", async () => {
      mockIsMobile = true;

      function Harness() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setOpen(true)}>
              Open
            </button>
            <ResponsiveFormDialog
              open={open}
              onOpenChange={setOpen}
              title="Manager title"
              focusTitleOnOpen
            >
              <button type="button">Inside</button>
            </ResponsiveFormDialog>
          </>
        );
      }

      const { user } = renderWithUser(<Harness />);
      await user.click(screen.getByRole("button", { name: "Open" }));
      await waitFor(() => {
        expect(document.activeElement?.textContent).toContain("Manager title");
      });
    });
  });

  describe("focusTitleOnOpen — desktop", () => {
    it("focuses the DialogTitle when focusTitleOnOpen is true on desktop", async () => {
      mockIsMobile = false;

      function Harness() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setOpen(true)}>
              Open dialog
            </button>
            <ResponsiveFormDialog
              open={open}
              onOpenChange={setOpen}
              title="Desktop Manager"
              focusTitleOnOpen
            >
              <button type="button">Content button</button>
            </ResponsiveFormDialog>
          </>
        );
      }

      const { user } = renderWithUser(<Harness />);
      await user.click(screen.getByRole("button", { name: "Open dialog" }));
      await waitFor(() => {
        expect(document.activeElement?.textContent).toContain(
          "Desktop Manager",
        );
      });
    });
  });

  describe("returnFocusRef — mobile", () => {
    it("returns focus to returnFocusRef target on close (not the original opener)", async () => {
      mockIsMobile = true;

      function Harness() {
        const [open, setOpen] = useState(false);
        const returnRef = useRef<HTMLButtonElement>(null);
        return (
          <>
            <button type="button" onClick={() => setOpen(true)}>
              Opener
            </button>
            <button type="button" ref={returnRef}>
              Return target
            </button>
            <ResponsiveFormDialog
              open={open}
              onOpenChange={setOpen}
              title="Sheet"
              returnFocusRef={returnRef}
            >
              <button type="button">Inside</button>
            </ResponsiveFormDialog>
          </>
        );
      }

      const { user } = renderWithUser(<Harness />);
      await user.click(screen.getByRole("button", { name: "Opener" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Return target" }),
        ).toHaveFocus(),
      );
    });
  });

  describe("returnFocusRef — desktop", () => {
    it("returns focus to returnFocusRef target on close on desktop", async () => {
      mockIsMobile = false;

      function Harness() {
        const [open, setOpen] = useState(false);
        const returnRef = useRef<HTMLButtonElement>(null);
        return (
          <>
            <button type="button" onClick={() => setOpen(true)}>
              Opener
            </button>
            <button type="button" ref={returnRef}>
              Return target
            </button>
            <ResponsiveFormDialog
              open={open}
              onOpenChange={setOpen}
              title="Dialog"
              returnFocusRef={returnRef}
              desktopHeaderRight={
                <button type="button" onClick={() => setOpen(false)}>
                  Close
                </button>
              }
            >
              <button type="button">Inside</button>
            </ResponsiveFormDialog>
          </>
        );
      }

      const { user } = renderWithUser(<Harness />);
      await user.click(screen.getByRole("button", { name: "Opener" }));
      // Close via Radix's own onOpenChange (escape key or close button)
      await user.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Return target" }),
        ).toHaveFocus(),
      );
    });
  });
});
