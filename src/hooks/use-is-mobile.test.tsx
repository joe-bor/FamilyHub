import { renderHook } from "@/test/test-utils";
import { useIsMobile } from "./use-is-mobile";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });

  vi.mocked(window.matchMedia).mockImplementation((query: string) => {
    const maxWidth = Number.parseInt(
      query.match(/max-width:\s*(\d+)px/)?.[1] ?? "",
      10,
    );
    const minWidth = Number.parseInt(
      query.match(/min-width:\s*(\d+)px/)?.[1] ?? "",
      10,
    );

    const matchesMax = Number.isNaN(maxWidth) || width <= maxWidth;
    const matchesMin = Number.isNaN(minWidth) || width >= minWidth;
    const matches = matchesMax && matchesMin;

    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });
}

describe("useIsMobile", () => {
  it("treats 768px as mobile", () => {
    setViewportWidth(768);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("treats 769px as non-mobile", () => {
    setViewportWidth(769);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });
});
