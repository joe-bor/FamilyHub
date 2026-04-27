import { render, screen } from "@/test/test-utils";
import { AddEventButton } from "./add-event-button";

function setMobile(isMobile: boolean) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: isMobile ? 390 : 1024,
  });
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: isMobile && query.includes("max-width: 639px"),
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
  it("uses mobile bottom offset that clears bottom nav", () => {
    setMobile(true);
    render(<AddEventButton onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: /add event/i })).toHaveStyle({
      bottom: "max(4.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))",
    });
  });

  it("keeps existing desktop bottom offset", () => {
    setMobile(false);
    render(<AddEventButton onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: /add event/i })).toHaveStyle({
      bottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
    });
  });
});
