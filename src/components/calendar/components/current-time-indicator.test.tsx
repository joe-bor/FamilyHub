import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useAutoScrollToMinutes } from "./current-time-indicator";

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
});
