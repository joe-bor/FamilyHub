import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScreenTransition } from "./screen-transition";

const animateMock = vi.fn();
function setReduce(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
beforeEach(() => {
  animateMock.mockReset();
  (Element.prototype as unknown as { animate: unknown }).animate = animateMock; // jsdom lacks WAAPI
});

describe("ScreenTransition", () => {
  it("does not animate on first mount, fades on token change", () => {
    setReduce(false);
    const { rerender } = render(
      <ScreenTransition token="a" mode="fade">
        A
      </ScreenTransition>,
    );
    expect(animateMock).not.toHaveBeenCalled();
    rerender(
      <ScreenTransition token="b" mode="fade">
        B
      </ScreenTransition>,
    );
    expect(animateMock).toHaveBeenCalledTimes(1);
    // Opacity-only cross-fade: no transform, so the animating wrapper never
    // becomes a containing block for position: fixed FABs mid-transition.
    expect(animateMock.mock.calls[0][0]).toEqual([
      { opacity: 0 },
      { opacity: 1 },
    ]);
  });
  it("slides right on forward, left on back", () => {
    setReduce(false);
    const { rerender } = render(
      <ScreenTransition token="l" mode="slide" direction="forward">
        L
      </ScreenTransition>,
    );
    rerender(
      <ScreenTransition token="d" mode="slide" direction="forward">
        D
      </ScreenTransition>,
    );
    expect(animateMock.mock.calls[0][0][0].transform).toBe("translateX(22%)");
    rerender(
      <ScreenTransition token="l" mode="slide" direction="back">
        L
      </ScreenTransition>,
    );
    expect(animateMock.mock.calls[1][0][0].transform).toBe("translateX(-22%)");
  });
  it("skips animation under reduced motion but still swaps content", () => {
    setReduce(true);
    const { rerender, getByText } = render(
      <ScreenTransition token="a" mode="fade">
        A
      </ScreenTransition>,
    );
    rerender(
      <ScreenTransition token="b" mode="fade">
        B
      </ScreenTransition>,
    );
    expect(animateMock).not.toHaveBeenCalled();
    expect(getByText("B")).toBeInTheDocument();
  });
});
