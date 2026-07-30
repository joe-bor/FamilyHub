import { userEvent } from "@testing-library/user-event";
import { useCalendarStore } from "@/stores";
import { render, screen } from "@/test/test-utils";
import { MobileToolbar } from "./mobile-toolbar";

const mockMembers = [
  { id: "m1", name: "Alice", color: "coral" as const },
  { id: "m2", name: "Bob", color: "teal" as const },
];

// The title / Today / Menu row moved to the shared module-aware AppHeader
// (covered in app-header.test.tsx). MobileToolbar is now just the controls row.
describe("MobileToolbar", () => {
  it("renders view switcher with D/W/M/S pills", () => {
    render(<MobileToolbar members={mockMembers} />);
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
    render(<MobileToolbar members={mockMembers} />);
    expect(screen.getByText("A")).toBeInTheDocument(); // Alice initial
    expect(screen.getByText("B")).toBeInTheDocument(); // Bob initial
  });

  it("does not render the context label, Today, or Menu (now in AppHeader)", () => {
    render(<MobileToolbar members={mockMembers} />);
    expect(
      screen.queryByRole("button", { name: /today/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /menu/i }),
    ).not.toBeInTheDocument();
  });
});

describe("MobileToolbar period navigation", () => {
  const members = [{ id: "m1", name: "Alice", color: "coral" as const }];

  it("renders previous and next controls", () => {
    render(<MobileToolbar members={members} />);
    expect(
      screen.getByRole("button", { name: "Previous" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("does not render a second Today control (AppHeader owns it)", () => {
    render(<MobileToolbar members={members} />);
    expect(screen.queryByRole("button", { name: /today/i })).toBeNull();
  });

  it("moves the store date forward when Next is pressed", async () => {
    useCalendarStore.setState({
      calendarView: "daily",
      currentDate: new Date(2026, 5, 1),
    });
    render(<MobileToolbar members={members} />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(useCalendarStore.getState().currentDate.getDate()).toBe(2);
  });
});

// Prev/next costs the row a fixed 90px, which pushed the member dots past the
// right edge of an overflow-hidden ancestor (unreachable, not scrollable): 25px
// lost at 375px with three members, 113px with five. jsdom resolves no Tailwind,
// so geometry is unassertable here — pin the classes that make the group elastic
// instead, the same way chore-row.test.tsx pins its lg: touch sizing.
describe("MobileToolbar narrow-viewport layout", () => {
  const family = [
    { id: "m1", name: "Alice", color: "coral" as const },
    { id: "m2", name: "Bob", color: "teal" as const },
    { id: "m3", name: "Cass", color: "green" as const },
    { id: "m4", name: "Dev", color: "purple" as const },
  ];

  it("lets the member dots scroll instead of clipping them", () => {
    render(<MobileToolbar members={family} />);
    const group = screen.getByRole("button", { name: "Alice filter" })
      .parentElement as HTMLElement;

    expect(group.className).toContain("overflow-x-auto");
    expect(group.className).toContain("min-w-0");
  });

  it("keeps the switcher and prev/next from being squeezed instead", () => {
    render(<MobileToolbar members={family} />);
    const switcher = screen.getByRole("button", { name: /daily/i })
      .parentElement as HTMLElement;
    const nav = screen.getByRole("button", { name: "Previous" })
      .parentElement as HTMLElement;

    expect(switcher.className).toContain("shrink-0");
    expect(nav.className).toContain("shrink-0");
  });

  it("keeps every member dot at its full touch size while scrolling", () => {
    render(<MobileToolbar members={family} />);
    for (const member of family) {
      expect(
        screen.getByRole("button", { name: `${member.name} filter` }).className,
      ).toContain("shrink-0");
    }
  });
});
