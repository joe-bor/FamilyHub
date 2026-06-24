import { render, renderWithUser, screen } from "@/test/test-utils";
import { FloatingActionButton } from "./floating-action-button";

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

describe("FloatingActionButton", () => {
  it("renders a button with the provided accessible label", () => {
    setViewportWidth(768);
    render(<FloatingActionButton onClick={vi.fn()} label="Add recipe" />);
    expect(
      screen.getByRole("button", { name: "Add recipe" }),
    ).toBeInTheDocument();
  });

  it("fires onClick when pressed", async () => {
    setViewportWidth(768);
    const onClick = vi.fn();
    const { user } = renderWithUser(
      <FloatingActionButton onClick={onClick} label="Create list" />,
    );
    await user.click(screen.getByRole("button", { name: "Create list" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("uses the mobile bottom offset at 768px so it clears the bottom nav", () => {
    setViewportWidth(768);
    render(<FloatingActionButton onClick={vi.fn()} label="Add item" />);
    expect(screen.getByRole("button", { name: "Add item" })).toHaveStyle({
      bottom: "max(4.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))",
    });
  });

  it("uses the desktop bottom offset above the mobile breakpoint", () => {
    setViewportWidth(769);
    render(<FloatingActionButton onClick={vi.fn()} label="Add item" />);
    expect(screen.getByRole("button", { name: "Add item" })).toHaveStyle({
      bottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
    });
  });

  it("can be disabled, keeps its accessible name, and does not fire onClick", async () => {
    setViewportWidth(768);
    const onClick = vi.fn();
    const { user } = renderWithUser(
      <FloatingActionButton
        onClick={onClick}
        label="Add recurring chore"
        disabled
      />,
    );
    const fab = screen.getByRole("button", { name: "Add recurring chore" });
    expect(fab).toBeDisabled();
    await user.click(fab);
    expect(onClick).not.toHaveBeenCalled();
  });
});
