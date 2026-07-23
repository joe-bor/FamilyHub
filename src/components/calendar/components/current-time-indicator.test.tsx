import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useAutoScrollToMinutes,
  useAutoScrollToNow,
} from "./current-time-indicator";

function mockReducedMotion(matches: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)" ? matches : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// setup.ts's afterEach uses clearAllMocks, which clears calls but keeps mock
// implementations — a mockReducedMotion(true) would otherwise leak into every
// later test in this file. Reset the preference explicitly before each test.
beforeEach(() => {
  mockReducedMotion(false);
});

describe("useAutoScrollToMinutes", () => {
  it("scrolls to the target row minus a lead offset", () => {
    const el = document.createElement("div");
    const scrollTo = vi.spyOn(el, "scrollTo");

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(el);
      useAutoScrollToMinutes(ref, 180, 52); // 3h after start, 52px rows
    });

    // (180/60)*52 - 200 = 156 - 200 = -44 -> clamped to 0
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("scrolls to a positive offset for a later target", () => {
    const el = document.createElement("div");
    const scrollTo = vi.spyOn(el, "scrollTo");

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(el);
      useAutoScrollToMinutes(ref, 600, 52); // 10h after start
    });

    // (600/60)*52 - 200 = 520 - 200 = 320
    expect(scrollTo).toHaveBeenCalledWith({ top: 320, behavior: "smooth" });
  });

  it("does nothing when the target is null", () => {
    const el = document.createElement("div");
    const scrollTo = vi.spyOn(el, "scrollTo");

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(el);
      useAutoScrollToMinutes(ref, null, 52);
    });

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("uses instant scroll when reduced motion is requested", () => {
    mockReducedMotion(true);
    const el = document.createElement("div");
    const scrollTo = vi.spyOn(el, "scrollTo");

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(el);
      useAutoScrollToMinutes(ref, 600, 52);
    });

    expect(scrollTo).toHaveBeenCalledWith({ top: 320, behavior: "auto" });
  });
});

describe("useAutoScrollToNow", () => {
  /**
   * Only Date is faked: setTimeout/setInterval stay real so renderHook's act()
   * scheduling is untouched. setup.ts's afterEach restores real timers.
   */
  function freezeClockAt(hours: number, minutes: number) {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 0, 15, hours, minutes, 0));
  }

  it("scrolls to the current time minus a lead offset", () => {
    freezeClockAt(13, 30);
    const el = document.createElement("div");
    const scrollTo = vi.spyOn(el, "scrollTo");

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(el);
      useAutoScrollToNow(ref); // defaults: 6am start, 80px rows
    });

    // 7h30m after start -> (450/60)*80 - 200 = 600 - 200 = 400
    expect(scrollTo).toHaveBeenCalledWith({ top: 400, behavior: "smooth" });
  });

  it("clamps to the top of the grid early in the day", () => {
    freezeClockAt(6, 30);
    const el = document.createElement("div");
    const scrollTo = vi.spyOn(el, "scrollTo");

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(el);
      useAutoScrollToNow(ref);
    });

    // 30m after start -> (30/60)*80 - 200 = 40 - 200 = -160 -> clamped to 0
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("does nothing when the container ref is empty", () => {
    freezeClockAt(13, 30);
    const el = document.createElement("div");
    const scrollTo = vi.spyOn(el, "scrollTo");

    // Day views pass { current: null } when the shown day is not today.
    renderHook(() => useAutoScrollToNow({ current: null }));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("uses instant scroll when reduced motion is requested", () => {
    mockReducedMotion(true);
    freezeClockAt(16, 0);
    const el = document.createElement("div");
    const scrollTo = vi.spyOn(el, "scrollTo");

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(el);
      useAutoScrollToNow(ref, 6, 52);
    });

    // 10h after start -> (600/60)*52 - 200 = 520 - 200 = 320
    expect(scrollTo).toHaveBeenCalledWith({ top: 320, behavior: "auto" });
  });

  it("uses smooth scroll when motion is allowed", () => {
    freezeClockAt(16, 0);
    const el = document.createElement("div");
    const scrollTo = vi.spyOn(el, "scrollTo");

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(el);
      useAutoScrollToNow(ref, 6, 52);
    });

    expect(scrollTo).toHaveBeenCalledWith({ top: 320, behavior: "smooth" });
  });
});
