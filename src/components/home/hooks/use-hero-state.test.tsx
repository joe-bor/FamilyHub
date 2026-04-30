import { act, renderHook } from "@testing-library/react";
import type { CalendarEvent } from "@/lib/types";
import { useHeroState } from "./use-hero-state";

const event: CalendarEvent = {
  id: "event-1",
  title: "Soccer practice",
  startTime: "10:00 AM",
  endTime: "11:00 AM",
  date: new Date(2026, 3, 25),
  memberId: "member-1",
  isAllDay: false,
  source: "NATIVE",
};

describe("useHeroState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("derives the initial hero state from the supplied clock", () => {
    const { result } = renderHook(() =>
      useHeroState([event], () => new Date(2026, 3, 25, 9, 0, 0, 0)),
    );

    expect(result.current.state).toEqual({
      kind: "UP_NEXT",
      event,
    });
    expect(result.current.now).toEqual(new Date(2026, 3, 25, 9, 0, 0, 0));
  });

  it("recomputes when the 30-second interval ticks", () => {
    let now = new Date(2026, 3, 25, 9, 59, 0, 0);

    const { result } = renderHook(() => useHeroState([event], () => now));

    expect(result.current.state.kind).toBe("UP_NEXT");

    act(() => {
      now = new Date(2026, 3, 25, 10, 0, 0, 0);
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.state).toEqual({
      kind: "RIGHT_NOW",
      event,
    });
    expect(result.current.now).toEqual(new Date(2026, 3, 25, 10, 0, 0, 0));
  });

  it("recomputes when the tab becomes visible again", () => {
    let now = new Date(2026, 3, 25, 9, 59, 0, 0);
    let visibilityState: DocumentVisibilityState = "hidden";

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState,
    });

    const { result } = renderHook(() => useHeroState([event], () => now));

    expect(result.current.state.kind).toBe("UP_NEXT");

    act(() => {
      now = new Date(2026, 3, 25, 10, 0, 0, 0);
      visibilityState = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.state).toEqual({
      kind: "RIGHT_NOW",
      event,
    });
  });

  it("cleans up its timer and visibility listener on unmount", () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = renderHook(() =>
      useHeroState([event], () => new Date(2026, 3, 25, 9, 0, 0, 0)),
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
  });
});
