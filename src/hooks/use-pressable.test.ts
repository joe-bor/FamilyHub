import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PRESSABLE, usePressable } from "./use-pressable";

describe("usePressable", () => {
  it("gates the scale behind motion-safe but keeps the tint always-on", () => {
    expect(PRESSABLE).toContain("motion-safe:active:scale-[0.97]");
    expect(PRESSABLE).toContain("active:before:opacity-[0.06]");
    // the tint must NOT be motion-gated — it is feedback, not decoration
    expect(PRESSABLE).not.toContain("motion-safe:active:before");
  });
  it("returns the class and a callable pointer-down seam", () => {
    const { result } = renderHook(() => usePressable());
    expect(result.current.className).toBe(PRESSABLE);
    expect(() => result.current.onPointerDown({} as never)).not.toThrow();
  });
});
