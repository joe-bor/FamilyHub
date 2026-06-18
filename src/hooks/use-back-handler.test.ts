import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBackStack } from "@/stores";
import { useBackHandler } from "./use-back-handler";

describe("useBackHandler", () => {
  it("registers while enabled and unregisters on unmount", () => {
    const { unmount } = renderHook(() => useBackHandler(true, vi.fn()));
    expect(useBackStack.getState().stack).toHaveLength(1);
    unmount();
    expect(useBackStack.getState().stack).toHaveLength(0);
  });

  it("does not register while disabled", () => {
    renderHook(() => useBackHandler(false, vi.fn()));
    expect(useBackStack.getState().stack).toHaveLength(0);
  });

  it("invokes the latest handler after a re-render (no stale closure)", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ h }) => useBackHandler(true, h), {
      initialProps: { h: first },
    });
    rerender({ h: second });
    useBackStack.getState().peek()?.handler();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("re-registers when enabled flips from false to true", () => {
    const { rerender } = renderHook(({ on }) => useBackHandler(on, vi.fn()), {
      initialProps: { on: false },
    });
    expect(useBackStack.getState().stack).toHaveLength(0);
    rerender({ on: true });
    expect(useBackStack.getState().stack).toHaveLength(1);
  });
});
