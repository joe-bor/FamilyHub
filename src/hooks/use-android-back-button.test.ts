import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pwa", () => ({
  isStandalone: vi.fn(() => true),
  isIOS: vi.fn(() => false),
}));
vi.mock("@/components/ui/toaster", () => ({ toast: vi.fn() }));

import { toast } from "@/components/ui/toaster";
import { haptics } from "@/lib/haptics";
import { isIOS, isStandalone } from "@/lib/pwa";
import { useAppStore, useBackStack } from "@/stores";
import { useAndroidBackButton } from "./use-android-back-button";

function mockCoarsePointer(coarse: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("coarse") ? coarse : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function popstate() {
  act(() => {
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}

beforeEach(() => {
  vi.mocked(isStandalone).mockReturnValue(true);
  vi.mocked(isIOS).mockReturnValue(false);
  mockCoarsePointer(true);
  useAppStore.setState({ activeModule: null });
  vi.spyOn(window.history, "pushState").mockImplementation(() => {});
  vi.spyOn(window.history, "back").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("useAndroidBackButton", () => {
  it("is a no-op when disabled", () => {
    renderHook(() => useAndroidBackButton(false));
    expect(window.history.pushState).not.toHaveBeenCalled();
    popstate();
    expect(toast).not.toHaveBeenCalled();
  });

  it("is a no-op on desktop (no coarse pointer)", () => {
    mockCoarsePointer(false);
    renderHook(() => useAndroidBackButton(true));
    expect(window.history.pushState).not.toHaveBeenCalled();
  });

  it("is a no-op on iOS standalone (even with a coarse pointer)", () => {
    vi.mocked(isIOS).mockReturnValue(true);
    renderHook(() => useAndroidBackButton(true));
    expect(window.history.pushState).not.toHaveBeenCalled();
  });

  it("pushes a single sentinel on mount when gated on", () => {
    renderHook(() => useAndroidBackButton(true));
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
  });

  it("dismisses the top registered handler first, leaving the module untouched", () => {
    const handler = vi.fn();
    useBackStack.getState().register(handler);
    useAppStore.setState({ activeModule: "calendar" });
    renderHook(() => useAndroidBackButton(true));
    popstate();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().activeModule).toBe("calendar");
    expect(window.history.back).not.toHaveBeenCalled();
  });

  it("goes up to Home when nothing is registered and not at Home", () => {
    useAppStore.setState({ activeModule: "lists" });
    renderHook(() => useAndroidBackButton(true));
    popstate();
    expect(useAppStore.getState().activeModule).toBeNull();
    expect(window.history.back).not.toHaveBeenCalled();
  });

  it("shows the hint on first root press and exits on the second", () => {
    vi.useFakeTimers();
    renderHook(() => useAndroidBackButton(true));
    popstate(); // first
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Press back again to exit" }),
    );
    expect(window.history.back).not.toHaveBeenCalled();
    popstate(); // second, within window
    act(() => {
      vi.advanceTimersByTime(1); // flush the deferred history.back()
    });
    expect(window.history.back).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("re-arms after the window elapses", () => {
    vi.useFakeTimers();
    renderHook(() => useAndroidBackButton(true));
    popstate(); // first → arm
    act(() => {
      vi.advanceTimersByTime(2000); // window elapses, disarm
    });
    popstate(); // treated as first again
    expect(toast).toHaveBeenCalledTimes(2);
    expect(window.history.back).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("fires haptics.back() when dismissing the top overlay", () => {
    const back = vi.spyOn(haptics, "back").mockImplementation(() => {});
    useBackStack.getState().register(vi.fn());
    renderHook(() => useAndroidBackButton(true));
    popstate();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("fires haptics.back() when stepping up to Home", () => {
    const back = vi.spyOn(haptics, "back").mockImplementation(() => {});
    useAppStore.setState({ activeModule: "lists" });
    renderHook(() => useAndroidBackButton(true));
    popstate();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire haptics.back() on the exit-hint branch (Home root)", () => {
    const back = vi.spyOn(haptics, "back").mockImplementation(() => {});
    useAppStore.setState({ activeModule: null });
    renderHook(() => useAndroidBackButton(true));
    popstate(); // first press at Home → hint toast, not a dismiss
    expect(back).not.toHaveBeenCalled();
  });
});
