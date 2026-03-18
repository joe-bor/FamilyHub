import { render, screen, seedCalendarStore } from "@/test/test-utils";
import { MobileToolbar } from "./mobile-toolbar";

const mockMembers = [
  { id: "m1", name: "Alice", color: "coral" as const },
  { id: "m2", name: "Bob", color: "teal" as const },
];

describe("MobileToolbar", () => {
  it("renders context label based on view", () => {
    seedCalendarStore({
      calendarView: "monthly",
      currentDate: new Date(2026, 2, 18), // March 2026
    });
    render(
      <MobileToolbar
        members={mockMembers}
        onOpenSidebar={vi.fn()}
        onGoHome={vi.fn()}
      />,
    );
    expect(screen.getByText(/March 2026/)).toBeInTheDocument();
  });

  it("renders view switcher with D/W/M/S pills", () => {
    render(
      <MobileToolbar
        members={mockMembers}
        onOpenSidebar={vi.fn()}
        onGoHome={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /daily/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /weekly/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /monthly/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /schedule/i }),
    ).toBeInTheDocument();
  });

  it("renders member filter dots for each member", () => {
    render(
      <MobileToolbar
        members={mockMembers}
        onOpenSidebar={vi.fn()}
        onGoHome={vi.fn()}
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument(); // Alice initial
    expect(screen.getByText("B")).toBeInTheDocument(); // Bob initial
  });

  it("renders Today button", () => {
    render(
      <MobileToolbar
        members={mockMembers}
        onOpenSidebar={vi.fn()}
        onGoHome={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /today/i })).toBeInTheDocument();
  });

  it("renders hamburger menu button", () => {
    const onOpenSidebar = vi.fn();
    render(
      <MobileToolbar
        members={mockMembers}
        onOpenSidebar={onOpenSidebar}
        onGoHome={vi.fn()}
      />,
    );
    const menuButton = screen.getByRole("button", { name: /menu/i });
    expect(menuButton).toBeInTheDocument();
  });
});
