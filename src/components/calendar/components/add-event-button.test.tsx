import { render, screen } from "@/test/test-utils";
import { AddEventButton } from "./add-event-button";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });

  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: (() => {
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
      return matchesMax && matchesMin;
    })(),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("AddEventButton", () => {
  it("uses the mobile bottom offset at 768px so the FAB clears the bottom nav", () => {
    setViewportWidth(768);
    render(<AddEventButton onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: /add event/i })).toHaveStyle({
      bottom: "max(4.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))",
    });
  });

  it("keeps existing desktop bottom offset", () => {
    setViewportWidth(769);
    render(<AddEventButton onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: /add event/i })).toHaveStyle({
      bottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
    });
  });
});
