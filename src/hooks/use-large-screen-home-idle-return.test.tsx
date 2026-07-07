import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLargeScreenHomeIdleReturn } from "./use-large-screen-home-idle-return";

describe("useLargeScreenHomeIdleReturn", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("returns to Home after idle on large screens", () => {
    vi.useFakeTimers();
    const setActiveModule = vi.fn();

    renderHook(() =>
      useLargeScreenHomeIdleReturn({
        enabled: true,
        activeModule: "calendar",
        setActiveModule,
        idleMs: 1000,
      }),
    );

    vi.advanceTimersByTime(1000);
    expect(setActiveModule).toHaveBeenCalledWith(null);
  });

  it("does not return when already on Home", () => {
    vi.useFakeTimers();
    const setActiveModule = vi.fn();

    renderHook(() =>
      useLargeScreenHomeIdleReturn({
        enabled: true,
        activeModule: null,
        setActiveModule,
        idleMs: 1000,
      }),
    );

    vi.advanceTimersByTime(1000);
    expect(setActiveModule).not.toHaveBeenCalled();
  });

  it("resets the timer on user activity", () => {
    vi.useFakeTimers();
    const setActiveModule = vi.fn();

    renderHook(() =>
      useLargeScreenHomeIdleReturn({
        enabled: true,
        activeModule: "lists",
        setActiveModule,
        idleMs: 1000,
      }),
    );

    vi.advanceTimersByTime(800);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    vi.advanceTimersByTime(800);
    expect(setActiveModule).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(setActiveModule).toHaveBeenCalledWith(null);
  });

  it("blocks idle return while a dialog is open", () => {
    vi.useFakeTimers();
    const setActiveModule = vi.fn();
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.append(dialog);

    renderHook(() =>
      useLargeScreenHomeIdleReturn({
        enabled: true,
        activeModule: "meals",
        setActiveModule,
        idleMs: 1000,
      }),
    );

    vi.advanceTimersByTime(1000);
    expect(setActiveModule).not.toHaveBeenCalled();
  });

  it("blocks idle return while an explicit module flow blocker is active", () => {
    vi.useFakeTimers();
    const setActiveModule = vi.fn();

    renderHook(() =>
      useLargeScreenHomeIdleReturn({
        enabled: true,
        activeModule: "meals",
        setActiveModule,
        idleMs: 1000,
        isBlocked: () => true,
      }),
    );

    vi.advanceTimersByTime(1000);
    expect(setActiveModule).not.toHaveBeenCalled();
  });

  it("re-arms after a blocked fire and returns once the dialog closes", () => {
    vi.useFakeTimers();
    const setActiveModule = vi.fn();
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.append(dialog);

    renderHook(() =>
      useLargeScreenHomeIdleReturn({
        enabled: true,
        activeModule: "calendar",
        setActiveModule,
        idleMs: 1000,
      }),
    );

    // Fire while blocked: deferred, not cancelled.
    vi.advanceTimersByTime(1000);
    expect(setActiveModule).not.toHaveBeenCalled();

    dialog.remove();
    vi.advanceTimersByTime(1000);
    expect(setActiveModule).toHaveBeenCalledWith(null);
  });

  it("clears the countdown when disabled mid-countdown", () => {
    vi.useFakeTimers();
    const setActiveModule = vi.fn();

    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useLargeScreenHomeIdleReturn({
          enabled,
          activeModule: "calendar",
          setActiveModule,
          idleMs: 1000,
        }),
      { initialProps: { enabled: true } },
    );

    vi.advanceTimersByTime(500);
    rerender({ enabled: false });
    vi.advanceTimersByTime(2000);
    expect(setActiveModule).not.toHaveBeenCalled();
  });
});
