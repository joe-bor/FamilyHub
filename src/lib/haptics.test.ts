import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHapticsPreference } from "@/stores";
import { canVibrate, haptics, resetHapticsThrottle } from "./haptics";

function setVibrate(fn: ((p: number | number[]) => boolean) | undefined) {
  if (fn) {
    Object.defineProperty(navigator, "vibrate", {
      value: fn,
      configurable: true,
      writable: true,
    });
  } else {
    delete (navigator as { vibrate?: unknown }).vibrate;
  }
}

beforeEach(() => {
  vi.useFakeTimers(); // controls the throttle clock (Date.now)
  resetHapticsThrottle(); // reset the module throttle clock between tests
  setVibrate(vi.fn(() => true)); // capable baseline; tests override
  useHapticsPreference.setState({
    enabled: true,
    categories: { taps: true, completions: true, back: true },
  });
});
afterEach(() => {
  vi.useRealTimers();
  setVibrate(undefined);
});

describe("canVibrate", () => {
  it("is true when navigator.vibrate exists, false when absent", () => {
    expect(canVibrate()).toBe(true);
    setVibrate(undefined);
    expect(canVibrate()).toBe(false);
  });
});

describe("haptics", () => {
  it("fires the right pattern per category when capable + opted-in", () => {
    const vibrate = navigator.vibrate as ReturnType<typeof vi.fn>;
    haptics.tap();
    expect(vibrate).toHaveBeenLastCalledWith(10);
    vi.advanceTimersByTime(100);
    haptics.success();
    expect(vibrate).toHaveBeenLastCalledWith([12, 40, 12]);
    vi.advanceTimersByTime(100);
    haptics.back();
    expect(vibrate).toHaveBeenLastCalledWith(8);
  });

  it("is a silent no-op when navigator.vibrate is absent", () => {
    setVibrate(undefined);
    expect(() => haptics.tap()).not.toThrow();
  });

  it("is a no-op when the master toggle is off", () => {
    useHapticsPreference.setState({ enabled: false });
    haptics.tap();
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  it("is a no-op when the specific category is off", () => {
    useHapticsPreference.setState({
      enabled: true,
      categories: { taps: false, completions: true, back: true },
    });
    haptics.tap();
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  it("throttles repeats inside the window and re-fires after it", () => {
    const vibrate = navigator.vibrate as ReturnType<typeof vi.fn>;
    haptics.tap();
    haptics.tap(); // within THROTTLE_MS → suppressed
    expect(vibrate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100); // past the window
    haptics.tap();
    expect(vibrate).toHaveBeenCalledTimes(2);
  });
});
