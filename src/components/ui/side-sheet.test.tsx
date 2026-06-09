import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test/test-utils";
import { SideSheet } from "./side-sheet";

function renderSheet(onOpenChange = vi.fn()) {
  render(
    <SideSheet open onOpenChange={onOpenChange} title="Menu">
      <div>Menu content</div>
    </SideSheet>,
  );
  return {
    onOpenChange,
    panel: screen.getByRole("dialog", { name: "Menu" }),
  };
}

// Radix Dialog's scroll-lock (react-remove-scroll) reads `changedTouches` on the
// touchstart/touchmove it captures at the document level, while the SideSheet
// handlers read `touches`/`changedTouches`. Supply both so neither crashes.
function point(clientX: number, clientY: number) {
  return {
    touches: [{ clientX, clientY }],
    changedTouches: [{ clientX, clientY }],
  };
}

describe("SideSheet swipe-to-close", () => {
  it("renders its children inside a labelled dialog", () => {
    renderSheet();
    expect(screen.getByText("Menu content")).toBeInTheDocument();
  });

  it("closes on a horizontal leftward drag past the threshold", () => {
    const { onOpenChange, panel } = renderSheet();

    fireEvent.touchStart(panel, point(200, 300));
    fireEvent.touchMove(panel, point(100, 305));
    fireEvent.touchEnd(panel, point(100, 305));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not close on a leftward drag below the threshold", () => {
    const { onOpenChange, panel } = renderSheet();

    fireEvent.touchStart(panel, point(200, 300));
    fireEvent.touchMove(panel, point(170, 305));
    fireEvent.touchEnd(panel, point(170, 305));

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("does not close on a vertical-dominant gesture with incidental leftward drift", () => {
    const { onOpenChange, panel } = renderSheet();

    // 70px left, 200px down — a near-vertical scroll-flick.
    fireEvent.touchStart(panel, point(200, 100));
    fireEvent.touchMove(panel, point(130, 300));
    fireEvent.touchEnd(panel, point(130, 300));

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("resets the gesture on touch cancel so a trailing touchEnd cannot close it", () => {
    const { onOpenChange, panel } = renderSheet();

    fireEvent.touchStart(panel, point(200, 300));
    fireEvent.touchMove(panel, point(100, 300));
    fireEvent.touchCancel(panel);
    fireEvent.touchEnd(panel, point(100, 300));

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
