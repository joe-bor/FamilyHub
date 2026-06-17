import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

function mockMatch(matches: boolean) {
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

describe("usePrefersReducedMotion", () => {
  it("returns true when reduce is preferred", () => {
    mockMatch(true);
    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(
      true,
    );
  });
  it("returns false otherwise", () => {
    mockMatch(false);
    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(
      false,
    );
  });
});
