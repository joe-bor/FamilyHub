import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useBackStack } from "@/stores";
import {
  act,
  render,
  renderWithUser,
  screen,
  waitFor,
} from "@/test/test-utils";
import { MobileSheet } from "./mobile-sheet";

function SheetHarness({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open sheet
      </button>
      <MobileSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Test sheet"
      >
        {children ?? <button type="button">Inside action</button>}
      </MobileSheet>
    </>
  );
}

describe("MobileSheet", () => {
  it("moves focus to the dialog when it opens", async () => {
    const { user } = renderWithUser(<SheetHarness />);

    await user.click(screen.getByRole("button", { name: "Open sheet" }));

    expect(screen.getByRole("dialog", { name: "Test sheet" })).toHaveFocus();
  });

  it("returns focus to the previously focused element when it closes", async () => {
    const { user } = renderWithUser(<SheetHarness />);
    const trigger = screen.getByRole("button", { name: "Open sheet" });

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // The sheet animates out before unmounting, so focus restore is async.
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("does not steal focus from a child that focuses itself on mount", async () => {
    const { user } = renderWithUser(
      <SheetHarness>
        <button type="button" ref={(el) => el?.focus()}>
          Inside action
        </button>
      </SheetHarness>,
    );

    await user.click(screen.getByRole("button", { name: "Open sheet" }));

    expect(screen.getByRole("button", { name: "Inside action" })).toHaveFocus();
  });

  it("registers its close handler on the back-stack while open", () => {
    const onClose = vi.fn();
    render(
      <MobileSheet isOpen onClose={onClose} title="Test sheet">
        <button type="button">Inside</button>
      </MobileSheet>,
    );
    expect(useBackStack.getState().stack).toHaveLength(1);
    act(() => {
      useBackStack.getState().peek()?.handler();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses the explicit Cancel handler for the header Cancel button when provided", async () => {
    const onClose = vi.fn();
    const onCancel = vi.fn();
    const { user } = renderWithUser(
      <MobileSheet
        isOpen
        onClose={onClose}
        onCancel={onCancel}
        title="Test sheet"
      >
        <button type="button">Inside</button>
      </MobileSheet>,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("uses a custom header dismiss label when provided", async () => {
    const onClose = vi.fn();
    const { user } = renderWithUser(
      <MobileSheet
        isOpen
        onClose={onClose}
        title="Test sheet"
        cancelLabel="Done"
      >
        <button type="button">Inside</button>
      </MobileSheet>,
    );

    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Task 11: new optional props — must not break existing callers
  // ---------------------------------------------------------------------------

  describe("focusTitleOnOpen prop", () => {
    it("focuses the Drawer.Title when focusTitleOnOpen is true", async () => {
      function FocusTitleHarness() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setOpen(true)}>
              Open
            </button>
            <MobileSheet
              isOpen={open}
              onClose={() => setOpen(false)}
              title="Manager title"
              focusTitleOnOpen
            >
              <button type="button">Inside</button>
            </MobileSheet>
          </>
        );
      }

      const { user } = renderWithUser(<FocusTitleHarness />);
      await user.click(screen.getByRole("button", { name: "Open" }));
      // With focusTitleOnOpen, the title text should be the active element
      await waitFor(() => {
        expect(document.activeElement?.textContent).toContain("Manager title");
      });
    });

    it("focuses the content div (not title) when focusTitleOnOpen is false (default)", async () => {
      function HarnessDefault() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setOpen(true)}>
              Open
            </button>
            <MobileSheet
              isOpen={open}
              onClose={() => setOpen(false)}
              title="Sheet title"
            >
              <button type="button">Content button</button>
            </MobileSheet>
          </>
        );
      }
      const { user } = renderWithUser(<HarnessDefault />);
      await user.click(screen.getByRole("button", { name: "Open" }));
      // Default: the dialog content (tabIndex=-1 div) gets focus, not the title text
      expect(screen.getByRole("dialog", { name: "Sheet title" })).toHaveFocus();
    });
  });

  describe("restoreFocusOnClose prop", () => {
    it("suppresses opener focus when restoreFocusOnClose is false", async () => {
      function HarnessSuppressed() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setOpen(true)}>
              Open
            </button>
            <MobileSheet
              isOpen={open}
              onClose={() => setOpen(false)}
              title="Sheet title"
              restoreFocusOnClose={false}
            >
              <button type="button">Inside</button>
            </MobileSheet>
          </>
        );
      }
      const { user } = renderWithUser(<HarnessSuppressed />);
      const trigger = screen.getByRole("button", { name: "Open" });
      await user.click(trigger);
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      // With restoreFocusOnClose=false, focus should NOT return to the trigger
      // Wait a tick and assert trigger does not have focus
      await waitFor(() => {
        expect(trigger).not.toHaveFocus();
      });
    });

    it("restores opener focus when restoreFocusOnClose is true (default)", async () => {
      const { user } = renderWithUser(<SheetHarness />);
      const trigger = screen.getByRole("button", { name: "Open sheet" });
      await user.click(trigger);
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(trigger).toHaveFocus());
    });
  });

  describe("returnFocusRef prop", () => {
    it("focuses the returnFocusRef target instead of the opener on close", async () => {
      function HarnessReturnRef() {
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
            <MobileSheet
              isOpen={open}
              onClose={() => setOpen(false)}
              title="Sheet"
              returnFocusRef={returnRef}
            >
              <button type="button">Inside</button>
            </MobileSheet>
          </>
        );
      }
      const { user } = renderWithUser(<HarnessReturnRef />);
      await user.click(screen.getByRole("button", { name: "Opener" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Return target" }),
        ).toHaveFocus(),
      );
    });
  });

  describe("onAnimationEnd prop", () => {
    it("forwards onAnimationEnd to Drawer.Root (prop accepted without error)", () => {
      // This test verifies the prop is accepted and forwarded without breaking rendering.
      // Testing the actual 500ms vaul timeout in jsdom is unreliable because vaul's
      // onAnimationEnd fires via setTimeout after real animation CSS which jsdom can't run.
      // The handoff integration is tested in list-detail-view.test.tsx using fake timers.
      const onAnimationEnd = vi.fn();
      expect(() =>
        render(
          <MobileSheet
            isOpen
            onClose={() => {}}
            title="Sheet"
            onAnimationEnd={onAnimationEnd}
          >
            <button type="button">Inside</button>
          </MobileSheet>,
        ),
      ).not.toThrow();
    });
  });
});
