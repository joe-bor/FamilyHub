import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIsLargeScreen } from "./use-is-large-screen";

function mockMatchMedia(matches: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("useIsLargeScreen", () => {
  beforeEach(() => {
    // afterEach clears call data but not the impl; set it explicitly each test.
    mockMatchMedia(false);
  });

  it("is false below the lg breakpoint", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useIsLargeScreen());
    expect(result.current).toBe(false);
  });

  it("is true at lg and above", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useIsLargeScreen());
    expect(result.current).toBe(true);
  });
});
