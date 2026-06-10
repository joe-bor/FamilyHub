import { useState } from "react";
import { describe, expect, it } from "vitest";
import { renderWithUser, screen } from "@/test/test-utils";
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

    expect(trigger).toHaveFocus();
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
});
